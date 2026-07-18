const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const Booking = require("../models/Booking");
const Certificate = require("../models/Certificate");
const Notification = require("../models/Notification");
const generateCertificate = require("../utils/certificateGenerator");
const { generateQRCode } = require("../utils/qrGenerator");
const sendEmail = require("../utils/sendEmail");
const sendSms = require("../utils/sendSms");
const certificateTemplate = require("../templates/certificateTemplate");

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

const normalizeBaseUrl = (value = "") => String(value || "").trim().replace(/\/+$/, "");

const getClientBaseUrl = (req) =>
  normalizeBaseUrl(process.env.CLIENT_URL?.split(",")[0]) ||
  normalizeBaseUrl(process.env.PUBLIC_CLIENT_URL) ||
  (req ? `${req.protocol}://${req.get("host")}` : "http://localhost:5173");

const getApiBaseUrl = (req) =>
  normalizeBaseUrl(process.env.API_PUBLIC_URL) ||
  (req ? `${req.protocol}://${req.get("host")}` : "http://localhost:5000");

const getPublicFileUrl = (req, relativePath) => {
  if (!relativePath) return "";
  if (/^https?:\/\//i.test(relativePath)) return relativePath;

  return `${getApiBaseUrl(req)}${relativePath.startsWith("/") ? relativePath : `/${relativePath}`}`;
};

const getServerFilePath = (relativePath) => {
  if (!relativePath || /^https?:\/\//i.test(relativePath)) return "";

  return path.join(__dirname, "..", relativePath.replace(/^\/+/, ""));
};

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

const safeSendEmail = async (mailOptions) => {
  try {
    await sendEmail(mailOptions);
  } catch (error) {
    console.error("Certificate email failed:", error.message);
  }
};

const safeSendSms = async (smsOptions) => {
  try {
    await sendSms(smsOptions);
  } catch (error) {
    console.error("Certificate SMS failed:", error.message);
  }
};

const canReceiveCertificate = (booking) => {
  const event = booking.event;
  const isPaidComplete = !event.isPaid || booking.paymentStatus === "Paid";

  return (
    booking.bookingStatus === "Confirmed" &&
    booking.attendanceStatus === "Present" &&
    isPaidComplete
  );
};

const buildCertificateId = (booking) => {
  const eventPart = String(booking.event?._id || booking.event).slice(-5).toUpperCase();
  const userPart = String(booking.user?._id || booking.user).slice(-5).toUpperCase();
  const randomPart = crypto.randomBytes(3).toString("hex").toUpperCase();

  return `CERT-${new Date().getFullYear()}-${eventPart}-${userPart}-${randomPart}`;
};

const getCoordinatorName = (event) => {
  const coordinator =
    event.organizerCoordinators?.[0] ||
    event.studentCoordinators?.[0] ||
    event.assignedOrganizers?.find((user) => String(user._id || user) !== String(event.organizer?._id || event.organizer));

  return coordinator?.name || "";
};

const issueCertificateForBooking = async ({ booking, req = null, notify = true, email = true }) => {
  if (!booking.populated("user")) {
    await booking.populate("user");
  }

  if (!booking.populated("event")) {
    await booking.populate({
      path: "event",
      populate: [
        { path: "organizer", select: "name email profileImage" },
        { path: "assignedOrganizers", select: "name" },
        { path: "organizerCoordinators", select: "name" },
        { path: "studentCoordinators", select: "name" },
      ],
    });
  }

  const existingCertificate = await Certificate.findOne({ registration: booking._id });

  if (existingCertificate) {
    if (!booking.certificateIssued || booking.certificateUrl !== existingCertificate.pdfUrl) {
      booking.certificateIssued = true;
      booking.certificateUrl = existingCertificate.pdfUrl;
      await booking.save();
    }

    return {
      certificate: existingCertificate,
      created: false,
      skipped: false,
    };
  }

  if (!canReceiveCertificate(booking)) {
    return {
      certificate: null,
      created: false,
      skipped: true,
      reason: "Registration, payment, and present attendance are required.",
    };
  }

  const certificateId = buildCertificateId(booking);
  const verificationToken = crypto.randomBytes(24).toString("hex");
  const verificationUrl = `${getClientBaseUrl(req)}/certificate/verify/${certificateId}`;
  const qrCode = await generateQRCode({
    type: "CERTIFICATE_VERIFICATION",
    certificateId,
    verificationUrl,
  });
  const organizerName = booking.event.organizer?.name || "Event Organizer";
  const coordinatorName = getCoordinatorName(booking.event);

  const generated = await generateCertificate({
    studentName: booking.user.name,
    eventTitle: booking.event.title,
    eventDate: booking.event.eventDate,
    organizerName,
    coordinatorName,
    certificateNumber: certificateId,
    signatureImage: booking.event.certificateSignature,
    partnerCompanies: booking.event.partnerCompanies || [],
    qrCodeImage: qrCode,
    verificationUrl,
    universityLogo: booking.event.poster,
    organizationLogo: booking.event.organizer?.profileImage || "",
  });

  const certificate = await Certificate.create({
    certificateId,
    user: booking.user._id,
    event: booking.event._id,
    registration: booking._id,
    pdfUrl: generated.pdfUrl,
    imageUrl: generated.imageUrl,
    issuedDate: new Date(),
    verificationToken,
    verificationUrl,
    qrCode,
    metadata: {
      organizerName,
      coordinatorName,
      eventName: booking.event.title,
      studentName: booking.user.name,
    },
  });

  booking.certificateIssued = true;
  booking.certificateUrl = certificate.pdfUrl;
  await booking.save();

  if (notify) {
    await Notification.create({
      user: booking.user._id,
      event: booking.event._id,
      title: "Certificate Ready",
      message: `Your participation certificate for ${booking.event.title} is ready.`,
      type: "CERTIFICATE",
      actionText: "View certificate",
      actionUrl: `/certificates/${booking._id}`,
    });
  }

  if (email && booking.user.email) {
    const certificateUrl = getPublicFileUrl(req, certificate.pdfUrl);
    const certificateFilePath = getServerFilePath(certificate.pdfUrl);
    const certificateAttachments = fs.existsSync(certificateFilePath)
      ? [
          {
            filename: `${certificate.certificateId}.pdf`,
            path: certificateFilePath,
            contentType: "application/pdf",
          },
        ]
      : [];

    await safeSendEmail({
      to: booking.user.email,
      subject: `Certificate Issued: ${booking.event.title}`,
      text: `Your certificate for ${booking.event.title} has been issued. Download: ${certificateUrl}. Verify: ${verificationUrl}`,
      html: certificateTemplate({
        name: booking.user.name,
        eventTitle: booking.event.title,
        eventDate: formatDate(booking.event.eventDate),
        certificateUrl,
        certificateNumber: certificate.certificateId,
        bookingId: booking.bookingId,
        verificationUrl,
      }),
      attachments: certificateAttachments,
    });
  }

  await safeSendSms({
    to: booking.user.phone,
    message: `Certificate ready for ${booking.event.title}. Certificate ID: ${certificate.certificateId}. Verify: ${verificationUrl}`,
  });

  return {
    certificate,
    created: true,
    skipped: false,
  };
};

const issueCertificatesForEvent = async ({ event, req = null, notify = true, email = true }) => {
  const bookings = await Booking.find({
    event: event._id,
    bookingStatus: "Confirmed",
    attendanceStatus: "Present",
    ...(event.isPaid ? { paymentStatus: "Paid" } : {}),
  })
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

  const results = [];

  for (const booking of bookings) {
    results.push(await issueCertificateForBooking({ booking, req, notify, email }));
  }

  return {
    eligible: bookings.length,
    issued: results.filter((result) => result.created).length,
    existing: results.filter((result) => result.certificate && !result.created).length,
    skipped: results.filter((result) => result.skipped).length,
  };
};

module.exports = {
  findBooking,
  formatDate,
  getPublicFileUrl,
  issueCertificateForBooking,
  issueCertificatesForEvent,
};
