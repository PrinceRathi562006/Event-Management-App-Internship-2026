const Certificate = require("../models/Certificate");
const { findBooking, getPublicFileUrl, issueCertificateForBooking } = require("../services/certificateService");

const canManageEvent = (event, user) => {
  const userId = user._id.toString();
  const idOf = (value) => String(value?._id || value || "");

  return (
    user.role === "admin" ||
    idOf(event.organizer) === userId ||
    event.assignedOrganizers?.some((id) => idOf(id) === userId) ||
    event.organizerCoordinators?.some((id) => idOf(id) === userId) ||
    event.studentCoordinators?.some((id) => idOf(id) === userId)
  );
};

const serializeCertificate = (certificate, req) => ({
  ...certificate.toObject(),
  pdfUrl: certificate.pdfUrl,
  imageUrl: certificate.imageUrl,
  absolutePdfUrl: getPublicFileUrl(req, certificate.pdfUrl),
  absoluteImageUrl: getPublicFileUrl(req, certificate.imageUrl),
});

exports.generateCertificateForUser = async (req, res, next) => {
  try {
    const booking = await findBooking(req.params.id)
      .populate("user")
      .populate({
        path: "event",
        populate: [
          { path: "organizer", select: "name email profileImage" },
          { path: "assignedOrganizers", select: "name" },
          { path: "organizerCoordinators", select: "name" },
          { path: "studentCoordinators", select: "name" },
        ],
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

    const result = await issueCertificateForBooking({ booking, req });

    if (result.skipped) {
      return res.status(400).json({
        success: false,
        message: result.reason,
      });
    }

    return res.status(result.created ? 201 : 200).json({
      success: true,
      message: result.created ? "Certificate generated successfully." : "Certificate already generated.",
      certificate: serializeCertificate(result.certificate, req),
      certificateUrl: result.certificate.pdfUrl,
    });
  } catch (error) {
    next(error);
  }
};

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
      !canManageEvent(booking.event, req.user)
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    const certificate = await Certificate.findOne({ registration: booking._id })
      .populate("user", "name email rollNumber profileImage")
      .populate("event", "title eventDate venue poster organizer")
      .populate("registration", "bookingId ticketNumber attendanceStatus paymentStatus bookingStatus");

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: "Certificate has not been issued yet.",
      });
    }

    return res.status(200).json({
      success: true,
      certificate: serializeCertificate(certificate, req),
      certificateUrl: certificate.pdfUrl,
      booking,
    });
  } catch (error) {
    next(error);
  }
};

exports.getMyCertificates = async (req, res, next) => {
  try {
    const certificates = await Certificate.find({
      user: req.user._id,
      status: "Valid",
    })
      .populate("event", "title eventDate venue poster category")
      .populate("registration", "bookingId ticketNumber")
      .sort({ issuedDate: -1 });

    return res.status(200).json({
      success: true,
      count: certificates.length,
      certificates: certificates.map((certificate) => serializeCertificate(certificate, req)),
    });
  } catch (error) {
    next(error);
  }
};

exports.verifyCertificate = async (req, res, next) => {
  try {
    const certificate = await Certificate.findOne({
      certificateId: req.params.certificateId,
      status: "Valid",
    })
      .populate("user", "name email rollNumber profileImage")
      .populate("event", "title eventDate venue organizer")
      .populate("registration", "bookingId ticketNumber attendanceStatus paymentStatus bookingStatus");

    if (!certificate) {
      return res.status(404).json({
        success: false,
        verified: false,
        message: "Invalid Certificate",
      });
    }

    return res.status(200).json({
      success: true,
      verified: true,
      message: "Verified",
      certificate: serializeCertificate(certificate, req),
    });
  } catch (error) {
    next(error);
  }
};
