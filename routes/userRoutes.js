const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

// Definimos los endpoints
router.post("/login", userController.login);
router.get("/", userController.getUsers);

module.exports = router;