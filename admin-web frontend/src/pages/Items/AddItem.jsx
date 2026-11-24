import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  createItem,
  getItem,
  getNextItemCode,
  mapItemRecordToForm,
  parseItemError,
  updateItem,
} from "../../api/itemApi";
import { getStores } from "../../api/storeApi";
import BasicItemIdentification from "./BasicItemIdentification";
import PhysicalSpecsStockLevels from "./PhysicalSpecsStockLevels";
import StatusHandlingRequirements from "./StatusHandlingRequirements";
import { validateItemForm } from "./FormValidation";

// Empty form for a new item; the item code is filled with the next free code from the backend
const INITIAL_FORM = {
  itemCode: "",
  itemName: "",
  category: "Finished Goods",
  storageHub: "", // set to the first store (by code) from the backend once the stores load
  unit: "unit",
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

// Add Item form; the same form is reused for editing at /items/:id/edit
export default function AddItem() {
  // Item code from the URL when editing (undefined when adding)
  const { id: editId } = useParams();
  const isEdit = Boolean(editId);
  // While editing, wait for the saved item before showing the form
  const [isLoading, setIsLoading] = useState(isEdit);
  // Whether the item being edited is still a draft (keeps the Save as Draft button available)
  const [wasDraft, setWasDraft] = useState(false);
  // Store the item is currently saved in (code + name), kept selectable even if that store is now inactive
  const [savedHub, setSavedHub] = useState(null);
  // Hold the full cargo-item registration payload in one controlled object
  const [formData, setFormData] = useState(INITIAL_FORM);
  // Track per-field validation messages after submit or live clear
  const [errors, setErrors] = useState({});
  // Reflect save-in-progress UI for draft and primary actions
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Surface a short success banner after a save
  const [submitSuccess, setSubmitSuccess] = useState("");
  // Stores for the Primary Storage Hub dropdown (GET /stores) with their loading/error state
  const [stores, setStores] = useState([]);
  const [storesLoading, setStoresLoading] = useState(true);
  const [storesError, setStoresError] = useState("");
  // Anchor used to scroll the page when validation fails
  const formTopRef = useRef(null);
  const navigate = useNavigate();

  // Keep the browser tab title aligned with this form page
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${isEdit ? "Edit" : "Add"} Item | Smart Fleet`;
    return () => {
      document.title = previousTitle;
    };
  }, [isEdit]);

  // Add mode: ask the backend for the next free item code
  const loadNextCode = async () => {
    try {
      const code = await getNextItemCode();
      setFormData((prev) => ({ ...prev, itemCode: code }));
      clearFieldError("itemCode");
    } catch (err) {
      setErrors((prev) => ({ ...prev, form: parseItemError(err, "Unable to get the next item code.").message }));
    }
  };

  useEffect(() => {
    if (!isEdit) loadNextCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit]);

  // Edit mode: load the saved item from the backend
  useEffect(() => {
    if (!editId) return undefined;
    let active = true;
    setIsLoading(true);
    getItem(editId)
      .then((record) => {
        if (!active) return;
        setFormData(mapItemRecordToForm(record));
        setWasDraft(Boolean(record.isDraft));
        setSavedHub(record.hubCode ? { code: record.hubCode, name: record.hub } : null);
      })
      .catch((err) => {
        if (active) setErrors({ form: parseItemError(err, "Unable to load this item.").message });
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [editId]);

  // Load the real stores; when adding, default the hub to the first one
  useEffect(() => {
    let active = true;
    getStores()
      .then((list) => {
        if (!active) return;
        const options = Array.isArray(list) ? list : [];
        setStores(options);
        if (!editId) setFormData((prev) => (prev.storageHub ? prev : { ...prev, storageHub: options[0]?.code ?? "" }));
      })
      .catch(() => active && setStoresError("Unable to load stores."))
      .finally(() => active && setStoresLoading(false));
    return () => {
      active = false;
    };
  }, [editId]);

  // Dropdown options: the active stores, plus the item's current store when it is no longer in that list
  const storeOptions = useMemo(
    () =>
      savedHub && !stores.some((store) => store.code === savedHub.code)
        ? [{ id: savedHub.code, code: savedHub.code, name: savedHub.name }, ...stores]
        : stores,
    [stores, savedHub]
  );

  // Dismiss success feedback as soon as the user edits again
  const dismissSuccess = () => {
    if (submitSuccess) setSubmitSuccess("");
  };

  // Clear a single field error when that field changes
  function clearFieldError(name) {
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

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
      // Persist through itemApi (POST /items, or PATCH /items/:id when editing)
      if (isEdit) await updateItem(editId, formData, { asDraft });
      else await createItem(formData, { asDraft });
      setSubmitSuccess(
        asDraft
          ? "Draft saved. You can continue configuring this item later."
          : isEdit
            ? "Item updated successfully."
            : "Item added successfully. It is now available on the Items catalog."
      );
      if (!asDraft) {
        // Give the user a moment to see success, then return to the list
        setTimeout(() => navigate("/items"), 700);
      }
    } catch (err) {
      // Show the server message plus any per-field validation errors it returned
      const { message, fieldErrors } = parseItemError(err, "Unable to save item.");
      setErrors({ ...fieldErrors, form: message });
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
      {(!isEdit || wasDraft) && (
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={isSubmitting}
          className={outlineBtn}
        >
          Save as Draft
        </button>
      )}
      <button type="submit" disabled={isSubmitting} className={primaryBtn}>
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
        </svg>
        {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Add Item"}
      </button>
    </div>
  );

  // Edit mode: show a loading or error state until the saved item is available
  if (isEdit && (isLoading || errors.form) && !formData.itemName) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center text-sm shadow-sm">
        {isLoading ? (
          <span className="text-slate-500">Loading item…</span>
        ) : (
          <span className="text-red-600">
            {errors.form}{" "}
            <Link to="/items" className="font-medium underline">
              Back to Items
            </Link>
          </span>
        )}
      </div>
    );
  }

  return (
    <div>
      <div ref={formTopRef} />

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Page header with catalog sync badge */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {isEdit ? "Edit Cargo Item" : "Add Cargo Item"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {isEdit
                ? `Update details for item ${editId}.`
                : "Register a finished manufactured good, sub-assembly, or raw material across stores."}
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-100">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {storesLoading
              ? "Catalog status: Loading stores…"
              : `Catalog status: Active Sync (${stores.length} ${stores.length === 1 ? "Store" : "Stores"})`}
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

        <BasicItemIdentification
          values={formData}
          errors={errors}
          onChange={handleChange}
          stores={storeOptions}
          storesLoading={storesLoading}
          storesError={storesError}
        />

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
            {stores.length > 0
              ? `Item will be synchronized across ${stores.length} active ${stores.length === 1 ? "store" : "stores"} immediately upon saving.`
              : "Item will be synchronized across all active stores immediately upon saving."}
          </p>
          {renderActions()}
        </div>
      </form>
    </div>
  );
}
