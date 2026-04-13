const router = require("express").Router();
const OnePayController = require("../controllers/OnePayController");
const auth = require("../middlewares/AuthMiddleware");

router.post("/create", auth, OnePayController.createCheckout);
router.get("/return", OnePayController.handleReturn);
router.get("/ipn", OnePayController.handleIpn);
router.get("/payment/:merchTxnRef", auth, OnePayController.getPaymentByTxnRef);
router.get("/order/:orderId", auth, OnePayController.getPaymentByOrderId);

module.exports = router;
