import { useState } from "react";
import { Navigate, useLocation, useSearchParams } from "react-router-dom";
import { AlertCircle, Eye, EyeOff, Truck } from "lucide-react";
import useAuth from "../hooks/useAuth";
import { loginErrorMessage, loginRequest } from "../api/authApi";
import { APP_FULL_NAME, APP_NAME } from "../utils/constants";
import { ROLES } from "../utils/roles";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FIELD =
  "h-10 w-full rounded-md border bg-white px-3 text-sm outline-none placeholder:text-mute focus:border-brand focus:ring-2 focus:ring-brand/20";

export default function Login() {
  const { user, login } = useAuth();
  const location = useLocation();
  const [params] = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  // Send the user back to the page they were trying to open (ProtectedRoute passes it in state.from)
  const from = location.state?.from;
  const target = from && from.pathname !== "/login" ? `${from.pathname}${from.search ?? ""}` : "/dashboard";
  if (user) return <Navigate to={target} replace />;

  const validate = () => {
    const next = {};
    if (!email.trim()) next.email = "Email is required.";
    else if (!EMAIL_RE.test(email.trim())) next.email = "Enter a valid email address.";
    if (!password) next.password = "Password is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    if (!validate()) return;

    setBusy(true);
    try {
      const result = await loginRequest({ email, password });
      // This portal is for administrators only
      if (result.user?.role !== ROLES.SYSTEM_ADMIN) {
        setFormError("This account cannot use the admin portal. Use the store portal instead.");
        setBusy(false);
        return;
      }
      login(result); // the redirect happens on the next render
    } catch (error) {
      setFormError(loginErrorMessage(error));
      setPassword("");
      setBusy(false);
    }
  };

  const info = params.get("msg");

  return (
    <div className="grid min-h-screen place-items-center bg-page px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex items-center justify-center gap-2.5 text-[17px] font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-brand text-white">
            <Truck size={18} strokeWidth={1.8} />
          </span>
          {APP_NAME}
        </div>

        <div className="rounded-xl border border-line bg-white p-7">
          <h1 className="text-[22px] font-semibold leading-tight tracking-tight">Sign in</h1>
          <p className="mb-5 mt-1 text-sm text-mute">Use your administrator account to continue.</p>

          {info && <p className="mb-4 rounded-md bg-blue-50 px-3 py-2 text-[13px] text-blue-700">{info}</p>}

          {formError && (
            <div role="alert" className="mb-4 flex items-start gap-2 rounded-md bg-red-50 px-3 py-2.5 text-[13px] text-bad">
              <AlertCircle size={16} className="mt-px shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-4">
              <label htmlFor="email" className="mb-1.5 block text-[13px] font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                autoFocus
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors((p) => ({ ...p, email: "" }));
                }}
                placeholder="name@company.com"
                aria-invalid={Boolean(errors.email)}
                className={`${FIELD} ${errors.email ? "border-bad" : "border-line"}`}
              />
              {errors.email && <p className="mt-1 text-[13px] text-bad">{errors.email}</p>}
            </div>

            <div className="mb-5">
              <label htmlFor="password" className="mb-1.5 block text-[13px] font-medium">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors((p) => ({ ...p, password: "" }));
                  }}
                  aria-invalid={Boolean(errors.password)}
                  className={`${FIELD} pr-11 ${errors.password ? "border-bad" : "border-line"}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-md text-mute hover:bg-slate-100"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-[13px] text-bad">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={busy}
              className="h-10 w-full rounded-md bg-brand text-sm font-medium text-white hover:brightness-110 disabled:cursor-progress disabled:opacity-70"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-4 text-[13px] text-mute">
            Forgot your password? Ask another administrator to reset it from the Users page.
          </p>
        </div>

        <p className="mt-5 text-center text-xs text-mute">{APP_FULL_NAME}</p>
      </div>
    </div>
  );
}