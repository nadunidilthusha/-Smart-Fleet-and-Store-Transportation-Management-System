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
  // Snapshot of the selected driver and hub (kept on the vehicle until real Drivers/Hubs collections exist)
  driverDetails: { id: String, name: String, contact: String, licenseNumber: String, status: String },
  hubDetails: { id: String, name: String, location: String, address: String, status: String },
  mileage: { type: String },
  fuel: { type: Number, default: 100 },
  status: { type: String, enum: ['Available', 'In Use', 'Maintenance', 'Inactive'], default: 'Available' },
  isDraft: { type: Boolean, default: false }, // saved via "Save as Draft" on Add Vehicle
  revenueLicenseExpiry: { type: Date },
  nextServiceDueKm: { type: String },
  insurancePolicyRef: { type: String },
  documents: [{ name: String, url: String, size: Number, type: { type: String } }] // "type" must be declared as an object, otherwise Mongoose reads it as the subdocument type
}, { timestamps: true });

schema.plugin(toJSON, { codeAsId: true }); // frontend identifies vehicles by code (VH-001)

export default mongoose.model("Vehicle", schema);
