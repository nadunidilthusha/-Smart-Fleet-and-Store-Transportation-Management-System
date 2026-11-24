import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  UserX,
  Users as UsersIcon,
  X,
} from "lucide-react";
import useAuth from "../hooks/useAuth";
import { createUser, getUsers, parseUserError, updateUser } from "../api/userApi";
import { getStores } from "../api/storeApi";
import { formatShortDateTime, getInitials } from "../utils/formatters";
import { ROLE_LABELS, ROLES } from "../utils/roles";

const CARD = "rounded-xl border border-line bg-white";
const TH = "whitespace-nowrap bg-slate-50 px-4 py-2.5 text-left text-[13px] font-medium text-mute";
const TD = "whitespace-nowrap border-t border-line px-4 py-3 text-sm";
const FIELD =
  "h-9 w-full rounded-md border bg-white px-3 text-[13px] outline-none placeholder:text-mute focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-50 disabled:text-mute";

const STORE_ROLES = [ROLES.STORE_MANAGER, ROLES.STORE_EMPLOYEE];
const ROLE_TABS = ["All", ROLES.SYSTEM_ADMIN, ROLES.STORE_MANAGER, ROLES.STORE_EMPLOYEE, ROLES.DRIVER];

const ROLE_OPTIONS = [
  { value: ROLES.SYSTEM_ADMIN, desc: "Full access to every store, booking, trip and setting." },
  { value: ROLES.STORE_MANAGER, desc: "Manages bookings, schedules and confirmations for one store." },
  { value: ROLES.STORE_EMPLOYEE, desc: "Views bookings and schedules, and confirms handover for one store." },
  { value: ROLES.DRIVER, desc: "Uses the driver mobile app for assigned trips." },
];

