exports.mockPay = async (req, res, next) => {
  try {
    const { paymentId } = req.query;

    // 🔍 lấy payment
    const [rows] = await require("../config/db.config").execute(
      `SELECT * FROM payments WHERE id = ?`,
      [paymentId]
    );

    const payment = rows[0];

    if (!payment) throw new Error("Payment not found");

    // ✅ update payment success
    await PaymentRepo.updatePaymentStatus(
      paymentId,
      "SUCCESS",
      "MOCK_TXN_" + Date.now()
    );

    // 🔒 update order + ghế
    await OrderRepo.updateOrderStatus(payment.order_id, "PAID");

    // 🔥 lock ghế
    await require("../config/db.config").execute(
      `
      UPDATE seat_bookings
      SET status = 'BOOKED'
      WHERE user_id = ?
      AND show_time_id = ?
      AND status = 'HOLD'
      `,
      [req.user?.id || 1, 1] // demo
    );

    res.send("Payment success (mock)");
  } catch (err) {
    next(err);
  }
};