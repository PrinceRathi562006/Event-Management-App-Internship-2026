const mongoose = require("mongoose");

const qrSessionSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    registrationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    secretHash: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["Generated", "Scanned", "Marked", "Expired", "Disabled"],
      default: "Generated",
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

qrSessionSchema.index({ eventId: 1, userId: 1, registrationId: 1 }, { unique: true });

module.exports = mongoose.model("QRSession", qrSessionSchema);
