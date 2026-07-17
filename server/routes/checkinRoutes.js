const express = require("express");

const router = express.Router();

const { scanCheckIn } = require("../controllers/bookingController");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

router.post(
  "/scan",
  protect,
  authorize("organizer", "admin"),
  scanCheckIn
);

module.exports = router;
