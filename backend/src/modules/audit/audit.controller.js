import asyncHandler from "../../utils/asyncHandler.js";
import * as service from "./audit.service.js";

// GET   /api/audit-log           -> { entries, total, page, limit, summary } (filtered, one page)
export const list = asyncHandler(async (req, res) => {
  res.json(await service.listAuditLogs(req.query));
});

// GET   /api/audit-log/filters   -> { users, entities, actions } for the filter dropdowns
export const filters = asyncHandler(async (req, res) => {
  res.json(await service.listAuditFilters());
});

// GET   /api/audit-log/:id       -> one entry with full details
export const getOne = asyncHandler(async (req, res) => {
  res.json(await service.getAuditLog(req.params.id));
});

// POST  /api/audit-log/export    body { rowCount } -> records that the history was exported
export const exportLog = asyncHandler(async (req, res) => {
  res.status(201).json(await service.recordExport(req.body, req.user, req.ip));
});
