const router = require("express").Router();
const PaymentController = require("../controllers/PaymentController");
const auth = require("../middlewares/AuthMiddleware");

router.post("/create", auth, PaymentController.createPayment);
router.post("/confirm", auth, PaymentController.confirmPayment);
router.post("/webhook/vietqr", PaymentController.handleVietQrWebhook);
router.post("/simulate/:orderId", auth, PaymentController.simulateVietQrWebhook);
router.get("/status/:orderId", auth, PaymentController.getPaymentStatus);

module.exports = router;
