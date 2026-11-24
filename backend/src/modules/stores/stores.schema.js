import { z } from "zod";

// Request validation for the Add / Edit Store form payload (see admin-web src/api/storeApi.js mapStoreFormToRecord)
const text = z.string().trim();
const optionalText = text.optional();

// Numbers arrive as strings from the form; an empty value means "not provided"
const optionalNumber = (label, { min = 0, max } = {}) =>
  z
    .union([z.string(), z.number()])
    .transform((value) => (String(value).trim() === "" ? undefined : Number(String(value).replace(/,/g, ""))))
    .refine((value) => value === undefined || (Number.isFinite(value) && value >= min && (max === undefined || value <= max)), `Enter a valid ${label}.`)
    .optional();

const base = z.object({
  code: text.min(1, "Store code is required."),
  name: text.min(1, "Store / warehouse name is required."),
  type: optionalText,
  status: z.enum(["Active", "High Capacity", "Inactive"]).optional(),
  manager: optionalText,
  phone: optionalText,
  dispatchEmail: z.union([z.literal(""), text.email("Enter a valid dispatch email.")]).optional(),
  district: optionalText,
  address: optionalText,
  capacityM3: optionalNumber("storage capacity"),
  alertThreshold: optionalNumber("alert threshold", { min: 1, max: 100 }),
  loadingBays: optionalNumber("number of loading bays", { min: 1 }),
  assignedVehicles: z.array(z.string()).optional(), // vehicle codes, e.g. VH-001
  asDraft: z.boolean().optional(),
  isDraft: z.boolean().optional(),
});

// POST: a full submit needs the complete registration (drafts only need code and name)
export const createStoreSchema = base.superRefine((data, ctx) => {
  if (data.asDraft ?? data.isDraft) return;
  const required = [
    ["type", "Select a store type."],
    ["manager", "Manager name is required."],
    ["phone", "Contact phone is required."],
    ["dispatchEmail", "Enter a valid dispatch email."],
    ["district", "Select a district."],
    ["address", "Physical facility address is required."],
  ];
  for (const [field, message] of required) {
    if (!data[field]) ctx.addIssue({ code: "custom", path: [field], message });
  }
  if (!data.capacityM3) ctx.addIssue({ code: "custom", path: ["capacityM3"], message: "Enter a valid storage capacity." });
  if (!data.alertThreshold) ctx.addIssue({ code: "custom", path: ["alertThreshold"], message: "Enter a valid alert threshold." });
});

// PATCH: any field can be sent; the store code cannot be changed
export const updateStoreSchema = base.omit({ code: true }).partial();
