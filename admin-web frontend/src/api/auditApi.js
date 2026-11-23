import apiClient from "./apiClient";

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";
const wait = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

// Small seeded random so the mock history looks the same on every reload
function seeded(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const USERS = [
  { id: "U001", name: "Nimal Perera", role: "SYSTEM_ADMIN", ip: "127.0.0.1" },
  { id: "U002", name: "Dilan Wickramasinghe", role: "STORE_MANAGER", ip: "10.0.2.114" },
  { id: "U003", name: "Tharindu Rajapaksa", role: "STORE_EMPLOYEE", ip: "10.0.2.191" },
  { id: "U004", name: "Kasun Fernando", role: "DRIVER", ip: "10.0.4.57" },
  { id: "U005", name: "Sanduni Jayasuriya", role: "STORE_MANAGER", ip: "10.0.3.22" },
  { id: "U006", name: "Ruwan Silva", role: "DRIVER", ip: "10.0.4.63" },
  { id: "U007", name: "Ishara Gunawardena", role: "STORE_EMPLOYEE", ip: "10.0.5.8" },
  { id: "U008", name: "Chamari Perera", role: "STORE_EMPLOYEE", ip: "10.0.6.140" },
];

const ROUTES = ["Colombo → Kandy", "Ja-Ela → Biyagama", "Galle → Colombo", "Kandy → Main Store", "Negombo → Colombo"];

// Templates for the kind of events the system records
const TEMPLATES = [
  { action: "LOGIN", entity: "Session", id: () => "–", details: () => "Signed in successfully" },
  { action: "LOGOUT", entity: "Session", id: () => "–", details: () => "Signed out" },
  {
    action: "CREATE", entity: "Booking", id: (r) => `BK-${1000 + Math.floor(r() * 99)}`,
    details: (r) => `Booking ${ROUTES[Math.floor(r() * ROUTES.length)]}, ${(1 + Math.floor(r() * 30)) * 10} units`,
  },
  {
    action: "UPDATE", entity: "Booking", id: (r) => `BK-${1000 + Math.floor(r() * 99)}`,
    details: () => "Booking quantity updated",
    changes: (r) => [["Units", String(100 + Math.floor(r() * 5) * 20), String(220 + Math.floor(r() * 5) * 20)]],
  },
  { action: "APPROVE", entity: "Booking", id: (r) => `BK-${1000 + Math.floor(r() * 99)}`, details: () => "Booking approved for trip planning", changes: () => [["Status", "Pending", "Approved"]] },
  { action: "CANCEL", entity: "Booking", id: (r) => `BK-${1000 + Math.floor(r() * 99)}`, details: () => "Booking cancelled by requester", changes: () => [["Status", "Pending", "Cancelled"]] },
  { action: "ASSIGN", entity: "Trip", id: (r) => `TR-04${10 + Math.floor(r() * 30)}`, details: () => "Vehicle and driver assigned to trip", changes: () => [["Vehicle", "Unassigned", "WP-3308"], ["Driver", "Unassigned", "Ruwan Silva"]] },
  { action: "UPDATE", entity: "Vehicle", id: (r) => `WP-${3300 + Math.floor(r() * 90)}`, details: () => "Vehicle status changed", changes: () => [["Status", "Available", "Maintenance"]] },
  { action: "UPDATE", entity: "Slot", id: (r) => `SL-${1 + Math.floor(r() * 9)}`, details: () => "Loading slot rescheduled", changes: () => [["Start time", "09:00", "10:30"]] },
  { action: "ROLE_CHANGE", entity: "User", id: (r) => `U00${2 + Math.floor(r() * 7)}`, details: () => "User role changed", changes: () => [["Role", "Store Employee", "Store Manager"]] },
  { action: "DEACTIVATE", entity: "User", id: (r) => `U00${2 + Math.floor(r() * 7)}`, details: () => "User account deactivated", changes: () => [["Account status", "Active", "Inactive"]] },
  { action: "ACTIVATE", entity: "User", id: (r) => `U00${2 + Math.floor(r() * 7)}`, details: () => "User account reactivated", changes: () => [["Account status", "Inactive", "Active"]] },
  { action: "EXPORT", entity: "Report", id: () => "TRIPS", details: (r) => `Exported trip report (${20 + Math.floor(r() * 120)} rows, CSV)` },
];

// Relative weight of each template (login and booking events are most common)
const WEIGHTS = [18, 10, 14, 12, 8, 4, 8, 6, 5, 2, 1, 1, 3];

function buildMockAudit() {
  const rand = seeded(2026);
  const now = Date.now();
  const pool = WEIGHTS.flatMap((w, i) => Array(w).fill(i));
  const rows = [];

  for (let n = 0; n < 142; n += 1) {
    const tpl = TEMPLATES[pool[Math.floor(rand() * pool.length)]];
    const user = USERS[Math.floor(rand() * USERS.length)];
    // Newest events first, spread across roughly 45 days
    const ts = new Date(now - (n * 7.5 + rand() * 6) * 3600 * 1000 * (n < 30 ? 0.35 : 1));
    rows.push({
      id: `AUD-${String(5000 - n).padStart(5, "0")}`,
      ts: ts.toISOString(),
      userId: user.id,
      userName: user.name,
      role: user.role,
      action: tpl.action,
      entity: tpl.entity,
      entityId: tpl.id(rand),
      details: tpl.details(rand),
      changes: tpl.changes ? tpl.changes(rand) : [],
      ip: user.ip,
    });
  }

  // Failed sign-ins come from unknown users
  for (let n = 0; n < 14; n += 1) {
    const ts = new Date(now - (n * 41 + rand() * 20) * 3600 * 1000);
    rows.push({
      id: `AUD-F${String(n).padStart(4, "0")}`,
      ts: ts.toISOString(),
      userId: "—",
      userName: "Unknown user",
      role: "",
      action: "LOGIN_FAILED",
      entity: "Session",
      entityId: "–",
      details: "Incorrect email or password",
      changes: [],
      ip: `192.168.1.${20 + Math.floor(rand() * 200)}`,
    });
  }

  return rows.sort((a, b) => new Date(b.ts) - new Date(a.ts));
}

let mockAudit = buildMockAudit();

export async function getAuditLogs() {
  if (USE_MOCK) {
    await wait();
    return JSON.parse(JSON.stringify(mockAudit));
  }
  const { data } = await apiClient.get("/audit-logs");
  return data;
}

// Record that the audit history itself was exported
export async function recordAuditExport(rowCount) {
  const entry = {
    id: `AUD-X${Date.now()}`,
    ts: new Date().toISOString(),
    userId: "U001",
    userName: "Nimal Perera",
    role: "SYSTEM_ADMIN",
    action: "EXPORT",
    entity: "Report",
    entityId: "AUDIT",
    details: `Exported audit history (${rowCount} rows, CSV)`,
    changes: [],
    ip: "127.0.0.1",
  };
  if (USE_MOCK) {
    await wait(100);
    mockAudit = [entry, ...mockAudit];
    return entry;
  }
  const { data } = await apiClient.post("/audit-logs/export", { rowCount });
  return data;
}
