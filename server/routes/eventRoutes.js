const express = require("express");

const router = express.Router();

// Controllers
const {
  createEvent,
  getAllEvents,
  getAdminEvents,
  getSingleEvent,
  updateEvent,
  deleteEvent,
  togglePublishEvent,
  updateEventStatus,
  broadcastEventAnnouncement,
  getMyEvents,
  searchEvents,
  getUpcomingEvents,
  getFeaturedEvents,
  searchCoordinatorCandidates,
  sendCoordinatorRequests,
  getMyCoordinatorRequests,
  respondCoordinatorRequest,
} = require("../controllers/eventController");
const { bookEvent } = require("../controllers/bookingController");
const { submitFeedback } = require("../controllers/feedbackController");
const {
  getEventChatMessages,
  sendEventChatMessage,
} = require("../controllers/eventChatController");

// Middleware
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const upload = require("../middleware/uploadMiddleware");
const validate = require("../middleware/validationMiddleware");

const { body } = require("express-validator");

// ===============================================
// Validation
// ===============================================

const eventValidation = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required"),

  body("description")
    .trim()
    .notEmpty()
    .withMessage("Description is required"),

  body("category")
    .notEmpty()
    .withMessage("Category is required"),

  body("venue")
    .notEmpty()
    .withMessage("Venue is required"),

  body("eventDate")
    .notEmpty()
    .withMessage("Event date is required"),

  body("registrationDeadline")
    .notEmpty()
    .withMessage("Registration deadline is required"),

  body("startTime")
    .notEmpty()
    .withMessage("Start time is required"),

  body("endTime")
    .notEmpty()
    .withMessage("End time is required"),

  body("totalSeats")
    .isInt({ min: 1 })
    .withMessage("Total seats must be greater than 0"),

  validate,
];

// ===============================================
// Public Routes
// ===============================================

// Get All Events
router.get("/", getAllEvents);

// Search Events
router.get("/search", searchEvents);

// Upcoming Events
router.get("/upcoming", getUpcomingEvents);

// Featured Events
router.get("/featured", getFeaturedEvents);

router.get(
  "/coordinators/search",
  protect,
  authorize("student", "organizer", "admin"),
  searchCoordinatorCandidates
);

router.get(
  "/coordinator-requests/my",
  protect,
  getMyCoordinatorRequests
);

router.patch(
  "/coordinator-requests/:requestId",
  protect,
  respondCoordinatorRequest
);

// Admin Event Moderation List
router.get(
  "/admin/all",
  protect,
  authorize("admin"),
  getAdminEvents
);

// Organizer Dashboard
router.get(
  "/organizer/my-events",
  protect,
  authorize("student", "organizer", "admin"),
  getMyEvents
);

// PDF-compatible Registration Endpoint
router.post(
  "/:eventId/register",
  protect,
  authorize("student"),
  bookEvent
);

// PDF-compatible Feedback Endpoint
router.post(
  "/:id/feedback",
  protect,
  authorize("student"),
  (req, res, next) => {
    req.body.eventId = req.params.id;
    return submitFeedback(req, res, next);
  }
);

// Event Announcements
router.post(
  "/:id/announcements",
  protect,
  authorize("student", "organizer", "admin"),
  broadcastEventAnnouncement
);

router.get(
  "/:id/chat",
  protect,
  authorize("student", "organizer", "admin"),
  getEventChatMessages
);

router.post(
  "/:id/chat",
  protect,
  authorize("student", "organizer", "admin"),
  sendEventChatMessage
);

router.post(
  "/:id/coordinator-requests",
  protect,
  authorize("student", "organizer", "admin"),
  sendCoordinatorRequests
);

// Get Single Event
router.get("/:id", getSingleEvent);

// ===============================================
// Organizer Routes
// ===============================================

// Create Event
router.post(
  "/",
  protect,
  authorize("organizer", "admin"),
  upload.fields([
    { name: "poster", maxCount: 1 },
    { name: "bannerImage", maxCount: 1 },
    { name: "certificateSignature", maxCount: 1 },
    { name: "galleryImages", maxCount: 8 },
  ]),
  eventValidation,
  createEvent
);

// Update Event
router.put(
  "/:id",
  protect,
  authorize("student", "organizer", "admin"),
  upload.fields([
    { name: "poster", maxCount: 1 },
    { name: "bannerImage", maxCount: 1 },
    { name: "certificateSignature", maxCount: 1 },
    { name: "galleryImages", maxCount: 8 },
  ]),
  updateEvent
);

// Delete Event
router.delete(
  "/:id",
  protect,
  authorize("student", "organizer", "admin"),
  deleteEvent
);

// Publish / Unpublish Event
router.patch(
  "/:id/publish",
  protect,
  authorize("student", "organizer", "admin"),
  togglePublishEvent
);

// Approve / Reject / Complete Event
router.patch(
  "/:id/status",
  protect,
  authorize("admin"),
  updateEventStatus
);

module.exports = router;
