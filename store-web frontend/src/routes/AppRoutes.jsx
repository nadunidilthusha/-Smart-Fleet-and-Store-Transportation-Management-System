import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import MainLayout from "../layouts/MainLayout";
import Dashboard from "../pages/Dashboard";
import Bookings from "../pages/Bookings";
import CreateBooking from "../pages/CreateBooking";
import BookingDetail from "../pages/BookingDetail";
import { ROLES } from "../utils/roles";

function ComingSoon({ title }) {
  return (
    <div>
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="mt-1 text-[13px] text-mute">This screen is not built yet.</p>
    </div>
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Replace with <Login /> from ../pages/Login when it is ready */}
      <Route path="/login" element={<ComingSoon title="Login" />} />

      <Route
        element={
          <ProtectedRoute allowedRoles={[ROLES.STORE_MANAGER, ROLES.STORE_EMPLOYEE]} />
        }
      >
        <Route element={<MainLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="bookings" element={<Bookings />} />
          <Route path="bookings/new" element={<CreateBooking />} />
          <Route path="bookings/:id" element={<BookingDetail />} />
          <Route path="schedule" element={<ComingSoon title="Store schedule" />} />
          <Route path="trip-progress" element={<ComingSoon title="Trip progress" />} />
          <Route path="goods-confirmation" element={<ComingSoon title="Goods confirmation" />} />
          <Route path="notifications" element={<ComingSoon title="Notifications" />} />
          <Route path="*" element={<ComingSoon title="Page not found" />} />
        </Route>
      </Route>
    </Routes>
  );
}
