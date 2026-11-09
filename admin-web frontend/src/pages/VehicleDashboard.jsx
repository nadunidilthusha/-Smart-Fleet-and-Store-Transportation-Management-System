import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getVehicles } from "../api/vehicleApi";

// Status tab keys used for filtering the vehicle table
const STATUS_TABS = ["All", "Available", "In Use", "Maintenance", "Inactive"];

// Visual tokens for each operational status badge
const STATUS_STYLES = {
  Available: {
    wrap: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    dot: "bg-emerald-500",
  },
  "In Use": {
    wrap: "bg-blue-50 text-blue-700 ring-blue-100",
    dot: "bg-blue-500",
  },
  Maintenance: {
    wrap: "bg-red-50 text-red-700 ring-red-100",
    dot: "bg-red-500",
  },
  Inactive: {
    wrap: "bg-slate-100 text-slate-600 ring-slate-200",
    dot: "bg-slate-400",
  },
};

// Pick fuel text color based on remaining percentage
const fuelClass = (fuel) => {
  if (fuel >= 50) return "text-emerald-600";
  if (fuel >= 25) return "text-amber-600";
  return "text-red-600";
};

export default function VehicleDashboard() {
  // Fleet rows loaded from vehicleApi (mock or HTTP)
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Active status tab controlling which vehicles appear in the table
  const [activeTab, setActiveTab] = useState("All");
  // Free-text search across ID, plate, and driver
  const [searchQuery, setSearchQuery] = useState("");
  // Vehicle type dropdown filter
  const [typeFilter, setTypeFilter] = useState("All");

  // Load vehicles whenever the dashboard mounts
  const loadVehicles = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getVehicles();
      setVehicles(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || "Unable to load vehicles.");
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  // Derive unique vehicle types for the filter dropdown
  const vehicleTypes = useMemo(
    () => ["All", ...Array.from(new Set(vehicles.map((v) => v.type)))],
    [vehicles]
  );

  // Aggregate counts powering the summary cards and tab badges
  const counts = useMemo(() => {
    const base = {
      Total: vehicles.length,
      Available: 0,
      "In Use": 0,
      Maintenance: 0,
      Inactive: 0,
    };
    vehicles.forEach((vehicle) => {
      if (base[vehicle.status] != null) base[vehicle.status] += 1;
    });
    return base;
  }, [vehicles]);

  // Apply tab, search, and type filters to the master vehicle list
  const filteredVehicles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return vehicles.filter((vehicle) => {
      const matchesTab = activeTab === "All" || vehicle.status === activeTab;
      const matchesType = typeFilter === "All" || vehicle.type === typeFilter;
      const matchesSearch =
        !query ||
        vehicle.id.toLowerCase().includes(query) ||
        vehicle.plate.toLowerCase().includes(query) ||
        vehicle.driver.toLowerCase().includes(query);
      return matchesTab && matchesType && matchesSearch;
    });
  }, [vehicles, activeTab, searchQuery, typeFilter]);

  // Build and download a simple CSV export of the currently filtered rows
  const handleExportCsv = () => {
    const headers = [
      "Vehicle ID",
      "Plate Number",
      "Vehicle Type",
      "Model",
      "Assigned Driver",
      "Capacity",
      "Current Location / Hub",
      "Mileage",
      "Fuel %",
      "Status",
    ];
    const rows = filteredVehicles.map((vehicle) => [
      vehicle.id,
      vehicle.plate,
      vehicle.type,
      vehicle.model,
      vehicle.driver,
      vehicle.capacity,
      vehicle.hub,
      vehicle.mileage,
      `${vehicle.fuel}%`,
      vehicle.status,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "fleetline-vehicles.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  // Summary card configuration aligned to the uploaded Vehicles UI
  const summaryCards = [
    {
      key: "Total",
      label: "Total Vehicles",
      value: counts.Total,
      hint: "Across all distribution hubs",
      iconBg: "bg-amber-50 text-amber-500",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13h11V6H3v7zm11 0h4l3 3v2h-2.5a2 2 0 11-4 0H10a2 2 0 11-4 0H3v-2h11z" />
        </svg>
      ),
    },
    {
      key: "Available",
      label: "Available",
      value: counts.Available,
      hint: "Ready for trip assignment",
      iconBg: "bg-emerald-50 text-emerald-500",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 12a8 8 0 0114.9-4M20 12a8 8 0 01-14.9 4M8 8l1-4 4 1M16 16l-1 4-4-1" />
        </svg>
      ),
    },
    {
      key: "In Use",
      label: "In Use",
      value: counts["In Use"],
      hint: "Currently on active trips",
      iconBg: "bg-blue-50 text-blue-500",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 3L4 14h7l-1 7 9-11h-7l1-7z" />
        </svg>
      ),
    },
    {
      key: "Maintenance",
      label: "Maintenance",
      value: counts.Maintenance,
      hint: "Oldest waiting 3 h",
      iconBg: "bg-red-50 text-red-500",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.7 6.3a4 4 0 00-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 005.4-5.4l-2.5 2.5-2.5-2.5 2.5-2.5z" />
        </svg>
      ),
    },
    {
      key: "Inactive",
      label: "Inactive",
      value: counts.Inactive,
      hint: "Parked / offline units",
      iconBg: "bg-slate-100 text-slate-500",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636A9 9 0 115.636 18.364 9 9 0 0118.364 5.636zM6.34 6.34l11.32 11.32" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex min-h-full flex-col">
      {/* Summary metric cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((card) => (
          <button
            key={card.key}
            type="button"
            onClick={() => setActiveTab(card.key === "Total" ? "All" : card.key)}
            className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-slate-500">{card.label}</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                  {card.value}
                </p>
              </div>
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.iconBg}`}>
                {card.icon}
              </span>
            </div>
            <p className="mt-3 text-[11px] text-slate-400">{card.hint}</p>
          </button>
        ))}
      </div>

      {/* Main vehicles panel */}
      <section className="flex-1 rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Panel header with export and add actions */}
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Vehicles</h1>
            <p className="mt-1 text-sm text-slate-500">Manage and monitor fleet vehicles</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v10m0 0l-3-3m3 3l3-3M5 18h14" />
              </svg>
              Export CSV
            </button>
            <Link
              to="/vehicles/add"
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              + Add Vehicle
            </Link>
          </div>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-5 sm:px-6">
          {STATUS_TABS.map((tab) => {
            const count = tab === "All" ? counts.Total : counts[tab];
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={[
                  "whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition",
                  isActive
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-800",
                ].join(" ")}
              >
                {tab}{" "}
                <span className={isActive ? "text-blue-500" : "text-slate-400"}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Search + type filters */}
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.3-4.3M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
              </svg>
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search vehicle ID, plate number, or driver..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 sm:min-w-48"
          >
            {vehicleTypes.map((type) => (
              <option key={type} value={type}>
                {type === "All" ? "All vehicle types" : type}
              </option>
            ))}
          </select>
        </div>

        {/* Vehicles data table */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="whitespace-nowrap px-5 py-3 sm:px-6">Vehicle ID</th>
                <th className="whitespace-nowrap px-4 py-3">Plate Number</th>
                <th className="whitespace-nowrap px-4 py-3">Vehicle Type & Model</th>
                <th className="whitespace-nowrap px-4 py-3">Assigned Driver</th>
                <th className="whitespace-nowrap px-4 py-3">Capacity</th>
                <th className="whitespace-nowrap px-4 py-3">Current Location / Hub</th>
                <th className="whitespace-nowrap px-4 py-3">Mileage / Fuel</th>
                <th className="whitespace-nowrap px-5 py-3 sm:px-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-slate-500">
                    Loading vehicles…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-red-600">
                    {error}{" "}
                    <button type="button" onClick={loadVehicles} className="font-medium underline">
                      Retry
                    </button>
                  </td>
                </tr>
              ) : filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-slate-500">
                    No vehicles match the current filters.
                  </td>
                </tr>
              ) : (
                filteredVehicles.map((vehicle) => {
                  const statusStyle = STATUS_STYLES[vehicle.status] || STATUS_STYLES.Inactive;
                  const isUnassigned = vehicle.driver === "Unassigned";

                  return (
                    <tr key={vehicle.id} className="transition hover:bg-slate-50/80">
                      <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-900 sm:px-6">
                        {vehicle.id}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-700">{vehicle.plate}</td>
                      <td className="min-w-48 px-4 py-4">
                        <p className="font-medium text-slate-800">{vehicle.type}</p>
                        <p className="text-xs text-slate-400">{vehicle.model}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        {isUnassigned ? (
                          <span className="italic text-slate-400">Unassigned</span>
                        ) : (
                          <span className="text-slate-700">{vehicle.driver}</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-700">{vehicle.capacity}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-700">{vehicle.hub}</td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <p className="text-slate-700">{vehicle.mileage}</p>
                        <p className={`text-xs font-semibold ${fuelClass(vehicle.fuel)}`}>
                          Fuel {vehicle.fuel}%
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 sm:px-6">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusStyle.wrap}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
                          {vehicle.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer count */}
        <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500 sm:px-6">
          Showing {filteredVehicles.length} of {counts.Total} vehicles
        </div>
      </section>
    </div>
  );
}
