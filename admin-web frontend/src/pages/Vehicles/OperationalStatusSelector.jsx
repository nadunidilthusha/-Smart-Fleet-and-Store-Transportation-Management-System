// Operational status tile group shown under Assignment & Initial Status

const OPERATIONAL_OPTIONS = [
  {
    value: "available",
    label: "Available",
    description: "Ready for dispatch",
    dot: "bg-emerald-500",
    selected: "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20",
  },
  {
    value: "in_use",
    label: "In Use",
    description: "Currently on trip",
    dot: "bg-blue-500",
    selected: "border-blue-500 bg-blue-50 ring-2 ring-blue-500/20",
  },
  {
    value: "maintenance",
    label: "Maintenance",
    description: "Workshop / repair",
    dot: "bg-red-500",
    selected: "border-red-500 bg-red-50 ring-2 ring-red-500/20",
  },
  {
    value: "inactive",
    label: "Inactive",
    description: "Parked / offline",
    dot: "bg-slate-400",
    selected: "border-slate-400 bg-slate-50 ring-2 ring-slate-400/20",
  },
];

export default function OperationalStatusSelector({ value, error, onSelect, disabled = false }) {
  return (
    <div className="mt-5">
      <p className="mb-2 text-xs font-semibold text-slate-700">
        Operational Status <span className="text-red-500">*</span>
      </p>

      {/* Four status cards in a responsive grid */}
      <div
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
        role="radiogroup"
        aria-label="Operational status"
      >
        {OPERATIONAL_OPTIONS.map((option) => {
          const isSelected = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() => onSelect(option.value)}
              className={[
                "flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition",
                "hover:border-slate-300 hover:shadow-sm",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50",
                isSelected ? option.selected : "border-slate-200 bg-white",
              ].join(" ")}
            >
              {/* Colored status indicator dot */}
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${option.dot}`} />
              <span>
                <span className="block text-sm font-semibold text-slate-800">{option.label}</span>
                <span className="mt-0.5 block text-[11px] text-slate-500">{option.description}</span>
              </span>
            </button>
          );
        })}
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
