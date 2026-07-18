require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("./config/db");
const User = require("./models/User");

// ===============================
// Default Admin Details
// Override via .env if you want different credentials:
// SEED_ADMIN_NAME, SEED_ADMIN_EMAIL, SEED_ADMIN_PHONE, SEED_ADMIN_PASSWORD
// ===============================
const adminDetails = {
  name: process.env.SEED_ADMIN_NAME || "Admin",
  email: process.env.SEED_ADMIN_EMAIL || "admin@geetauniversity.edu",
  phone: process.env.SEED_ADMIN_PHONE || "9999999999",
  password: process.env.SEED_ADMIN_PASSWORD || "Admin@123",
  role: "admin",
  isVerified: true,
  organizerStatus: "Not Applicable",
};

const seed = async () => {
  await connectDB();

  if (mongoose.connection.readyState !== 1) {
    console.error("Seed aborted: no active MongoDB connection.");
    process.exit(1);
  }

  try {
    const existingAdmin = await User.findOne({ email: adminDetails.email });

    if (existingAdmin) {
      console.log(`Admin already exists: ${adminDetails.email}`);
    } else {
      await User.create(adminDetails);
      console.log("=========================================");
      console.log("Admin user created successfully");
      console.log(`Email    : ${adminDetails.email}`);
      console.log(`Password : ${adminDetails.password}`);
      console.log("Please log in and change this password.");
      console.log("=========================================");
    }
  } catch (error) {
    console.error("Seeding failed:", error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

seed();