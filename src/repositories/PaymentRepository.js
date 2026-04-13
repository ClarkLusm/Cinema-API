const db = require("../config/db.config");
const Payment = require("../models/PaymentModel");

exports.createPayment = async (orderId, amount, provider, executor = db) => {
  const [result] = await executor.execute(
    `
    INSERT INTO ${Payment.table}
    (order_id, amount, currency, provider, status)
    VALUES (?, ?, 'VND', ?, 'PENDING')
    `,
    [orderId, amount, provider]
  );

  return result.insertId;
};

exports.updatePaymentStatus = async (
  paymentId,
  status,
  transactionCode,
  executor = db
) => {
  await executor.execute(
    `
    UPDATE ${Payment.table}
    SET status = ?,
        transaction_code = ?,
        paid_at = CASE WHEN ? = 'SUCCESS' THEN NOW() ELSE paid_at END
    WHERE id = ?
    `,
    [status, transactionCode, status, paymentId]
  );
};

exports.getPaymentByOrderId = async (orderId) => {
  const [rows] = await db.execute(
    `
    SELECT *
    FROM ${Payment.table}
    WHERE order_id = ?
    ORDER BY
      CASE WHEN status = 'SUCCESS' THEN 0 ELSE 1 END,
      id ASC
    LIMIT 1
    `,
    [orderId]
  );

  return rows[0];
};

exports.getPendingPaymentByOrderId = async (orderId) => {
  const [rows] = await db.execute(
    `
    SELECT *
    FROM ${Payment.table}
    WHERE order_id = ?
      AND status = 'PENDING'
    ORDER BY
      id ASC
    LIMIT 1
    `,
    [orderId]
  );

  return rows[0];
};

exports.updatePaymentMetadata = async (paymentId, metadata = {}, executor = db) => {
  const {
    amount = null,
    provider = null,
    currency = null,
    status = null,
    merchTxnRef = null,
    gatewayTransactionNo = null,
    responseCode = null,
    message = null,
  } = metadata;

  await executor.execute(
    `
    UPDATE ${Payment.table}
    SET amount = COALESCE(?, amount),
        provider = COALESCE(?, provider),
        currency = COALESCE(?, currency),
        status = COALESCE(?, status),
        merch_txn_ref = COALESCE(?, merch_txn_ref),
        gateway_transaction_no = COALESCE(?, gateway_transaction_no),
        response_code = COALESCE(?, response_code),
        message = COALESCE(?, message)
    WHERE id = ?
    `,
    [
      amount,
      provider,
      currency,
      status,
      merchTxnRef,
      gatewayTransactionNo,
      responseCode,
      message,
      paymentId,
    ]
  );
};

exports.getPaymentById = async (paymentId) => {
  const [rows] = await db.execute(
    `
    SELECT *
    FROM ${Payment.table}
    WHERE id = ?
    LIMIT 1
    `,
    [paymentId]
  );

  return rows[0];
};

exports.getPaymentByMerchTxnRef = async (merchTxnRef) => {
  const [rows] = await db.execute(
    `
    SELECT *
    FROM ${Payment.table}
    WHERE merch_txn_ref = ?
    LIMIT 1
    `,
    [merchTxnRef]
  );

  return rows[0];
};
