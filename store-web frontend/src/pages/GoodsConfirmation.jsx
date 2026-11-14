import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  FileImage,
  MapPin,
  Printer,
  Search,
  Truck,
  User,
} from "lucide-react";
import {
  confirmGoodsReceipt,
  getGoodsConfirmation,
  saveConfirmationDraft,
} from "../api/confirmationApi";

const CARD = "rounded-xl border border-line bg-white";

const STATUS_TABS = [
  { key: "All", label: "All Trips" },
  { key: "Prepared", label: "Prepared" },
  { key: "In Transit", label: "In Transit" },
  { key: "Receiving", label: "Receiving" },
];

const QUEUE_STATUS_STYLE = {
  Prepared: "bg-slate-100 text-slate-700 ring-slate-200",
  "In Transit": "bg-blue-50 text-blue-700 ring-blue-100",
  Receiving: "bg-amber-50 text-amber-700 ring-amber-100",
  Completed: "bg-emerald-50 text-emerald-700 ring-emerald-100",
};

// Derive match / difference status from expected vs received quantities
function getLineDiff(line) {
  const received = Number(line.received);
  const expected = Number(line.expected);
  if (Number.isNaN(received)) return { kind: "invalid", label: "Enter qty", matched: false };
  const diff = received - expected;
  if (diff === 0) return { kind: "matched", label: "Matched", matched: true, diff: 0 };
  const sign = diff > 0 ? "+" : "";
  return {
    kind: "difference",
    label: `${sign}${diff} Difference`,
    matched: false,
    diff,
  };
}

// Style condition text based on whether cargo arrived undamaged
function conditionClass(condition) {
  if (!condition) return "text-mute";
  if (condition.toLowerCase().includes("good")) return "text-emerald-600";
  return "text-amber-600";
}

