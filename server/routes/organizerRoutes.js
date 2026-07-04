const express = require("express");

const router = express.Router();

const { getEventAnalytics } = require("../controllers/eventController");
const Booking = require("../models/Booking");
const Event = require("../models/Event");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

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

      const isCoordinator =
        event.assignedOrganizers?.some((organizerId) => organizerId.toString() === req.user._id.toString()) ||
        event.organizerCoordinators?.some((organizerId) => organizerId.toString() === req.user._id.toString()) ||
        event.studentCoordinators?.some((studentId) => studentId.toString() === req.user._id.toString());

      if (event.organizer.toString() !== req.user._id.toString() && !isCoordinator && req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Unauthorized.",
        });
      }

      const registrations = await Booking.find({ event: event._id })
        .populate(
          "user",
          "name email phone rollNumber college course branch department designation year semester gender dateOfBirth profileImage bio"
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

module.exports = router;
