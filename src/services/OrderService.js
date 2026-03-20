const OrderRepo = require("../repositories/OrderRepository");

exports.checkout = async (data, userId) => {
  const { showTimeId, seatIds } = data;

  if (!showTimeId || !seatIds || seatIds.length === 0) {
    throw new Error("Missing required fields");
  }

  //check ghế có đang HOLD hợp lệ không
  const heldSeats = await OrderRepo.getValidHeldSeats(
    userId,
    showTimeId,
    seatIds
  );

  if (heldSeats.length !== seatIds.length) {
    throw new Error("Seats not valid or expired");
  }

  //tính tiền (ví dụ)
  const pricePerSeat = 80000;
  const totalPrice = seatIds.length * pricePerSeat;

  //tạo order
  const orderId = await OrderRepo.createOrder(
    userId,
    showTimeId,
    totalPrice
  );

  //giả lập payment URL
  const paymentUrl = `https://payment.com/pay?orderId=${orderId}`;

  return {
    success: true,
    message: "Checkout success",
    orderId,
    totalPrice,
    paymentUrl,
  };
};