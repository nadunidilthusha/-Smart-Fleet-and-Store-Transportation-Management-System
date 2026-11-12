import { Navigate, Outlet, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { canAccess, hasRole } from "../utils/roles";

// Auth guard + role/permission guard for store-portal routes
export default function ProtectedRoute({ allowedRoles = [], permission }) {
  const { user } = useAuth();
  const location = useLocation();

  // Unauthenticated visitors are sent to the store login page
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  // Block roles that are not allowed into this route group
  if (!hasRole(user, allowedRoles)) {
    return (
      <div className="grid h-screen place-items-center text-center">
        <div>
          <h1 className="text-xl font-semibold">Access denied</h1>
          <p className="mt-1 text-mute">Your role cannot open this area.</p>
        </div>
      </div>
    );
  }

  // Optional feature-level permission check (e.g. manage bookings)
  if (permission && !canAccess(user, permission)) {
    return (
      <div className="grid h-screen place-items-center px-4 text-center">
        <div>
          <h1 className="text-xl font-semibold">Access denied</h1>
          <p className="mt-1 text-mute">
            Your store role does not include permission for this page.
          </p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
