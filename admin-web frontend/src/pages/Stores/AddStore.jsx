import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  createStore,
  getNextStoreCode,
  getStore,
  getStoreRecords,
  mapStoreRecordToForm,
  parseStoreError,
  updateStore,
} from "../../api/storeApi";
import { getVehicleAllocationOptions } from "../../api/vehicleApi";
import BasicStoreInformation from "./BasicStoreInformation";
import ManagerContactDetails from "./ManagerContactDetails";
import StorageCapacityThresholds from "./StorageCapacityThresholds";
import AssignedFleetVehicles from "./AssignedFleetVehicles";
import { validateStoreForm } from "./FormValidation";

// Empty form for a new store; the store code is filled with the next free code from the backend
const INITIAL_FORM = {
  storeCode: "",
  storeName: "",
  storeType: "Regional Store",
  operationalStatus: "active",
  managerName: "",
  contactPhone: "",
  dispatchEmail: "",
  district: "",
  address: "",
  storageCapacity: "",
  alertThreshold: "90",
  loadingBays: "",
  assignedVehicles: [],
};

const outlineBtn =
  "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-50";
const primaryBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-400";

// Add Store form; the same form is reused for editing at /stores/:id/edit
export default function AddStore() {
  // Store code from the URL when editing (undefined when adding)
  const { id: editId } = useParams();
  const isEdit = Boolean(editId);
  // While editing, wait for the saved store before showing the form
  const [isLoading, setIsLoading] = useState(isEdit);
  // Whether the store being edited is still a draft (keeps the Save as Draft button available)
  const [wasDraft, setWasDraft] = useState(false);
  // Hold the full store registration payload in one controlled object
  const [formData, setFormData] = useState(INITIAL_FORM);
  // Track per-field validation messages after submit or live clear
  const [errors, setErrors] = useState({});
  // Reflect save-in-progress UI for draft and primary actions
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Surface a short success banner after a save
  const [submitSuccess, setSubmitSuccess] = useState("");
  // Fleet options for step-4 allocation (from vehicleApi) with their loading/error state
  const [fleetOptions, setFleetOptions] = useState([]);
  const [fleetLoading, setFleetLoading] = useState(true);
  const [fleetError, setFleetError] = useState("");
  // Existing stores, used for the network overview banner
  const [networkStores, setNetworkStores] = useState(null);
  // Anchor used to scroll the page when validation fails
  const formTopRef = useRef(null);
  const navigate = useNavigate();

  // Keep the browser tab title aligned with this form page
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${isEdit ? "Edit" : "Add"} Store | Smart Fleet`;
    return () => {
      document.title = previousTitle;
    };
  }, [isEdit]);

  // Add mode: ask the backend for the next free store code
  const loadNextCode = async () => {
    try {
      const code = await getNextStoreCode();
      setFormData((prev) => ({ ...prev, storeCode: code }));
      clearFieldError("storeCode");
    } catch (err) {
      setErrors((prev) => ({ ...prev, form: parseStoreError(err, "Unable to get the next store code.").message }));
    }
  };

  useEffect(() => {
    if (!isEdit) loadNextCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit]);

  // Edit mode: load the saved store (including its assigned vehicles) from the backend
  useEffect(() => {
    if (!editId) return undefined;
    let active = true;
    setIsLoading(true);
    getStore(editId)
      .then((record) => {
        if (!active) return;
        setFormData(mapStoreRecordToForm(record));
        setWasDraft(Boolean(record.isDraft));
      })
      .catch((err) => {
        if (active) setErrors({ form: parseStoreError(err, "Unable to load this store.").message });
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [editId]);

  // Load allocatable vehicles for the Assigned Fleet Vehicles step (plus this store's own vehicles when editing)
  useEffect(() => {
    let active = true;
    setFleetLoading(true);
    setFleetError("");
    getVehicleAllocationOptions(editId)
      .then((options) => {
        if (active) setFleetOptions(Array.isArray(options) ? options : []);
      })
      .catch((err) => {
        if (!active) return;
        setFleetOptions([]);
        setFleetError(parseStoreError(err, "Unable to load vehicles.").message);
      })
      .finally(() => {
        if (active) setFleetLoading(false);
      });
    return () => {
      active = false;
    };
  }, [editId]);

  // Load the existing stores once for the network overview banner
  useEffect(() => {
    let active = true;
    getStoreRecords()
      .then((records) => active && setNetworkStores(Array.isArray(records) ? records : []))
      .catch(() => active && setNetworkStores([]));
    return () => {
      active = false;
    };
  }, []);

  // Summary of the live store network (saved, non-draft, non-Inactive facilities)
  const network = useMemo(() => {
    const live = (networkStores ?? []).filter((store) => !store.isDraft && store.status !== "Inactive");
    const capacity = live.reduce((sum, store) => sum + store.capacityM3, 0);
    const used = live.reduce((sum, store) => sum + store.usedM3, 0);
    const districts = new Set(live.map((store) => store.district).filter((district) => district && district !== "—"));
    return {
      count: live.length,
      names: live.map((store) => store.name),
      districts: districts.size,
      capacity,
      utilization: capacity > 0 ? Math.round((used / capacity) * 100) : 0,
    };
  }, [networkStores]);

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

  // Update operational status from the step-1 tile selector
  const handleStatusSelect = (status) => {
    dismissSuccess();
    setFormData((prev) => ({ ...prev, operationalStatus: status }));
    clearFieldError("operationalStatus");
  };

  // Toggle a vehicle id into or out of the assigned fleet list
  const handleVehicleToggle = (vehicleId) => {
    dismissSuccess();
    setFormData((prev) => {
      const exists = prev.assignedVehicles.includes(vehicleId);
      const assignedVehicles = exists
        ? prev.assignedVehicles.filter((id) => id !== vehicleId)
        : [...prev.assignedVehicles, vehicleId];
      return { ...prev, assignedVehicles };
    });
    clearFieldError("assignedVehicles");
  };

  // Shared submit pipeline for draft and full add actions
  const submitForm = async ({ asDraft }) => {
    const nextErrors = validateStoreForm(formData, { asDraft });
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    setIsSubmitting(true);
    try {
      // Persist through storeApi (POST /stores, or PATCH /stores/:id when editing)
      if (isEdit) await updateStore(editId, formData, { asDraft });
      else await createStore(formData, { asDraft });
      setSubmitSuccess(
        asDraft
          ? "Draft saved. You can continue configuring this store later."
          : isEdit
            ? "Store updated successfully."
            : "Store added successfully. It is now available on the Stores list."
      );
      if (!asDraft) {
        // Give the user a moment to see success, then return to the list
        setTimeout(() => navigate("/stores"), 700);
      }
    } catch (err) {
      // Show the server message plus any per-field validation errors it returned
      const { message, fieldErrors } = parseStoreError(err, "Unable to save store.");
      setErrors({ ...fieldErrors, form: message });
      formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Full validation submit for the primary Add Store action
  const handleSubmit = async (event) => {
    event.preventDefault();
    await submitForm({ asDraft: false });
  };

  // Lighter validation path used by Save as Draft
  const handleSaveDraft = async () => {
    await submitForm({ asDraft: true });
  };

  // Reusable action cluster shown at the top and bottom of the form
  const renderActions = () => (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => navigate("/stores")}
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
        <svg viewBox="0 0 24 24" className="hidden h-4 w-4 sm:block" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 10l2-5h12l2 5M4 10v9h16v-9M9 19v-5h6v5" />
        </svg>
        {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Add Store"}
      </button>
    </div>
  );

  // Edit mode: show a loading or error state until the saved store is available
  if (isEdit && (isLoading || errors.form) && !formData.storeName) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center text-sm shadow-sm">
        {isLoading ? (
          <span className="text-slate-500">Loading store…</span>
        ) : (
          <span className="text-red-600">
            {errors.form}{" "}
            <Link to="/stores" className="font-medium underline">
              Back to Stores
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
        {/* Page header with sequential badge and top actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {isEdit ? "Edit Store & Warehouse" : "Add Store & Warehouse"}
              </h1>
              {formData.storeCode && (
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-600 ring-1 ring-inset ring-blue-100">
                  {isEdit ? formData.storeCode : `${formData.storeCode} Sequential`}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {isEdit
                ? `Update details for store ${editId}.`
                : "Register and configure a new warehouse location, inventory hub, or regional store."}
            </p>
          </div>
          {renderActions()}
        </div>

        {/* Current network overview banner, built from the stores saved in the database */}
        <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8a2 2 0 100-4 2 2 0 000 4zm0 12a2 2 0 100-4 2 2 0 000 4zm8-6a2 2 0 100-4 2 2 0 000 4zM4 14a2 2 0 100-4 2 2 0 000 4zm8-2l6.5-3.5M12 12L5.5 8.5M12 12v6" />
                </svg>
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-800">Current Network Overview</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                  {networkStores === null
                    ? "Loading stores…"
                    : network.count === 0
                      ? "No active facilities yet. This will be the first one."
                      : `${network.count} Active ${network.count === 1 ? "Facility" : "Facilities"} (${network.names.join(", ")}) across ${network.districts} ${network.districts === 1 ? "district" : "districts"}`}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 lg:gap-8">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm ring-1 ring-blue-100">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 10l2-5h12l2 5M4 10v9h16v-9M9 19v-5h6v5" />
                  </svg>
                </span>
                <div>
                  <p className="text-[11px] font-medium text-slate-400">Total Network Storage</p>
                  <p className="text-sm font-bold text-slate-900">{network.capacity.toLocaleString()} m³</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-amber-500 shadow-sm ring-1 ring-amber-100">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a9 9 0 100 18 9 9 0 000-18zm0 0v9l5 3" />
                  </svg>
                </span>
                <div>
                  <p className="text-[11px] font-medium text-slate-400">Network Utilization</p>
                  <p className="text-sm font-bold text-slate-900">{network.utilization}%</p>
                </div>
              </div>
            </div>
          </div>
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

        <BasicStoreInformation
          values={formData}
          errors={errors}
          onChange={handleChange}
          onStatusSelect={handleStatusSelect}
          onSuggestCode={isEdit ? undefined : loadNextCode}
        />

        <ManagerContactDetails values={formData} errors={errors} onChange={handleChange} />

        <StorageCapacityThresholds values={formData} errors={errors} onChange={handleChange} />

        <AssignedFleetVehicles
          selectedIds={formData.assignedVehicles}
          error={errors.assignedVehicles}
          onToggle={handleVehicleToggle}
          disabled={isSubmitting}
          options={fleetOptions}
          loading={fleetLoading}
          loadError={fleetError}
        />

        {/* Footer sync note + duplicated action buttons */}
        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="flex items-start gap-2 text-xs text-slate-500 sm:items-center">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-blue-600 sm:mt-0">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 12a8 8 0 0114.9-4M20 12a8 8 0 01-14.9 4M8 8l1-4 4 1M16 16l-1 4-4-1" />
              </svg>
            </span>
            Store details and inventory partitions will synchronize across all active distribution hubs
            immediately.
          </p>
          {renderActions()}
        </div>
      </form>
    </div>
  );
}
