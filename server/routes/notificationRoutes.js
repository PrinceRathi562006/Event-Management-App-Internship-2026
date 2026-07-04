const express = require("express");

const router = express.Router();

// Controllers
const {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  broadcastNotification,
} = require("../controllers/notificationController");

// Middleware
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

// ======================================================
// Student Routes
// ======================================================

// Get My Notifications
router.get(
  "/",
  protect,
  getMyNotifications
);

// Mark One Notification as Read
router.patch(
  "/:id/read",
  protect,
  markAsRead
);

// Mark All Notifications as Read
router.patch(
  "/read-all",
  protect,
  markAllAsRead
);

// Delete All Notifications
router.delete(
  "/delete-all",
  protect,
  deleteAllNotifications
);

// Delete One Notification
router.delete(
  "/:id",
  protect,
  deleteNotification
);

// ======================================================
// Admin Routes
// ======================================================

// Broadcast Notification
router.post(
  "/broadcast",
  protect,
  authorize("admin"),
  broadcastNotification
);

module.exports = router;
