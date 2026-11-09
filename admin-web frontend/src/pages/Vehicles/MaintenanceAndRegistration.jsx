import VehicleDocumentUpload from "./VehicleDocumentUpload";

// Section 3 — compliance dates, service km, policy ref, and document upload

const fieldClass = (hasError) =>
  [
    "w-full rounded-lg border bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition",
    "placeholder:text-slate-400",
    "focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20",
    hasError
      ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
      : "border-slate-200 hover:border-slate-300",
  ].join(" ");

export default function MaintenanceAndRegistration({
  values,
  errors,
  onChange,
  onFilesChange,
  disabled = false,
}) {
  return (
    <section>
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-base font-semibold text-slate-900">
          <span className="mr-2 text-slate-400">3.</span>
          Maintenance & Registration Info
        </h2>
        <p className="text-xs text-slate-400">Compliance and service schedule</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label
            htmlFor="revenueLicenseExpiry"
            className="mb-1.5 block text-xs font-semibold text-slate-700"
          >
            Revenue License Expiry Date <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="revenueLicenseExpiry"
              name="revenueLicenseExpiry"
              type="date"
              value={values.revenueLicenseExpiry}
              onChange={onChange}
              className={`${fieldClass(Boolean(errors.revenueLicenseExpiry))} pr-3`}
              aria-invalid={Boolean(errors.revenueLicenseExpiry)}
            />
          </div>
          {errors.revenueLicenseExpiry && (
            <p className="mt-1 text-xs text-red-600">{errors.revenueLicenseExpiry}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="nextServiceDueKm"
            className="mb-1.5 block text-xs font-semibold text-slate-700"
          >
            Next Scheduled Service Due <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="nextServiceDueKm"
              name="nextServiceDueKm"
              type="number"
              min="0"
              value={values.nextServiceDueKm}
              onChange={onChange}
              placeholder="25000"
              className={`${fieldClass(Boolean(errors.nextServiceDueKm))} pr-12`}
              aria-invalid={Boolean(errors.nextServiceDueKm)}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-slate-400">
              km
            </span>
          </div>
          {errors.nextServiceDueKm && (
            <p className="mt-1 text-xs text-red-600">{errors.nextServiceDueKm}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="insurancePolicyRef"
            className="mb-1.5 block text-xs font-semibold text-slate-700"
          >
            Insurance Policy / Permit Ref <span className="text-red-500">*</span>
          </label>
          <input
            id="insurancePolicyRef"
            name="insurancePolicyRef"
            type="text"
            value={values.insurancePolicyRef}
            onChange={onChange}
            placeholder="INS-2024-88921"
            className={fieldClass(Boolean(errors.insurancePolicyRef))}
            aria-invalid={Boolean(errors.insurancePolicyRef)}
          />
          {errors.insurancePolicyRef && (
            <p className="mt-1 text-xs text-red-600">{errors.insurancePolicyRef}</p>
          )}
        </div>
      </div>

      {/* Document upload dropzone nested under section 3 */}
      <div className="mt-5">
        <VehicleDocumentUpload
          documents={values.documents}
          error={errors.documents}
          onFilesChange={onFilesChange}
          disabled={disabled}
        />
      </div>
    </section>
  );
}
