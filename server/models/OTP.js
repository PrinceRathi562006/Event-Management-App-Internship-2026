const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
  {
    // User Reference
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Email
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    // OTP Code
    otp: {
      type: String,
      required: true,
    },

    // OTP Purpose
    purpose: {
      type: String,
      enum: [
        "REGISTER",
        "LOGIN",
        "FORGOT_PASSWORD",
        "EMAIL_CHANGE"
      ],
      required: true,
    },

    // Verification Status
    isVerified: {
      type: Boolean,
      default: false,
    },

    registrationData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // Expiry Time
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 } // Automatically delete after expiry
    }
  },
  {
    timestamps: true,
  }
);

// Prevent multiple OTPs for same user & purpose
otpSchema.index(
  {
    user: 1,
    purpose: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      user: { $type: "objectId" },
    },
  }
);

otpSchema.index({ email: 1, purpose: 1 });

module.exports = mongoose.model("OTP", otpSchema);
