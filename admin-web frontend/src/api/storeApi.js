import apiClient from "./apiClient";

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";

/*
  GET /stores  ->  [{ id, name }]
*/
const mockStores = [
  { id: "main", name: "Main Store – Biyagama" },
  { id: "store-2", name: "Store 2 – Ja-Ela" },
  { id: "store-3", name: "Store 3 – Kandy" },
];

export async function getStores() {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return mockStores;
  }
  const { data } = await apiClient.get("/stores");
  return data;
}