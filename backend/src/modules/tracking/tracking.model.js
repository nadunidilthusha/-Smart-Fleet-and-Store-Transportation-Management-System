import mongoose from "mongoose";
import toJSON from "../../utils/toJSONPlugin.js";

// Fields the frontend uses (admin-web src/api/trackingApi.js):
//   vehicle (ref Vehicle), trip (ref Trip), lat, lng, speed, recordedAt
// TODO: replace the empty schema with real fields, types and indexes.
const schema = new mongoose.Schema({}, { timestamps: true });

schema.plugin(toJSON);

export default mongoose.model("VehicleLocation", schema);
