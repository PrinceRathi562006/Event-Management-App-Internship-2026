const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    // User
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

    // Booking
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },

    // Payment Details
    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: "INR",
    },

    paymentMethod: {
      type: String,
      enum: ["Razorpay", "Free"],
      default: "Razorpay",
    },

    // Razorpay Details
    razorpayOrderId: {
      type: String,
      default: "",
    },

    razorpayPaymentId: {
      type: String,
      default: "",
    },

    razorpaySignature: {
      type: String,
      default: "",
    },

    // Receipt
    receipt: {
      type: String,
      unique: true,
      required: true,
    },

    // Status
    status: {
      type: String,
      enum: [
        "Created",
        "Pending",
        "Paid",
        "Failed",
        "Cancelled",
        "Refunded",
      ],
      default: "Created",
    },

    transactionId: {
      type: String,
      default: "",
    },

    // Refund
    refundId: {
      type: String,
      default: "",
    },

    refundStatus: {
      type: String,
      enum: ["None", "Pending", "Processed"],
      default: "None",
    },

    refundAmount: {
      type: Number,
      default: 0,
    },

    refundedAt: {
      type: Date,
      default: null,
    },

    // Failure Reason
    failureReason: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
paymentSchema.index({ user: 1 });
paymentSchema.index({ event: 1 });
paymentSchema.index({ booking: 1 });
paymentSchema.index({ razorpayPaymentId: 1 });
paymentSchema.index({ razorpayOrderId: 1 });

module.exports = mongoose.model("Payment", paymentSchema);
