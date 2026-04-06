const PaymentService = require("./PaymentService");

const activeTimers = new Map();

const isSimulationEnabled = () =>
  String(process.env.VIETQR_AUTO_SIMULATE || "true").toLowerCase() === "true";

const getSimulationDelayMs = () => {
  const parsedDelay = Number(process.env.VIETQR_SIMULATE_DELAY_MS || 12000);
  return Number.isFinite(parsedDelay) && parsedDelay >= 0 ? parsedDelay : 12000;
};

exports.scheduleAutoPayment = ({ orderId, paymentId, amount, transferContent }) => {
  if (!isSimulationEnabled() || !orderId || !amount) {
    return null;
  }

  const existingTimer = activeTimers.get(orderId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const delayMs = getSimulationDelayMs();
  const timer = setTimeout(async () => {
    activeTimers.delete(orderId);

    try {
      await PaymentService.handleVietQrWebhook({
        paymentId,
        orderId,
        amount,
        transferContent,
        transactionCode: `SIM_${Date.now()}`,
        source: "auto-simulator",
      });
    } catch (error) {
      console.error("[vietqr-simulator] auto payment failed", error.message);
    }
  }, delayMs);

  activeTimers.set(orderId, timer);

  return {
    enabled: true,
    delayMs,
    runAt: new Date(Date.now() + delayMs).toISOString(),
  };
};

exports.simulateWebhookNow = async ({ orderId, paymentId, amount, transferContent }) => {
  const existingTimer = activeTimers.get(orderId);
  if (existingTimer) {
    clearTimeout(existingTimer);
    activeTimers.delete(orderId);
  }

  return PaymentService.handleVietQrWebhook({
    paymentId,
    orderId,
    amount,
    transferContent,
    transactionCode: `SIM_${Date.now()}`,
    source: "manual-simulator",
  });
};
