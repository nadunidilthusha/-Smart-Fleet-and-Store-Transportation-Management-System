import mongoose from "mongoose";
import toJSON from "../../utils/toJSONPlugin.js";

// Fields the frontend uses (admin-web src/api/vehicleApi.js):
//   code (VH-001), plate, type, model, driver (ref User), capacity, hub (ref Store), mileage, fuel, status, documents[]
// TODO: replace the empty schema with real fields, types and indexes.
const schema = new mongoose.Schema({}, { timestamps: true });

schema.plugin(toJSON);

export default mongoose.model("Vehicle", schema);
