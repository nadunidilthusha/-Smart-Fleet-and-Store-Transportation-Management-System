import mongoose from "mongoose";
import toJSON from "../../utils/toJSONPlugin.js";

const schema = new mongoose.Schema({
  trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
  store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  lines: [{
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
    expected: { type: Number },
    received: { type: Number },
    damaged: { type: Number, default: 0 }
  }],
  status: { type: String, enum: ['draft', 'confirmed'], default: 'draft' },
  confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  confirmedAt: { type: Date },
  notes: { type: String }
}, { timestamps: true });

schema.plugin(toJSON);

export default mongoose.model("GoodsConfirmation", schema);