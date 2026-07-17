const mongoose = require("mongoose");

const maxRetries = Number(process.env.MONGO_CONNECT_RETRIES || 5);
const retryDelayMs = Number(process.env.MONGO_CONNECT_RETRY_MS || 5000);
const isProduction = process.env.NODE_ENV === "production";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is missing in server/.env");

    if (isProduction) {
      process.exit(1);
    }

    return null;
  }

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 10000),
      });

      console.log("=========================================");
      console.log("MongoDB Connected Successfully");
      console.log(`Database : ${conn.connection.name}`);
      console.log(`Host     : ${conn.connection.host}`);
      console.log("=========================================");

      return conn;
    } catch (error) {
      console.error("=========================================");
      console.error(`MongoDB Connection Failed (${attempt}/${maxRetries})`);
      console.error(error.message);
      console.error("=========================================");

      if (attempt < maxRetries) {
        console.log(`Retrying MongoDB connection in ${Math.round(retryDelayMs / 1000)} seconds...`);
        await wait(retryDelayMs);
      }
    }
  }

  if (isProduction) {
    process.exit(1);
  }

  console.error("MongoDB is unavailable. Server will keep running in development mode, but database routes will fail until MongoDB connects.");

  return null;
};

mongoose.connection.on("disconnected", () => {
  if (mongoose.connection.readyState === 0) {
    console.error("=========================================");
    console.error("MongoDB Disconnected");
    console.error("=========================================");
  }
});

module.exports = connectDB;
