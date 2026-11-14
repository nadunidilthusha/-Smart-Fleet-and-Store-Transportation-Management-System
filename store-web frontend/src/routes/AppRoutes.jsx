import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import MainLayout from "../layouts/MainLayout";
import Dashboard from "../pages/Dashboard";
import Bookings from "../pages/Bookings";
import CreateBooking from "../pages/CreateBooking";
import BookingDetail from "../pages/BookingDetail";
import TripProgressList from "../pages/TripProgressList";
import TripProgressDetail from "../pages/TripProgressDetail";
import { PERMISSIONS, ROLES } from "../utils/roles";
import Login from "../pages/Login";
import GoodsConfirmation from "../pages/GoodsConfirmation";


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
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute allowedRoles={[ROLES.STORE_MANAGER, ROLES.STORE_EMPLOYEE]} />
        }
      >
        <Route element={<MainLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          
          <Route path="bookings/new" element={<CreateBooking />} />
          <Route path="bookings/:id" element={<BookingDetail />} />
          <Route path="schedule" element={<ComingSoon title="Store schedule" />} />
          
          {/* Fixed Routing Structure */}
          <Route path="trip-progress" element={<TripProgressList />} />
          <Route path="trip-progress/:id" element={<TripProgressDetail />} />

           {/* Booking management is limited to store managers */}
          <Route element={<ProtectedRoute permission={PERMISSIONS.MANAGE_BOOKINGS} />}>
            <Route path="bookings" element={<Bookings />} />
            <Route path="bookings/new" element={<CreateBooking />} />
            <Route path="bookings/:id" element={<BookingDetail />} />
          </Route>
          
          <Route path="goods-confirmation" element={<GoodsConfirmation />} />
          <Route path="notifications" element={<ComingSoon title="Notifications" />} />
          <Route path="*" element={<ComingSoon title="Page not found" />} />
        </Route>
      </Route>
    </Routes>
  );
}