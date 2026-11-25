import mongoose from "mongoose";
import toJSON from "../../utils/toJSONPlugin.js";

const schema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // empty for failed sign-ins and system events
  actorName: { type: String, default: "System" }, // name kept as it was, so history survives user changes
  actorRole: { type: String },
  action: { type: String, required: true }, // e.g. "CREATE", "UPDATE", "DELETE", "LOGIN"
  entity: { type: String, required: true }, // e.g. "Booking", "Vehicle", "Store", "Item", "Session"
  entityId: { type: mongoose.Schema.Types.ObjectId }, // database id when the record has one
  entityCode: { type: String }, // readable id shown in the admin web, e.g. "VH-001"
  description: { type: String }, // one-line summary
  changes: [{ _id: false, field: String, before: String, after: String }], // field level before / after values
  details: { type: mongoose.Schema.Types.Mixed }, // extra info, e.g. request method and path
  ip: { type: String }
}, { timestamps: { createdAt: true, updatedAt: false } }); // audit entries are never edited

schema.index({ entity: 1, entityId: 1 });
schema.index({ createdAt: -1 });
schema.index({ actor: 1, createdAt: -1 });
schema.index({ action: 1, createdAt: -1 });
schema.index({ entity: 1, entityCode: 1 });

// Audit history is append-only: block every update and delete (also from code, not just the API)
const readOnly = () => {
  throw new Error("Audit log entries cannot be modified or deleted.");
};
schema.pre(
  ["updateOne", "updateMany", "replaceOne", "findOneAndUpdate", "findOneAndReplace", "deleteOne", "deleteMany", "findOneAndDelete"],
  { query: true, document: false },
  readOnly
);
schema.pre("deleteOne", { document: true, query: false }, readOnly);
schema.pre("save", function () {
  if (!this.isNew) readOnly();
});

schema.plugin(toJSON);

export default mongoose.model("AuditLog", schema);
