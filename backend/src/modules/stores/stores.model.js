import mongoose from "mongoose";
import toJSON from "../../utils/toJSONPlugin.js";

const schema = new mongoose.Schema({
  code: { type: String, required: true, unique: true }, // e.g. STR-001
  name: { type: String, required: true, trim: true },
  shortName: { type: String, trim: true },
  type: { type: String, default: "Regional Store" },
  manager: { type: String },
  phone: { type: String },
  dispatchEmail: { type: String, trim: true, lowercase: true },
  district: { type: String },
  address: { type: String, trim: true },
  assignedVehicles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' }],
  usedM3: { type: Number, default: 0 },
  capacityM3: { type: Number, default: 0 },
  alertThreshold: { type: Number }, // % of capacity that flags the store as High Capacity
  loadingBays: { type: Number },
  status: { type: String, enum: ['Active', 'High Capacity', 'Inactive'], default: 'Active' },
  isDraft: { type: Boolean, default: false }, // saved via "Save as Draft" on Add Store
  lowStock: { type: Boolean, default: false }
}, { timestamps: true });

schema.plugin(toJSON);

export default mongoose.model("Store", schema);
