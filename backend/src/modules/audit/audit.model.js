import mongoose from "mongoose";
import toJSON from "../../utils/toJSONPlugin.js";

const schema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true }, // e.g. "CREATE_BOOKING"
  entity: { type: String, required: true }, // e.g. "Booking"
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
  details: { type: mongoose.Schema.Types.Mixed }, // JSON object of changes
  ip: { type: String }
}, { timestamps: true });

schema.index({ entity: 1, entityId: 1 });
schema.plugin(toJSON);

export default mongoose.model("AuditLog", schema);