import asyncHandler from "../../utils/asyncHandler.js";
import * as service from "./stores.service.js";

// GET   /api/stores           -> [{ id, code, name }] for booking, user and item dropdowns
export const options = asyncHandler(async (req, res) => {
  res.json(await service.listStoreOptions());
});

// GET   /api/stores/records   -> rows for the Stores table
export const records = asyncHandler(async (req, res) => {
  res.json(await service.listStoreRecords());
});

// GET   /api/stores/next-code -> { code } the next free STR-### code
export const nextCode = asyncHandler(async (req, res) => {
  res.json(await service.nextStoreCode());
});

// GET   /api/stores/:id       -> one store record (id is the store code), used by the edit form
export const getOne = asyncHandler(async (req, res) => {
  res.json(await service.getStore(req.params.id));
});

// POST  /api/stores           create or save as draft ({ ...record, asDraft })
export const create = asyncHandler(async (req, res) => {
  res.status(201).json(await service.createStore(req.body));
});

// PATCH /api/stores/:id
export const update = asyncHandler(async (req, res) => {
  res.json(await service.updateStore(req.params.id, req.body));
});

// DELETE /api/stores/:id
export const remove = asyncHandler(async (req, res) => {
  res.json(await service.deleteStore(req.params.id));
});
