const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const Attendance = require("../models/Attendance");
const Booking = require("../models/Booking");
const Event = require("../models/Event");
const Notification = require("../models/Notification");
const QRSession = require("../models/QRSession");
const ScanLog = require("../models/ScanLog");
const { getIO } = require("../sockets/socket");

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const qrSecret = () => process.env.QR_ATTENDANCE_SECRET || process.env.JWT_SECRET;

const hashSecret = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");

const isAssignedScanner = (event, userId) =>
  event.assignedOrganizers?.some((organizerId) => organizerId.toString() === userId.toString()) ||
  event.organizerCoordinators?.some((organizerId) => organizerId.toString() === userId.toString()) ||
  event.studentCoordinators?.some((studentId) => studentId.toString() === userId.toString());

const canScanEvent = (event, user) =>
  user.role === "admin" ||
  event.organizer.toString() === user._id.toString() ||
  isAssignedScanner(event, user._id);

const getScannerRole = (event, user) => {
  if (user.role === "admin") return "admin";
  if (event.organizer.toString() === user._id.toString()) return "organizer";
  return "coordinator";
};

const detectBrowser = (userAgent = "") => {
  if (/Edg\//i.test(userAgent)) return "Edge";
  if (/Chrome\//i.test(userAgent)) return "Chrome";
  if (/Firefox\//i.test(userAgent)) return "Firefox";
  if (/Safari\//i.test(userAgent)) return "Safari";
  return "Unknown";
};

const detectDevice = (userAgent = "") => {
  if (/Mobi|Android|iPhone|iPad/i.test(userAgent)) return "Mobile";
  return "Desktop";
};

const getClientInfo = (req) => {
  const userAgent = req.headers["user-agent"] || "";

  return {
    device: req.body?.device || detectDevice(userAgent),
    browser: req.body?.browser || detectBrowser(userAgent),
    ipAddress: req.ip || req.connection?.remoteAddress || "",
    location: req.body?.location || "",
  };
};

const normalizeScanValue = (value) => String(value || "").trim().replace(/^\uFEFF/, "");

const readScanPayload = (raw) => {
  const value = normalizeScanValue(raw);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    try {
      return JSON.parse(decodeURIComponent(value));
    } catch {
      return null;
    }
  }
};

const readScanUrl = (raw) => {
  const value = normalizeScanValue(raw);

  try {
    const url = new URL(value);
    const params = url.searchParams;
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
    const param = (key) => params.get(key) || hashParams.get(key) || "";
    const pathParts = url.pathname.split("/").map((part) => part.trim()).filter(Boolean);
    const pathIdentifier =
      pathParts.find((part) => objectIdPattern.test(part) || /^EVT-\d{4}-\d+$/i.test(part)) ||
      pathParts[pathParts.length - 1] ||
      "";

    return {
      token: param("token") || param("qrToken"),
      ticketNumber: param("ticketNumber") || param("ticket") || param("code"),
      bookingId: param("bookingId") || param("registrationId") || param("registration") || pathIdentifier,
      eventId: param("eventId") || param("event") || "",
    };
  } catch {
    return null;
  }
};

const parseScanInput = (body = {}) => {
  const raw = normalizeScanValue(body.rawCode || body.code || body.token || body.ticketNumber || body.bookingId);

  if (!raw) {
    return {};
  }

  const parsedPayload = readScanPayload(raw);

  if (parsedPayload) {
    const parsed = parsedPayload.data || parsedPayload.payload || parsedPayload;
    return {
      token: parsed.token || parsed.qrToken || "",
      ticketNumber: parsed.ticketNumber || parsed.ticket || parsed.code || "",
      bookingId: parsed.bookingId || parsed.registrationId || parsed.registration || "",
      eventId: body.eventId || parsed.eventId || "",
    };
  }

  const urlPayload = readScanUrl(raw);

  if (urlPayload && (urlPayload.token || urlPayload.ticketNumber || urlPayload.bookingId || urlPayload.eventId)) {
    return {
      token: body.token || urlPayload.token,
      ticketNumber: body.ticketNumber || urlPayload.ticketNumber,
      bookingId: body.bookingId || urlPayload.bookingId,
      eventId: body.eventId || urlPayload.eventId,
    };
  }

  return {
    token: body.token || (raw.split(".").length === 3 ? raw : ""),
    ticketNumber: body.ticketNumber || (raw.split(".").length === 3 ? "" : raw),
    bookingId: body.bookingId || "",
    eventId: body.eventId || "",
  };
};

const bookingLookup = ({ bookingId, ticketNumber }) => {
  const clauses = [];

  [bookingId, ticketNumber].map(normalizeScanValue).filter(Boolean).forEach((value) => {
    if (objectIdPattern.test(value)) {
      clauses.push({ _id: value });
    }

    clauses.push({ bookingId: value }, { ticketNumber: value });
  });

  return clauses.length ? { $or: clauses } : { bookingId: "" };
};

const logScan = async (req, details) => {
  const client = getClientInfo(req);

  try {
    await ScanLog.create({
      scanner: req.user?._id || null,
      role: req.user?.role || "",
      participant: details.participant || null,
      event: details.event || null,
      registration: details.registration || null,
      device: client.device,
      browser: client.browser,
      ip: client.ipAddress,
      result: details.result,
      message: details.message || "",
    });
  } catch (error) {
    console.error("Scan log failed:", error.message);
  }
};

const failScan = async (req, statusCode, result, message, details = {}) => {
  await logScan(req, { ...details, result, message });

  return {
    statusCode,
    body: {
      success: false,
      result,
      message,
    },
  };
};

const getEventEnd = (event) => {
  const base = new Date(event.eventDate);
  const match = String(event.endTime || "").match(/^(\d{1,2}):(\d{2})/);

  if (match) {
    base.setHours(Number(match[1]), Number(match[2]), 0, 0);
  } else {
    base.setHours(23, 59, 59, 999);
  }

  return base;
};

const resolveScan = async (req) => {
  const input = parseScanInput(req.body);

  if (!input.token && !input.bookingId && !input.ticketNumber) {
    return failScan(req, 400, "Invalid", "QR code or ticket number is required.");
  }

  let qrSession = null;
  let booking = null;
  let payload = null;

  if (input.token) {
    let useTokenSession = true;

    try {
      payload = jwt.verify(input.token, qrSecret());
    } catch {
      useTokenSession = false;
    }

    if (useTokenSession && payload.type !== "EVENT_ATTENDANCE") {
      useTokenSession = false;
    }

    if (useTokenSession) {
      qrSession = await QRSession.findOne({ token: input.token });

      if (!qrSession) {
        useTokenSession = false;
      }
    } else {
      qrSession = await QRSession.findOne({ token: input.token });
      useTokenSession = Boolean(qrSession);
    }

    if (useTokenSession) {
      if (!qrSession.isActive || qrSession.status === "Disabled") {
        return failScan(req, 403, "Disabled", "Scanner disabled for this QR.", {
          participant: qrSession.userId,
          event: qrSession.eventId,
          registration: qrSession.registrationId,
        });
      }

      if (qrSession.expiresAt < new Date()) {
        qrSession.status = "Expired";
        await qrSession.save();

        return failScan(req, 410, "Expired", "QR code has expired.", {
          participant: qrSession.userId,
          event: qrSession.eventId,
          registration: qrSession.registrationId,
        });
      }

      if (payload?.secret && hashSecret(payload.secret) !== qrSession.secretHash) {
        useTokenSession = false;
      }
    }

    if (useTokenSession) {
      booking = await Booking.findById(qrSession.registrationId)
        .populate("event")
        .populate("user", "name email phone rollNumber college course branch department designation year semester profileImage resumeUrl resumeFileName resumeMimeType resumeUploadedAt");
    } else if (input.bookingId || input.ticketNumber) {
      booking = await Booking.findOne(bookingLookup(input))
        .populate("event")
        .populate("user", "name email phone rollNumber college course branch department designation year semester profileImage resumeUrl resumeFileName resumeMimeType resumeUploadedAt");
    } else {
      return failScan(req, 400, "Invalid", "QR signature is invalid or has expired.");
    }
  } else {
    booking = await Booking.findOne(bookingLookup(input))
      .populate("event")
      .populate("user", "name email phone rollNumber college course branch department designation year semester profileImage resumeUrl resumeFileName resumeMimeType resumeUploadedAt");
  }

  if (!booking) {
    return failScan(req, 404, "Invalid", "Registration was not found.");
  }

  if (input.eventId && booking.event._id.toString() !== input.eventId.toString()) {
    return failScan(req, 400, "Wrong Event", "This QR belongs to another event.", {
      participant: booking.user?._id,
      event: booking.event?._id,
      registration: booking._id,
    });
  }

  if (!canScanEvent(booking.event, req.user)) {
    return failScan(req, 403, "Permission Denied", "You do not have scanner permission for this event.", {
      participant: booking.user?._id,
      event: booking.event?._id,
      registration: booking._id,
    });
  }

  if (booking.bookingStatus === "Cancelled") {
    return failScan(req, 400, "Invalid", "Cancelled registrations cannot be marked.");
  }

  if (new Date() > getEventEnd(booking.event)) {
    return failScan(req, 410, "Expired", "QR code has expired because the event has ended.", {
      participant: booking.user?._id,
      event: booking.event?._id,
      registration: booking._id,
    });
  }

  const existingAttendance = await Attendance.findOne({
    eventId: booking.event._id,
    participantId: booking.user._id,
  });

  return {
    booking,
    qrSession,
    existingAttendance,
    scannerRole: getScannerRole(booking.event, req.user),
  };
};

const getAttendanceSummary = async (eventId) => {
  const [totalRegistered, present, absent] = await Promise.all([
    Booking.countDocuments({ event: eventId, bookingStatus: { $ne: "Cancelled" } }),
    Attendance.countDocuments({ eventId, status: "Present" }),
    Attendance.countDocuments({ eventId, status: "Absent" }),
  ]);
  const checkedIn = present + absent;
  const pending = Math.max(totalRegistered - checkedIn, 0);

  return {
    totalRegistered,
    checkedIn,
    present,
    absent,
    pending,
    late: 0,
    attendancePercentage: totalRegistered ? Math.round((present / totalRegistered) * 100) : 0,
  };
};

const serializeParticipant = (booking, existingAttendance) => ({
  event: {
    id: booking.event._id,
    title: booking.event.title,
    venue: booking.event.venue,
  },
  registration: {
    id: booking._id,
    bookingId: booking.bookingId,
    ticketNumber: booking.ticketNumber,
  },
  participant: {
    id: booking.user._id,
    name: booking.user.name,
    registrationNumber: booking.user.rollNumber || booking.ticketNumber,
    department: booking.user.department || booking.user.branch || "Not added",
    course: booking.user.course || "Not added",
    email: booking.user.email,
    photo: booking.user.profileImage,
  },
  attendance: existingAttendance
    ? {
        alreadyMarked: true,
        status: existingAttendance.status,
        scanTime: existingAttendance.scanTime,
      }
    : {
        alreadyMarked: false,
        status: booking.attendanceStatus || "Not Marked",
        scanTime: booking.checkedInAt,
      },
});

exports.scanAttendance = async (req, res, next) => {
  try {
    const resolved = await resolveScan(req);

    if (resolved.body) {
      return res.status(resolved.statusCode).json(resolved.body);
    }

    const { booking, qrSession, existingAttendance } = resolved;

    if (existingAttendance) {
      await logScan(req, {
        result: "Duplicate",
        message: "Attendance already marked.",
        participant: booking.user._id,
        event: booking.event._id,
        registration: booking._id,
      });

      return res.status(409).json({
        success: false,
        result: "Duplicate",
        message: "Attendance Already Marked",
        ...serializeParticipant(booking, existingAttendance),
      });
    }

    if (qrSession && qrSession.status === "Generated") {
      qrSession.status = "Scanned";
      await qrSession.save();
    }

    await logScan(req, {
      result: "Success",
      message: "Attendance preview opened.",
      participant: booking.user._id,
      event: booking.event._id,
      registration: booking._id,
    });

    return res.status(200).json({
      success: true,
      message: "Attendance Found",
      scannerRole: resolved.scannerRole,
      ...serializeParticipant(booking, existingAttendance),
    });
  } catch (error) {
    next(error);
  }
};

exports.markAttendance = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!["Present", "Absent"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Attendance status must be Present or Absent.",
      });
    }

    const resolved = await resolveScan(req);

    if (resolved.body) {
      return res.status(resolved.statusCode).json(resolved.body);
    }

    const { booking, qrSession, existingAttendance, scannerRole } = resolved;

    if (existingAttendance) {
      await logScan(req, {
        result: "Duplicate",
        message: "Attendance already marked.",
        participant: booking.user._id,
        event: booking.event._id,
        registration: booking._id,
      });

      return res.status(409).json({
        success: false,
        result: "Duplicate",
        message: "Attendance Already Marked",
        ...serializeParticipant(booking, existingAttendance),
      });
    }

    const client = getClientInfo(req);
    let attendance;

    try {
      attendance = await Attendance.create({
        attendanceId: `ATT-${uuidv4()}`,
        eventId: booking.event._id,
        participantId: booking.user._id,
        registrationId: booking._id,
        markedBy: req.user._id,
        scannerRole,
        status,
        scanTime: new Date(),
        device: client.device,
        browser: client.browser,
        ipAddress: client.ipAddress,
        location: client.location,
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          result: "Duplicate",
          message: "Attendance Already Marked",
        });
      }

      throw error;
    }

    booking.attendanceStatus = status;
    booking.checkedInAt = attendance.scanTime;
    await booking.save();

    if (status === "Present") {
      await Event.findByIdAndUpdate(booking.event._id, {
        $inc: { totalAttendance: 1 },
      });
    }

    if (qrSession) {
      qrSession.status = "Marked";
      await qrSession.save();
    }

    await Notification.create({
      user: booking.user._id,
      event: booking.event._id,
      title: "Attendance Marked",
      message: `Your attendance has been marked ${status}.`,
      type: "EVENT",
    });

    await logScan(req, {
      result: "Success",
      message: `Attendance marked ${status}.`,
      participant: booking.user._id,
      event: booking.event._id,
      registration: booking._id,
    });

    const summary = await getAttendanceSummary(booking.event._id);
    const io = getIO();

    if (io) {
      io.to(`event:${booking.event._id}`).emit("attendance:update", {
        eventId: booking.event._id,
        summary,
        attendance,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Attendance Marked",
      attendance,
      summary,
      ...serializeParticipant(booking, null),
      markedBy: {
        name: req.user.name,
        role: scannerRole,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getEventAttendance = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found.",
      });
    }

    if (!canScanEvent(event, req.user)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    const [attendances, summary, recentLogs] = await Promise.all([
      Attendance.find({ eventId: event._id })
        .populate("participantId", "name email rollNumber course branch department profileImage resumeUrl resumeFileName resumeMimeType resumeUploadedAt")
        .populate("markedBy", "name role")
        .sort({ scanTime: -1 }),
      getAttendanceSummary(event._id),
      ScanLog.find({ event: event._id })
        .populate("participant", "name rollNumber")
        .populate("scanner", "name role")
        .sort({ createdAt: -1 })
        .limit(20),
    ]);

    return res.status(200).json({
      success: true,
      summary,
      attendances,
      recentLogs,
    });
  } catch (error) {
    next(error);
  }
};

