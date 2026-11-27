import apiClient from "./apiClient";
import { formatNumber } from "../utils/formatters";

export const BOOKING_STATUSES = ["Pending", "Approved", "Changes requested", "Rejected"];

// Vehicle sizes used for the "Fits a ..." suggestion
export const VEHICLE_TYPES = [
  { name: "10 ft lorry", capacity: 1200 },
  { name: "14 ft lorry", capacity: 2000 },
];
export const MAX_UNITS = 2000;

export function suggestVehicle(units) {
  if (!(units > 0)) return null;
  const vehicle = VEHICLE_TYPES.find((v) => units <= v.capacity);
  if (vehicle) {
    return {
      fits: true,
      text: `Fits a ${vehicle.name} (${formatNumber(vehicle.capacity)} units). Capacity and slot rules are checked again on the server before allocation.`,
    };
  }
  return {
    fits: false,
    text: `More than ${formatNumber(MAX_UNITS)} units. This needs more than one vehicle, so trip planning may split it. Capacity and slot rules are checked again on the server.`,
  };
}

export async function getBookings() {
  const { data } = await apiClient.get("/bookings");
  return data;
}

export async function updateBookingStatus(id, status, comment = "") {
  const { data } = await apiClient.patch(`/bookings/${id}/status`, { status, comment });
  return data;
}

export async function createBooking(payload) {
  const { data } = await apiClient.post("/bookings", payload);
  return data;
}