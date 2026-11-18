import mongoose from "mongoose";
import toJSON from "../../utils/toJSONPlugin.js";

// Fields the frontend uses (store-web src/api/confirmationApi.js):
//   trip (ref Trip), store (ref Store), lines[{ item, expected, received, damaged }], status (draft | confirmed), confirmedBy (ref User), confirmedAt, notes
// TODO: replace the empty schema with real fields, types and indexes.
const schema = new mongoose.Schema({}, { timestamps: true });

schema.plugin(toJSON);

export default mongoose.model("GoodsConfirmation", schema);
