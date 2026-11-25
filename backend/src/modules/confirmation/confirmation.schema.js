import { z } from "zod";
import { STAGES } from "./confirmation.model.js";

// Only the shape is checked here. Quantity and discrepancy rules are in confirmation.service.js,
// because they depend on the booking and on the earlier steps.

// ?booking=BK-1104-0087 (open one booking on the Goods confirmation page)
export const getQuerySchema = z.object({
  booking: z.string().trim().min(1).optional(),
});

const lineSchema = z.object({
  code: z.string().trim().min(1), // item code
  quantity: z.union([z.number(), z.string(), z.null()]).optional(), // actual quantity counted
  damaged: z.union([z.number(), z.string(), z.null()]).optional(),
  incorrect: z.union([z.number(), z.string(), z.null()]).optional(),
  note: z.string().trim().max(250, "Line notes can be up to 250 characters.").default(""),
});

// POST /draft and POST /confirm
export const stageBodySchema = z.object({
  bookingId: z.string().trim().min(1, "Choose a booking."),
  stage: z.enum(STAGES),
  lines: z.array(lineSchema).min(1, "Add the item quantities."),
  note: z.string().trim().max(500, "The note can be up to 500 characters.").default(""),
  handoverAt: z.string().optional(), // handover date and time (ISO), defaults to now
  resolution: z.enum(["accept_partial", "reject_damaged"]).optional(),
  acknowledged: z.boolean().default(false),
});

// POST /cancel
export const cancelBodySchema = z.object({
  bookingId: z.string().trim().min(1, "Choose a booking."),
  reason: z.string().trim().min(3, "Enter a reason for cancelling.").max(250, "The reason can be up to 250 characters."),
});
