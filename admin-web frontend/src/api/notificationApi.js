import apiClient from "./apiClient";

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";
const wait = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

const minutesAgo = (m) => new Date(Date.now() - m * 60000).toISOString();

let mockNotifications = [
  { id: "n1", type: "booking", severity: "warning", title: "Urgent booking waiting", message: "BK-1104-0086 (Store 2 – Ja-Ela to Main Store – Biyagama) needs a decision before 14:00.", createdAt: minutesAgo(6), read: false, link: "/bookings?booking=BK-1104-0086" },
  { id: "n2", type: "trip", severity: "critical", title: "Trip TR-0413 is delayed", message: "Vehicle WP-3308 is running 22 min late on Kandy to Main Store.", createdAt: minutesAgo(18), read: false, link: "/trips?status=Delayed" },
  { id: "n3", type: "booking", severity: "info", title: "New booking submitted", message: "T. Rajapaksa submitted BK-1104-0090 for 2,400 units.", createdAt: minutesAgo(42), read: false, link: "/bookings?booking=BK-1104-0090" },
  { id: "n4", type: "vehicle", severity: "warning", title: "Vehicle moved to maintenance", message: "LB-2204 is out of service until the brake check is finished.", createdAt: minutesAgo(95), read: false, link: "/vehicles" },
  { id: "n5", type: "trip", severity: "info", title: "Trip TR-0414 completed", message: "LB-1190 arrived at Main Store at 09:30 with a 92% load.", createdAt: minutesAgo(170), read: true, link: "/trips?status=Completed" },
  { id: "n6", type: "booking", severity: "info", title: "Booking approved", message: "BK-1104-0085 was approved and is ready for trip planning.", createdAt: minutesAgo(300), read: true, link: "/bookings?booking=BK-1104-0085" },
  { id: "n7", type: "system", severity: "warning", title: "Loading slots almost full", message: "Store 3 – Kandy has 8 of 9 slots booked today.", createdAt: minutesAgo(640), read: true, link: "/dashboard" },
  { id: "n8", type: "booking", severity: "info", title: "Changes requested", message: "BK-1103-0081 is waiting for the store to split the load.", createdAt: minutesAgo(1500), read: true, link: "/bookings?booking=BK-1103-0081" },
];

export async function getNotifications() {
  if (USE_MOCK) {
    await wait();
    return JSON.parse(JSON.stringify(mockNotifications));
  }
  const { data } = await apiClient.get("/notifications");
  return data;
}

export async function setNotificationRead(id, read = true) {
  if (USE_MOCK) {
    await wait(100);
    mockNotifications = mockNotifications.map((n) => (n.id === id ? { ...n, read } : n));
    return { id, read };
  }
  const { data } = await apiClient.patch(`/notifications/${id}`, { read });
  return data;
}

export async function markAllNotificationsRead() {
  if (USE_MOCK) {
    await wait(150);
    mockNotifications = mockNotifications.map((n) => ({ ...n, read: true }));
    return { ok: true };
  }
  const { data } = await apiClient.patch("/notifications/read-all");
  return data;
}