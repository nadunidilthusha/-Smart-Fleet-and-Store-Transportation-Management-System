import { NavLink } from "react-router-dom";
import {
  BarChart3,
  Calendar,
  ClipboardList,
  LayoutDashboard,
  MapPin,
  Package,
  Plus,
  Route,
  Store,
  Truck,
  Users,
} from "lucide-react";
import useAuth from "../hooks/useAuth";
import { APP_NAME, NAV_GROUPS } from "../utils/constants";
import { getInitials } from "../utils/formatters";
import { ROLE_LABELS } from "../utils/roles";

const ICONS = {
  dashboard: LayoutDashboard,
  bookings: ClipboardList,
  trips: Route,
  planning: Plus,
  schedule: Calendar,
  map: MapPin,
  vehicles: Truck,
  stores: Store,
  items: Package,
  users: Users,
  reports: BarChart3,
};

export default function Sidebar() {
  const { user } = useAuth();

  return (
    <aside className="flex w-[236px] shrink-0 flex-col bg-side px-2.5 py-3.5">
      <div className="flex items-center gap-2.5 px-2.5 pb-4 pt-1 text-[15px] font-semibold text-white">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-brand">
          <Truck size={16} strokeWidth={1.8} />
        </span>
        {APP_NAME}
      </div>

      <nav className="flex-1 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.label ?? "main"}>
            {group.label && (
              <p className="px-2.5 pb-1.5 pt-[18px] text-xs text-[#8aa0c4]">{group.label}</p>
            )}
            {group.items.map((item) => {
              const Icon = ICONS[item.icon];
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `mb-px flex h-[34px] items-center gap-2.5 rounded-md px-2.5 text-sm ${
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

      <div className="flex items-center gap-2.5 border-t border-white/10 px-2.5 pt-3">
        <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-[#2f5c9f] text-xs font-semibold text-white">
          {getInitials(user?.name)}
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-medium text-slate-100">{user?.name}</p>
          <p className="truncate text-xs text-[#9db2d3]">{ROLE_LABELS[user?.role] ?? ""}</p>
        </div>
      </div>
    </aside>
  );
}