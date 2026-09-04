import axios from "axios";
import { toast } from "react-toastify";

const api = axios.create({
    baseURL: "/api",
    withCredentials: true, // Important for cookies
});

// Request interceptor to attach Bearer token if present
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => Promise.reject(error));

// Response interceptor to handle errors globally
api.interceptors.response.use(
    (response) => {
        // If the server returns a successful HTTP 200 but with success: false and a message, toast it!
        if (response.data && response.data.success === false && response.data.message) {
            toast.error(response.data.message);
        }
        return response;
    },
    async (error) => {
        // If unauthenticated (401), clear local token and redirect if not on public routes
        if (error.response?.status === 401) {
            localStorage.removeItem("token");
            if (!window.location.pathname.includes("/login") && 
                !window.location.pathname.includes("/forgot-password") && 
                !window.location.pathname.includes("/reset-password")) {
                window.location.href = "/login";
            }
        }

        // Automatically extract and toast standard API, validation, database, or network errors
        const errMsg = error.response?.data?.message || error.response?.data?.error || error.message || "An unexpected network error occurred";
        toast.error(errMsg);
        
        return Promise.reject(error);
    }
);

export default api;
