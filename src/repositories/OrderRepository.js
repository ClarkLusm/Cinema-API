const db = require("../config/db.config");
const Order = require("../models/OrderModel");

exports.createOrder = async (
  userId,
  showTimeId,
  totalPrice,
  seatIds,
  bookingCode,
  executor = db
) => {
  const [result] = await executor.execute(
    `
    INSERT INTO ${Order.table}
    (user_id, showtime_id, total_price, status, seat_ids_json, booking_code)
    VALUES (?, ?, ?, 'PENDING', ?, ?)
    `,
    [userId, showTimeId, totalPrice, JSON.stringify(seatIds), bookingCode]
  );

  return result.insertId;
};

exports.getValidHeldSeats = async (userId, showTimeId, seatIds) => {
  const [rows] = await db.execute(
    `
    SELECT *
    FROM seat_bookings
    WHERE user_id = ?
    AND show_time_id = ?
    AND seat_id IN (${seatIds.map(() => "?").join(",")})
    AND status IN ('SELECTED', 'HOLD')
    AND expires_at > NOW()
    `,
    [userId, showTimeId, ...seatIds]
  );

  return rows;
};

exports.updateSeatsToBooked = async (
  userId,
  showTimeId,
  seatIds,
  executor = db
) => {
  await executor.execute(
    `
    UPDATE seat_bookings
    SET status = 'BOOKED', expires_at = NULL
    WHERE user_id = ?
    AND show_time_id = ?
    AND seat_id IN (${seatIds.map(() => "?").join(",")})
    AND status IN ('SELECTED', 'HOLD')
    AND expires_at > NOW()
    `,
    [userId, showTimeId, ...seatIds]
  );
};

exports.updateOrderStatus = async (orderId, status, executor = db) => {
  await executor.execute(
    `
    UPDATE ${Order.table}
    SET status = ?
    WHERE id = ?
    `,
    [status, orderId]
  );
};

exports.markOrderAsPaid = async (
  orderId,
  ticketCode,
  ticketQrData,
  executor = db
) => {
  await executor.execute(
    `
    UPDATE ${Order.table}
    SET status = 'PAID',
        paid_at = NOW(),
        ticket_code = ?,
        ticket_qr_data = ?
    WHERE id = ?
    `,
    [ticketCode, ticketQrData, orderId]
  );
};

exports.getOrderById = async (orderId) => {
  const [rows] = await db.execute(
    `
    SELECT *
    FROM ${Order.table}
    WHERE id = ?
    LIMIT 1
    `,
    [orderId]
  );

  return rows[0];
};

exports.getOrderByTicketCode = async (ticketCode) => {
  const [rows] = await db.execute(
    `
    SELECT *
    FROM ${Order.table}
    WHERE ticket_code = ?
    LIMIT 1
    `,
    [ticketCode]
  );

  return rows[0];
};

exports.getShowTimeById = async (showTimeId) => {
  const [rows] = await db.execute(
    `
    SELECT st.*, m.title AS movie_title, r.name AS room_name, c.name AS cinema_name
    FROM showtimes st
    LEFT JOIN movies m ON m.id = st.movie_id
    LEFT JOIN rooms r ON r.id = st.room_id
    LEFT JOIN cinemas c ON c.id = r.cinema_id
    WHERE st.id = ?
    LIMIT 1
    `,
    [showTimeId]
  );

  return rows[0];
};

exports.getSeatDetails = async (showTimeId, seatIds) => {
  if (!seatIds.length) {
    return [];
  }

  const [rows] = await db.execute(
    `
    SELECT s.id, s.seat_row, s.seat_number, s.type
    FROM seats s
    INNER JOIN showtimes st ON st.room_id = s.room_id
    WHERE st.id = ?
    AND s.id IN (${seatIds.map(() => "?").join(",")})
    ORDER BY s.seat_row ASC, s.seat_number ASC
    `,
    [showTimeId, ...seatIds]
  );

  return rows;
};
