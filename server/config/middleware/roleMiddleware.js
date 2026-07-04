/**
 * Role-Based Access Control (RBAC)
 * Usage:
 * router.post("/create", protect, authorize("organizer"), createEvent);
 * router.delete("/user/:id", protect, authorize("admin"), deleteUser);
 */

const authorize = (...roles) => {
  return (req, res, next) => {
    try {
      // User must be authenticated first
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required.",
        });
      }

      // Check if user's role is allowed
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. ${req.user.role} is not authorized to access this resource.`,
        });
      }

      if (
        req.user.role === "organizer" &&
        roles.includes("organizer") &&
        req.user.organizerStatus !== "Approved"
      ) {
        return res.status(403).json({
          success: false,
          message: "Organizer account is pending admin approval.",
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Authorization failed.",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : undefined,
      });
    }
  };
};

module.exports = {
  authorize,
};
