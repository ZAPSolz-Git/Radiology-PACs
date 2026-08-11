import mongoose from "mongoose";
import logger from "./logger.js";
// import { seedUser } from "../scripts/seedUser.js";

const connectDB = async (retries = 5) => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    logger.error("MONGO_URI is not defined in environment variables");
    process.exit(1);
  }

  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(uri);

      logger.info(
        `Connected to MongoDB: ${mongoose.connection.host} - ${mongoose.connection.name}`
      );

      // Call seedUser after successful connection
      // await seedUser();
      // logger.info("Seed user executed successfully");

      return;
    } catch (err) {
      logger.error(`MongoDB connection attempt ${i + 1} failed:`, err.message);
      process.exit(1);
    }
  }
};

export default connectDB;
