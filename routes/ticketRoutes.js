const express = require("express");
const router = express.Router();
const ticketController = require("../controllers/ticketController");

router.post("/", ticketController.createTicket);
router.get("/", ticketController.getTickets);
router.get("/user/:id", ticketController.getTicketsByUser);
router.get("/:id", ticketController.getTicketById);
router.patch("/:id/status", ticketController.updateStatus);
router.post("/assign", ticketController.assignTicket);
router.delete("/:id", ticketController.deleteTicket);

module.exports = router;