exports.getUserAttendance = async (req, res, next) => {
  try {
    if (req.params.userId !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    const attendances = await Attendance.find({ participantId: req.params.userId })
      .populate("eventId", "title eventDate venue")
      .populate("markedBy", "name role")
      .sort({ scanTime: -1 });

    return res.status(200).json({
      success: true,
      attendances,
    });
  } catch (error) {
    next(error);
  }
};

exports.resetAttendance = async (req, res, next) => {
  try {
    const attendance = await Attendance.findById(req.params.attendanceId);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Attendance not found.",
      });
    }

    await Attendance.deleteOne({ _id: attendance._id });
    await Booking.findByIdAndUpdate(attendance.registrationId, {
      attendanceStatus: "Not Marked",
      checkedInAt: null,
    });

    if (attendance.status === "Present") {
      await Event.findByIdAndUpdate(attendance.eventId, {
        $inc: { totalAttendance: -1 },
      });
    }

    await QRSession.findOneAndUpdate(
      { registrationId: attendance.registrationId },
      { status: "Generated", isActive: true }
    );

    const summary = await getAttendanceSummary(attendance.eventId);
    const io = getIO();

    if (io) {
      io.to(`event:${attendance.eventId}`).emit("attendance:update", {
        eventId: attendance.eventId,
        summary,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Attendance reset successfully.",
      summary,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAttendanceReport = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found.",
      });
    }

    if (!canScanEvent(event, req.user)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    const attendances = await Attendance.find({ eventId: event._id })
      .populate("participantId", "name email rollNumber course branch department")
      .populate("markedBy", "name role")
      .sort({ scanTime: -1 });
    const summary = await getAttendanceSummary(event._id);

    if (req.query.format === "csv") {
      const rows = [
        ["Name", "Registration", "Email", "Department", "Course", "Status", "Scan Time", "Marked By", "Role"],
        ...attendances.map((item) => [
          item.participantId?.name || "",
          item.participantId?.rollNumber || "",
          item.participantId?.email || "",
          item.participantId?.department || item.participantId?.branch || "",
          item.participantId?.course || "",
          item.status,
          item.scanTime?.toISOString() || "",
          item.markedBy?.name || "",
          item.scannerRole,
        ]),
      ];

      const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${event.title}-attendance.csv"`);
      return res.status(200).send(csv);
    }

    return res.status(200).json({
      success: true,
      event,
      summary,
      attendances,
    });
  } catch (error) {
    next(error);
  }
};

exports.getLiveAttendance = async (req, res, next) => {
  try {
    const { eventId } = req.query;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: "eventId query parameter is required.",
      });
    }

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found.",
      });
    }

    if (!canScanEvent(event, req.user)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    return res.status(200).json({
      success: true,
      summary: await getAttendanceSummary(event._id),
    });
  } catch (error) {
    next(error);
  }
};
