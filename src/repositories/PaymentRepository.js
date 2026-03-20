const db = require("../config/db.config");
const Payment = require("../models/PaymentModel");

exports.createPayment = async (orderId, amount, provider) => {
  const [result] = await db.execute(
    `
    INSERT INTO ${Payment.table}
    (order_id, amount, provider, status)
    VALUES (?, ?, ?, 'PENDING')
    `,
    [orderId, amount, provider]
  );

  return result.insertId;
};

exports.updatePaymentStatus = async (paymentId, status, transactionCode) => {
  await db.execute(
    `
    UPDATE ${Payment.table}
    SET status = ?, transaction_code = ?
    WHERE id = ?
    `,
    [status, transactionCode, paymentId]
  );
};

exports.getPaymentByOrderId = async (orderId) => {
  const [rows] = await db.execute(
    `
    SELECT * FROM ${Payment.table}
    WHERE order_id = ?
    LIMIT 1
    `,
    [orderId]
  );

  return rows[0];
};