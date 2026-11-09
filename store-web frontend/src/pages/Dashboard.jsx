import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Download,
  Plus,
  Route,
  Search,
  Truck,
} from "lucide-react";
import { getDashboard } from "../api/dashboardApi";
import { TRIP_STATUS_DOT } from "../utils/constants";
import { formatLongDate, formatNumber, formatShortDateTime } from "../utils/formatters";

const CARD = "min-w-0 rounded-xl border border-line bg-white";
const TH = "whitespace-nowrap bg-slate-50 px-5 py-2.5 text-left text-[13px] font-medium text-mute";
const TD = "whitespace-nowrap border-t border-line px-5 py-3 tabular-nums";

/* Compact styles used only by the Today's trips table */
const TH_SM =
  "sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-3 py-2 text-left text-xs font-medium text-mute shadow-[inset_0_-1px_0_var(--color-line)]";
const TD_SM = "whitespace-nowrap border-t border-line px-3 py-2 text-[13px] tabular-nums";

function CardHeader({ title, subtitle, children }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-4">
      <div>
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {subtitle && <p className="text-[13px] text-mute">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

/* ---------- KPI cards ---------- */
const TONES = {
  blue: "bg-blue-50 text-blue-600",
  violet: "bg-violet-50 text-violet-600",
  amber: "bg-amber-50 text-amber-600",
  red: "bg-red-50 text-red-600",
  green: "bg-green-50 text-green-600",
};

function KpiCard({ label, value, total, note, noteClass = "text-mute", icon: Icon, tone, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${CARD} p-4 text-left transition-colors hover:bg-slate-50`}
    >
      <div className="flex items-start justify-between">
        <span className="text-[13px] text-mute">{label}</span>
        <span className={`grid h-8 w-8 place-items-center rounded-lg ${TONES[tone]}`}>
          <Icon size={16} strokeWidth={1.8} />
        </span>
      </div>
      <p className="mt-1 text-[26px] font-semibold leading-tight tracking-tight tabular-nums">
        {value}
        {total != null && <span className="text-sm font-normal text-mute"> / {total}</span>}
      </p>
      {note && <p className={`mt-0.5 text-[13px] ${noteClass}`}>{note}</p>}
    </button>
  );
}

/* ---------- Trips per day (bar chart) ---------- */
function TripsPerDayCard({ days }) {
  const peak = Math.max(...days.map((d) => d.onTime + d.delayed), 0);
  const max = Math.max(16, Math.ceil(peak / 4) * 4);
  const ticks = [0, 1, 2, 3, 4].map((i) => (max / 4) * i);

  return (
    <section className={CARD}>
      <CardHeader title="Trips per day" subtitle="Last 7 days">
        <div className="flex gap-4 text-[13px] text-mute">
          <span className="flex items-center gap-1.5">
            <i className="h-2 w-2 rounded-sm bg-brand" /> On time
          </span>
          <span className="flex items-center gap-1.5">
            <i className="h-2 w-2 rounded-sm bg-bad" /> Delayed
          </span>
        </div>
      </CardHeader>

      <div className="px-5 pb-5 pt-4">
        <div className="relative ml-8 h-50">
          {ticks.map((t) => (
            <div
              key={t}
              className="absolute inset-x-0 border-t border-dashed border-line"
              style={{ bottom: `${(t / max) * 100}%` }}
            >
              <span className="absolute -left-8 -top-2 w-6 text-right text-[11px] text-mute">{t}</span>
            </div>
          ))}
          <div className="absolute inset-0 grid grid-cols-7">
            {days.map((d) => {
              const total = d.onTime + d.delayed;
              const tipBottom = Math.min((total / max) * 100, 60);
              return (
                <div
                  key={d.day}
                  className="group relative flex h-full justify-center rounded-md transition-colors hover:bg-slate-50"
                >
                  <div className="flex h-full w-8 flex-col justify-end">
                    {d.delayed > 0 && (
                      <div className="rounded-t bg-bad" style={{ height: `${(d.delayed / max) * 100}%` }} />
                    )}
                    <div
                      className={`bg-brand ${d.delayed > 0 ? "" : "rounded-t"}`}
                      style={{ height: `${(d.onTime / max) * 100}%` }}
                    />
                  </div>

                  {/* Hover tooltip for stacked day totals */}
                  <div
                    role="tooltip"
                    className="pointer-events-none invisible absolute left-1/2 z-20 w-36 -translate-x-1/2 rounded-lg border border-line bg-white px-3 py-2 text-[13px] opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100"
                    style={{ bottom: `calc(${tipBottom}% + 8px)` }}
                  >
                    <p className="mb-1 font-medium text-ink">{d.day}</p>
                    <p className="flex items-center justify-between text-mute">
                      <span className="flex items-center gap-1.5">
                        <i className="h-2 w-2 rounded-sm bg-brand" /> On time
                      </span>
                      <b className="font-medium tabular-nums text-ink">{d.onTime}</b>
                    </p>
                    <p className="flex items-center justify-between text-mute">
                      <span className="flex items-center gap-1.5">
                        <i className="h-2 w-2 rounded-sm bg-bad" /> Delayed
                      </span>
                      <b className="font-medium tabular-nums text-ink">{d.delayed}</b>
                    </p>
                    <p className="mt-1 flex items-center justify-between border-t border-line pt-1 text-mute">
                      Total
                      <b className="font-medium tabular-nums text-ink">{total}</b>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="ml-8 mt-2 grid grid-cols-7 text-center text-xs text-mute">
          {days.map((d) => (
            <span key={d.day}>{d.day}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Fleet status ---------- */
function FleetStatusCard({ fleet, total }) {
  const rows = [
    { label: "On trip", value: fleet.onTrip, color: "bg-brand" },
    { label: "Loading or unloading", value: fleet.loading, color: "bg-warn" },
    { label: "Available", value: fleet.available, color: "bg-ok" },
    { label: "In maintenance", value: fleet.maintenance, color: "bg-slate-400" },
  ];
  return (
    <section className={CARD}>
      <CardHeader title="Fleet status" subtitle={`${total} vehicles`} />
      <div className="px-5 pb-5 pt-5">
        <div className="mb-4 flex h-2 gap-0.5 overflow-hidden rounded">
          {rows.map((r) => (
            <div key={r.label} className={r.color} style={{ flex: r.value }} />
          ))}
        </div>
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between py-1.5 text-sm">
            <span className="flex items-center gap-2.5">
              <i className={`h-2 w-2 rounded-full ${r.color}`} />
              {r.label}
            </span>
            <b className="font-medium tabular-nums">{r.value}</b>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Today's trips ---------- */
const TRIP_TABS = ["All", "In transit", "Delayed", "Completed"];

function TodayTripsCard({ trips, tripCount, globalQuery }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState("All");
  const [query, setQuery] = useState("");

  // Trips that match the top bar search
  const base = useMemo(
    () =>
      trips.filter(
        (t) =>
          !globalQuery ||
          [t.id, t.route, t.vehicle, t.driver, t.status].join(" ").toLowerCase().includes(globalQuery)
      ),
    [trips, globalQuery]
  );

  const counts = useMemo(
    () =>
      Object.fromEntries(
        TRIP_TABS.map((t) => [t, t === "All" ? base.length : base.filter((x) => x.status === t).length])
      ),
    [base]
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return base.filter(
      (t) =>
        (tab === "All" || t.status === tab) &&
        (!q || [t.id, t.route, t.vehicle, t.driver].join(" ").toLowerCase().includes(q))
    );
  }, [base, tab, query]);

  return (
    <section className={CARD}>
      <CardHeader title="Today's trips" subtitle="Planned and live trips for this store">
        <div className="relative w-55 shrink-0">
          <Search size={15} className="absolute left-2.5 top-2.25 text-mute" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search trip, route, vehicle or driver"
            aria-label="Search trips"
            className="h-8 w-full rounded-md border border-line pl-8 pr-2 text-[13px] outline-none placeholder:text-mute focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </div>
      </CardHeader>

      <div className="mt-3 flex gap-5 overflow-x-auto border-b border-line px-5">
        {TRIP_TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 py-2.5 text-[13px] ${
              tab === t ? "border-brand font-medium text-ink" : "border-transparent text-mute hover:text-ink"
            }`}
          >
            {t} <sup className="text-[11px]">{counts[t]}</sup>
          </button>
        ))}
      </div>

      <div className="max-h-85 overflow-auto">
        <table className="w-full min-w-170 border-collapse">
          <thead>
            <tr>
              {["Trip", "Route", "Vehicle", "Driver", "Load", "Next stop", "Status"].map((h) => (
                <th key={h} className={TH_SM}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50">
                <td className={`${TD_SM} font-medium`}>{t.id}</td>
                <td className={TD_SM}>{t.route}</td>
                <td className={TD_SM}>{t.vehicle}</td>
                <td className={TD_SM}>{t.driver}</td>
                <td className={TD_SM}>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-12 overflow-hidden rounded bg-slate-100">
                      <div className="h-full rounded bg-brand" style={{ width: `${t.load}%` }} />
                    </div>
                    {t.load}%
                  </div>
                </td>
                <td className={TD_SM}>
                  {t.nextStop}
                  {t.delayMinutes > 0 && <span className="ml-1.5 text-xs text-bad">+{t.delayMinutes} min</span>}
                </td>
                <td className={TD_SM}>
                  <span className="inline-flex items-center gap-1.5">
                    <i className={`h-2 w-2 rounded-full ${TRIP_STATUS_DOT[t.status] ?? "bg-slate-400"}`} />
                    {t.status}
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-[13px] text-mute">
                  No trips match. Clear the search or choose another tab.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-line px-5 py-3 text-[13px] text-mute">
        <span>
          Showing {rows.length} of {tripCount} trips today
        </span>
        <button
          type="button"
          onClick={() => navigate("/trip-progress")}
          className="font-medium text-brand hover:underline"
        >
          View all trips
        </button>
      </div>
    </section>
  );
}

/* ---------- Loading slots ---------- */
function LoadingSlotsCard({ slots }) {
  const full = slots.find((s) => s.booked / s.total > 0.85);
  return (
    <section className={CARD}>
      <CardHeader title="Loading slots" subtitle="Booked slots today" />
      <div className="space-y-4 px-5 pb-5 pt-5">
        {slots.map((s) => {
          const ratio = s.booked / s.total;
          return (
            <div key={s.store}>
              <div className="mb-1.5 flex justify-between text-sm font-medium">
                {s.store}
                <span className="font-normal tabular-nums text-mute">
                  {s.booked} of {s.total}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded bg-slate-100">
                <div
                  className={`h-full rounded ${ratio > 0.85 ? "bg-warn" : "bg-brand"}`}
                  style={{ width: `${ratio * 100}%` }}
                />
              </div>
            </div>
          );
        })}
        {full && (
          <p className="pt-1 text-[13px] text-mute">
            {full.store.split(" –")[0]} is almost full. New bookings may move to the next free slot.
          </p>
        )}
      </div>
    </section>
  );
}

/* ---------- Bookings awaiting approval ---------- */
function PendingApprovalsCard({ bookings, globalQuery }) {
  const navigate = useNavigate();
  const shown = bookings.filter(
    (b) => !globalQuery || [b.id, b.route].join(" ").toLowerCase().includes(globalQuery)
  );
  return (
    <section className={CARD}>
      <CardHeader title="Bookings awaiting approval" subtitle={`${bookings.length} requests need a decision`}>
        <button
          type="button"
          onClick={() => navigate("/bookings?status=Pending")}
          className="h-8 rounded-md border border-line px-3 text-[13px] font-medium hover:bg-slate-50"
        >
          Open bookings
        </button>
      </CardHeader>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-180 border-collapse text-sm">
          <thead>
            <tr>
              {["Booking", "Route", "Quantity", "Requested for", "Submitted", ""].map((h, i) => (
                <th key={i} className={TH}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((b) => (
              <tr key={b.id} className="hover:bg-slate-50">
                <td className={`${TD} font-medium`}>
                  {b.id}
                  {b.urgent && (
                    <span className="ml-2 rounded border border-bad px-1.5 text-xs font-medium text-bad">
                      Urgent
                    </span>
                  )}
                </td>
                <td className={TD}>{b.route}</td>
                <td className={TD}>{formatNumber(b.units)} units</td>
                <td className={TD}>{formatShortDateTime(b.requestedFor)}</td>
                <td className={TD}>{formatShortDateTime(b.submittedAt)}</td>
                <td className={`${TD} text-right`}>
                  <button
                    type="button"
                    onClick={() => navigate(`/bookings/${b.id}`)}
                    className="h-7 rounded-md border border-line px-3 text-[13px] font-medium hover:bg-slate-50"
                  >
                    Review
                  </button>
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-mute">
                  {bookings.length === 0
                    ? "No bookings are waiting for approval."
                    : "No bookings match your search."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ---------- Page ---------- */
export default function Dashboard() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const globalQuery = (params.get("search") ?? "").trim().toLowerCase();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await getDashboard());
    } catch {
      setError("We could not load the dashboard. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const k = data?.kpis;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold leading-tight tracking-tight">Dashboard</h1>
          <p className="text-sm text-mute">{formatLongDate()}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-3 text-[13px] font-medium hover:bg-slate-50"
          >
            <Download size={15} strokeWidth={1.8} />
            Export
          </button>
          <button
            type="button"
            onClick={() => navigate("/bookings/new")}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-brand px-3 text-[13px] font-medium text-white hover:brightness-110"
          >
            <Plus size={15} strokeWidth={2} />
            New Trip
          </button>
        </div>
      </div>

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

      {!error && loading && !data && <p className="py-10 text-center text-mute">Loading dashboard…</p>}

      {!error && data && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-5">
            <KpiCard
              label="Active vehicles"
              value={k.activeVehicles}
              total={k.totalVehicles}
              note={`${k.availableVehicles} available to assign`}
              icon={Truck}
              tone="blue"
              onClick={() => navigate("/trip-progress")}
            />
            <KpiCard
              label="Today's trips"
              value={k.todayTrips}
              note={`+${k.tripsChangePercent}% vs yesterday`}
              noteClass="text-ok"
              icon={Route}
              tone="violet"
              onClick={() => navigate("/trip-progress")}
            />
            <KpiCard
              label="Pending bookings"
              value={k.pendingBookings}
              note={`Oldest waiting ${k.oldestPendingHours} h`}
              icon={ClipboardList}
              tone="amber"
              onClick={() => navigate("/bookings?status=Pending")}
            />
            <KpiCard
              label="Delayed trips"
              value={k.delayedTrips}
              note="Over 15 min late"
              noteClass="text-bad"
              icon={AlertCircle}
              tone="red"
              onClick={() => navigate("/trip-progress?status=Delayed")}
            />
            <KpiCard
              label="Completed trips"
              value={k.completedTrips}
              total={k.todayTrips}
              note="Since 6:00 AM"
              icon={CheckCircle2}
              tone="green"
              onClick={() => navigate("/trip-progress?status=Completed")}
            />
          </div>

          <div className="mb-4 grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            <TripsPerDayCard days={data.tripsPerDay} />
            <FleetStatusCard fleet={data.fleetStatus} total={k.totalVehicles} />
          </div>

          <div className="mb-4 grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)]">
            <TodayTripsCard trips={data.trips} tripCount={data.tripCount} globalQuery={globalQuery} />
            <LoadingSlotsCard slots={data.loadingSlots} />
          </div>

          <PendingApprovalsCard bookings={data.pendingBookings} globalQuery={globalQuery} />
        </>
      )}
    </div>
  );
}
