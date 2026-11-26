import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react"; // You can remove 'Bell' from here since it's inside the new component
import { getPageTitle } from "../utils/constants";
import NotificationBell from "../components/common/NotificationBell";

export default function Topbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  // The search text lives in the URL (?search=...) so pages can read it
  const query = params.get("search") ?? "";

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

      <form onSubmit={handleSearch} className="relative w-85 max-w-[40vw]">
        <Search size={16} className="absolute left-3 top-2.5 text-mute" />
        <input
          type="search"
          value={query}
          onChange={handleChange}
          placeholder="Search bookings, trips, vehicles"
          aria-label="Search"
          className="h-9 w-full rounded-md border border-line bg-slate-50 pl-9 pr-3 text-sm outline-none placeholder:text-mute focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20"
        />
      </form>

      {/* --- REPLACED THE OLD BUTTON WITH THE NEW COMPONENT HERE --- */}
      <NotificationBell />
      
    </header>
  );
}