const Booking = require("../models/Booking");
const Event = require("../models/Event");
const User = require("../models/User");
const Notification = require("../models/Notification");
const fs = require("fs");
const path = require("path");

const { generateQRCode } = require("../utils/qrGenerator");
const sendEmail = require("../utils/sendEmail");
const bookingTemplate = require("../templates/bookingTemplate");
const certificateTemplate = require("../templates/certificateTemplate");

const isAssignedOrganizer = (event, userId) =>
  event.assignedOrganizers?.some((organizerId) => organizerId.toString() === userId.toString()) ||
  event.organizerCoordinators?.some((organizerId) => organizerId.toString() === userId.toString()) ||
  event.studentCoordinators?.some((studentId) => studentId.toString() === userId.toString());

const canManageEvent = (event, user) =>
  user.role === "admin" ||
  event.organizer.toString() === user._id.toString() ||
  isAssignedOrganizer(event, user._id);

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const bookingLookup = (value) => {
  if (objectIdPattern.test(value)) {
    return {
      $or: [{ _id: value }, { bookingId: value }, { ticketNumber: value }],
    };
  }

  return {
    $or: [{ bookingId: value }, { ticketNumber: value }],
  };
};

const findBooking = (value) => Booking.findOne(bookingLookup(value));

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

const getPublicFileUrl = (req, relativePath) => {
  if (!relativePath) return "";
  if (/^https?:\/\//i.test(relativePath)) return relativePath;

  return `${req.protocol}://${req.get("host")}${relativePath.startsWith("/") ? relativePath : `/${relativePath}`}`;
};

const getServerFilePath = (relativePath) => {
  if (!relativePath || /^https?:\/\//i.test(relativePath)) return "";

  return path.join(__dirname, "..", relativePath.replace(/^\/+/, ""));
};

const dataUrlToAttachment = ({ dataUrl, filename, cid }) => {
  const match = String(dataUrl || "").match(/^data:(.+);base64,(.+)$/);

  if (!match) return null;

  return {
    filename,
    content: Buffer.from(match[2], "base64"),
    contentType: match[1],
    cid,
  };
};

const safeSendEmail = async (mailOptions) => {
  try {
    await sendEmail(mailOptions);
  } catch (error) {
    console.error("Transactional email failed:", error.message);
  }
};

const generateBookingId = async () => {
  const year = new Date().getFullYear();
  const count = await Booking.countDocuments({
    createdAt: {
      $gte: new Date(`${year}-01-01T00:00:00.000Z`),
      $lte: new Date(`${year}-12-31T23:59:59.999Z`),
    },
  });

  return `EVT-${year}-${String(count + 1).padStart(6, "0")}`;
};

// ======================================================
// Book Event
// ======================================================

exports.bookEvent = async (req, res, next) => {
  try {
    const eventId = req.params.eventId;
    const { seatNumber = "", joinWaitlist = false } = req.body || {};

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found.",
      });
    }

    if (!event.isPublished || event.status !== "Approved") {
      return res.status(400).json({
        success: false,
        message: "Event is not available for booking.",
      });
    }

    if (new Date() > new Date(event.registrationDeadline)) {
      return res.status(400).json({
        success: false,
        message: "Registration deadline has passed.",
      });
    }

    // Check Duplicate Booking
    const existingBooking = await Booking.findOne({
      user: req.user._id,
      event: event._id,
    });

    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: "You have already booked this event.",
      });
    }

    const bookingId = await generateBookingId();

    if (event.availableSeats <= 0 && joinWaitlist) {
      const booking = await Booking.create({
        user: req.user._id,
        event: event._id,
        ticketNumber: bookingId,
        bookingId,
        amount: event.price,
        isPaid: false,
        paymentMethod: event.isPaid ? "Razorpay" : "Free",
        paymentStatus: event.isPaid ? "Pending" : "Paid",
        bookingStatus: "Waiting",
      });

      await Notification.create({
        user: req.user._id,
        event: event._id,
        title: "Waitlist Joined",
        message: `You joined the waitlist for ${event.title}. We will notify you when a seat is available.`,
        type: "BOOKING",
      });

      return res.status(201).json({
        success: true,
        message: "Waitlist joined successfully.",
        booking,
      });
    }

    if (event.availableSeats <= 0) {
      return res.status(400).json({
        success: false,
        message: "No seats available. Join the waitlist to be notified when a seat opens.",
      });
    }

    const reservedEvent = await Event.findOneAndUpdate(
      {
        _id: event._id,
        availableSeats: { $gt: 0 },
      },
      {
        $inc: { availableSeats: -1 },
      },
      {
        new: true,
      }
    );

    if (!reservedEvent) {
      return res.status(400).json({
        success: false,
        message: "No seats available.",
      });
    }

    let booking;

    try {
      booking = await Booking.create({
        user: req.user._id,
        event: event._id,
        ticketNumber: bookingId,
        bookingId,
        amount: event.price,
        isPaid: !event.isPaid,
        paymentMethod: event.isPaid ? "Razorpay" : "Free",
        paymentStatus: event.isPaid ? "Pending" : "Paid",
        seatNumber,
      });

      booking.qrCode = await generateQRCode({
        bookingId: booking.bookingId,
        userId: req.user._id,
        eventId: event._id,
        ticketNumber: booking.ticketNumber,
      });
      await booking.save();
    } catch (error) {
      await Event.findByIdAndUpdate(event._id, {
        $inc: { availableSeats: 1 },
      });

      throw error;
    }

    // Notification
    await Notification.create({
      user: req.user._id,
      event: event._id,
      title: "Booking Successful",
      message: `You have successfully registered for ${event.title}`,
      type: "BOOKING",
    });

    const qrCid = `ticket-qr-${booking.bookingId}`;
    const qrAttachment = dataUrlToAttachment({
      dataUrl: booking.qrCode,
      filename: `${booking.bookingId}-qr-ticket.png`,
      cid: qrCid,
    });

    await safeSendEmail({
      to: req.user.email,
      subject: `Registration Confirmed: ${event.title}`,
      text: `Your registration for ${event.title} is confirmed. Booking ID: ${booking.bookingId}. Venue: ${event.venue}. Date: ${formatDate(event.eventDate)}. Time: ${event.startTime} - ${event.endTime}.`,
      html: bookingTemplate({
        name: req.user.name,
        eventTitle: event.title,
        venue: event.venue,
        eventDate: formatDate(event.eventDate),
        startTime: event.startTime,
        endTime: event.endTime,
        ticketNumber: booking.bookingId,
        paymentStatus: booking.paymentStatus,
        amount: booking.amount,
        qrCodeCid: qrCid,
      }),
      attachments: qrAttachment ? [qrAttachment] : [],
    });

    return res.status(201).json({
      success: true,
      message: "Event booked successfully.",
      booking,
    });

  } catch (error) {
    next(error);
  }
};

