const router = require("express").Router();
const OrderController = require("../controllers/OrderController");
const auth = require("../middlewares/AuthMiddleware");

router.post("/checkout", auth, OrderController.checkout);

module.exports = router;