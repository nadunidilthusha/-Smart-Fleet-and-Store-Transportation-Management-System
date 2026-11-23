import apiClient from "./apiClient";

/*
  Store Web authentication (separate from the admin portal login).
  GET  /auth/store/locations  ->  [{ id, name, shortName }]            (login dropdown)
  POST /auth/store/login      body { storeId, identity, password }  ->  { token, user }
  Only store managers and store employees assigned to the selected store can sign in.
*/

// Turn an Axios error into a plain Error whose message the login form can show
function toLoginError(err, fallback) {
  const data = err?.response?.data;
  const error = new Error(data?.errors?.[0]?.message || data?.message || (err?.request && !err?.response ? "Cannot reach the server." : fallback));
  error.code = data?.code;
  return error;
}

// Return the store option list used by the login dropdown
export async function getStoreOptions() {
  try {
    const { data } = await apiClient.get("/auth/store/locations");
    return data;
  } catch (err) {
    throw toLoginError(err, "Unable to load store locations.");
  }
}

// Sign in and return the shape expected by AuthContext.login({ token, user })
export async function loginRequest({ storeId, identity, password }) {
  try {
    const { data } = await apiClient.post("/auth/store/login", { storeId, identity, password });
    return data;
  } catch (err) {
    throw toLoginError(err, "Unable to sign in.");
  }
}
