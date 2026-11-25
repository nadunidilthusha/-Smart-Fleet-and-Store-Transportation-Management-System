// Small helpers shared by the report builders in reports.service.js (dates, per-day chart data, paging).

export const DELAYED_AFTER_MINUTES = 15; // same rule as the Dashboard: a trip is late after 15 minutes
export const MAX_CHART_DAYS = 400;

export const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Case-insensitive "contains" expression for the search box
export const textMatch = (q) => new RegExp(escapeRegex(q), "i");

// { field: { $gte, $lte } } for the selected date range (empty when no range is chosen)
export function dateFilter(field, { from, to }) {
  if (!from && !to) return {};
  const range = {};
  if (from) range.$gte = new Date(from);
  if (to) range.$lte = new Date(to);
  return { [field]: range };
}

// Browser offset in minutes (getTimezoneOffset) -> "+05:30", so days are cut at the user's midnight
export function timezoneName(offsetMinutes = 0) {
  const total = -offsetMinutes;
  const abs = Math.abs(total);
  return `${total >= 0 ? "+" : "-"}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

// Mongo expression for the number at the first position of a $lookup result (0 when empty)
export const firstOr0 = (path) => ({ $ifNull: [{ $arrayElemAt: [path, 0] }, 0] });

// Sort + paging stages; _id keeps the order stable when many rows share the same value
export function pageStages({ sortField, dir, page, limit }) {
  return [{ $sort: { [sortField]: dir === "asc" ? 1 : -1, _id: -1 } }, { $skip: (page - 1) * limit }, { $limit: limit }];
}

// $group stage that counts (or sums `value`) per day and per chart series
//   series: [{ key, label, color, values: [field values that belong to this series] }]
export function trendGroup({ dateField, groupField, series, timezone, value = 1 }) {
  const branches = series.map((s) => ({ case: { $in: [`$${groupField}`, s.values] }, then: s.key }));
  return {
    $group: {
      _id: {
        day: { $dateToString: { format: "%Y-%m-%d", date: `$${dateField}`, timezone } },
        key: { $switch: { branches, default: "other" } },
      },
      n: { $sum: value },
    },
  };
}

// "2026-11-05" + 1 day -> "2026-11-06"
const addDay = (key, n = 1) => {
  const d = new Date(`${key}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const dayOf = (iso, offsetMinutes) => new Date(new Date(iso).getTime() - offsetMinutes * 60000).toISOString().slice(0, 10);

// Turn the grouped rows into the chart shape the Reports page draws: one bucket per day across the range
export function buildTrend({ rows, series, from, to, tzOffset, title, sub }) {
  const counts = {};
  for (const { _id, n } of rows) (counts[_id.day] ||= {})[_id.key] = n;

  const seen = Object.keys(counts).sort();
  const start = from ? dayOf(from, tzOffset) : seen[0];
  const end = to ? dayOf(to, tzOffset) : seen[seen.length - 1];

  const days = [];
  if (start && end) {
    let first = start;
    // Very long ranges only draw the latest days
    const length = Math.round((new Date(`${end}T00:00:00.000Z`) - new Date(`${first}T00:00:00.000Z`)) / 86400000) + 1;
    if (length > MAX_CHART_DAYS) first = addDay(end, -(MAX_CHART_DAYS - 1));
    for (let day = first; day <= end; day = addDay(day)) {
      const bucket = { day, total: 0 };
      for (const s of series) {
        bucket[s.key] = counts[day]?.[s.key] ?? 0;
        bucket.total += bucket[s.key];
      }
      days.push(bucket);
    }
  }

  return { title, sub, series: series.map(({ key, label, color }) => ({ key, label, color })), days };
}

// Shape returned for every report
export function reportResult({ type, query, rows, total, kpis, breakdown, trend }) {
  return { type, rows, total, page: query.page, limit: query.limit, kpis, breakdown, trend };
}
