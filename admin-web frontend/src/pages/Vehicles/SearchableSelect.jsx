import { useEffect, useMemo, useRef, useState } from "react";

// Searchable dropdown used for Driver and Hub. Options: [{ value, label, description?, badge?, disabled? }]
// Calls onChange with a select-like event ({ target: { name, value } }) so it works with the form's handleChange.
export default function SearchableSelect({
  id,
  name,
  value,
  options,
  onChange,
  placeholder = "Select",
  searchPlaceholder = "Search...",
  hasError = false,
  disabled = false,
  icon = null,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);

  const selected = options.find((option) => option.value === value);

  // Filter by label, description and badge text
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) =>
      [option.label, option.description, option.badge].some((text) => String(text || "").toLowerCase().includes(q))
    );
  }, [options, query]);

  // Close the list when clicking outside it
  useEffect(() => {
    if (!open) return undefined;
    const handleOutside = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const choose = (option) => {
    if (option.disabled) return;
    onChange({ target: { name, value: option.value } });
    setOpen(false);
    setQuery("");
  };

  const toggle = () => {
    if (disabled) return;
    setOpen((prev) => !prev);
    setQuery("");
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        id={id}
        type="button"
        onClick={toggle}
        onKeyDown={(event) => event.key === "Escape" && setOpen(false)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={hasError}
        className={[
          "flex w-full items-center rounded-lg border bg-slate-50 py-2.5 pr-9 text-left text-sm outline-none transition",
          icon ? "pl-9" : "pl-3",
          "focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60",
          hasError ? "border-red-400" : "border-slate-200 hover:border-slate-300",
        ].join(" ")}
      >
        {icon && <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">{icon}</span>}
        <span className={`truncate ${selected ? "text-slate-800" : "text-slate-400"}`}>{selected ? selected.label : placeholder}</span>
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 p-2">
            <input
              type="search"
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => event.key === "Escape" && setOpen(false)}
              placeholder={searchPlaceholder}
              className="w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:bg-white"
            />
          </div>
          <ul role="listbox" className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 && <li className="px-3 py-3 text-sm text-slate-400">No matches found.</li>}
            {filtered.map((option) => (
              <li key={option.value} role="option" aria-selected={option.value === value} aria-disabled={option.disabled}>
                <button
                  type="button"
                  onClick={() => choose(option)}
                  disabled={option.disabled}
                  className={[
                    "flex w-full items-start justify-between gap-3 px-3 py-2 text-left text-sm",
                    option.disabled ? "cursor-not-allowed text-slate-400" : "text-slate-800 hover:bg-blue-50",
                    option.value === value ? "bg-blue-50/70" : "",
                  ].join(" ")}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{option.label}</span>
                    {option.description && <span className="block truncate text-xs text-slate-400">{option.description}</span>}
                  </span>
                  {option.badge && (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        option.disabled ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {option.badge}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
