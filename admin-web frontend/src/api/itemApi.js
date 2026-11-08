import apiClient from "./apiClient";

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";

/*
  GET /items  ->  [{ code, name, unit }]
*/
const mockItems = [
  { code: "FG-2210", name: "Packed rice flour 25 kg", unit: "bag" },
  { code: "FG-2305", name: "Coconut oil 1 L", unit: "bottle" },
  { code: "FG-2418", name: "Tea leaves 500 g", unit: "pack" },
  { code: "RM-0045", name: "Plastic packaging roll", unit: "roll" },
  { code: "RM-0112", name: "Cardboard carton 5-ply", unit: "box" },
];

export async function getItems() {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return mockItems;
  }
  const { data } = await apiClient.get("/items");
  return data;
}