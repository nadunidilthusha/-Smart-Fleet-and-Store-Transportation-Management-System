import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getItemRecords } from "../api/itemApi";

// Tab keys mapped to catalog category filters
const CATEGORY_TABS = [
  { key: "All", label: "All" },
  { key: "Finished Goods", label: "Finished Goods" },
  { key: "Raw Materials", label: "Raw Materials" },
  { key: "Sub-Assemblies", label: "Sub-Assemblies" },
  { key: "Spare Parts & Fasteners", label: "Spare Parts & Fasteners" },
];

const STATUS_STYLES = {
  "In Stock": {
    wrap: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    dot: "bg-emerald-500",
  },
  "Low Stock": {
    wrap: "bg-amber-50 text-amber-700 ring-amber-100",
    dot: "bg-amber-500",
  },
  "Reorder Soon": {
    wrap: "bg-blue-50 text-blue-700 ring-blue-100",
    dot: "bg-blue-500",
  },
  "Critical Low": {
    wrap: "bg-red-50 text-red-700 ring-red-100",
    dot: "bg-red-500",
  },
};

const CATEGORY_STYLES = {
  "Finished Goods": "bg-blue-50 text-blue-700 ring-blue-100",
  "Raw Materials": "bg-amber-50 text-amber-700 ring-amber-100",
  "Sub-Assemblies": "bg-violet-50 text-violet-700 ring-violet-100",
  "Spare Parts & Fasteners": "bg-slate-100 text-slate-700 ring-slate-200",
};

// Shorten hub labels for denser table cells when needed
const shortHub = (hub) => {
  if (!hub) return "—";
  if (hub.includes("Main Store")) return "Main Store";
  return hub.replace(" / Biyagama Central", "");
};

