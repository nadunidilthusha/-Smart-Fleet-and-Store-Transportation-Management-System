import apiClient from "./apiClient";

export async function getNotifications() {
  const { data } = await apiClient.get("/store/notifications");
  return data;
}

export async function markNotificationRead(id) {
  const { data } = await apiClient.patch(`/store/notifications/${id}`, { read: true });
  return data;
}

export async function markAllNotificationsRead() {
  const { data } = await apiClient.patch("/store/notifications/read-all");
  return data;
}