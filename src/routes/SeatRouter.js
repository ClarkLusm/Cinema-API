const router = require("express").Router();
const SeatController = require("../controllers/SeatBookingController");
const auth = require("../middlewares/AuthMiddleware");

router.post("/hold-seats", auth, SeatController.holdSeats);

module.exports = router;