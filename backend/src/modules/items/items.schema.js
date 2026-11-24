import { z } from "zod";

// Request validation for the Add / Edit Item form payload (see admin-web src/api/itemApi.js mapItemFormToRecord)
const text = z.string().trim();
const optionalText = text.optional();

// Numbers arrive as strings from the form; an empty value means "not provided"
const optionalNumber = (label) =>
  z
    .union([z.string(), z.number()])
    .transform((value) => (String(value).trim() === "" ? undefined : Number(String(value).replace(/,/g, ""))))
    .refine((value) => value === undefined || (Number.isFinite(value) && value >= 0), `Enter a valid ${label}.`)
    .optional();

const base = z.object({
  code: text.min(1, "Item code / SKU is required."),
  name: text.min(1, "Item name is required."),
  category: optionalText,
  hub: optionalText, // storage hub = store code, e.g. STR-001
  unit: optionalText, // unit of measure used by bookings, e.g. "bag"
  weightKg: optionalNumber("unit weight in kg"),
  volumeM3: optionalNumber("unit volume in m³"),
  stockOnHand: optionalNumber("initial stock quantity"),
  reorderLevel: optionalNumber("reorder level"),
  status: z.enum(["In Stock", "Low Stock", "Critical Low", "Reorder Soon"]).optional(),
  criticalHighSpec: z.boolean().optional(),
  stackable: z.boolean().optional(),
  asDraft: z.boolean().optional(),
  isDraft: z.boolean().optional(),
});

// POST: a full submit needs the complete registration (drafts only need code and name)
export const createItemSchema = base.superRefine((data, ctx) => {
  if (data.asDraft ?? data.isDraft) return;
  if (!data.category) ctx.addIssue({ code: "custom", path: ["category"], message: "Select a catalog category." });
  if (!data.hub) ctx.addIssue({ code: "custom", path: ["hub"], message: "Select a primary storage hub." });
  const numbers = [
    ["weightKg", "Enter a valid unit weight in kg."],
    ["volumeM3", "Enter a valid unit volume in m³."],
    ["stockOnHand", "Enter a valid initial stock quantity."],
    ["reorderLevel", "Enter a valid reorder level."],
  ];
  for (const [field, message] of numbers) {
    if (data[field] === undefined) ctx.addIssue({ code: "custom", path: [field], message });
  }
});

// PATCH: any field can be sent; the item code cannot be changed
export const updateItemSchema = base.omit({ code: true }).partial();
