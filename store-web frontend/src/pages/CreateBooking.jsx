import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowLeftRight, Plus, X } from "lucide-react";
import { estimateVehicle, getBooking, getBookingOptions, NOTES_LIMIT, saveBooking, STORE_HOURS } from "../api/bookingApi";
import useAuth from "../hooks/useAuth";
import { formatNumber, formatShortDateTime } from "../utils/formatters";
import ItemPicker from "../components/booking/ItemPicker";
import { shortStore } from "../components/booking/BookingParts";

const CARD = "min-w-0 rounded-xl border border-line bg-white";
const LABEL = "mb-1 block text-xs text-mute";
const FIELD_BASE =
  "h-10 rounded-md border border-line bg-white px-3 text-sm outline-none placeholder:text-mute focus:border-brand focus:ring-2 focus:ring-brand/20";
const FIELD = `${FIELD_BASE} w-full`;
const ERR = "mt-1 text-[13px] text-bad";
const ITEM_GRID = "grid grid-cols-[minmax(0,1fr)_110px_48px_40px] items-center gap-2";

const pad = (n) => String(n).padStart(2, "0");
const toInputDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

let rowKey = 0;
const newRow = (code = "", quantity = "") => ({ key: ++rowKey, code, quantity });

export default function CreateBooking() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const myStore = user?.storeName ?? "Main Store – Biyagama";

  const [params] = useSearchParams();
  const editId = params.get("edit"); // /bookings/new?edit=BK-1103-0089

  const [stores, setStores] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [pickup, setPickup] = useState(myStore);
  const [destination, setDestination] = useState("");
  const [rows, setRows] = useState([newRow()]);
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return toInputDate(d);
  });
  const [time, setTime] = useState("09:00");
  const [priority, setPriority] = useState("Standard");
  const [notes, setNotes] = useState("");

  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Load stores and items (and the booking itself when editing)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [options, existing] = await Promise.all([getBookingOptions(), editId ? getBooking(editId) : null]);
        if (!alive) return;
        setStores(options.stores);
        setItems(options.items);

        if (existing) {
          const when = new Date(existing.requestedFor);
          setPickup(existing.pickup);
          setDestination(existing.destination);
          setDate(toInputDate(when));
          setTime(`${pad(when.getHours())}:${pad(when.getMinutes())}`);
          setPriority(existing.priority);
          setNotes(existing.notes ?? "");
          setRows(
            existing.items.length
              ? existing.items.map((i) => newRow(i.code, String(i.quantity)))
              : [newRow(options.items[0]?.code ?? "")]
          );
        } else {
          setRows((r) => r.map((row) => (row.code ? row : { ...row, code: options.items[0]?.code ?? "" })));
        }
      } catch {
        if (alive) setLoadError("We could not load this form. Check your connection and try again.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [editId]);

  const unitOf = (code) => items.find((i) => i.code === code)?.unit ?? "";
  const usedCodes = new Set(rows.map((r) => r.code));

  const totalUnits = useMemo(
    () => rows.reduce((sum, r) => sum + (Number(r.quantity) > 0 ? Number(r.quantity) : 0), 0),
    [rows]
  );
  const estimate = estimateVehicle(totalUnits);

  const updateRow = (key, patch) => setRows((r) => r.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  const removeRow = (key) => setRows((r) => (r.length > 1 ? r.filter((row) => row.key !== key) : r));
  const addRow = () => {
    const free = items.find((i) => !usedCodes.has(i.code));
    if (free) setRows((r) => [...r, newRow(free.code)]);
  };

  const swapStores = () => {
    if (!destination) return;
    setPickup(destination);
    setDestination(pickup);
  };

  const validate = () => {
    const e = {};
    if (!destination) e.destination = "Choose a destination store.";
    else if (destination === pickup) e.destination = "Destination must be different from the pickup store.";
    else if (pickup !== myStore && destination !== myStore) e.destination = `Pickup or destination must be ${myStore}.`;

    if (!date) e.date = "Choose a date.";
    if (!time) e.time = "Choose a pickup time.";
    else if (time < STORE_HOURS.open || time > STORE_HOURS.close) {
      e.time = `Choose a time between ${STORE_HOURS.open} and ${STORE_HOURS.close}.`;
    }
    if (date && time && !e.time && new Date(`${date}T${time}`) < new Date()) e.date = "Choose a date and time in the future.";

    if (!rows.some((r) => r.code && Number(r.quantity) > 0)) e.items = "Add at least one item with a quantity.";
    else if (rows.some((r) => r.quantity !== "" && !(Number(r.quantity) > 0))) e.items = "Quantities must be more than 0.";
    return e;
  };

  const submit = async (draft) => {
    const e = draft ? {} : validate();
    setErrors(e);
    setSubmitError("");
    if (Object.keys(e).length) return;

    setBusy(true);
    try {
      await saveBooking(
        {
          pickup,
          destination,
          requestedFor: `${date}T${time || "09:00"}:00`,
          priority,
          notes: notes.trim(),
          items: rows.filter((r) => r.code && Number(r.quantity) > 0).map((r) => ({ code: r.code, quantity: Number(r.quantity) })),
          draft,
        },
        editId
      );
      navigate("/bookings");
    } catch {
      setSubmitError(draft ? "We could not save the draft. Try again." : "We could not submit this booking. Try again.");
      setBusy(false);
    }
  };

  const requestedLabel = date && time ? formatShortDateTime(`${date}T${time}:00`) : "–";

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold leading-tight tracking-tight">{editId ? "Edit booking" : "New booking"}</h1>
          <p className="text-sm text-mute">Request a vehicle to move goods between stores. An administrator reviews every booking.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/bookings")}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-line bg-white px-4 text-[13px] font-medium hover:bg-slate-50"
        >
          <ArrowLeft size={15} /> Back to bookings
        </button>
      </div>

      {loadError && <p className="py-6 text-center text-bad">{loadError}</p>}
      {!loadError && loading && <p className="py-10 text-center text-mute">Loading…</p>}

      {!loadError && !loading && (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          {/* ---------- Form ---------- */}
          <section className={CARD}>
            {/* Route */}
            <div className="p-5">
              <h2 className="mb-3 text-[13px] font-semibold">Route</h2>
              <div className="grid grid-cols-[minmax(0,1fr)_40px_minmax(0,1fr)] items-end gap-2">
                <div>
                  <label htmlFor="pickup" className={LABEL}>Pickup store</label>
                  <select id="pickup" value={pickup} onChange={(e) => setPickup(e.target.value)} className={FIELD}>
                    {stores.map((s) => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={swapStores}
                  disabled={!destination}
                  aria-label="Swap pickup and destination"
                  className="grid h-10 w-10 place-items-center rounded-md border border-line text-mute hover:bg-slate-50 disabled:opacity-40"
                >
                  <ArrowLeftRight size={15} />
                </button>
                <div>
                  <label htmlFor="destination" className={LABEL}>Destination store</label>
                  <select
                    id="destination"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className={`${FIELD} ${destination ? "" : "text-mute"}`}
                  >
                    <option value="">Choose destination</option>
                    {stores.map((s) => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              {errors.destination && <p className={ERR}>{errors.destination}</p>}
            </div>

            {/* Items */}
            <div className="border-t border-line p-5">
              <h2 className="mb-3 text-[13px] font-semibold">Items</h2>
              <div className={`${ITEM_GRID} mb-1 text-xs text-mute`}>
                <span>Item</span>
                <span>Quantity</span>
                <span>Unit</span>
                <span />
              </div>
              <div className="space-y-2">
                {rows.map((row) => (
                  <div key={row.key} className={ITEM_GRID}>
                    <ItemPicker
                      items={items}
                      value={row.code}
                      usedCodes={usedCodes}
                      onChange={(code) => updateRow(row.key, { code })}
                    />
                    <input
                      type="number"
                      min="1"
                      inputMode="numeric"
                      value={row.quantity}
                      onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                      placeholder="Quantity"
                      aria-label="Quantity"
                      className={`${FIELD_BASE} w-full tabular-nums`}
                    />
                    <span className="text-sm text-mute">{unitOf(row.code)}</span>
                    <button
                      type="button"
                      onClick={() => removeRow(row.key)}
                      disabled={rows.length === 1}
                      aria-label="Remove item"
                      className="grid h-10 w-10 place-items-center rounded-md border border-line text-mute hover:bg-slate-50 disabled:opacity-40"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              {errors.items && <p className={ERR}>{errors.items}</p>}
              <button
                type="button"
                onClick={addRow}
                disabled={rows.length >= items.length}
                className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-md border border-line px-3 text-[13px] font-medium hover:bg-slate-50 disabled:opacity-40"
              >
                <Plus size={14} /> Add another item
              </button>
            </div>

            {/* Schedule */}
            <div className="border-t border-line p-5">
              <h2 className="mb-3 text-[13px] font-semibold">Schedule</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="date" className={LABEL}>Requested date</label>
                  <input id="date" type="date" value={date} min={toInputDate(new Date())} onChange={(e) => setDate(e.target.value)} className={FIELD} />
                  {errors.date && <p className={ERR}>{errors.date}</p>}
                </div>
                <div>
                  <label htmlFor="time" className={LABEL}>Pickup time</label>
                  <input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className={FIELD} />
                  {errors.time && <p className={ERR}>{errors.time}</p>}
                </div>
                <div>
                  <label htmlFor="priority" className={LABEL}>Priority</label>
                  <select id="priority" value={priority} onChange={(e) => setPriority(e.target.value)} className={FIELD}>
                    <option>Standard</option>
                    <option>Urgent</option>
                  </select>
                </div>
              </div>
              <p className="mt-2 text-xs text-mute">
                {shortStore(pickup)} is open {STORE_HOURS.open} to {STORE_HOURS.close}. Loading slots are confirmed on approval.
              </p>
            </div>

            {/* Notes */}
            <div className="border-t border-line p-5">
              <h2 className="mb-3 text-[13px] font-semibold">Notes</h2>
              <label htmlFor="notes" className={LABEL}>
                Instructions for the driver or administrator <span>(optional)</span>
              </label>
              <textarea
                id="notes"
                value={notes}
                maxLength={NOTES_LIMIT}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full resize-none rounded-md border border-line p-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
              <p className="mt-1 text-xs text-mute tabular-nums">{notes.length} / {NOTES_LIMIT}</p>
            </div>

            {/* Actions */}
            <div className="border-t border-line px-5 py-3">
              {submitError && <p className="mb-2 text-[13px] text-bad">{submitError}</p>}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => submit(false)}
                  disabled={busy}
                  className="h-9 rounded-md bg-brand px-4 text-[13px] font-medium text-white hover:brightness-110 disabled:opacity-60"
                >
                  {busy ? "Saving…" : editId ? "Save changes" : "Submit booking"}
                </button>
                <button
                  type="button"
                  onClick={() => submit(true)}
                  disabled={busy}
                  className="h-9 rounded-md border border-line px-4 text-[13px] font-medium hover:bg-slate-50 disabled:opacity-60"
                >
                  Save draft
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/bookings")}
                  className="ml-auto h-9 rounded-md border border-line px-4 text-[13px] font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </section>

          {/* ---------- Summary ---------- */}
          <aside className={`${CARD} lg:sticky lg:top-0`}>
            <div className="border-b border-line px-5 py-3.5">
              <h2 className="text-[13px] font-semibold">Summary</h2>
            </div>
            <dl className="px-5 py-3 text-[13px]">
              {[
                ["Route", destination ? `${shortStore(pickup)} → ${shortStore(destination)}` : "Choose destination"],
                ["Items", `${rows.length} ${rows.length === 1 ? "line" : "lines"}`],
                ["Total units", formatNumber(totalUnits)],
                ["Requested", requestedLabel],
                ["Priority", priority],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3 py-1.5">
                  <dt className="text-mute">{label}</dt>
                  <dd className="text-right font-medium tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="px-5 pb-5">
              <div
                className={`rounded-md border border-line border-l-[3px] px-3 py-2 text-[13px] leading-snug ${
                  !estimate ? "border-l-slate-400" : estimate.ok ? "border-l-ok" : "border-l-warn"
                }`}
              >
                <p>{estimate ? estimate.text : "Add quantities to see a vehicle estimate."}</p>
                <p className="mt-1 text-xs text-mute">Estimate only. The administrator confirms the vehicle.</p>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}