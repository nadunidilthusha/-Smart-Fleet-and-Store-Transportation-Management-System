import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { getReport, getReportOptions, parseReportError, recordReportExport } from "../api/reportApi";
import { downloadCsv } from "../utils/exportCsv";
import { formatNumber, formatShortDateTime } from "../utils/formatters";
import { ROLE_LABELS } from "../utils/roles";

const CARD = "min-w-0 rounded-xl border border-line bg-white";
const TH = "whitespace-nowrap bg-slate-50 px-4 py-2.5 text-left text-[13px] font-medium text-mute";
const TD = "whitespace-nowrap border-t border-line px-4 py-3 text-sm";
const FIELD =
  "h-9 rounded-md border border-line bg-slate-50 px-3 text-[13px] outline-none placeholder:text-mute focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20";

const PAGE_SIZE = 10;
const EXPORT_PAGE = 500; // largest page the API returns
const EXPORT_MAX_PAGES = 40; // stops a runaway export at 20,000 rows

const PRESETS = [
  ["today", "Today"],
  ["7d", "7 days"],
  ["30d", "30 days"],
  ["month", "This month"],
  ["all", "All"],
];

// Colour for each status pill
const STATUS_TONE = {
  Pending: "bg-slate-100 text-slate-600",
  "Changes requested": "bg-amber-50 text-amber-700",
  Approved: "bg-blue-50 text-blue-700",
  Scheduled: "bg-violet-50 text-violet-700",
  "In transit": "bg-violet-50 text-violet-700",
  Completed: "bg-green-50 text-green-700",
  Delayed: "bg-amber-50 text-amber-700",
  Unallocated: "bg-slate-100 text-slate-600",
  Rejected: "bg-red-50 text-red-700",
  Cancelled: "bg-red-50 text-red-700",
  Available: "bg-green-50 text-green-700",
  "In Use": "bg-violet-50 text-violet-700",
  Maintenance: "bg-amber-50 text-amber-700",
  Inactive: "bg-slate-100 text-slate-600",
  Active: "bg-green-50 text-green-700",
  "High Capacity": "bg-blue-50 text-blue-700",
  "In Stock": "bg-green-50 text-green-700",
  "Reorder Soon": "bg-amber-50 text-amber-700",
  "Low Stock": "bg-amber-50 text-amber-700",
  "Critical Low": "bg-red-50 text-red-700",
  Draft: "bg-amber-50 text-amber-700",
  Prepared: "bg-violet-50 text-violet-700",
  "Handed over": "bg-blue-50 text-blue-700",
  Received: "bg-green-50 text-green-700",
  Confirmed: "bg-green-50 text-green-700",
};

// One step of a goods line shown in the report drawer (qty and how it differs from the step before)
const stepQty = (s) => (s?.qty == null ? "–" : formatNumber(s.qty));
const stepDiff = (s) => {
  if (!s || s.difference == null || s.type === "none") return "–";
  const sign = s.difference > 0 ? "+" : "";
  return `${sign}${formatNumber(s.difference)} (${s.type})`;
};

// Audit actions: [label, colour] (same wording as the Audit log page)
const AUDIT_ACTIONS = {
  LOGIN: ["Sign in", "bg-blue-50 text-blue-700"],
  LOGOUT: ["Sign out", "bg-slate-100 text-slate-600"],
  LOGIN_FAILED: ["Failed sign-in", "bg-red-50 text-red-700"],
  CREATE: ["Create", "bg-green-50 text-green-700"],
  UPDATE: ["Update", "bg-violet-50 text-violet-700"],
  DELETE: ["Delete", "bg-red-50 text-red-700"],
  APPROVE: ["Approve", "bg-green-50 text-green-700"],
  REJECT: ["Reject", "bg-red-50 text-red-700"],
  REQUEST_CHANGES: ["Request changes", "bg-amber-50 text-amber-700"],
  ASSIGN: ["Assign", "bg-violet-50 text-violet-700"],
  CANCEL: ["Cancel", "bg-amber-50 text-amber-700"],
  ROLE_CHANGE: ["Role change", "bg-amber-50 text-amber-700"],
  DEACTIVATE: ["Deactivate", "bg-red-50 text-red-700"],
  ACTIVATE: ["Activate", "bg-green-50 text-green-700"],
  EXPORT: ["Export", "bg-blue-50 text-blue-700"],
};
const actionLabel = (a) => AUDIT_ACTIONS[a]?.[0] ?? String(a).replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

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

const dateTime = (v) => (v ? formatShortDateTime(v) : "–");
const mono = (v) => <span className="tabular-nums">{v}</span>;
const num = (key) => (r) => mono(formatNumber(r[key]));
const dash = (v) => (v === "" || v == null ? "–" : v);

