import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, Check } from "lucide-react";
import { getNotifications, markNotificationRead, markAllNotificationsRead } from "../../api/notificationApi";
import { formatShortDateTime } from "../../utils/formatters";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const data = await getNotifications();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load notifications", err);
    }
  }, []);

  // Fetch on load, every 15 seconds, and when returning to the tab
  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 15000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchAlerts();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchAlerts]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleToggle = () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen) fetchAlerts();
  };

  const handleMarkRead = async (id, e) => {
    e.stopPropagation();
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await markNotificationRead(id);
    } catch (err) {
      console.error("Failed to mark notification read", err);
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await markAllNotificationsRead();
    } catch (err) {
      console.error("Failed to mark all notifications read", err);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        aria-label="Notifications"
        onClick={handleToggle}
        className="relative grid h-9 w-9 place-items-center rounded-md text-mute hover:bg-slate-100"
      >
        <Bell size={17} strokeWidth={1.6} />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 grid h-4 w-4 place-items-center rounded-full border-2 border-white bg-bad text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-80 rounded-lg border border-line bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h3 className="text-sm font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs text-brand hover:underline">
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-[350px] overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-6 text-center text-sm text-mute">No notifications yet.</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex gap-3 border-b border-line p-4 last:border-0 hover:bg-slate-50 ${!n.read ? "bg-blue-50/30" : ""}`}
                >
                  <div className="mt-0.5">
                    <span className={`block h-2 w-2 rounded-full ${!n.read ? "bg-brand" : "bg-transparent"}`} />
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm ${!n.read ? "font-semibold text-ink" : "text-slate-700"}`}>{n.title}</p>
                    <p className="mt-1 text-[13px] leading-snug text-mute">{n.message}</p>
                    <p className="mt-1.5 text-[11px] text-slate-400">{formatShortDateTime(n.createdAt)}</p>
                  </div>
                  {!n.read && (
                    <button
                      onClick={(e) => handleMarkRead(n.id, e)}
                      className="mt-0.5 shrink-0 text-mute hover:text-brand"
                      title="Mark as read"
                    >
                      <Check size={16} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}