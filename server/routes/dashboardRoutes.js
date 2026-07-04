const express = require("express");

const router = express.Router();

const {
  getStudentDashboard,
  getOrganizerDashboard,
  getAdminDashboard,
} = require("../controllers/dashboardController");

const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

router.get("/student", protect, authorize("student", "admin"), getStudentDashboard);

router.get("/organizer", protect, authorize("organizer", "admin"), getOrganizerDashboard);

router.get("/admin", protect, authorize("admin"), getAdminDashboard);

module.exports = router;
