import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createVehicle } from "../../api/vehicleApi";
import BasicVehicleDetails from "./BasicVehicleDetails";
import AssignmentAndInitialStatus from "./AssignmentAndInitialStatus";
import MaintenanceAndRegistration from "./MaintenanceAndRegistration";
import { validateVehicleForm } from "./FormValidation";

// Default values seeded to mirror the FleetLine mockup example
const INITIAL_FORM = {
  vehicleId: "VEH-2024-089",
  plateNumber: "",
  vehicleTypeModel: "Isuzu NPR 75 (Light Truck)",
  capacityKg: "3500",
  assignedDriver: "drv-042",
  currentHub: "biyagama",
  initialMileage: "12450",
  fuelLevel: 85,
  operationalStatus: "available",
  revenueLicenseExpiry: "",
  nextServiceDueKm: "",
  insurancePolicyRef: "",
  documents: [],
};

// Shared action button styles for Cancel / Draft / Primary
const outlineBtn =
  "rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-50";
const primaryBtn =
  "inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-400";

export default function AddVehicle() {
  // Hold the full form payload in one controlled state object
  const [formData, setFormData] = useState(INITIAL_FORM);
  // Track per-field validation messages after submit or live clear
  const [errors, setErrors] = useState({});
  // Reflect save-in-progress UI for the primary action buttons
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Surface a short success banner after a valid local submit
  const [submitSuccess, setSubmitSuccess] = useState("");
  // Anchor used to scroll the page to the first validation problem
  const formTopRef = useRef(null);
  // Incrementing counter used when suggesting the next vehicle ID
  const idCounterRef = useRef(89);
  const navigate = useNavigate();

  // Keep the browser tab title in sync with this form page
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Add Vehicle | Smart Fleet";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  // Dismiss success feedback as soon as the user starts editing again
  const dismissSuccess = () => {
    if (submitSuccess) setSubmitSuccess("");
  };

  // Clear a single field error when that field changes
  const clearFieldError = (name) => {
    if (!errors[name]) return;
    setErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  // Generic change handler for text, number, select, range, and date inputs
  const handleChange = (event) => {
    const { name, value, type } = event.target;
    dismissSuccess();
    setFormData((prev) => ({
      ...prev,
      [name]: type === "range" ? Number(value) : value,
    }));
    clearFieldError(name);
  };

  // Update operational status from the tile selector component
  const handleOperationalStatus = (status) => {
    dismissSuccess();
    setFormData((prev) => ({ ...prev, operationalStatus: status }));
    clearFieldError("operationalStatus");
  };

  // Replace the documents array when files are added or removed
  const handleDocumentsChange = (files) => {
    dismissSuccess();
    setFormData((prev) => ({ ...prev, documents: files }));
    clearFieldError("documents");
  };

  // Suggest the next incremental FleetLine vehicle ID
  const handleSuggestId = () => {
    dismissSuccess();
    idCounterRef.current += 1;
    const nextId = `VEH-2024-${String(idCounterRef.current).padStart(3, "0")}`;
    setFormData((prev) => ({ ...prev, vehicleId: nextId }));
    clearFieldError("vehicleId");
  };

  // Shared submit pipeline for draft and full add actions
  const submitForm = async ({ asDraft }) => {
    const nextErrors = validateVehicleForm(formData, { asDraft });
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    setIsSubmitting(true);
    try {
      // Persist through vehicleApi (mock store today; POST /vehicles when backend exists)
      await createVehicle(formData, { asDraft });
      setSubmitSuccess(
        asDraft
          ? "Draft saved. You can continue editing this vehicle later."
          : "Vehicle added successfully. It is now available on the Vehicles list."
      );
      if (!asDraft) {
        setFormData(INITIAL_FORM);
        // Give the user a moment to see success, then return to the list
        setTimeout(() => navigate("/vehicles"), 700);
      }
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        form: err?.response?.data?.message || err?.message || "Unable to save vehicle.",
      }));
      formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Full validation submit for the primary Add Vehicle action
  const handleSubmit = async (event) => {
    event.preventDefault();
    await submitForm({ asDraft: false });
  };

  // Lighter validation path used by Save as Draft
  const handleSaveDraft = async () => {
    await submitForm({ asDraft: true });
  };

  return (
    <div>
      <div ref={formTopRef} />

      <form
        onSubmit={handleSubmit}
        noValidate
        className="rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        {/* Form header with back link */}
        <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
          <Link
            to="/vehicles"
            className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-blue-600"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Vehicles
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Add Vehicle</h1>
          <p className="mt-1 text-sm text-slate-500">
            Register and configure new vehicle for fleet operations across stores.
          </p>
        </div>

        <div className="space-y-8 px-5 py-6 sm:px-7">
          {/* Success and validation banners */}
          {submitSuccess && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {submitSuccess}
            </div>
          )}
          {(Object.keys(errors).length > 0 || errors.form) && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errors.form || "Please fix the highlighted fields before continuing."}
            </div>
          )}

          <BasicVehicleDetails
            values={formData}
            errors={errors}
            onChange={handleChange}
            onSuggestId={handleSuggestId}
          />

          <div className="border-t border-slate-100 pt-8">
            <AssignmentAndInitialStatus
              values={formData}
              errors={errors}
              onChange={handleChange}
              onStatusSelect={handleOperationalStatus}
              disabled={isSubmitting}
            />
          </div>

          <div className="border-t border-slate-100 pt-8">
            <MaintenanceAndRegistration
              values={formData}
              errors={errors}
              onChange={handleChange}
              onFilesChange={handleDocumentsChange}
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Footer sync note + single action button group */}
        <div className="flex flex-col gap-4 border-t border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <p className="flex items-center gap-2 text-xs text-slate-500">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
            </span>
            Vehicle details will sync across all 3 active distribution hubs immediately.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/vehicles")}
              disabled={isSubmitting}
              className={outlineBtn}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSubmitting}
              className={outlineBtn}
            >
              Save as Draft
            </button>
            <button type="submit" disabled={isSubmitting} className={primaryBtn}>
              {isSubmitting ? "Saving..." : "+ Add Vehicle"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
