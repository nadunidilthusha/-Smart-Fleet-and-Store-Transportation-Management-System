import mongoose from "mongoose";
import toJSON from "../../utils/toJSONPlugin.js";

const schema = new mongoose.Schema({
  code: { type: String, required: true, unique: true }, // e.g. STR-001
  name: { type: String, required: true, trim: true },
  shortName: { type: String, trim: true },
  type: { type: String, default: "Regional Store" },
  manager: { type: String },
  phone: { type: String },
  district: { type: String },
  assignedVehicles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' }],
  usedM3: { type: Number, default: 0 },
  capacityM3: { type: Number, default: 0 },
  status: { type: String, enum: ['Active', 'High Capacity', 'Inactive'], default: 'Active' },
  lowStock: { type: Boolean, default: false }
}, { timestamps: true });

schema.plugin(toJSON);

export default mongoose.model("Store", schema);