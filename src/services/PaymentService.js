const PaymentRepo = require("../repositories/PaymentRepository");
const OrderRepo = require("../repositories/OrderRepository");

exports.createPayment = async (data) => {
  const { orderId, amount, provider = "mock" } = data;

  if (!orderId || !amount) {
    throw new Error("Missing required fields");
  }

  //tạo payment
  const paymentId = await PaymentRepo.createPayment(
    orderId,
    amount,
    provider
  );

  //fake payment URL (sau này thay VNPay)
  const paymentUrl = `http://localhost:3000/api/payment/mock-pay?paymentId=${paymentId}`;

  return {
    success: true,
    paymentId,
    paymentUrl,
  };
};