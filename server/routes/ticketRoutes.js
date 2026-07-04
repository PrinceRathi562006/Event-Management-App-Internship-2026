const express = require("express");

const router = express.Router();

const { downloadTicket } = require("../controllers/bookingController");
const { protect } = require("../middleware/authMiddleware");

router.get("/:id/qr", protect, downloadTicket);

module.exports = router;