export default function ItemsDashboard() {
  // Item rows loaded from itemApi master-data list
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Active category tab controlling which items appear in the table
  const [activeTab, setActiveTab] = useState("All");
  // Free-text search across item code, SKU, and name
  const [searchQuery, setSearchQuery] = useState("");
  // Dropdown filters for category, hub, and stock status
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [hubFilter, setHubFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Load item master records whenever the dashboard mounts
  const loadItems = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getItemRecords();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || "Unable to load items.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Aggregate KPI values from the loaded catalog
  const metrics = useMemo(() => {
    const hubs = new Set(items.map((item) => shortHub(item.hub)));
    return {
      totalItems: items.length,
      activeStores: hubs.size || 3,
      inStock: items.filter((item) => item.status === "In Stock").length,
      lowStock: items.filter(
        (item) => item.status === "Low Stock" || item.status === "Critical Low"
      ).length,
      criticalHighSpec: items.filter((item) => item.criticalHighSpec).length,
    };
  }, [items]);

  // Count items per category tab for badge display
  const tabCounts = useMemo(() => {
    const counts = { All: items.length };
    CATEGORY_TABS.forEach((tab) => {
      if (tab.key !== "All") {
        counts[tab.key] = items.filter((item) => item.category === tab.key).length;
      }
    });
    return counts;
  }, [items]);

  // Unique hubs derived from records for the hub filter dropdown
  const hubOptions = useMemo(() => {
    const unique = [...new Set(items.map((item) => shortHub(item.hub)))];
    return unique.sort();
  }, [items]);

  // Apply tab, search, category, hub, and status filters together
  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return items.filter((item) => {
      const hubLabel = shortHub(item.hub);
      const matchesTab = activeTab === "All" || item.category === activeTab;
      const matchesCategory = categoryFilter === "All" || item.category === categoryFilter;
      const matchesHub = hubFilter === "All" || hubLabel === hubFilter;
      const matchesStatus = statusFilter === "All" || item.status === statusFilter;
      const matchesSearch =
        !query ||
        item.code.toLowerCase().includes(query) ||
        item.name.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query);
      return matchesTab && matchesCategory && matchesHub && matchesStatus && matchesSearch;
    });
  }, [items, activeTab, searchQuery, categoryFilter, hubFilter, statusFilter]);

  // Build and download a CSV export of the currently filtered rows
  const handleExportCsv = () => {
    const headers = [
      "Item Code",
      "Item Name",
      "Category",
      "Storage Hub",
      "Weight Kg",
      "Volume m3",
      "Stock On Hand",
      "Stock Unit",
      "Reorder Level",
      "Status",
      "Critical High Spec",
    ];
    const rows = filteredItems.map((item) => [
      item.code,
      item.name,
      item.category,
      shortHub(item.hub),
      item.weightKg,
      item.volumeM3,
      item.stockOnHand,
      item.stockUnit,
      item.reorderLevel,
      item.status,
      item.criticalHighSpec ? "Yes" : "No",
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "fleetline-items.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  // KPI card configuration aligned to the uploaded Items dashboard mock
  const summaryCards = [
    {
      label: "Total Manufactured Items",
      value: metrics.totalItems.toLocaleString(),
      hint: `Across ${metrics.activeStores} active stores`,
      iconBg: "bg-blue-50 text-blue-600",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
      ),
    },
    {
      label: "Ready for Dispatch / In Stock",
      value: metrics.inStock.toLocaleString(),
      hint: "Ready for assignment",
      iconBg: "bg-emerald-50 text-emerald-600",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Low Stock",
      value: metrics.lowStock.toLocaleString(),
      hint: "Requires reorder / restock",
      iconBg: "bg-amber-50 text-amber-600",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
          />
        </svg>
      ),
    },
    {
      label: "Critical / High Spec",
      value: metrics.criticalHighSpec.toLocaleString(),
      hint: "Temperature & hazardous",
      iconBg: "bg-red-50 text-red-500",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex min-h-full flex-col">
      {/* Page header with export and add actions */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Items & Cargo Catalog</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage manufactured goods, raw materials, and spare parts across stores.
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
            to="/items/add"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            + Add Item
          </Link>
        </div>
      </div>

      {/* Summary KPI cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

      {/* Main items table panel */}
      <section className="flex-1 rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Category filter tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-5 sm:px-6">
          {CATEGORY_TABS.map((tab) => {
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

        {/* Search + category/hub/status filters */}
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center sm:px-6">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-4.3-4.3M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z"
                />
              </svg>
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search item code, SKU, or name..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 lg:min-w-44"
          >
            <option value="All">Category: All</option>
            <option value="Finished Goods">Finished Goods</option>
            <option value="Raw Materials">Raw Materials</option>
            <option value="Sub-Assemblies">Sub-Assemblies</option>
            <option value="Spare Parts & Fasteners">Spare Parts & Fasteners</option>
          </select>
          <select
            value={hubFilter}
            onChange={(event) => setHubFilter(event.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 lg:min-w-44"
          >
            <option value="All">Hub: All</option>
            {hubOptions.map((hub) => (
              <option key={hub} value={hub}>
                {hub}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 lg:min-w-40"
          >
            <option value="All">Status: All</option>
            <option value="In Stock">In Stock</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Reorder Soon">Reorder Soon</option>
            <option value="Critical Low">Critical Low</option>
          </select>
        </div>

        {/* Items data table */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="whitespace-nowrap px-5 py-3 sm:px-6">Item Code</th>
                <th className="whitespace-nowrap px-4 py-3">Item Name</th>
                <th className="whitespace-nowrap px-4 py-3">Category</th>
                <th className="whitespace-nowrap px-4 py-3">Storage Hub</th>
                <th className="whitespace-nowrap px-4 py-3">Unit Weight / Vol</th>
                <th className="whitespace-nowrap px-4 py-3">Stock On Hand</th>
                <th className="whitespace-nowrap px-4 py-3">Reorder Level</th>
                <th className="whitespace-nowrap px-4 py-3">Status</th>
                <th className="whitespace-nowrap px-5 py-3 text-right sm:px-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-sm text-slate-500">
                    Loading items…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-sm text-red-600">
                    {error}{" "}
                    <button type="button" onClick={loadItems} className="font-medium underline">
                      Retry
                    </button>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-sm text-slate-500">
                    No items match the current filters.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const statusStyle = STATUS_STYLES[item.status] || STATUS_STYLES["In Stock"];
                  const categoryStyle =
                    CATEGORY_STYLES[item.category] || CATEGORY_STYLES["Finished Goods"];
                  const isLow =
                    item.status === "Low Stock" || item.status === "Critical Low";

                  return (
                    <tr key={item.code} className="transition hover:bg-slate-50/80">
                      <td className="whitespace-nowrap px-5 py-4 sm:px-6">
                        <Link
                          to="/items/add"
                          className="font-semibold text-blue-600 hover:underline"
                        >
                          {item.code}
                        </Link>
                      </td>
                      <td className="min-w-44 px-4 py-4 font-medium text-slate-800">{item.name}</td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${categoryStyle}`}
                        >
                          {item.category}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-700">
                        {shortHub(item.hub)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                        {item.weightKg} kg • {item.volumeM3} m³
                      </td>
                      <td
                        className={[
                          "whitespace-nowrap px-4 py-4 font-medium",
                          isLow ? "text-red-600" : "text-slate-800",
                        ].join(" ")}
                      >
                        {item.stockOnHand.toLocaleString()} {item.stockUnit}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-700">
                        {item.reorderLevel}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusStyle.wrap}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
                          {item.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right sm:px-6">
                        <Link
                          to="/items/add"
                          aria-label={`Edit ${item.code}`}
                          className="inline-flex rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15.232 5.232l3.536 3.536M4 20h4.586a1 1 0 00.707-.293l9.586-9.586a2 2 0 000-2.828l-2.172-2.172a2 2 0 00-2.828 0L4.293 14.707A1 1 0 004 15.414V20z"
                            />
                          </svg>
                        </Link>
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
            Showing {filteredItems.length} of {items.length} items
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
    </div>
  );
}
