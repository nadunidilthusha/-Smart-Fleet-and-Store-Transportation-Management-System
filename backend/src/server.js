import http from "http";
import app from "./app.js";
import { env } from "./config/env.js";
import { connectDB, disconnectDB } from "./config/db.js";
import { initSocket } from "./sockets/index.js";
import logger from "./utils/logger.js";

async function start() {
  await connectDB();

  const server = http.createServer(app);
  initSocket(server);

  server.listen(env.PORT, () => {
    logger.info(`API running on http://localhost:${env.PORT}/api (${env.NODE_ENV})`);
  });

  // Close the server and database cleanly (Ctrl + C, or when the host stops the app)
  const shutdown = async (signal) => {
    logger.info(`${signal} received, shutting down...`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

start().catch((err) => {
  logger.error("Could not start the API:", err.message);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => logger.error("Unhandled promise rejection:", reason));
