import mongoose from "mongoose";
import toJSON from "../../utils/toJSONPlugin.js";

const schema = new mongoose.Schema({
  code: { type: String, required: true, unique: true }, // e.g. ITM-1029
  name: { type: String, required: true, trim: true },
  category: { type: String, required: true },
  unit: { type: String, required: true }, // for bookings (e.g., 'bag')
  store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' }, // Storage Hub
  weightKg: { type: Number },
  volumeM3: { type: Number },
  stockOnHand: { type: Number, default: 0 },
  stockUnit: { type: String },
  reorderLevel: { type: Number, default: 0 },
  status: { type: String, enum: ['In Stock', 'Low Stock', 'Critical Low', 'Reorder Soon'], default: 'In Stock' },
  criticalHighSpec: { type: Boolean, default: false },
  stackable: { type: Boolean, default: true },
  isDraft: { type: Boolean, default: false } // saved via "Save as Draft" on Add Item
}, { timestamps: true });

schema.plugin(toJSON);

export default mongoose.model("Item", schema);
