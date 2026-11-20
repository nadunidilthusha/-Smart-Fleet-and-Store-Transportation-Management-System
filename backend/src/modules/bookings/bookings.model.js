import mongoose from "mongoose";
import toJSON from "../../utils/toJSONPlugin.js";

const schema = new mongoose.Schema({
  code: { type: String, required: true, unique: true }, // e.g. BK-1104-0091
  pickup: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  destination: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  requestedFor: { type: Date, required: true },
  submittedAt: { type: Date, default: Date.now },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  priority: { type: String, enum: ['Standard', 'Urgent'], default: 'Standard' },
  status: { 
    type: String, 
    enum: ['Pending', 'Approved', 'Changes requested', 'Rejected', 'Completed'], 
    default: 'Pending' 
  },
  notes: { type: String },
  adminNote: { type: String },
  items: [{
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    quantity: { type: Number, required: true, min: 1 }
  }],
  history: [{
    label: { type: String },
    at: { type: Date, default: Date.now }
  }],
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// BE-2: Indexes for fast querying
schema.index({ code: 1 }, { unique: true });
schema.index({ status: 1, requestedFor: 1 });
schema.index({ pickup: 1, requestedFor: 1 });
schema.index({ destination: 1, requestedFor: 1 });

schema.plugin(toJSON, { codeAsId: true });

export default mongoose.model("Booking", schema);