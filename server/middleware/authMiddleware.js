const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ======================================
// Protect Routes (JWT Authentication)
// ======================================
const protect = async (req, res, next) => {
  try {
    let token;

    // Authorization Header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token && req.cookies?.token) {
      token = req.cookies.token;
    }

    // No Token
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Please login first.",
      });
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find User
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found.",
      });
    }

    // Blocked User
    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked by the admin.",
      });
    }

    // Email Not Verified
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email first.",
      });
    }

    // Attach User to Request
    req.user = user;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

module.exports = {
  protect,
};