// ======================================================
// Get My Bookings
// ======================================================

exports.getMyBookings = async (req, res, next) => {
  try {

    const bookings = await Booking.find({
      user: req.user._id,
    })
      .populate("event")
      .sort({
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });

  } catch (error) {
    next(error);
  }
};

// ======================================================
// Get Booking Details
// ======================================================

exports.getBookingDetails = async (req, res, next) => {
  try {

    const booking = await findBooking(req.params.id)
      .populate("event")
      .populate("user", "name email phone profileImage");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    // Owner or Admin
    if (
      booking.user._id.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access.",
      });
    }

    return res.status(200).json({
      success: true,
      booking,
    });

  } catch (error) {
    next(error);
  }
};

// ======================================================
// Cancel Booking
// ======================================================

exports.cancelBooking = async (req, res, next) => {
  try {

    const booking = await findBooking(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    if (
      booking.user.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    if (booking.bookingStatus === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Booking already cancelled.",
      });
    }

    booking.bookingStatus = "Cancelled";
    if (booking.paymentStatus === "Paid" && booking.amount > 0) {
      booking.refundStatus = "Refund Initiated";
    }

    await booking.save();

    // Restore Seat
    await Event.findByIdAndUpdate(
      booking.event,
      {
        $inc: {
          availableSeats: 1,
        },
      }
    );

    const promotedBooking = await Booking.findOne({
      event: booking.event,
      bookingStatus: "Waiting",
    }).sort({ createdAt: 1 });

    if (promotedBooking) {
      promotedBooking.bookingStatus = "Confirmed";
      await promotedBooking.save();

      await Event.findByIdAndUpdate(booking.event, {
        $inc: {
          availableSeats: -1,
        },
      });

      await Notification.create({
        user: promotedBooking.user,
        event: booking.event,
        title: "Seat Available",
        message: "A seat is available for your waitlisted event. Register Now.",
        type: "BOOKING",
        priority: "HIGH",
      });
    }

    // Notification
    await Notification.create({
      user: booking.user,
      event: booking.event,
      title: "Booking Cancelled",
      message: booking.refundStatus === "Refund Initiated"
        ? "Your booking has been cancelled successfully. Refund Initiated."
        : "Your booking has been cancelled successfully.",
      type: "BOOKING",
    });

    return res.status(200).json({
      success: true,
      message: "Booking cancelled successfully.",
    });

  } catch (error) {
    next(error);
  }
};

