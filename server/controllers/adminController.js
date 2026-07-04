const User = require("../models/User");
const Booking = require("../models/Booking");
const Event = require("../models/Event");
const Feedback = require("../models/Feedback");
const Notification = require("../models/Notification");
const OTP = require("../models/OTP");
const Payment = require("../models/Payment");
const CoordinatorRequest = require("../models/CoordinatorRequest");

exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(100);

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateUserStatus = async (req, res, next) => {
  try {
    const { isBlocked, role, organizerStatus } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (user._id.toString() === req.user._id.toString() && isBlocked === true) {
      return res.status(400).json({
        success: false,
        message: "You cannot block your own admin account.",
      });
    }

    if (typeof isBlocked === "boolean") {
      user.isBlocked = isBlocked;
    }

    if (role && ["student", "organizer", "admin"].includes(role)) {
      user.role = role;
      user.organizerStatus =
        role === "organizer" && ["Pending", "Approved", "Rejected"].includes(user.organizerStatus)
          ? user.organizerStatus
          : role === "organizer"
            ? "Pending"
            : "Not Applicable";
    }

    if (
      organizerStatus &&
      user.role === "organizer" &&
      ["Pending", "Approved", "Rejected"].includes(organizerStatus)
    ) {
      user.organizerStatus = organizerStatus;
      user.organizerApprovedBy = organizerStatus === "Approved" ? req.user._id : null;
      user.organizerApprovedAt = organizerStatus === "Approved" ? new Date() : null;

      await Notification.create({
        user: user._id,
        title: `Organizer ${organizerStatus}`,
        message:
          organizerStatus === "Approved"
            ? "Your organizer account has been approved. Organizer tools are now enabled."
            : `Your organizer account is ${organizerStatus.toLowerCase()}.`,
        type: "SYSTEM",
        priority: organizerStatus === "Rejected" ? "HIGH" : "MEDIUM",
      });
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "User updated successfully.",
      user,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot remove your own admin account.",
      });
    }

    const organizerEvents = await Event.find({ organizer: user._id }).select("_id");
    const eventIds = organizerEvents.map((event) => event._id);

    await Promise.all([
      OTP.deleteMany({ user: user._id }),
      Notification.deleteMany({
        $or: [{ user: user._id }, { event: { $in: eventIds } }],
      }),
      Feedback.deleteMany({
        $or: [{ user: user._id }, { event: { $in: eventIds } }],
      }),
      Payment.deleteMany({
        $or: [{ user: user._id }, { event: { $in: eventIds } }],
      }),
      Booking.deleteMany({
        $or: [{ user: user._id }, { event: { $in: eventIds } }],
      }),
      CoordinatorRequest.deleteMany({
        $or: [{ user: user._id }, { requestedBy: user._id }, { event: { $in: eventIds } }],
      }),
      Event.deleteMany({ organizer: user._id }),
    ]);

    await User.findByIdAndDelete(user._id);

    return res.status(200).json({
      success: true,
      message: "User removed successfully.",
    });
  } catch (error) {
    next(error);
  }
};
