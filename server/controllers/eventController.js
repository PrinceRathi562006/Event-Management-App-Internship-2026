const Event = require("../models/Event");
const Booking = require("../models/Booking");
const Notification = require("../models/Notification");
const Payment = require("../models/Payment");
const User = require("../models/User");
const CoordinatorRequest = require("../models/CoordinatorRequest");
const { getIO } = require("../sockets/socket");

const {
  uploadToCloudinary,
  replaceImage,
  deleteFromCloudinary,
} = require("../utils/cloudinaryUpload");

const toBoolean = (value) => value === true || value === "true" || value === "on" || value === "1";

const parseJsonField = (value, fallback) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (Array.isArray(value) || typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const normalizeIds = (value) => {
  if (!value) {
    return [];
  }

  const parsed = parseJsonField(value, value);
  const ids = Array.isArray(parsed) ? parsed : String(parsed).split(",");

  return ids.map((id) => String(id).trim()).filter(Boolean);
};

const normalizeSpeakers = (value, fallback = []) =>
  parseJsonField(value, fallback)
    .filter((speaker) => speaker && String(speaker.name || "").trim())
    .map((speaker) => ({
      image: speaker.image || "",
      imagePublicId: speaker.imagePublicId || "",
      name: String(speaker.name).trim(),
      designation: speaker.designation || "",
      company: speaker.company || "",
      bio: speaker.bio || "",
      linkedin: speaker.linkedin || "",
      twitter: speaker.twitter || "",
    }));

const normalizePartnerCompanies = (value, fallback = []) =>
  parseJsonField(value, fallback)
    .map((partner) => (typeof partner === "string" ? { name: partner } : partner))
    .filter((partner) => partner && String(partner.name || "").trim())
    .map((partner) => ({ name: String(partner.name).trim() }));

const normalizeStringList = (value, fallback = []) => {
  const parsed = parseJsonField(value, typeof value === "string" ? value.split("\n") : fallback);

  return (Array.isArray(parsed) ? parsed : [])
    .map((item) => String(item || "").trim())
    .filter(Boolean);
};

const normalizeTimeline = (value, fallback = []) =>
  parseJsonField(value, fallback)
    .filter((item) => item && String(item.time || "").trim() && String(item.title || "").trim())
    .map((item) => ({
      time: String(item.time).trim(),
      title: String(item.title).trim(),
      description: item.description || "",
    }));

const isEventCoordinator = (event, userId) =>
  event.assignedOrganizers?.some((organizerId) => organizerId.toString() === userId.toString()) ||
  event.organizerCoordinators?.some((organizerId) => organizerId.toString() === userId.toString()) ||
  event.studentCoordinators?.some((studentId) => studentId.toString() === userId.toString());

const canManageEvent = (event, user) =>
  user.role === "admin" ||
  event.organizer.toString() === user._id.toString() ||
  isEventCoordinator(event, user._id);

const getUploadedFiles = (req, key) => {
  if (Array.isArray(req.files)) {
    return req.files.filter((file) => file.fieldname === key);
  }

  return req.files?.[key] || [];
};

const uploadGallery = async (files = []) => {
  const uploads = [];

  for (const file of files) {
    const image = await uploadToCloudinary(file.path, "event-organizer/events/gallery");
    uploads.push({
      url: image.url,
      publicId: image.public_id,
    });
  }

  return uploads;
};

// ======================================================
// Create Event
// ======================================================

exports.createEvent = async (req, res, next) => {
  try {
    const {
      title,
      description,
      category,
      theme,
      agenda,
      learningOutcomes,
      requirements,
      timeline,
      venue,
      location,
      eventDate,
      registrationDeadline,
      startTime,
      endTime,
      totalSeats,
      capacity,
      isPaid,
      price,
      tags,
      contactEmail,
      contactPhone,
      featured,
      speakers,
      partnerCompanies,
      badges,
      assignedOrganizers,
      coordinatorRequests,
    } = req.body;

    let poster = "";
    let posterPublicId = "";
    let certificateSignature = "";
    let certificateSignaturePublicId = "";
    const posterFile = req.file || getUploadedFiles(req, "poster")[0] || getUploadedFiles(req, "bannerImage")[0];
    const signatureFile = getUploadedFiles(req, "certificateSignature")[0];

    // Upload Poster
    if (posterFile) {
      const image = await uploadToCloudinary(
        posterFile.path,
        "event-organizer/events"
      );

      poster = image.url;
      posterPublicId = image.public_id;
    }

    if (signatureFile) {
      const image = await uploadToCloudinary(signatureFile.path, "event-organizer/events/signatures");
      certificateSignature = image.url;
      certificateSignaturePublicId = image.public_id;
    }

    const organizerIds = normalizeIds(assignedOrganizers);
    const finalAssignedOrganizers = Array.from(
      new Set([req.user._id.toString()])
    );
    const seats = Number(totalSeats || capacity);
    const paid = toBoolean(isPaid);
    const isAdmin = req.user.role === "admin";
    const galleryImages = await uploadGallery(getUploadedFiles(req, "galleryImages"));
    const parsedSpeakers = normalizeSpeakers(speakers, []);
    const parsedPartnerCompanies = normalizePartnerCompanies(partnerCompanies, []);

    const event = await Event.create({
      title,
      description,
      category,
      theme,
      agenda: normalizeStringList(agenda),
      learningOutcomes: normalizeStringList(learningOutcomes),
      requirements: normalizeStringList(requirements),
      timeline: normalizeTimeline(timeline),
      organizer: req.user._id,
      assignedOrganizers: finalAssignedOrganizers,
      venue,
      location,
      poster,
      posterPublicId,
      galleryImages,
      speakers: parsedSpeakers,
      partnerCompanies: parsedPartnerCompanies,
      badges: normalizeStringList(badges),
      certificateSignature,
      certificateSignaturePublicId,
      eventDate,
      registrationDeadline,
      startTime,
      endTime,
      totalSeats: seats,
      availableSeats: seats,
      isPaid: paid,
      price: paid ? Math.max(Number(price || 0), 0) : 0,
      tags: parseJsonField(tags, typeof tags === "string" ? tags.split(",").map((tag) => tag.trim()).filter(Boolean) : []),
      contactEmail,
      contactPhone,
      featured: toBoolean(featured),
      createdByRole: req.user.role,
      status: isAdmin ? "Approved" : "Pending",
      isPublished: isAdmin,
      approvedBy: isAdmin ? req.user._id : null,
      approvedAt: isAdmin ? new Date() : null,
      approvalLogs: [
        {
          status: isAdmin ? "Approved" : "Pending",
          by: req.user._id,
          note: isAdmin ? "Created by admin." : "Submitted for admin approval.",
        },
      ],
    });

    const requestedCoordinators = parseJsonField(coordinatorRequests, {
      students: [],
      organizers: [],
    });

    await createCoordinatorRequests({
      event,
      requestedBy: req.user,
      students: requestedCoordinators.students || [],
      organizers: requestedCoordinators.organizers || organizerIds,
    });

    if (!isAdmin) {
      const admins = await User.find({ role: "admin" }).select("_id");
      if (admins.length) {
        await Notification.insertMany(
          admins.map((admin) => ({
            user: admin._id,
            event: event._id,
            title: "Event Pending Approval",
            message: `${req.user.name} submitted ${event.title} for approval.`,
            type: "EVENT",
            priority: "HIGH",
          }))
        );
      }
    }

    res.status(201).json({
      success: true,
      message: isAdmin
        ? "Event created and published successfully."
        : "Event submitted for admin approval.",
      event,
    });

  } catch (error) {
    next(error);
  }
};

// ======================================================
// Get All Events
// ======================================================

exports.getAllEvents = async (req, res, next) => {
  try {
    const { keyword, category } = req.query;

    const filter = {
      isPublished: true,
      status: "Approved",
    };

    if (category) {
      filter.category = category;
    }

    if (keyword) {
      filter.$or = [
        { title: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
        { category: { $regex: keyword, $options: "i" } },
        { venue: { $regex: keyword, $options: "i" } },
      ];
    }

    const events = await Event.find(filter)
      .populate(
        "organizer",
        "name email profileImage"
      )
      .sort({
        eventDate: 1,
      });

    res.status(200).json({
      success: true,
      count: events.length,
      events,
    });

  } catch (error) {
    next(error);
  }
};

// ======================================================
// Get All Events For Admin
// ======================================================

exports.getAdminEvents = async (req, res, next) => {
  try {
    const events = await Event.find()
      .populate("organizer", "name email role")
      .populate("assignedOrganizers", "name email role organizerStatus")
      .populate("organizerCoordinators", "name email role department designation profileImage")
      .populate("studentCoordinators", "name email rollNumber course branch year semester profileImage")
      .populate("approvedBy", "name email role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: events.length,
      events,
    });

  } catch (error) {
    next(error);
  }
};

// ======================================================
// Get Single Event
// ======================================================

exports.getSingleEvent = async (req, res, next) => {
  try {

    const event = await Event.findById(
      req.params.id
    )
      .populate(
        "organizer",
        "name email phone profileImage role"
      )
      .populate("assignedOrganizers", "name email phone profileImage role")
      .populate("organizerCoordinators", "name email phone profileImage role department designation")
      .populate("studentCoordinators", "name email phone profileImage role rollNumber course branch year semester")
      .populate("approvedBy", "name email role")
      .populate("approvalLogs.by", "name email role")
      .populate("updateHistory.by", "name email role");

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found.",
      });
    }

    res.status(200).json({
      success: true,
      event,
    });

  } catch (error) {
    next(error);
  }
};