const ROLE_STYLE = {
  SYSTEM_ADMIN: "bg-violet-50 text-violet-700",
  STORE_MANAGER: "bg-blue-50 text-blue-700",
  STORE_EMPLOYEE: "bg-teal-50 text-teal-700",
  DRIVER: "bg-amber-50 text-amber-700",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const passwordProblem = (value) => {
  if (value.length < 8) return "Use at least 8 characters.";
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return "Include at least one letter and one number.";
  return "";
};

function generatePassword(length = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const cryptoApi = typeof window !== "undefined" ? window.crypto : null;
  const values = cryptoApi?.getRandomValues
    ? cryptoApi.getRandomValues(new Uint32Array(length))
    : Array.from({ length }, () => Math.floor(Math.random() * 4294967295));
  const out = Array.from(values, (v) => chars[v % chars.length]).join("");
  return /\d/.test(out) && /[a-z]/.test(out) && /[A-Z]/.test(out) ? out : generatePassword(length);
}

/* ---------- small pieces ---------- */
function SummaryCard({ label, value, icon: Icon, tone }) {
  return (
    <div className={`${CARD} flex items-start justify-between p-4`}>
      <div>
        <p className="text-[13px] text-mute">{label}</p>
        <p className="mt-1 text-[26px] font-semibold leading-tight tabular-nums">{value}</p>
      </div>
      <span className={`grid h-8 w-8 place-items-center rounded-lg ${tone}`}>
        <Icon size={16} strokeWidth={1.8} />
      </span>
    </div>
  );
}

function RoleChip({ role }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_STYLE[role] ?? "bg-slate-100 text-slate-600"}`}>
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

function StatusDot({ status }) {
  const active = status === "Active";
  return (
    <span className="inline-flex items-center gap-2">
      <i className={`h-2 w-2 rounded-full ${active ? "bg-ok" : "bg-slate-400"}`} />
      {status}
    </span>
  );
}

function Field({ label, htmlFor, error, hint, children }) {
  return (
    <div className="mb-4">
      <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium">
        {label}
      </label>
      {children}
      {error ? <p className="mt-1 text-[13px] text-bad">{error}</p> : hint && <p className="mt-1 text-xs text-mute">{hint}</p>}
    </div>
  );
}

/* ---------- add / edit drawer ---------- */
function UserDrawer({ user, stores, currentUserId, activeAdmins, onClose, onSaved }) {
  const isEdit = Boolean(user);
  const isSelf = isEdit && user.id === currentUserId;
  const isLastAdmin = isEdit && user.role === ROLES.SYSTEM_ADMIN && user.status === "Active" && activeAdmins <= 1;
  const locked = isSelf || isLastAdmin;

  const [form, setForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    employeeId: user?.employeeId ?? "",
    role: user?.role ?? ROLES.STORE_EMPLOYEE,
    storeId: user?.storeId ?? "",
    password: "",
    status: user?.status ?? "Active",
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = (field) => (e) => {
    const value = e.target.value;
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: "" }));
  };

  const needsStore = STORE_ROLES.includes(form.role);
  const showStore = form.role !== ROLES.SYSTEM_ADMIN;

  const validate = () => {
    const next = {};
    if (form.name.trim().length < 2) next.name = "Enter the full name.";
    if (!form.email.trim()) next.email = "Email is required.";
    else if (!EMAIL_RE.test(form.email.trim())) next.email = "Enter a valid email address.";
    if (!isEdit) {
      if (!form.employeeId.trim()) next.employeeId = "Employee ID is required.";
      else if (!/^[A-Za-z0-9-]{3,20}$/.test(form.employeeId.trim())) next.employeeId = "Use 3 to 20 letters, numbers or dashes.";
    }
    if (needsStore && !form.storeId) next.storeId = "Choose the store this person works in.";
    if (!isEdit || form.password) {
      const problem = form.password ? passwordProblem(form.password) : "Password is required.";
      if (problem) next.password = problem;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    if (!validate()) return;

    const storeId = showStore && form.storeId ? form.storeId : null;
    const email = form.email.trim().toLowerCase();
    setBusy(true);
    try {
      if (!isEdit) {
        const created = await createUser({
          name: form.name.trim(),
          email,
          employeeId: form.employeeId.trim().toUpperCase(),
          password: form.password,
          role: form.role,
          storeId,
        });
        onSaved(`${created.name} was added.`);
        return;
      }

      // Send only what changed
      const patch = {};
      if (form.name.trim() !== user.name) patch.name = form.name.trim();
      if (email !== user.email.toLowerCase()) patch.email = email;
      if (form.role !== user.role) patch.role = form.role;
      if ((storeId ?? null) !== (user.storeId ?? null)) patch.storeId = storeId;
      if (form.status !== user.status) patch.status = form.status;
      if (form.password) patch.password = form.password;

      if (Object.keys(patch).length === 0) {
        setFormError("There are no changes to save.");
        setBusy(false);
        return;
      }
      const updated = await updateUser(user.id, patch);
      onSaved(`${updated.name} was updated.`);
    } catch (error) {
      const { message, fieldErrors } = parseUserError(error, "We could not save this user.");
      setErrors(fieldErrors);
      setFormError(Object.keys(fieldErrors).length ? "Check the highlighted fields." : message);
      setBusy(false);
    }
  };

  const border = (field) => (errors[field] ? "border-bad" : "border-line");

  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-slate-900/40" onClick={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? "Edit user" : "Add user"}
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        noValidate
        className="flex h-full w-[520px] max-w-full flex-col bg-white shadow-xl"
      >
        <div className="flex items-start justify-between border-b border-line px-6 py-4">
          <div>
            <h2 className="text-base font-semibold">{isEdit ? "Edit user" : "Add user"}</h2>
            <p className="text-[13px] text-mute">
              {isEdit ? `${user.name} · ${user.employeeId}` : "Create an account and choose what this person can do."}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-md text-mute hover:bg-slate-100">
            <X size={17} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {formError && <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2.5 text-[13px] text-bad">{formError}</p>}

          <Field label="Full name" htmlFor="u-name" error={errors.name}>
            <input id="u-name" autoFocus value={form.name} onChange={set("name")} className={`${FIELD} ${border("name")}`} />
          </Field>

          <div className="grid gap-x-4 sm:grid-cols-2">
            <Field label="Email" htmlFor="u-email" error={errors.email}>
              <input id="u-email" type="email" value={form.email} onChange={set("email")} className={`${FIELD} ${border("email")}`} />
            </Field>
            <Field label="Employee ID" htmlFor="u-emp" error={errors.employeeId} hint={isEdit ? "The employee ID cannot be changed." : undefined}>
              <input id="u-emp" value={form.employeeId} onChange={set("employeeId")} disabled={isEdit} placeholder="EMP-1010" className={`${FIELD} ${border("employeeId")}`} />
            </Field>
          </div>

          <fieldset className="mb-4" disabled={locked}>
            <legend className="mb-1.5 text-[13px] font-medium">Role</legend>
            <div className="space-y-2">
              {ROLE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${
                    form.role === option.value ? "border-brand bg-blue-50/50" : "border-line"
                  } ${locked ? "cursor-not-allowed opacity-70" : "hover:border-slate-300"}`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={option.value}
                    checked={form.role === option.value}
                    onChange={set("role")}
                    className="mt-1 accent-[#2563eb]"
                  />
                  <span>
                    <span className="block text-sm font-medium">{ROLE_LABELS[option.value]}</span>
                    <span className="block text-xs text-mute">{option.desc}</span>
                  </span>
                </label>
              ))}
            </div>
            {isSelf && <p className="mt-1.5 text-xs text-mute">You can’t change your own role or status.</p>}
            {!isSelf && isLastAdmin && <p className="mt-1.5 text-xs text-mute">At least one active administrator is required.</p>}
          </fieldset>

          {showStore && (
            <Field
              label={needsStore ? "Store" : "Home store (optional)"}
              htmlFor="u-store"
              error={errors.storeId}
              hint={needsStore ? "This person only sees bookings for this store." : undefined}
            >
              <select id="u-store" value={form.storeId} onChange={set("storeId")} className={`${FIELD} ${border("storeId")}`}>
                <option value="">{needsStore ? "Choose a store" : "No home store"}</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field
            label={isEdit ? "New password (optional)" : "Password"}
            htmlFor="u-pw"
            error={errors.password}
            hint="At least 8 characters with a letter and a number."
          >
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  id="u-pw"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={set("password")}
                  className={`${FIELD} pr-10 ${border("password")}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-1 top-0.5 grid h-8 w-8 place-items-center rounded-md text-mute hover:bg-slate-100"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setForm((p) => ({ ...p, password: generatePassword() }));
                  setErrors((p) => ({ ...p, password: "" }));
                  setShowPassword(true);
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line px-3 text-[13px] font-medium hover:bg-slate-50"
              >
                <RefreshCw size={14} /> Generate
              </button>
            </div>
          </Field>

          {isEdit && (
            <Field label="Status" htmlFor="u-status" hint="Inactive users cannot sign in.">
              <select id="u-status" value={form.status} onChange={set("status")} disabled={locked} className={`${FIELD} border-line`}>
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </Field>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-line px-6 py-3">
          <button type="button" onClick={onClose} className="h-9 rounded-md border border-line px-4 text-[13px] font-medium hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="h-9 rounded-md bg-brand px-4 text-[13px] font-medium text-white hover:brightness-110 disabled:cursor-progress disabled:opacity-70"
          >
            {busy ? "Saving…" : isEdit ? "Save changes" : "Add user"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ---------- activate / deactivate confirmation ---------- */
function StatusDialog({ target, blockedReason, busy, error, onCancel, onConfirm }) {
  const deactivating = target.next === "Inactive";
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/40 px-4" onClick={onCancel}>
      <div role="dialog" aria-modal="true" aria-label="Confirm status change" onClick={(e) => e.stopPropagation()} className="w-full max-w-[420px] rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-base font-semibold">{deactivating ? "Deactivate this user?" : "Activate this user?"}</h2>
        <p className="mt-1.5 text-sm text-mute">
          {deactivating
            ? `${target.user.name} will no longer be able to sign in. Their bookings and history are kept.`
            : `${target.user.name} will be able to sign in again.`}
        </p>
        {(blockedReason || error) && <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-[13px] text-bad">{blockedReason || error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="h-9 rounded-md border border-line px-4 text-[13px] font-medium hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy || Boolean(blockedReason)}
            className={`h-9 rounded-md px-4 text-[13px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 ${deactivating ? "bg-bad" : "bg-brand"}`}
          >
            {busy ? "Saving…" : deactivating ? "Deactivate" : "Activate"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- page ---------- */
export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [tab, setTab] = useState("All");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [storeFilter, setStoreFilter] = useState("All");

  const [drawer, setDrawer] = useState(null); // null | "new" | a user
  const [confirm, setConfirm] = useState(null); // { user, next }
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const [toast, setToast] = useState("");

  // silent = refresh the list in the background after a save, without hiding the table
  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const [userList, storeList] = await Promise.all([getUsers(), getStores().catch(() => [])]);
      setUsers(Array.isArray(userList) ? userList : []);
      setStores(Array.isArray(storeList) ? storeList : []);
    } catch (err) {
      setError(parseUserError(err, "We could not load users.").message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const storeName = useCallback(
    (u) => {
      if (u.role === ROLES.SYSTEM_ADMIN) return "All stores";
      return u.storeName ?? stores.find((s) => s.id === u.storeId)?.name ?? "–";
    },
    [stores]
  );

  const activeAdmins = useMemo(() => users.filter((u) => u.role === ROLES.SYSTEM_ADMIN && u.status === "Active").length, [users]);

  const counts = useMemo(
    () => ({
      All: users.length,
      ...Object.fromEntries(Object.values(ROLES).map((r) => [r, users.filter((u) => u.role === r).length])),
      active: users.filter((u) => u.status === "Active").length,
      inactive: users.filter((u) => u.status !== "Active").length,
    }),
    [users]
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter(
      (u) =>
        (tab === "All" || u.role === tab) &&
        (statusFilter === "All" || u.status === statusFilter) &&
        (storeFilter === "All" || (u.storeId ?? "") === storeFilter) &&
        (!q || [u.name, u.email, u.employeeId].join(" ").toLowerCase().includes(q))
    );
  }, [users, tab, query, statusFilter, storeFilter]);

  const handleSaved = (message) => {
    setDrawer(null);
    setToast(message);
    load({ silent: true });
  };

  const blockedReason = confirm
    ? confirm.user.id === me?.id
      ? "You can’t deactivate your own account."
      : confirm.next === "Inactive" && confirm.user.role === ROLES.SYSTEM_ADMIN && activeAdmins <= 1
        ? "At least one active administrator is required."
        : ""
    : "";

  const runConfirm = async () => {
    setConfirmBusy(true);
    setConfirmError("");
    try {
      await updateUser(confirm.user.id, { status: confirm.next });
      setToast(`${confirm.user.name} was ${confirm.next === "Inactive" ? "deactivated" : "activated"}.`);
      setConfirm(null);
      load({ silent: true });
    } catch (err) {
      setConfirmError(parseUserError(err, "We could not change the status.").message);
    } finally {
      setConfirmBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold leading-tight tracking-tight">Users</h1>
          <p className="text-sm text-mute">Manage accounts, roles and store access.</p>
        </div>
        <button
          type="button"
          onClick={() => setDrawer("new")}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-brand px-4 text-[13px] font-medium text-white hover:brightness-110"
        >
          <Plus size={15} /> Add user
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard label="All users" value={counts.All} icon={UsersIcon} tone="bg-blue-50 text-blue-600" />
        <SummaryCard label="Active" value={counts.active} icon={UserCheck} tone="bg-green-50 text-green-600" />
        <SummaryCard label="Inactive" value={counts.inactive} icon={UserX} tone="bg-slate-100 text-slate-500" />
        <SummaryCard label="Administrators" value={counts[ROLES.SYSTEM_ADMIN]} icon={ShieldCheck} tone="bg-violet-50 text-violet-600" />
      </div>

      <section className={CARD}>
        <div className="flex gap-5 overflow-x-auto border-b border-line px-5">
          {ROLE_TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`-mb-px whitespace-nowrap border-b-2 py-3 text-[13px] ${
                tab === t ? "border-brand font-medium text-ink" : "border-transparent text-mute hover:text-ink"
              }`}
            >
              {t === "All" ? "All" : ROLE_LABELS[t]} <sup className="text-[11px]">{counts[t]}</sup>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 border-b border-line px-5 py-3">
          <div className="relative min-w-[220px] max-w-[340px] flex-1">
            <Search size={15} className="absolute left-3 top-[10px] text-mute" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email or employee ID"
              aria-label="Search users"
              className={`${FIELD} border-line pl-9`}
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status" className={`${FIELD} w-auto border-line`}>
            <option value="All">All statuses</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>
          <select value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)} aria-label="Filter by store" className={`${FIELD} w-auto border-line`}>
            <option value="All">All stores</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {error ? (
          <div className="p-8 text-center">
            <p className="text-bad">{error}</p>
            <button type="button" onClick={() => load()} className="mt-3 h-8 rounded-md bg-brand px-4 text-[13px] font-medium text-white hover:brightness-110">
              Try again
            </button>
          </div>
        ) : loading ? (
          <p className="py-12 text-center text-mute">Loading users…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse">
              <thead>
                <tr>
                  {["User", "Employee ID", "Role", "Store", "Status", "Added", ""].map((h, i) => (
                    <th key={i} className={TH}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => {
                  const self = u.id === me?.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className={TD}>
                        <div className="flex items-center gap-3">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                            {getInitials(u.name)}
                          </span>
                          <div className="leading-tight">
                            <p className="font-medium">
                              {u.name}
                              {self && <span className="ml-2 rounded bg-slate-100 px-1.5 text-xs font-normal text-mute">You</span>}
                            </p>
                            <p className="text-[13px] text-mute">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className={`${TD} tabular-nums`}>{u.employeeId}</td>
                      <td className={TD}>
                        <RoleChip role={u.role} />
                      </td>
                      <td className={TD}>{storeName(u)}</td>
                      <td className={TD}>
                        <StatusDot status={u.status} />
                      </td>
                      <td className={`${TD} text-mute`}>{u.createdAt ? formatShortDateTime(u.createdAt) : "–"}</td>
                      <td className={`${TD} text-right`}>
                        <div className="inline-flex gap-1">
                          <button
                            type="button"
                            onClick={() => setDrawer(u)}
                            aria-label={`Edit ${u.name}`}
                            title="Edit"
                            className="grid h-8 w-8 place-items-center rounded-md text-mute hover:bg-slate-100 hover:text-ink"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            disabled={self}
                            onClick={() => {
                              setConfirmError("");
                              setConfirm({ user: u, next: u.status === "Active" ? "Inactive" : "Active" });
                            }}
                            aria-label={`${u.status === "Active" ? "Deactivate" : "Activate"} ${u.name}`}
                            title={self ? "You can’t change your own status" : u.status === "Active" ? "Deactivate" : "Activate"}
                            className="grid h-8 w-8 place-items-center rounded-md text-mute hover:bg-slate-100 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {u.status === "Active" ? <UserX size={15} /> : <UserCheck size={15} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-mute">
                      {users.length === 0 ? "No users yet. Add the first user." : "No users match these filters."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && (
          <div className="border-t border-line px-5 py-3 text-[13px] text-mute">
            Showing {rows.length} of {users.length} users
          </div>
        )}
      </section>

      {drawer && (
        <UserDrawer
          user={drawer === "new" ? null : drawer}
          stores={stores}
          currentUserId={me?.id}
          activeAdmins={activeAdmins}
          onClose={() => setDrawer(null)}
          onSaved={handleSaved}
        />
      )}

      {confirm && (
        <StatusDialog
          target={confirm}
          blockedReason={blockedReason}
          busy={confirmBusy}
          error={confirmError}
          onCancel={() => setConfirm(null)}
          onConfirm={runConfirm}
        />
      )}

      {toast && (
        <div role="status" className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-md bg-ink px-4 py-2.5 text-[13px] text-white shadow-lg">
          <CheckCircle2 size={15} className="text-green-400" />
          {toast}
        </div>
      )}
    </div>
  );
}