import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { createBooking, MAX_UNITS } from "../../api/bookingApi";
import { getItems } from "../../api/itemApi";
import { getStores } from "../../api/storeApi";
import useAuth from "../../hooks/useAuth";
import { formatNumber } from "../../utils/formatters";
import { VehicleHint } from "./BookingParts";

const CARD = "min-w-0 rounded-xl border border-line bg-white";
const LABEL = "mb-1 block text-[13px] text-mute";
const FIELD_BASE =
  "h-10 rounded-md border border-line bg-white px-3 text-sm outline-none placeholder:text-mute focus:border-brand focus:ring-2 focus:ring-brand/20";
const FIELD = `${FIELD_BASE} w-full`;
const ERR = "mt-1 text-[13px] text-bad";

const pad = (n) => String(n).padStart(2, "0");
const toInputDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

let rowKey = 0;
const newRow = (code = "") => ({ key: ++rowKey, code, quantity: "" });

/* Item field: looks like a plain input (no arrow), click or type to search the list */
function ItemPicker({ items, value, usedCodes, onChange }) {
  const selected = items.find((i) => i.code === value);
  const label = selected ? `${selected.code} · ${selected.name}` : "";
  const [open, setOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState("");

  const q = typing ? text.trim().toLowerCase() : "";
  const options = items.filter((i) => !q || `${i.code} ${i.name}`.toLowerCase().includes(q));
  const isFree = (i) => !usedCodes.has(i.code) || i.code === value;

  const choose = (code) => {
    onChange(code);
    setOpen(false);
    setTyping(false);
    setText("");
  };

  return (
    <div className="relative min-w-0 flex-1">
      <input
        type="text"
        value={typing ? text : label}
        placeholder="Select item"
        aria-label="Item"
        autoComplete="off"
        onFocus={(e) => {
          setOpen(true);
          e.target.select();
        }}
        onChange={(e) => {
          setText(e.target.value);
          setTyping(true);
          setOpen(true);
        }}
        onBlur={() => {
          setOpen(false);
          setTyping(false);
          setText("");
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") e.currentTarget.blur();
          if (e.key === "Enter") {
            e.preventDefault();
            const first = options.find(isFree);
            if (first) choose(first.code);
          }
        }}
        className={FIELD}
      />
      {open && (
        <ul className="absolute left-0 right-0 top-[44px] z-20 max-h-56 overflow-auto rounded-md border border-line bg-white py-1 shadow-lg">
          {options.map((i) => (
            <li key={i.code}>
              <button
                type="button"
                disabled={!isFree(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(i.code);
                }}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white ${
                  i.code === value ? "font-medium text-brand" : ""
                }`}
              >
                {i.code} · {i.name}
              </button>
            </li>
          ))}
          {options.length === 0 && <li className="px-3 py-2 text-sm text-mute">No items found</li>}
        </ul>
      )}
    </div>
  );
}

export default function NewBookingForm() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [stores, setStores] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return toInputDate(d);
  });
  const [time, setTime] = useState("09:00");
  const [priority, setPriority] = useState("Standard");
  const [rows, setRows] = useState([newRow()]);
  const [notes, setNotes] = useState("");

  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    let alive = true;
    Promise.all([getStores(), getItems()])
      .then(([storeList, itemList]) => {
        if (!alive) return;
        setStores(storeList);
        setItems(itemList);
        setPickup((p) => p || storeList[0]?.name || "");
        setDestination((d) => d || storeList[2]?.name || storeList[1]?.name || "");
        setRows((r) => r.map((row) => (row.code ? row : { ...row, code: itemList[0]?.code ?? "" })));
      })
      .catch(() => alive && setLoadError("We could not load stores and items. Check your connection and try again."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const totalUnits = useMemo(() => rows.reduce((sum, r) => sum + (Number(r.quantity) > 0 ? Number(r.quantity) : 0), 0), [rows]);

  const updateRow = (key, patch) => setRows((r) => r.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  const removeRow = (key) => setRows((r) => (r.length > 1 ? r.filter((row) => row.key !== key) : r));
  const addRow = () => {
    const used = new Set(rows.map((r) => r.code));
    const free = items.find((i) => !used.has(i.code));
    if (free) setRows((r) => [...r, newRow(free.code)]);
  };

  const validate = () => {
    const e = {};
    if (!pickup) e.pickup = "Choose a pickup store.";
    if (!destination) e.destination = "Choose a destination store.";
    else if (destination === pickup) e.destination = "Destination must be different from the pickup store.";
    if (!date) e.date = "Choose a date.";
    if (!time) e.time = "Choose a time.";
    if (date && time && new Date(`${date}T${time}`) < new Date()) e.date = "Choose a date and time in the future.";
    if (!rows.some((r) => r.code && Number(r.quantity) > 0)) e.items = "Add at least one item with a quantity.";
    else if (rows.some((r) => r.quantity !== "" && !(Number(r.quantity) > 0))) e.items = "Quantities must be more than 0.";
    return e;
  };

  const submit = async () => {
    const e = validate();
    setErrors(e);
    setSubmitError("");
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await createBooking({
        pickup,
        destination,
        requestedFor: `${date}T${time}:00`,
        priority,
        items: rows.filter((r) => r.code && Number(r.quantity) > 0).map((r) => ({ code: r.code, quantity: Number(r.quantity) })),
        notes: notes.trim(),
        requestedBy: user?.name ?? "",
      });
      navigate("/bookings");
    } catch {
      setSubmitError("We could not submit this booking. Try again.");
      setBusy(false);
    }
  };

  const usedCodes = new Set(rows.map((r) => r.code));

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold leading-tight tracking-tight">New booking</h1>
          <p className="text-sm text-mute">Request a vehicle to move items between stores</p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/bookings")}
          className="h-9 shrink-0 rounded-md border border-line bg-white px-4 text-[13px] font-medium hover:bg-slate-50"
        >
          Back to bookings
        </button>
      </div>

      {loadError && <p className="py-6 text-center text-bad">{loadError}</p>}
      {!loadError && loading && <p className="py-10 text-center text-mute">Loading…</p>}

      {!loadError && !loading && (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* ---------- Form ---------- */}
          <section className={CARD}>
            <div className="p-5">
              <h2 className="mb-3 text-[15px] font-semibold">Route and time</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="pickup" className={LABEL}>Pickup store</label>
                  <select id="pickup" value={pickup} onChange={(e) => setPickup(e.target.value)} className={FIELD}>
                    {stores.map((s) => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                  {errors.pickup && <p className={ERR}>{errors.pickup}</p>}
                </div>
                <div>
                  <label htmlFor="destination" className={LABEL}>Destination store</label>
                  <select id="destination" value={destination} onChange={(e) => setDestination(e.target.value)} className={FIELD}>
                    {stores.map((s) => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                  {errors.destination && <p className={ERR}>{errors.destination}</p>}
                </div>
                <div>
                  <label htmlFor="date" className={LABEL}>Date</label>
                  <input id="date" type="date" value={date} min={toInputDate(new Date())} onChange={(e) => setDate(e.target.value)} className={FIELD} />
                  {errors.date && <p className={ERR}>{errors.date}</p>}
                </div>
                <div>
                  <label htmlFor="time" className={LABEL}>Time</label>
                  <input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className={FIELD} />
                  {errors.time && <p className={ERR}>{errors.time}</p>}
                </div>
              </div>
            </div>

            <div className="border-t border-line p-5">
              <h2 className="mb-3 text-[15px] font-semibold">Priority</h2>
              <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Priority">
                {[
                  ["Standard", "Normal approval queue"],
                  ["Urgent", "Flagged for same-day review"],
                ].map(([value, hint]) => (
                  <label
                    key={value}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 ${
                      priority === value ? "border-brand bg-blue-50/60" : "border-line hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="priority"
                      value={value}
                      checked={priority === value}
                      onChange={() => setPriority(value)}
                      className="mt-1 accent-[var(--color-brand)]"
                    />
                    <span>
                      <span className="block text-[13px] font-semibold">{value}</span>
                      <span className="block text-xs text-mute">{hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="border-t border-line p-5">
              <h2 className="mb-3 text-[15px] font-semibold">Items</h2>
              <div className="space-y-2">
                {rows.map((row) => (
                  <div key={row.key} className="flex w-full items-center gap-2">
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
                      className={`${FIELD_BASE} w-[110px] shrink-0 tabular-nums`}
                    />
                    <button
                      type="button"
                      onClick={() => removeRow(row.key)}
                      disabled={rows.length === 1}
                      aria-label="Remove item"
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-line text-sm text-mute hover:bg-slate-50 disabled:opacity-40"
                    >
                      ×
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

            <div className="border-t border-line p-5">
              <label htmlFor="notes" className={LABEL}>Notes (optional)</label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Gate access, handling instructions..."
                className="w-full resize-none rounded-md border border-line p-3 text-sm outline-none placeholder:text-mute focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
          </section>

          {/* ---------- Summary ---------- */}
          <aside className={`${CARD} lg:sticky lg:top-0`}>
            <div className="p-5">
              <h2 className="text-[15px] font-semibold">Summary</h2>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span>Total units</span>
                <b className="tabular-nums">{formatNumber(totalUnits)}</b>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded bg-slate-100">
                <div
                  className={`h-full rounded ${totalUnits > MAX_UNITS ? "bg-warn" : "bg-brand"}`}
                  style={{ width: `${Math.min(totalUnits / MAX_UNITS, 1) * 100}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-xs text-mute tabular-nums">
                <span>0</span>
                <span>{formatNumber(MAX_UNITS)}</span>
              </div>
              <div className="mt-3">
                <VehicleHint units={totalUnits} emptyText="Add quantities to see a vehicle suggestion." />
              </div>
            </div>

            <div className="border-t border-line p-5">
              {submitError && <p className="mb-2 text-[13px] text-bad">{submitError}</p>}
              <button
                type="button"
                onClick={submit}
                disabled={busy}
                className="h-9 w-full rounded-md bg-brand text-[13px] font-medium text-white hover:brightness-110 disabled:opacity-60"
              >
                {busy ? "Submitting…" : "Submit for approval"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/bookings")}
                className="mt-2 h-9 w-full rounded-md border border-line text-[13px] font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <p className="mt-3 text-xs text-mute">
                Capacity and loading slots are checked again before a vehicle is assigned.
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}