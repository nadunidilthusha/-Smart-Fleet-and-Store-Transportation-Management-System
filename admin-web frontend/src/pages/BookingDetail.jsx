import { Navigate, useParams } from "react-router-dom";
import NewBookingForm from "../components/booking/NewBookingForm";

/*
  /bookings/new        -> the New booking form
  /bookings/BK-1104-.. -> opens that booking in the side panel on the Bookings page
                          (the Dashboard "Review" button links here)
*/
export default function BookingDetail() {
  const { id } = useParams();
  if (id === "new") return <NewBookingForm />;
  return <Navigate to={`/bookings?booking=${encodeURIComponent(id)}`} replace />;
}