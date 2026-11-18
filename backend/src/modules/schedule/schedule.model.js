import mongoose from "mongoose";
import toJSON from "../../utils/toJSONPlugin.js";

// Fields the frontend uses (admin-web and store-web Schedule pages):
//   store (ref Store), date, startTime, endTime, capacity, booking / trip (ref), status
// TODO: replace the empty schema with real fields, types and indexes.
const schema = new mongoose.Schema({}, { timestamps: true });

schema.plugin(toJSON);

export default mongoose.model("LoadingSlot", schema);
