const express = require("express");
const router = express.Router();
const kpiController = require("../controllers/kpiController");

router.get("/tickets/status", kpiController.getTicketsStatusKPI);
router.get("/tickets/users", kpiController.getTicketsUserKPI);

module.exports = router;