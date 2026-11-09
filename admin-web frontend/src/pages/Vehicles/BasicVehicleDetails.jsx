// Section 1 — identity and chassis fields matching the FleetLine mockup

const VEHICLE_TYPE_MODELS = [
  "Isuzu NPR 75 (Light Truck)",
  "Mitsubishi Canter (Light Truck)",
  "Toyota Hilux (Pickup)",
  "Tata Ace (Mini Truck)",
  "Ashok Leyland Partner (Van)",
];

// Shared input chrome used across basic detail fields
const fieldClass = (hasError) =>
  [
    "w-full rounded-lg border bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition",
    "placeholder:text-slate-400",
    "focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20",
    "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400",
    hasError
      ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
      : "border-slate-200 hover:border-slate-300",
  ].join(" ");

export default function BasicVehicleDetails({ values, errors, onChange, onSuggestId }) {
  return (
    <section>
      {/* Numbered section header with right-aligned helper copy */}
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-base font-semibold text-slate-900">
          <span className="mr-2 text-slate-400">1.</span>
          Basic Vehicle Details
        </h2>
        <p className="text-xs text-slate-400">Core identification and chassis specs</p>
      </div>

      {/* Connected fleet network coverage callout */}
      <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50/80 px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-4.5 7-11a7 7 0 10-14 0c0 6.5 7 11 7 11z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-800">Connected Fleet Network Coverage</p>
              <p className="mt-0.5 text-xs text-slate-500">
                This vehicle will sync across Biyagama, Ja-Ela, and Kandy distribution hubs.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {["Biyagama", "Ja-Ela", "Kandy"].map((hub, index) => (
              <span key={hub} className="flex items-center gap-2 text-xs font-medium text-blue-700">
                <span className="rounded-full bg-white px-2.5 py-1 shadow-sm ring-1 ring-blue-100">
                  {hub}
                </span>
                {index < 2 && <span className="hidden text-blue-300 sm:inline">→</span>}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Four-up identity field grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <label htmlFor="vehicleId" className="mb-1.5 block text-xs font-semibold text-slate-700">
            Vehicle ID <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="vehicleId"
              name="vehicleId"
              type="text"
              value={values.vehicleId}
              onChange={onChange}
              placeholder="VEH-2024-089"
              className={`${fieldClass(Boolean(errors.vehicleId))} pr-10`}
              aria-invalid={Boolean(errors.vehicleId)}
            />
            {/* Magic suggest control for the next auto ID */}
            <button
              type="button"
              onClick={onSuggestId}
              title="Suggest next Vehicle ID"
              className="absolute inset-y-0 right-0 flex items-center px-3 text-blue-500 transition hover:text-blue-700"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l1.5 4.5L11 9 6.5 10.5 5 15l-1.5-4.5L-1 9l4.5-1.5L5 3zm10 4l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3zm-5 7l.8 2.2L13 17l-2.2.8L10 20l-.8-2.2L7 17l2.2-.8L10 14z" transform="translate(2 1)" />
              </svg>
            </button>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Auto-suggested next ID.</p>
          {errors.vehicleId && <p className="mt-1 text-xs text-red-600">{errors.vehicleId}</p>}
        </div>

        <div>
          <label htmlFor="plateNumber" className="mb-1.5 block text-xs font-semibold text-slate-700">
            Plate Number <span className="text-red-500">*</span>
          </label>
          <input
            id="plateNumber"
            name="plateNumber"
            type="text"
            value={values.plateNumber}
            onChange={onChange}
            placeholder="WP CAA-1234"
            className={fieldClass(Boolean(errors.plateNumber))}
            aria-invalid={Boolean(errors.plateNumber)}
          />
          <p className="mt-1 text-[11px] text-slate-400">Provincial license plate format.</p>
          {errors.plateNumber && <p className="mt-1 text-xs text-red-600">{errors.plateNumber}</p>}
        </div>

        <div>
          <label htmlFor="vehicleTypeModel" className="mb-1.5 block text-xs font-semibold text-slate-700">
            Vehicle Type & Model <span className="text-red-500">*</span>
          </label>
          <select
            id="vehicleTypeModel"
            name="vehicleTypeModel"
            value={values.vehicleTypeModel}
            onChange={onChange}
            className={fieldClass(Boolean(errors.vehicleTypeModel))}
            aria-invalid={Boolean(errors.vehicleTypeModel)}
          >
            <option value="">Select type & model</option>
            {VEHICLE_TYPE_MODELS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-slate-400">Standardized fleet chassis model.</p>
          {errors.vehicleTypeModel && (
            <p className="mt-1 text-xs text-red-600">{errors.vehicleTypeModel}</p>
          )}
        </div>

        <div>
          <label htmlFor="capacityKg" className="mb-1.5 block text-xs font-semibold text-slate-700">
            Capacity (kg) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="capacityKg"
              name="capacityKg"
              type="number"
              min="0"
              value={values.capacityKg}
              onChange={onChange}
              placeholder="3500"
              className={`${fieldClass(Boolean(errors.capacityKg))} pr-12`}
              aria-invalid={Boolean(errors.capacityKg)}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-slate-400">
              kg
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Max rated payload limit.</p>
          {errors.capacityKg && <p className="mt-1 text-xs text-red-600">{errors.capacityKg}</p>}
        </div>
      </div>
    </section>
  );
}
