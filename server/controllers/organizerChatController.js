const Event = require("../models/Event");
const OrganizerChatMessage = require("../models/OrganizerChatMessage");
const { getIO } = require("../sockets/socket");

const getPublicFileUrl = (req, file) =>
  `${req.protocol}://${req.get("host")}/uploads/chat/${file.filename}`;

const hasCoordinatorAccess = (userId) =>
  Event.exists({
    $or: [
      { assignedOrganizers: userId },
      { organizerCoordinators: userId },
      { studentCoordinators: userId },
    ],
  });

const canUseOrganizerChat = async (user) => {
  if (!user) {
    return false;
  }

  if (user.role === "admin") {
    return true;
  }

  if (user.role === "organizer" && user.organizerStatus === "Approved") {
    return true;
  }

  return Boolean(await hasCoordinatorAccess(user._id));
};

const populateMessage = (query) =>
  query
    .populate("sender", "name role profileImage")
    .populate({
      path: "replyTo",
      select: "message sender attachments createdAt",
      populate: {
        path: "sender",
        select: "name role",
      },
    });

exports.getOrganizerChatAccess = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      canAccess: await canUseOrganizerChat(req.user),
    });
  } catch (error) {
    next(error);
  }
};

exports.getOrganizerChatMessages = async (req, res, next) => {
  try {
    if (!(await canUseOrganizerChat(req.user))) {
      return res.status(403).json({
        success: false,
        message: "Organizer chat is only for admins, organizers, and assigned coordinators.",
      });
    }

    const messages = await populateMessage(
      OrganizerChatMessage.find().sort({ createdAt: 1 }).limit(150)
    );

    return res.status(200).json({
      success: true,
      messages,
    });
  } catch (error) {
    next(error);
  }
};

exports.sendOrganizerChatMessage = async (req, res, next) => {
  try {
    if (!(await canUseOrganizerChat(req.user))) {
      return res.status(403).json({
        success: false,
        message: "Organizer chat is only for admins, organizers, and assigned coordinators.",
      });
    }

    const text = String(req.body.message || "").trim();
    const attachments = (req.files || []).map((file) => ({
      originalName: file.originalname,
      url: getPublicFileUrl(req, file),
      mimeType: file.mimetype,
      size: file.size,
    }));

    if (!text && !attachments.length) {
      return res.status(400).json({
        success: false,
        message: "Message or attachment is required.",
      });
    }

    const message = await OrganizerChatMessage.create({
      sender: req.user._id,
      message: text,
      replyTo: req.body.replyTo || null,
      attachments,
    });

    const populated = await populateMessage(OrganizerChatMessage.findById(message._id));
    const io = getIO();

    if (io) {
      io.to("organizer-chat").emit("organizer-chat-message", populated);
    }

    return res.status(201).json({
      success: true,
      message: populated,
    });
  } catch (error) {
    next(error);
  }
};
