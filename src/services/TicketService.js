const OrderRepo = require("../repositories/OrderRepository");
const {
  buildTicketPayload,
  verifyTicketSignature,
} = require("../utils/CheckoutUtil");

exports.verifyTicket = async (ticketCode, signature) => {
  if (!ticketCode || !signature) {
    throw new Error("Missing required fields");
  }

  if (!verifyTicketSignature(ticketCode, signature)) {
    throw new Error("Invalid ticket signature");
  }

  const order = await OrderRepo.getOrderByTicketCode(ticketCode);

  if (!order) {
    throw new Error("Ticket not found");
  }

  if (order.status !== "PAID") {
    throw new Error("Ticket not active");
  }

  const seatIds = JSON.parse(order.seat_ids_json || "[]");
  const showTime = await OrderRepo.getShowTimeById(order.showtime_id);
  const seats = await OrderRepo.getSeatDetails(order.showtime_id, seatIds);

  return {
    success: true,
    valid: true,
    ticket: buildTicketPayload({
      ticketCode: order.ticket_code,
      bookingCode: order.booking_code,
      orderId: order.id,
      userId: order.user_id,
      showTime,
      seats,
    }),
  };
};
