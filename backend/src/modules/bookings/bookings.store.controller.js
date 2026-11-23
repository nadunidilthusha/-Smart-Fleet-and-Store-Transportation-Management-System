import { z } from "zod";
import asyncHandler from "../../utils/asyncHandler.js";
import { BOOKING_PRIORITIES } from "../../config/constants.js";
import * as service from "./bookings.service.js";

// What the store New booking / Edit booking form sends.
// The detailed checks (stores, items, date, opening hours) are in bookings.service.js.
const bookingSchema = z.object({
  pickup: z.string().trim().min(1, "Choose a pickup store."),
  destination: z.string().trim().default(""),
  requestedFor: z
    .string()
    .min(1, "Choose a date and time.")
    .refine((v) => !Number.isNaN(new Date(v).getTime()), "Enter a valid date and time."),
  priority: z.enum(BOOKING_PRIORITIES).default("Standard"),
  notes: z.string().trim().max(250, "Notes can be up to 250 characters.").default(""),
  items: z
    .array(
      z.object({
        code: z.string().trim().min(1),
        quantity: z.coerce.number().int("Quantity must be a whole number.").positive("Quantity must be more than 0."),
      })
    )
    .default([]),
  draft: z.boolean().default(false), // true = save as a draft
});

// GET   /api/store/booking-options   -> { stores, items }
export const options = asyncHandler(async (req, res) => {
  res.json(await service.getStoreBookingOptions());
});

// GET   /api/store/bookings   bookings sent from or to the signed-in store
export const list = asyncHandler(async (req, res) => {
  res.json(await service.listStoreBookings(req.user));
});

// POST  /api/store/bookings   body { pickup, destination, requestedFor, priority, notes, items, draft }
export const create = asyncHandler(async (req, res) => {
  const input = bookingSchema.parse(req.body);
  res.status(201).json(await service.createStoreBooking(input, req.user));
});

// GET   /api/store/bookings/:id
export const getOne = asyncHandler(async (req, res) => {
  res.json(await service.getStoreBooking(req.params.id, req.user));
});

// PUT   /api/store/bookings/:id   edit and resubmit
export const update = asyncHandler(async (req, res) => {
  const input = bookingSchema.parse(req.body);
  res.json(await service.updateStoreBooking(req.params.id, input, req.user));
});

// PATCH /api/store/bookings/:id/cancel
export const cancel = asyncHandler(async (req, res) => {
  res.json(await service.cancelStoreBooking(req.params.id, req.user));
});