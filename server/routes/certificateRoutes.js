const express = require("express");

const router = express.Router();

const {
  generateCertificateForUser,
  getCertificate,
} = require("../controllers/bookingController");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

router.get("/:registrationId", protect, getCertificate);

router.post(
  "/:id/generate",
  protect,
  authorize("student", "organizer", "admin"),
  generateCertificateForUser
);

module.exports = router;
