const db = require("../config/db.config");
const PaymentRepo = require("../repositories/PaymentRepository");
const OrderRepo = require("../repositories/OrderRepository");
const {
  buildTicketPayload,
  buildVietQrPayload,
  generateTicketCode,
  normalizeTransferText,
} = require("../utils/CheckoutUtil");

const buildResolvedPaymentPayload = (payment, fallbackVietQr = null) => ({
  id: payment.id,
  status: payment.status,
  provider: payment.provider,
  amount: Number(payment.amount),
  bankCode: payment.bank_code,
  accountNumber: payment.account_number,
  accountName: payment.account_name,
  transferNote: payment.transfer_note,
  qrContent: payment.qr_payload,
  qrImageUrl: payment.qr_image_url,
  transactionCode: payment.transaction_code,
  paidAt: payment.paid_at || null,
  vietQr:
    payment.status === "PENDING"
      ? fallbackVietQr ||
        buildVietQrPayload({
          amount: payment.amount,
          transferNote: payment.transfer_note,
        })
      : null,
});

exports.createPayment = async (data) => {
  const { orderId, amount, provider = "cash" } = data;

  if (!orderId || !amount) {
    throw new Error("Missing required fields");
  }

  const order = await OrderRepo.getOrderById(orderId);

  if (!order) {
    throw new Error("Order not found");
  }

  const totalAmount = Math.round(Number(amount));
  const vietQr = buildVietQrPayload({
    amount: totalAmount,
    transferNote: order.booking_code,
  });

  let payment = await PaymentRepo.getPendingPaymentByOrderId(orderId);

  if (payment) {
    await PaymentRepo.updatePaymentMetadata(payment.id, {
      amount: totalAmount,
      provider,
      bankCode: vietQr.bankCode,
      accountNumber: vietQr.accountNumber,
      accountName: vietQr.accountName,
      transferNote: vietQr.transferNote,
      qrPayload: vietQr.qrContent,
      qrImageUrl: vietQr.qrImageUrl,
    });
    payment = await PaymentRepo.getPaymentById(payment.id);
  } else {
    const paymentId = await PaymentRepo.createPayment(orderId, totalAmount, provider, {
      bankCode: vietQr.bankCode,
      accountNumber: vietQr.accountNumber,
      accountName: vietQr.accountName,
      transferNote: vietQr.transferNote,
      qrPayload: vietQr.qrContent,
      qrImageUrl: vietQr.qrImageUrl,
    });
    payment = await PaymentRepo.getPaymentById(paymentId);
  }

  return {
    success: true,
    paymentId: payment.id,
    paymentUrl: vietQr.qrImageUrl,
    payment: buildResolvedPaymentPayload(payment, vietQr),
    vietQr,
  };
};

