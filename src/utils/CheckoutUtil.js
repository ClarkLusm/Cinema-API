const crypto = require("crypto");

const DEFAULT_TICKET_QR_SECRET =
  process.env.TICKET_QR_SECRET || "cinema-ticket-secret";
const DEFAULT_BACKEND_PUBLIC_URL =
  process.env.BACKEND_PUBLIC_URL || "http://localhost:5000";

exports.generateBookingCode = (orderId) =>
  `BOOKING${String(orderId).padStart(6, "0")}`;

exports.generateTicketCode = (orderId) =>
  `TICKET${String(orderId).padStart(6, "0")}`;

exports.getTicketQrConfig = () => ({
  secret: DEFAULT_TICKET_QR_SECRET,
  backendPublicUrl: DEFAULT_BACKEND_PUBLIC_URL.replace(/\/+$/, ""),
});

exports.buildTicketPayload = ({
  ticketCode,
  bookingCode,
  orderId,
  userId,
  showTime,
  seats,
  customer = null,
}) => {
  const payload = {
    ticketCode,
    bookingCode,
    orderId,
    userId,
    customerName: customer?.fullname || null,
    customerEmail: customer?.email || null,
    customerAge: customer?.age || null,
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
