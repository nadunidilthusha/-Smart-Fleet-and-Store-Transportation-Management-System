import axios from "axios";
import { TOKEN_KEY, USER_KEY } from "../utils/constants";

const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
    timeout: 15000,
});

// Read token from either remembered or session-only storage
function readToken() {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

// Clear both storages when the session is no longer valid
function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
}

// Send the JWT with every request
apiClient.interceptors.request.use((config) => {
    const token = readToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
});

// Signed out or expired token: clear the session and go to the login page
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            clearSession();
            if (window.location.pathname !== "/login") window.location.assign("/login");
        }
        return Promise.reject(error);
    }
);

export default apiClient;