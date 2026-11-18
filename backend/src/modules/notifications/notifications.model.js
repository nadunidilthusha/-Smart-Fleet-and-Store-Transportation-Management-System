import mongoose from "mongoose";
import toJSON from "../../utils/toJSONPlugin.js";

// Fields the frontend uses (admin-web and store-web src/api/notificationApi.js):
//   type, severity (see config/constants.js), title, message, link, read, recipient (role / store / user), createdAt
// TODO: replace the empty schema with real fields, types and indexes.
const schema = new mongoose.Schema({}, { timestamps: true });

schema.plugin(toJSON);

export default mongoose.model("Notification", schema);
