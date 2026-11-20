import mongoose from "mongoose";
import toJSON from "../../utils/toJSONPlugin.js";

const schema = new mongoose.Schema({
  type: { type: String, required: true }, // booking, trip, vehicle, system
  severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'info' },
  title: { type: String, required: true },
  message: { type: String, required: true },
  link: { type: String },
  read: { type: Boolean, default: false },
  recipient: { type: String } // Role, store ID, or user ID
}, { timestamps: true });

schema.plugin(toJSON);

export default mongoose.model("Notification", schema);