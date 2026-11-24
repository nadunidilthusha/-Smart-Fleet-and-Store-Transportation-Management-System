import { z } from "zod";
import asyncHandler from "../../utils/asyncHandler.js";
import { BOOKING_PRIORITIES } from "../../config/constants.js";
import * as service from "./bookings.service.js";

// What the admin New booking form sends (admin-web src/api/bookingApi.js createBooking).
// Pickup and destination are store names from GET /api/stores; the detailed checks are in bookings.service.js.
// const createSchema = z.object({
//   pickup: z.string().trim().min(1, "Choose a pickup store."),
//   destination: z.string().trim().min(1, "Choose a destination store."),
//   requestedFor: z
//     .string()
//     .min(1, "Choose a date and time.")
//     .refine((v) => !Number.isNaN(new Date(v).getTime()), "Enter a valid date and time."),
//   priority: z.enum(BOOKING_PRIORITIES).default("Standard"),
//   notes: z.string().trim().max(250, "Notes can be up to 250 characters.").default(""),
//   items: z
//     .array(
//       z.object({
//         code: z.string().trim().min(1),
//         quantity: z.coerce.number().int("Quantity must be a whole number.").positive("Quantity must be more than 0."),
//       })
//     )
//     .min(1, "Add at least one item with a quantity."),
// });

// const statusSchema = z.object({
//   status: z.enum(["Approved", "Changes requested", "Rejected"]),
//   comment: z.string().trim().default(""),
// });

// // Request rules (what the Bookings pages send)
// const createSchema = z.object({
//   pickup: z.string().trim().min(1, "Choose a pickup store."),
//   destination: z.string().trim().min(1, "Choose a destination store."),
//   requestedFor: z
//     .string()
//     .min(1, "Choose a date and time.")
//     .refine((v) => !Number.isNaN(new Date(v).getTime()), "Enter a valid date and time."),
//   priority: z.enum(BOOKING_PRIORITIES).default("Standard"),
//   items: z
//     .array(
//       z.object({
//         code: z.string().trim().min(1),
//         quantity: z.coerce.number().int("Quantity must be a whole number.").positive("Quantity must be more than 0."),
//       })
//     )
//     .min(1, "Add at least one item."),
//   notes: z.string().trim().max(500, "Notes can be up to 500 characters.").default(""),
// });

const statusSchema = z
  .object({
    status: z.enum(["Approved", "Changes requested", "Rejected"]),
    comment: z.string().trim().max(1000, "Comment can be up to 1000 characters.").default(""),
  })
  .refine((v) => v.status === "Approved" || v.comment.length > 0, {
    message: "Add a comment to the store before you reject or request changes.",
    path: ["comment"],
  });

// GET   /api/bookings              all bookings, plus the summary numbers for the cards
export const list = asyncHandler(async (req, res) => {
  res.json(await service.listBookings());
});

// POST  /api/bookings              admin creates a booking
export const create = asyncHandler(async (req, res) => {
  const input = createSchema.parse(req.body);
  res.status(201).json(await service.createBooking(input, req.user));
});

// GET   /api/bookings/:id
export const getOne = asyncHandler(async (req, res) => {
  res.json(await service.getBooking(req.params.id));
});

// PATCH /api/bookings/:id/status   body { status, comment } (approve, request changes, reject)
export const updateStatus = asyncHandler(async (req, res) => {
  const input = statusSchema.parse(req.body);
  res.json(await service.reviewBooking(req.params.id, input));
});
