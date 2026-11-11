import SectionHeader from "./SectionHeader";

// Card B — unit weight/volume plus initial stock and reorder threshold

const fieldClass = (hasError) =>
  [
    "w-full rounded-lg border bg-white py-2.5 pl-3 pr-14 text-sm text-slate-800 outline-none transition",
    "placeholder:text-slate-400",
    "focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20",
    hasError
      ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
      : "border-slate-200 hover:border-slate-300",
  ].join(" ");

function NumberField({
  id,
  name,
  label,
  value,
  onChange,
  error,
  placeholder,
  suffix,
  hint,
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label} <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={fieldClass(Boolean(error))}
          aria-invalid={Boolean(error)}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-slate-400">
          {suffix}
        </span>
      </div>
      {hint && <p className="mt-1.5 text-xs text-slate-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default function PhysicalSpecsStockLevels({ values, errors, onChange }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <SectionHeader
        title="Physical Specifications & Stock Levels"
        subtitle="Unit dimensions and inventory thresholds used by trip planning"
        icon={
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 6h18M3 12h18M3 18h18M7 6v12m10-12v12"
            />
          </svg>
        }
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <NumberField
          id="weightKg"
          name="weightKg"
          label="Unit Weight (kg)"
          value={values.weightKg}
          onChange={onChange}
          error={errors.weightKg}
          placeholder="4.5"
          suffix="kg"
          hint="Used for vehicle load planning and axle checks."
        />
        <NumberField
          id="volumeM3"
          name="volumeM3"
          label="Unit Volume (m³)"
          value={values.volumeM3}
          onChange={onChange}
          error={errors.volumeM3}
          placeholder="0.02"
          suffix="m³"
          hint="Used for trailer space and bay allocation."
        />
        <NumberField
          id="stockOnHand"
          name="stockOnHand"
          label="Initial Stock on Hand"
          value={values.stockOnHand}
          onChange={onChange}
          error={errors.stockOnHand}
          placeholder="150"
          suffix="Units"
          hint="Opening quantity recorded at the primary hub."
        />
        <NumberField
          id="reorderLevel"
          name="reorderLevel"
          label="Reorder Level"
          value={values.reorderLevel}
          onChange={onChange}
          error={errors.reorderLevel}
          placeholder="50"
          suffix="Limit"
          hint="Triggers low-stock alerts when on-hand falls below this."
        />
      </div>
    </section>
  );
}
