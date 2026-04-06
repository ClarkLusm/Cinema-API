const crypto = require("crypto");

const DEFAULT_BANK_CODE = process.env.VIETQR_BANK_CODE || "MB";
const DEFAULT_ACCOUNT_NO = process.env.VIETQR_ACCOUNT_NO || "0363859640";
const DEFAULT_ACCOUNT_NAME =
  process.env.VIETQR_ACCOUNT_NAME || "CINEMA";
const DEFAULT_TICKET_QR_SECRET =
  process.env.TICKET_QR_SECRET || "cinema-ticket-secret";
const DEFAULT_BACKEND_PUBLIC_URL =
  process.env.BACKEND_PUBLIC_URL || "http://localhost:5000";

const normalizeAmount = (amount) => Math.round(Number(amount || 0));

exports.generateBookingCode = (orderId) =>
  `BOOKING${String(orderId).padStart(6, "0")}`;

exports.generateTicketCode = (orderId) =>
  `TICKET${String(orderId).padStart(6, "0")}`;

exports.getVietQrConfig = () => ({
  bankCode: DEFAULT_BANK_CODE,
  accountNumber: DEFAULT_ACCOUNT_NO,
  accountName: DEFAULT_ACCOUNT_NAME,
});

exports.getTicketQrConfig = () => ({
  secret: DEFAULT_TICKET_QR_SECRET,
  backendPublicUrl: DEFAULT_BACKEND_PUBLIC_URL.replace(/\/+$/, ""),
});

exports.buildVietQrPayload = ({ amount, transferNote }) => {
  const { bankCode, accountNumber, accountName } = exports.getVietQrConfig();
  const normalizedAmount = normalizeAmount(amount);
  const encodedAccountName = encodeURIComponent(accountName);
  const encodedTransferNote = encodeURIComponent(transferNote);
  const qrImageUrl = `https://img.vietqr.io/image/${bankCode}-${accountNumber}-compact2.png?amount=${normalizedAmount}&addInfo=${encodedTransferNote}&accountName=${encodedAccountName}`;

  return {
    provider: "vietqr",
    bankCode,
    accountNumber,
    accountName,
    amount: normalizedAmount,
    transferNote,
    qrContent: `${bankCode}|${accountNumber}|${normalizedAmount}|${transferNote}`,
    qrImageUrl,
  };
};

exports.buildTicketPayload = ({
  ticketCode,
  bookingCode,
  orderId,
  userId,
  showTime,
  seats,
}) => {
  const payload = {
    ticketCode,
    bookingCode,
    orderId,
    userId,
    showTimeId: showTime.id,
    movieTitle: showTime.movie_title || null,
    cinemaName: showTime.cinema_name || null,
    roomName: showTime.room_name || null,
    startTime: showTime.start_time,
    seats: seats.map((seat) => ({
      id: seat.id,
      label: `${seat.seat_row}${seat.seat_number}`,
      type: seat.type,
    })),
  };

  const signature = crypto
    .createHmac("sha256", exports.getTicketQrConfig().secret)
    .update(String(ticketCode))
    .digest("hex");
  const verifyUrl = `${exports.getTicketQrConfig().backendPublicUrl}/api/tickets/verify/${encodeURIComponent(
    ticketCode
  )}?sig=${signature}`;
  const qrData = verifyUrl;

  return {
    ...payload,
    signature,
    verifyUrl,
    qrData,
    qrImageUrl: `https://quickchart.io/qr?size=300&text=${encodeURIComponent(
      qrData
    )}`,
  };
};

exports.verifyTicketSignature = (ticketCode, signature) => {
  if (!ticketCode || !signature) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", exports.getTicketQrConfig().secret)
    .update(String(ticketCode))
    .digest("hex");

  if (String(signature).length !== expectedSignature.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(String(signature))
  );
};

exports.normalizeTransferText = (value = "") =>
  String(value).toUpperCase().replace(/\s+/g, "");
