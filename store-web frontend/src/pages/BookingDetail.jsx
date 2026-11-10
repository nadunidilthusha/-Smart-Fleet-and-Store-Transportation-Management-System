import { Navigate, useParams } from "react-router-dom";

export default function BookingDetail() {
  const { id } = useParams();
  return <Navigate to={`/bookings?booking=${encodeURIComponent(id)}`} replace />;
}