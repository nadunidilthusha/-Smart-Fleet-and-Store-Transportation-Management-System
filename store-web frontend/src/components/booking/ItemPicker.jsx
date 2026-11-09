import { useState } from "react";

const FIELD =
  "h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none placeholder:text-mute focus:border-brand focus:ring-2 focus:ring-brand/20";

/* Item field: looks like a plain input, click or type to search the list */
export default function ItemPicker({ items, value, usedCodes, onChange }) {
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
    <div className="relative min-w-0">
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
        <ul className="absolute left-0 right-0 top-11 z-20 max-h-56 overflow-auto rounded-md border border-line bg-white py-1 shadow-lg">
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