// ======================================================
// Update Event
// ======================================================

exports.updateEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found.",
      });
    }

    // Only admin, creator, or assigned organizers can update
    if (!canManageEvent(event, req.user)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this event.",
      });
    }

    // Replace poster if uploaded
    const posterFile = req.file || getUploadedFiles(req, "poster")[0] || getUploadedFiles(req, "bannerImage")[0];
    const signatureFile = getUploadedFiles(req, "certificateSignature")[0];

    if (posterFile) {
      const image = await replaceImage(
        event.posterPublicId,
        posterFile.path,
        "event-organizer/events"
      );

      event.poster = image.url;
      event.posterPublicId = image.public_id;
    }

    const newGalleryImages = await uploadGallery(getUploadedFiles(req, "galleryImages"));
    if (newGalleryImages.length) {
      event.galleryImages = [...event.galleryImages, ...newGalleryImages];
    }

    const changedFields = [];
    const assign = (field, value) => {
      if (value !== undefined) {
        event[field] = value;
        changedFields.push(field);
      }
    };

    if (signatureFile) {
      const image = await replaceImage(
        event.certificateSignaturePublicId,
        signatureFile.path,
        "event-organizer/events/signatures"
      );
      event.certificateSignature = image.url;
      event.certificateSignaturePublicId = image.public_id;
      changedFields.push("certificateSignature");
    }

    // Update fields
    assign("title", req.body.title);
    assign("description", req.body.description);
    assign("category", req.body.category);
    assign("theme", req.body.theme);
    assign("venue", req.body.venue);
    assign("location", req.body.location);
    assign("eventDate", req.body.eventDate);
    assign("registrationDeadline", req.body.registrationDeadline);
    assign("startTime", req.body.startTime);
    assign("endTime", req.body.endTime);
    assign("contactEmail", req.body.contactEmail);
    assign("contactPhone", req.body.contactPhone);

    if (req.body.totalSeats !== undefined || req.body.capacity !== undefined) {
      const nextSeats = Number(req.body.totalSeats || req.body.capacity);
      const bookedSeats = Math.max(event.totalSeats - event.availableSeats, 0);
      event.totalSeats = nextSeats;
      event.availableSeats = Math.max(nextSeats - bookedSeats, 0);
      changedFields.push("totalSeats", "availableSeats");
    }

    if (req.body.isPaid !== undefined) {
      event.isPaid = toBoolean(req.body.isPaid);
      changedFields.push("isPaid");
    }

    if (req.body.price !== undefined) {
      event.price = Math.max(Number(req.body.price || 0), 0);
      changedFields.push("price");
    }

    if (req.body.featured !== undefined) {
      event.featured = toBoolean(req.body.featured);
      changedFields.push("featured");
    }

    if (req.body.tags !== undefined) {
      event.tags = parseJsonField(
        req.body.tags,
        typeof req.body.tags === "string"
          ? req.body.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
          : event.tags
      );
      changedFields.push("tags");
    }

    if (req.body.speakers !== undefined) {
      event.speakers = normalizeSpeakers(req.body.speakers, event.speakers);
      changedFields.push("speakers");
    }

    if (req.body.partnerCompanies !== undefined) {
      event.partnerCompanies = normalizePartnerCompanies(req.body.partnerCompanies, event.partnerCompanies);
      changedFields.push("partnerCompanies");
    }

    if (req.body.agenda !== undefined) {
      event.agenda = normalizeStringList(req.body.agenda, event.agenda);
      changedFields.push("agenda");
    }

    if (req.body.learningOutcomes !== undefined) {
      event.learningOutcomes = normalizeStringList(req.body.learningOutcomes, event.learningOutcomes);
      changedFields.push("learningOutcomes");
    }

    if (req.body.requirements !== undefined) {
      event.requirements = normalizeStringList(req.body.requirements, event.requirements);
      changedFields.push("requirements");
    }

    if (req.body.timeline !== undefined) {
      event.timeline = normalizeTimeline(req.body.timeline, event.timeline);
      changedFields.push("timeline");
    }

    if (req.body.badges !== undefined) {
      event.badges = normalizeStringList(req.body.badges, event.badges);
      changedFields.push("badges");
    }

    if (req.body.assignedOrganizers !== undefined && req.user.role === "admin") {
      event.assignedOrganizers = Array.from(
        new Set([event.organizer.toString(), ...normalizeIds(req.body.assignedOrganizers)])
      );
      changedFields.push("assignedOrganizers");
    }

    if (posterFile) {
      changedFields.push("poster");
    }

    if (newGalleryImages.length) {
      changedFields.push("galleryImages");
    }

    if (changedFields.length) {
      event.updateHistory.push({
        by: req.user._id,
        fields: Array.from(new Set(changedFields)),
      });
    }

    await event.save();

    return res.status(200).json({
      success: true,
      message: "Event updated successfully.",
      event,
    });

  } catch (error) {
    next(error);
  }
};

