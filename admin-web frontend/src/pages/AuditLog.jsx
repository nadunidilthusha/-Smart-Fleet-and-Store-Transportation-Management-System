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
  History,
  Pencil,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { getAuditLogs, recordAuditExport } from "../api/auditApi";
import { ROLE_LABELS } from "../utils/roles";
import { getInitials } from "../utils/formatters";
import { downloadCsv } from "../utils/exportCsv";

const CARD = "min-w-0 rounded-xl border border-line bg-white";
const TH = "whitespace-nowrap bg-slate-50 px-4 py-2.5 text-left text-[13px] font-medium text-mute";
const TD = "border-t border-line px-4 py-3 text-sm";
const FIELD =
  "h-9 rounded-md border border-line bg-slate-50 px-3 text-[13px] outline-none placeholder:text-mute focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20";

const PAGE_SIZE = 10;

// Label and colour for each action type
const ACTIONS = {
  LOGIN: ["Sign in", "bg-blue-50 text-blue-700"],
  LOGOUT: ["Sign out", "bg-slate-100 text-slate-600"],
  LOGIN_FAILED: ["Failed sign-in", "bg-red-50 text-red-700"],
  CREATE: ["Create", "bg-green-50 text-green-700"],
  UPDATE: ["Update", "bg-violet-50 text-violet-700"],
  APPROVE: ["Approve", "bg-green-50 text-green-700"],
  ASSIGN: ["Assign", "bg-violet-50 text-violet-700"],
  CANCEL: ["Cancel", "bg-amber-50 text-amber-700"],
  ROLE_CHANGE: ["Role change", "bg-amber-50 text-amber-700"],
  DEACTIVATE: ["Deactivate", "bg-red-50 text-red-700"],
  ACTIVATE: ["Activate", "bg-green-50 text-green-700"],
  EXPORT: ["Export", "bg-slate-100 text-slate-600"],
};

const DATA_ACTIONS = ["CREATE", "UPDATE", "APPROVE", "ASSIGN", "CANCEL"];
const ACCESS_ACTIONS = ["ROLE_CHANGE", "DEACTIVATE", "ACTIVATE"];

const PRESETS = [
  ["today", "Today"],
  ["7d", "7 days"],
  ["30d", "30 days"],
  ["all", "All time"],
];

const COLUMNS = [
  { key: "ts", label: "Timestamp", sortable: true },
  { key: "userName", label: "User", sortable: true },
  { key: "action", label: "Action", sortable: true },
  { key: "entity", label: "Record", sortable: true },
  { key: "details", label: "Details" },
  { key: "ip", label: "IP address" },
];

const actionLabel = (a) => (ACTIONS[a] ?? [a])[0];

// 23 Nov 2026
const fmtDate = (v) => new Date(v).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

// 10:38:33
const fmtTime = (v) => new Date(v).toLocaleTimeString("en-GB");

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
  return [dayKey(from), dayKey(now)];
}

