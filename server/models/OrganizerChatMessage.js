const mongoose = require("mongoose");

const organizerChatMessageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OrganizerChatMessage",
      default: null,
    },
    attachments: [
      {
        originalName: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
        mimeType: {
          type: String,
          default: "",
        },
        size: {
          type: Number,
          default: 0,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

organizerChatMessageSchema.index({ createdAt: -1 });

module.exports = mongoose.model("OrganizerChatMessage", organizerChatMessageSchema);
