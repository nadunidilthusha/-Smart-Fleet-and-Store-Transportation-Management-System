import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  MapPin,
  Printer,
  Search,
  Truck,
  User,
  X,
} from "lucide-react";
import {
  cancelGoodsConfirmation,
  confirmGoodsStage,
  getGoodsConfirmation,
  saveConfirmationDraft,
} from "../api/confirmationApi";
import useAuth from "../hooks/useAuth";
import { ROLES } from "../utils/roles";
import { formatNumber, formatShortDateTime } from "../utils/formatters";

const CARD = "rounded-xl border border-line bg-white";
const FIELD =
  "h-9 rounded-md border border-line bg-white px-2.5 text-sm tabular-nums outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

// Queue tabs match the statuses returned by the store goods-confirmation API
const STATUS_TABS = [
  { key: "All", label: "All" },
  { key: "To prepare", label: "To prepare" },
  { key: "Handover", label: "Handover" },
  { key: "Receiving", label: "Receiving" },
  { key: "Waiting", label: "Waiting" },
  { key: "Completed", label: "Completed" },
];

const QUEUE_STATUS_STYLE = {
  "To prepare": "bg-slate-100 text-slate-700 ring-slate-200",
  Handover: "bg-violet-50 text-violet-700 ring-violet-100",
  Receiving: "bg-amber-50 text-amber-700 ring-amber-100",
  Waiting: "bg-blue-50 text-blue-700 ring-blue-100",
  Completed: "bg-emerald-50 text-emerald-700 ring-emerald-100",
};

const STAGE_LABEL = { prepared: "Preparation", handover: "Handover", receipt: "Receipt" };
const STAGE_CONFIRM = { prepared: "Confirm prepared", handover: "Confirm handover", receipt: "Confirm receipt" };
const STAGE_BASE = { prepared: "Expected", handover: "Prepared", receipt: "Handed over" }; // quantity this step is compared with

// Quantity the current step is measured against (expected → prepared → handed over)
function baseOf(line, stage) {
  if (stage === "prepared") return Number(line.expected) || 0;
  if (stage === "handover") return Number(line.prepared?.qty) || 0;
  return Number(line.handover?.qty) || 0;
}

// Difference between the typed quantity and the previous step, plus a short status label
function lineDiff(quantity, base, damaged, incorrect) {
  if (quantity === "" || quantity == null) return { kind: "empty", label: "Enter qty", matched: false, difference: null };
  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty < 0) return { kind: "invalid", label: "Invalid", matched: false, difference: null };
  const difference = qty - base;
  const issues = [];
  if (difference < 0) issues.push("missing");
  if (difference > 0) issues.push("excess");
  if (Number(damaged) > 0) issues.push("damaged");
  if (Number(incorrect) > 0) issues.push("incorrect");
  if (issues.length === 0) return { kind: "matched", label: "Matched", matched: true, difference: 0 };
  const sign = difference > 0 ? "+" : "";
  const qtyPart = difference === 0 ? "" : `${sign}${difference} `;
  return { kind: "difference", label: `${qtyPart}${issues.join(" · ")}`, matched: false, difference, issues };
}

// Local form rows for the step being edited (quantities start empty — never copied from expected)
function formLinesFrom(active) {
  if (!active) return [];
  const stage = active.stage;
  return active.lines.map((line) => {
    const saved = stage !== "done" ? line[stage] : null;
    return {
      code: line.id,
      name: line.name,
      unit: line.unit,
      expected: line.expected,
      prepared: line.prepared,
      handover: line.handover,
      receipt: line.receipt,
      base: baseOf(line, stage === "done" ? "receipt" : stage),
      // Keep a saved draft; otherwise leave blank so the employee must type the count
      quantity: saved?.qty != null ? String(saved.qty) : "",
      damaged: saved?.damaged ? String(saved.damaged) : "0",
      incorrect: saved?.incorrect ? String(saved.incorrect) : "0",
      note: saved?.note ?? "",
    };
  });
}

