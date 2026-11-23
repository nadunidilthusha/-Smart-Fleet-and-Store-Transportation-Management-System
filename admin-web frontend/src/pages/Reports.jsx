import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Flag,
  Gauge,
  Package,
  Printer,
  Route,
  Search,
  X,
} from "lucide-react";
import { getReportData } from "../api/reportApi";
import { downloadCsv } from "../utils/exportCsv";
import { formatNumber, formatShortDateTime } from "../utils/formatters";

const CARD = "min-w-0 rounded-xl border border-line bg-white";
const TH = "whitespace-nowrap bg-slate-50 px-4 py-2.5 text-left text-[13px] font-medium text-mute";
const TD = "whitespace-nowrap border-t border-line px-4 py-3 text-sm";
const FIELD =
  "h-9 rounded-md border border-line bg-slate-50 px-3 text-[13px] outline-none placeholder:text-mute focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20";

const PAGE_SIZE = 10;
const LATE_MINS = 15;

const PRESETS = [
  ["today", "Today"],
  ["7d", "7 days"],
  ["30d", "30 days"],
  ["month", "This month"],
  ["all", "All"],
];

const BOOKING_STATUSES = ["Pending", "Approved", "Scheduled", "In Transit", "Completed", "Delayed", "Cancelled"];

// Colour for each status pill
const STATUS_TONE = {
  Pending: "bg-slate-100 text-slate-600",
  Approved: "bg-blue-50 text-blue-700",
  Planned: "bg-blue-50 text-blue-700",
  Scheduled: "bg-violet-50 text-violet-700",
  "In Transit": "bg-violet-50 text-violet-700",
  "In Progress": "bg-violet-50 text-violet-700",
  Completed: "bg-green-50 text-green-700",
  Delayed: "bg-amber-50 text-amber-700",
  Cancelled: "bg-red-50 text-red-700",
};

// Series shown in the trips per day chart
const SERIES = [
  { key: "Completed", label: "Completed", color: "#16a34a", match: (s) => s === "Completed" },
  { key: "Active", label: "Planned / in progress", color: "#a855f7", match: (s) => s === "Planned" || s === "In Progress" },
  { key: "Delayed", label: "Delayed", color: "#d97706", match: (s) => s === "Delayed" },
  { key: "Cancelled", label: "Cancelled", color: "#94a3b8", match: (s) => s === "Cancelled" },
];

// yyyy-mm-dd in local time, used by the date inputs
const dayKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Returns the [from, to] date strings for a quick range chip
function presetRange(key) {
  const now = new Date();
  if (key === "all") return ["", ""];
  const from = new Date(now);
  if (key === "7d") from.setDate(from.getDate() - 7);
  if (key === "30d") from.setDate(from.getDate() - 30);
  if (key === "month") from.setDate(1);
  return [dayKey(from), dayKey(now)];
}

// 25 Oct 2026
const fmtDay = (v) => new Date(`${v}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

// Count items by a key, biggest first
function countBy(list, fn) {
  const map = {};
  list.forEach((x) => {
    const k = fn(x);
    map[k] = (map[k] || 0) + 1;
  });
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

// Coloured pill for a booking or trip status
function StatusTag({ status }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_TONE[status] ?? STATUS_TONE.Pending}`}>
      {status}
    </span>
  );
}

// Small pill used for load percentages and on-time flags
function Pill({ tone, children }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}>{children}</span>;
}

