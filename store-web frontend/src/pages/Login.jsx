import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import {
  Building2,
  ChevronDown,
  Eye,
  EyeOff,
  IdCard,
  Lock,
  Truck,
} from "lucide-react";
import { getStoreOptions, loginRequest } from "../api/authApi";
import useAuth from "../hooks/useAuth";
import { APP_NAME } from "../utils/constants";

const fieldWrap =
  "flex h-11 items-center gap-2.5 rounded-lg border border-line bg-slate-50 px-3 transition focus-within:border-brand focus-within:bg-white focus-within:ring-2 focus-within:ring-brand/20";
const fieldInput =
  "w-full bg-transparent text-sm text-ink outline-none placeholder:text-mute";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Store list for the Assigned Store Location dropdown
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState("main");
  const [identity, setIdentity] = useState("ashan.w@fleetline.store");
  const [password, setPassword] = useState("Store@123");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [info, setInfo] = useState("");

  // Load dummy store options once when the login page mounts
  useEffect(() => {
    let active = true;
    getStoreOptions()
      .then((options) => {
        if (!active) return;
        setStores(options);
        if (options[0] && !options.some((s) => s.id === storeId)) {
          setStoreId(options[0].id);
        }
      })
      .catch(() => {
        if (active) setError("Unable to load store locations.");
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Already signed in users should skip the login form
  if (user) {
    const redirectTo = location.state?.from?.pathname || "/dashboard";
    return <Navigate to={redirectTo} replace />;
  }

  // Submit dummy credentials for the selected store
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setInfo("");
    setIsSubmitting(true);

    try {
      const result = await loginRequest({ storeId, identity, password });
      login({ ...result, remember });
      const redirectTo = location.state?.from?.pathname || "/dashboard";
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err?.message || "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // SSO buttons are UI-only until identity providers are connected
  const handleSsoClick = (provider) => {
    setInfo(`${provider} sign-in is not connected in this frontend build.`);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-page px-4 py-10">
      {/* Brand header */}
      <div className="mb-8 text-center">
        <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-brand text-white shadow-sm">
          <Truck size={24} strokeWidth={1.8} />
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-ink">{APP_NAME}</h1>
        <p className="mt-1 text-sm text-mute">Store Logistics & Operations Console</p>
      </div>

      {/* Sign-in card */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="w-full max-w-105 rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-7"
      >
        <h2 className="text-xl font-semibold tracking-tight text-ink">Sign in</h2>
        <p className="mt-1 text-sm text-mute">
          Enter your operational credentials to continue.
        </p>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-bad">
            {error}
          </div>
        )}
        {info && (
          <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5 text-sm text-brand">
            {info}
          </div>
        )}

        <div className="mt-5 space-y-4">
          {/* Assigned store location */}
          <div>
            <label htmlFor="storeId" className="mb-1.5 block text-sm font-semibold text-ink">
              Assigned Store Location
            </label>
            <div className={`${fieldWrap} relative`}>
              <Building2 size={16} className="shrink-0 text-mute" />
              <select
                id="storeId"
                value={storeId}
                onChange={(event) => setStoreId(event.target.value)}
                className={`${fieldInput} appearance-none pr-6`}
              >
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 text-mute"
              />
            </div>
          </div>

          {/* Work email or employee ID */}
          <div>
            <label htmlFor="identity" className="mb-1.5 block text-sm font-semibold text-ink">
              Work Email or Employee ID
            </label>
            <div className={fieldWrap}>
              <IdCard size={16} className="shrink-0 text-mute" />
              <input
                id="identity"
                type="text"
                autoComplete="username"
                value={identity}
                onChange={(event) => setIdentity(event.target.value)}
                placeholder="ashan.w@fleetline.store"
                className={fieldInput}
              />
            </div>
          </div>

          {/* Password with show/hide toggle */}
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label htmlFor="password" className="text-sm font-semibold text-ink">
                Password
              </label>
              <button
                type="button"
                onClick={() =>
                  setInfo("Password resets are handled by your Store Admin in this build.")
                }
                className="text-sm font-medium text-brand hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <div className={fieldWrap}>
              <Lock size={16} className="shrink-0 text-mute" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
                className={fieldInput}
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((prev) => !prev)}
                className="shrink-0 text-mute hover:text-ink"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Remember workstation preference */}
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              className="h-4 w-4 rounded border-line text-brand focus:ring-brand"
            />
            Remember this workstation
          </label>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-5 flex h-11 w-full items-center justify-center rounded-lg bg-brand text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Signing in…" : "Sign In →"}
        </button>

        {/* SSO divider */}
        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-line" />
          <span className="text-xs text-mute">or continue with</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleSsoClick("Microsoft")}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-line bg-white text-sm font-medium text-ink transition hover:bg-slate-50"
          >
            <MicrosoftMark />
            Microsoft
          </button>
          <button
            type="button"
            onClick={() => handleSsoClick("Google")}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-line bg-white text-sm font-medium text-ink transition hover:bg-slate-50"
          >
            <GoogleMark />
            Google
          </button>
        </div>

        {/* Demo credential hint for local frontend testing */}
        <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-[12px] leading-relaxed text-mute">
          Demo: <span className="font-medium text-ink">ashan.w@fleetline.store</span> /{" "}
          <span className="font-medium text-ink">Store@123</span> at Main Store. Employee:{" "}
          <span className="font-medium text-ink">nimal.e@fleetline.store</span>.
        </p>
      </form>

      <p className="mt-6 text-sm text-mute">
        Need access or credentials?{" "}
        <button
          type="button"
          onClick={() =>
            setInfo("Ask your Store Admin to assign a store account for this location.")
          }
          className="font-medium text-brand hover:underline"
        >
          Contact Store Admin
        </button>
      </p>

    </div>
  );
}

function MicrosoftMark() {
  return (
    <svg viewBox="0 0 21 21" className="h-4 w-4" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.6h5.1c-.2 1.2-.9 2.3-1.9 3l3.1 2.4c1.8-1.7 2.9-4.1 2.9-7 0-.7-.1-1.3-.2-1.9H12z"
      />
      <path
        fill="#34A853"
        d="M6.6 14.3l-.8.6-2.7 2.1C4.8 20 8.1 22 12 22c2.7 0 4.9-.9 6.5-2.4l-3.1-2.4c-.9.6-2 1-3.4 1-2.6 0-4.8-1.7-5.6-4.1z"
      />
      <path
        fill="#4A90E2"
        d="M3.1 7c-.6 1.2-1 2.5-1 4s.4 2.8 1 4l3.5-2.7c-.2-.6-.3-1.2-.3-1.3 0-.5.1-1 .3-1.4L3.1 7z"
      />
      <path
        fill="#FBBC05"
        d="M12 5.3c1.5 0 2.8.5 3.8 1.5l2.8-2.8C16.9 2.3 14.7 1.5 12 1.5 8.1 1.5 4.8 3.5 3.1 7l3.5 2.7C7.2 7 9.4 5.3 12 5.3z"
      />
    </svg>
  );
}
