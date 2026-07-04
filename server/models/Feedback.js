const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
  {
    // Student who submitted the feedback
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Event for which feedback is given
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },

    // Booking Reference
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },

    // Rating
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    // Review
    review: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    // Organizer Reply
    organizerReply: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    // Visibility
    isVisible: {
      type: Boolean,
      default: true,
    },

    // Moderation
    isEdited: {
      type: Boolean,
      default: false,
    },

    editedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// A user can submit only one feedback per event
feedbackSchema.index(
  {
    user: 1,
    event: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model("Feedback", feedbackSchema);