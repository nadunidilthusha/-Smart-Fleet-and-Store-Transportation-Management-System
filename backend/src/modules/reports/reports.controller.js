import asyncHandler from "../../utils/asyncHandler.js";
import * as service from "./reports.service.js";

// GET   /api/reports/options   -> { types, stores, vehicles } report tabs and filter dropdown values
export const options = asyncHandler(async (req, res) => {
  res.json(await service.getReportOptions());
});

// GET   /api/reports/:type     -> { type, rows, total, page, limit, kpis, breakdown, trend }
export const get = asyncHandler(async (req, res) => {
  res.json(await service.getReport(req.params.type, req.query));
});

// POST  /api/reports/export    body { type, rowCount } -> records that a report was exported
export const exportReport = asyncHandler(async (req, res) => {
  res.status(201).json(await service.recordReportExport(req.body, req.user, req.ip));
});
