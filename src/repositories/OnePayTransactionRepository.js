const db = require("../config/db.config");
const OnePayTransaction = require("../models/OnePayTransactionModel");

exports.createTransaction = async (payload, executor = db) => {
  const {
    merchTxnRef,
    orderId,
    bookingId = null,
    amount,
    locale = "vn",
    clientIp = null,
    status = "PENDING",
    gatewayUrl = null,
    message = null,
  } = payload;

  const [result] = await executor.execute(
    `
    INSERT INTO ${OnePayTransaction.table}
    (merch_txn_ref, order_id, booking_id, amount, locale, client_ip, status, gateway_url, message)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [merchTxnRef, orderId, bookingId, amount, locale, clientIp, status, gatewayUrl, message]
  );

  const [rows] = await executor.execute(
    `
    SELECT *
    FROM ${OnePayTransaction.table}
    WHERE id = ?
    LIMIT 1
    `,
    [result.insertId]
  );

  return rows[0];
};

exports.updateTransaction = async (merchTxnRef, payload, executor = db) => {
  const {
    status = null,
    responseCode = null,
    transactionNo = null,
    message = null,
    secureHashValid = null,
    returnQuery = null,
    ipnQuery = null,
    paidAt = null,
  } = payload;

  await executor.execute(
    `
    UPDATE ${OnePayTransaction.table}
    SET status = COALESCE(?, status),
        response_code = COALESCE(?, response_code),
        transaction_no = COALESCE(?, transaction_no),
        message = COALESCE(?, message),
        secure_hash_valid = COALESCE(?, secure_hash_valid),
        return_query = COALESCE(?, return_query),
        ipn_query = COALESCE(?, ipn_query),
        paid_at = COALESCE(?, paid_at)
    WHERE merch_txn_ref = ?
    `,
    [
      status,
      responseCode,
      transactionNo,
      message,
      secureHashValid,
      returnQuery,
      ipnQuery,
      paidAt,
      merchTxnRef,
    ]
  );
};

exports.getByMerchTxnRef = async (merchTxnRef) => {
  const [rows] = await db.execute(
    `
    SELECT *
    FROM ${OnePayTransaction.table}
    WHERE merch_txn_ref = ?
    LIMIT 1
    `,
    [merchTxnRef]
  );

  return rows[0];
};

exports.getByOrderId = async (orderId) => {
  const [rows] = await db.execute(
    `
    SELECT *
    FROM ${OnePayTransaction.table}
    WHERE order_id = ?
    ORDER BY created_at DESC, id DESC
    LIMIT 1
    `,
    [orderId]
  );

  return rows[0];
};
