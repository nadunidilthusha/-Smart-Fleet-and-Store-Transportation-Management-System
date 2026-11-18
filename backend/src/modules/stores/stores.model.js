import mongoose from "mongoose";
import toJSON from "../../utils/toJSONPlugin.js";

// Fields the frontend uses (admin-web src/api/storeApi.js):
//   code (STR-001), name, shortName, type, manager, phone, district, assigned vehicles, usedM3, capacityM3, status, lowStock
// TODO: replace the empty schema with real fields, types and indexes.
const schema = new mongoose.Schema({}, { timestamps: true });

schema.plugin(toJSON);

export default mongoose.model("Store", schema);
