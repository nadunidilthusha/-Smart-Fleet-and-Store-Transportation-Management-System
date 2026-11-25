import AuditLog from "./audit.model.js";
import ApiError from "../../utils/ApiError.js";
import logger from "../../utils/logger.js";

// Business logic and database access for audit lives here.
// Controllers call these functions. Keep req and res out of this file.
// Other modules write entries with record() (usually through middleware/audit.js).

// Actions grouped for the summary cards (keep in sync with admin-web src/pages/AuditLog.jsx)
const DATA_ACTIONS = ["CREATE", "UPDATE", "DELETE", "APPROVE", "REJECT", "REQUEST_CHANGES", "ASSIGN", "CANCEL"];
const ACCESS_ACTIONS = ["ROLE_CHANGE", "DEACTIVATE", "ACTIVATE"];

// Table sort keys used by the frontend -> database fields
const SORT_FIELDS = { ts: "createdAt", userName: "actorName", action: "action", entity: "entity" };

const OBJECT_ID = /^[a-f\d]{24}$/i;
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Display text for one before / after value
const show = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return Array.isArray(value) ? (value.length ? value.join(", ") : "—") : String(value);
};

// Values worth comparing: plain text, numbers, booleans and lists of those (nested objects are skipped)
const comparable = (value) =>
  value === null ||
  ["string", "number", "boolean"].includes(typeof value) ||
  (Array.isArray(value) && value.every((v) => ["string", "number", "boolean"].includes(typeof v)));

// "alertThreshold" -> "Alert threshold"
const labelOf = (key) => {
  if (key === "isDraft") return "Draft";
  const text = key.replace(/([A-Z])/g, " $1").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
};

// Field level differences between two record snapshots -> [{ field, before, after }]
export function diffChanges(before, after, { skip = ["id", "message"], max = 30 } = {}) {
  const from = before ?? {};
  const to = after ?? {};
  const changes = [];
  for (const key of new Set([...Object.keys(from), ...Object.keys(to)])) {
    if (skip.includes(key)) continue;
    if (!comparable(from[key] ?? null) || !comparable(to[key] ?? null)) continue;
    if (show(from[key]) === show(to[key])) continue;
    changes.push({ field: labelOf(key), before: show(from[key]), after: show(to[key]) });
  }
  return changes.slice(0, max);
}

// Write one audit entry. It never throws: a logging problem must not break the action being logged.
// user is the signed-in user ({ id, name, role }); pass actorName for events that have no user (failed sign-in).
export async function record({ user, actorName, action, entity, entityId, entityCode, description, changes, details, ip }) {
  try {
    await AuditLog.create({
      actor: OBJECT_ID.test(String(user?.id ?? "")) ? user.id : undefined,
      actorName: user?.name || actorName || "System",
      actorRole: user?.role,
      action,
      entity,
      entityId: OBJECT_ID.test(String(entityId ?? "")) ? entityId : undefined,
      entityCode: entityCode ? String(entityCode) : undefined,
      description,
      changes,
      details,
      ip,
    });
  } catch (err) {
    logger.warn(`Audit entry "${action} ${entity}" was not saved: ${err.message}`);
  }
}

// Map an audit document to the shape the Audit log page expects
function toEntry(doc) {
  return {
    id: String(doc._id),
    ts: doc.createdAt,
    userId: doc.actor ? String(doc.actor) : "—",
    userName: doc.actorName || "System",
    role: doc.actorRole || "",
    action: doc.action,
    entity: doc.entity,
    entityId: doc.entityCode || "–",
    details: doc.description || "",
    changes: (doc.changes ?? []).map((c) => [c.field, c.before, c.after]),
    ip: doc.ip || "",
    request: doc.details ?? null,
  };
}

// Turn the page filters into a MongoDB filter
function buildFilter({ q, action, entity, actor, from, to }) {
  const filter = {};
  if (action) filter.action = action;
  if (entity) filter.entity = entity;
  if (actor) filter.actor = OBJECT_ID.test(actor) ? actor : { $in: [] }; // an unknown user id matches nothing
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }
  if (q) {
    const text = new RegExp(escapeRegex(q), "i");
    filter.$or = ["actorName", "entityCode", "description", "entity", "action", "ip"].map((field) => ({ [field]: text }));
  }
  return filter;
}

// GET /audit-log: one page of entries plus the summary cards for the whole filtered range
export async function listAuditLogs(query) {
  const filter = buildFilter(query);
  const skip = (query.page - 1) * query.limit;
  const order = { [SORT_FIELDS[query.sort]]: query.dir === "asc" ? 1 : -1, _id: -1 };
  const inActions = (actions) => ({ $and: [filter, { action: { $in: actions } }] });

  const [docs, total, users, dataChanges, accessChanges, failedLogins] = await Promise.all([
    AuditLog.find(filter).sort(order).skip(skip).limit(query.limit).lean(),
    AuditLog.countDocuments(filter),
    AuditLog.distinct("actor", filter),
    AuditLog.countDocuments(inActions(DATA_ACTIONS)),
    AuditLog.countDocuments(inActions(ACCESS_ACTIONS)),
    AuditLog.countDocuments(inActions(["LOGIN_FAILED"])),
  ]);

  return {
    entries: docs.map(toEntry),
    total,
    page: query.page,
    limit: query.limit,
    summary: { events: total, activeUsers: users.filter(Boolean).length, dataChanges, accessChanges, failedLogins },
  };
}

// GET /audit-log/filters: the users and modules available in the filter dropdowns
export async function listAuditFilters() {
  const [users, entities, actions] = await Promise.all([
    AuditLog.aggregate([
      { $match: { actor: { $ne: null } } },
      { $sort: { createdAt: 1 } },
      { $group: { _id: "$actor", name: { $last: "$actorName" }, role: { $last: "$actorRole" } } },
      { $sort: { name: 1 } },
    ]),
    AuditLog.distinct("entity"),
    AuditLog.distinct("action"),
  ]);
  return {
    users: users.map((u) => ({ id: String(u._id), name: u.name, role: u.role || "" })),
    entities: entities.sort(),
    actions: actions.sort(),
  };
}

// GET /audit-log/:id: one entry with its full details
export async function getAuditLog(id) {
  const doc = OBJECT_ID.test(id) ? await AuditLog.findById(id).lean() : null;
  if (!doc) throw ApiError.notFound("Audit entry not found");
  return toEntry(doc);
}

// POST /audit-log/export: note in the history that the audit log itself was downloaded
export async function recordExport({ rowCount }, user, ip) {
  await record({
    user,
    action: "EXPORT",
    entity: "Report",
    entityCode: "AUDIT",
    description: `Exported audit history (${rowCount} rows, CSV)`,
    ip,
  });
  return { message: "Export recorded." };
}
