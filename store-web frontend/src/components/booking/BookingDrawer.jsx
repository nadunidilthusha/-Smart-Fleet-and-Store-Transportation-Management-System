import { useEffect, useState } from "react";
import { CANCELLABLE_STATUSES, EDITABLE_STATUSES } from "../../api/bookingApi";
import { formatNumber, formatShortDateTime } from "../../utils/formatters";
import { StatusDot } from "./BookingParts";

const FLOW = ["Vehicle assigned", "Loaded and departed", "Delivered", "Receipt confirmed"];
const CLOSED = ["Rejected", "Cancelled"];

const STEP_DOT = {
  "Changes requested": "bg-amber-600",
  Rejected: "bg-red-600",
  Cancelled: "bg-slate-400",
};

// Finished steps first, then the steps that are still to come
function buildTimeline(booking) {
  const done = booking.history.map((h) => ({ ...h, done: true }));
  if (CLOSED.includes(booking.status)) return done;

  const finished = new Set(booking.history.map((h) => h.label));
  let next = [];
  if (booking.status === "Draft") next = ["Submitted", "Administrator approval"];
  else if (booking.status === "Pending approval") next = ["Administrator approval"];
  next = [...next, ...FLOW].filter((label) => !finished.has(label));

  return [...done, ...next.map((label) => ({ label, done: false }))];
}

function Section({ title, children }) {
  return (
    <section className="mt-5">
      <h3 className="mb-2 text-[13px] font-semibold">{title}</h3>
      {children}
    </section>
  );
}

export default function BookingDrawer({ booking, onClose, onEdit, onCancel }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Close with the Escape key
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const canEdit = EDITABLE_STATUSES.includes(booking.status);
  const canCancel = CANCELLABLE_STATUSES.includes(booking.status);
  const timeline = buildTimeline(booking);

  const confirmCancel = async () => {
    setBusy(true);
    setError("");
    try {
      await onCancel(booking);
    } catch {
      setError("We could not cancel this booking. Try again.");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} aria-hidden="true" />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Booking ${booking.id}`}
        className="absolute right-0 top-0 flex h-full w-105 max-w-full flex-col bg-white shadow-xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold leading-tight">{booking.id}</h2>
            <p className="mt-1 text-[13px]">
              <StatusDot status={booking.status} />
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 rounded-md border border-line px-3 text-[13px] font-medium hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 pb-6 pt-4">
          {booking.adminNote && (
            <div className="rounded-md border border-line border-l-[3px] border-l-teal-600 px-3 py-2 text-[13px] leading-snug">
              <p className="font-semibold">Administrator note</p>
              <p className="text-ink">{booking.adminNote}</p>
            </div>
          )}

          <div className="mt-3 grid grid-cols-3 divide-x divide-line rounded-md border border-line">
            {[
              ["Total units", formatNumber(booking.units)],
              ["Requested for", formatShortDateTime(booking.requestedFor)],
              ["Priority", booking.priority],
            ].map(([label, value]) => (
              <div key={label} className="px-3 py-2">
                <p className="text-xs text-mute">{label}</p>
                <p className="text-sm font-semibold tabular-nums">{value}</p>
              </div>
            ))}
          </div>

          <Section title="Route">
            <dl className="text-[13px]">
              {[
                ["Pickup", booking.pickup],
                ["Destination", booking.destination || "–"],
                ["Submitted", booking.status === "Draft" ? "Not submitted yet" : formatShortDateTime(booking.submittedAt)],
              ].map(([label, value]) => (
                <div key={label} className="grid grid-cols-[90px_1fr] gap-2 py-0.5">
                  <dt className="text-mute">{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section title="Vehicle and driver">
            {booking.vehicle ? (
              <dl className="text-[13px]">
                <div className="grid grid-cols-[90px_1fr] gap-2 py-0.5">
                  <dt className="text-mute">Vehicle</dt>
                  <dd>{booking.vehicle}</dd>
                </div>
                <div className="grid grid-cols-[90px_1fr] gap-2 py-0.5">
                  <dt className="text-mute">Driver</dt>
                  <dd>{booking.driver || "–"}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-[13px] text-mute">
                {CLOSED.includes(booking.status)
                  ? "No vehicle was assigned to this booking."
                  : "A vehicle is assigned after the administrator approves this booking."}
              </p>
            )}
          </Section>

          <Section title="Items">
            <div className="overflow-hidden rounded-md border border-line">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="bg-slate-50 text-mute">
                    <th className="px-3 py-2 text-left font-medium">Item</th>
                    <th className="px-3 py-2 text-right font-medium">Requested</th>
                  </tr>
                </thead>
                <tbody>
                  {booking.items.map((i) => (
                    <tr key={i.code} className="border-t border-line">
                      <td className="px-3 py-2.5">
                        {i.item}
                        <span className="block text-xs text-mute">{i.code}</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">
                        {formatNumber(i.quantity)} {i.unit}
                      </td>
                    </tr>
                  ))}
                  {booking.items.length === 0 && (
                    <tr className="border-t border-line">
                      <td colSpan={2} className="px-3 py-3 text-center text-mute">No items added yet.</td>
                    </tr>
                  )}
                  <tr className="border-t border-line font-semibold">
                    <td className="px-3 py-2.5">Total</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatNumber(booking.units)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="Notes">
            <p className={`text-[13px] ${booking.notes ? "" : "text-mute"}`}>{booking.notes || "No notes added."}</p>
          </Section>

          <Section title="Status">
            <ol>
              {timeline.map((step, index) => (
                <li key={`${step.label}-${index}`} className="relative flex gap-3 pb-4 last:pb-0">
                  {index < timeline.length - 1 && (
                    <span className="absolute left-1 top-3.5 h-[calc(100%-6px)] w-px bg-line" aria-hidden="true" />
                  )}
                  <i
                    className={`relative z-10 mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                      step.done ? STEP_DOT[step.label] ?? "bg-green-600" : "border border-slate-300 bg-white"
                    }`}
                  />
                  <div className="leading-tight">
                    <p className={`text-[13px] ${step.done ? "text-ink" : "text-mute"}`}>{step.label}</p>
                    {step.done && step.at && <p className="mt-0.5 text-xs text-mute">{formatShortDateTime(step.at)}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </Section>
        </div>

        {/* Footer actions */}
        {(canEdit || canCancel) && (
          <div className="border-t border-line px-5 py-3">
            {error && <p className="mb-2 text-[13px] text-bad">{error}</p>}
            {confirming ? (
              <div className="flex items-center gap-2">
                <p className="flex-1 text-[13px]">Cancel this booking?</p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirming(false)}
                  className="h-9 rounded-md border border-line px-4 text-[13px] font-medium hover:bg-slate-50 disabled:opacity-60"
                >
                  Keep booking
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={confirmCancel}
                  className="h-9 rounded-md bg-bad px-4 text-[13px] font-medium text-white hover:brightness-110 disabled:opacity-60"
                >
                  {busy ? "Cancelling…" : "Yes, cancel"}
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(booking)}
                    className="h-9 rounded-md bg-brand px-4 text-[13px] font-medium text-white hover:brightness-110"
                  >
                    Edit booking
                  </button>
                )}
                {canCancel && (
                  <button
                    type="button"
                    onClick={() => setConfirming(true)}
                    className="h-9 rounded-md border border-bad px-4 text-[13px] font-medium text-bad hover:bg-red-50"
                  >
                    Cancel booking
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}