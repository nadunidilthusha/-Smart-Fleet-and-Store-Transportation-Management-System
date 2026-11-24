import asyncHandler from "../../utils/asyncHandler.js";
import * as service from "./items.service.js";

// GET   /api/items           -> [{ code, name, unit }] for booking item pickers
export const catalog = asyncHandler(async (req, res) => {
  res.json(await service.listItemCatalog());
});

// GET   /api/items/records   -> rows for the Items table
export const records = asyncHandler(async (req, res) => {
  res.json(await service.listItemRecords());
});

// GET   /api/items/next-code -> { code } the next free ITM-#### code
export const nextCode = asyncHandler(async (req, res) => {
  res.json(await service.nextItemCode());
});

// GET   /api/items/:id       -> one item record (id is the item code), used by the edit form
export const getOne = asyncHandler(async (req, res) => {
  res.json(await service.getItem(req.params.id));
});

// POST  /api/items           create or save as draft ({ ...record, asDraft })
export const create = asyncHandler(async (req, res) => {
  res.status(201).json(await service.createItem(req.body));
});

// PATCH /api/items/:id
export const update = asyncHandler(async (req, res) => {
  res.json(await service.updateItem(req.params.id, req.body));
});

// DELETE /api/items/:id
export const remove = asyncHandler(async (req, res) => {
  res.json(await service.deleteItem(req.params.id));
});
