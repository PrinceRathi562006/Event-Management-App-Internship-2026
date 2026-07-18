const mongoose = require("mongoose");

const certificateSchema = new mongoose.Schema(
  {
    certificateId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    registration: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      unique: true,
      index: true,
    },
    pdfUrl: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
      default: "",
    },
    issuedDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    verificationToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    verificationUrl: {
      type: String,
      required: true,
    },
    qrCode: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["Valid", "Revoked"],
      default: "Valid",
      index: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    metadata: {
      organizerName: {
        type: String,
        default: "",
      },
      coordinatorName: {
        type: String,
        default: "",
      },
      eventName: {
        type: String,
        default: "",
      },
      studentName: {
        type: String,
        default: "",
      },
    },
  },
  {
    timestamps: true,
  }
);

certificateSchema.index({ user: 1, issuedDate: -1 });
certificateSchema.index({ event: 1, issuedDate: -1 });

module.exports = mongoose.model("Certificate", certificateSchema);
