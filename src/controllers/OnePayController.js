const OnePayService = require("../services/OnePayService");
const { frontendUrl } = require("../config/runtimeConfig");

exports.createCheckout = async (req, res, next) => {
  try {
    const clientIp =
      req.headers["x-forwarded-for"] || req.socket.remoteAddress || req.ip;
    const result = await OnePayService.createCheckout(
      req.body,
      { clientIp },
      req.user.id
    );

    res.json(result);
  } catch (err) {
    if (
      err.message === "Missing required fields" ||
      err.message === "Order not found" ||
      err.message === "You cannot access this order"
    ) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    next(err);
  }
};

exports.handleReturn = async (req, res, next) => {
  try {
    const redirectTarget =
      typeof req.query.redirect === "string" && req.query.redirect.trim()
        ? req.query.redirect
        : `${frontendUrl}/payment/onepay/result`;

    const payload = await OnePayService.handleGatewayReturn(req.query);
    const transaction = payload.transaction
      ? {
          orderId: payload.transaction.order_id,
          bookingId: payload.transaction.booking_id,
          merchTxnRef: payload.transaction.merch_txn_ref,
          amount: payload.transaction.amount,
          status: String(payload.transaction.status || "").toLowerCase(),
        }
      : null;

    const redirectUrl = OnePayService.buildReturnRedirectUrl(redirectTarget, {
      provider: "onepay",
      success: payload.success,
      status: transaction?.status || "failed",
      orderId: transaction?.orderId || 0,
      bookingId: transaction?.bookingId || 0,
      merchTxnRef: transaction?.merchTxnRef || "",
      amount: transaction?.amount || 0,
      responseCode: payload.responseCode,
      message: payload.message,
      secureHashValid: payload.hashValid,
    });

    res.redirect(302, redirectUrl);
  } catch (err) {
    next(err);
  }
};

exports.handleIpn = async (req, res, next) => {
  try {
    const payload = await OnePayService.handleIpn(req.query);
    res.type("text/plain");
    res.send(payload.responseText);
  } catch (err) {
    next(err);
  }
};

exports.getPaymentByTxnRef = async (req, res, next) => {
  try {
    const payment = await OnePayService.getPaymentByTxnRef(
      req.params.merchTxnRef,
      req.user.id
    );

    res.json({ payment });
  } catch (err) {
    if (
      err.message === "OnePay transaction not found" ||
      err.message === "You cannot access this order"
    ) {
      return res.status(404).json({
        success: false,
        message: err.message,
      });
    }

    next(err);
  }
};

exports.getPaymentByOrderId = async (req, res, next) => {
  try {
    const payment = await OnePayService.getPaymentByOrderId(
      Number(req.params.orderId),
      req.user.id
    );

    res.json({ payment });
  } catch (err) {
    if (
      err.message === "OnePay transaction not found" ||
      err.message === "Order not found" ||
      err.message === "You cannot access this order"
    ) {
      return res.status(404).json({
        success: false,
        message: err.message,
      });
    }

    next(err);
  }
};
