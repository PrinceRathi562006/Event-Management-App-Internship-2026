const express = require("express");

const {
  getOrganizerChatAccess,
  getOrganizerChatMessages,
  sendOrganizerChatMessage,
} = require("../controllers/organizerChatController");
const { protect } = require("../middleware/authMiddleware");
const chatUpload = require("../middleware/chatUploadMiddleware");

const router = express.Router();

router.get("/access", protect, getOrganizerChatAccess);
router.get("/messages", protect, getOrganizerChatMessages);
router.post("/messages", protect, chatUpload.array("attachments", 5), sendOrganizerChatMessage);

module.exports = router;
