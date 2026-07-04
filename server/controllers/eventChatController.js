const Event = require("../models/Event");
const EventChatMessage = require("../models/EventChatMessage");
const { getIO } = require("../sockets/socket");

const isEventCoordinator = (event, userId) =>
  event.assignedOrganizers?.some((organizerId) => organizerId.toString() === userId.toString()) ||
  event.organizerCoordinators?.some((organizerId) => organizerId.toString() === userId.toString()) ||
  event.studentCoordinators?.some((studentId) => studentId.toString() === userId.toString());

const canUseEventChat = (event, user) =>
  user.role === "admin" ||
  event.organizer.toString() === user._id.toString() ||
  isEventCoordinator(event, user._id);

const loadEventForChat = async (eventId, user) => {
  const event = await Event.findById(eventId);

  if (!event) {
    return { status: 404, message: "Event not found." };
  }

  if (!canUseEventChat(event, user)) {
    return { status: 403, message: "Only event admins, organizers, and coordinators can use this chat." };
  }

  return { event };
};

exports.getEventChatMessages = async (req, res, next) => {
  try {
    const access = await loadEventForChat(req.params.id, req.user);

    if (!access.event) {
      return res.status(access.status).json({
        success: false,
        message: access.message,
      });
    }

    const messages = await EventChatMessage.find({ event: access.event._id })
      .populate("sender", "name role profileImage")
      .sort({ createdAt: 1 })
      .limit(100);

    return res.status(200).json({
      success: true,
      messages,
    });
  } catch (error) {
    next(error);
  }
};

exports.sendEventChatMessage = async (req, res, next) => {
  try {
    const access = await loadEventForChat(req.params.id, req.user);

    if (!access.event) {
      return res.status(access.status).json({
        success: false,
        message: access.message,
      });
    }

    if (!req.body.message?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message is required.",
      });
    }

    const message = await EventChatMessage.create({
      event: access.event._id,
      sender: req.user._id,
      message: req.body.message.trim(),
    });

    const populated = await EventChatMessage.findById(message._id).populate("sender", "name role profileImage");
    const io = getIO();

    if (io) {
      io.to(`event:${access.event._id}`).emit("event-chat-message", {
        eventId: access.event._id.toString(),
        message: populated,
      });
    }

    return res.status(201).json({
      success: true,
      message: populated,
    });
  } catch (error) {
    next(error);
  }
};
