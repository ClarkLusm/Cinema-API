// src/repositories/SeatBookingRepository.js
const db = require("../config/db.config");
const SeatBooking = require("../models/SeatBookingModel");

exports.findConflictingSeats = async (showTimeId, seatIds) => {
  const [rows] = await db.execute(
    `
    SELECT * FROM ${SeatBooking.table}
    WHERE show_time_id = ?
    AND seat_id IN (${seatIds.map(() => "?").join(",")})
    AND (
      status = 'BOOKED'
      OR (status = 'HOLD' AND expires_at > NOW())
    )
    `,
    [showTimeId, ...seatIds]
  );

  return rows;
};

exports.insertSeatBookings = async (bookings) => {
  const values = bookings.map(() => "(?,?,?,?,?)").join(",");

  const params = bookings.flatMap((b) => [
    b.show_time_id,
    b.seat_id,
    b.user_id,
    b.status,
    b.expires_at,
  ]);

  await db.execute(
    `
    INSERT INTO ${SeatBooking.table}
    (show_time_id, seat_id, user_id, status, expires_at)
    VALUES ${values}
    `,
    params
  );
};