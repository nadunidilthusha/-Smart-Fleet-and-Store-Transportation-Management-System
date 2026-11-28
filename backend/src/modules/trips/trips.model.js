import mongoose from "mongoose";
import toJSON from "../../utils/toJSONPlugin.js";

const schema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true }, // TR-0412
    route: { type: String }, // String summary e.g. "Main Store → Ja-Ela → Kandy"
    stops: [
      {
        store: { type: mongoose.Schema.Types.ObjectId, ref: "Store" },
        sequence: Number,
        type: { type: String },
        status: { type: String, enum: ["Pending", "Arrived", "Completed"], default: "Pending" },
      },
    ],
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle" },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    bookings: [{ type: mongoose.Schema.Types.ObjectId, ref: "Booking" }],
    load: { type: Number, default: 0 }, // Percentage
    scheduledAt: { type: Date }, // Planned dispatch date & time chosen in Trip Planner
    status: {
      type: String,
      enum: ["Scheduled", "In transit", "Delayed", "Completed", "Unallocated"],
      default: "Scheduled",
    },
    nextStop: { type: String },
    delayMinutes: { type: Number, default: 0 },
    waybill: { type: String },
  },
  { timestamps: true }
);

schema.index({ status: 1, createdAt: -1 });
schema.index({ scheduledAt: 1 });

schema.plugin(toJSON, { codeAsId: true });

export default mongoose.model("Trip", schema);