// Mongoose plugin: sends clean JSON to the frontend.
//   _id -> id (string), removes __v
//   Pass { codeAsId: true } for records the frontend identifies by a readable code
//   (bookings "BK-1104-0091", trips "TR-0412", vehicles "VH-001"): id becomes the code.
//
//   schema.plugin(toJSON);
//   schema.plugin(toJSON, { codeAsId: true });
export default function toJSON(schema, options = {}) {
  schema.set("toJSON", {
    virtuals: true,
    versionKey: false,
    transform(doc, ret) {
      ret.id = options.codeAsId && ret.code ? ret.code : String(ret._id);
      delete ret._id;
      return ret;
    },
  });
}