export default function GoodsConfirmation() {
  // Active inbound trip verification payload from confirmationApi
  const [activeTrip, setActiveTrip] = useState(null);
  // Other inbound trips shown in the bottom queue
  const [queue, setQueue] = useState([]);
  // Tab badge counts for the trip status filter strip
  const [tabCounts, setTabCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Feedback banners for draft save and confirm actions
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  // Local filter state for tabs and free-text search
  const [activeTab, setActiveTab] = useState("Receiving");
  const [searchQuery, setSearchQuery] = useState("");
  // Editable verification fields kept in local form state
  const [lines, setLines] = useState([]);
  const [discrepancyNote, setDiscrepancyNote] = useState("");
  const [resolution, setResolution] = useState("accept_partial");
  const [acknowledged, setAcknowledged] = useState(false);

  // Load the active trip and inbound queue for this store session
  const loadConfirmation = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getGoodsConfirmation();
      setActiveTrip(data.activeTrip);
      setQueue(Array.isArray(data.queue) ? data.queue : []);
      setTabCounts(data.tabCounts || {});
      setLines(data.activeTrip?.lines || []);
      setDiscrepancyNote(data.activeTrip?.discrepancyNote || "");
      setResolution(data.activeTrip?.resolution || "accept_partial");
      setAcknowledged(Boolean(data.activeTrip?.acknowledged));
    } catch (err) {
      setError(err?.message || "Unable to load goods confirmation.");
      setActiveTrip(null);
      setQueue([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfirmation();
  }, [loadConfirmation]);

  // Clear success feedback whenever the user edits verification fields
  const dismissMessage = () => {
    if (message) setMessage("");
  };

  // Update a single cargo line's received quantity from the table input
  const handleReceivedChange = (lineId, value) => {
    dismissMessage();
    setLines((prev) =>
      prev.map((line) => (line.id === lineId ? { ...line, received: value } : line))
    );
  };

  // Copy every expected quantity into the received column for a quick match
  const handleMatchAll = () => {
    dismissMessage();
    setLines((prev) => prev.map((line) => ({ ...line, received: line.expected })));
  };

  // Aggregate expected / received totals for the sign-off panel
  const totals = useMemo(() => {
    const expected = lines.reduce((sum, line) => sum + Number(line.expected || 0), 0);
    const received = lines.reduce((sum, line) => sum + (Number(line.received) || 0), 0);
    return { expected, received, discrepancy: received - expected };
  }, [lines]);

  // Detect whether any line still has a quantity mismatch
  const hasDiscrepancy = useMemo(
    () => lines.some((line) => !getLineDiff(line).matched),
    [lines]
  );

  // Build the payload shared by draft and confirm API calls
  const buildPayload = () => ({
    tripId: activeTrip?.id,
    lines,
    discrepancyNote,
    resolution,
    acknowledged,
  });

  // Persist current verification values without completing the handover
  const handleSaveDraft = async () => {
    setIsSaving(true);
    setError("");
    try {
      await saveConfirmationDraft(buildPayload());
      setMessage("Draft saved. You can resume verification later.");
    } catch (err) {
      setError(err?.message || "Unable to save draft.");
    } finally {
      setIsSaving(false);
    }
  };

  // Complete goods confirmation after acknowledgement is checked
  const handleConfirm = async () => {
    if (!acknowledged) {
      setError("Confirm the physical count acknowledgement before completing.");
      return;
    }
    if (hasDiscrepancy && !String(discrepancyNote).trim()) {
      setError("Add a discrepancy note before confirming a partial receipt.");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      await confirmGoodsReceipt(buildPayload());
      setMessage(`Goods confirmation completed for #${activeTrip?.id}.`);
      setAcknowledged(true);
    } catch (err) {
      setError(err?.message || "Unable to confirm goods receipt.");
    } finally {
      setIsSaving(false);
    }
  };

  // Filter inbound queue rows by status tab and search text
  const filteredQueue = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return queue.filter((trip) => {
      const matchesTab = activeTab === "All" || trip.status === activeTab;
      const matchesSearch =
        !query ||
        trip.id.toLowerCase().includes(query) ||
        trip.route.toLowerCase().includes(query) ||
        trip.driver.toLowerCase().includes(query);
      return matchesTab && matchesSearch;
    });
  }, [queue, activeTab, searchQuery]);

  if (loading) {
    return <p className="text-sm text-mute">Loading goods confirmation…</p>;
  }

  if (!activeTrip) {
    return (
      <div className={`${CARD} p-6`}>
        <p className="text-sm text-bad">{error || "No inbound trip is ready for confirmation."}</p>
        <button
          type="button"
          onClick={loadConfirmation}
          className="mt-3 text-sm font-medium text-brand hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Page title + primary actions */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">Goods Confirmation</h1>
            <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-brand ring-1 ring-inset ring-blue-100">
              Trip #{activeTrip.id}
            </span>
          </div>
          <p className="mt-1 text-sm text-mute">
            Verify received quantities against inbound manifest and complete handover.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-100">
            {activeTrip.hub}
          </span>
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isSaving}
            className="rounded-lg border border-line bg-white px-3.5 py-2 text-sm font-medium text-ink transition hover:bg-slate-50 disabled:opacity-50"
          >
            Save Draft
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
          >
            <Check size={16} strokeWidth={2} />
            Confirm Receipt
          </button>
        </div>
      </div>

      {/* Status / validation banners */}
      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-bad">
          {error}
        </div>
      )}

      {/* Trip lifecycle stepper */}
      <section className={`${CARD} px-5 py-4`}>
        <ol className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {activeTrip.steps.map((step, index) => {
            const isActive = Boolean(step.active);
            const isDone = Boolean(step.done);
            return (
              <li key={step.key} className="flex items-start gap-3">
                <span
                  className={[
                    "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold",
                    isDone
                      ? "bg-emerald-500 text-white"
                      : isActive
                        ? "bg-brand text-white"
                        : "bg-slate-100 text-mute",
                  ].join(" ")}
                >
                  {isDone ? <Check size={16} strokeWidth={2.2} /> : index + 1}
                </span>
                <div>
                  <p
                    className={[
                      "text-sm font-semibold",
                      isActive ? "text-brand" : "text-ink",
                    ].join(" ")}
                  >
                    {step.label}
                    {isActive ? " (Active)" : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-mute">{step.detail}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Status tabs + search */}
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
                  isActive
                    ? "bg-brand text-white"
                    : "bg-slate-50 text-mute hover:bg-slate-100 hover:text-ink",
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
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search trips or items..."
            className="h-9 w-full rounded-lg border border-line bg-slate-50 pl-9 pr-3 text-sm outline-none placeholder:text-mute focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20"
          />
        </div>
      </section>

      {/* Active trip verification card */}
      <section className={`${CARD} overflow-hidden`}>
        {/* Trip metadata strip */}
        <div className="grid grid-cols-1 gap-3 border-b border-line bg-slate-50 px-5 py-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
          <div className="flex items-start gap-2">
            <MapPin size={15} className="mt-0.5 shrink-0 text-mute" />
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-mute">Route</p>
              <p className="font-medium text-ink">{activeTrip.route}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Truck size={15} className="mt-0.5 shrink-0 text-mute" />
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-mute">Vehicle</p>
              <p className="font-medium text-ink">{activeTrip.vehicle}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <User size={15} className="mt-0.5 shrink-0 text-mute" />
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-mute">Driver</p>
              <p className="font-medium text-ink">{activeTrip.driver}</p>
            </div>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-mute">Waybill</p>
            <p className="font-medium text-ink">{activeTrip.waybill}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-0 xl:grid-cols-[minmax(0,1fr)_300px]">
          {/* Cargo verification table + discrepancy note */}
          <div className="min-w-0 border-b border-line xl:border-b-0 xl:border-r">
            <div className="flex items-center justify-between gap-3 px-5 py-3">
              <h2 className="text-[15px] font-semibold text-ink">Cargo Verification</h2>
              <button
                type="button"
                onClick={handleMatchAll}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
              >
                <CheckCircle2 size={15} strokeWidth={1.8} />
                Match All
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-mute">
                  <tr>
                    <th className="px-5 py-2.5">Item</th>
                    <th className="px-4 py-2.5">Expected</th>
                    <th className="px-4 py-2.5">Received</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-5 py-2.5">Condition</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {lines.map((line) => {
                    const diff = getLineDiff(line);
                    return (
                      <tr key={line.id}>
                        <td className="whitespace-nowrap px-5 py-3 font-medium text-ink">
                          {line.name}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-mute">
                          {line.expected} {line.unit}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            value={line.received}
                            onChange={(event) =>
                              handleReceivedChange(line.id, event.target.value)
                            }
                            className={[
                              "h-9 w-20 rounded-md border bg-white px-2.5 text-sm tabular-nums outline-none focus:ring-2",
                              diff.matched
                                ? "border-line focus:border-brand focus:ring-brand/20"
                                : "border-bad text-bad focus:border-bad focus:ring-bad/20",
                            ].join(" ")}
                          />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={[
                              "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
                              diff.matched
                                ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                                : "bg-red-50 text-bad ring-red-100",
                            ].join(" ")}
                          >
                            {diff.label}
                          </span>
                        </td>
                        <td
                          className={`whitespace-nowrap px-5 py-3 text-sm font-medium ${conditionClass(line.condition)}`}
                        >
                          {line.condition}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Discrepancy note appears when quantities do not fully match */}
            {hasDiscrepancy && (
              <div className="border-t border-amber-100 bg-amber-50/60 px-5 py-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-ink">
                    Discrepancy Note: {Math.abs(totals.discrepancy)}{" "}
                    {Math.abs(totals.discrepancy) === 1 ? "item" : "items"} short / damaged
                  </p>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                    Requires Note
                  </span>
                </div>
                <textarea
                  value={discrepancyNote}
                  onChange={(event) => {
                    dismissMessage();
                    setDiscrepancyNote(event.target.value);
                  }}
                  rows={3}
                  className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  placeholder="Describe shortages, damage, or acceptance decisions..."
                />
                {activeTrip.attachment && (
                  <button
                    type="button"
                    className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
                  >
                    <FileImage size={15} strokeWidth={1.8} />
                    {activeTrip.attachment.name} ({activeTrip.attachment.size})
                  </button>
                )}
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
              </div>
            )}
          </div>

          {/* Sign-off & confirmation side panel */}
          <aside className="flex flex-col gap-4 px-5 py-5">
            <h2 className="text-[15px] font-semibold text-ink">Sign-off & Confirmation</h2>

            <dl className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-mute">Total Expected</dt>
                <dd className="font-semibold tabular-nums text-ink">
                  {totals.expected} items
                  <span className="ml-1 text-xs font-normal text-mute">
                    ({lines.length} lines)
                  </span>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-mute">Total Received</dt>
                <dd className="font-semibold tabular-nums text-ink">{totals.received} items</dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-line pt-2.5">
                <dt className="text-mute">Discrepancy</dt>
                <dd
                  className={[
                    "font-semibold tabular-nums",
                    totals.discrepancy === 0 ? "text-emerald-600" : "text-bad",
                  ].join(" ")}
                >
                  {totals.discrepancy > 0 ? "+" : ""}
                  {totals.discrepancy} items
                </dd>
              </div>
            </dl>

            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-line bg-slate-50 px-3 py-3 text-sm text-ink">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(event) => {
                  dismissMessage();
                  setAcknowledged(event.target.checked);
                }}
                className="mt-0.5 rounded border-line text-brand focus:ring-brand"
              />
              <span>I confirm the physical count matches entered actual quantities.</span>
            </label>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSaving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
            >
              <Check size={16} strokeWidth={2} />
              Complete Goods Confirmation
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-slate-50"
            >
              <Printer size={16} strokeWidth={1.8} />
              Print Goods Received Note (GRN)
            </button>
          </aside>
        </div>
      </section>

      {/* Inbound trips queue */}
      <section className={CARD}>
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">Inbound Trips Queue</h2>
            <p className="text-[13px] text-mute">
              Showing {filteredQueue.length} of {tabCounts.All ?? queue.length} trips
            </p>
          </div>
        </div>

        <ul className="divide-y divide-line">
          {filteredQueue.length === 0 ? (
            <li className="px-5 py-8 text-center text-sm text-mute">
              No trips match the current filters.
            </li>
          ) : (
            filteredQueue.map((trip) => (
              <li
                key={trip.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-ink">Trip #{trip.id}</p>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${
                        QUEUE_STATUS_STYLE[trip.status] || QUEUE_STATUS_STYLE.Prepared
                      }`}
                    >
                      {trip.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-mute">
                    {trip.route} · Driver {trip.driver} · {trip.units} units
                  </p>
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-slate-50"
                >
                  {trip.action}
                </button>
              </li>
            ))
          )}
        </ul>

        <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3 text-xs text-mute">
          <button
            type="button"
            disabled
            className="rounded-md px-2.5 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            disabled
            className="rounded-md px-2.5 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </section>
    </div>
  );
}
