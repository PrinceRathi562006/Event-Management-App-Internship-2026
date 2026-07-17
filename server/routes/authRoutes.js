const express = require("express");
const { body } = require("express-validator");

const router = express.Router();

// Controllers
const authController = require("../controllers/authController");


const {
  registerUser,
  verifyRegistrationOTP,
  loginUser,
  resendOTP,
  forgotPassword,
  verifyForgotPasswordOTP,
  resetPassword,
  changePassword,
  getMyProfile,
  updateProfile,
  uploadProfileImage,
  uploadResume,
  logout,
} = authController;

// Middleware
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const resumeUpload = require("../middleware/resumeUploadMiddleware");
const validate = require("../middleware/validationMiddleware");

// =============================================
// Validation Rules
// =============================================

// Register Validation
const registerValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required"),

  body("email")
    .isEmail()
    .withMessage("Valid email is required"),

  body("phone")
    .isMobilePhone("en-IN")
    .withMessage("Valid phone number is required"),

  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),

  validate,
];

// Login Validation
const loginValidation = [
  body("email")
    .isEmail()
    .withMessage("Valid email is required"),

  body("password")
    .notEmpty()
    .withMessage("Password is required"),

  validate,
];

const emailValidation = [
  body("email")
    .isEmail()
    .withMessage("Valid email is required"),

  validate,
];

const otpValidation = [
  body("email")
    .isEmail()
    .withMessage("Valid email is required"),

  body("otp")
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage("A valid 6 digit OTP is required"),

  validate,
];

const resetPasswordValidation = [
  body("email")
    .isEmail()
    .withMessage("Valid email is required"),

  body("otp")
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage("A valid 6 digit OTP is required"),

  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),

  validate,
];

const changePasswordValidation = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),

  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters"),

  validate,
];

// =============================================
// Public Routes
// =============================================

// Register
router.post(
  "/register",
  upload.single("profileImage"),
  registerValidation,
  registerUser
);

// Verify Registration OTP
router.post(
  "/verify-registration-otp",
  otpValidation,
  verifyRegistrationOTP
);

// Login
router.post(
  "/login",
  loginValidation,
  loginUser
);

// Resend OTP
router.post(
  "/resend-otp",
  emailValidation,
  resendOTP
);

router.post(
  "/otp/resend",
  emailValidation,
  resendOTP
);

// Forgot Password
router.post(
  "/forgot-password",
  emailValidation,
  forgotPassword
);

// Verify Forgot Password OTP
router.post(
  "/verify-forgot-password-otp",
  otpValidation,
  verifyForgotPasswordOTP
);

// Reset Password
router.post(
  "/reset-password",
  resetPasswordValidation,
  resetPassword
);

// =============================================
// Protected Routes
// =============================================

// Get Profile
router.get(
  "/profile",
  protect,
  getMyProfile
);

// Update Profile
router.put(
  "/profile",
  protect,
  updateProfile
);

// Upload Profile Image
router.put(
  "/profile/image",
  protect,
  upload.single("profileImage"),
  uploadProfileImage
);

// Upload Resume
router.put(
  "/profile/resume",
  protect,
  resumeUpload.single("resume"),
  uploadResume
);

// Change Password
router.put(
  "/change-password",
  protect,
  changePasswordValidation,
  changePassword
);

// Logout
router.post(
  "/logout",
  protect,
  logout
);

module.exports = router;
