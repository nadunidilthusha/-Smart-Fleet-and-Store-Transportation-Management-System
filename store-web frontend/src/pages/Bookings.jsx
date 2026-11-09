import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { BOOKING_STATUSES, cancelBooking, getBookings } from "../api/bookingApi";
import useAuth from "../hooks/useAuth";
import { formatNumber, formatShortDateTime } from "../utils/formatters";
import BookingDrawer from "../components/booking/BookingDrawer";
import { DirectionTag, StatusDot, UrgentTag, getDirection, shortStore } from "../components/booking/BookingParts";

const CARD = "min-w-0 rounded-xl border border-line bg-white";
const TH = "sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-4 py-2.5 text-left text-xs font-medium text-mute";
const TD = "whitespace-nowrap border-t border-line px-4 py-3 text-[13px]";

const TABS = ["All", "Outgoing", "Incoming"];

// The dashboard links to /bookings?status=Pending
const STATUS_ALIAS = { Pending: "Pending approval" };

export default function Bookings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const store = user?.storeName ?? "Main Store – Biyagama";

  const [params, setParams] = useSearchParams();
  const [bookings, setBookings] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("All");
  const [query, setQuery] = useState("");

  // ?status=Approved   ?booking=BK-1103-0089   ?search=...  (the top bar search)
  const rawStatus = params.get("status");
  const statusParam = STATUS_ALIAS[rawStatus] ?? rawStatus;
  const status = BOOKING_STATUSES.includes(statusParam) ? statusParam : "All";
  const openId = params.get("booking");
  const globalQuery = (params.get("search") ?? "").trim().toLowerCase();

  const setParam = (key, value, replace = true) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value && value !== "All") next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace }
    );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setBookings(await getBookings());
    } catch {
      setError("We could not load your bookings. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const list = useMemo(() => bookings ?? [], [bookings]);

  // Search and status filters first, so the tab counts match what is shown
  const base = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter((b) => {
      const text = [b.id, shortStore(b.pickup), shortStore(b.destination), ...b.items.map((i) => `${i.code} ${i.item}`)]
        .join(" ")
        .toLowerCase();
      return (status === "All" || b.status === status) && (!q || text.includes(q)) && (!globalQuery || text.includes(globalQuery));
    });
  }, [list, status, query, globalQuery]);

  const counts = useMemo(
    () => ({
      All: base.length,
      Outgoing: base.filter((b) => getDirection(b, store) === "Outgoing").length,
      Incoming: base.filter((b) => getDirection(b, store) === "Incoming").length,
    }),
    [base, store]
  );

  const rows = useMemo(
    () => base.filter((b) => tab === "All" || getDirection(b, store) === tab),
    [base, tab, store]
  );

  const selected = openId ? list.find((b) => b.id === openId) : null;

  const handleCancel = async (booking) => {
    await cancelBooking(booking.id);
    await load();
    setParam("booking", "");
  };

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold leading-tight tracking-tight">My bookings</h1>
          <p className="text-sm text-mute">Bookings sent from or to {store}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/bookings/new")}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-brand px-4 text-[13px] font-medium text-white hover:brightness-110"
        >
          <Plus size={15} strokeWidth={2} /> New booking
        </button>
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

      {!error && loading && !bookings && <p className="py-10 text-center text-mute">Loading bookings…</p>}

      {!error && bookings && (
        <section className={CARD}>
          {/* Tabs, status filter and search */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 pt-2">
            <div className="flex gap-5">
              {TABS.map((t) => (
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

            <select
              value={status}
              onChange={(e) => setParam("status", e.target.value)}
              aria-label="Filter by status"
              className="h-8 w-44 rounded-md border border-line bg-white px-2.5 text-[13px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            >
              <option value="All">All statuses</option>
              {BOOKING_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <div className="relative ml-auto w-65 max-w-full">
              <Search size={15} className="absolute left-3 top-2.5 text-mute" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search booking number or item"
                aria-label="Search bookings"
                className="h-9 w-full rounded-md border border-line bg-white pl-9 pr-3 text-[13px] outline-none placeholder:text-mute focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
          </div>

          {/* Table */}
          <div className="mt-2 max-h-130 overflow-auto">
            <table className="w-full min-w-205 border-collapse">
              <thead>
                <tr>
                  {["Booking", "Route", "Items", "Units", "Requested for", "Status"].map((h) => (
                    <th key={h} className={TH}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => {
                  const first = b.items[0];
                  const more = b.items.length - 1;
                  return (
                    <tr
                      key={b.id}
                      tabIndex={0}
                      onClick={() => setParam("booking", b.id, false)}
                      onKeyDown={(e) => e.key === "Enter" && setParam("booking", b.id, false)}
                      className="cursor-pointer hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                    >
                      <td className={`${TD} font-medium tabular-nums`}>
                        <span className="inline-flex items-center gap-2">
                          {b.id}
                          {b.priority === "Urgent" && <UrgentTag />}
                        </span>
                      </td>
                      <td className={TD}>
                        <span className="inline-flex items-center gap-2">
                          {shortStore(b.pickup)} → {b.destination ? shortStore(b.destination) : "–"}
                          <DirectionTag direction={getDirection(b, store)} />
                        </span>
                      </td>
                      <td className={TD}>
                        {first ? first.item : "–"}
                        {more > 0 && (
                          <span className="block text-xs text-mute">+ {more} more {more === 1 ? "item" : "items"}</span>
                        )}
                      </td>
                      <td className={`${TD} tabular-nums`}>{formatNumber(b.units)}</td>
                      <td className={`${TD} tabular-nums`}>{formatShortDateTime(b.requestedFor)}</td>
                      <td className={TD}><StatusDot status={b.status} /></td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-[13px] text-mute">
                      No bookings match. Clear the search or choose another filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-line px-4 py-3 text-xs text-mute">
            Showing {rows.length} of {list.length} bookings
          </div>
        </section>
      )}

      {selected && (
        <BookingDrawer
          key={selected.id}
          booking={selected}
          onClose={() => setParam("booking", "")}
          onEdit={(b) => navigate(`/bookings/new?edit=${encodeURIComponent(b.id)}`)}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}