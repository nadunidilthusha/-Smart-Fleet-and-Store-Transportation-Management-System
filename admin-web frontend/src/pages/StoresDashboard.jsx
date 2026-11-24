import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { deleteStore, getStore, getStoreRecords, parseStoreError, STORE_TYPES } from "../api/storeApi";

// Tab keys mapped to store type filters
const TYPE_TABS = [{ key: "All", label: "All" }, ...STORE_TYPES.map((type) => ({ key: type, label: type }))];

// Percentage of capacity in use (0 when no capacity is set yet, e.g. drafts)
const usedPercent = (store) => (store.capacityM3 > 0 ? Math.round((store.usedM3 / store.capacityM3) * 100) : 0);

const STATUS_STYLES = {
  Active: {
    wrap: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    dot: "bg-emerald-500",
  },
  "High Capacity": {
    wrap: "bg-amber-50 text-amber-700 ring-amber-100",
    dot: "bg-amber-500",
  },
  Inactive: {
    wrap: "bg-slate-100 text-slate-600 ring-slate-200",
    dot: "bg-slate-400",
  },
};

// Format cubic meters into compact k labels for the capacity column
const formatM3 = (value) => {
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return `${value}`;
};

export default function StoresDashboard() {
  // Store rows loaded from storeApi master-data list
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Active type tab controlling which stores appear in the table
  const [activeTab, setActiveTab] = useState("All");
  // Free-text search across store name and code
  const [searchQuery, setSearchQuery] = useState("");
  // Dropdown filters for type and operational status
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  // Track which row action menu is open
  const [openMenu, setOpenMenu] = useState(null);
  // Delete flow: store awaiting confirmation, the code being deleted, and the success/error banner
  const [storeToDelete, setStoreToDelete] = useState(null);
  const [deletingId, setDeletingId] = useState("");
  const [notice, setNotice] = useState(null);
  // View details dialog: the code opened, the record loaded from the backend, and its loading/error state
  const [detailsCode, setDetailsCode] = useState("");
  const [details, setDetails] = useState(null);
  const [detailsError, setDetailsError] = useState("");

  // Load store master records whenever the dashboard mounts
  const loadStores = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getStoreRecords();
      setStores(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(parseStoreError(err, "Unable to load stores.").message);
      setStores([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  // Fetch the full store record from the backend whenever the details dialog is opened
  useEffect(() => {
    if (!detailsCode) return undefined;
    let active = true;
    setDetails(null);
    setDetailsError("");
    getStore(detailsCode)
      .then((record) => active && setDetails(record))
      .catch((err) => active && setDetailsError(parseStoreError(err, "Unable to load store details.").message));
    return () => {
      active = false;
    };
  }, [detailsCode]);

  // Delete flow: confirm in a dialog, call DELETE /stores/:id, then reload the list
  const handleConfirmDelete = async () => {
    if (!storeToDelete || deletingId) return;
    const { code } = storeToDelete;
    setDeletingId(code);
    try {
      const result = await deleteStore(code);
      setNotice({ type: "success", message: result?.message || `Store ${code} deleted successfully.` });
      setStoreToDelete(null);
      await loadStores();
    } catch (err) {
      setNotice({ type: "error", message: parseStoreError(err, "Unable to delete this store.").message });
      setStoreToDelete(null);
    } finally {
      setDeletingId("");
    }
  };

  // Aggregate KPI values from the loaded store network
  const metrics = useMemo(() => {
    const totalCapacity = stores.reduce((sum, store) => sum + store.capacityM3, 0);
    const totalUsed = stores.reduce((sum, store) => sum + store.usedM3, 0);
    const districts = new Set(stores.map((store) => store.district).filter((district) => district && district !== "—"));
    const utilization = totalCapacity
      ? Math.round((totalUsed / totalCapacity) * 100)
      : 0;
    return {
      totalStores: stores.length,
      activeHubs: stores.filter((s) => s.status !== "Inactive").length,
      utilization,
      lowStockAlerts: stores.filter((s) => s.lowStock).length,
      storageCapacity: totalCapacity,
      districts: districts.size,
    };
  }, [stores]);

  // Count stores per type tab for badge display
  const tabCounts = useMemo(() => {
    const counts = { All: stores.length };
    TYPE_TABS.forEach((tab) => {
      if (tab.key !== "All") {
        counts[tab.key] = stores.filter((store) => store.type === tab.key).length;
      }
    });
    return counts;
  }, [stores]);

  // Apply tab, search, type, and status filters together
  const filteredStores = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return stores.filter((store) => {
      const matchesTab = activeTab === "All" || store.type === activeTab;
      const matchesType = typeFilter === "All" || store.type === typeFilter;
      const matchesStatus = statusFilter === "All" || store.status === statusFilter;
      const matchesSearch =
        !query ||
        store.code.toLowerCase().includes(query) ||
        store.name.toLowerCase().includes(query) ||
        store.manager.toLowerCase().includes(query) ||
        store.district.toLowerCase().includes(query);
      return matchesTab && matchesType && matchesStatus && matchesSearch;
    });
  }, [stores, activeTab, searchQuery, typeFilter, statusFilter]);

  // Build and download a CSV export of the currently filtered rows
  const handleExportCsv = () => {
    const headers = [
      "Store Code",
      "Store Name",
      "Type",
      "Manager",
      "Phone",
      "District",
      "Assigned Vehicles",
      "Capacity Used %",
      "Used m3",
      "Capacity m3",
      "Status",
    ];
    const rows = filteredStores.map((store) => {
      const pct = usedPercent(store);
      return [
        store.code,
        store.name,
        store.type,
        store.manager,
        store.phone,
        store.district,
        store.vehicles,
        `${pct}%`,
        store.usedM3,
        store.capacityM3,
        store.status,
      ];
    });
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "fleetline-stores.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  // KPI card configuration aligned to the uploaded Stores dashboard mock
  const summaryCards = [
    {
      label: "Total Stores",
      value: metrics.totalStores,
      hint: `Across ${metrics.districts} district${metrics.districts === 1 ? "" : "s"}`,
      iconBg: "bg-amber-50 text-amber-700",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h6l2 2h10v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
        </svg>
      ),
    },
    {
      label: "Active Hubs",
      value: metrics.activeHubs,
      hint: "Normal operations",
      iconBg: "bg-emerald-50 text-emerald-600",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4zm-1 12l5-5-1.4-1.4L11 12.2l-1.6-1.6L8 12l3 3z" />
        </svg>
      ),
    },
    {
      label: "Utilization",
      value: `${metrics.utilization}%`,
      hint: "Average capacity used",
      iconBg: "bg-blue-50 text-blue-600",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a9 9 0 100 18 9 9 0 000-18zm0 0v9l6 3" />
        </svg>
      ),
    },
    {
      label: "Low Stock Alerts",
      value: metrics.lowStockAlerts,
      hint: "Requires replenishment",
      iconBg: "bg-red-50 text-red-500",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 11-6 0" />
        </svg>
      ),
    },
    {
      label: "Storage Capacity",
      value: metrics.storageCapacity.toLocaleString(),
      hint: "Total network volume (m³)",
      iconBg: "bg-indigo-50 text-indigo-600",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16M7 7v10m10-10v10" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex min-h-full flex-col">
      {/* Result of the last delete attempt */}
      {notice && (
        <div
          role="status"
          className={`mb-4 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
            notice.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          <span>{notice.message}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss message" className="font-semibold">
            ×
          </button>
        </div>
      )}

      {/* Page header with export and add actions */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Stores & Warehouses</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage warehouse locations, inventory hubs, and store operations.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v10m0 0l-3-3m3 3l3-3M5 18h14" />
            </svg>
            Export CSV
          </button>
          <Link
            to="/stores/add"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            + Add Store
          </Link>
        </div>
      </div>

      {/* Summary KPI cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
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
          </div>
        ))}
      </div>

      {/* Main stores table panel */}
      <section className="flex-1 rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Type filter tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-5 sm:px-6">
          {TYPE_TABS.map((tab) => {
            const count = tabCounts[tab.key] ?? 0;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={[
                  "whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition",
                  isActive
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-800",
                ].join(" ")}
              >
                {tab.label}{" "}
                <span className={isActive ? "text-blue-500" : "text-slate-400"}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Search + type/status filters */}
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center sm:px-6">
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
              placeholder="Search store name, code..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 lg:min-w-44"
          >
            <option value="All">Store Type: All</option>
            {STORE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 lg:min-w-40"
          >
            <option value="All">Status: All</option>
            <option value="Active">Status: Active</option>
            <option value="High Capacity">Status: High Capacity</option>
            <option value="Inactive">Status: Inactive</option>
          </select>
        </div>

        {/* Stores data table */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="whitespace-nowrap px-5 py-3 sm:px-6">Store Code</th>
                <th className="whitespace-nowrap px-4 py-3">Store Name</th>
                <th className="whitespace-nowrap px-4 py-3">Type</th>
                <th className="whitespace-nowrap px-4 py-3">Manager / Contact</th>
                <th className="whitespace-nowrap px-4 py-3">District</th>
                <th className="whitespace-nowrap px-4 py-3">Assigned Vehicles</th>
                <th className="min-w-48 whitespace-nowrap px-4 py-3">Capacity Used</th>
                <th className="whitespace-nowrap px-4 py-3">Status</th>
                <th className="whitespace-nowrap px-5 py-3 text-right sm:px-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-sm text-slate-500">
                    Loading stores…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-sm text-red-600">
                    {error}{" "}
                    <button type="button" onClick={loadStores} className="font-medium underline">
                      Retry
                    </button>
                  </td>
                </tr>
              ) : filteredStores.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-sm text-slate-500">
                    No stores match the current filters.
                  </td>
                </tr>
              ) : (
                filteredStores.map((store) => {
                  const pct = usedPercent(store);
                  const isHigh = pct >= 85;
                  const statusStyle = STATUS_STYLES[store.status] || STATUS_STYLES.Active;

                  return (
                    <tr key={store.code} className="transition hover:bg-slate-50/80">
                      <td className="whitespace-nowrap px-5 py-4 sm:px-6">
                        <Link
                          to={`/stores/${encodeURIComponent(store.code)}/edit`}
                          className="font-semibold text-blue-600 hover:underline"
                        >
                          {store.code}
                        </Link>
                      </td>
                      <td className="min-w-44 px-4 py-4 font-medium text-slate-800">{store.name}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-600">{store.type}</td>
                      <td className="min-w-40 px-4 py-4">
                        <p className="font-medium text-slate-800">{store.manager}</p>
                        <p className="text-xs text-slate-400">{store.phone}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-700">{store.district}</td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-100">
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13h11V6H3v7zm11 0h4l3 3v2h-2.5a2 2 0 11-4 0H10a2 2 0 11-4 0H3v-2h11z" />
                          </svg>
                          {store.vehicles} Vehicles
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                          <span className={`font-semibold ${isHigh ? "text-amber-600" : "text-blue-600"}`}>
                            {pct}%
                          </span>
                          <span className="text-slate-400">
                            {formatM3(store.usedM3)} / {formatM3(store.capacityM3)} m³
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${isHigh ? "bg-amber-500" : "bg-blue-500"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusStyle.wrap}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
                          {store.status}
                        </span>
                        {store.isDraft && (
                          <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                            Draft
                          </span>
                        )}
                      </td>
                      <td className="relative whitespace-nowrap px-5 py-4 text-right sm:px-6">
                        <button
                          type="button"
                          aria-label={`Actions for ${store.code}`}
                          onClick={() =>
                            setOpenMenu((prev) => (prev === store.code ? null : store.code))
                          }
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                            <circle cx="12" cy="5" r="1.5" />
                            <circle cx="12" cy="12" r="1.5" />
                            <circle cx="12" cy="19" r="1.5" />
                          </svg>
                        </button>
                        {openMenu === store.code && (
                          <div className="absolute right-5 z-10 mt-1 w-36 rounded-lg border border-slate-200 bg-white py-1 text-left shadow-lg sm:right-6">
                            <Link
                              to={`/stores/${encodeURIComponent(store.code)}/edit`}
                              className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                              onClick={() => setOpenMenu(null)}
                            >
                              Edit store
                            </Link>
                            <button
                              type="button"
                              className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                              onClick={() => {
                                setOpenMenu(null);
                                setDetailsCode(store.code);
                              }}
                            >
                              View details
                            </button>
                            <button
                              type="button"
                              disabled={deletingId === store.code}
                              className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                              onClick={() => {
                                setOpenMenu(null);
                                setStoreToDelete(store);
                              }}
                            >
                              {deletingId === store.code ? "Deleting…" : "Delete"}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer count + simple pagination controls */}
        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>
            Showing {filteredStores.length} of {stores.length} stores
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled
              className="rounded-md px-2.5 py-1.5 text-slate-400 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              type="button"
              className="rounded-md bg-blue-600 px-2.5 py-1.5 font-semibold text-white"
            >
              1
            </button>
            <button
              type="button"
              disabled
              className="rounded-md px-2.5 py-1.5 text-slate-400 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {/* Delete confirmation dialog: nothing is deleted until the user confirms */}
      {storeToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-store-title"
          onKeyDown={(event) => event.key === "Escape" && !deletingId && setStoreToDelete(null)}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 id="delete-store-title" className="text-lg font-semibold text-slate-900">
              Delete store?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to delete <span className="font-semibold">{storeToDelete.code}</span> (
              {storeToDelete.name})? This permanently removes the store and cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                autoFocus
                onClick={() => setStoreToDelete(null)}
                disabled={Boolean(deletingId)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={Boolean(deletingId)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-400"
              >
                {deletingId ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Store details dialog: the record is fetched from the backend when opened */}
      {detailsCode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="store-details-title"
          onKeyDown={(event) => event.key === "Escape" && setDetailsCode("")}
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 id="store-details-title" className="text-lg font-semibold text-slate-900">
              Store details
            </h2>
            {detailsError ? (
              <p className="mt-4 text-sm text-red-600">{detailsError}</p>
            ) : !details ? (
              <p className="mt-4 text-sm text-slate-500">Loading store…</p>
            ) : (
              <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                {[
                  ["Store code", details.code],
                  ["Name", details.name],
                  ["Type", details.type],
                  ["Status", details.isDraft ? `${details.status} (Draft)` : details.status],
                  ["Manager", details.manager],
                  ["Phone", details.phone],
                  ["Dispatch email", details.dispatchEmail || "—"],
                  ["District", details.district],
                  ["Address", details.address || "—"],
                  ["Capacity", `${details.capacityM3.toLocaleString()} m³`],
                  ["Alert threshold", details.alertThreshold === "" ? "—" : `${details.alertThreshold}%`],
                  ["Loading bays", details.loadingBays === "" ? "—" : details.loadingBays],
                  ["Assigned vehicles", details.assignedVehicles.length ? details.assignedVehicles.join(", ") : "None"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs font-medium text-slate-400">{label}</dt>
                    <dd className="mt-0.5 break-words text-slate-800">{value}</dd>
                  </div>
                ))}
              </dl>
            )}
            <div className="mt-6 flex justify-end gap-2">
              {details && (
                <Link
                  to={`/stores/${encodeURIComponent(details.code)}/edit`}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Edit store
                </Link>
              )}
              <button
                type="button"
                autoFocus
                onClick={() => setDetailsCode("")}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
