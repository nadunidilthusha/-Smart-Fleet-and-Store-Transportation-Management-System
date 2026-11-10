import SectionHeader from "./SectionHeader";

// Step 3 — capacity, alert threshold, docks, and projected utilization meter

const fieldClass = (hasError, extra = "") =>
  [
    "w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition",
    "placeholder:text-slate-400",
    "focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20",
    hasError
      ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
      : "border-slate-200 hover:border-slate-300",
    extra,
  ].join(" ");

export default function StorageCapacityThresholds({ values, errors, onChange }) {
  // New facilities start empty, so projected utilization remains at zero
  const capacity = Number(String(values.storageCapacity || "0").replace(/,/g, "")) || 0;
  const used = 0;
  const utilization = capacity > 0 ? Math.round((used / capacity) * 100) : 0;
  const available = Math.max(capacity - used, 0);
  const capacityLabel = capacity >= 1000 ? `${Math.round(capacity / 1000)}k` : `${capacity}`;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <SectionHeader
        step="Step 3 of 4"
        title="Storage Capacity & Utilization Thresholds"
        subtitle="Rated volume, high-capacity alerts, and dock infrastructure"
        icon={
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-6 4h6" />
          </svg>
        }
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div>
          <label htmlFor="storageCapacity" className="mb-1.5 block text-sm font-semibold text-slate-700">
            Storage Capacity (m³) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="storageCapacity"
              name="storageCapacity"
              type="number"
              min="1"
              value={values.storageCapacity}
              onChange={onChange}
              placeholder="25000"
              className={fieldClass(Boolean(errors.storageCapacity), "pr-12")}
              aria-invalid={Boolean(errors.storageCapacity)}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-slate-400">
              m³
            </span>
          </div>
          {errors.storageCapacity && (
            <p className="mt-1 text-xs text-red-600">{errors.storageCapacity}</p>
          )}
        </div>

        <div>
          <label htmlFor="alertThreshold" className="mb-1.5 block text-sm font-semibold text-slate-700">
            High Capacity Alert Threshold <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="alertThreshold"
              name="alertThreshold"
              type="number"
              min="1"
              max="100"
              value={values.alertThreshold}
              onChange={onChange}
              placeholder="90"
              className={fieldClass(Boolean(errors.alertThreshold), "pr-10")}
              aria-invalid={Boolean(errors.alertThreshold)}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-slate-400">
              %
            </span>
          </div>
          {errors.alertThreshold && (
            <p className="mt-1 text-xs text-red-600">{errors.alertThreshold}</p>
          )}
        </div>

        <div>
          <label htmlFor="loadingBays" className="mb-1.5 block text-sm font-semibold text-slate-700">
            Loading Bays / Docks
          </label>
          <div className="relative">
            <input
              id="loadingBays"
              name="loadingBays"
              type="number"
              min="1"
              value={values.loadingBays}
              onChange={onChange}
              placeholder="4"
              className={fieldClass(Boolean(errors.loadingBays), "pr-10")}
              aria-invalid={Boolean(errors.loadingBays)}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13h11V6H3v7zm11 0h4l3 3v2h-2.5a2 2 0 11-4 0H10a2 2 0 11-4 0H3v-2h11z" />
              </svg>
            </span>
          </div>
          {errors.loadingBays && <p className="mt-1 text-xs text-red-600">{errors.loadingBays}</p>}
        </div>
      </div>

      {/* Projected utilization meter matching the mock layout */}
      <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-800">Projected Initial Capacity Utilization</p>
          <p className="text-sm font-semibold text-blue-600">
            {utilization}% (0k / {capacityLabel} m³)
          </p>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-200/80">
          <div
            className="h-full rounded-full bg-blue-500 transition-all"
            style={{ width: `${Math.max(utilization, 1)}%` }}
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>{available.toLocaleString()} m³ Available</span>
          <span>Max Capacity Limit: {capacity.toLocaleString()} m³</span>
        </div>
      </div>
    </section>
  );
}
