const router = require("express").Router();
const TicketController = require("../controllers/TicketController");

router.get("/verify/:ticketCode", TicketController.verifyTicket);

module.exports = router;
