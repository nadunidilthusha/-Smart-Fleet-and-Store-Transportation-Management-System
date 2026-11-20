// src/config/db.js
import mongoose from "mongoose";
import { env } from "./env.js";
import logger from "../utils/logger.js";

mongoose.set("strictQuery", true);

// One place to tune pool + timeouts
const MONGOOSE_OPTIONS = {
  serverSelectionTimeoutMS: 8000, // fail fast if server unreachable
  socketTimeoutMS: 45000,         // close idle sockets
  maxPoolSize: 20,                // max concurrent connections
  minPoolSize: 2,                 // keep warm connections
  autoIndex: env.NODE_ENV !== "production", // disable heavy index builds in prod
};

// ---------- Connection event listeners ----------
mongoose.connection.on("connected", () => {
  logger.info(`MongoDB connected (${mongoose.connection.name})`);
});

mongoose.connection.on("disconnected", () => {
  logger.warn("MongoDB disconnected");
});

mongoose.connection.on("reconnected", () => {
  logger.info("MongoDB reconnected");
});

mongoose.connection.on("error", (err) => {
  logger.error("MongoDB connection error:", err.message);
});

// ---------- Public API ----------

/**
 * Connect to MongoDB with retry.
 * Retries initial connection only (not every request),
 * useful when the DB container is still starting.
 */
export async function connectDB({ retries = 5, delayMs = 3000 } = {}) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(env.MONGODB_URI, MONGOOSE_OPTIONS);
      logger.info(
        `MongoDB connected (${mongoose.connection.name}) on attempt ${attempt}`
      );
      return;
    } catch (err) {
      logger.error(
        `MongoDB connect attempt ${attempt}/${retries} failed: ${err.message}`
      );
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

/** Graceful shutdown. */
export async function disconnectDB() {
  try {
    await mongoose.disconnect();
    logger.info("MongoDB disconnected (graceful)");
  } catch (err) {
    logger.error("Error while disconnecting MongoDB:", err.message);
  }
}

/** Quick health check used by /api/health endpoint. */
export function isConnected() {
  return mongoose.connection.readyState === 1;
}

export default mongoose;