import mongoose from "mongoose";
import toJSON from "../../utils/toJSONPlugin.js";

const { ObjectId } = mongoose.Schema.Types;

// One goods confirmation per booking, with three steps: prepared (sending store), handover (sending store to the driver) and receipt (receiving store)
export const STAGES = ["prepared", "handover", "receipt"];
export const DISCREPANCY_TYPES = ["none", "missing", "excess", "damaged", "incorrect", "multiple"];
export const CONFIRMATION_STATUSES = ["draft", "prepared", "handed_over", "confirmed", "cancelled"]; // "confirmed" = goods received

// What the employee counted for one item in one step, and how it differs from the step before
const stageLine = new mongoose.Schema({
  qty: { type: Number, min: 0 }, // actual quantity counted (empty while only a draft)
  damaged: { type: Number, default: 0, min: 0 }, // part of qty that is damaged
  incorrect: { type: Number, default: 0, min: 0 }, // part of qty that is the wrong goods
  difference: { type: Number }, // qty minus the quantity of the step before (negative = missing, positive = excess)
  discrepancyType: { type: String, enum: DISCREPANCY_TYPES, default: "none" },
  note: { type: String, trim: true }
}, { _id: false });

// Who finished a step and when. For handover, "at" is the handover date and time.
const stageMeta = new mongoose.Schema({
  confirmed: { type: Boolean, default: false },
  at: { type: Date },
  by: { type: ObjectId, ref: 'User' },
  byName: { type: String }, // name kept as it was, so history survives user changes
  note: { type: String, trim: true }, // discrepancy note for the step
  resolution: { type: String, enum: ['accept_partial', 'reject_damaged'] } // receipt only
}, { _id: false });

const schema = new mongoose.Schema({
  booking: { type: ObjectId, ref: 'Booking', required: true },
  trip: { type: ObjectId, ref: 'Trip' }, // set when the booking is on a trip
  store: { type: ObjectId, ref: 'Store', required: true }, // receiving store
  pickupStore: { type: ObjectId, ref: 'Store' }, // sending store
  lines: [{
    _id: false,
    item: { type: ObjectId, ref: 'Item' },
    expected: { type: Number }, // quantity on the booking
    prepared: { type: stageLine, default: undefined },
    handover: { type: stageLine, default: undefined },
    receipt: { type: stageLine, default: undefined },
    // Totals over the confirmed steps (used by the admin reports)
    missing: { type: Number, default: 0 },
    excess: { type: Number, default: 0 },
    damaged: { type: Number, default: 0 },
    incorrect: { type: Number, default: 0 }
  }],
  status: { type: String, enum: CONFIRMATION_STATUSES, default: 'draft' },
  stages: {
    prepared: { type: stageMeta, default: () => ({}) },
    handover: { type: stageMeta, default: () => ({}) },
    receipt: { type: stageMeta, default: () => ({}) }
  },
  // Every save, confirmation and cancellation, kept even when the confirmation is restarted
  history: [{
    _id: false,
    stage: { type: String },
    action: { type: String, enum: ['draft', 'confirmed', 'cancelled', 'restarted'] },
    by: { type: ObjectId, ref: 'User' },
    byName: { type: String },
    at: { type: Date, default: Date.now },
    note: { type: String }
  }],
  confirmedBy: { type: ObjectId, ref: 'User' }, // employee who confirmed the receipt
  confirmedAt: { type: Date }, // when the receipt was confirmed
  notes: { type: String } // receipt discrepancy note
}, { timestamps: true });

// A booking has one confirmation record
schema.index({ booking: 1 }, { unique: true, sparse: true });
schema.index({ status: 1, createdAt: -1 });
schema.index({ store: 1 });
schema.index({ pickupStore: 1 });

schema.plugin(toJSON);

export default mongoose.model("GoodsConfirmation", schema);
