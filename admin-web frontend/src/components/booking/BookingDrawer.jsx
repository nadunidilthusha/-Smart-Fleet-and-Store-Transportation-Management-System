import { useEffect, useState } from "react";
import { formatNumber, formatShortDateTime } from "../../utils/formatters";
import { PriorityTag, StatusDot, VehicleHint } from "./BookingParts";

const ROW = "grid grid-cols-[110px_1fr] gap-3 py-1 text-sm";

export default function BookingDrawer({ booking, onClose, onDecide }) {
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Close with the Escape key
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const decide = async (status) => {
    if (status !== "Approved" && !comment.trim()) {
      setError("Add a comment to the store before you reject or request changes.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onDecide(booking, status, comment.trim());
    } catch {
      setError("We could not save this decision. Try again.");
      setBusy(false);
    }
  };

  const isPending = booking.status === "Pending";

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} aria-hidden="true" />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Booking ${booking.id}`}
        className="absolute right-0 top-0 flex h-full w-[400px] max-w-full flex-col bg-white shadow-xl"
      >
        <div className="flex items-start justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="text-[16px] font-semibold leading-tight">{booking.id}</h2>
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

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <dl>
            {[
              ["Requested by", booking.requestedBy || "–"],
              ["Submitted", formatShortDateTime(booking.submittedAt)],
              ["Pickup", booking.pickup],
              ["Destination", booking.destination],
              ["Requested for", formatShortDateTime(booking.requestedFor)],
            ].map(([label, value]) => (
              <div key={label} className={ROW}>
                <dt className="text-mute">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
            <div className={ROW}>
              <dt className="text-mute">Priority</dt>
              <dd><PriorityTag priority={booking.priority} /></dd>
            </div>
          </dl>

          <div className="mt-3 overflow-hidden rounded-lg border border-line">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-[13px] text-mute">
                  <th className="px-3 py-2 text-left font-medium">Code</th>
                  <th className="px-3 py-2 text-left font-medium">Item</th>
                  <th className="px-3 py-2 text-right font-medium">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {booking.items.map((i) => (
                  <tr key={i.code} className="border-t border-line">
                    <td className="px-3 py-2.5 tabular-nums">{i.code}</td>
                    <td className="px-3 py-2.5">{i.item}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">
                      {formatNumber(i.quantity)} {i.unit}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-line font-semibold">
                  <td className="px-3 py-2.5" colSpan={2}>Total</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">
                    {formatNumber(booking.units)} units
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-3">
            <VehicleHint units={booking.units} />
          </div>

          {booking.notes && (
            <p className="mt-3 text-[13px] text-mute">
              Notes: <span className="text-ink">{booking.notes}</span>
            </p>
          )}

          {isPending ? (
            <div className="mt-4">
              <label htmlFor="booking-comment" className="mb-1 block text-[13px] text-mute">
                Comment to the store (required to reject or request changes)
              </label>
              <textarea
                id="booking-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                className="w-full resize-none rounded-md border border-line p-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
              {error && <p className="mt-1 text-[13px] text-bad">{error}</p>}
            </div>
          ) : (
            booking.comment && (
              <div className="mt-4">
                <p className="mb-1 text-[13px] text-mute">Comment to the store</p>
                <p className="rounded-md border border-line bg-slate-50 p-3 text-sm">{booking.comment}</p>
              </div>
            )
          )}
        </div>

        {isPending && (
          <div className="flex gap-2 border-t border-line px-5 py-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => decide("Approved")}
              className="h-9 rounded-md bg-ok px-4 text-[13px] font-medium text-white hover:brightness-110 disabled:opacity-60"
            >
              Approve
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => decide("Changes requested")}
              className="h-9 rounded-md border border-line px-4 text-[13px] font-medium hover:bg-slate-50 disabled:opacity-60"
            >
              Request changes
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => decide("Rejected")}
              className="h-9 rounded-md border border-bad px-4 text-[13px] font-medium text-bad hover:bg-red-50 disabled:opacity-60"
            >
              Reject
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}