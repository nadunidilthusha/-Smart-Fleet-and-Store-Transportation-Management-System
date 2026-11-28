import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Bell, Search } from "lucide-react";
import { getPageTitle } from "../utils/constants";
import apiClient from "../api/apiClient";

export default function Topbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [unreadCount, setUnreadCount] = useState(0);

  // The search text lives in the URL (?search=...) so pages can read it
  const query = params.get("search") ?? "";

  const fetchUnreadCount = useCallback(async () => {
    try {
      const { data } = await apiClient.get("/notifications/unread-count");
      setUnreadCount(Number(data?.unread ?? 0));
    } catch (err) {
      console.error("Failed to load unread notification count", err);
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();

    const interval = setInterval(fetchUnreadCount, 15000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchUnreadCount();
    };

    const handleNotificationsUpdated = (event) => {
      if (typeof event.detail?.unread === "number") {
        setUnreadCount(event.detail.unread);
      } else {
        fetchUnreadCount();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("admin-notifications-updated", handleNotificationsUpdated);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("admin-notifications-updated", handleNotificationsUpdated);
    };
  }, [fetchUnreadCount, pathname]);

  const handleChange = (event) => {
    const value = event.target.value;
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set("search", value);
        else next.delete("search");
        return next;
      },
      { replace: true }
    );
  };

  const handleSearch = (event) => {
    event.preventDefault();
    const text = query.trim();
    if (!text) return;
    // Only the dashboard supports search for now, so jump there from other pages
    const onDashboard = pathname === "/" || pathname.startsWith("/dashboard");
    if (!onDashboard) navigate(`/dashboard?search=${encodeURIComponent(text)}`);
  };

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-line bg-white px-7">
      <p className="text-sm text-mute">
        Operations / <span className="font-medium text-ink">{getPageTitle(pathname)}</span>
      </p>
      <div className="flex-1" />

      <form onSubmit={handleSearch} className="relative w-[340px] max-w-[40vw]">
        <Search size={16} className="absolute left-3 top-[10px] text-mute" />
        <input
          type="search"
          value={query}
          onChange={handleChange}
          placeholder="Search bookings, trips, vehicles"
          aria-label="Search"
          className="h-9 w-full rounded-md border border-line bg-slate-50 pl-9 pr-3 text-sm outline-none placeholder:text-mute focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20"
        />
      </form>

      <button
        type="button"
        aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
        onClick={() => navigate("/notifications")}
        className="relative grid h-9 w-9 place-items-center rounded-md text-mute hover:bg-slate-100"
      >
        <Bell size={17} strokeWidth={1.6} />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full border-2 border-white bg-bad px-1 text-[10px] font-bold leading-none text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
    </header>
  );
}