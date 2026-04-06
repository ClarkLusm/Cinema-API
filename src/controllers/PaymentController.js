const PaymentService = require("../services/PaymentService");
const PaymentSimulationService = require("../services/PaymentSimulationService");

exports.createPayment = async (req, res, next) => {
  try {
    const result = await PaymentService.createPayment(req.body);
    const simulation = PaymentSimulationService.scheduleAutoPayment({
      orderId: req.body.orderId,
      paymentId: result.paymentId,
      amount: result.payment?.amount || req.body.amount,
      transferContent:
        result.payment?.transferNote ||
        result.vietQr?.transferNote ||
        result.payment?.vietQr?.transferNote,
    });

    res.json({
      ...result,
      simulator: simulation,
    });
  } catch (err) {
    if (
      err.message === "Missing required fields" ||
      err.message === "Order not found"
    ) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    next(err);
  }
};

exports.simulateVietQrWebhook = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { order, payment } = await PaymentService.getPaymentForSimulation(
      orderId,
      req.user.id
    );
    const result = await PaymentSimulationService.simulateWebhookNow({
      orderId: Number(orderId),
      paymentId: payment.id,
      amount: Number(payment.amount),
      transferContent: payment.transfer_note || order.booking_code,
    });

    res.json({
      success: true,
      message: "Simulator webhook processed",
      simulator: {
        mode: "manual",
        orderId: Number(orderId),
        paymentId: payment.id,
      },
      result,
    });
  } catch (err) {
    if (
      err.message === "Order not found" ||
      err.message === "Payment not found" ||
      err.message === "You cannot view this order" ||
      err.message === "Amount not enough" ||
      err.message === "Order has no seats" ||
      err.message === "Seats not valid or expired"
    ) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    next(err);
  }
};

exports.confirmPayment = async (req, res, next) => {
  try {
    const result = await PaymentService.confirmPayment(req.body, req.user.id);

    res.json(result);
  } catch (err) {
    if (
      err.message === "Missing required fields" ||
      err.message === "Order not found" ||
      err.message === "You cannot confirm this order" ||
      err.message === "Seats not valid or expired" ||
      err.message === "Payment not found"
    ) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    next(err);
  }
};

exports.handleVietQrWebhook = async (req, res, next) => {
  try {
    const result = await PaymentService.handleVietQrWebhook(req.body);

    res.json(result);
  } catch (err) {
    if (
      err.message === "Missing required fields" ||
      err.message === "Payment not found" ||
      err.message === "Order not found" ||
      err.message === "Amount not enough" ||
      err.message === "Order has no seats" ||
      err.message === "Seats not valid or expired"
    ) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    next(err);
  }
};

exports.getPaymentStatus = async (req, res, next) => {
  try {
    const result = await PaymentService.getPaymentStatus(
      req.params.orderId,
      req.user.id
    );

    res.json(result);
  } catch (err) {
    if (
      err.message === "Missing required fields" ||
      err.message === "Order not found" ||
      err.message === "You cannot view this order"
    ) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    next(err);
  }
};
