import mongoose from "mongoose";
import toJSON from "../../utils/toJSONPlugin.js";

const schema = new mongoose.Schema({
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  speed: { type: Number },
  recordedAt: { type: Date, default: Date.now }
}, { timestamps: true });

schema.index({ vehicle: 1, recordedAt: -1 }); // Fast lookup for latest location
schema.plugin(toJSON);

export default mongoose.model("VehicleLocation", schema);