// ======================================================
// Download QR Ticket
// ======================================================

exports.downloadTicket = async (req, res, next) => {

  try {

    const booking = await findBooking(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    if (
      booking.user.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    return res.status(200).json({
      success: true,
      ticketNumber: booking.ticketNumber,
      qrCode: booking.qrCode,
    });

  } catch (error) {
    next(error);
  }

};

// ======================================================
// Check-in By QR / Ticket Number
// ======================================================

exports.scanCheckIn = async (req, res, next) => {
  try {
    const { bookingId, ticketNumber } = req.body;

    if (!bookingId && !ticketNumber) {
      return res.status(400).json({
        success: false,
        message: "bookingId or ticketNumber is required.",
      });
    }

    const query = ticketNumber ? { ticketNumber } : { bookingId };

    if (bookingId && bookingId.match(objectIdPattern)) {
      query.$or = [{ _id: bookingId }, { bookingId }];
      delete query.bookingId;
    }

    const booking = await Booking.findOne(query).populate("event");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    if (
      !canManageEvent(booking.event, req.user)
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    if (booking.bookingStatus === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled bookings cannot be checked in.",
      });
    }

    if (booking.attendanceStatus === "Present") {
      return res.status(409).json({
        success: false,
        message: "Duplicate scan blocked. Attendance is already marked present.",
      });
    }

    booking.attendanceStatus = "Present";
    booking.checkedInAt = new Date();

    await booking.save();

    await Notification.create({
      user: booking.user,
      event: booking.event._id,
      title: "Checked In",
      message: "Your event attendance has been marked.",
      type: "EVENT",
    });

    return res.status(200).json({
      success: true,
      message: "Check-in successful.",
      booking,
    });

  } catch (error) {
    next(error);
  }
};

const generateCertificate = require("../utils/certificateGenerator");

// ======================================================
// Mark Attendance (Organizer/Admin)
// ======================================================

exports.markAttendance = async (req, res, next) => {
  try {
    const booking = await findBooking(req.params.id)
      .populate("event");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    // Only Organizer or Admin
    if (
      !canManageEvent(booking.event, req.user)
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    if (booking.attendanceStatus === "Present") {
      return res.status(400).json({
        success: false,
        message: "Attendance already marked.",
      });
    }

    booking.attendanceStatus = "Present";
    booking.checkedInAt = new Date();

    await booking.save();

    await Notification.create({
      user: booking.user,
      event: booking.event._id,
      title: "Attendance Marked",
      message: "Your attendance has been successfully marked.",
      type: "EVENT",
    });

    return res.status(200).json({
      success: true,
      message: "Attendance marked successfully.",
      booking,
    });

  } catch (error) {
    next(error);
  }
};

// ======================================================
// Generate Certificate
// ======================================================

exports.generateCertificateForUser = async (req, res, next) => {
  try {

    const booking = await findBooking(req.params.id)
      .populate("user")
      .populate({
        path: "event",
        populate: {
          path: "organizer",
          select: "name",
        },
      });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    if (!canManageEvent(booking.event, req.user)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    if (booking.attendanceStatus !== "Present") {
      return res.status(400).json({
        success: false,
        message: "Attendance is required before generating a certificate.",
      });
    }

    if (booking.certificateIssued) {
      return res.status(200).json({
        success: true,
        message: "Certificate already generated.",
        certificateUrl: booking.certificateUrl,
      });
    }

    const certificateNumber = `CERT-${Date.now()}`;

    const certificatePath = await generateCertificate({
      studentName: booking.user.name,
      eventTitle: booking.event.title,
      eventDate: booking.event.eventDate,
      organizerName: booking.event.organizer?.name || "Event Organizer",
      certificateNumber,
      signatureImage: booking.event.certificateSignature,
      partnerCompanies: booking.event.partnerCompanies || [],
    });

    booking.certificateIssued = true;
    booking.certificateUrl = certificatePath;

    await booking.save();

    const certificateUrl = getPublicFileUrl(req, certificatePath);
    const certificateFilePath = getServerFilePath(certificatePath);
    const certificateAttachments = fs.existsSync(certificateFilePath)
      ? [
          {
            filename: `${certificateNumber}.pdf`,
            path: certificateFilePath,
            contentType: "application/pdf",
          },
        ]
      : [];

    await Notification.create({
      user: booking.user._id,
      event: booking.event._id,
      title: "Certificate Ready",
      message: "Your participation certificate is now available.",
      type: "CERTIFICATE",
    });

    await safeSendEmail({
      to: booking.user.email,
      subject: `Certificate Issued: ${booking.event.title}`,
      text: `Your certificate for ${booking.event.title} has been issued. Download: ${certificateUrl}`,
      html: certificateTemplate({
        name: booking.user.name,
        eventTitle: booking.event.title,
        eventDate: formatDate(booking.event.eventDate),
        certificateUrl,
        certificateNumber,
        bookingId: booking.bookingId,
      }),
      attachments: certificateAttachments,
    });

    return res.status(200).json({
      success: true,
      message: "Certificate generated successfully.",
      certificateUrl: certificatePath,
    });

  } catch (error) {
    next(error);
  }
};

// ======================================================
// Get Certificate
// ======================================================

exports.getCertificate = async (req, res, next) => {
  try {
    const booking = await findBooking(req.params.registrationId)
      .populate("user")
      .populate("event");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    if (
      booking.user._id.toString() !== req.user._id.toString() &&
      !canManageEvent(booking.event, req.user) &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    if (!booking.certificateIssued) {
      return res.status(404).json({
        success: false,
        message: "Certificate has not been issued yet.",
      });
    }

    return res.status(200).json({
      success: true,
      certificateUrl: booking.certificateUrl,
      booking,
    });

  } catch (error) {
    next(error);
  }
};

// ======================================================
// Booking Statistics
// ======================================================

exports.getBookingStats = async (req, res, next) => {
  try {

    const totalBookings = await Booking.countDocuments();

    const confirmedBookings = await Booking.countDocuments({
      bookingStatus: "Confirmed",
    });

    const cancelledBookings = await Booking.countDocuments({
      bookingStatus: "Cancelled",
    });

    const attendanceMarked = await Booking.countDocuments({
      attendanceStatus: "Present",
    });

    const certificatesIssued = await Booking.countDocuments({
      certificateIssued: true,
    });

    return res.status(200).json({
      success: true,
      stats: {
        totalBookings,
        confirmedBookings,
        cancelledBookings,
        attendanceMarked,
        certificatesIssued,
      },
    });

  } catch (error) {
    next(error);
  }
};
