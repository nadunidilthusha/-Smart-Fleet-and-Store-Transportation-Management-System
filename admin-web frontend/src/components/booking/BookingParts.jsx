import { suggestVehicle } from "../../api/bookingApi";

export const STATUS_DOT = {
  Pending: "bg-warn",
  Approved: "bg-ok",
  "Changes requested": "bg-brand",
  Rejected: "bg-bad",
};

export function StatusDot({ status }) {
  return (
    <span className="inline-flex items-center gap-2">
      <i className={`h-2 w-2 rounded-full ${STATUS_DOT[status] ?? "bg-slate-400"}`} />
      {status}
    </span>
  );
}

export function PriorityTag({ priority }) {
  if (priority === "Urgent") {
    return <span className="rounded border border-bad px-1.5 text-xs font-medium text-bad">Urgent</span>;
  }
  return <span>{priority}</span>;
}

/* Note box with the vehicle suggestion (grey = empty, green = fits, amber = too big) */
export function VehicleHint({ units, emptyText }) {
  const hint = suggestVehicle(units);
  const bar = !hint ? "border-l-slate-300" : hint.fits ? "border-l-ok" : "border-l-warn";
  return (
    <p className={`rounded-md border border-line border-l-[3px] ${bar} px-3 py-2 text-[13px] leading-snug`}>
      {hint ? hint.text : emptyText}
    </p>
  );
}