// Defines the five reports: rows, searchable text, columns and the side breakdown
function makeReports({ stores, vehicles }) {
  const storeName = (id) => stores.find((s) => s.id === id)?.name ?? id;
  const storeShort = (id) => stores.find((s) => s.id === id)?.short ?? id;
  const reg = (id) => vehicles.find((v) => v.id === id)?.reg ?? "";
  const route = (t) => t.stops.map(storeShort).join(" → ");
  const duration = (m) => `${Math.floor(m / 60)}h ${m % 60}m`;
  const mono = (v) => <span className="tabular-nums">{v}</span>;

  return {
    bookings: {
      label: "Bookings",
      title: "Booking register",
      statusFilter: true,
      rows: (d) => d.bookings,
      search: (b) => [b.id, storeName(b.from), storeName(b.to), b.item, b.status, b.tripId].join(" "),
      columns: [
        { key: "id", label: "Booking", sortable: true, render: (b) => <span className="font-medium tabular-nums">{b.id}</span> },
        { key: "date", label: "Requested for", sortable: true, render: (b) => mono(formatShortDateTime(b.date)), csv: (b) => formatShortDateTime(b.date) },
        { key: "from", label: "From", sortable: true, render: (b) => storeShort(b.from), csv: (b) => storeName(b.from) },
        { key: "to", label: "To", sortable: true, render: (b) => storeShort(b.to), csv: (b) => storeName(b.to) },
        { key: "item", label: "Item" },
        { key: "qty", label: "Qty", sortable: true, align: "right", render: (b) => mono(formatNumber(b.qty)), csv: (b) => b.qty },
        { key: "status", label: "Status", sortable: true, render: (b) => <StatusTag status={b.status} />, csv: (b) => b.status },
        { key: "vehicleId", label: "Vehicle", render: (b) => reg(b.vehicleId) || <span className="text-mute">Unallocated</span>, csv: (b) => reg(b.vehicleId) },
        { key: "tripId", label: "Trip", render: (b) => (b.tripId ? mono(b.tripId) : "–"), csv: (b) => b.tripId ?? "" },
      ],
      side: (d) => ({ title: "Bookings by status", sub: `${d.bookings.length} bookings in range`, items: countBy(d.bookings, (b) => b.status) }),
    },

    vehicles: {
      label: "Vehicle usage",
      title: "Vehicle utilisation",
      rows: (d) =>
        d.vehicles.map((v) => {
          const ts = d.trips.filter((t) => t.vehicleId === v.id && t.status !== "Cancelled");
          const qty = ts.reduce((s, t) => s + t.qty, 0);
          return {
            id: v.id,
            reg: v.reg,
            type: v.type,
            capacity: v.capacity,
            trips: ts.length,
            completed: ts.filter((t) => t.status === "Completed").length,
            delayed: ts.filter((t) => t.delayMins >= LATE_MINS).length,
            qty,
            km: ts.reduce((s, t) => s + t.distanceKm, 0),
            util: ts.length ? Math.round((qty / (ts.length * v.capacity)) * 100) : 0,
          };
        }),
      search: (v) => `${v.reg} ${v.type}`,
      columns: [
        { key: "reg", label: "Vehicle", sortable: true, render: (v) => <b>{v.reg}</b>, csv: (v) => v.reg },
        { key: "type", label: "Type", sortable: true },
        { key: "capacity", label: "Capacity (units)", sortable: true, align: "right", render: (v) => mono(formatNumber(v.capacity)), csv: (v) => v.capacity },
        { key: "trips", label: "Trips", sortable: true, align: "right" },
        { key: "completed", label: "Completed", sortable: true, align: "right" },
        { key: "delayed", label: "Delayed", sortable: true, align: "right" },
        { key: "qty", label: "Units moved", sortable: true, align: "right", render: (v) => mono(formatNumber(v.qty)), csv: (v) => v.qty },
        { key: "km", label: "Distance (km)", sortable: true, align: "right", render: (v) => mono(formatNumber(v.km)), csv: (v) => v.km },
        {
          key: "util",
          label: "Avg load",
          sortable: true,
          align: "right",
          render: (v) => <Pill tone={v.util >= 70 ? "bg-green-50 text-green-700" : v.util >= 45 ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}>{v.util}%</Pill>,
          csv: (v) => `${v.util}%`,
        },
      ],
      side: (d, rows) => ({
        title: "Average load by vehicle",
        sub: "Units carried ÷ capacity, per trip",
        items: rows.map((v) => [v.reg, v.util]).sort((a, b) => b[1] - a[1]),
        max: 100,
        suffix: "%",
      }),
    },

    delays: {
      label: "Delays",
      title: `Delayed trips (${LATE_MINS}+ min late)`,
      rows: (d) => d.trips.filter((t) => t.delayMins >= LATE_MINS),
      search: (t) => [t.id, reg(t.vehicleId), t.driver, t.delayReason, route(t)].join(" "),
      columns: [
        { key: "id", label: "Trip", sortable: true, render: (t) => <span className="font-medium tabular-nums">{t.id}</span> },
        { key: "date", label: "Scheduled", sortable: true, render: (t) => mono(formatShortDateTime(t.date)), csv: (t) => formatShortDateTime(t.date) },
        { key: "vehicleId", label: "Vehicle", render: (t) => reg(t.vehicleId), csv: (t) => reg(t.vehicleId) },
        { key: "driver", label: "Driver" },
        { key: "route", label: "Route", render: route, csv: route },
        {
          key: "delayMins",
          label: "Delay",
          sortable: true,
          align: "right",
          render: (t) => <b className={`tabular-nums ${t.delayMins >= 60 ? "text-bad" : "text-warn"}`}>{t.delayMins} min</b>,
          csv: (t) => t.delayMins,
        },
        { key: "delayReason", label: "Reason", sortable: true },
        { key: "status", label: "Status", render: (t) => <StatusTag status={t.status} />, csv: (t) => t.status },
      ],
      side: (d, rows) => ({
        title: "Delays by reason",
        sub: `${rows.length} delayed trips · avg ${rows.length ? Math.round(rows.reduce((s, t) => s + t.delayMins, 0) / rows.length) : 0} min`,
        items: countBy(rows, (t) => t.delayReason),
      }),
    },

    completed: {
      label: "Completed trips",
      title: "Completed trips",
      rows: (d) => d.trips.filter((t) => t.status === "Completed"),
      search: (t) => [t.id, reg(t.vehicleId), t.driver, route(t)].join(" "),
      columns: [
        { key: "id", label: "Trip", sortable: true, render: (t) => <span className="font-medium tabular-nums">{t.id}</span> },
        { key: "date", label: "Date", sortable: true, render: (t) => mono(formatShortDateTime(t.date)), csv: (t) => formatShortDateTime(t.date) },
        { key: "vehicleId", label: "Vehicle", render: (t) => reg(t.vehicleId), csv: (t) => reg(t.vehicleId) },
        { key: "driver", label: "Driver" },
        { key: "stops", label: "Stops", render: (t) => <>{route(t)} <span className="text-mute">({t.stops.length})</span></>, csv: route },
        { key: "qty", label: "Units", sortable: true, align: "right", render: (t) => mono(formatNumber(t.qty)), csv: (t) => t.qty },
        { key: "distanceKm", label: "Km", sortable: true, align: "right" },
        { key: "durationMin", label: "Duration", sortable: true, align: "right", render: (t) => duration(t.durationMin), csv: (t) => t.durationMin },
        {
          key: "onTime",
          label: "Arrival",
          render: (t) => (t.delayMins >= LATE_MINS ? <StatusTag status="Delayed" /> : <Pill tone="bg-green-50 text-green-700">On time</Pill>),
          csv: (t) => (t.delayMins >= LATE_MINS ? "Late" : "On time"),
          sortValue: (t) => t.delayMins,
        },
      ],
      side: (d, rows) => ({
        title: "Completed trips by vehicle",
        sub: `${pct(rows.filter((t) => t.delayMins < LATE_MINS).length, rows.length)}% arrived on time`,
        items: countBy(rows, (t) => reg(t.vehicleId)),
      }),
    },

    stores: {
      label: "Store activity",
      title: "Store activity summary",
      rows: (d) =>
        d.stores.map((s) => {
          const out = d.bookings.filter((b) => b.from === s.id);
          const inn = d.bookings.filter((b) => b.to === s.id);
          const visits = d.trips.filter((t) => t.stops.includes(s.id) && t.status !== "Cancelled");
          return {
            id: s.id,
            name: s.name,
            outB: out.length,
            inB: inn.length,
            outQ: out.reduce((a, b) => a + b.qty, 0),
            inQ: inn.reduce((a, b) => a + b.qty, 0),
            visits: visits.length,
            delayed: visits.filter((t) => t.delayMins >= LATE_MINS).length,
            cancelled: out.filter((b) => b.status === "Cancelled").length,
          };
        }),
      search: (s) => s.name,
      columns: [
        { key: "name", label: "Store", sortable: true, render: (s) => <b>{s.name}</b>, csv: (s) => s.name },
        { key: "outB", label: "Outbound bookings", sortable: true, align: "right" },
        { key: "inB", label: "Inbound bookings", sortable: true, align: "right" },
        { key: "outQ", label: "Units dispatched", sortable: true, align: "right", render: (s) => mono(formatNumber(s.outQ)), csv: (s) => s.outQ },
        { key: "inQ", label: "Units received", sortable: true, align: "right", render: (s) => mono(formatNumber(s.inQ)), csv: (s) => s.inQ },
        { key: "visits", label: "Vehicle visits", sortable: true, align: "right" },
        { key: "delayed", label: "Delayed visits", sortable: true, align: "right" },
        { key: "cancelled", label: "Cancelled", sortable: true, align: "right" },
      ],
      side: (d, rows) => ({ title: "Vehicle visits by store", sub: "Loading + unloading stops", items: rows.map((s) => [s.name, s.visits]) }),
    },
  };
}

