import SectionHeader from "./SectionHeader";

// Step 4 — allocate default fleet vehicles to the new store hub

export default function AssignedFleetVehicles({
  selectedIds,
  error,
  onToggle,
  disabled = false,
  options = [],
  loading = false,
  loadError = "",
}) {
  // Real vehicles from the backend (GET /vehicles/options); there is no built-in fallback list
  const fleetOptions = options;
  const allocatedCount = selectedIds.length;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <SectionHeader
        step="Step 4 of 4"
        title="Assigned Fleet Vehicles"
        subtitle="Default vehicles assigned to this hub for immediate dispatch operations."
        icon={
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13h11V6H3v7zm11 0h4l3 3v2h-2.5a2 2 0 11-4 0H10a2 2 0 11-4 0H3v-2h11z" />
          </svg>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-800">Fleet allocation</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Every vehicle is listed. Only available vehicles, plus those already based here, can be selected. A vehicle belongs to one store at a time.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-100">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13h11V6H3v7zm11 0h4l3 3v2h-2.5a2 2 0 11-4 0H10a2 2 0 11-4 0H3v-2h11z" />
          </svg>
          {allocatedCount} Vehicles Allocated
        </span>
      </div>

      {loading && <p className="py-4 text-sm text-slate-500">Loading vehicles…</p>}
      {!loading && loadError && <p className="py-4 text-sm text-red-600">{loadError}</p>}
      {!loading && !loadError && fleetOptions.length === 0 && (
        <p className="py-4 text-sm text-slate-500">
          No vehicles found. Add a vehicle first, then assign it here.
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {fleetOptions.map((vehicle) => {
          const isSelected = selectedIds.includes(vehicle.id);
          // Vehicles based at another store stay visible but cannot be taken
          const locked = vehicle.selectable === false && !isSelected;
          const locationClass =
            vehicle.assignment === "other-store"
              ? "text-amber-700"
              : vehicle.assignment === "this-store" || isSelected
                ? "text-blue-700"
                : "text-emerald-600";

          return (
            <button
              key={vehicle.id}
              type="button"
              disabled={disabled || locked}
              onClick={() => !locked && onToggle(vehicle.id)}
              className={[
                "rounded-xl border p-4 text-left transition",
                "hover:shadow-sm",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50",
                isSelected
                  ? "border-blue-600 bg-white ring-1 ring-blue-600/10"
                  : "border-slate-200 bg-white hover:border-slate-300",
              ].join(" ")}
            >
              {/* Top-left selection checkbox */}
              <span
                className={[
                  "mb-3 flex h-5 w-5 items-center justify-center rounded border text-[10px] font-bold",
                  isSelected
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-300 bg-white text-transparent",
                ].join(" ")}
              >
                ✓
              </span>
              <p className="text-sm font-bold text-slate-900">
                {vehicle.id} • {vehicle.label}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Capacity: {vehicle.capacity} • {vehicle.model}
              </p>
              <p className={`mt-2 text-xs font-medium ${locationClass}`}>{vehicle.location || "Available"}</p>
            </button>
          );
        })}
      </div>

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
    </section>
  );
}
