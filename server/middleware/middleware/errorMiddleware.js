/**
 * Global Error Handler
 * Handles all application errors in one place.
 */

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  // ==========================================
  // Mongoose Invalid ObjectId
  // ==========================================
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // ==========================================
  // Duplicate Key Error
  // ==========================================
  if (err.code === 11000) {
    statusCode = 409;

    const field = Object.keys(err.keyValue)[0];

    message = `${field} already exists`;
  }

  // ==========================================
  // Mongoose Validation Error
  // ==========================================
  if (err.name === "ValidationError") {
    statusCode = 400;

    message = Object.values(err.errors)
      .map((error) => error.message)
      .join(", ");
  }

  // ==========================================
  // JWT Invalid
  // ==========================================
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid authentication token";
  }

  // ==========================================
  // JWT Expired
  // ==========================================
  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Authentication token has expired";
  }

  // ==========================================
  // Multer Errors
  // ==========================================
  if (err.name === "MulterError") {
    statusCode = 400;

    if (err.code === "LIMIT_FILE_SIZE") {
      message = "File size exceeds the maximum limit (5MB)";
    } else {
      message = err.message;
    }
  }

  // ==========================================
  // Send Response
  // ==========================================
  res.status(statusCode).json({
    success: false,
    message,

    ...(process.env.NODE_ENV === "development" && {
      stack: err.stack,
      error: err,
    }),
  });
};

module.exports = errorHandler;