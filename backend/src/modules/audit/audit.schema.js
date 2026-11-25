import { z } from "zod";

// Request validation for the Audit log page (see admin-web src/api/auditApi.js)
const optionalText = z.string().trim().max(100).optional();
const optionalDate = z
  .string()
  .refine((value) => !Number.isNaN(new Date(value).getTime()), "Enter a valid date.")
  .optional();

// GET /api/audit-log?q=&action=&entity=&actor=&from=&to=&sort=&dir=&page=&limit=
export const listAuditSchema = z.object({
  q: optionalText, // search user, record id, description, module or IP
  action: optionalText,
  entity: optionalText,
  actor: optionalText, // user id
  from: optionalDate, // ISO date-time, start of the range
  to: optionalDate, // ISO date-time, end of the range
  sort: z.enum(["ts", "userName", "action", "entity"]).default("ts"),
  dir: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(10),
});

// POST /api/audit-log/export: the admin downloaded the history as CSV
export const exportAuditSchema = z.object({
  rowCount: z.coerce.number().int().min(0),
});
