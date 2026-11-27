import apiClient from "./apiClient";

const unwrap = (res) => (res && typeof res === "object" && "data" in res ? res.data : res);

export async function getNotifications() {
  const res = await apiClient.get("/store/notifications");
  return unwrap(res);
}

export async function markNotificationRead(id) {
  const res = await apiClient.patch(`/store/notifications/${id}`, { read: true });
  return unwrap(res);
}

export async function markAllNotificationsRead() {
  const res = await apiClient.patch("/store/notifications/read-all");
  return unwrap(res);
}