require("dotenv").config();

const mysql = require("mysql2/promise");

const FIRST_NAMES = [
  "Alex",
  "Jordan",
  "Taylor",
  "Morgan",
  "Avery",
  "Riley",
  "Cameron",
  "Quinn",
  "Parker",
  "Hayden",
  "Skyler",
  "Reese",
  "Logan",
  "Harper",
  "Rowan",
  "Elliot",
  "Dakota",
  "Sawyer",
  "Finley",
  "Emerson",
];

const LAST_NAMES = [
  "Nguyen",
  "Tran",
  "Le",
  "Pham",
  "Hoang",
  "Vo",
  "Do",
  "Bui",
  "Dang",
  "Duong",
  "Miller",
  "Carter",
  "Brooks",
  "Hayes",
  "Foster",
  "Bennett",
  "Perry",
  "Warren",
  "Stone",
  "Hughes",
];

const NATIONALITIES = [
  "Vietnam",
  "USA",
  "UK",
  "Canada",
  "Australia",
  "South Korea",
  "Japan",
  "France",
];

const GENDERS = ["MALE", "FEMALE", "OTHER"];
const STARTING_ACTOR_ID = 1000;
const BASE_DATE = new Date("2026-04-09T00:00:00");
const SHOWTIME_SLOTS = ["09:00:00", "12:30:00", "16:00:00", "19:30:00"];

const isVoiceMovie = (title) =>
  /inside out|kung fu panda|super mario|spider-verse/i.test(title);

