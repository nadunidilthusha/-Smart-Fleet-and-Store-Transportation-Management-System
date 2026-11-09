import OperationalStatusSelector from "./OperationalStatusSelector";

// Section 2 — driver, hub, mileage, fuel, and operational status

const DRIVER_OPTIONS = [
  { value: "drv-042", label: "Kamal Perera (DRV-042)" },
  { value: "drv-018", label: "Nimal Fernando (DRV-018)" },
  { value: "drv-027", label: "Sajith Silva (DRV-027)" },
  { value: "pool", label: "Pool Vehicle (Unassigned)" },
];

const HUB_OPTIONS = [
  { value: "biyagama", label: "Biyagama Distribution Hub" },
  { value: "ja-ela", label: "Ja-Ela Distribution Hub" },
  { value: "kandy", label: "Kandy Distribution Hub" },
];

// Shared select/input styling with error-aware borders
const fieldClass = (hasError) =>
  [
    "w-full rounded-lg border bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition",
    "placeholder:text-slate-400",
    "focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20",
    hasError
      ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
      : "border-slate-200 hover:border-slate-300",
  ].join(" ");

export default function AssignmentAndInitialStatus({
  values,
  errors,
  onChange,
  onStatusSelect,
  disabled = false,
}) {
  // Derive a friendly label for the fuel slider readout
  const fuelPercent = Number(values.fuelLevel || 0);
  const fuelLabel =
    fuelPercent >= 80 ? "Full Tank" : fuelPercent >= 40 ? "Partial" : "Low Fuel";

  return (
    <section>
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-base font-semibold text-slate-900">
          <span className="mr-2 text-slate-400">2.</span>
          Assignment & Initial Status
        </h2>
        <p className="text-xs text-slate-400">Driver mapping and readiness state</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <label htmlFor="assignedDriver" className="mb-1.5 block text-xs font-semibold text-slate-700">
            Assigned Driver <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11a4 4 0 10-8 0 4 4 0 008 0zM4 20a8 8 0 0116 0" />
              </svg>
            </span>
            <select
              id="assignedDriver"
              name="assignedDriver"
              value={values.assignedDriver}
              onChange={onChange}
              className={`${fieldClass(Boolean(errors.assignedDriver))} pl-9`}
              aria-invalid={Boolean(errors.assignedDriver)}
            >
              <option value="">Select driver</option>
              {DRIVER_OPTIONS.map((driver) => (
                <option key={driver.value} value={driver.value}>
                  {driver.label}
                </option>
              ))}
            </select>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Active roster personnel or pool vehicle.</p>
          {errors.assignedDriver && (
            <p className="mt-1 text-xs text-red-600">{errors.assignedDriver}</p>
          )}
        </div>

        <div>
          <label htmlFor="currentHub" className="mb-1.5 block text-xs font-semibold text-slate-700">
            Current Location / Hub <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 10l2-5h12l2 5M4 10v9h16v-9M9 19v-5h6v5" />
              </svg>
            </span>
            <select
              id="currentHub"
              name="currentHub"
              value={values.currentHub}
              onChange={onChange}
              className={`${fieldClass(Boolean(errors.currentHub))} pl-9`}
              aria-invalid={Boolean(errors.currentHub)}
            >
              <option value="">Select hub</option>
              {HUB_OPTIONS.map((hub) => (
                <option key={hub.value} value={hub.value}>
                  {hub.label}
                </option>
              ))}
            </select>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Home base distribution facility.</p>
          {errors.currentHub && <p className="mt-1 text-xs text-red-600">{errors.currentHub}</p>}
        </div>

        <div>
          <label htmlFor="initialMileage" className="mb-1.5 block text-xs font-semibold text-slate-700">
            Initial Mileage (km) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="initialMileage"
              name="initialMileage"
              type="number"
              min="0"
              value={values.initialMileage}
              onChange={onChange}
              placeholder="12450"
              className={`${fieldClass(Boolean(errors.initialMileage))} pr-12`}
              aria-invalid={Boolean(errors.initialMileage)}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-slate-400">
              km
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Recorded odometer value on induction.</p>
          {errors.initialMileage && (
            <p className="mt-1 text-xs text-red-600">{errors.initialMileage}</p>
          )}
        </div>

        <div>
          <label htmlFor="fuelLevel" className="mb-1.5 block text-xs font-semibold text-slate-700">
            Current Fuel Level <span className="text-red-500">*</span>
          </label>
          {/* Fuel percentage slider with live readout */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">
                {fuelPercent}% ({fuelLabel})
              </span>
              <span className="text-slate-400">0–100%</span>
            </div>
            <input
              id="fuelLevel"
              name="fuelLevel"
              type="range"
              min="0"
              max="100"
              step="1"
              value={values.fuelLevel}
              onChange={onChange}
              disabled={disabled}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-blue-600"
            />
          </div>
          {errors.fuelLevel && <p className="mt-1 text-xs text-red-600">{errors.fuelLevel}</p>}
        </div>
      </div>

      {/* Nested operational status selector cards */}
      <OperationalStatusSelector
        value={values.operationalStatus}
        error={errors.operationalStatus}
        onSelect={onStatusSelect}
        disabled={disabled}
      />
    </section>
  );
}
