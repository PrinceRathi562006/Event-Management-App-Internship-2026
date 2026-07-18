const crypto = require("crypto");
const Razorpay = require("razorpay");

const Payment = require("../models/Payment");
const Booking = require("../models/Booking");
const Event = require("../models/Event");
const Notification = require("../models/Notification");
const sendSms = require("../utils/sendSms");
const {
  createAttendanceQRCode,
  sendBookingConfirmationEmail,
} = require("./bookingController");

const getRazorpayKeyId = () => process.env.RAZORPAY_KEY_ID;
const getRazorpaySecret = () => process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET;

const getRazorpay = () => {
  const keyId = getRazorpayKeyId();
  const keySecret = getRazorpaySecret();

  if (!keyId || !keySecret) {
    throw new Error("Razorpay keys are missing. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

const safeSendSms = async (smsOptions) => {
  try {
    await sendSms(smsOptions);
  } catch (error) {
    console.error("Payment SMS failed:", error.message);
  }
};

// ======================================================
// Create Razorpay Order
// ======================================================

exports.createOrder = async (req, res, next) => {
  try {
    const { bookingId } = req.body;

    const booking = await Booking.findById(bookingId)
      .populate("event");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized booking payment.",
      });
    }

    if (booking.bookingStatus === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled bookings cannot be paid.",
      });
    }

    if (booking.isPaid) {
      return res.status(400).json({
        success: false,
        message: "Payment already completed.",
      });
    }

    if (booking.paymentMethod !== "Razorpay" || Number(booking.amount || 0) <= 0) {
      return res.status(400).json({
        success: false,
        message: "This booking does not require Razorpay payment.",
      });
    }

    const options = {
      amount: Math.round(Number(booking.amount || 0) * 100),
      currency: "INR",
      receipt: `receipt_${booking._id}`,
    };

    const order = await getRazorpay().orders.create(options);

    await Payment.findOneAndUpdate(
      { booking: booking._id },
      {
        user: booking.user,
        event: booking.event._id,
        booking: booking._id,
        amount: booking.amount,
        currency: "INR",
        paymentMethod: "Razorpay",
        razorpayOrderId: order.id,
        razorpayPaymentId: "",
        razorpaySignature: "",
        receipt: options.receipt,
        status: "Created",
        transactionId: "",
        failureReason: "",
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.status(201).json({
      success: true,
      order,
      keyId: getRazorpayKeyId(),
    });

  } catch (error) {
    next(error);
  }
};

// ======================================================
// Payment History
// ======================================================

exports.getPaymentHistory = async (req, res, next) => {
  try {

    const payments = await Payment.find({
      user: req.user._id,
    })
      .populate("event", "title eventDate")
      .sort({
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      count: payments.length,
      payments,
    });

  } catch (error) {
    next(error);
  }
};

// ======================================================
// Verify Razorpay Payment
// ======================================================

exports.verifyPayment = async (req, res, next) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Razorpay payment details are required.",
      });
    }

    const keySecret = getRazorpaySecret();

    if (!keySecret) {
      throw new Error("Razorpay secret is missing. Set RAZORPAY_KEY_SECRET.");
    }

    // Verify Signature
    const generatedSignature = crypto
      .createHmac(
        "sha256",
        keySecret
      )
      .update(
        razorpay_order_id + "|" + razorpay_payment_id
      )
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed.",
      });
    }

    // Find Payment
    const payment = await Payment.findOne({
      razorpayOrderId: razorpay_order_id,
      user: req.user._id,
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found.",
      });
    }

    // Update Payment
    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.status = "Paid";
    payment.transactionId = razorpay_payment_id;

    await payment.save();

    // Update Booking
    const booking = await Booking.findById(payment.booking)
      .populate("event")
      .populate("user", "name email phone");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    booking.isPaid = true;
    booking.paymentId = razorpay_payment_id;
    booking.orderId = razorpay_order_id;
    booking.transactionId = razorpay_payment_id;
    booking.paymentStatus = "Paid";

    if (!booking.qrCode) {
      booking.qrCode = await createAttendanceQRCode({
        booking,
        event: booking.event,
        generatedBy: req.user._id,
      });
    }

    await booking.save();

    await sendBookingConfirmationEmail({
      booking,
      event: booking.event,
      user: booking.user,
    });

    // Notification
    await Notification.create({
      user: booking.user._id,
      event: booking.event._id,
      title: "Payment Successful",
      message:
        "Your payment has been completed successfully.",
      type: "PAYMENT",
    });

    await safeSendSms({
      to: booking.user.phone,
      message: `Payment successful for ${booking.event.title}. Booking ID: ${booking.bookingId}. Your QR ticket is ready.`,
    });

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully.",
      payment,
      booking,
    });

  } catch (error) {
    next(error);
  }
};

