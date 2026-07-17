const express = require("express");
const {
  getAttendanceReport,
  getEventAttendance,
  getLiveAttendance,
  getUserAttendance,
  markAttendance,
  resetAttendance,
  scanAttendance,
} = require("../controllers/attendanceController");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

const scanners = authorize("student", "organizer", "admin");

router.post("/scan", protect, scanners, scanAttendance);
router.post("/mark", protect, scanners, markAttendance);
router.get("/event/:eventId", protect, scanners, getEventAttendance);
router.get("/user/:userId", protect, getUserAttendance);
router.put("/reset/:attendanceId", protect, authorize("admin"), resetAttendance);
router.get("/report/:eventId", protect, scanners, getAttendanceReport);
router.get("/live", protect, scanners, getLiveAttendance);

module.exports = router;
