const Notification = require("../models/Notification");
const User = require("../models/User");
const sendSms = require("../utils/sendSms");

const safeSendSms = async (smsOptions) => {
  try {
    await sendSms(smsOptions);
  } catch (error) {
    console.error("Broadcast SMS failed:", error.message);
  }
};

// ======================================================
// Get My Notifications
// ======================================================

exports.getMyNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({
      user: req.user._id,
      isDeleted: false,
    })
      .populate("event", "title eventDate venue status isPublished")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: notifications.length,
      notifications,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Mark Notification as Read
// ======================================================

exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    if (
      notification.user.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    notification.isRead = true;
    notification.readAt = new Date();

    await notification.save();

    return res.status(200).json({
      success: true,
      message: "Notification marked as read.",
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Mark All Notifications as Read
// ======================================================

exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      {
        user: req.user._id,
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      }
    );

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read.",
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Delete Notification
// ======================================================

exports.deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    if (
      notification.user.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    notification.isDeleted = true;
    await notification.save();

    return res.status(200).json({
      success: true,
      message: "Notification deleted.",
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Delete All Notifications
// ======================================================

exports.deleteAllNotifications = async (req, res, next) => {
  try {
    await Notification.updateMany(
      {
        user: req.user._id,
      },
      {
        isDeleted: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "All notifications deleted.",
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Broadcast Notification (Admin)
// ======================================================

exports.broadcastNotification = async (req, res, next) => {
  try {
    const { title, message, type } = req.body;

    const users = await User.find({
      isBlocked: false,
    }).select("_id phone");

    const notifications = users.map((user) => ({
      user: user._id,
      title,
      message,
      type: type || "ANNOUNCEMENT",
    }));

    await Notification.insertMany(notifications);

    await Promise.all(
      users.map((user) =>
        safeSendSms({
          to: user.phone,
          message: `${title}: ${message}`,
        })
      )
    );

    return res.status(200).json({
      success: true,
      message: "Broadcast notification sent successfully.",
      totalUsers: users.length,
    });
  } catch (error) {
    next(error);
  }
};
