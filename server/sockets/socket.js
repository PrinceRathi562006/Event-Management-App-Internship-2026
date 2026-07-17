const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const Event = require("../models/Event");
const User = require("../models/User");

let io;

const normalizeOrigin = (origin = "") => origin.trim().replace(/\/+$/, "");

const allowedOrigins = [
  ...(process.env.CLIENT_URL || "").split(",").map(normalizeOrigin).filter(Boolean),
  "http://localhost:5173",
  "http://127.0.0.1:5173",
].filter(Boolean);

const isLocalDevOrigin = (origin = "") =>
  /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);

const isEventCoordinator = (event, userId) =>
  event.assignedOrganizers?.some((organizerId) => organizerId.toString() === userId.toString()) ||
  event.organizerCoordinators?.some((organizerId) => organizerId.toString() === userId.toString()) ||
  event.studentCoordinators?.some((studentId) => studentId.toString() === userId.toString());

const canJoinEventRoom = (event, user) =>
  user.role === "admin" ||
  event.organizer.toString() === user._id.toString() ||
  isEventCoordinator(event, user._id);

const canJoinOrganizerChat = async (user) => {
  if (!user) {
    return false;
  }

  if (user.role === "admin") {
    return true;
  }

  if (user.role === "organizer" && user.organizerStatus === "Approved") {
    return true;
  }

  return Boolean(
    await Event.exists({
      $or: [
        { assignedOrganizers: user._id },
        { organizerCoordinators: user._id },
        { studentCoordinators: user._id },
      ],
    })
  );
};

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin(origin, callback) {
        const normalizedOrigin = normalizeOrigin(origin);

        if (!origin || allowedOrigins.includes(normalizedOrigin) || isLocalDevOrigin(normalizedOrigin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = await User.findById(decoded.id).select("-password");
      }
    } catch {
      socket.user = null;
    }

    next();
  });

  io.on("connection", (socket) => {
    socket.on("join-user", (userId) => {
      if (socket.user && userId && socket.user._id.toString() === userId.toString()) {
        socket.join(`user:${userId}`);
      }
    });

    socket.on("join-event", async (eventId) => {
      if (socket.user && eventId) {
        const event = await Event.findById(eventId).select("organizer assignedOrganizers organizerCoordinators studentCoordinators");

        if (!event || !canJoinEventRoom(event, socket.user)) {
          return;
        }

        socket.join(`event:${eventId}`);
      }
    });

    socket.on("join-organizer-chat", async () => {
      if (await canJoinOrganizerChat(socket.user)) {
        socket.join("organizer-chat");
      }
    });
  });

  return io;
};

const getIO = () => io;

module.exports = {
  initSocket,
  getIO,
};
