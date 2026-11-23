import { z } from "zod";
import { VEHICLE_STATUSES } from "../../config/constants.js";

// Request validation for the Add Vehicle form payload (see admin-web src/api/vehicleApi.js mapVehicleFormToRecord)
const text = z.string().trim();
const optionalText = text.optional();

const base = z.object({
  id: text.min(1, "Vehicle ID is required."), // becomes the vehicle code
  plate: text.min(1, "Plate number is required."),
  type: optionalText,
  model: optionalText,
  driver: optionalText, // driver name or "Unassigned"
  capacity: optionalText, // e.g. "3,500 kg"
  hub: optionalText, // hub short name, e.g. "Biyagama Hub"
  mileage: optionalText, // e.g. "12,450 km"
  fuel: z.coerce.number().min(0).max(100).optional(),
  status: z.enum(VEHICLE_STATUSES).optional(),
  asDraft: z.boolean().optional(),
  isDraft: z.boolean().optional(),
  revenueLicenseExpiry: z
    .string()
    .refine((v) => v === "" || !Number.isNaN(new Date(v).getTime()), "Enter a valid date.")
    .optional(),
  nextServiceDueKm: z.union([z.string(), z.number()]).transform(String).optional(),
  insurancePolicyRef: optionalText,
  documents: z
    .array(z.object({ name: z.string(), size: z.number().optional(), type: z.string().optional(), url: z.string().optional() }))
    .optional(),
});

// POST: a full submit also needs type and capacity (drafts only need ID and plate)
export const createVehicleSchema = base.superRefine((data, ctx) => {
  if (data.asDraft ?? data.isDraft) return;
  if (!data.type) ctx.addIssue({ code: "custom", path: ["type"], message: "Select a vehicle type and model." });
  if (!data.capacity) ctx.addIssue({ code: "custom", path: ["capacity"], message: "Enter a valid capacity." });
});

// PATCH: any field can be sent; the vehicle ID (code) cannot be changed
export const updateVehicleSchema = base.omit({ id: true }).partial();
