import Store from "./stores.model.js";



// GET /api/stores -> [{ id, name }] for the booking pickup / destination dropdowns
export async function listStoreOptions() {
  const stores = await Store.find({ status: { $ne: "Inactive" } })
    .select("name")
    .sort({ name: 1 })
    .lean();
  return stores.map((s) => ({ id: String(s._id), name: s.name }));
}

// TODO: records for the Stores table, create / draft, update