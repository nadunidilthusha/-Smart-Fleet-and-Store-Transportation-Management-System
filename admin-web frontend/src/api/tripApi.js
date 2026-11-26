import apiClient from "./apiClient";

export async function createTrip(payload) {
  const { data } = await apiClient.post("/trips", payload);
  return data;
}

export async function getTrips() {
  const { data } = await apiClient.get("/trips");
  return data;
}