const express = require("express");

const { deleteUser, getUsers, updateUserStatus } = require("../controllers/adminController");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

router.get("/users", protect, authorize("admin"), getUsers);
router.patch("/users/:id", protect, authorize("admin"), updateUserStatus);
router.delete("/users/:id", protect, authorize("admin"), deleteUser);

module.exports = router;
