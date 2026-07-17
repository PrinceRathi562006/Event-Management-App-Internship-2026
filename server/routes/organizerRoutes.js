const express = require("express");

const router = express.Router();

const { getEventAnalytics } = require("../controllers/eventController");
const Booking = require("../models/Booking");
const Event = require("../models/Event");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const isEventCoordinator = (event, userId) =>
  event.assignedOrganizers?.some((organizerId) => organizerId.toString() === userId.toString()) ||
  event.organizerCoordinators?.some((organizerId) => organizerId.toString() === userId.toString()) ||
  event.studentCoordinators?.some((studentId) => studentId.toString() === userId.toString());

const canManageEvent = (event, user) =>
  user.role === "admin" ||
  event.organizer.toString() === user._id.toString() ||
  isEventCoordinator(event, user._id);

router.get(
  "/analytics/:eventId",
  protect,
  authorize("student", "organizer", "admin"),
  getEventAnalytics
);

router.get(
  "/events/:eventId/registrations",
  protect,
  authorize("student", "organizer", "admin"),
  async (req, res, next) => {
    try {
      const event = await Event.findById(req.params.eventId);

      if (!event) {
        return res.status(404).json({
          success: false,
          message: "Event not found.",
        });
      }

      if (!canManageEvent(event, req.user)) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized.",
        });
      }

      const registrations = await Booking.find({ event: event._id })
        .populate(
          "user",
          "name email phone rollNumber college course branch department designation year semester gender dateOfBirth profileImage bio resumeUrl resumeFileName resumeMimeType resumeUploadedAt"
        )
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        count: registrations.length,
        registrations,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/events/:eventId/registrations/:bookingId/seat",
  protect,
  authorize("student", "organizer", "admin"),
  async (req, res, next) => {
    try {
      const event = await Event.findById(req.params.eventId);

      if (!event) {
        return res.status(404).json({
          success: false,
          message: "Event not found.",
        });
      }

      if (!canManageEvent(event, req.user)) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized.",
        });
      }

      const seatNumber = String(req.body.seatNumber || "").trim();

      if (seatNumber && event.seatSelectionEnabled === false) {
        return res.status(400).json({
          success: false,
          message: "Enable choose seat in event settings before assigning seats.",
        });
      }

      const booking = await Booking.findOne({
        _id: req.params.bookingId,
        event: event._id,
      }).populate(
        "user",
        "name email phone rollNumber college course branch department designation year semester gender dateOfBirth profileImage bio resumeUrl resumeFileName resumeMimeType resumeUploadedAt"
      );

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Registration not found.",
        });
      }

      booking.seatNumber = seatNumber;
      await booking.save();

      return res.status(200).json({
        success: true,
        message: seatNumber ? "Seat updated successfully." : "Seat removed successfully.",
        registration: booking,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