// datetime-local value from an ISO timestamp
function toLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function GoodsConfirmation() {
  const { user } = useAuth();
  const isManager = user?.role === ROLES.STORE_MANAGER;

  const [active, setActive] = useState(null);
  const [queue, setQueue] = useState([]);
  const [tabCounts, setTabCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Editable fields for the current step
  const [lines, setLines] = useState([]);
  const [discrepancyNote, setDiscrepancyNote] = useState("");
  const [resolution, setResolution] = useState("accept_partial");
  const [handoverAt, setHandoverAt] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);

  const stage = active?.stage;
  const canEdit = Boolean(active?.canAct && stage && stage !== "done");

  // Apply a successful API response to the page state
  const applyData = useCallback((data) => {
    const next = data.active;
    setActive(next);
    setQueue(Array.isArray(data.queue) ? data.queue : []);
    setTabCounts(data.tabCounts || {});
    setLines(formLinesFrom(next));
    // Prefer the note of the step being worked on; fall back to the receipt note when finished
    setDiscrepancyNote(next?.notes?.[next.stage === "done" ? "receipt" : next.stage] ?? "");
    setResolution(next?.resolution || "accept_partial");
    setHandoverAt(toLocalInput(next?.handoverAt) || (next?.stage === "handover" ? toLocalInput(new Date().toISOString()) : ""));
    setAcknowledged(false);
    setShowCancel(false);
    setCancelReason("");
    setFieldErrors({});
  }, []);

  const loadConfirmation = useCallback(async (booking) => {
    setLoading(true);
    setError("");
    try {
      applyData(await getGoodsConfirmation(booking));
    } catch (err) {
      setError(err?.message || "Unable to load goods confirmation.");
      setActive(null);
      setQueue([]);
      setLines([]);
    } finally {
      setLoading(false);
    }
  }, [applyData]);

  useEffect(() => {
    loadConfirmation();
  }, [loadConfirmation]);

  const dismissMessage = () => {
    if (message) setMessage("");
  };

  const updateLine = (code, patch) => {
    dismissMessage();
    setFieldErrors((prev) => {
      const next = { ...prev };
      Object.keys(patch).forEach((key) => {
        delete next[`lines.${code}.${key === "quantity" ? "quantity" : key}`];
        delete next[`lines.${code}`];
      });
      return next;
    });
    setLines((prev) => prev.map((line) => (line.code === code ? { ...line, ...patch } : line)));
  };

  // Totals for the sign-off panel of the step being edited
  const totals = useMemo(() => {
    const base = lines.reduce((sum, line) => sum + (Number(line.base) || 0), 0);
    const counted = lines.reduce((sum, line) => sum + (line.quantity === "" ? 0 : Number(line.quantity) || 0), 0);
    const damaged = lines.reduce((sum, line) => sum + (Number(line.damaged) || 0), 0);
    const incorrect = lines.reduce((sum, line) => sum + (Number(line.incorrect) || 0), 0);
    return { base, counted, damaged, incorrect, difference: counted - base };
  }, [lines]);

  // True when any line differs from the previous step or has damaged / incorrect units
  const hasDiscrepancy = useMemo(
    () => lines.some((line) => !lineDiff(line.quantity, line.base, line.damaged, line.incorrect).matched),
    [lines]
  );

  // Body shared by draft and confirm (quantities are sent as typed — empty becomes null on draft)
  const buildPayload = () => ({
    bookingId: active?.id,
    stage,
    lines: lines.map((line) => ({
      code: line.code,
      quantity: line.quantity === "" ? null : Number(line.quantity),
      damaged: Number(line.damaged) || 0,
      incorrect: Number(line.incorrect) || 0,
      note: line.note || "",
    })),
    note: discrepancyNote.trim(),
    ...(stage === "handover" && handoverAt ? { handoverAt: new Date(handoverAt).toISOString() } : {}),
    ...(stage === "receipt" ? { resolution } : {}),
  });

  const handleApiError = (err) => {
    const map = {};
    for (const item of err?.errors ?? []) {
      if (item.field) map[item.field] = item.message;
    }
    setFieldErrors(map);
    setError(err?.message || "Unable to save.");
  };

  const handleSaveDraft = async () => {
    if (!canEdit) return;
    setIsSaving(true);
    setError("");
    try {
      applyData(await saveConfirmationDraft(buildPayload()));
      setMessage(`${STAGE_LABEL[stage]} draft saved for ${active.id}.`);
    } catch (err) {
      handleApiError(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirm = async () => {
    if (!canEdit) return;
    if (!acknowledged) {
      setError("Confirm that the physical count matches the quantities entered.");
      return;
    }
    // A difference or damaged / incorrect goods must be explained before the step can be confirmed
    if (hasDiscrepancy && !discrepancyNote.trim()) {
      setError("Add a discrepancy note to explain the differences.");
      setFieldErrors((prev) => ({ ...prev, note: "Add a discrepancy note to explain the differences." }));
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      applyData(await confirmGoodsStage(buildPayload()));
      setMessage(`${STAGE_LABEL[stage]} confirmed for ${active.id}.`);
    } catch (err) {
      handleApiError(err);
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel closes the confirmation and asks the backend to revalidate the trip load and route
  const handleCancel = async () => {
    if (!cancelReason.trim() || cancelReason.trim().length < 3) {
      setError("Enter a reason for cancelling (at least 3 characters).");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      const data = await cancelGoodsConfirmation({ bookingId: active.id, reason: cancelReason.trim() });
      applyData(data);
      const trips = data.revalidated?.map((t) => t.code).filter(Boolean) ?? [];
      setMessage(
        trips.length
          ? `Confirmation cancelled. ${trips.join(", ")} was recalculated.`
          : "Confirmation cancelled. The booking is not on a trip."
      );
    } catch (err) {
      handleApiError(err);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredQueue = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return queue.filter((row) => {
      const matchesTab = activeTab === "All" || row.status === activeTab;
      const matchesSearch =
        !query ||
        row.id.toLowerCase().includes(query) ||
        row.route.toLowerCase().includes(query) ||
        (row.driver || "").toLowerCase().includes(query);
      return matchesTab && matchesSearch;
    });
  }, [queue, activeTab, searchQuery]);

  if (loading) {
    return <p className="text-sm text-mute">Loading goods confirmation…</p>;
  }

  if (!active) {
    return (
      <div className={`${CARD} p-6`}>
        <p className="text-sm text-bad">{error || "No booking is ready for goods confirmation at this store."}</p>
        <button type="button" onClick={() => loadConfirmation()} className="mt-3 text-sm font-medium text-brand hover:underline">
          Retry
        </button>
      </div>
    );
  }

  const stepTitle = stage === "done" ? "Goods received" : STAGE_LABEL[stage];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">Goods Confirmation</h1>
            <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-brand ring-1 ring-inset ring-blue-100">
              {active.id}
            </span>
            {active.tripId && (
              <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
                Trip {active.tripId}
              </span>
            )}
            {active.priority === "Urgent" && (
              <span className="inline-flex items-center rounded-md bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-100">
                Urgent
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-mute">
            Prepare, hand over and receive goods against the booking. Every quantity is typed in — nothing is copied from the expected figure.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-100">
            {active.hub || (active.role === "sender" ? active.destination : active.pickup)}
          </span>
          {canEdit && (
            <>
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSaving}
                className="rounded-lg border border-line bg-white px-3.5 py-2 text-sm font-medium text-ink transition hover:bg-slate-50 disabled:opacity-50"
              >
                Save draft
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
              >
                <Check size={16} strokeWidth={2} />
                {STAGE_CONFIRM[stage]}
              </button>
            </>
          )}
          {isManager && active.canCancel && (
            <button
              type="button"
              onClick={() => setShowCancel((v) => !v)}
              disabled={isSaving}
              className="rounded-lg border border-red-200 bg-white px-3.5 py-2 text-sm font-medium text-bad transition hover:bg-red-50 disabled:opacity-50"
            >
              Cancel confirmation
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-bad">
          {error}
        </div>
      )}
      {active.wasCancelled && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          The previous confirmation for this booking was cancelled. You can start again from preparation.
        </div>
      )}

      {showCancel && (
        <section className={`${CARD} border-red-200 px-5 py-4`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold text-ink">Cancel goods confirmation</h2>
              <p className="mt-0.5 text-[13px] text-mute">
                The confirmation is closed, the booking is taken off its trip, and the trip load and route are recalculated.
              </p>
            </div>
            <button type="button" onClick={() => setShowCancel(false)} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-md hover:bg-slate-100">
              <X size={16} />
            </button>
          </div>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={2}
            placeholder="Reason for cancelling…"
            className="mt-3 w-full rounded-lg border border-line px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="mt-3 rounded-lg bg-red-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            Confirm cancellation
          </button>
        </section>
      )}

      {/* Three-step progress: Prepared → Handover → Receipt */}
      <section className={`${CARD} px-5 py-4`}>
        <ol className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {active.steps.map((step, index) => {
            const detail = step.done
              ? `${step.at ? formatShortDateTime(step.at) : ""} · ${step.by || step.store}`.replace(/^ · /, "")
              : step.active
                ? `${step.store} · in progress`
                : step.store;
            return (
              <li key={step.key} className="flex items-start gap-3">
                <span
                  className={[
                    "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold",
                    step.done ? "bg-emerald-500 text-white" : step.active ? "bg-brand text-white" : "bg-slate-100 text-mute",
                  ].join(" ")}
                >
                  {step.done ? <Check size={16} strokeWidth={2.2} /> : index + 1}
                </span>
                <div>
                  <p className={["text-sm font-semibold", step.active ? "text-brand" : "text-ink"].join(" ")}>
                    {step.label}
                    {step.active ? " (Active)" : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-mute">{detail}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className={`${CARD} flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between`}>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_TABS.map((tab) => {
            const count = tabCounts[tab.key] ?? 0;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={[
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition",
                  isActive ? "bg-brand text-white" : "bg-slate-50 text-mute hover:bg-slate-100 hover:text-ink",
                ].join(" ")}
              >
                {tab.label} ({count})
              </button>
            );
          })}
        </div>
        <div className="relative w-full lg:w-70">
          <Search size={15} className="pointer-events-none absolute left-3 top-2.75 text-mute" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search booking, route or driver…"
            className="h-9 w-full rounded-lg border border-line bg-slate-50 pl-9 pr-3 text-sm outline-none placeholder:text-mute focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20"
          />
        </div>
      </section>

      <section className={`${CARD} overflow-hidden`}>
        <div className="grid grid-cols-1 gap-3 border-b border-line bg-slate-50 px-5 py-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
          <div className="flex items-start gap-2">
            <MapPin size={15} className="mt-0.5 shrink-0 text-mute" />
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-mute">Route</p>
              <p className="font-medium text-ink">{active.route}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Truck size={15} className="mt-0.5 shrink-0 text-mute" />
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-mute">Vehicle</p>
              <p className="font-medium text-ink">{active.vehicle || "Not allocated"}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <User size={15} className="mt-0.5 shrink-0 text-mute" />
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-mute">Driver</p>
              <p className="font-medium text-ink">{active.driver || "Not assigned"}</p>
            </div>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-mute">Waybill</p>
            <p className="font-medium text-ink">{active.waybill || "–"}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-0 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 border-b border-line xl:border-b-0 xl:border-r">
            <div className="flex items-center justify-between gap-3 px-5 py-3">
              <div>
                <h2 className="text-[15px] font-semibold text-ink">{stepTitle}</h2>
                <p className="text-[13px] text-mute">
                  {canEdit
                    ? `Enter the actual ${stage} quantity for each item. Compared with ${STAGE_BASE[stage].toLowerCase()}.`
                    : stage === "done"
                      ? "All three steps are complete."
                      : "This step is waiting on the other store."}
                </p>
              </div>
            </div>

            {canEdit && stage === "handover" && (
              <div className="border-b border-line px-5 py-3">
                <label className="block text-[13px] font-medium text-ink">
                  Handover date and time
                  <input
                    type="datetime-local"
                    value={handoverAt}
                    onChange={(e) => {
                      dismissMessage();
                      setHandoverAt(e.target.value);
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.handoverAt;
                        return next;
                      });
                    }}
                    className={`${FIELD} mt-1.5 w-full max-w-xs ${fieldErrors.handoverAt ? "border-bad" : ""}`}
                  />
                </label>
                {fieldErrors.handoverAt && <p className="mt-1 text-xs text-bad">{fieldErrors.handoverAt}</p>}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-mute">
                  <tr>
                    <th className="px-5 py-2.5">Item</th>
                    <th className="px-4 py-2.5">{STAGE_BASE[stage === "done" ? "receipt" : stage]}</th>
                    <th className="px-4 py-2.5">{canEdit ? "Actual qty" : "Counted"}</th>
                    {canEdit && <th className="px-4 py-2.5">Damaged</th>}
                    {canEdit && <th className="px-4 py-2.5">Incorrect</th>}
                    <th className="px-4 py-2.5">Status</th>
                    {canEdit && <th className="px-5 py-2.5">Line note</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {lines.map((line) => {
                    const diff = lineDiff(line.quantity, line.base, line.damaged, line.incorrect);
                    const qtyError = fieldErrors[`lines.${line.code}.quantity`];
                    return (
                      <tr key={line.code}>
                        <td className="px-5 py-3">
                          <p className="font-medium text-ink">{line.name}</p>
                          <p className="text-xs text-mute">{line.code} · booked {formatNumber(line.expected)} {line.unit}</p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-mute">
                          {formatNumber(line.base)} {line.unit}
                        </td>
                        <td className="px-4 py-3">
                          {canEdit ? (
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={line.quantity}
                              onChange={(e) => updateLine(line.code, { quantity: e.target.value })}
                              aria-label={`Actual quantity for ${line.name}`}
                              className={[
                                FIELD,
                                "w-24",
                                qtyError || (!diff.matched && line.quantity !== "") ? "border-bad text-bad focus:border-bad focus:ring-bad/20" : "",
                              ].join(" ")}
                            />
                          ) : (
                            <span className="tabular-nums">{line.quantity === "" ? "–" : formatNumber(line.quantity)}</span>
                          )}
                          {qtyError && <p className="mt-1 text-xs text-bad">{qtyError}</p>}
                        </td>
                        {canEdit && (
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={line.damaged}
                              onChange={(e) => updateLine(line.code, { damaged: e.target.value })}
                              aria-label={`Damaged quantity for ${line.name}`}
                              className={`${FIELD} w-20 ${fieldErrors[`lines.${line.code}.damaged`] ? "border-bad" : ""}`}
                            />
                          </td>
                        )}
                        {canEdit && (
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={line.incorrect}
                              onChange={(e) => updateLine(line.code, { incorrect: e.target.value })}
                              aria-label={`Incorrect quantity for ${line.name}`}
                              className={`${FIELD} w-20 ${fieldErrors[`lines.${line.code}.incorrect`] ? "border-bad" : ""}`}
                            />
                          </td>
                        )}
                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={[
                              "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
                              diff.matched ? "bg-emerald-50 text-emerald-700 ring-emerald-100" : "bg-red-50 text-bad ring-red-100",
                            ].join(" ")}
                          >
                            {diff.label}
                          </span>
                        </td>
                        {canEdit && (
                          <td className="px-5 py-3">
                            <input
                              type="text"
                              value={line.note}
                              onChange={(e) => updateLine(line.code, { note: e.target.value })}
                              placeholder="Optional"
                              maxLength={250}
                              className="h-9 w-full min-w-36 rounded-md border border-line bg-white px-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                            />
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Discrepancy note is required when confirming a step that has differences */}
            {(canEdit && (hasDiscrepancy || discrepancyNote)) && (
              <div className="border-t border-amber-100 bg-amber-50/60 px-5 py-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-ink">Discrepancy note</p>
                  {hasDiscrepancy && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                      Required to confirm
                    </span>
                  )}
                </div>
                <textarea
                  value={discrepancyNote}
                  onChange={(e) => {
                    dismissMessage();
                    setDiscrepancyNote(e.target.value);
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.note;
                      return next;
                    });
                  }}
                  rows={3}
                  className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 ${
                    fieldErrors.note ? "border-bad" : "border-amber-200"
                  }`}
                  placeholder="Describe shortages, excess, damage or incorrect goods…"
                />
                {fieldErrors.note && <p className="mt-1 text-xs text-bad">{fieldErrors.note}</p>}
                {stage === "receipt" && (
                  <div className="mt-3 flex flex-wrap gap-4 text-sm">
                    <label className="inline-flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="resolution"
                        checked={resolution === "accept_partial"}
                        onChange={() => {
                          dismissMessage();
                          setResolution("accept_partial");
                        }}
                        className="text-brand focus:ring-brand"
                      />
                      Accept partial delivery
                    </label>
                    <label className="inline-flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="resolution"
                        checked={resolution === "reject_damaged"}
                        onChange={() => {
                          dismissMessage();
                          setResolution("reject_damaged");
                        }}
                        className="text-brand focus:ring-brand"
                      />
                      Reject damaged items
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>

          <aside className="flex flex-col gap-4 px-5 py-5">
            <h2 className="text-[15px] font-semibold text-ink">Sign-off</h2>

            <dl className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-mute">{STAGE_BASE[stage === "done" ? "receipt" : stage]}</dt>
                <dd className="font-semibold tabular-nums text-ink">
                  {formatNumber(totals.base)}
                  <span className="ml-1 text-xs font-normal text-mute">({lines.length} lines)</span>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-mute">Actual counted</dt>
                <dd className="font-semibold tabular-nums text-ink">{formatNumber(totals.counted)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-mute">Damaged</dt>
                <dd className="font-semibold tabular-nums text-ink">{formatNumber(totals.damaged)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-line pt-2.5">
                <dt className="text-mute">Difference</dt>
                <dd className={["font-semibold tabular-nums", totals.difference === 0 ? "text-emerald-600" : "text-bad"].join(" ")}>
                  {totals.difference > 0 ? "+" : ""}
                  {formatNumber(totals.difference)}
                </dd>
              </div>
            </dl>

            {canEdit && (
              <>
                <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-line bg-slate-50 px-3 py-3 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(e) => {
                      dismissMessage();
                      setAcknowledged(e.target.checked);
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.acknowledged;
                        return next;
                      });
                    }}
                    className="mt-0.5 rounded border-line text-brand focus:ring-brand"
                  />
                  <span>I confirm the physical count matches the quantities entered.</span>
                </label>
                {fieldErrors.acknowledged && <p className="text-xs text-bad">{fieldErrors.acknowledged}</p>}

                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isSaving}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
                >
                  <Check size={16} strokeWidth={2} />
                  {STAGE_CONFIRM[stage]}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-slate-50"
            >
              <Printer size={16} strokeWidth={1.8} />
              Print summary
            </button>

            {active.history?.length > 0 && (
              <div>
                <h3 className="mb-2 text-[13px] font-semibold text-ink">History</h3>
                <ul className="space-y-2 text-xs text-mute">
                  {[...active.history].reverse().slice(0, 8).map((h, i) => (
                    <li key={`${h.at}-${i}`}>
                      <span className="font-medium text-ink">{h.action}</span>
                      {h.stage ? ` · ${h.stage}` : ""}
                      {h.by ? ` · ${h.by}` : ""}
                      {h.at ? ` · ${formatShortDateTime(h.at)}` : ""}
                      {h.note ? ` — ${h.note}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </section>

      <section className={CARD}>
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">Bookings queue</h2>
            <p className="text-[13px] text-mute">
              Showing {filteredQueue.length} of {tabCounts.All ?? queue.length} bookings for this store
            </p>
          </div>
        </div>

        <ul className="divide-y divide-line">
          {filteredQueue.length === 0 ? (
            <li className="px-5 py-8 text-center text-sm text-mute">No bookings match the current filters.</li>
          ) : (
            filteredQueue.map((row) => {
              const selected = row.id === active.id;
              return (
                <li
                  key={row.id}
                  className={[
                    "flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between",
                    selected ? "bg-blue-50/50" : "",
                  ].join(" ")}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-ink">{row.id}</p>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${
                          QUEUE_STATUS_STYLE[row.status] || QUEUE_STATUS_STYLE["To prepare"]
                        }`}
                      >
                        {row.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-mute">
                      {row.route} · Driver {row.driver || "–"} · {formatNumber(row.units)} units
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => loadConfirmation(row.id)}
                    className="shrink-0 rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-slate-50"
                  >
                    {selected ? "Selected" : row.action}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </section>
    </div>
  );
}