// Coloured pill for a status
function StatusTag({ status }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_TONE[status] ?? STATUS_TONE.Pending}`}>
      {status}
    </span>
  );
}

// Small pill used for load percentages and flags
function Pill({ tone, children }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}>{children}</span>;
}

const loadTone = (v) => (v >= 70 ? "bg-green-50 text-green-700" : v >= 45 ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600");

/*
  The seven reports. The server does the searching, sorting, paging and calculating,
  so each one only describes how to show a row.
    sort: the key sent to the API (defaults to the column key); defaultSort: how the API orders it first
    filters: which of the shared store / vehicle filters apply
    detail(row): { fields: [[label, value]], tables: [{ title, head, rows }] } for the row drawer
*/
const REPORTS = {
  bookings: {
    filters: { store: true, vehicle: true },
    defaultSort: { key: "date", dir: "desc" },
    noun: (r) => `Booking ${r.id}`,
    columns: [
      { key: "id", label: "Booking", sortable: true, render: (r) => <span className="font-medium tabular-nums">{r.id}</span> },
      { key: "date", label: "Requested for", sortable: true, render: (r) => mono(dateTime(r.date)), csv: (r) => dateTime(r.date) },
      { key: "pickup", label: "From", sortable: true },
      { key: "destination", label: "To", sortable: true },
      {
        key: "items",
        label: "Items",
        render: (r) => (r.items.length ? `${r.items[0].name}${r.items.length > 1 ? ` +${r.items.length - 1}` : ""}` : "–"),
        csv: (r) => r.items.map((i) => `${i.name} x${i.quantity}`).join("; "),
      },
      { key: "units", label: "Units", sortable: true, align: "right", render: num("units"), csv: (r) => r.units },
      {
        key: "priority",
        label: "Priority",
        sortable: true,
        render: (r) => <Pill tone={r.priority === "Urgent" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"}>{r.priority}</Pill>,
      },
      { key: "status", label: "Status", sortable: true, render: (r) => <StatusTag status={r.status} /> },
      { key: "vehicle", label: "Vehicle", render: (r) => r.vehicle || <span className="text-mute">Unallocated</span>, csv: (r) => r.vehicle },
      { key: "trip", label: "Trip", sortable: true, render: (r) => dash(r.trip), csv: (r) => r.trip },
    ],
    detail: (r) => ({
      fields: [
        ["Booking", r.id],
        ["Status", r.status],
        ["Priority", r.priority],
        ["From", r.pickup],
        ["To", r.destination],
        ["Requested for", dateTime(r.date)],
        ["Submitted", dateTime(r.submittedAt)],
        ["Requested by", dash(r.requestedBy)],
        ["Vehicle", dash(r.vehicle)],
        ["Trip", dash(r.trip)],
        ["Units", formatNumber(r.units)],
        ["Notes", dash(r.notes)],
        ["Admin comment", dash(r.comment)],
      ],
      tables: [
        { title: "Items", head: ["Item", "Quantity", "Unit"], rows: r.items.map((i) => [i.name, formatNumber(i.quantity), i.unit || "–"]) },
        { title: "History", head: ["Event", "When"], rows: r.history.map((h) => [h.label, dateTime(h.at)]) },
      ],
    }),
  },

  trips: {
    filters: { store: true, vehicle: true },
    defaultSort: { key: "date", dir: "desc" },
    noun: (r) => `Trip ${r.id}`,
    columns: [
      { key: "id", label: "Trip", sortable: true, render: (r) => <span className="font-medium tabular-nums">{r.id}</span> },
      { key: "date", label: "Created", sortable: true, render: (r) => mono(dateTime(r.date)), csv: (r) => dateTime(r.date) },
      { key: "route", label: "Route", render: (r) => dash(r.route), csv: (r) => r.route },
      { key: "vehicle", label: "Vehicle", sortable: true, render: (r) => dash(r.vehicle), csv: (r) => r.vehicle },
      { key: "driver", label: "Driver", sortable: true, render: (r) => dash(r.driver), csv: (r) => r.driver },
      { key: "stops", label: "Stops", sortable: true, align: "right" },
      { key: "load", label: "Load", sortable: true, align: "right", render: (r) => <Pill tone={loadTone(r.load)}>{r.load}%</Pill>, csv: (r) => `${r.load}%` },
      {
        key: "delayMinutes",
        sort: "delay",
        label: "Delay",
        sortable: true,
        align: "right",
        render: (r) => (r.delayMinutes ? <b className={`tabular-nums ${r.late ? "text-warn" : ""}`}>{r.delayMinutes} min</b> : <span className="text-mute">–</span>),
        csv: (r) => r.delayMinutes,
      },
      { key: "status", label: "Status", sortable: true, render: (r) => <StatusTag status={r.status} /> },
      {
        key: "late",
        label: "Arrival",
        render: (r) => (r.late ? <StatusTag status="Delayed" /> : <Pill tone="bg-green-50 text-green-700">On time</Pill>),
        csv: (r) => (r.late ? "Late" : "On time"),
      },
    ],
    detail: (r) => ({
      fields: [
        ["Trip", r.id],
        ["Status", r.status],
        ["Created", dateTime(r.date)],
        ["Route", dash(r.route)],
        ["Vehicle", dash(r.vehicle)],
        ["Driver", dash(r.driver)],
        ["Stops", r.stops],
        ["Bookings", r.bookings],
        ["Load", `${r.load}%`],
        ["Delay", r.delayMinutes ? `${r.delayMinutes} min` : "None"],
        ["Next stop", dash(r.nextStop)],
        ["Waybill", dash(r.waybill)],
      ],
    }),
  },

  vehicles: {
    filters: { store: true, vehicle: true },
    defaultSort: { key: "id", dir: "asc" },
    noun: (r) => `Vehicle ${r.id}`,
    columns: [
      { key: "id", sort: "code", label: "Vehicle", sortable: true, render: (r) => <span className="font-medium tabular-nums">{r.id}</span> },
      { key: "plate", label: "Plate", sortable: true, render: (r) => <b>{r.plate}</b>, csv: (r) => r.plate },
      { key: "type", label: "Type", sortable: true },
      { key: "driver", label: "Driver", sortable: true, render: (r) => dash(r.driver), csv: (r) => r.driver },
      { key: "hub", label: "Hub", sortable: true, render: (r) => dash(r.hub), csv: (r) => r.hub },
      { key: "status", label: "Status", sortable: true, render: (r) => <StatusTag status={r.status} /> },
      { key: "fuel", label: "Fuel", sortable: true, align: "right", render: (r) => `${r.fuel}%`, csv: (r) => `${r.fuel}%` },
      { key: "trips", label: "Trips", sortable: true, align: "right" },
      { key: "completed", label: "Completed", sortable: true, align: "right" },
      { key: "delayed", label: "Delayed", align: "right" },
      { key: "util", label: "Avg load", sortable: true, align: "right", render: (r) => <Pill tone={loadTone(r.util)}>{r.util}%</Pill>, csv: (r) => `${r.util}%` },
    ],
    detail: (r) => ({
      fields: [
        ["Vehicle", r.id],
        ["Plate", r.plate],
        ["Type", r.type],
        ["Model", dash(r.model)],
        ["Status", r.status],
        ["Driver", dash(r.driver)],
        ["Hub", dash(r.hub)],
        ["Fuel", `${r.fuel}%`],
        ["Mileage", dash(r.mileage)],
        ["Capacity", dash(r.capacity)],
        ["Trips in range", r.trips],
        ["Completed", r.completed],
        ["Active", r.active],
        ["Delayed", r.delayed],
        ["Average load", `${r.util}%`],
        ["Last trip", dateTime(r.lastTrip)],
      ],
    }),
  },

  stores: {
    filters: { store: true },
    defaultSort: { key: "id", dir: "asc" },
    noun: (r) => `Store ${r.id}`,
    columns: [
      { key: "id", sort: "code", label: "Store", sortable: true, render: (r) => <span className="font-medium tabular-nums">{r.id}</span> },
      { key: "name", label: "Name", sortable: true, render: (r) => <b>{r.name}</b>, csv: (r) => r.name },
      { key: "type", label: "Type", sortable: true, render: (r) => dash(r.type), csv: (r) => r.type },
      { key: "district", label: "District", sortable: true, render: (r) => dash(r.district), csv: (r) => r.district },
      { key: "status", label: "Status", sortable: true, render: (r) => <StatusTag status={r.status} /> },
      { key: "util", label: "Utilisation", sortable: true, align: "right", render: (r) => <Pill tone={loadTone(r.util)}>{r.util}%</Pill>, csv: (r) => `${r.util}%` },
      { key: "vehicles", label: "Vehicles", sortable: true, align: "right" },
      { key: "items", label: "Items", sortable: true, align: "right", render: (r) => (r.lowItems ? <>{r.items} <span className="text-warn">({r.lowItems} low)</span></> : r.items), csv: (r) => r.items },
      { key: "outB", label: "Outbound bookings", sortable: true, align: "right" },
      { key: "inB", label: "Inbound bookings", sortable: true, align: "right" },
      { key: "visits", label: "Vehicle visits", sortable: true, align: "right" },
      { key: "delayed", label: "Delayed visits", sortable: true, align: "right" },
    ],
    detail: (r) => ({
      fields: [
        ["Store", r.id],
        ["Name", r.name],
        ["Type", dash(r.type)],
        ["District", dash(r.district)],
        ["Status", r.status],
        ["Manager", dash(r.manager)],
        ["Phone", dash(r.phone)],
        ["Capacity (m³)", formatNumber(r.capacity)],
        ["Used (m³)", formatNumber(r.used)],
        ["Utilisation", `${r.util}%`],
        ["Vehicles based here", r.vehicles],
        ["Items stored", `${r.items} (${r.lowItems} low)`],
        ["Outbound bookings", `${r.outB} (${formatNumber(r.outUnits)} units)`],
        ["Inbound bookings", `${r.inB} (${formatNumber(r.inUnits)} units)`],
        ["Vehicle visits", `${r.visits} (${r.delayed} delayed)`],
      ],
    }),
  },

  items: {
    filters: { store: true },
    defaultSort: { key: "id", dir: "asc" },
    noun: (r) => `Item ${r.id}`,
    columns: [
      { key: "id", sort: "code", label: "Item", sortable: true, render: (r) => <span className="font-medium tabular-nums">{r.id}</span> },
      { key: "name", label: "Name", sortable: true, render: (r) => <b>{r.name}</b>, csv: (r) => r.name },
      { key: "category", label: "Category", sortable: true },
      { key: "store", label: "Store", sortable: true, render: (r) => dash(r.store), csv: (r) => r.store },
      {
        key: "stock",
        label: "Stock on hand",
        sortable: true,
        align: "right",
        render: (r) => <span className={r.belowReorder ? "font-medium text-bad" : ""}>{formatNumber(r.stock)} {r.stockUnit}</span>,
        csv: (r) => `${r.stock} ${r.stockUnit}`.trim(),
      },
      { key: "reorder", label: "Reorder level", sortable: true, align: "right", render: num("reorder"), csv: (r) => r.reorder },
      { key: "status", label: "Stock status", sortable: true, render: (r) => <StatusTag status={r.status} /> },
      { key: "moved", label: "Units moved", sortable: true, align: "right", render: num("moved"), csv: (r) => r.moved },
      { key: "movedBookings", label: "Bookings", align: "right" },
    ],
    detail: (r) => ({
      fields: [
        ["Item", r.id],
        ["Name", r.name],
        ["Category", r.category],
        ["Store", dash(r.store)],
        ["Stock status", r.status],
        ["Stock on hand", `${formatNumber(r.stock)} ${r.stockUnit}`.trim()],
        ["Reorder level", formatNumber(r.reorder)],
        ["Below reorder level", r.belowReorder ? "Yes" : "No"],
        ["Unit", dash(r.unit)],
        ["Weight (kg)", dash(r.weightKg)],
        ["Volume (m³)", dash(r.volumeM3)],
        ["Units moved in range", formatNumber(r.moved)],
        ["Units completed", formatNumber(r.movedCompleted)],
        ["Bookings", r.movedBookings],
      ],
    }),
  },

  goods: {
    filters: { store: true, vehicle: true },
    defaultSort: { key: "date", dir: "desc" },
    noun: (r) => `Goods confirmation${r.booking ? ` · ${r.booking}` : ""}`,
    columns: [
      { key: "date", label: "Created", sortable: true, render: (r) => mono(dateTime(r.date)), csv: (r) => dateTime(r.date) },
      { key: "booking", label: "Booking", sortable: true, render: (r) => <span className="font-medium tabular-nums">{dash(r.booking)}</span>, csv: (r) => r.booking },
      { key: "trip", label: "Trip", sortable: true, render: (r) => dash(r.trip), csv: (r) => r.trip },
      { key: "pickup", label: "Sending store", sortable: true, render: (r) => dash(r.pickup), csv: (r) => r.pickup },
      { key: "store", label: "Receiving store", sortable: true, render: (r) => dash(r.store), csv: (r) => r.store },
      { key: "status", label: "State", sortable: true, render: (r) => <StatusTag status={r.status} /> },
      { key: "expected", label: "Expected", sortable: true, align: "right", render: num("expected"), csv: (r) => r.expected },
      { key: "prepared", label: "Prepared", sortable: true, align: "right", render: num("prepared"), csv: (r) => r.prepared },
      { key: "handedOver", label: "Handed over", sortable: true, align: "right", render: num("handedOver"), csv: (r) => r.handedOver },
      { key: "received", label: "Received", sortable: true, align: "right", render: num("received"), csv: (r) => r.received },
      {
        key: "discrepancy",
        label: "Discrepancies",
        align: "right",
        render: (r) => (
          <span className={r.discrepancy ? "font-medium text-bad" : ""}>
            {formatNumber(r.discrepancy)}
          </span>
        ),
        csv: (r) => r.discrepancy,
      },
      { key: "missing", label: "Missing", sortable: true, align: "right", render: (r) => <span className={r.missing ? "text-bad" : ""}>{formatNumber(r.missing)}</span>, csv: (r) => r.missing },
      { key: "damaged", label: "Damaged", sortable: true, align: "right", render: (r) => <span className={r.damaged ? "text-bad" : ""}>{formatNumber(r.damaged)}</span>, csv: (r) => r.damaged },
      { key: "excess", label: "Excess", sortable: true, align: "right", render: num("excess"), csv: (r) => r.excess },
      { key: "confirmedBy", label: "Received by", render: (r) => dash(r.confirmedBy), csv: (r) => r.confirmedBy },
      { key: "confirmedAt", label: "Received at", sortable: true, render: (r) => mono(dateTime(r.confirmedAt)), csv: (r) => dateTime(r.confirmedAt) },
    ],
    detail: (r) => ({
      fields: [
        ["Booking", dash(r.booking)],
        ["Trip", dash(r.trip)],
        ["Sending store", dash(r.pickup)],
        ["Receiving store", dash(r.store)],
        ["State", r.status],
        ["Created", dateTime(r.date)],
        ["Prepared", `${formatNumber(r.prepared)} · ${dash(r.preparedBy)} · ${dateTime(r.preparedAt)}`],
        ["Handed over", `${formatNumber(r.handedOver)} · ${dash(r.handoverBy)} · ${dateTime(r.handoverAt)}`],
        ["Received", `${formatNumber(r.received)} · ${dash(r.confirmedBy)} · ${dateTime(r.confirmedAt)}`],
        ["Expected", formatNumber(r.expected)],
        ["Missing", formatNumber(r.missing)],
        ["Damaged", formatNumber(r.damaged)],
        ["Excess", formatNumber(r.excess)],
        ["Incorrect", formatNumber(r.incorrect)],
        ["Total discrepancies", formatNumber(r.discrepancy)],
        ["Preparation note", dash(r.notes?.prepared)],
        ["Handover note", dash(r.notes?.handover)],
        ["Receipt note", dash(r.notes?.receipt)],
      ],
      tables: [
        {
          title: "Item quantities by step",
          head: ["Item", "Expected", "Prepared", "Handover", "Received", "Missing", "Damaged", "Excess"],
          rows: r.lines.map((l) => [
            l.item,
            formatNumber(l.expected),
            `${stepQty(l.prepared)}${l.prepared?.type && l.prepared.type !== "none" ? ` (${stepDiff(l.prepared)})` : ""}`,
            `${stepQty(l.handover)}${l.handover?.type && l.handover.type !== "none" ? ` (${stepDiff(l.handover)})` : ""}`,
            `${stepQty(l.receipt)}${l.receipt?.type && l.receipt.type !== "none" ? ` (${stepDiff(l.receipt)})` : ""}`,
            formatNumber(l.missing),
            formatNumber(l.damaged),
            formatNumber(l.excess),
          ]),
        },
        {
          title: "History",
          head: ["Action", "Stage", "By", "When", "Note"],
          rows: (r.history ?? []).map((h) => [h.action, dash(h.stage), dash(h.by), dateTime(h.at), dash(h.note)]),
        },
      ],
    }),
  },

  audit: {
    filters: {},
    defaultSort: { key: "ts", dir: "desc" },
    noun: (r) => `${actionLabel(r.action)} · ${r.entity}`,
    columns: [
      { key: "ts", label: "Timestamp", sortable: true, render: (r) => mono(dateTime(r.ts)), csv: (r) => dateTime(r.ts) },
      {
        key: "userName",
        label: "User",
        sortable: true,
        render: (r) => (
          <>
            <b>{r.userName}</b>
            {r.role && <span className="ml-1.5 text-mute">{ROLE_LABELS[r.role] ?? r.role}</span>}
          </>
        ),
        csv: (r) => r.userName,
      },
      {
        key: "action",
        label: "Action",
        sortable: true,
        render: (r) => <Pill tone={AUDIT_ACTIONS[r.action]?.[1] ?? "bg-slate-100 text-slate-600"}>{actionLabel(r.action)}</Pill>,
        csv: (r) => actionLabel(r.action),
      },
      { key: "entity", label: "Module", sortable: true },
      { key: "entityId", label: "Record" },
      { key: "details", label: "Details", render: (r) => <span className="block max-w-[320px] truncate" title={r.details}>{dash(r.details)}</span>, csv: (r) => r.details },
      { key: "ip", label: "IP address", render: (r) => dash(r.ip), csv: (r) => r.ip },
    ],
    detail: (r) => ({
      fields: [
        ["Timestamp", dateTime(r.ts)],
        ["User", r.userName],
        ["Role", ROLE_LABELS[r.role] ?? dash(r.role)],
        ["Action", actionLabel(r.action)],
        ["Module", r.entity],
        ["Record", r.entityId],
        ["Details", dash(r.details)],
        ["IP address", dash(r.ip)],
      ],
      tables: [{ title: "Changes", head: ["Field", "Before", "After"], rows: r.changes.map(([f, b, a]) => [f, dash(b), dash(a)]) }],
    }),
  },
};

// Icons and colours of the five summary tiles (the numbers come from the API)
const KPI_STYLE = [
  [Package, "bg-blue-50 text-blue-600"],
  [Flag, "bg-green-50 text-green-600"],
  [Route, "bg-violet-50 text-violet-600"],
  [AlertCircle, "bg-amber-50 text-amber-600"],
  [Gauge, "bg-blue-50 text-blue-600"],
];

// One summary tile above the tabs
function Kpi({ icon: Icon, tone, label, value, foot }) {
  return (
    <div className={`${CARD} p-4`}>
      <div className="flex items-center gap-2 text-[13px] text-mute">
        <span className={`grid h-7 w-7 place-items-center rounded-lg ${tone}`}>
          <Icon size={15} strokeWidth={1.8} />
        </span>
        {label}
      </div>
      <p className="mt-2 text-[26px] font-semibold leading-tight tracking-tight tabular-nums">{typeof value === "number" ? formatNumber(value) : value}</p>
      <p className="mt-0.5 text-[13px] text-mute">{foot}</p>
    </div>
  );
}

// Stacked bar chart per day, drawn with plain divs (no chart library). The API supplies the days and series.
function TrendChart({ trend }) {
  const [hover, setHover] = useState(null);
  const days = trend.days;
  const series = trend.series;

  const { yMax, step } = useMemo(() => {
    const max = Math.max(4, ...days.map((b) => b.total));
    const stepSize = Math.ceil(max / 4);
    return { yMax: stepSize * 4, step: stepSize };
  }, [days]);

  const PLOT = 210;
  const every = Math.max(1, Math.ceil(days.length / 8));
  const shortDay = (k) => new Date(`${k}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  const hit = hover !== null ? days[hover] : null;

  if (days.length === 0) return <p className="py-16 text-center text-sm text-mute">No activity in this range</p>;

  return (
    <div className="relative pl-9">
      <div className="relative" style={{ height: PLOT }}>
        {/* Grid lines and y axis labels */}
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="absolute inset-x-0 border-t border-slate-100" style={{ bottom: (i / 4) * PLOT }}>
            <span className="absolute -left-9 w-7 -translate-y-1/2 text-right text-[11px] text-mute">{formatNumber(i * step)}</span>
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
                {series.filter((s) => b[s.key] > 0).map((s) => (
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
              {new Date(`${hit.day}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" })} · {formatNumber(hit.total)}
            </p>
            {series.map((s) => (
              <p key={s.key} className="mt-1 flex items-center gap-2">
                <i className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
                <span className="text-mute">{s.label}</span>
                <b className="ml-auto tabular-nums">{formatNumber(hit[s.key])}</b>
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

// Side panel with the details of one row
function RowDrawer({ row, report, title, onClose }) {
  const { fields, tables = [] } = report.detail(row);

  // Escape closes the panel
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 print:hidden">
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} aria-hidden="true" />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-xl" role="dialog" aria-label={`${title} details`}>
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h3 className="text-[15px] font-semibold">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-md hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <dl className="grid grid-cols-[120px_minmax(0,1fr)] gap-x-3 gap-y-2.5 text-sm">
            {fields.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-mute">{label}</dt>
                <dd className="break-word">{value}</dd>
              </div>
            ))}
          </dl>
          {tables.map((t) => (
            <div key={t.title}>
              <h4 className="mb-2 text-[13px] font-semibold">{t.title}</h4>
              {t.rows.length === 0 ? (
                <p className="text-[13px] text-mute">None recorded</p>
              ) : (
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr>
                      {t.head.map((h) => (
                        <th key={h} className="bg-slate-50 px-3 py-2 text-left font-medium text-mute">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {t.rows.map((cells, i) => (
                      <tr key={i}>
                        {cells.map((c, j) => (
                          <td key={j} className="border-t border-line px-3 py-2">{c}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

export default function Reports() {
  const [params, setParams] = useSearchParams();

  const [options, setOptions] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [preset, setPreset] = useState("all");
  const [range, setRange] = useState(() => presetRange("all"));
  const [store, setStore] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState(""); // query after the typing pause
  const [sort, setSort] = useState(null); // { key, dir } once the user picks a column
  const [page, setPage] = useState(1);
  const [printRows, setPrintRows] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState(null);

  const [reload, setReload] = useState(0); // bumped by "Try again"
  const requestId = useRef(0);

  // Tabs come from the API; ?report=audit keeps the chosen tab in the link
  const types = useMemo(() => (options?.types ?? []).filter((t) => REPORTS[t.key]), [options]);
  const tab = types.find((t) => t.key === params.get("report"))?.key ?? types[0]?.key;
  const type = types.find((t) => t.key === tab);
  const report = tab ? REPORTS[tab] : null;

  const activeSort = sort ?? report?.defaultSort ?? { key: "", dir: "desc" };

  // Wait for a pause in typing before asking the server
  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(query.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  // Report tabs and the store / vehicle dropdowns
  const loadOptions = useCallback(async () => {
    setError("");
    try {
      setOptions(await getReportOptions());
    } catch (err) {
      setError(parseReportError(err));
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  // The filters sent to the API (the browser's offset keeps the daily chart on local days)
  const criteria = useMemo(() => {
    if (!report) return null;
    return {
      from: range[0] ? new Date(`${range[0]}T00:00:00`).toISOString() : "",
      to: range[1] ? new Date(`${range[1]}T23:59:59.999`).toISOString() : "",
      tz: new Date().getTimezoneOffset(),
      q: search,
      status,
      category: type?.categories ? category : "",
      store: report.filters.store ? store : "",
      vehicle: report.filters.vehicle ? vehicle : "",
      sort: report.columns.find((c) => c.key === activeSort.key)?.sort ?? activeSort.key,
      dir: activeSort.dir,
    };
  }, [report, type, range, search, status, category, store, vehicle, activeSort.key, activeSort.dir]);

  // Fetch the page that is on screen, ignoring answers that arrive late
  useEffect(() => {
    if (!tab || !criteria) return;
    const id = ++requestId.current;
    setLoading(true);
    setError("");
    getReport(tab, { ...criteria, page, limit: PAGE_SIZE })
      .then((res) => {
        if (id === requestId.current) setData(res);
      })
      .catch((err) => {
        if (id === requestId.current) setError(parseReportError(err));
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, [tab, criteria, page, reload]);

  // The data only counts once it belongs to the open tab (before that, data is null and tab is undefined)
  const ready = Boolean(data && data.type === tab);
  const total = ready ? data.total : 0;
  const rows = printRows ?? (ready ? data.rows : []);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.min(page, pageCount);

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
    setCategory("");
    setQuery("");
    setSearch("");
    setSort(null);
    applyPreset("all");
  };

  const changeTab = (key) => {
    setParams({ report: key }, { replace: true });
    setStatus("");
    setCategory("");
    setQuery("");
    setSearch("");
    setSort(null);
    setSelected(null);
    setPage(1);
  };

  const toggleSort = (key) =>
    setSort({ key, dir: activeSort.key === key ? (activeSort.dir === "asc" ? "desc" : "asc") : report.columns.find((c) => c.key === key)?.align === "right" ? "desc" : "asc" });

  // Every row for the current filters, fetched page by page (used by CSV and print)
  const fetchAllRows = async () => {
    const all = [];
    for (let p = 1; p <= EXPORT_MAX_PAGES; p++) {
      const res = await getReport(tab, { ...criteria, page: p, limit: EXPORT_PAGE });
      all.push(...res.rows);
      if (all.length >= res.total || res.rows.length === 0) break;
    }
    return all;
  };

  const showNotice = (text) => {
    setNotice(text);
    setTimeout(() => setNotice(""), 4000);
  };

  // Download every row of the open report (not just the current page)
  const exportCsv = async () => {
    setBusy(true);
    try {
      const all = await fetchAllRows();
      const head = report.columns.map((c) => c.label);
      const lines = all.map((r) => report.columns.map((c) => (c.csv ? c.csv(r) : r[c.key])));
      const file = `${tab}_report_${dayKey(new Date())}.csv`;
      downloadCsv(file, head, lines);
      showNotice(`Export ready. ${file} downloaded (${formatNumber(all.length)} rows).`);
      recordReportExport(tab, all.length).catch(() => {}); // the audit note is best effort
    } catch (err) {
      setError(parseReportError(err, "We could not export this report."));
    } finally {
      setBusy(false);
    }
  };

  // Show every row, open the print dialog, then go back to paging
  const print = async () => {
    setBusy(true);
    try {
      setPrintRows(await fetchAllRows());
      setTimeout(() => {
        window.print();
        setPrintRows(null);
        setBusy(false);
      }, 200);
      recordReportExport(tab, total).catch(() => {});
    } catch (err) {
      setError(parseReportError(err, "We could not prepare this report for printing."));
      setBusy(false);
    }
  };

  const hasFilters = Boolean(store || vehicle || status || category || query || sort || preset !== "all");

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold leading-tight tracking-tight">Reports</h1>
          <p className="text-sm text-mute">Bookings, trips, vehicles, stores, items, goods receiving and system activity.</p>
        </div>
        <div className="flex shrink-0 gap-2 print:hidden">
          <button
            type="button"
            onClick={print}
            disabled={!ready || busy || total === 0}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-4 text-[13px] font-medium hover:bg-slate-50 disabled:opacity-60"
          >
            <Printer size={15} /> Print / PDF
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={!ready || busy || total === 0}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-brand px-4 text-[13px] font-medium text-white hover:brightness-110 disabled:opacity-60"
          >
            <Download size={15} strokeWidth={2} /> {busy ? "Preparing…" : "Export CSV"}
          </button>
        </div>
      </div>

      {notice && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-4 py-2.5 text-[13px] text-ok print:hidden" role="status">
          <CheckCircle2 size={15} /> {notice}
        </div>
      )}

      {error && (
        <div className={`${CARD} mb-4 p-6 text-center`}>
          <p className="text-bad">{error}</p>
          <button
            type="button"
            onClick={() => (options ? setReload((n) => n + 1) : loadOptions())}
            className="mt-3 h-8 rounded-md bg-brand px-4 text-[13px] font-medium text-white hover:brightness-110"
          >
            Try again
          </button>
        </div>
      )}

      {!options && !error && <p className="py-10 text-center text-mute">Loading reports…</p>}

      {options && report && (
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
            {report.filters.store && (
              <select value={store} onChange={(e) => filter(setStore)(e.target.value)} aria-label="Filter by store" className={FIELD}>
                <option value="">All stores</option>
                {options.stores.map((s) => (
                  <option key={s.code} value={s.code}>{s.name}</option>
                ))}
              </select>
            )}
            {report.filters.vehicle && (
              <select value={vehicle} onChange={(e) => filter(setVehicle)(e.target.value)} aria-label="Filter by vehicle" className={FIELD}>
                <option value="">All vehicles</option>
                {options.vehicles.map((v) => (
                  <option key={v.code} value={v.code}>{v.plate} · {v.type}</option>
                ))}
              </select>
            )}
            <select value={status} onChange={(e) => filter(setStatus)(e.target.value)} aria-label={`Filter by ${type.statusLabel.toLowerCase()}`} className={FIELD}>
              <option value="">Any {type.statusLabel.toLowerCase()}</option>
              {type.statuses.map((s) => (
                <option key={s} value={s}>{tab === "audit" ? actionLabel(s) : s}</option>
              ))}
            </select>
            {type.categories && (
              <select value={category} onChange={(e) => filter(setCategory)(e.target.value)} aria-label={`Filter by ${type.categoryLabel.toLowerCase()}`} className={FIELD}>
                <option value="">Any {type.categoryLabel.toLowerCase()}</option>
                {type.categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-[13px] font-medium text-brand hover:underline"
              >
                <X size={14} /> Clear filters
              </button>
            )}
          </section>

          <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 print:hidden" role="tablist">
            {types.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => changeTab(t.key)}
                className={`h-8 whitespace-nowrap rounded-lg px-4 text-[13px] ${
                  tab === t.key ? "bg-white font-medium text-ink shadow-sm" : "text-mute hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {!ready && loading && !error && <p className="py-10 text-center text-mute">Loading {type.label.toLowerCase()} report…</p>}

          {ready && (
            <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
              {/* Goods report returns eight summary tiles; other reports return five */}
              <div className={`mb-4 grid grid-cols-2 gap-4 ${data.kpis.length > 5 ? "lg:grid-cols-4" : "lg:grid-cols-5"}`}>
                {data.kpis.map((k, i) => (
                  <Kpi key={k.label} icon={KPI_STYLE[i % KPI_STYLE.length][0]} tone={KPI_STYLE[i % KPI_STYLE.length][1]} label={k.label} value={k.value} foot={k.foot} />
                ))}
              </div>

              <div className="mb-4 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] print:hidden">
                <section className={CARD}>
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-3.5">
                    <div>
                      <h3 className="text-[15px] font-semibold">{data.trend.title}</h3>
                      <p className="text-[13px] text-mute">
                        {data.trend.sub} · {rangeLabel}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-mute">
                      {data.trend.series.map((s) => (
                        <span key={s.key} className="inline-flex items-center gap-1.5">
                          <i className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
                          {s.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="px-5 pb-3 pt-5">
                    <TrendChart trend={data.trend} />
                  </div>
                </section>

                <section className={CARD}>
                  <div className="border-b border-line px-5 py-3.5">
                    <h3 className="text-[15px] font-semibold">{data.breakdown.title}</h3>
                    <p className="text-[13px] text-mute">{data.breakdown.sub}</p>
                  </div>
                  <div className="max-h-77.5 space-y-3 overflow-y-auto px-5 py-4">
                    {data.breakdown.items.length === 0 && <p className="py-8 text-center text-sm text-mute">No data in this range</p>}
                    {data.breakdown.items.map(([label, value]) => {
                      const max = data.breakdown.max || Math.max(1, ...data.breakdown.items.map((i) => i[1]));
                      return (
                        <div key={label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto] items-center gap-3 text-sm">
                          <span className="truncate" title={label}>{label}</span>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
                          </div>
                          <span className="min-w-8 text-right tabular-nums">{formatNumber(value)}{data.breakdown.suffix}</span>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>

              <section className={CARD}>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
                  <div>
                    <h3 className="text-[15px] font-semibold">{type.title}</h3>
                    <p className="text-[13px] text-mute">
                      {formatNumber(total)} row{total === 1 ? "" : "s"} · {rangeLabel}
                    </p>
                  </div>
                  <div className="relative w-70 max-w-full print:hidden">
                    <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
                    <input
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={type.search}
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
                          const on = activeSort.key === c.key;
                          const SortIcon = on ? (activeSort.dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
                          return (
                            <th
                              key={c.key}
                              className={`${TH} ${c.align === "right" ? "text-right" : ""}`}
                              aria-sort={on ? (activeSort.dir === "asc" ? "ascending" : "descending") : undefined}
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
                      {rows.map((r) => (
                        <tr
                          key={r.id}
                          onClick={() => setSelected(r)}
                          onKeyDown={(e) => e.key === "Enter" && setSelected(r)}
                          tabIndex={0}
                          className="cursor-pointer hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                        >
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
                    Showing {total === 0 ? 0 : (current - 1) * PAGE_SIZE + 1}–{Math.min(current * PAGE_SIZE, total)} of {formatNumber(total)} rows
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
            </div>
          )}
        </>
      )}

      {selected && report && <RowDrawer row={selected} report={report} title={report.noun(selected)} onClose={() => setSelected(null)} />}
    </div>
  );
}