// ======================================================
// Payment Failure
// ======================================================

exports.paymentFailed = async (req, res, next) => {
  try {

    const {
      razorpay_order_id,
      reason,
    } = req.body;

    if (!razorpay_order_id) {
      return res.status(400).json({
        success: false,
        message: "Razorpay order id is required.",
      });
    }

    const payment = await Payment.findOne({
      razorpayOrderId: razorpay_order_id,
      user: req.user._id,
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found.",
      });
    }

    payment.status = "Failed";
    payment.failureReason = reason || "Unknown";

    await payment.save();

    const booking = await Booking.findById(
      payment.booking
    ).populate("user", "phone");

    if (booking) {
      booking.paymentStatus = "Failed";

      await booking.save();

      await Notification.create({
        user: booking.user,
        event: booking.event,
        title: "Payment Failed",
        message:
          "Your payment could not be completed. Please try again.",
        type: "PAYMENT",
      });

      await safeSendSms({
        to: booking.user?.phone,
        message: "Your event payment failed. Please try again from your dashboard.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment failure recorded.",
    });

  } catch (error) {
    next(error);
  }
};

// ======================================================
// Refund Payment
// ======================================================

exports.refundPayment = async (req, res, next) => {
  try {

    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found.",
      });
    }

    if (payment.status !== "Paid") {
      return res.status(400).json({
        success: false,
        message: "Only successful payments can be refunded.",
      });
    }

    if (payment.refundStatus === "Processed") {
      return res.status(400).json({
        success: false,
        message: "Payment already refunded.",
      });
    }

    // Update Payment
    payment.status = "Refunded";
    payment.refundStatus = "Processed";
    payment.refundAmount = payment.amount;
    payment.refundedAt = new Date();

    await payment.save();

    // Update Booking
    const booking = await Booking.findById(payment.booking).populate("user", "phone");

    if (booking) {
      booking.paymentStatus = "Refunded";
      booking.bookingStatus = "Cancelled";

      await booking.save();

      // Restore Seat
      await Event.findByIdAndUpdate(
        booking.event,
        {
          $inc: {
            availableSeats: 1,
          },
        }
      );

      // Notification
      await Notification.create({
        user: booking.user,
        event: booking.event,
        title: "Payment Refunded",
        message:
          "Your payment has been refunded successfully.",
        type: "PAYMENT",
      });

      await safeSendSms({
        to: booking.user?.phone,
        message: "Your event payment refund has been processed successfully.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Refund processed successfully.",
      payment,
    });

  } catch (error) {
    next(error);
  }
};

// ======================================================
// Payment Statistics (Admin)
// ======================================================

exports.getPaymentStatistics = async (req, res, next) => {
  try {

    const totalPayments = await Payment.countDocuments();

    const successfulPayments =
      await Payment.countDocuments({
        status: "Paid",
      });

    const failedPayments =
      await Payment.countDocuments({
        status: "Failed",
      });

    const refundedPayments =
      await Payment.countDocuments({
        status: "Refunded",
      });

    const totalRevenue = await Payment.aggregate([
      {
        $match: {
          status: "Paid",
        },
      },
      {
        $group: {
          _id: null,
          revenue: {
            $sum: "$amount",
          },
        },
      },
    ]);

    return res.status(200).json({
      success: true,

      stats: {
        totalPayments,
        successfulPayments,
        failedPayments,
        refundedPayments,

        totalRevenue:
          totalRevenue.length > 0
            ? totalRevenue[0].revenue
            : 0,
      },
    });

  } catch (error) {
    next(error);
  }
};