const createCoordinatorRequests = async ({ event, requestedBy, students = [], organizers = [] }) => {
  const requestGroups = [
    { coordinatorType: "student", ids: students },
    { coordinatorType: "organizer", ids: organizers },
  ];

  for (const group of requestGroups) {
    for (const userId of normalizeIds(group.ids)) {
      if (String(userId) === String(requestedBy._id)) {
        continue;
      }

      const user = await User.findById(userId);

      if (!user || user.role !== group.coordinatorType) {
        continue;
      }

      if (user.role === "organizer" && user.organizerStatus !== "Approved") {
        continue;
      }

      const existingRequest = await CoordinatorRequest.findOne({
        event: event._id,
        user: user._id,
        coordinatorType: group.coordinatorType,
      });

      if (existingRequest?.status === "Accepted") {
        continue;
      }

      await CoordinatorRequest.findOneAndUpdate(
        {
          event: event._id,
          user: user._id,
          coordinatorType: group.coordinatorType,
        },
        {
          event: event._id,
          requestedBy: requestedBy._id,
          user: user._id,
          coordinatorType: group.coordinatorType,
          status: "Pending",
          respondedAt: null,
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        }
      );

      await Notification.create({
        user: user._id,
        event: event._id,
        title: "Coordinator Request",
        message: `${requestedBy.name} invited you as a ${group.coordinatorType} coordinator for ${event.title}.`,
        type: "EVENT",
        priority: "HIGH",
        actionText: "Review request",
        actionUrl: "/dashboard",
      });
    }
  }
};

