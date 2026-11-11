import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createItem } from "../../api/itemApi";
import BasicItemIdentification from "./BasicItemIdentification";
import PhysicalSpecsStockLevels from "./PhysicalSpecsStockLevels";
import StatusHandlingRequirements from "./StatusHandlingRequirements";
import { validateItemForm } from "./FormValidation";

// Default values seeded to mirror the Add Cargo Item mock
const INITIAL_FORM = {
  itemCode: "ITM-1215",
  itemName: "",
  category: "Finished Goods",
  storageHub: "Main Store / Biyagama Central",
  weightKg: "",
  volumeM3: "",
  stockOnHand: "",
  reorderLevel: "",
  operationalStatus: "in_stock",
  criticalHighSpec: false,
  stackable: true,
};

const outlineBtn =
  "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-50";
const primaryBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-400";

export default function AddItem() {
  // Hold the full cargo-item registration payload in one controlled object
  const [formData, setFormData] = useState(INITIAL_FORM);
  // Track per-field validation messages after submit or live clear
  const [errors, setErrors] = useState({});
  // Reflect save-in-progress UI for draft and primary actions
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Surface a short success banner after a valid local submit
  const [submitSuccess, setSubmitSuccess] = useState("");
  // Anchor used to scroll the page when validation fails
  const formTopRef = useRef(null);
  // Incrementing counter used when resetting after a successful add
  const idCounterRef = useRef(1215);
  const navigate = useNavigate();

  // Keep the browser tab title aligned with this form page
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Add Item | Smart Fleet";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  // Dismiss success feedback as soon as the user edits again
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

  // Generic change handler for text, number, and select inputs
  const handleChange = (event) => {
    const { name, value } = event.target;
    dismissSuccess();
    setFormData((prev) => ({ ...prev, [name]: value }));
    clearFieldError(name);
  };

  // Update operational status from the status tile selector
  const handleStatusSelect = (status) => {
    dismissSuccess();
    setFormData((prev) => ({ ...prev, operationalStatus: status }));
    clearFieldError("operationalStatus");
  };

  // Toggle a boolean cargo-handling flag checkbox
  const handleToggleFlag = (name) => {
    dismissSuccess();
    setFormData((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  // Shared submit pipeline for draft and full add actions
  const submitForm = async ({ asDraft }) => {
    const nextErrors = validateItemForm(formData, { asDraft });
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    setIsSubmitting(true);
    try {
      // Persist through itemApi (mock store today; POST /items when backend exists)
      await createItem(formData, { asDraft });
      setSubmitSuccess(
        asDraft
          ? "Draft saved. You can continue configuring this item later."
          : "Item added successfully. It is now available on the Items catalog."
      );
      if (!asDraft) {
        idCounterRef.current += 1;
        setFormData({
          ...INITIAL_FORM,
          itemCode: `ITM-${idCounterRef.current}`,
          itemName: "",
        });
        setTimeout(() => navigate("/items"), 700);
      }
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        form: err?.response?.data?.message || err?.message || "Unable to save item.",
      }));
      formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Full validation submit for the primary Add Item action
  const handleSubmit = async (event) => {
    event.preventDefault();
    await submitForm({ asDraft: false });
  };

  // Lighter validation path used by Save as Draft
  const handleSaveDraft = async () => {
    await submitForm({ asDraft: true });
  };

  // Single footer action cluster (Cancel / Draft / Add)
  const renderActions = () => (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => navigate("/items")}
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
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
        </svg>
        {isSubmitting ? "Saving..." : "Add Item"}
      </button>
    </div>
  );

  return (
    <div>
      <div ref={formTopRef} />

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Page header with catalog sync badge */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Add Cargo Item</h1>
            <p className="mt-1 text-sm text-slate-500">
              Register a finished manufactured good, sub-assembly, or raw material across stores.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-100">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Catalog status: Active Sync (3 Stores)
          </span>
        </div>

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

        <BasicItemIdentification values={formData} errors={errors} onChange={handleChange} />

        <PhysicalSpecsStockLevels values={formData} errors={errors} onChange={handleChange} />

        <StatusHandlingRequirements
          values={formData}
          errors={errors}
          onStatusSelect={handleStatusSelect}
          onToggleFlag={handleToggleFlag}
        />

        {/* Footer sync note + action buttons */}
        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="flex items-start gap-2 text-xs text-slate-500 sm:items-center">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-emerald-600 sm:mt-0">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </span>
            Item will be synchronized across 3 active stores immediately upon saving.
          </p>
          {renderActions()}
        </div>
      </form>
    </div>
  );
}
