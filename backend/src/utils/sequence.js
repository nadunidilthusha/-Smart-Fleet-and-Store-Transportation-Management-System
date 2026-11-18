import mongoose from "mongoose";

// Counter collection used to build readable codes: BK-1104-0091, TR-0412, VH-001 ...
const counterSchema = new mongoose.Schema({
  _id: String,
  seq: { type: Number, default: 0 },
});
const Counter = mongoose.model("Counter", counterSchema);

// nextCode("BK-1104") -> "BK-1104-0001", then "BK-1104-0002" ...
export async function nextCode(prefix, pad = 4) {
  const counter = await Counter.findOneAndUpdate(
    { _id: prefix },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `${prefix}-${String(counter.seq).padStart(pad, "0")}`;
}
