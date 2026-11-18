import mongoose from "mongoose";
import toJSON from "../../utils/toJSONPlugin.js";

// Fields the frontend uses (admin-web src/api/itemApi.js):
//   code (ITM-1029), name, category, unit, store, weightKg, volumeM3, stockOnHand, stockUnit, reorderLevel, status, criticalHighSpec, stackable
// TODO: replace the empty schema with real fields, types and indexes.
const schema = new mongoose.Schema({}, { timestamps: true });

schema.plugin(toJSON);

export default mongoose.model("Item", schema);
