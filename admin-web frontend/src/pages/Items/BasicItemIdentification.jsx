import SectionHeader from "./SectionHeader";

// Card A — item code, name, category, and primary storage hub

const CATEGORIES = [
  "Finished Goods",
  "Raw Materials",
  "Sub-Assemblies",
  "Spare Parts & Fasteners",
];

const STORAGE_HUBS = [
  "Main Store / Biyagama Central",
  "Ja-Ela Distribution Center",
  "Kandy Regional Store",
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

export default function BasicItemIdentification({ values, errors, onChange }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <SectionHeader
        title="Basic Item Identification"
        subtitle="SKU codes, naming conventions, and catalog classification"
        icon={
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"
            />
          </svg>
        }
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="itemCode" className="mb-1.5 block text-sm font-semibold text-slate-700">
            Item Code / SKU <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="itemCode"
              name="itemCode"
              type="text"
              value={values.itemCode}
              readOnly
              className={fieldClass(
                Boolean(errors.itemCode),
                "cursor-not-allowed border-blue-100 bg-blue-50/70 pr-10 font-medium text-blue-700"
              )}
              aria-invalid={Boolean(errors.itemCode)}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-blue-400">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7 11V8a5 5 0 0110 0v3m-9 0h8a2 2 0 012 2v5a2 2 0 01-2 2H8a2 2 0 01-2-2v-5a2 2 0 012-2z"
                />
              </svg>
            </span>
          </div>
          <p className="mt-1.5 text-xs text-slate-400">Auto-generated sequential catalog identifier</p>
          {errors.itemCode && <p className="mt-1 text-xs text-red-600">{errors.itemCode}</p>}
        </div>

        <div>
          <label htmlFor="itemName" className="mb-1.5 block text-sm font-semibold text-slate-700">
            Item Name <span className="text-red-500">*</span>
          </label>
          <input
            id="itemName"
            name="itemName"
            type="text"
            value={values.itemName}
            onChange={onChange}
            placeholder="e.g. Steel Flange (100mm) or Aluminum Casing v3"
            className={fieldClass(Boolean(errors.itemName))}
            aria-invalid={Boolean(errors.itemName)}
          />
          <p className="mt-1.5 text-xs text-slate-400">
            Official product name shown in dispatch and booking tables.
          </p>
          {errors.itemName && <p className="mt-1 text-xs text-red-600">{errors.itemName}</p>}
        </div>

        <div>
          <label htmlFor="category" className="mb-1.5 block text-sm font-semibold text-slate-700">
            Catalog Category <span className="text-red-500">*</span>
          </label>
          <select
            id="category"
            name="category"
            value={values.category}
            onChange={onChange}
            className={fieldClass(Boolean(errors.category))}
            aria-invalid={Boolean(errors.category)}
          >
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-slate-400">
            Defines material classification for logistics tracking.
          </p>
          {errors.category && <p className="mt-1 text-xs text-red-600">{errors.category}</p>}
        </div>

        <div>
          <label htmlFor="storageHub" className="mb-1.5 block text-sm font-semibold text-slate-700">
            Primary Storage Hub <span className="text-red-500">*</span>
          </label>
          <select
            id="storageHub"
            name="storageHub"
            value={values.storageHub}
            onChange={onChange}
            className={fieldClass(Boolean(errors.storageHub))}
            aria-invalid={Boolean(errors.storageHub)}
          >
            {STORAGE_HUBS.map((hub) => (
              <option key={hub} value={hub}>
                {hub}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-slate-400">
            Default warehouse where this SKU is stocked first.
          </p>
          {errors.storageHub && <p className="mt-1 text-xs text-red-600">{errors.storageHub}</p>}
        </div>
      </div>
    </section>
  );
}