// One summary tile above the tabs
function Kpi({ icon: Icon, tone, label, value, foot, footClass = "text-mute" }) {
  return (
    <div className={`${CARD} p-4`}>
      <div className="flex items-center gap-2 text-[13px] text-mute">
        <span className={`grid h-7 w-7 place-items-center rounded-lg ${tone}`}>
          <Icon size={15} strokeWidth={1.8} />
        </span>
        {label}
      </div>
      <p className="mt-2 text-[26px] font-semibold leading-tight tracking-tight tabular-nums">{value}</p>
      <p className={`mt-0.5 text-[13px] ${footClass}`}>{foot}</p>
    </div>
  );
}

// Stacked bar chart of trips per day, drawn with plain divs (no chart library)
function TripsChart({ trips, from, to }) {
  const [hover, setHover] = useState(null);

  // One bucket per day across the selected range
  const { days, yMax, step } = useMemo(() => {
    const times = trips.map((t) => new Date(t.date).getTime());
    const start = from ? new Date(`${from}T00:00:00`) : new Date(times.length ? Math.min(...times) : Date.now());
    const end = to ? new Date(`${to}T00:00:00`) : new Date(times.length ? Math.max(...times) : Date.now());
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const byDay = {};
    trips.forEach((t) => {
      const k = dayKey(new Date(t.date));
      (byDay[k] ||= []).push(t);
    });

    const list = [];
    for (let d = new Date(start); d <= end && list.length < 400; d.setDate(d.getDate() + 1)) {
      const k = dayKey(d);
      const ts = byDay[k] ?? [];
      const bucket = { day: k, total: ts.length };
      SERIES.forEach((s) => {
        bucket[s.key] = ts.filter((t) => s.match(t.status)).length;
      });
      list.push(bucket);
    }

    const max = Math.max(4, ...list.map((b) => b.total));
    const stepSize = Math.ceil(max / 4);
    return { days: list, yMax: stepSize * 4, step: stepSize };
  }, [trips, from, to]);

  const PLOT = 210;
  const every = Math.ceil(days.length / 8);
  const shortDay = (k) => new Date(`${k}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  const hit = hover !== null ? days[hover] : null;

  return (
    <div className="relative pl-9">
      <div className="relative" style={{ height: PLOT }}>
        {/* Grid lines and y axis labels */}
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="absolute inset-x-0 border-t border-slate-100" style={{ bottom: (i / 4) * PLOT }}>
            <span className="absolute -left-9 w-7 -translate-y-1/2 text-right text-[11px] text-mute">{i * step}</span>
          </div>
        ))}

        {/* One column per day */}
        <div className="absolute inset-0 flex" onMouseLeave={() => setHover(null)}>
          {days.map((b, i) => (
            <div
              key={b.day}
              onMouseEnter={() => setHover(i)}
              className={`flex h-full flex-1 flex-col items-center justify-end ${hover === i ? "bg-slate-50" : ""}`}
            >
              <div className="flex w-[62%] max-w-6.5 flex-col-reverse gap-0.5">
                {SERIES.filter((s) => b[s.key] > 0).map((s) => (
                  <div key={s.key} style={{ height: (b[s.key] / yMax) * PLOT, background: s.color }} className="first:rounded-b-none last:rounded-t" />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Tooltip for the hovered day */}
        {hit && (
          <div
            className="pointer-events-none absolute top-0 z-10 min-w-42.5 -translate-x-1/2 rounded-lg border border-line bg-white p-3 text-xs shadow-lg"
            style={{ left: `${Math.min(86, Math.max(14, ((hover + 0.5) / days.length) * 100))}%` }}
          >
            <p className="mb-1.5 font-semibold">
              {new Date(`${hit.day}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" })} · {hit.total} trip{hit.total === 1 ? "" : "s"}
            </p>
            {SERIES.map((s) => (
              <p key={s.key} className="mt-1 flex items-center gap-2">
                <i className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
                <span className="text-mute">{s.label}</span>
                <b className="ml-auto tabular-nums">{hit[s.key]}</b>
              </p>
            ))}
          </div>
        )}
      </div>

      {/* x axis labels, a few at a time so they do not overlap */}
      <div className="flex h-6 pt-1.5">
        {days.map((b, i) => (
          <div key={b.day} className="relative flex-1">
            {i % every === 0 && (
              <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] text-mute">{shortDay(b.day)}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Reports() {
  const [params, setParams] = useSearchParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [preset, setPreset] = useState("30d");
  const [range, setRange] = useState(() => presetRange("30d"));
  const [store, setStore] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState({ key: null, dir: 1 });
  const [page, setPage] = useState(1);
  const [printAll, setPrintAll] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await getReportData());
    } catch {
      setError("We could not load the reports. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const reports = useMemo(() => (data ? makeReports(data) : null), [data]);

  // ?report=delays keeps the chosen tab in the link
  const tab = reports && reports[params.get("report")] ? params.get("report") : "bookings";
  const report = reports?.[tab];

  // Apply the shared filters to the raw trips and bookings
  const d = useMemo(() => {
    if (!data || !report) return null;
    const from = range[0] ? new Date(`${range[0]}T00:00:00`).getTime() : -Infinity;
    const to = range[1] ? new Date(`${range[1]}T23:59:59.999`).getTime() : Infinity;
    const inRange = (iso) => {
      const t = new Date(iso).getTime();
      return t >= from && t <= to;
    };
    const st = report.statusFilter ? status : "";
    return {
      trips: data.trips.filter((t) => inRange(t.date) && (!store || t.stops.includes(store)) && (!vehicle || t.vehicleId === vehicle)),
      bookings: data.bookings.filter(
        (b) => inRange(b.date) && (!store || b.from === store || b.to === store) && (!vehicle || b.vehicleId === vehicle) && (!st || b.status === st)
      ),
      vehicles: data.vehicles.filter((v) => !vehicle || v.id === vehicle),
      stores: data.stores.filter((s) => !store || s.id === store),
    };
  }, [data, report, range, store, vehicle, status]);

  const baseRows = useMemo(() => (d && report ? report.rows(d) : []), [d, report]);

  // Search, then sort (newest first by default when the report has a date column)
  const rows = useMemo(() => {
    if (!report) return [];
    const q = query.trim().toLowerCase();
    const list = baseRows.filter((r) => !q || report.search(r).toLowerCase().includes(q));
    const active = sort.key ?? (report.columns.some((c) => c.key === "date") ? "date" : null);
    if (!active) return list;
    const dir = sort.key ? sort.dir : -1;
    const col = report.columns.find((c) => c.key === active);
    const val = (r) => {
      const v = col?.sortValue ? col.sortValue(r) : r[active];
      return typeof v === "string" ? v.toLowerCase() : v ?? "";
    };
    return [...list].sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * dir);
  }, [baseRows, report, query, sort]);

  const activeSort = sort.key ?? (report?.columns.some((c) => c.key === "date") ? "date" : null);
  const activeDir = sort.key ? sort.dir : -1;

  const pageSize = printAll ? Math.max(rows.length, 1) : PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pageCount);
  const visible = rows.slice((current - 1) * pageSize, current * pageSize);

  const side = d && report ? report.side(d, baseRows) : null;

  // Headline numbers for the selected range
  const kpi = useMemo(() => {
    if (!d || !data) return null;
    const live = d.trips.filter((t) => t.status !== "Cancelled");
    const done = d.trips.filter((t) => t.status === "Completed");
    const late = d.trips.filter((t) => t.delayMins >= LATE_MINS);
    const cap = (id) => data.vehicles.find((v) => v.id === id)?.capacity || 1;
    return {
      bookings: d.bookings.length,
      pending: d.bookings.filter((b) => b.status === "Pending").length,
      trips: d.trips.length,
      multi: d.trips.filter((t) => t.stops.length > 2).length,
      completed: done.length,
      onTime: pct(done.filter((t) => t.delayMins < LATE_MINS).length, done.length),
      delayed: late.length,
      avgLate: late.length ? Math.round(late.reduce((s, t) => s + t.delayMins, 0) / late.length) : 0,
      load: live.length ? Math.round((live.reduce((s, t) => s + t.qty / cap(t.vehicleId), 0) / live.length) * 100) : 0,
    };
  }, [d, data]);

  const rangeLabel = range[0] || range[1] ? `${range[0] ? fmtDay(range[0]) : "start"} – ${range[1] ? fmtDay(range[1]) : "today"}` : "all dates";

  // Any filter change sends the table back to page 1
  const filter = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const applyPreset = (key) => {
    setPreset(key);
    setRange(presetRange(key));
    setPage(1);
  };

  const setDate = (index, value) => {
    setPreset("");
    setRange((r) => r.map((v, i) => (i === index ? value : v)));
    setPage(1);
  };

  const clearFilters = () => {
    setStore("");
    setVehicle("");
    setStatus("");
    setQuery("");
    applyPreset("30d");
  };

  const changeTab = (key) => {
    setParams({ report: key }, { replace: true });
    setQuery("");
    setSort({ key: null, dir: 1 });
    setPage(1);
  };

  const toggleSort = (key) => setSort({ key, dir: activeSort === key ? -activeDir : 1 });

  // Download every row of the open report (not just the current page)
  const exportCsv = () => {
    const head = report.columns.map((c) => c.label);
    const lines = rows.map((r) => report.columns.map((c) => (c.csv ? c.csv(r) : r[c.key])));
    const file = `${report.label.toLowerCase().replace(/\s+/g, "-")}_report_${dayKey(new Date())}.csv`;
    downloadCsv(file, head, lines);
    setNotice(`Export ready. ${file} downloaded.`);
    setTimeout(() => setNotice(""), 4000);
  };

  // Show every row, open the print dialog, then go back to paging
  const print = () => {
    setPrintAll(true);
    setTimeout(() => {
      window.print();
      setPrintAll(false);
    }, 150);
  };

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold leading-tight tracking-tight">Transport reports</h1>
          <p className="text-sm text-mute">Bookings, vehicle usage, delays, completed trips and store activity.</p>
        </div>
        <div className="flex shrink-0 gap-2 print:hidden">
          <button
            type="button"
            onClick={print}
            disabled={!data}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-4 text-[13px] font-medium hover:bg-slate-50 disabled:opacity-60"
          >
            <Printer size={15} /> Print / PDF
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={!data || rows.length === 0}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-brand px-4 text-[13px] font-medium text-white hover:brightness-110 disabled:opacity-60"
          >
            <Download size={15} strokeWidth={2} /> Export CSV
          </button>
        </div>
      </div>

      {notice && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-4 py-2.5 text-[13px] text-ok print:hidden" role="status">
          <CheckCircle2 size={15} /> {notice}
        </div>
      )}

      {error && (
        <div className={`${CARD} p-6 text-center`}>
          <p className="text-bad">{error}</p>
          <button
            type="button"
            onClick={load}
            className="mt-3 h-8 rounded-md bg-brand px-4 text-[13px] font-medium text-white hover:brightness-110"
          >
            Try again
          </button>
        </div>
      )}

      {!error && loading && !data && <p className="py-10 text-center text-mute">Loading reports…</p>}

      {!error && data && d && kpi && report && (
        <>
          <section className={`${CARD} mb-4 flex flex-wrap items-center gap-3 px-4 py-3 print:hidden`}>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyPreset(key)}
                  aria-pressed={preset === key}
                  className={`h-8 rounded-full border px-3 text-[13px] ${
                    preset === key ? "border-brand bg-blue-50 font-medium text-brand" : "border-line text-mute hover:bg-slate-50 hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-[13px] text-mute">
              <input type="date" value={range[0]} onChange={(e) => setDate(0, e.target.value)} aria-label="From date" className={FIELD} />
              to
              <input type="date" value={range[1]} onChange={(e) => setDate(1, e.target.value)} aria-label="To date" className={FIELD} />
            </div>
            <select value={store} onChange={(e) => filter(setStore)(e.target.value)} aria-label="Filter by store" className={FIELD}>
              <option value="">All stores</option>
              {data.stores.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <select value={vehicle} onChange={(e) => filter(setVehicle)(e.target.value)} aria-label="Filter by vehicle" className={FIELD}>
              <option value="">All vehicles</option>
              {data.vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.reg} · {v.type}</option>
              ))}
            </select>
            {report.statusFilter && (
              <select value={status} onChange={(e) => filter(setStatus)(e.target.value)} aria-label="Filter by booking status" className={FIELD}>
                <option value="">All statuses</option>
                {BOOKING_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-[13px] font-medium text-brand hover:underline"
            >
              <X size={14} /> Clear filters
            </button>
          </section>

          <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-5">
            <Kpi icon={Package} tone="bg-blue-50 text-blue-600" label="Bookings" value={kpi.bookings} foot={`${kpi.pending} pending approval`} />
            <Kpi icon={Route} tone="bg-violet-50 text-violet-600" label="Trips" value={kpi.trips} foot={`${kpi.multi} multi-stop`} />
            <Kpi icon={Flag} tone="bg-green-50 text-green-600" label="Completed" value={kpi.completed} foot={`${kpi.onTime}% on time`} />
            <Kpi
              icon={AlertCircle}
              tone="bg-amber-50 text-amber-600"
              label="Delayed"
              value={kpi.delayed}
              foot={kpi.delayed ? `avg ${kpi.avgLate} min late` : "No delays"}
              footClass={kpi.delayed ? "text-warn" : "text-ok"}
            />
            <Kpi icon={Gauge} tone="bg-blue-50 text-blue-600" label="Avg vehicle load" value={`${kpi.load}%`} foot="of quantity capacity" />
          </div>

          <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 print:hidden" role="tablist">
            {Object.entries(reports).map(([key, r]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => changeTab(key)}
                className={`h-8 whitespace-nowrap rounded-lg px-4 text-[13px] ${
                  tab === key ? "bg-white font-medium text-ink shadow-sm" : "text-mute hover:text-ink"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="mb-4 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <section className={CARD}>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-3.5">
                <div>
                  <h3 className="text-[15px] font-semibold">Trips per day</h3>
                  <p className="text-[13px] text-mute">
                    {d.trips.length} trips · {rangeLabel}
                  </p>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-mute">
                  {SERIES.map((s) => (
                    <span key={s.key} className="inline-flex items-center gap-1.5">
                      <i className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
                      {s.label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="px-5 pb-3 pt-5">
                <TripsChart trips={d.trips} from={range[0]} to={range[1]} />
              </div>
            </section>

            <section className={CARD}>
              <div className="border-b border-line px-5 py-3.5">
                <h3 className="text-[15px] font-semibold">{side.title}</h3>
                <p className="text-[13px] text-mute">{side.sub}</p>
              </div>
              <div className="max-h-77.5 space-y-3 overflow-y-auto px-5 py-4">
                {side.items.length === 0 && <p className="py-8 text-center text-sm text-mute">No data in this range</p>}
                {side.items.map(([label, value]) => {
                  const max = side.max || Math.max(1, ...side.items.map((i) => i[1]));
                  return (
                    <div key={label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto] items-center gap-3 text-sm">
                      <span className="truncate" title={label}>{label}</span>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-brand" style={{ width: `${(value / max) * 100}%` }} />
                      </div>
                      <span className="min-w-8 text-right tabular-nums">{value}{side.suffix}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <section className={CARD}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
              <div>
                <h3 className="text-[15px] font-semibold">{report.title}</h3>
                <p className="text-[13px] text-mute">
                  {rows.length} row{rows.length === 1 ? "" : "s"} · {rangeLabel}
                </p>
              </div>
              <div className="relative w-70 max-w-full print:hidden">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => filter(setQuery)(e.target.value)}
                  placeholder="Search this report…"
                  aria-label="Search report"
                  className={`${FIELD} w-full pl-9`}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-205 border-collapse">
                <thead>
                  <tr>
                    {report.columns.map((c) => {
                      const on = activeSort === c.key;
                      const SortIcon = on ? (activeDir === 1 ? ArrowUp : ArrowDown) : ArrowUpDown;
                      return (
                        <th
                          key={c.key}
                          className={`${TH} ${c.align === "right" ? "text-right" : ""}`}
                          aria-sort={on ? (activeDir === 1 ? "ascending" : "descending") : undefined}
                        >
                          {c.sortable ? (
                            <button
                              type="button"
                              onClick={() => toggleSort(c.key)}
                              className={`inline-flex items-center gap-1 hover:text-ink ${on ? "text-ink" : ""}`}
                            >
                              {c.label} <SortIcon size={12} className="print:hidden" />
                            </button>
                          ) : (
                            c.label
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      {report.columns.map((c) => (
                        <td key={c.key} className={`${TD} ${c.align === "right" ? "text-right tabular-nums" : ""}`}>
                          {c.render ? c.render(r) : r[c.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={report.columns.length} className="px-4 py-10 text-center text-sm text-mute">
                        No data matches these filters. Widen the date range or clear the search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-line px-4 py-3 text-[13px] text-mute print:hidden">
              <span>
                Showing {rows.length === 0 ? 0 : (current - 1) * pageSize + 1}–{Math.min(current * pageSize, rows.length)} of {rows.length} rows
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage(current - 1)}
                  disabled={current === 1}
                  aria-label="Previous page"
                  className="grid h-8 w-8 place-items-center rounded-md border border-line hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronLeft size={15} />
                </button>
                <span className="tabular-nums">Page {current} of {pageCount}</span>
                <button
                  type="button"
                  onClick={() => setPage(current + 1)}
                  disabled={current === pageCount}
                  aria-label="Next page"
                  className="grid h-8 w-8 place-items-center rounded-md border border-line hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
