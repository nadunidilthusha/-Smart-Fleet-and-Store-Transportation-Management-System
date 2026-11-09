import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, ClipboardList, Clock, Pencil, Plus, XCircle } from "lucide-react";
import { getBookings, updateBookingStatus } from "../api/bookingApi";
import { getStores } from "../api/storeApi";
import { formatNumber, formatShortDateTime } from "../utils/formatters";
import BookingDrawer from "../components/booking/BookingDrawer";
import { PriorityTag, StatusDot } from "../components/booking/BookingParts";

const CARD = "min-w-0 rounded-xl border border-line bg-white";
const TH = "whitespace-nowrap bg-slate-50 px-4 py-2.5 text-left text-[13px] font-medium text-mute";
const TD = "whitespace-nowrap border-t border-line px-4 py-3 text-sm";

const TABS = ["All", "Pending", "Approved", "Changes requested", "Rejected"];

const TONES = {
  amber: "bg-amber-50 text-amber-600",
  green: "bg-green-50 text-green-600",
  blue: "bg-blue-50 text-blue-600",
  red: "bg-red-50 text-red-600",
};

function SummaryCard({ label, value, note, noteClass = "text-mute", icon: Icon, tone, active, activeClass, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`${CARD} p-4 text-left transition-colors hover:bg-slate-50 ${active ? activeClass : ""}`}
    >
      <div className="flex items-start justify-between">
        <span className="text-[13px] text-mute">{label}</span>
        <span className={`grid h-8 w-8 place-items-center rounded-lg ${TONES[tone]}`}>
          <Icon size={16} strokeWidth={1.8} />
        </span>
      </div>
      <p className="mt-1 text-[26px] font-semibold leading-tight tracking-tight tabular-nums">{value}</p>
      <p className={`mt-0.5 text-[13px] ${noteClass}`}>{note}</p>
    </button>
  );
}

export default function Bookings() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [store, setStore] = useState("All");

  // ?status=Pending   ?booking=BK-1104-0086   ?search=...  (the top bar search)
  const status = TABS.includes(params.get("status")) ? params.get("status") : "All";
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
      const [result, storeList] = await Promise.all([getBookings(), getStores()]);
      setData(result);
      setStores(storeList);
    } catch {
      setError("We could not load the bookings. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const bookings = data?.bookings ?? [];

  // Filters that do not depend on the status tab (so the tab counts stay correct)
  const base = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bookings.filter((b) => {
      const text = [b.id, b.pickup, b.destination, b.requestedBy, ...b.items.map((i) => `${i.code} ${i.item}`)]
        .join(" ")
        .toLowerCase();
      return (
        (store === "All" || b.pickup === store) &&
        (!q || text.includes(q)) &&
        (!globalQuery || text.includes(globalQuery))
      );
    });
  }, [bookings, query, store, globalQuery]);

  const rows = useMemo(() => base.filter((b) => status === "All" || b.status === status), [base, status]);

  const counts = useMemo(
    () => Object.fromEntries(TABS.map((t) => [t, t === "All" ? base.length : base.filter((b) => b.status === t).length])),
    [base]
  );

  const selected = openId ? bookings.find((b) => b.id === openId) : null;

  const handleDecide = async (booking, nextStatus, comment) => {
    await updateBookingStatus(booking.id, nextStatus, comment);
    await load();
    setParam("booking", "");
  };

  const s = data?.summary;
  const pick = (tab) => setParam("status", status === tab ? "All" : tab);

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold leading-tight tracking-tight">Bookings</h1>
          <p className="text-sm text-mute">Review, approve and track transportation requests</p>
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

      {!error && loading && !data && <p className="py-10 text-center text-mute">Loading bookings…</p>}

      {!error && data && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-5">
            <SummaryCard label="Pending" value={s.pending} note={`Oldest waiting ${s.oldestPendingHours} h`} icon={Clock} tone="amber" active={status === "Pending"} activeClass="border-warn" onClick={() => pick("Pending")} />
            <SummaryCard label="Approved" value={s.approved} note="Ready for trip planning" icon={CheckCircle2} tone="green" active={status === "Approved"} activeClass="border-ok" onClick={() => pick("Approved")} />
            <SummaryCard label="Changes requested" value={s.changesRequested} note="Waiting on the store" icon={Pencil} tone="blue" active={status === "Changes requested"} activeClass="border-brand" onClick={() => pick("Changes requested")} />
            <SummaryCard label="Rejected" value={s.rejected} note="Closed" icon={XCircle} tone="red" active={status === "Rejected"} activeClass="border-bad" onClick={() => pick("Rejected")} />
            <SummaryCard label="All bookings" value={s.all} note={`${formatNumber(s.pendingUnits)} units pending`} noteClass="text-ok" icon={ClipboardList} tone="blue" active={false} onClick={() => setParam("status", "All")} />
          </div>

          <section className={CARD}>
            <div className="flex gap-5 overflow-x-auto border-b border-line px-5 pt-1">
              {TABS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setParam("status", t)}
                  className={`-mb-px whitespace-nowrap border-b-2 py-3 text-[13px] ${
                    status === t ? "border-brand font-medium text-ink" : "border-transparent text-mute hover:text-ink"
                  }`}
                >
                  {t} <sup className="text-[11px]">{counts[t]}</sup>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 px-4 py-3">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search booking number or item"
                aria-label="Search bookings"
                className="h-9 w-[240px] max-w-full rounded-md border border-line bg-slate-50 px-3 text-[13px] outline-none placeholder:text-mute focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20"
              />
              <select
                value={store}
                onChange={(e) => setStore(e.target.value)}
                aria-label="Filter by pickup store"
                className="h-9 rounded-md border border-line bg-slate-50 px-3 text-[13px] outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20"
              >
                <option value="All">All pickup stores</option>
                {stores.map((st) => (
                  <option key={st.id} value={st.name}>{st.name}</option>
                ))}
              </select>
            </div>

            <div className="max-h-[520px] overflow-auto">
              <table className="w-full min-w-[820px] border-collapse">
                <thead>
                  <tr>
                    {["Booking", "Pickup", "Destination", "Requested for", "Units", "Priority", "Status"].map((h) => (
                      <th
                        key={h}
                        className={`${TH} sticky top-0 z-10 ${h === "Units" ? "text-right" : ""}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((b) => (
                    <tr
                      key={b.id}
                      tabIndex={0}
                      onClick={() => setParam("booking", b.id, false)}
                      onKeyDown={(e) => e.key === "Enter" && setParam("booking", b.id, false)}
                      className="cursor-pointer hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                    >
                      <td className={`${TD} font-medium tabular-nums`}>{b.id}</td>
                      <td className={TD}>{b.pickup}</td>
                      <td className={TD}>{b.destination}</td>
                      <td className={`${TD} tabular-nums`}>{formatShortDateTime(b.requestedFor)}</td>
                      <td className={`${TD} text-right tabular-nums`}>{formatNumber(b.units)}</td>
                      <td className={TD}><PriorityTag priority={b.priority} /></td>
                      <td className={TD}><StatusDot status={b.status} /></td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-sm text-mute">
                        No bookings match. Clear the search or choose another tab.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="border-t border-line px-4 py-3 text-[13px] text-mute">
              Showing {rows.length} of {bookings.length} bookings
            </div>
          </section>
        </>
      )}

      {selected && (
        <BookingDrawer
          key={selected.id}
          booking={selected}
          onClose={() => setParam("booking", "")}
          onDecide={handleDecide}
        />
      )}
    </div>
  );
}