import mongoose from "mongoose";
import toJSON from "../../utils/toJSONPlugin.js";
import { NOTIFICATION_TYPES, NOTIFICATION_SEVERITIES } from "../../config/constants.js";

// One notification for one audience.
//   recipient "SYSTEM_ADMIN"  -> shown in the Admin portal
//   recipient "store:<id>"    -> reserved for the Store portal (same collection)
const schema = new mongoose.Schema(
  {
    type: { type: String, required: true, enum: NOTIFICATION_TYPES }, // booking, trip, vehicle, system
    severity: { type: String, enum: NOTIFICATION_SEVERITIES, default: "info" },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    link: { type: String, default: "" }, // page inside the portal, e.g. /bookings?booking=BK-1104-0090
    read: { type: Boolean, default: false },
    recipient: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

// List newest first for one audience, and count their unread ones quickly
schema.index({ recipient: 1, createdAt: -1 });
schema.index({ recipient: 1, read: 1 });

schema.plugin(toJSON);

export default mongoose.model("Notification", schema);