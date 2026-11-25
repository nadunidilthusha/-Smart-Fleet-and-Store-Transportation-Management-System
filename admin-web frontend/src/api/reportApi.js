import apiClient from "./apiClient";

/*
  Reports always read the real backend: every report is calculated from MongoDB when it is requested.

  GET  /reports/options  ->  { types: [{ key, label, title, statusLabel, statuses, categoryLabel?, categories?, search }],
                               stores: [{ code, name }], vehicles: [{ code, plate, type }] }
  GET  /reports/:type    ?from &to &tz &q &status &store &vehicle &category &sort &dir &page &limit
                         ->  { type, rows, total, page, limit,
                               kpis: [{ label, value, foot }],
                               breakdown: { title, sub, items: [[label, value]], max?, suffix? },
                               trend: { title, sub, series: [{ key, label, color }], days: [{ day, total, <series key>: n }] } }
       :type is bookings | trips | vehicles | stores | items | goods | audit
  POST /reports/export   body { type, rowCount }  ->  notes in the audit history that a report was exported
*/

// Turn an Axios error into a message for the page banner
export function parseReportError(err, fallback = "We could not load the reports. Check your connection and try again.") {
  const data = err?.response?.data;
  if (data?.message) return data.message;
  if (err?.request && !err?.response) return "Cannot reach the server.";
  return fallback;
}

// Report tabs and the values for the filter dropdowns
export async function getReportOptions() {
  const { data } = await apiClient.get("/reports/options");
  return data;
}

// One page of a report for the current filters (empty filters are not sent)
export async function getReport(type, filters = {}) {
  const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== "" && value != null));
  const { data } = await apiClient.get(`/reports/${encodeURIComponent(type)}`, { params });
  return data;
}

// Record that a report was exported (shown in the Audit log)
export async function recordReportExport(type, rowCount) {
  const { data } = await apiClient.post("/reports/export", { type, rowCount });
  return data;
}