// 6 min ago, 3 h ago, Yesterday, 4 Nov
function timeAgo(value) {
  const d = new Date(value);
  const minutes = Math.floor((Date.now() - d.getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  if (hours < 48) return "Yesterday";
  return `${Math.floor(hours / 24)} days ago`;
}

// Turn the audit rows into CSV lines and download them
function exportAuditCsv(filename, rows) {
  const head = ["Timestamp", "User", "Role", "Action", "Record", "Details", "Field changes", "IP address"];
  const lines = rows.map((a) => [
    new Date(a.ts).toISOString(),
    a.userName,
    ROLE_LABELS[a.role] ?? a.role,
    actionLabel(a.action),
    `${a.entity} ${a.entityId}`,
    a.details,
    (a.changes ?? []).map(([f, o, n]) => `${f}: ${o} → ${n}`).join("; "),
    a.ip,
  ]);
  downloadCsv(filename, head, lines);
}

// Coloured pill for the action type
function ActionTag({ action }) {
  const [label, tone] = ACTIONS[action] ?? [action, "bg-slate-100 text-slate-600"];
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}>{label}</span>;
}

// Round avatar with the user's initials
function Avatar({ name, unknown }) {
  return (
    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#2f5c9f] text-[11px] font-semibold text-white">
      {unknown ? "?" : getInitials(name)}
    </span>
  );
}

// One summary tile above the table
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

// Side panel with the full entry and before/after values
function DetailDrawer({ entry, onClose }) {
  // Close with the Escape key
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const changes = entry.changes ?? [];
  const rows = [
    ["Entry ID", entry.id],
    ["When", `${new Date(entry.ts).toLocaleString("en-GB")} (${timeAgo(entry.ts)})`],
    ["Performed by", `${entry.userName}${entry.role ? ` · ${ROLE_LABELS[entry.role] ?? entry.role}` : ""}`],
    ["IP address", entry.ip],
    ["Description", entry.details],
  ];

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Audit entry ${entry.id}`}
        className="absolute right-0 top-0 flex h-full w-105 max-w-full flex-col bg-white shadow-xl"
      >
        <div className="flex items-start justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="text-[16px] font-semibold leading-tight">
              {entry.entity} {entry.entityId !== "–" && entry.entityId}
            </h2>
            <p className="mt-1.5">
              <ActionTag action={entry.action} />
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 rounded-md border border-line px-3 text-[13px] font-medium hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <dl>
            {rows.map(([label, value]) => (
              <div key={label} className="grid grid-cols-[110px_1fr] gap-3 py-1 text-sm">
                <dt className="text-mute">{label}</dt>
                <dd className="break-word">{value}</dd>
              </div>
            ))}
          </dl>

          {changes.length > 0 ? (
            <div className="mt-4">
              <p className="mb-2 text-sm font-semibold">Field changes</p>
              <div className="overflow-hidden rounded-lg border border-line">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-[13px] text-mute">
                      <th className="px-3 py-2 text-left font-medium">Field</th>
                      <th className="px-3 py-2 text-left font-medium">Before</th>
                      <th className="px-3 py-2 text-left font-medium">After</th>
                    </tr>
                  </thead>
                  <tbody>
                    {changes.map(([field, before, after]) => (
                      <tr key={field} className="border-t border-line">
                        <td className="px-3 py-2.5">{field}</td>
                        <td className="bg-red-50/60 px-3 py-2.5 text-bad line-through decoration-bad/40">{before}</td>
                        <td className="bg-green-50/60 px-3 py-2.5 font-medium text-ok">{after}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-[13px] text-mute">No field-level changes recorded for this event.</p>
          )}
        </div>
      </aside>
    </div>
  );
}

export default function AuditLog() {
  const [params] = useSearchParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Deep links like ?entity=User&q=U003 and the top bar search
  const deepQuery = params.get("q") ?? "";
  const globalQuery = (params.get("search") ?? "").trim().toLowerCase();

  const [query, setQuery] = useState(deepQuery);
  const [user, setUser] = useState("");
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState(params.get("entity") ?? "");
  const [preset, setPreset] = useState(deepQuery ? "all" : "30d");
  const [range, setRange] = useState(() => presetRange(deepQuery ? "all" : "30d"));
  const [sort, setSort] = useState({ key: "ts", dir: -1 });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await getAuditLogs());
    } catch {
      setError("We could not load the audit history. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const all = data ?? [];

  // Options for the user and record type dropdowns come from the data itself
  const people = useMemo(
    () =>
      [...new Map(all.filter((a) => a.userId !== "—").map((a) => [a.userId, a.userName])).entries()].sort((a, b) =>
        a[1].localeCompare(b[1])
      ),
    [all]
  );
  const entities = useMemo(() => [...new Set(all.map((a) => a.entity))].sort(), [all]);

  // Apply every filter, then sort
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const from = range[0] ? new Date(`${range[0]}T00:00:00`).getTime() : -Infinity;
    const to = range[1] ? new Date(`${range[1]}T23:59:59.999`).getTime() : Infinity;

    const list = all.filter((a) => {
      const t = new Date(a.ts).getTime();
      if (t < from || t > to) return false;
      if (user && a.userId !== user) return false;
      if (action && a.action !== action) return false;
      if (entity && a.entity !== entity) return false;
      const text = [a.userName, a.entityId, a.details, a.entity, a.ip, actionLabel(a.action)].join(" ").toLowerCase();
      return (!q || text.includes(q)) && (!globalQuery || text.includes(globalQuery));
    });

    return list.sort((a, b) => {
      const x = sort.key === "ts" ? new Date(a.ts).getTime() : String(a[sort.key]).toLowerCase();
      const y = sort.key === "ts" ? new Date(b.ts).getTime() : String(b[sort.key]).toLowerCase();
      return (x > y ? 1 : x < y ? -1 : 0) * sort.dir;
    });
  }, [all, query, user, action, entity, range, sort, globalQuery]);

  const count = (list) => rows.filter((a) => list.includes(a.action)).length;
  const failed = count(["LOGIN_FAILED"]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const visible = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

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
    setQuery("");
    setUser("");
    setAction("");
    setEntity("");
    applyPreset("30d");
  };

  const toggleSort = (key) => setSort((s) => (s.key === key ? { key, dir: -s.dir } : { key, dir: 1 }));

  // Download the filtered rows and log the export itself
  const exportCsv = async () => {
    exportAuditCsv(`audit-history_${dayKey(new Date())}.csv`, rows);
    setNotice(`Export ready. ${rows.length} audit entries exported.`);
    setTimeout(() => setNotice(""), 4000);
    try {
      await recordAuditExport(rows.length);
      setData(await getAuditLogs());
    } catch {
      // The file is already downloaded, so a logging failure should not block the user
    }
  };

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold leading-tight tracking-tight">Audit history</h1>
          <p className="text-sm text-mute">Every important change, timestamped and linked to the user who made it.</p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={!data || rows.length === 0}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-brand px-4 text-[13px] font-medium text-white hover:brightness-110 disabled:opacity-60"
        >
          <Download size={15} strokeWidth={2} /> Export CSV
        </button>
      </div>

      {notice && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-4 py-2.5 text-[13px] text-ok" role="status">
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

      {!error && loading && !data && <p className="py-10 text-center text-mute">Loading audit history…</p>}

      {!error && data && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-5">
            <Kpi icon={History} tone="bg-blue-50 text-blue-600" label="Events" value={rows.length} foot="in selected range" />
            <Kpi icon={Users} tone="bg-violet-50 text-violet-600" label="Active users" value={new Set(rows.map((a) => a.userId)).size} foot="performed at least one action" />
            <Kpi icon={Pencil} tone="bg-green-50 text-green-600" label="Data changes" value={count(DATA_ACTIONS)} foot="bookings, trips, vehicles, slots" />
            <Kpi icon={ShieldCheck} tone="bg-amber-50 text-amber-600" label="Access changes" value={count(ACCESS_ACTIONS)} foot="roles & account status" />
            <Kpi
              icon={AlertCircle}
              tone="bg-red-50 text-red-600"
              label="Failed sign-ins"
              value={failed}
              foot={failed > 5 ? "Review for suspicious activity" : "Within normal range"}
              footClass={failed > 5 ? "text-bad" : "text-ok"}
            />
          </div>

          <section className={CARD}>
            <div className="flex flex-wrap gap-3 px-4 py-3">
              <input
                type="search"
                value={query}
                onChange={(e) => filter(setQuery)(e.target.value)}
                placeholder="Search user, record ID or details…"
                aria-label="Search audit history"
                className={`${FIELD} min-w-55 flex-1`}
              />
              <select value={user} onChange={(e) => filter(setUser)(e.target.value)} aria-label="Filter by user" className={FIELD}>
                <option value="">All users</option>
                {people.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
              <select value={action} onChange={(e) => filter(setAction)(e.target.value)} aria-label="Filter by action" className={FIELD}>
                <option value="">All actions</option>
                {Object.entries(ACTIONS).map(([id, [label]]) => (
                  <option key={id} value={id}>{label}</option>
                ))}
              </select>
              <select value={entity} onChange={(e) => filter(setEntity)(e.target.value)} aria-label="Filter by record type" className={FIELD}>
                <option value="">All record types</option>
                {entities.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 pb-3">
              <div className="flex gap-1.5">
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
              <button
                type="button"
                onClick={clearFilters}
                className="ml-auto inline-flex items-center gap-1 text-[13px] font-medium text-brand hover:underline"
              >
                <X size={14} /> Clear filters
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-225 border-collapse">
                <thead>
                  <tr>
                    {COLUMNS.map((c) => {
                      const active = sort.key === c.key;
                      const SortIcon = active ? (sort.dir === 1 ? ArrowUp : ArrowDown) : ArrowUpDown;
                      return (
                        <th key={c.key} className={TH} aria-sort={active ? (sort.dir === 1 ? "ascending" : "descending") : undefined}>
                          {c.sortable ? (
                            <button
                              type="button"
                              onClick={() => toggleSort(c.key)}
                              className={`inline-flex items-center gap-1 uppercase tracking-wide hover:text-ink ${active ? "text-ink" : ""}`}
                            >
                              {c.label} <SortIcon size={12} />
                            </button>
                          ) : (
                            <span className="uppercase tracking-wide">{c.label}</span>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((a) => (
                    <tr
                      key={a.id}
                      tabIndex={0}
                      onClick={() => setSelected(a)}
                      onKeyDown={(e) => e.key === "Enter" && setSelected(a)}
                      className="cursor-pointer hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                    >
                      <td className={`${TD} whitespace-nowrap`}>
                        <p className="font-medium tabular-nums">{fmtDate(a.ts)}</p>
                        <p className="text-xs tabular-nums text-mute">{fmtTime(a.ts)}</p>
                      </td>
                      <td className={TD}>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={a.userName} unknown={a.userId === "—"} />
                          <div className="leading-tight">
                            <p className="whitespace-nowrap text-[13px] font-medium">{a.userName}</p>
                            <p className="whitespace-nowrap text-xs text-mute">{ROLE_LABELS[a.role] ?? a.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className={TD}><ActionTag action={a.action} /></td>
                      <td className={`${TD} whitespace-nowrap`}>
                        {a.entity} <span className="text-xs uppercase tabular-nums text-mute">{a.entityId}</span>
                      </td>
                      <td className={TD}>
                        {a.details}
                        {a.changes?.length > 0 && (
                          <span className="ml-2 whitespace-nowrap rounded-full bg-slate-100 px-2 py-0.5 text-xs text-mute" title="Field changes recorded">
                            {a.changes.length} change{a.changes.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </td>
                      <td className={`${TD} whitespace-nowrap font-mono text-xs text-mute`}>{a.ip}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={COLUMNS.length} className="px-4 py-10 text-center text-sm text-mute">
                        No audit entries match these filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-line px-4 py-3 text-[13px] text-mute">
              <span>
                Showing {rows.length === 0 ? 0 : (current - 1) * PAGE_SIZE + 1}–{Math.min(current * PAGE_SIZE, rows.length)} of {rows.length} entries
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

      {selected && <DetailDrawer entry={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