exports.confirmPayment = async (data, userId) => {
  const { paymentId, orderId, seatIds, transactionCode } = data;

  if (!orderId || !seatIds || seatIds.length === 0) {
    throw new Error("Missing required fields");
  }

  const order = await OrderRepo.getOrderById(orderId);

  if (!order) {
    throw new Error("Order not found");
  }

  if (order.user_id !== userId) {
    throw new Error("You cannot confirm this order");
  }

  const normalizedSeatIds = [...new Set(seatIds)];
  const validSeats = await OrderRepo.getValidHeldSeats(
    userId,
    order.showtime_id,
    normalizedSeatIds
  );

  if (validSeats.length !== normalizedSeatIds.length) {
    throw new Error("Seats not valid or expired");
  }

  if (paymentId) {
    const payment = await PaymentRepo.getPaymentById(paymentId);

    if (!payment || payment.order_id !== Number(orderId)) {
      throw new Error("Payment not found");
    }
  }

  const showTime = await OrderRepo.getShowTimeById(order.showtime_id);
  const seats = await OrderRepo.getSeatDetails(order.showtime_id, normalizedSeatIds);
  const ticketCode = generateTicketCode(order.id);
  const ticket = buildTicketPayload({
    ticketCode,
    bookingCode: order.booking_code || null,
    orderId: order.id,
    userId: order.user_id,
    showTime,
    seats,
  });
  const resolvedTransactionCode = transactionCode || `TXN_${Date.now()}`;
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    if (paymentId) {
      await PaymentRepo.updatePaymentStatus(
        paymentId,
        "SUCCESS",
        resolvedTransactionCode,
        null,
        null,
        connection
      );
    }

    await OrderRepo.updateSeatsToBooked(
      userId,
      order.showtime_id,
      normalizedSeatIds,
      connection
    );
    await OrderRepo.markOrderAsPaid(
      orderId,
      ticketCode,
      ticket.qrData,
      connection
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return {
    success: true,
    message: "Payment confirmed and seats booked successfully",
    ticket,
  };
};

exports.handleVietQrWebhook = async (data) => {
  const {
    paymentId,
    orderId,
    transactionCode,
    transferContent,
    amount,
  } = data;

  if ((!paymentId && !orderId && !transferContent) || !amount) {
    throw new Error("Missing required fields");
  }

  const normalizedTransferContent = normalizeTransferText(transferContent);
  const payment = await PaymentRepo.findPendingPaymentForWebhook({
    paymentId,
    orderId,
    transferNote: normalizedTransferContent,
  });

  if (!payment) {
    throw new Error("Payment not found");
  }

  if (payment.status === "SUCCESS") {
    return {
      success: true,
      message: "Payment already processed",
      payment: {
        id: payment.id,
        status: payment.status,
        transactionCode: payment.transaction_code,
      },
    };
  }

  if (Number(amount) < Number(payment.amount)) {
    throw new Error("Amount not enough");
  }

  const order = await OrderRepo.getOrderById(payment.order_id);

  if (!order) {
    throw new Error("Order not found");
  }

  const seatIds = JSON.parse(order.seat_ids_json || "[]");

  if (!seatIds.length) {
    throw new Error("Order has no seats");
  }

  const validSeats = await OrderRepo.getValidHeldSeats(
    order.user_id,
    order.showtime_id,
    seatIds
  );

  if (validSeats.length !== seatIds.length) {
    throw new Error("Seats not valid or expired");
  }

  const showTime = await OrderRepo.getShowTimeById(order.showtime_id);
  const seats = await OrderRepo.getSeatDetails(order.showtime_id, seatIds);
  const ticketCode = generateTicketCode(order.id);
  const resolvedTransactionCode = transactionCode || `VIETQR_${Date.now()}`;
  const ticket = buildTicketPayload({
    ticketCode,
    bookingCode: order.booking_code,
    orderId: order.id,
    userId: order.user_id,
    showTime,
    seats,
  });
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    await PaymentRepo.updatePaymentStatus(
      payment.id,
      "SUCCESS",
      resolvedTransactionCode,
      amount,
      JSON.stringify(data),
      connection
    );
    await OrderRepo.updateSeatsToBooked(
      order.user_id,
      order.showtime_id,
      seatIds,
      connection
    );
    await OrderRepo.markOrderAsPaid(
      order.id,
      ticketCode,
      ticket.qrData,
      connection
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return {
    success: true,
    message: "Payment detected successfully",
    order: {
      id: order.id,
      bookingCode: order.booking_code,
      status: "PAID",
      totalPrice: order.total_price,
    },
    payment: {
      id: payment.id,
      status: "SUCCESS",
      transactionCode: resolvedTransactionCode,
      paidAmount: Number(amount),
    },
    ticket,
  };
};

exports.getPaymentStatus = async (orderId, userId) => {
  if (!orderId) {
    throw new Error("Missing required fields");
  }

  const order = await OrderRepo.getOrderById(orderId);

  if (!order) {
    throw new Error("Order not found");
  }

  if (order.user_id !== userId) {
    throw new Error("You cannot view this order");
  }

  const payment = await PaymentRepo.getPaymentByOrderId(orderId);
  const seatIds = JSON.parse(order.seat_ids_json || "[]");
  const showTime = await OrderRepo.getShowTimeById(order.showtime_id);
  const seats = await OrderRepo.getSeatDetails(order.showtime_id, seatIds);

  return {
    success: true,
    order: {
      id: order.id,
      bookingCode: order.booking_code,
      status: order.status,
      totalPrice: order.total_price,
      paidAt: order.paid_at || null,
    },
    payment: payment ? buildResolvedPaymentPayload(payment) : null,
    ticket:
      order.status === "PAID"
        ? buildTicketPayload({
            ticketCode: order.ticket_code || generateTicketCode(order.id),
            bookingCode: order.booking_code,
            orderId: order.id,
            userId: order.user_id,
            showTime,
            seats,
          })
        : null,
  };
};

exports.getPaymentForSimulation = async (orderId, userId) => {
  const order = await OrderRepo.getOrderById(orderId);

  if (!order) {
    throw new Error("Order not found");
  }

  if (order.user_id !== userId) {
    throw new Error("You cannot view this order");
  }

  const payment = await PaymentRepo.getPendingPaymentByOrderId(orderId);

  if (!payment) {
    throw new Error("Payment not found");
  }

  return {
    order,
    payment,
  };
};
