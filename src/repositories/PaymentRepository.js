const db = require("../config/db.config");
const Payment = require("../models/PaymentModel");

exports.createPayment = async (
  orderId,
  amount,
  provider,
  metadata = {},
  executor = db
) => {
  const {
    bankCode = null,
    accountNumber = null,
    accountName = null,
    transferNote = null,
    qrPayload = null,
    qrImageUrl = null,
  } = metadata;

  const [result] = await executor.execute(
    `
    INSERT INTO ${Payment.table}
    (order_id, amount, provider, status, bank_code, account_number, account_name, transfer_note, qr_payload, qr_image_url)
    VALUES (?, ?, ?, 'PENDING', ?, ?, ?, ?, ?, ?)
    `,
    [
      orderId,
      amount,
      provider,
      bankCode,
      accountNumber,
      accountName,
      transferNote,
      qrPayload,
      qrImageUrl,
    ]
  );

  return result.insertId;
};

exports.updatePaymentStatus = async (
  paymentId,
  status,
  transactionCode,
  paidAmount = null,
  webhookPayload = null,
  executor = db
) => {
  await executor.execute(
    `
    UPDATE ${Payment.table}
    SET status = ?,
        transaction_code = ?,
        paid_amount = COALESCE(?, paid_amount),
        webhook_payload = COALESCE(?, webhook_payload),
        paid_at = CASE WHEN ? = 'SUCCESS' THEN NOW() ELSE paid_at END
    WHERE id = ?
    `,
    [status, transactionCode, paidAmount, webhookPayload, status, paymentId]
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
      CASE WHEN qr_image_url IS NOT NULL OR bank_code IS NOT NULL OR account_number IS NOT NULL THEN 0 ELSE 1 END,
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
      CASE WHEN qr_image_url IS NOT NULL OR bank_code IS NOT NULL OR account_number IS NOT NULL THEN 0 ELSE 1 END,
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
    bankCode = null,
    accountNumber = null,
    accountName = null,
    transferNote = null,
    qrPayload = null,
    qrImageUrl = null,
  } = metadata;

  await executor.execute(
    `
    UPDATE ${Payment.table}
    SET amount = COALESCE(?, amount),
        provider = COALESCE(?, provider),
        bank_code = COALESCE(?, bank_code),
        account_number = COALESCE(?, account_number),
        account_name = COALESCE(?, account_name),
        transfer_note = COALESCE(?, transfer_note),
        qr_payload = COALESCE(?, qr_payload),
        qr_image_url = COALESCE(?, qr_image_url)
    WHERE id = ?
    `,
    [
      amount,
      provider,
      bankCode,
      accountNumber,
      accountName,
      transferNote,
      qrPayload,
      qrImageUrl,
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

exports.findPendingPaymentForWebhook = async ({
  paymentId,
  orderId,
  transferNote,
}) => {
  if (paymentId) {
    return exports.getPaymentById(paymentId);
  }

  if (orderId) {
    return exports.getPendingPaymentByOrderId(orderId);
  }

  if (!transferNote) {
    return null;
  }

  const [rows] = await db.execute(
    `
    SELECT *
    FROM ${Payment.table}
    WHERE provider = 'vietqr'
    AND status = 'PENDING'
    AND ? LIKE CONCAT('%', REPLACE(UPPER(transfer_note), ' ', ''), '%')
    ORDER BY id ASC
    LIMIT 1
    `,
    [transferNote]
  );

  return rows[0];
};
