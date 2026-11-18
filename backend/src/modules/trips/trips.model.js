import mongoose from "mongoose";
import toJSON from "../../utils/toJSONPlugin.js";

// Fields the frontend uses (admin-web TripPlanner and Trips pages; store-web TripProgress pages):
//   code (TR-0412, use nextCode), route / stops, vehicle (ref Vehicle), driver (ref User), bookings[] (ref Booking), load %, status, nextStop, delayMinutes, waybill
// TODO: replace the empty schema with real fields, types and indexes.
const schema = new mongoose.Schema({}, { timestamps: true });

schema.plugin(toJSON, { codeAsId: true });

export default mongoose.model("Trip", schema);
