import mongoose from "mongoose";
import toJSON from "../../utils/toJSONPlugin.js";

// Fields the frontend uses (admin-web src/api/bookingApi.js and store-web src/api/bookingApi.js):
//   code (BK-1104-0091, use nextCode), pickup / destination (ref Store), requestedFor, submittedAt, requestedBy (ref User), priority, status, notes, adminNote, items[{ item, quantity }], history[{ label, at }], vehicle, driver
// TODO: replace the empty schema with real fields, types and indexes.
const schema = new mongoose.Schema({}, { timestamps: true });

schema.plugin(toJSON, { codeAsId: true });

export default mongoose.model("Booking", schema);
