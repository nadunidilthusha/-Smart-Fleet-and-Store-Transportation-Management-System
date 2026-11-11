import SectionHeader from "./SectionHeader";

// Card C — operational stock status tiles and cargo handling flags

const STATUS_OPTIONS = [
  {
    value: "in_stock",
    title: "In Stock",
    description: "Ready for immediate dispatch",
    selected: "border-emerald-500 bg-emerald-50/70 ring-1 ring-emerald-500/20",
    radio: "border-emerald-600 bg-emerald-600",
  },
  {
    value: "low_stock",
    title: "Low Stock",
    description: "Flags reorder requirement",
    selected: "border-amber-400 bg-amber-50/70 ring-1 ring-amber-400/20",
    radio: "border-amber-500 bg-amber-500",
  },
  {
    value: "reorder_soon",
    title: "Reorder Soon",
    description: "Near threshold mark",
    selected: "border-blue-500 bg-blue-50/70 ring-1 ring-blue-500/20",
    radio: "border-blue-600 bg-blue-600",
  },
];

export default function StatusHandlingRequirements({
  values,
  errors,
  onStatusSelect,
  onToggleFlag,
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <SectionHeader
        title="Status & Handling Requirements"
        subtitle="Dispatch readiness and special cargo handling rules"
        icon={
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        }
      />

      <div>
        <p className="mb-3 text-sm font-semibold text-slate-700">
          Initial Operational Status <span className="text-red-500">*</span>
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {STATUS_OPTIONS.map((option) => {
            const isSelected = values.operationalStatus === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onStatusSelect(option.value)}
                className={[
                  "flex items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition",
                  isSelected ? option.selected : "border-slate-200 bg-white hover:border-slate-300",
                ].join(" ")}
              >
                <span
                  className={[
                    "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                    isSelected ? option.radio : "border-slate-300 bg-white",
                  ].join(" ")}
                >
                  {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-slate-800">{option.title}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{option.description}</span>
                </span>
              </button>
            );
          })}
        </div>
        {errors.operationalStatus && (
          <p className="mt-2 text-xs text-red-600">{errors.operationalStatus}</p>
        )}
      </div>

      <div className="mt-6">
        <p className="mb-3 text-sm font-semibold text-slate-700">Cargo Handling Specifications</p>
        <div className="space-y-3">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 px-4 py-3.5 transition hover:border-slate-300">
            <input
              type="checkbox"
              checked={Boolean(values.criticalHighSpec)}
              onChange={() => onToggleFlag("criticalHighSpec")}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>
              <span className="block text-sm font-semibold text-slate-800">
                Critical / High Spec (Temperature or Hazardous)
              </span>
              <span className="mt-0.5 block text-xs text-slate-500">
                Requires dedicated handling and temperature-controlled capacity.
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 px-4 py-3.5 transition hover:border-slate-300">
            <input
              type="checkbox"
              checked={Boolean(values.stackable)}
              onChange={() => onToggleFlag("stackable")}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>
              <span className="block text-sm font-semibold text-slate-800">Stackable Cargo</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                May be stacked during loading to improve trailer utilization.
              </span>
            </span>
          </label>
        </div>
      </div>
    </section>
  );
}
