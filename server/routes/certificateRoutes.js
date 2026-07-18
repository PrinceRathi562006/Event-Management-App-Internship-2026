const express = require("express");

const router = express.Router();

const {
  generateCertificateForUser,
  getCertificate,
  getMyCertificates,
  verifyCertificate,
} = require("../controllers/certificateController");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

router.get("/verify/:certificateId", verifyCertificate);
router.get("/my", protect, getMyCertificates);
router.get("/:registrationId", protect, getCertificate);

router.post(
  "/:id/generate",
  protect,
  authorize("student", "organizer", "admin"),
  generateCertificateForUser
);

module.exports = router;
