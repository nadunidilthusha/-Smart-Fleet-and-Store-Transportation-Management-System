import apiClient from "./apiClient";

export async function getStoreSchedule(date) {
  const params = date ? { startDate: date, endDate: date } : {};
  const { data } = await apiClient.get("/store/schedule", { params });
  return data;
}