const express = require("express");
const router = express.Router();
const typeController = require("../controllers/typeController");

router.post("/", typeController.createType);
router.get("/", typeController.getTypes);
router.delete("/:id", typeController.deleteType);

module.exports = router;