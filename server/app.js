const express = require("express");
const path = require("path");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");

const dashboardRoutes = require("./routes/dashboardRoutes");

const app = express();

app.set("trust proxy", 1);

// =======================================
// CORS
// =======================================

const normalizeOrigin = (origin = "") => origin.trim().replace(/\/+$/, "");

const allowedOrigins = [
  ...(process.env.CLIENT_URL || "").split(",").map(normalizeOrigin).filter(Boolean),
  "http://localhost:5173",
  "http://127.0.0.1:5173",
].filter(Boolean);

const isLocalDevOrigin = (origin = "") =>
  /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);

app.use(
  cors({
    origin(origin, callback) {
      const normalizedOrigin = normalizeOrigin(origin);

      if (!origin || allowedOrigins.includes(normalizedOrigin) || isLocalDevOrigin(normalizedOrigin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// =======================================
// Global Middleware
// =======================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));
app.use(helmet());
app.use(compression());

// Security Middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.API_RATE_LIMIT_MAX || (process.env.NODE_ENV === "production" ? 300 : 1000)),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === "OPTIONS",
});

app.use(limiter);
app.use(mongoSanitize());
app.use(xss());

// =======================================
// Static Folder
// =======================================

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// =======================================
// Health Check
// =======================================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Event Organizer API is running",
  });
});

app.get("/api/support", (req, res) => {
  res.status(200).json({
    success: true,
    supportEmail: process.env.SUPPORT_EMAIL || "princerathi674@gmail.com",
  });
});

// =======================================
// API Routes
// =======================================

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/events", require("./routes/eventRoutes"));
app.use("/api/bookings", require("./routes/bookingRoutes"));
app.use("/api/payments", require("./routes/paymentRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/feedback", require("./routes/feedbackRoutes"));
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/checkin", require("./routes/checkinRoutes"));
app.use("/api/attendance", require("./routes/attendanceRoutes"));
app.use("/api/tickets", require("./routes/ticketRoutes"));
app.use("/api/certificates", require("./routes/certificateRoutes"));
app.use("/api/chat/organizer", require("./routes/organizerChatRoutes"));
app.use("/api/organizer", require("./routes/organizerRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));

// =======================================
// 404 Handler
// =======================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API Route Not Found",
  });
});

// =======================================
// Global Error Handler (Always Last)
// =======================================

app.use(require("./middleware/errorMiddleware"));

module.exports = app;
