import SectionHeader from "./SectionHeader";

// Step 1 — store identity, type, and initial operational status

const STORE_TYPES = ["Regional Store", "Central Warehouse", "Distribution Hub", "Cold Storage"];

const STATUS_OPTIONS = [
  {
    value: "active",
    label: "Active",
    selected: "border-blue-500 bg-blue-50/60 ring-1 ring-blue-500/20",
    radio: "border-blue-600 bg-blue-600",
    dot: "bg-emerald-500",
  },
  {
    value: "high_capacity",
    label: "High Capacity",
    selected: "border-amber-400 bg-amber-50/60 ring-1 ring-amber-400/20",
    radio: "border-amber-500 bg-amber-500",
    dot: "bg-amber-500",
  },
  {
    value: "inactive",
    label: "Inactive",
    selected: "border-slate-400 bg-slate-50 ring-1 ring-slate-300/40",
    radio: "border-slate-500 bg-slate-500",
    dot: "bg-slate-400",
  },
];

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

export default function BasicStoreInformation({ values, errors, onChange, onStatusSelect }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <SectionHeader
        step="Step 1 of 4"
        title="Basic Store Information"
        subtitle="General identifier codes, classifications, and operational status"
        icon={
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 10l2-5h12l2 5M4 10v9h16v-9M9 19v-5h6v5" />
          </svg>
        }
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <label htmlFor="storeCode" className="text-sm font-semibold text-slate-700">
              Store Code <span className="text-red-500">*</span>
            </label>
            <button type="button" className="text-xs font-medium text-blue-600 hover:underline">
              Next sequential
            </button>
          </div>
          <div className="relative">
            <input
              id="storeCode"
              name="storeCode"
              type="text"
              value={values.storeCode}
              readOnly
              className={fieldClass(
                Boolean(errors.storeCode),
                "cursor-not-allowed border-blue-100 bg-blue-50/70 pr-10 font-medium text-blue-700"
              )}
              aria-invalid={Boolean(errors.storeCode)}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-blue-400">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 11V8a5 5 0 0110 0v3m-9 0h8a2 2 0 012 2v5a2 2 0 01-2 2H8a2 2 0 01-2-2v-5a2 2 0 012-2z" />
              </svg>
            </span>
          </div>
          <p className="mt-1.5 text-xs text-slate-400">Following STR-001, STR-002, and STR-003</p>
          {errors.storeCode && <p className="mt-1 text-xs text-red-600">{errors.storeCode}</p>}
        </div>

        <div>
          <label htmlFor="storeName" className="mb-1.5 block text-sm font-semibold text-slate-700">
            Store / Warehouse Name <span className="text-red-500">*</span>
          </label>
          <input
            id="storeName"
            name="storeName"
            type="text"
            value={values.storeName}
            onChange={onChange}
            placeholder="Kurunegala Regional Store"
            className={fieldClass(Boolean(errors.storeName))}
            aria-invalid={Boolean(errors.storeName)}
          />
          <p className="mt-1.5 text-xs text-slate-400">
            Designated official facility name displayed in dispatch tables.
          </p>
          {errors.storeName && <p className="mt-1 text-xs text-red-600">{errors.storeName}</p>}
        </div>

        <div>
          <label htmlFor="storeType" className="mb-1.5 block text-sm font-semibold text-slate-700">
            Store Type <span className="text-red-500">*</span>
          </label>
          <select
            id="storeType"
            name="storeType"
            value={values.storeType}
            onChange={onChange}
            className={fieldClass(Boolean(errors.storeType))}
            aria-invalid={Boolean(errors.storeType)}
          >
            <option value="">Select store type</option>
            {STORE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-slate-400">
            Aligns with system categorization and filter tabs.
          </p>
          {errors.storeType && <p className="mt-1 text-xs text-red-600">{errors.storeType}</p>}
        </div>

        <div>
          <p className="mb-1.5 text-sm font-semibold text-slate-700">
            Initial Operational Status <span className="text-red-500">*</span>
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Operational status">
            {STATUS_OPTIONS.map((option) => {
              const isSelected = values.operationalStatus === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => onStatusSelect(option.value)}
                  className={[
                    "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition",
                    "hover:border-slate-300",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                    isSelected ? option.selected : "border-slate-200 bg-white",
                  ].join(" ")}
                >
                  {/* Radio indicator */}
                  <span
                    className={[
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                      isSelected ? option.radio : "border-slate-300 bg-white",
                    ].join(" ")}
                  >
                    {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </span>
                  <span className="text-sm font-medium text-slate-800">{option.label}</span>
                  <span className={`ml-auto h-2 w-2 shrink-0 rounded-full ${option.dot}`} />
                </button>
              );
            })}
          </div>
          {errors.operationalStatus && (
            <p className="mt-2 text-xs text-red-600">{errors.operationalStatus}</p>
          )}
        </div>
      </div>
    </section>
  );
}
