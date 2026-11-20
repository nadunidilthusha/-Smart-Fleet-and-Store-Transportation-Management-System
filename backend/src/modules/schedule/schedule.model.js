import mongoose from "mongoose";
import toJSON from "../../utils/toJSONPlugin.js";

const schema = new mongoose.Schema({
  store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  startTime: { type: String, required: true }, // HH:MM
  endTime: { type: String, required: true },
  capacity: { type: Number, default: 1 },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' },
  status: { type: String, enum: ['Available', 'Reserved', 'Occupied'], default: 'Available' }
}, { timestamps: true });

// BE-2: Index for slot overlap and date queries
schema.index({ store: 1, date: 1, startTime: 1 }, { unique: true });
schema.index({ store: 1, date: 1 }); 

schema.plugin(toJSON);

export default mongoose.model("LoadingSlot", schema);