import { NavLink, useNavigate } from "react-router-dom";
import {
  Calendar,
  CheckSquare,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Route,
  Truck,
} from "lucide-react";
import useAuth from "../hooks/useAuth";
import { APP_NAME, NAV_GROUPS } from "../utils/constants";
import { getInitials } from "../utils/formatters";
import { ROLE_LABELS } from "../utils/roles";

const ICONS = {
  dashboard: LayoutDashboard,
  bookings: ClipboardList,
  trips: Route,
  schedule: Calendar,
  items: CheckSquare,
};

export default function Sidebar() {
  const { user, logout, can } = useAuth();
  const navigate = useNavigate();

  // Keep only nav items the signed-in store role is allowed to open
  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.permission || can(item.permission)),
  })).filter((group) => group.items.length > 0);

  // End the session and return to the store login page
  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <aside className="flex w-59 shrink-0 flex-col bg-side px-2.5 py-3.5">
      <div className="flex items-center gap-2.5 px-2.5 pb-3 pt-1 text-[15px] font-semibold text-white">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-brand">
          <Truck size={16} strokeWidth={1.8} />
        </span>
        {APP_NAME}
      </div>

      {/* Active store context for this portal session */}
      <button
        type="button"
        className="mb-2 flex w-full items-center justify-between gap-2 rounded-md border border-white/10 bg-white/5 px-2.5 py-2 text-left text-[13px] text-slate-100 hover:bg-white/10"
      >
        <span className="truncate">{user?.storeName ?? "Main Store – Biyagama"}</span>
        <ChevronDown size={14} className="shrink-0 text-[#9db2d3]" />
      </button>

      <nav className="flex-1 overflow-y-auto">
        {visibleGroups.map((group) => (
          <div key={group.label ?? "main"}>
            {group.label && (
              <p className="px-2.5 pb-1.5 pt-4.5 text-xs text-[#8aa0c4]">{group.label}</p>
            )}
            {group.items.map((item) => {
              const Icon = ICONS[item.icon];
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `mb-px flex h-8.5 items-center gap-2.5 rounded-md px-2.5 text-sm ${
                      isActive
                        ? "bg-side-active text-white"
                        : "text-[#b4c3db] hover:bg-side-hover hover:text-white"
                    }`
                  }
                >
                  <Icon size={17} strokeWidth={1.6} />
                  {item.label}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-2.5 pt-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-7.5 w-7.5 shrink-0 place-items-center rounded-full bg-[#2f5c9f] text-xs font-semibold text-white">
            {getInitials(user?.name)}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium text-slate-100">{user?.name}</p>
            <p className="truncate text-xs text-[#9db2d3]">{ROLE_LABELS[user?.role] ?? ""}</p>
          </div>
          <button
            type="button"
            aria-label="Sign out"
            onClick={handleLogout}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-[#9db2d3] transition hover:bg-white/10 hover:text-white"
          >
            <LogOut size={15} strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </aside>
  );
}