// ======================================================
// Delete Event
// ======================================================

exports.deleteEvent = async (req, res, next) => {
  try {

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found.",
      });
    }

    // Authorization
    if (!canManageEvent(event, req.user)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this event.",
      });
    }

    // Delete Cloudinary Image
    if (event.posterPublicId) {
      await deleteFromCloudinary(event.posterPublicId);
    }

    if (event.certificateSignaturePublicId) {
      await deleteFromCloudinary(event.certificateSignaturePublicId);
    }

    await Event.findByIdAndDelete(event._id);
    await CoordinatorRequest.deleteMany({ event: event._id });

    return res.status(200).json({
      success: true,
      message: "Event deleted successfully.",
    });

  } catch (error) {
    next(error);
  }
};

// ======================================================
// Publish / Unpublish Event
// ======================================================

exports.togglePublishEvent = async (req, res, next) => {
  try {

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found.",
      });
    }

    // Organizer/Admin Only
    if (!canManageEvent(event, req.user)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized.",
      });
    }

    event.isPublished = !event.isPublished;

    await event.save();

    return res.status(200).json({
      success: true,
      message: event.isPublished
        ? "Event published successfully."
        : "Event unpublished successfully.",
      event,
    });

  } catch (error) {
    next(error);
  }
};

// ======================================================
// Update Event Approval Status (Admin)
// ======================================================

