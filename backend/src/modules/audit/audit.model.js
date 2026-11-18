import mongoose from "mongoose";
import toJSON from "../../utils/toJSONPlugin.js";

// Fields the frontend uses (admin-web src/api/auditApi.js):
//   actor (ref User), action, entity, entityId, details, ip, createdAt
// TODO: replace the empty schema with real fields, types and indexes.
const schema = new mongoose.Schema({}, { timestamps: true });

schema.plugin(toJSON);

export default mongoose.model("AuditLog", schema);
