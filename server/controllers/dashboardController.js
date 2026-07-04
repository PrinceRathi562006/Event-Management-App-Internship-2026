const Event = require("../models/Event");
const User = require("../models/User");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");

// ============================================
// Student Dashboard
// ============================================

exports.getStudentDashboard = async (req, res, next) => {
  try {
    const upcomingEvents = await Event.countDocuments({
      eventDate: { $gte: new Date() },
      isPublished: true,
      status: "Approved",
    });

    const myBookings = await Booking.countDocuments({
      user: req.user._id,
      bookingStatus: { $ne: "Cancelled" },
    });

    const certificates = await Booking.countDocuments({
      user: req.user._id,
      certificateIssued: true,
    });

    const cancelledBookings = await Booking.countDocuments({
      user: req.user._id,
      bookingStatus: "Cancelled",
    });

    const coordinatorEvents = await Event.countDocuments({
      $or: [
        { studentCoordinators: req.user._id },
        { organizerCoordinators: req.user._id },
        { assignedOrganizers: req.user._id },
      ],
    });

    res.status(200).json({
      success: true,
      dashboard: {
        upcomingEvents,
        myBookings,
        certificates,
        cancelledBookings,
        coordinatorEvents,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// Organizer Dashboard
// ============================================

exports.getOrganizerDashboard = async (req, res, next) => {
  try {
    const organizerFilter = {
      $or: [
        { organizer: req.user._id },
        { assignedOrganizers: req.user._id },
        { organizerCoordinators: req.user._id },
        { studentCoordinators: req.user._id },
      ],
    };

    const totalEvents = await Event.countDocuments(organizerFilter);

    const publishedEvents = await Event.countDocuments({
      ...organizerFilter,
      isPublished: true,
    });

    const pendingEvents = await Event.countDocuments({
      ...organizerFilter,
      status: "Pending",
    });

    res.status(200).json({
      success: true,
      dashboard: {
        totalEvents,
        publishedEvents,
        pendingEvents,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// Admin Dashboard
// ============================================

exports.getAdminDashboard = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();

    const totalEvents = await Event.countDocuments();

    const totalBookings = await Booking.countDocuments();

    const totalStudents = await User.countDocuments({
      role: "student",
    });

    const totalOrganizers = await User.countDocuments({
      role: "organizer",
    });

    const pendingOrganizers = await User.countDocuments({
      role: "organizer",
      organizerStatus: "Pending",
    });

    const pendingEvents = await Event.countDocuments({
      status: "Pending",
    });

    const activeEvents = await Event.countDocuments({
      status: "Approved",
      eventDate: { $gte: new Date() },
    });

    const certificates = await Booking.countDocuments({
      certificateIssued: true,
    });

    const attendance = await Booking.countDocuments({
      attendanceStatus: "Present",
    });

    const revenue = await Payment.aggregate([
      { $match: { status: "Paid" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    res.status(200).json({
      success: true,
      dashboard: {
        totalUsers,
        totalEvents,
        totalBookings,
        totalStudents,
        totalOrganizers,
        pendingOrganizers,
        pendingEvents,
        activeEvents,
        certificates,
        attendance,
        revenue: revenue[0]?.total || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};
