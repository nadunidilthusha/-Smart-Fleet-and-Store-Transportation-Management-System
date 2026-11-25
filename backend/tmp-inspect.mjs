import mongoose from "mongoose";
import { connectDB, disconnectDB } from "./src/config/db.js";
import Trip from "./src/modules/trips/trips.model.js";
import Booking from "./src/modules/bookings/bookings.model.js";
import User from "./src/modules/users/users.model.js";
import Vehicle from "./src/modules/vehicles/vehicles.model.js";
import GoodsConfirmation from "./src/modules/confirmation/confirmation.model.js";

await connectDB({ retries: 1 });
try {
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  console.log("replicaSet:", hello.setName ?? "none", "| msg:", hello.msg ?? "-");
  console.log("trips by status", JSON.stringify(await Trip.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }])));
  console.log("trips with bookings", await Trip.countDocuments({ "bookings.0": { $exists: true } }));
  const withB = await Trip.find({ "bookings.0": { $exists: true } }).limit(3).lean();
  console.log(JSON.stringify(withB, null, 1).slice(0, 2500));
  const sample = await Trip.findOne({ status: "In transit" }).lean();
  console.log("sample in transit", JSON.stringify(sample));
  console.log("users", JSON.stringify(await User.find({ role: { $ne: "SYSTEM_ADMIN" } }).select("name role store email").lean()));
  console.log("vehicles sample", JSON.stringify(await Vehicle.find().limit(3).select("code plate capacity status").lean()));
  console.log("bookings", JSON.stringify(await Booking.find().select("code status pickup destination vehicle items").lean()));
  console.log("goods", await GoodsConfirmation.countDocuments());
} catch (e) {
  console.error("FAILED", e);
} finally {
  await disconnectDB();
  process.exit(0);
}
