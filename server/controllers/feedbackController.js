const Feedback = require("../models/Feedback");
const Booking = require("../models/Booking");
const Event = require("../models/Event");
const mongoose = require("mongoose");

const isEventCoordinator = (event, userId) =>
  event.assignedOrganizers?.some((organizerId) => organizerId.toString() === userId.toString()) ||
  event.organizerCoordinators?.some((organizerId) => organizerId.toString() === userId.toString()) ||
  event.studentCoordinators?.some((studentId) => studentId.toString() === userId.toString());

const canManageEvent = (event, user) =>
  user.role === "admin" ||
  event.organizer.toString() === user._id.toString() ||
  isEventCoordinator(event, user._id);

// ======================================================
// Submit Feedback
// ======================================================

exports.submitFeedback = async (req, res, next) => {
  try {

    const { eventId, rating, review } = req.body;

    const booking = await Booking.findOne({
      user: req.user._id,
      event: eventId,
      attendanceStatus: "Present",
    });

    if (!booking) {
      return res.status(400).json({
        success: false,
        message: "Only attendees can submit feedback.",
      });
    }

    const exists = await Feedback.findOne({
      user: req.user._id,
      event: eventId,
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Feedback already submitted.",
      });
    }

    const feedback = await Feedback.create({
      user: req.user._id,
      event: eventId,
      booking: booking._id,
      rating,
      review,
    });

    return res.status(201).json({
      success: true,
      message: "Feedback submitted successfully.",
      feedback,
    });

  } catch (error) {
    next(error);
  }
};

// ======================================================
// Update Feedback
// ======================================================

exports.updateFeedback = async (req, res, next) => {
  try {

    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: "Feedback not found.",
      });
    }

    if (
      feedback.user.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    feedback.rating =
      req.body.rating || feedback.rating;

    feedback.review =
      req.body.review || feedback.review;

    feedback.isEdited = true;
    feedback.editedAt = new Date();

    await feedback.save();

    return res.status(200).json({
      success: true,
      message: "Feedback updated successfully.",
      feedback,
    });

  } catch (error) {
    next(error);
  }
};

// ======================================================
// Delete Feedback
// ======================================================

exports.deleteFeedback = async (req, res, next) => {
  try {

    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: "Feedback not found.",
      });
    }

    if (
      feedback.user.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    await Feedback.findByIdAndDelete(feedback._id);

    return res.status(200).json({
      success: true,
      message: "Feedback deleted successfully.",
    });

  } catch (error) {
    next(error);
  }
};

// ======================================================
// Get My Feedback
// ======================================================

exports.getMyFeedback = async (req, res, next) => {
  try {

    const feedback = await Feedback.find({
      user: req.user._id,
    }).populate("event", "title eventDate");

    return res.status(200).json({
      success: true,
      count: feedback.length,
      feedback,
    });

  } catch (error) {
    next(error);
  }
};

// ======================================================
// Get Event Feedback
// ======================================================

exports.getEventFeedback = async (req, res, next) => {
  try {

    const feedback = await Feedback.find({
      event: req.params.eventId,
      isVisible: true,
    }).populate("user", "name profileImage");

    return res.status(200).json({
      success: true,
      count: feedback.length,
      feedback,
    });

  } catch (error) {
    next(error);
  }
};

// ======================================================
// Reply to Feedback
// ======================================================

exports.replyToFeedback = async (req, res, next) => {
  try {

    const feedback = await Feedback.findById(req.params.id)
      .populate("event");

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: "Feedback not found.",
      });
    }

    if (!canManageEvent(feedback.event, req.user)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    feedback.organizerReply = req.body.reply;

    await feedback.save();

    return res.status(200).json({
      success: true,
      message: "Reply added successfully.",
      feedback,
    });

  } catch (error) {
    next(error);
  }
};

// ======================================================
// Hide / Unhide Feedback
// ======================================================

exports.toggleVisibility = async (req, res, next) => {
  try {

    const feedback = await Feedback.findById(req.params.id).populate("event");

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: "Feedback not found.",
      });
    }

    if (!canManageEvent(feedback.event, req.user)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    feedback.isVisible = !feedback.isVisible;

    await feedback.save();

    return res.status(200).json({
      success: true,
      message: feedback.isVisible
        ? "Feedback is now visible."
        : "Feedback has been hidden.",
    });

  } catch (error) {
    next(error);
  }
};

// ======================================================
// Average Rating
// ======================================================

exports.getAverageRating = async (req, res, next) => {
  try {

    const result = await Feedback.aggregate([
      {
        $match: {

event: new mongoose.Types.ObjectId(req.params.eventId)
        },
      },
      {
        $group: {
          _id: "$event",
          averageRating: {
            $avg: "$rating",
          },
          totalReviews: {
            $sum: 1,
          },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      data: result[0] || {
        averageRating: 0,
        totalReviews: 0,
      },
    });

  } catch (error) {
    next(error);
  }
};
