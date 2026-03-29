import axios from "axios";

// ─── Shared Axios Instance ──────────────────────────────────────
// All services import this pre-configured instance so base URL and
// interceptors are defined in a single place.

const BASE_PATH = import.meta.env.VITE_API_BASE_URL || "/api";
const API_BASE_URL = BASE_PATH.endsWith("/") ? BASE_PATH : `${BASE_PATH}/`;

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        "Content-Type": "application/json",
    },
});

// ─── Response Interceptor — unwrap data, normalise errors ───────
api.interceptors.response.use(
    (response) => response.data,
    (error) => {
        if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            const serverMsg =
                error.response?.data?.error ||
                error.response?.data?.message ||
                error.message;

            // Build a human-readable error
            const message =
                status === 401
                    ? "Session expired — please log in again."
                    : status === 403
                        ? "You do not have permission to perform this action."
                        : status === 404
                            ? "The requested resource was not found."
                            : status === 500
                                ? "Internal server error — please try again later."
                                : serverMsg || "An unexpected network error occurred.";

            return Promise.reject(new Error(message));
        }
        return Promise.reject(error);
    },
);

export default api;
