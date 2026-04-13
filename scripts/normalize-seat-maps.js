require("dotenv").config();

const mysql = require("mysql2/promise");

const SEATS_PER_ROW = 10;

const getTargetSeatCount = (roomName, fallbackTotalSeats) => {
  const normalizedRoomName = String(roomName || "").toLowerCase();

  if (normalizedRoomName.includes("imax")) {
    return 150;
  }

  if (normalizedRoomName.includes("premium")) {
    return 110;
  }

  if (normalizedRoomName.includes("vip")) {
    return 80;
  }

  if (normalizedRoomName.includes("standard")) {
    return 120;
  }

  return Number(fallbackTotalSeats) || 120;
};

const buildCanonicalSeats = (targetSeatCount) => {
  const rows = [];
  const totalRows = Math.ceil(targetSeatCount / SEATS_PER_ROW);

  for (let rowIndex = 0; rowIndex < totalRows; rowIndex += 1) {
    const seatRow = String.fromCharCode(65 + rowIndex);

    for (let seatNumber = 1; seatNumber <= SEATS_PER_ROW; seatNumber += 1) {
      const ordinal = rowIndex * SEATS_PER_ROW + seatNumber;

      if (ordinal > targetSeatCount) {
        break;
      }

      let type = "normal";
      if (rowIndex >= totalRows - 2) {
        type = "vip";
      }

      rows.push({
        key: `${seatRow}-${seatNumber}`,
        seat_row: seatRow,
        seat_number: seatNumber,
        type,
      });
    }
  }

  return rows;
};

const parseSeatIdsJson = (seatIdsJson) => {
  try {
    const parsedValue = JSON.parse(seatIdsJson || "[]");
    return Array.isArray(parsedValue) ? parsedValue.map(Number).filter(Number.isFinite) : [];
  } catch {
    return [];
  }
};

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });

  try {
    await connection.beginTransaction();

    const [rooms] = await connection.execute(
      `
      SELECT id, cinema_id, name, total_seats
      FROM rooms
      ORDER BY id ASC
      `
    );

    const [allSeats] = await connection.execute(
      `
      SELECT id, room_id, seat_row, seat_number, type
      FROM seats
      ORDER BY room_id ASC, id ASC
      `
    );

    const [seatBookingRefs] = await connection.execute(
      `
      SELECT DISTINCT seat_id
      FROM seat_bookings
      `
    );

    const [orders] = await connection.execute(
      `
      SELECT seat_ids_json
      FROM orders
      WHERE seat_ids_json IS NOT NULL AND seat_ids_json <> '[]'
      `
    );

    const referencedSeatIds = new Set(
      seatBookingRefs.map((row) => Number(row.seat_id)).filter(Number.isFinite)
    );

    for (const order of orders) {
      for (const seatId of parseSeatIdsJson(order.seat_ids_json)) {
        referencedSeatIds.add(seatId);
      }
    }

    const seatsByRoomId = allSeats.reduce((accumulator, seat) => {
      if (!accumulator.has(seat.room_id)) {
        accumulator.set(seat.room_id, []);
      }

      accumulator.get(seat.room_id).push({
        ...seat,
        key: `${seat.seat_row}-${seat.seat_number}`,
        referenced: referencedSeatIds.has(Number(seat.id)),
      });
      return accumulator;
    }, new Map());

    for (const room of rooms) {
      const targetSeatCount = getTargetSeatCount(room.name, room.total_seats);
      const canonicalSeats = buildCanonicalSeats(targetSeatCount);
      const canonicalSeatKeys = new Set(canonicalSeats.map((seat) => seat.key));
      const currentSeats = seatsByRoomId.get(room.id) || [];
      const assignedSeatIds = new Set();
      const usedCanonicalKeys = new Set();
      const seatAssignments = [];

      const referencedSeats = currentSeats.filter((seat) => seat.referenced);
      const flexibleSeats = currentSeats.filter((seat) => !seat.referenced);

      for (const seat of referencedSeats) {
        if (canonicalSeatKeys.has(seat.key) && !usedCanonicalKeys.has(seat.key)) {
          usedCanonicalKeys.add(seat.key);
          assignedSeatIds.add(seat.id);
          seatAssignments.push({
            id: seat.id,
            key: seat.key,
          });
        }
      }

      const unassignedCanonicalSeats = canonicalSeats.filter(
        (seat) => !usedCanonicalKeys.has(seat.key)
      );
      const reusableSeats = [
        ...referencedSeats.filter((seat) => !assignedSeatIds.has(seat.id)),
        ...flexibleSeats,
      ];

      for (let index = 0; index < unassignedCanonicalSeats.length; index += 1) {
        const canonicalSeat = unassignedCanonicalSeats[index];
        const reusableSeat = reusableSeats[index];

        if (!reusableSeat) {
          await connection.execute(
            `
            INSERT INTO seats (room_id, seat_row, seat_number, type)
            VALUES (?, ?, ?, ?)
            `,
            [room.id, canonicalSeat.seat_row, canonicalSeat.seat_number, canonicalSeat.type]
          );
          continue;
        }

        assignedSeatIds.add(reusableSeat.id);
        seatAssignments.push({
          id: reusableSeat.id,
          key: canonicalSeat.key,
        });
      }

      for (const assignment of seatAssignments) {
        const canonicalSeat = canonicalSeats.find((seat) => seat.key === assignment.key);

        await connection.execute(
          `
          UPDATE seats
          SET seat_row = ?, seat_number = ?, type = ?
          WHERE id = ?
          `,
          [
            canonicalSeat.seat_row,
            canonicalSeat.seat_number,
            canonicalSeat.type,
            assignment.id,
          ]
        );
      }

      const seatsToDelete = currentSeats.filter(
        (seat) => !assignedSeatIds.has(seat.id) && !seat.referenced
      );

      for (const seat of seatsToDelete) {
        await connection.execute(`DELETE FROM seats WHERE id = ?`, [seat.id]);
      }

      await connection.execute(
        `
        UPDATE rooms
        SET total_seats = ?
        WHERE id = ?
        `,
        [targetSeatCount, room.id]
      );
    }

    await connection.commit();
    console.log("Seat map normalization completed successfully.");
  } catch (error) {
    await connection.rollback();
    console.error("Seat map normalization failed:", error);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

main();
