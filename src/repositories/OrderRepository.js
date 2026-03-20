const db = require("../config/db.config");
const Order = require("../models/OrderModel");

exports.createOrder = async (userId, showTimeId, totalPrice) => {
  const [result] = await db.execute(
    `
    INSERT INTO ${Order.table}
    (user_id, show_time_id, total_price, status)
    VALUES (?, ?, ?, 'PENDING')
    `,
    [userId, showTimeId, totalPrice]
  );

  return result.insertId;
};

exports.getValidHeldSeats = async (userId, showTimeId, seatIds) => {
  const [rows] = await db.execute(
    `
    SELECT * FROM seat_bookings
    WHERE user_id = ?
    AND show_time_id = ?
    AND seat_id IN (${seatIds.map(() => "?").join(",")})
    AND status = 'HOLD'
    AND expires_at > NOW()
    `,
    [userId, showTimeId, ...seatIds]
  );

  return rows;
};

exports.updateSeatsToBooked = async (userId, showTimeId, seatIds) => {
  await db.execute(
    `
    UPDATE seat_bookings
    SET status = 'BOOKED'
    WHERE user_id = ?
    AND show_time_id = ?
    AND seat_id IN (${seatIds.map(() => "?").join(",")})
    `,
    [userId, showTimeId, ...seatIds]
  );
};

exports.updateOrderStatus = async (orderId, status) => {
  await db.execute(
    `
    UPDATE ${Order.table}
    SET status = ?
    WHERE id = ?
    `,
    [status, orderId]
  );
};