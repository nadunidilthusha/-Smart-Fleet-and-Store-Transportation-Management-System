import { z } from "zod";

// Request validation for the Reports page (see admin-web src/api/reportApi.js)
export const REPORT_KEYS = ["bookings", "trips", "vehicles", "stores", "items", "goods", "audit"];

const optionalText = z.string().trim().max(100).optional();
const optionalDate = z
  .string()
  .refine((value) => !Number.isNaN(new Date(value).getTime()), "Enter a valid date.")
  .optional();

// GET /api/reports/:type
export const reportParamsSchema = z.object({ type: z.enum(REPORT_KEYS) });

// ?from=&to=&tz=&q=&status=&store=&vehicle=&category=&sort=&dir=&page=&limit=
export const reportQuerySchema = z.object({
  from: optionalDate, // ISO date-time, start of the range
  to: optionalDate, // ISO date-time, end of the range
  tz: z.coerce.number().int().min(-840).max(840).default(0), // browser offset in minutes, so days start at the user's midnight
  q: optionalText, // search inside the report
  status: optionalText, // booking / trip / vehicle / store / item status, goods state or audit action
  store: optionalText, // store code (STR-001)
  vehicle: optionalText, // vehicle code (VH-001)
  category: optionalText, // item category, or audit module
  sort: optionalText, // column key, checked per report (an unknown key uses the default sort)
  dir: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(10),
});

// POST /api/reports/export: the admin downloaded a report as CSV
export const exportReportSchema = z.object({
  type: z.enum(REPORT_KEYS),
  rowCount: z.coerce.number().int().min(0),
});
