const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    // Student
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Event
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },

    // Ticket Details
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
    },

    bookingId: {
      type: String,
      unique: true,
      sparse: true,
    },

    qrCode: {
      type: String,
      default: "",
    },

    seatNumber: {
      type: String,
      default: "",
      trim: true,
    },

    // Payment Details
    isPaid: {
      type: Boolean,
      default: false,
    },

    amount: {
      type: Number,
      default: 0,
    },

    paymentMethod: {
      type: String,
      enum: ["Free", "Razorpay"],
      default: "Free",
    },

    paymentId: {
      type: String,
      default: "",
    },

    orderId: {
      type: String,
      default: "",
    },

    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed", "Refunded"],
      default: "Pending",
    },

    refundStatus: {
      type: String,
      enum: ["Not Required", "Refund Initiated", "Refunded"],
      default: "Not Required",
    },

    transactionId: {
      type: String,
      default: "",
    },

    // Attendance
    attendanceStatus: {
      type: String,
      enum: ["Not Marked", "Present", "Absent"],
      default: "Not Marked",
    },

    checkedInAt: {
      type: Date,
      default: null,
    },

    // Certificate
    certificateIssued: {
      type: Boolean,
      default: false,
    },

    certificateUrl: {
      type: String,
      default: "",
    },

    // Booking Status
    bookingStatus: {
      type: String,
      enum: ["Confirmed", "Cancelled", "Waiting"],
      default: "Confirmed",
    },
  },
  {
    timestamps: true,
  }
);

// Prevent Duplicate Booking
bookingSchema.index(
  {
    user: 1,
    event: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model("Booking", bookingSchema);
