const router = require("express").Router();
const PaymentController = require("../controllers/PaymentController");
const auth = require("../middlewares/AuthMiddleware");

router.post("/create", auth, PaymentController.createPayment);

// mock payment (test)
// router.get("/mock-pay", PaymentController.mockPay);

module.exports = router;