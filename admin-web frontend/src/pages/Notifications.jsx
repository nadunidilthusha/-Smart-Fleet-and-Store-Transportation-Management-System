import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, Bell, CheckCheck, ClipboardList, Route, Truck } from "lucide-react";
import { getNotifications, markAllNotificationsRead, setNotificationRead } from "../api/notificationApi";

const CARD = "min-w-0 rounded-xl border border-line bg-white";

const TABS = ["All", "Unread", "Bookings", "Trips", "Vehicles"];
const TAB_TYPE = { Bookings: "booking", Trips: "trip", Vehicles: "vehicle" };

const TYPE_ICON = { booking: ClipboardList, trip: Route, vehicle: Truck, system: Bell };
const TYPE_TONE = {
  booking: "bg-blue-50 text-blue-600",
  trip: "bg-violet-50 text-violet-600",
  vehicle: "bg-amber-50 text-amber-600",
  system: "bg-slate-100 text-slate-500",
};
const CRITICAL_TONE = "bg-red-50 text-red-600";

// 6 min ago, 3 h ago, Yesterday, 4 Nov
function timeAgo(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const minutes = Math.floor((Date.now() - d.getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  if (hours < 48) return "Yesterday";
  return `${d.getDate()} ${d.toLocaleDateString("en-GB", { month: "short" })}`;
}

export default function Notifications() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const globalQuery = (params.get("search") ?? "").trim().toLowerCase();

  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("All");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await getNotifications());
    } catch {
      setError("We could not load your notifications. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const list = items ?? [];
  const unread = list.filter((n) => !n.read).length;

  // Search from the top bar filters this list too
  const base = useMemo(
    () => list.filter((n) => !globalQuery || `${n.title} ${n.message}`.toLowerCase().includes(globalQuery)),
    [list, globalQuery]
  );

  const counts = useMemo(
    () => ({
      All: base.length,
      Unread: base.filter((n) => !n.read).length,
      Bookings: base.filter((n) => n.type === "booking").length,
      Trips: base.filter((n) => n.type === "trip").length,
      Vehicles: base.filter((n) => n.type === "vehicle").length,
    }),
    [base]
  );

  const rows = useMemo(
    () =>
      base.filter((n) => {
        if (tab === "All") return true;
        if (tab === "Unread") return !n.read;
        return n.type === TAB_TYPE[tab];
      }),
    [base, tab]
  );

  // Update the list right away, then tell the server. Put it back if that fails.
  const changeRead = async (id, read) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read } : n)));
    try {
      await setNotificationRead(id, read);
    } catch {
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: !read } : n)));
    }
  };

  const markAll = async () => {
    const before = items;
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await markAllNotificationsRead();
    } catch {
      setItems(before);
    }
  };

  const open = (n) => {
    if (!n.read) changeRead(n.id, true);
    if (n.link) navigate(n.link);
  };

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold leading-tight tracking-tight">Notifications</h1>
          <p className="text-sm text-mute">
            {items ? (unread > 0 ? `${unread} unread` : "You are all caught up") : "Booking, trip and vehicle alerts"}
          </p>
        </div>
        <button
          type="button"
          onClick={markAll}
          disabled={!items || unread === 0}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-line bg-white px-4 text-[13px] font-medium hover:bg-slate-50 disabled:opacity-50"
        >
          <CheckCheck size={15} /> Mark all as read
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

      {!error && loading && !items && <p className="py-10 text-center text-mute">Loading notifications…</p>}

      {!error && items && (
        <section className={CARD}>
          <div className="flex gap-5 overflow-x-auto border-b border-line px-5 pt-1">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`-mb-px whitespace-nowrap border-b-2 py-3 text-[13px] ${
                  tab === t ? "border-brand font-medium text-ink" : "border-transparent text-mute hover:text-ink"
                }`}
              >
                {t} <sup className="text-[11px]">{counts[t]}</sup>
              </button>
            ))}
          </div>

          <ul className="max-h-[620px] overflow-y-auto">
            {rows.map((n) => {
              const Icon = n.severity === "critical" ? AlertCircle : TYPE_ICON[n.type] ?? Bell;
              const tone = n.severity === "critical" ? CRITICAL_TONE : TYPE_TONE[n.type] ?? TYPE_TONE.system;
              return (
                <li key={n.id} className="border-t border-line first:border-t-0">
                  <div className={`flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 ${n.read ? "" : "bg-blue-50/40"}`}>
                    <button
                      type="button"
                      onClick={() => open(n)}
                      className="flex min-w-0 flex-1 items-start gap-3 text-left"
                    >
                      <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg ${tone}`}>
                        <Icon size={17} strokeWidth={1.8} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className={`truncate text-sm ${n.read ? "font-medium" : "font-semibold"}`}>{n.title}</span>
                          {!n.read && <i className="h-2 w-2 shrink-0 rounded-full bg-brand" aria-label="Unread" />}
                        </span>
                        <span className="mt-0.5 block text-[13px] leading-snug text-mute">{n.message}</span>
                      </span>
                    </button>

                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="whitespace-nowrap text-xs text-mute">{timeAgo(n.createdAt)}</span>
                      <button
                        type="button"
                        onClick={() => changeRead(n.id, !n.read)}
                        className="text-xs font-medium text-brand hover:underline"
                      >
                        {n.read ? "Mark as unread" : "Mark as read"}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}

            {rows.length === 0 && (
              <li className="px-5 py-12 text-center">
                <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-mute">
                  <Bell size={18} />
                </span>
                <p className="mt-3 text-sm font-medium">No notifications here</p>
                <p className="text-[13px] text-mute">
                  {tab === "Unread" ? "You have read everything." : "Nothing matches this filter or search."}
                </p>
              </li>
            )}
          </ul>

          <div className="border-t border-line px-5 py-3 text-[13px] text-mute">
            Showing {rows.length} of {list.length} notifications
          </div>
        </section>
      )}
    </div>
  );
}