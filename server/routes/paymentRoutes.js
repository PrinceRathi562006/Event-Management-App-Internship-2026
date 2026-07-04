const express = require("express");

const router = express.Router();

// Controllers
const {
  createOrder,
  verifyPayment,
  paymentFailed,
  refundPayment,
  getPaymentHistory,
  getPaymentStatistics,
} = require("../controllers/paymentController");

// Middleware
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

// ======================================================
// Student Routes
// ======================================================

// Create Razorpay Order
router.post(
  "/create-order",
  protect,
  authorize("student"),
  createOrder
);

// Verify Payment
router.post(
  "/verify",
  protect,
  authorize("student"),
  verifyPayment
);

// Payment Failed
router.post(
  "/failure",
  protect,
  authorize("student"),
  paymentFailed
);

// Payment History
router.get(
  "/history",
  protect,
  getPaymentHistory
);

// ======================================================
// Admin Routes
// ======================================================

// Payment Statistics
router.get(
  "/admin/statistics",
  protect,
  authorize("admin"),
  getPaymentStatistics
);

// Refund Payment
router.post(
  "/refund/:id",
  protect,
  authorize("admin"),
  refundPayment
);

module.exports = router;