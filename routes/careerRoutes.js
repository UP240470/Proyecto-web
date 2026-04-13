const express = require("express");
const router = express.Router();
const careerController = require("../controllers/careerController");

router.post("/", careerController.createCareer);
router.get("/", careerController.getCareers);
router.get("/filter", careerController.filterCareers);
router.get("/:id", careerController.getCareerById);
router.put("/:id", careerController.updateCareer);
router.delete("/:id", careerController.deleteCareer);

module.exports = router;