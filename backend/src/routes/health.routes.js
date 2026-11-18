import { Router } from "express";
import mongoose from "mongoose";

const router = Router();

const DB_STATES = ["disconnected", "connected", "connecting", "disconnecting"];

// GET /api/health  (public) - quick check that the API and the database are alive
router.get("/", (req, res) => {
  res.json({
    status: "ok",
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    database: DB_STATES[mongoose.connection.readyState] ?? "unknown",
  });
});

export default router;
