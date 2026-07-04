const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    // Receiver
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Related Event (Optional)
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      default: null,
    },

    // Notification Title
    title: {
      type: String,
      required: [true, "Notification title is required"],
      trim: true,
      maxlength: 100,
    },

    // Notification Message
    message: {
      type: String,
      required: [true, "Notification message is required"],
      trim: true,
      maxlength: 1000,
    },

    // Notification Type
    type: {
      type: String,
      enum: [
        "EVENT",
        "BOOKING",
        "PAYMENT",
        "CERTIFICATE",
        "ANNOUNCEMENT",
        "REMINDER",
        "SYSTEM"
      ],
      default: "SYSTEM",
    },

    // Priority
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: "MEDIUM",
    },

    // Optional Action Button
    actionText: {
      type: String,
      default: "",
    },

    actionUrl: {
      type: String,
      default: "",
    },

    // Read Status
    isRead: {
      type: Boolean,
      default: false,
    },

    readAt: {
      type: Date,
      default: null,
    },

    // Soft Delete
    isDeleted: {
      type: Boolean,
      default: false,
    }
  },
  {
    timestamps: true,
  }
);

// Indexes
notificationSchema.index({ user: 1 });
notificationSchema.index({ event: 1 });
notificationSchema.index({ isRead: 1 });
notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);