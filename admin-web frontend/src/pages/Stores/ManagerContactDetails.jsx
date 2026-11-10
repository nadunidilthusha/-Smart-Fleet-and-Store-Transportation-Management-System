import SectionHeader from "./SectionHeader";

// Step 2 — manager, phone, email, district, and facility address

const DISTRICTS = [
  "Kurunegala",
  "Colombo",
  "Gampaha",
  "Kandy",
  "Galle",
  "Jaffna",
  "Anuradhapura",
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

export default function ManagerContactDetails({ values, errors, onChange }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <SectionHeader
        step="Step 2 of 4"
        title="Manager & Contact Details"
        subtitle="Primary facility contact and physical location for dispatch coordination"
        icon={
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0" />
          </svg>
        }
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div>
          <label htmlFor="managerName" className="mb-1.5 block text-sm font-semibold text-slate-700">
            Manager Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="managerName"
              name="managerName"
              type="text"
              value={values.managerName}
              onChange={onChange}
              placeholder="Dilshan Fernando"
              className={fieldClass(Boolean(errors.managerName), "pr-10")}
              aria-invalid={Boolean(errors.managerName)}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0" />
              </svg>
            </span>
          </div>
          {errors.managerName && <p className="mt-1 text-xs text-red-600">{errors.managerName}</p>}
        </div>

        <div>
          <label htmlFor="contactPhone" className="mb-1.5 block text-sm font-semibold text-slate-700">
            Contact Phone <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="contactPhone"
              name="contactPhone"
              type="tel"
              value={values.contactPhone}
              onChange={onChange}
              placeholder="+94 77 123 4567"
              className={fieldClass(Boolean(errors.contactPhone), "pr-10")}
              aria-invalid={Boolean(errors.contactPhone)}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a2 2 0 012-2h2l2 4-2 1a12 12 0 006 6l1-2 4 2v2a2 2 0 01-2 2A15 15 0 014 5z" />
              </svg>
            </span>
          </div>
          {errors.contactPhone && <p className="mt-1 text-xs text-red-600">{errors.contactPhone}</p>}
        </div>

        <div>
          <label htmlFor="dispatchEmail" className="mb-1.5 block text-sm font-semibold text-slate-700">
            Dispatch Email <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="dispatchEmail"
              name="dispatchEmail"
              type="email"
              value={values.dispatchEmail}
              onChange={onChange}
              placeholder="dilshan.f@fleetline.com"
              className={fieldClass(Boolean(errors.dispatchEmail), "pr-10")}
              aria-invalid={Boolean(errors.dispatchEmail)}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16v12H4V6zm0 0l8 7 8-7" />
              </svg>
            </span>
          </div>
          {errors.dispatchEmail && (
            <p className="mt-1 text-xs text-red-600">{errors.dispatchEmail}</p>
          )}
        </div>
      </div>

      {/* District + address row with a 1:2 split */}
      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
        <div>
          <label htmlFor="district" className="mb-1.5 block text-sm font-semibold text-slate-700">
            District <span className="text-red-500">*</span>
          </label>
          <select
            id="district"
            name="district"
            value={values.district}
            onChange={onChange}
            className={fieldClass(Boolean(errors.district))}
            aria-invalid={Boolean(errors.district)}
          >
            <option value="">Select district</option>
            {DISTRICTS.map((district) => (
              <option key={district} value={district}>
                {district}
              </option>
            ))}
          </select>
          {errors.district && <p className="mt-1 text-xs text-red-600">{errors.district}</p>}
        </div>

        <div className="md:col-span-2">
          <label htmlFor="address" className="mb-1.5 block text-sm font-semibold text-slate-700">
            Physical Facility Address <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="address"
              name="address"
              type="text"
              value={values.address}
              onChange={onChange}
              placeholder="No. 124, Industrial Zone, Dambulla Road, Kurunegala"
              className={fieldClass(Boolean(errors.address), "pr-10")}
              aria-invalid={Boolean(errors.address)}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-4.5 7-11a7 7 0 10-14 0c0 6.5 7 11 7 11z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
            </span>
          </div>
          {errors.address && <p className="mt-1 text-xs text-red-600">{errors.address}</p>}
        </div>
      </div>
    </section>
  );
}
