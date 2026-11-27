import asyncHandler from "../../utils/asyncHandler.js";
import * as service from "./trips.service.js";
import Trip from "./trips.model.js";
import { notifyStore } from "../notifications/notifications.service.js";

// GET /api/trips
export const list = asyncHandler(async (req, res) => {
  const trips = await Trip.find().populate("vehicle stops.store").sort({ createdAt: -1 }).lean();
  res.json(trips);
});

// POST /api/trips
export const create = asyncHandler(async (req, res) => {
  const result = await service.createTrip(req.body);
  res.status(201).json(result);
});

// GET /api/trips/:id
export const getOne = asyncHandler(async (req, res) => {
  const trip = await Trip.findOne({ code: req.params.id }).populate("vehicle stops.store bookings");
  if (!trip) return res.status(404).json({ message: "Trip not found" });
  res.json(trip);
});

// PATCH /api/trips/:id
export const update = asyncHandler(async (req, res) => {
  const trip = await Trip.findOneAndUpdate(
    { code: req.params.id },
    { status: req.body.status },
    { new: true }
  );
  if (!trip) return res.status(404).json({ message: "Trip not found" });

  // Notify all pickup & destination stores on this trip
  const uniqueStoreIds = [...new Set((trip.stops ?? []).map((s) => String(s.store)).filter(Boolean))];
  await Promise.all(
    uniqueStoreIds.map((storeId) =>
      notifyStore({
        storeId,
        type: "trip",
        severity: req.body.status === "Delayed" ? "warning" : "info",
        title: `Trip ${trip.code} ${req.body.status}`,
        message: `Trip ${trip.code} (${trip.route || "route"}) status changed to ${req.body.status}.`,
        link: `/trip-progress/${trip.code}`,
      })
    )
  );

  res.json(trip);
});