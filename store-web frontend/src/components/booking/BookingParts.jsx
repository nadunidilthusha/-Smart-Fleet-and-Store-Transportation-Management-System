// Small shared pieces used by the My bookings page and the booking drawer

export const STATUS_DOT = {
  Draft: "bg-slate-400",
  "Pending approval": "bg-amber-600",
  Approved: "bg-green-600",
  "Changes requested": "bg-teal-600",
  Scheduled: "bg-blue-600",
  "In transit": "bg-blue-600",
  Completed: "bg-green-600",
  Cancelled: "bg-slate-400",
  Rejected: "bg-red-600",
};

export function StatusDot({ status }) {
  return (
    <span className="inline-flex items-center gap-2">
      <i className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[status] ?? "bg-slate-400"}`} />
      {status}
    </span>
  );
}

export function UrgentTag() {
  return (
    <span className="rounded border border-bad px-1.5 py-px text-[11px] font-medium leading-4 text-bad">
      Urgent
    </span>
  );
}

export function DirectionTag({ direction }) {
  return (
    <span className="rounded border border-line bg-white px-1.5 py-px text-[11px] leading-4 text-mute">
      {direction}
    </span>
  );
}

// "Main Store – Biyagama" -> "Main Store", "Store 3 – Kandy" -> "Kandy"
export function shortStore(name = "") {
  const [first, second] = name.split(" – ");
  return first === "Main Store" ? first : second ?? first;
}

// Outgoing when the signed-in store sends the goods, otherwise Incoming
export function getDirection(booking, store) {
  return booking.pickup === store ? "Outgoing" : "Incoming";
}