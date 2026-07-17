const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    attendanceId: {
      type: String,
      required: true,
      unique: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    registrationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    scannerRole: {
      type: String,
      enum: ["admin", "organizer", "coordinator"],
      required: true,
    },
    status: {
      type: String,
      enum: ["Present", "Absent"],
      required: true,
    },
    scanTime: {
      type: Date,
      default: Date.now,
    },
    device: {
      type: String,
      default: "",
    },
    browser: {
      type: String,
      default: "",
    },
    ipAddress: {
      type: String,
      default: "",
    },
    location: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

attendanceSchema.index({ eventId: 1, participantId: 1 }, { unique: true });
attendanceSchema.index({ eventId: 1, status: 1 });

module.exports = mongoose.model("Attendance", attendanceSchema);
