const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    // Personal Information
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: 3,
      maxlength: 50,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },

    phone: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      match: [/^[6-9]\d{9}$/, "Please enter a valid phone number"],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false,
    },

    // Role
    role: {
      type: String,
      enum: ["student", "organizer", "admin"],
      default: "student",
    },

    // College Details
    college: {
      type: String,
      default: "Geeta University",
    },

    course: {
      type: String,
      default: "",
    },

    branch: {
      type: String,
      default: "",
    },

    department: {
      type: String,
      default: "",
    },

    designation: {
      type: String,
      default: "",
    },

    year: {
      type: Number,
      min: 1,
      max: 5,
    },

    semester: {
      type: Number,
      min: 1,
      max: 10,
    },

    rollNumber: {
      type: String,
      default: "",
    },

    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
    },

    dateOfBirth: {
      type: Date,
      default: null,
    },

    // Profile
    profileImage: {
      type: String,
      default:
        "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg",
    },

    profileImagePublicId: {
      type: String,
      default: "",
    },

    bio: {
      type: String,
      maxlength: 300,
      default: "",
    },

    resumeUrl: {
      type: String,
      default: "",
    },

    resumePublicId: {
      type: String,
      default: "",
    },

    resumeFileName: {
      type: String,
      default: "",
    },

    resumeMimeType: {
      type: String,
      default: "",
    },

    resumeUploadedAt: {
      type: Date,
      default: null,
    },

    // Verification
    isVerified: {
      type: Boolean,
      default: false,
    },

    isBlocked: {
      type: Boolean,
      default: false,
    },

    otpVerified: {
      type: Boolean,
      default: false,
    },

    organizerStatus: {
      type: String,
      enum: ["Not Applicable", "Pending", "Approved", "Rejected"],
      default: "Not Applicable",
    },

    organizerApprovedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    organizerApprovedAt: {
      type: Date,
      default: null,
    },

    // Password Reset
    resetPasswordToken: {
      type: String,
      default: "",
    },

    resetPasswordExpire: {
      type: Date,
    },

    // Last Login
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// ===============================
// Hash Password Before Saving
// ===============================
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);

  this.password = await bcrypt.hash(this.password, salt);

  next();
});

// ===============================
// Compare Password
// ===============================
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
