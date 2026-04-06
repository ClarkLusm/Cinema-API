const db = require("../config/db.config");
const OrderRepo = require("../repositories/OrderRepository");
const PaymentRepo = require("../repositories/PaymentRepository");
const OfferRepo = require("../repositories/OfferRepository");
const {
  buildVietQrPayload,
  generateBookingCode,
} = require("../utils/CheckoutUtil");

const extractNumericValue = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const match = value.match(/-?\d+(\.\d+)?/);
    return match ? Number(match[0]) : null;
  }

  return null;
};

const computeOfferDiscount = (offer, subtotal) => {
  if (!offer || subtotal <= 0) {
    return 0;
  }

  const rawDiscount = extractNumericValue(offer.discount_value);
  const discountText = `${offer.discount_value || ""} ${offer.description || ""} ${offer.title || ""}`.toLowerCase();

  if (!rawDiscount || rawDiscount <= 0) {
    return 0;
  }

  if (discountText.includes("%") && rawDiscount <= 100) {
    return (subtotal * rawDiscount) / 100;
  }

  return rawDiscount;
};

exports.checkout = async (data, userId) => {
  const { showTimeId, seatIds, offerId } = data;

  if (!showTimeId || !seatIds || seatIds.length === 0) {
    throw new Error("Missing required fields");
  }

  const normalizedSeatIds = [...new Set(seatIds)];
  const heldSeats = await OrderRepo.getValidHeldSeats(
    userId,
    showTimeId,
    normalizedSeatIds
  );

  if (heldSeats.length !== normalizedSeatIds.length) {
    throw new Error("Seats not valid or expired");
  }

  const showTime = await OrderRepo.getShowTimeById(showTimeId);

  if (!showTime) {
    throw new Error("Showtime not found");
  }

  const subtotal = Number(showTime.price) * normalizedSeatIds.length;
  const appliedOffer = offerId ? await OfferRepo.getOfferById(offerId) : null;
  const discountAmount = Math.min(
    computeOfferDiscount(appliedOffer, subtotal),
    subtotal
  );
  const totalPrice = Math.max(subtotal - discountAmount, 0);
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const orderId = await OrderRepo.createOrder(
      userId,
      showTimeId,
      totalPrice,
      normalizedSeatIds,
      "",
      connection
    );
    const bookingCode = generateBookingCode(orderId);
    const vietQr = buildVietQrPayload({
      amount: totalPrice,
      transferNote: bookingCode,
    });

    await connection.execute(
      `
      UPDATE orders
      SET booking_code = ?
      WHERE id = ?
      `,
      [bookingCode, orderId]
    );

    const paymentId = await PaymentRepo.createPayment(
      orderId,
      totalPrice,
      "vietqr",
      {
        bankCode: vietQr.bankCode,
        accountNumber: vietQr.accountNumber,
        accountName: vietQr.accountName,
        transferNote: vietQr.transferNote,
        qrPayload: vietQr.qrContent,
        qrImageUrl: vietQr.qrImageUrl,
      },
      connection
    );

    await connection.commit();

    const expiresAt =
      heldSeats
        .map((seat) => seat.expires_at)
        .filter(Boolean)
        .sort()[0] || null;

    return {
      success: true,
      message: "Checkout created",
      order: {
        id: orderId,
        bookingCode,
        status: "PENDING",
        subtotal,
        discountAmount,
        totalPrice,
        expiresAt,
      },
      payment: {
        id: paymentId,
        status: "PENDING",
        provider: "vietqr",
        amount: totalPrice,
      },
      vietQr,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
