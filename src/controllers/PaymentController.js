const PaymentService = require("../services/PaymentService");
const PaymentRepo = require("../repositories/PaymentRepository");
const OrderRepo = require("../repositories/OrderRepository");

exports.createPayment = async (req, res, next) => {
  try {
    const result = await PaymentService.createPayment(req.body);

    res.json(result);
  } catch (err) {
    next(err);
  }
};