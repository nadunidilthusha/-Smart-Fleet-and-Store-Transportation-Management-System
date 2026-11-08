import { Navigate, Outlet, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { hasRole } from "../utils/roles";

// Auth guard + role guard. Usage: <Route element={<ProtectedRoute allowedRoles={[...]} />}>
export default function ProtectedRoute({ allowedRoles = [] }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

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

  return <Outlet />;
}