exports.updateEventStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowedStatuses = [
      "Draft",
      "Pending",
      "Approved",
      "Rejected",
      "Completed",
      "Cancelled",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event status.",
      });
    }

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found.",
      });
    }

    event.status = status;

    if (status === "Approved") {
      event.isPublished = true;
      event.approvedBy = req.user._id;
      event.approvedAt = new Date();
    }

    if (["Rejected", "Cancelled"].includes(status)) {
      event.isPublished = false;
    }

    event.approvalLogs.push({
      status,
      by: req.user._id,
      note: req.body.note || "",
    });

    await event.save();

    if (status === "Cancelled") {
      await Booking.updateMany(
        {
          event: event._id,
          bookingStatus: { $ne: "Cancelled" },
        },
        {
          $set: {
            bookingStatus: "Cancelled",
          },
        }
      );

      await Booking.updateMany(
        {
          event: event._id,
          paymentStatus: "Paid",
        },
        {
          $set: {
            refundStatus: "Refund Initiated",
          },
        }
      );
    }

    await Notification.create({
      user: event.organizer,
      event: event._id,
      title: `Event ${status}`,
      message:
        status === "Approved"
          ? `${event.title} has been approved and is now public.`
          : `${event.title} has been ${status.toLowerCase()}.`,
      type: "EVENT",
      priority: ["Rejected", "Cancelled"].includes(status) ? "HIGH" : "MEDIUM",
    });

    return res.status(200).json({
      success: true,
      message: "Event status updated successfully.",
      event,
    });

  } catch (error) {
    next(error);
  }
};

// ======================================================
// Broadcast Event Announcement
// ======================================================

exports.broadcastEventAnnouncement = async (req, res, next) => {
  try {
    const { message, title } = req.body;
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found.",
      });
    }

    if (!canManageEvent(event, req.user)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to announce for this event.",
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Announcement message is required.",
      });
    }

    const bookings = await Booking.find({
      event: event._id,
      bookingStatus: { $ne: "Cancelled" },
    }).select("user");

    const notifications = bookings.map((booking) => ({
      user: booking.user,
      event: event._id,
      title: title || `Update: ${event.title}`,
      message,
      type: "ANNOUNCEMENT",
      priority: "HIGH",
    }));

    if (notifications.length) {
      await Notification.insertMany(notifications);
    }

    const io = getIO();

    if (io) {
      io.to(`event:${event._id}`).emit("announcement", {
        eventId: event._id,
        title: title || `Update: ${event.title}`,
        message,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Announcement sent successfully.",
      totalRecipients: notifications.length,
    });

  } catch (error) {
    next(error);
  }
};

// ======================================================
// Organizer Event Analytics
// ======================================================

