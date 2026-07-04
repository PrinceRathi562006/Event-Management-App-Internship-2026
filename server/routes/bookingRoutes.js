const express = require("express");

const router = express.Router();

// Controllers
const {
  bookEvent,
  getMyBookings,
  getBookingDetails,
  cancelBooking,
  downloadTicket,
  markAttendance,
  generateCertificateForUser,
  getBookingStats,
} = require("../controllers/bookingController");

// Middleware
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

// ======================================================
// Student Routes
// ======================================================

// Book Event
router.post(
  "/:eventId",
  protect,
  authorize("student"),
  bookEvent
);

// My Bookings
router.get(
  "/my-bookings",
  protect,
  authorize("student"),
  getMyBookings
);

// Booking Statistics
router.get(
  "/admin/statistics",
  protect,
  authorize("admin"),
  getBookingStats
);

// Booking Details
router.get(
  "/:id",
  protect,
  getBookingDetails
);

// Download Ticket
router.get(
  "/:id/ticket",
  protect,
  downloadTicket
);

// Cancel Booking
router.delete(
  "/:id",
  protect,
  cancelBooking
);

// ======================================================
// Organizer/Admin Routes
// ======================================================

// Mark Attendance
router.patch(
  "/:id/attendance",
  protect,
  authorize("student", "organizer", "admin"),
  markAttendance
);

// Generate Certificate
router.post(
  "/:id/certificate",
  protect,
  authorize("student", "organizer", "admin"),
  generateCertificateForUser
);

module.exports = router;
