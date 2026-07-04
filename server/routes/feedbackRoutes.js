const express = require("express");

const router = express.Router();

// Controllers
const {
  submitFeedback,
  updateFeedback,
  deleteFeedback,
  getMyFeedback,
  getEventFeedback,
  replyToFeedback,
  toggleVisibility,
  getAverageRating,
} = require("../controllers/feedbackController");

// Middleware
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

// ==============================================
// Student Routes
// ==============================================

// Submit Feedback
router.post(
  "/",
  protect,
  authorize("student"),
  submitFeedback
);

// My Feedback
router.get(
  "/my-feedback",
  protect,
  authorize("student"),
  getMyFeedback
);

// Update Feedback
router.put(
  "/:id",
  protect,
  authorize("student"),
  updateFeedback
);

// Delete Feedback
router.delete(
  "/:id",
  protect,
  deleteFeedback
);

// ==============================================
// Public Routes
// ==============================================

// Event Feedback
router.get(
  "/event/:eventId",
  getEventFeedback
);

// Average Rating
router.get(
  "/event/:eventId/rating",
  getAverageRating
);

// ==============================================
// Organizer/Admin Routes
// ==============================================

// Reply to Feedback
router.patch(
  "/:id/reply",
  protect,
  authorize("student", "organizer", "admin"),
  replyToFeedback
);

// Hide / Unhide Feedback
router.patch(
  "/:id/toggle-visibility",
  protect,
  authorize("student", "organizer", "admin"),
  toggleVisibility
);

module.exports = router;
