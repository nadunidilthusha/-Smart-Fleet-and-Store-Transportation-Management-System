import mongoose from "mongoose";
import toJSON from "../../utils/toJSONPlugin.js";

const schema = new mongoose.Schema({
  code: { type: String, required: true, unique: true }, // e.g. VH-001
  plate: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  model: { type: String },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  capacity: { type: String, required: true }, // e.g. "10,000 kg"
  hub: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
  mileage: { type: String },
  fuel: { type: Number, default: 100 },
  status: { type: String, enum: ['Available', 'In Use', 'Maintenance', 'Inactive'], default: 'Available' },
  documents: [{ name: String, url: String }]
}, { timestamps: true });

schema.index({ code: 1 }, { unique: true });
schema.index({ plate: 1 }, { unique: true });
schema.plugin(toJSON);

export default mongoose.model("Vehicle", schema);