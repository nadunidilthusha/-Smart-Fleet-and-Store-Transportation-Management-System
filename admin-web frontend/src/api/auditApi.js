import apiClient from "./apiClient";

/*
  The Audit log always reads the real backend (MongoDB `auditlogs` collection), so history survives a refresh.
  It is read-only here: entries are written by the backend when records change or users sign in.

  GET  /audit-log          ?q &action &entity &actor &from &to &sort &dir &page &limit
                           ->  { entries, total, page, limit, summary: { events, activeUsers, dataChanges, accessChanges, failedLogins } }
       entry: { id, ts, userId, userName, role, action, entity, entityId, details, changes: [[field, before, after]], ip, request }
  GET  /audit-log/filters  ->  { users: [{ id, name, role }], entities, actions }
  GET  /audit-log/:id      ->  one entry
  POST /audit-log/export   body { rowCount }  ->  notes in the history that it was exported
*/

// Turn an Axios error into a message for the page banner
export function parseAuditError(err, fallback = "We could not load the audit history. Check your connection and try again.") {
  const data = err?.response?.data;
  if (data?.message) return data.message;
  if (err?.request && !err?.response) return "Cannot reach the server.";
  return fallback;
}

// One page of audit entries for the current filters (empty filters are not sent)
export async function getAuditLogs(filters = {}) {
  const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== "" && value != null));
  const { data } = await apiClient.get("/audit-log", { params });
  return data;
}

// Users and modules for the filter dropdowns
export async function getAuditFilters() {
  const { data } = await apiClient.get("/audit-log/filters");
  return data;
}

// Load one entry with its full details
export async function getAuditLog(id) {
  const { data } = await apiClient.get(`/audit-log/${encodeURIComponent(id)}`);
  return data;
}

// Record that the audit history itself was exported
export async function recordAuditExport(rowCount) {
  const { data } = await apiClient.post("/audit-log/export", { rowCount });
  return data;
}
