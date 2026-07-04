const mongoose = require("mongoose");

const coordinatorRequestSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    coordinatorType: {
      type: String,
      enum: ["student", "organizer"],
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Accepted", "Rejected"],
      default: "Pending",
    },
    respondedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

coordinatorRequestSchema.index(
  { event: 1, user: 1, coordinatorType: 1 },
  { unique: true }
);

module.exports = mongoose.model("CoordinatorRequest", coordinatorRequestSchema);
