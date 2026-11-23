// Static Drivers and Hubs used by the Vehicles module until real Drivers and Hubs APIs exist.
// To go live, replace the four exported functions below with database or API lookups; nothing else needs to change.

// Driver availability: only "Available" drivers can be assigned to a vehicle
export const MOCK_DRIVERS = [
  { id: "DRV-042", name: "Kamal Perera", contact: "+94 77 123 4501", licenseNumber: "B1234567", status: "Available" },
  { id: "DRV-018", name: "Nimal Fernando", contact: "+94 71 234 5602", licenseNumber: "B2345678", status: "Available" },
  { id: "DRV-027", name: "Sajith Silva", contact: "+94 76 345 6703", licenseNumber: "B3456789", status: "Available" },
  { id: "DRV-033", name: "Ruwan Dias", contact: "+94 70 456 7804", licenseNumber: "B4567890", status: "Available" },
  { id: "DRV-051", name: "Priyantha Jayasuriya", contact: "+94 75 567 8905", licenseNumber: "B5678901", status: "On Trip" },
  { id: "DRV-064", name: "Chaminda Bandara", contact: "+94 78 678 9006", licenseNumber: "B6789012", status: "Available" },
  { id: "DRV-072", name: "Lasith Wickramasinghe", contact: "+94 77 789 0107", licenseNumber: "B7890123", status: "On Leave" },
  { id: "DRV-085", name: "Anura Pathirana", contact: "+94 71 890 1208", licenseNumber: "B8901234", status: "Available" },
];

// Active distribution facilities (same sites as the Stores dashboard)
export const MOCK_HUBS = [
  { id: "HUB-001", name: "Biyagama Central Hub", location: "Biyagama, Gampaha", address: "No. 45, Biyagama Export Processing Zone Road, Biyagama", status: "Active" },
  { id: "HUB-002", name: "Ja-Ela Distribution Center", location: "Ja-Ela, Gampaha", address: "No. 12, Negombo Road, Ja-Ela", status: "Active" },
  { id: "HUB-003", name: "Kandy Regional Store", location: "Kandy, Central Province", address: "No. 88, Peradeniya Road, Kandy", status: "Active" },
];

export const getDrivers = () => MOCK_DRIVERS;
export const getHubs = () => MOCK_HUBS;
export const findDriver = (id) => MOCK_DRIVERS.find((driver) => driver.id === id) ?? null;
export const findHub = (id) => MOCK_HUBS.find((hub) => hub.id === id) ?? null;
