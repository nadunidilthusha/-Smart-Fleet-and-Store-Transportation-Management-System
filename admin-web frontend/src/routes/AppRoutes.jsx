import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import MainLayout from "../layouts/MainLayout";
import Dashboard from "../pages/Dashboard";
import Bookings from "../pages/Bookings";
import Notifications from "../pages/Notifications";
import BookingDetail from "../pages/BookingDetail";
import VehicleDashboard from "../pages/VehicleDashboard";
import AddVehicle from "../pages/Vehicles/AddVehicle";
import TripPlannerList from "../pages/TripPlannerList";
import TripPlannerCreate from "../pages/TripPlannerCreate";
import Schedule from "../pages/Schedule";
import LiveMap from "../pages/LiveMap";
import VehicleAllocation from "../pages/VehicleAllocation";
import { ROLES } from "../utils/roles";
import AddStore from "../pages/Stores/AddStore";

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
      <Route path="/login" element={<ComingSoon title="Login" />} />

      <Route element={<ProtectedRoute allowedRoles={[ROLES.SYSTEM_ADMIN]} />}>
        <Route element={<MainLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="bookings" element={<Bookings />} />
          <Route path="bookings/:id" element={<BookingDetail />} />
          <Route path="trips" element={<ComingSoon title="Trips" />} />
          
          {/* UPDATED TRIP PLANNER ROUTES */}
          <Route path="trip-planner" element={<TripPlannerList />} />
          <Route path="trip-planner/new" element={<TripPlannerCreate />} />
          <Route path="allocation" element={<VehicleAllocation />} />
          
          <Route path="schedule" element={<Schedule />} />
          <Route path="live-map" element={<LiveMap />} />
          
          <Route path="vehicles" element={<VehicleDashboard />} />
          <Route path="vehicles/add" element={<AddVehicle />} />
          <Route path="stores" element={<ComingSoon title="Stores" />} />
          <Route path="stores/add" element={<AddStore/>} />
          <Route path="items" element={<ComingSoon title="Items" />} />
          <Route path="users" element={<ComingSoon title="Users and roles" />} />
          <Route path="reports" element={<ComingSoon title="Reports" />} />
          <Route path="audit-log" element={<ComingSoon title="Audit log" />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="*" element={<ComingSoon title="Page not found" />} />
        </Route>
      </Route>
    </Routes>
  );
}