exports.getEventAnalytics = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found.",
      });
    }

    if (!canManageEvent(event, req.user)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    const totalRegistrations = await Booking.countDocuments({
      event: event._id,
      bookingStatus: { $ne: "Cancelled" },
    });

    const attendance = await Booking.countDocuments({
      event: event._id,
      attendanceStatus: "Present",
    });

    const revenue = await Payment.aggregate([
      {
        $match: {
          event: event._id,
          status: "Paid",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);

    const registrationsOverTime = await Booking.aggregate([
      {
        $match: {
          event: event._id,
          bookingStatus: { $ne: "Cancelled" },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              date: "$createdAt",
              format: "%Y-%m-%d",
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return res.status(200).json({
      success: true,
      analytics: {
        totalRegistrations,
        attendance,
        attendanceRate: totalRegistrations
          ? Math.round((attendance / totalRegistrations) * 100)
          : 0,
        revenue: revenue[0]?.total || 0,
        registrationsOverTime,
      },
    });

  } catch (error) {
    next(error);
  }
};

// ======================================================
// Get My Events (Organizer)
// ======================================================

exports.getMyEvents = async (req, res, next) => {
  try {

    const events = await Event.find({
      $or: [
        { organizer: req.user._id },
        { assignedOrganizers: req.user._id },
        { organizerCoordinators: req.user._id },
        { studentCoordinators: req.user._id },
      ],
    })
      .populate("organizer", "name email role")
      .populate("assignedOrganizers", "name email role organizerStatus")
      .populate("organizerCoordinators", "name email role department designation profileImage")
      .populate("studentCoordinators", "name email rollNumber course branch year semester profileImage")
      .sort({
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      count: events.length,
      events,
    });

  } catch (error) {
    next(error);
  }
};

// ======================================================
// Search Events
// ======================================================

exports.searchEvents = async (req, res, next) => {
  try {

    const { keyword } = req.query;

    const filter = {
      isPublished: true,
      status: "Approved",
    };

    if (keyword) {
      filter.$or = [
        {
          title: {
            $regex: keyword,
            $options: "i",
          },
        },
        {
          description: {
            $regex: keyword,
            $options: "i",
          },
        },
        {
          category: {
            $regex: keyword,
            $options: "i",
          },
        },
        {
          venue: {
            $regex: keyword,
            $options: "i",
          },
        },
      ];
    }

    const events = await Event.find(filter)
      .populate(
        "organizer",
        "name profileImage"
      )
      .sort({
        eventDate: 1,
      });

    return res.status(200).json({
      success: true,
      count: events.length,
      events,
    });

  } catch (error) {
    next(error);
  }
};

// ======================================================
// Upcoming Events
// ======================================================

exports.getUpcomingEvents = async (req, res, next) => {
  try {

    const events = await Event.find({
      eventDate: {
        $gte: new Date(),
      },
      isPublished: true,
      status: "Approved",
    })
      .sort({
        eventDate: 1,
      })
      .limit(10);

    return res.status(200).json({
      success: true,
      count: events.length,
      events,
    });

  } catch (error) {
    next(error);
  }
};

// ======================================================
// Featured Events
// ======================================================

exports.getFeaturedEvents = async (req, res, next) => {
  try {

    const events = await Event.find({
      featured: true,
      isPublished: true,
      status: "Approved",
    })
      .populate(
        "organizer",
        "name profileImage"
      )
      .sort({
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      count: events.length,
      events,
    });

  } catch (error) {
    next(error);
  }
};

exports.searchCoordinatorCandidates = async (req, res, next) => {
  try {
    const { type = "organizer", q = "" } = req.query;

    if (!["student", "organizer"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Coordinator type must be student or organizer.",
      });
    }

    const filter = {
      role: type,
      isBlocked: false,
      isVerified: true,
    };

    if (type === "organizer") {
      filter.organizerStatus = "Approved";
    }

    if (q.trim()) {
      const search = q.trim();
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];

      if (type === "student") {
        filter.$or.push({ rollNumber: { $regex: search, $options: "i" } });
      } else {
        filter.$or.push({ department: { $regex: search, $options: "i" } });
      }
    }

    const users = await User.find(filter)
      .select("name email role rollNumber course branch year semester department designation profileImage organizerStatus")
      .limit(12)
      .sort({ name: 1 });

    return res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    next(error);
  }
};

exports.sendCoordinatorRequests = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found.",
      });
    }

    if (!canManageEvent(event, req.user)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to invite coordinators.",
      });
    }

    const { students = [], organizers = [] } = req.body;

    await createCoordinatorRequests({
      event,
      requestedBy: req.user,
      students,
      organizers,
    });

    return res.status(200).json({
      success: true,
      message: "Coordinator request sent.",
    });
  } catch (error) {
    next(error);
  }
};

exports.getMyCoordinatorRequests = async (req, res, next) => {
  try {
    const requests = await CoordinatorRequest.find({
      user: req.user._id,
      status: "Pending",
    })
      .populate("event", "title eventDate venue poster")
      .populate("requestedBy", "name email role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      requests,
    });
  } catch (error) {
    next(error);
  }
};

exports.respondCoordinatorRequest = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!["Accepted", "Rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be Accepted or Rejected.",
      });
    }

    const request = await CoordinatorRequest.findOne({
      _id: req.params.requestId,
      user: req.user._id,
      status: "Pending",
    }).populate("event");

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Coordinator request not found.",
      });
    }

    request.status = status;
    request.respondedAt = new Date();
    await request.save();

    if (status === "Accepted") {
      const update =
        request.coordinatorType === "organizer"
          ? {
              $addToSet: {
                organizerCoordinators: req.user._id,
                assignedOrganizers: req.user._id,
              },
            }
          : {
              $addToSet: {
                studentCoordinators: req.user._id,
              },
            };

      await Event.findByIdAndUpdate(request.event._id, update);
    }

    await Notification.create({
      user: request.requestedBy,
      event: request.event._id,
      title: `Coordinator Request ${status}`,
      message: `${req.user.name} ${status.toLowerCase()} the coordinator request for ${request.event.title}.`,
      type: "EVENT",
    });

    return res.status(200).json({
      success: true,
      message: `Coordinator request ${status.toLowerCase()}.`,
    });
  } catch (error) {
    next(error);
  }
};

// Pagination
