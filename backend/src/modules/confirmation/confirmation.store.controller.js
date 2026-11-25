import asyncHandler from "../../utils/asyncHandler.js";
import * as service from "./confirmation.service.js";

// GET   /api/store/goods-confirmation?booking=BK-1104-0087   open booking + queue + tab counts
export const get = asyncHandler(async (req, res) => {
  res.json(await service.getGoodsConfirmation(req.query, req.user));
});

// POST  /api/store/goods-confirmation/draft   save the quantities of one step without completing it
export const saveDraft = asyncHandler(async (req, res) => {
  res.json(await service.saveStage(req.body, req.user, { confirm: false, ip: req.ip }));
});

// POST  /api/store/goods-confirmation/confirm   complete one step (prepared, handover or receipt)
export const confirm = asyncHandler(async (req, res) => {
  res.json(await service.saveStage(req.body, req.user, { confirm: true, ip: req.ip }));
});

// POST  /api/store/goods-confirmation/cancel   cancel the confirmation and revalidate the trip (store manager)
export const cancel = asyncHandler(async (req, res) => {
  res.json(await service.cancelConfirmation(req.body, req.user, { ip: req.ip }));
});
