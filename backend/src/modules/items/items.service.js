import Item from "./items.model.js";

// Business logic and database access for items lives here.
// Controllers call these functions. Keep req and res out of this file.

// GET /api/items -> [{ code, name, unit }] for the booking item picker
export async function listItemCatalog() {
  const items = await Item.find().select("code name unit").sort({ code: 1 }).lean();
  return items.map((i) => ({ code: i.code, name: i.name, unit: i.unit }));
}

// TODO: records for the Items table, create / draft, update