const createActorSeed = (index, movieTitle) => {
  const firstName = FIRST_NAMES[index % FIRST_NAMES.length];
  const lastName = LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length];
  const fullName = `${firstName} ${lastName}`;
  const month = `${(index % 12) + 1}`.padStart(2, "0");
  const day = `${(index % 28) + 1}`.padStart(2, "0");

  return {
    name: fullName,
    original_name: fullName,
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random&color=fff&size=200`,
    bio: `${fullName} is part of the featured cast lineup for ${movieTitle}.`,
    birthday: `198${index % 10}-${month}-${day}`,
    nationality: NATIONALITIES[index % NATIONALITIES.length],
    gender: GENDERS[index % GENDERS.length],
  };
};

const createSeatLayout = (totalSeats) => {
  const seats = [];
  const seatsPerRow = 10;
  const totalRows = Math.ceil(totalSeats / seatsPerRow);

  for (let rowIndex = 0; rowIndex < totalRows; rowIndex += 1) {
    const rowLabel = String.fromCharCode(65 + rowIndex);

    for (let seatNumber = 1; seatNumber <= seatsPerRow; seatNumber += 1) {
      const ordinal = rowIndex * seatsPerRow + seatNumber;

      if (ordinal > totalSeats) {
        break;
      }

      let type = "normal";
      if (rowIndex >= totalRows - 2) {
        type = "vip";
      }

      seats.push({
        seat_row: rowLabel,
        seat_number: seatNumber,
        type,
      });
    }
  }

  return seats;
};

const toDateTimeString = (date, time) => {
  const [hours, minutes, seconds] = time.split(":").map(Number);
  const nextDate = new Date(date);
  nextDate.setHours(hours, minutes, seconds, 0);

  const year = nextDate.getFullYear();
  const month = `${nextDate.getMonth() + 1}`.padStart(2, "0");
  const day = `${nextDate.getDate()}`.padStart(2, "0");
  const hour = `${nextDate.getHours()}`.padStart(2, "0");
  const minute = `${nextDate.getMinutes()}`.padStart(2, "0");
  const second = `${nextDate.getSeconds()}`.padStart(2, "0");

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
};

const uniqueCinemaRooms = (rooms) => {
  const selectedRooms = [];
  const seenCinemaIds = new Set();

  for (const room of rooms) {
    if (seenCinemaIds.has(room.cinema_id)) {
      continue;
    }

    seenCinemaIds.add(room.cinema_id);
    selectedRooms.push(room);
  }

  return selectedRooms;
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

    const [cinemas] = await connection.execute(
      `
      SELECT c.id, c.name
      FROM cinemas c
      ORDER BY c.id ASC
      `
    );

    const [roomsBefore] = await connection.execute(
      `
      SELECT r.id, r.cinema_id, r.name, r.total_seats
      FROM rooms r
      ORDER BY r.cinema_id ASC, r.id ASC
      `
    );

    const cinemaIdsWithRooms = new Set(roomsBefore.map((room) => room.cinema_id));
    const cinemasWithoutRooms = cinemas.filter((cinema) => !cinemaIdsWithRooms.has(cinema.id));

    for (const cinema of cinemasWithoutRooms) {
      await connection.execute(
        `
        INSERT INTO rooms (cinema_id, name, total_seats)
        VALUES (?, ?, ?), (?, ?, ?)
        `,
        [
          cinema.id,
          "Room 1 - Standard",
          120,
          cinema.id,
          "Room 2 - VIP",
          80,
        ]
      );
    }

    const [rooms] = await connection.execute(
      `
      SELECT r.id, r.cinema_id, r.name, r.total_seats
      FROM rooms r
      ORDER BY r.cinema_id ASC, r.id ASC
      `
    );

    for (const room of rooms) {
      const layout = createSeatLayout(Number(room.total_seats) || 80);
      const [existingSeats] = await connection.execute(
        `
        SELECT seat_row, seat_number
        FROM seats
        WHERE room_id = ?
        `,
        [room.id]
      );

      const existingSeatKeys = new Set(
        existingSeats.map((seat) => `${seat.seat_row}-${seat.seat_number}`)
      );

      for (const seat of layout) {
        const seatKey = `${seat.seat_row}-${seat.seat_number}`;
        if (existingSeatKeys.has(seatKey)) {
          continue;
        }

        await connection.execute(
          `
          INSERT INTO seats (room_id, seat_row, seat_number, type)
          VALUES (?, ?, ?, ?)
          `,
          [room.id, seat.seat_row, seat.seat_number, seat.type]
        );
      }
    }

    const [movies] = await connection.execute(
      `
      SELECT id, title, duration, status
      FROM movies
      ORDER BY id ASC
      `
    );

    const [movieCoverage] = await connection.execute(
      `
      SELECT m.id,
             COUNT(DISTINCT mc.actor_id) AS cast_count,
             COUNT(DISTINCT r.cinema_id) AS cinema_count
      FROM movies m
      LEFT JOIN movie_cast mc ON mc.movie_id = m.id
      LEFT JOIN showtimes s ON s.movie_id = m.id
      LEFT JOIN rooms r ON r.id = s.room_id
      GROUP BY m.id
      `
    );

    const coverageMap = new Map(movieCoverage.map((row) => [row.id, row]));

    let actorSeedIndex = STARTING_ACTOR_ID;

    for (const movie of movies) {
      const currentCoverage = coverageMap.get(movie.id) || { cast_count: 0, cinema_count: 0 };
      const currentCastCount = Number(currentCoverage.cast_count) || 0;
      const missingCastCount = Math.max(5 - currentCastCount, 0);
      const roleType = isVoiceMovie(movie.title) ? "VOICE" : "ACTING";

      if (missingCastCount > 0) {
        const [existingCastOrderRows] = await connection.execute(
          `
          SELECT COALESCE(MAX(cast_order), 0) AS max_cast_order
          FROM movie_cast
          WHERE movie_id = ?
          `,
          [movie.id]
        );

        let castOrder = Number(existingCastOrderRows[0]?.max_cast_order || 0);

        for (let index = 0; index < missingCastCount; index += 1) {
          const actor = createActorSeed(actorSeedIndex, movie.title);

          const [actorResult] = await connection.execute(
            `
            INSERT INTO actors (name, original_name, avatar, bio, birthday, nationality, gender)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [
              actor.name,
              actor.original_name,
              actor.avatar,
              actor.bio,
              actor.birthday,
              actor.nationality,
              actor.gender,
            ]
          );

          castOrder += 1;

          await connection.execute(
            `
            INSERT INTO movie_cast (movie_id, actor_id, character_name, role_type, is_main, cast_order)
            VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
              movie.id,
              actorResult.insertId,
              `${roleType === "VOICE" ? "Voice" : "Character"} ${castOrder}`,
              roleType,
              castOrder <= 2 ? 1 : 0,
              castOrder,
            ]
          );

          actorSeedIndex += 1;
        }
      }

      const [existingMovieShowtimes] = await connection.execute(
        `
        SELECT s.room_id, r.cinema_id, s.start_time
        FROM showtimes s
        INNER JOIN rooms r ON r.id = s.room_id
        WHERE s.movie_id = ?
        `,
        [movie.id]
      );

      const existingCinemaIds = new Set(existingMovieShowtimes.map((row) => row.cinema_id));
      const roomCandidates = uniqueCinemaRooms(
        rooms
          .slice()
          .sort((left, right) => left.id - right.id)
          .filter((room) => !existingCinemaIds.has(room.cinema_id))
      );

      const targetCinemaCount = movie.id % 2 === 0 ? 4 : 3;
      const targetRooms = [
        ...uniqueCinemaRooms(
          rooms.filter((room) => existingCinemaIds.has(room.cinema_id))
        ),
        ...roomCandidates,
      ].slice(0, targetCinemaCount);

      const existingShowtimeKeys = new Set(
        existingMovieShowtimes.map((showtime) => {
          const date = new Date(showtime.start_time);
          return `${showtime.room_id}-${toDateTimeString(date, `${`${date.getHours()}`.padStart(2, "0")}:${`${date.getMinutes()}`.padStart(2, "0")}:00`)}`;
        })
      );

      const durationMinutes = Number(movie.duration) || 120;

      targetRooms.forEach(async () => undefined);

      for (let roomIndex = 0; roomIndex < targetRooms.length; roomIndex += 1) {
        const room = targetRooms[roomIndex];

        for (let dayOffset = 0; dayOffset < 2; dayOffset += 1) {
          const slotIndex = (movie.id + roomIndex + dayOffset) % SHOWTIME_SLOTS.length;
          const startDate = new Date(BASE_DATE);
          startDate.setDate(BASE_DATE.getDate() + dayOffset + (movie.id % 4));
          const startTime = toDateTimeString(startDate, SHOWTIME_SLOTS[slotIndex]);
          const showtimeKey = `${room.id}-${startTime}`;

          if (existingShowtimeKeys.has(showtimeKey)) {
            continue;
          }

          const endDate = new Date(startTime);
          endDate.setMinutes(endDate.getMinutes() + durationMinutes + 20);
          const endTime = toDateTimeString(endDate, `${`${endDate.getHours()}`.padStart(2, "0")}:${`${endDate.getMinutes()}`.padStart(2, "0")}:00`);
          const basePrice = 90000 + ((movie.id + roomIndex) % 4) * 30000;

          await connection.execute(
            `
            INSERT INTO showtimes (movie_id, room_id, start_time, end_time, price)
            VALUES (?, ?, ?, ?, ?)
            `,
            [movie.id, room.id, startTime, endTime, basePrice]
          );

          existingShowtimeKeys.add(showtimeKey);
        }
      }
    }

    await connection.commit();
    console.log("Movie coverage backfill completed successfully.");
  } catch (error) {
    await connection.rollback();
    console.error("Movie coverage backfill failed:", error);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

main();
