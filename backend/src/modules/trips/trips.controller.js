import asyncHandler from "../../utils/asyncHandler.js";
import * as service from "./trips.service.js";
import Trip from "./trips.model.js";

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
  const trip = await Trip.findOneAndUpdate({ code: req.params.id }, req.body, { new: true });
  res.json(trip);
});