const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// El prefijo "/auth" ya se define en el index.js, así que aquí solo pones lo que sigue
router.post("/login", authController.login);
router.get("/profile", authController.getProfile);

module.exports = router;