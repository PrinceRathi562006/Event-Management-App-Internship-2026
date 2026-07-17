const mongoose = require("mongoose");

const scanLogSchema = new mongoose.Schema(
  {
    scanner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    role: {
      type: String,
      default: "",
    },
    participant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      default: null,
    },
    registration: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },
    device: {
      type: String,
      default: "",
    },
    browser: {
      type: String,
      default: "",
    },
    ip: {
      type: String,
      default: "",
    },
    result: {
      type: String,
      enum: ["Success", "Duplicate", "Expired", "Invalid", "Permission Denied", "Wrong Event", "Disabled"],
      required: true,
    },
    message: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

scanLogSchema.index({ event: 1, createdAt: -1 });
scanLogSchema.index({ scanner: 1, createdAt: -1 });

module.exports = mongoose.model("ScanLog", scanLogSchema);
