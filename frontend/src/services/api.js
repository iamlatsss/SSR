import axios from "axios";
import { toast } from "react-toastify";

const api = axios.create({
    baseURL: "/api",
    withCredentials: true, // Important for cookies
});

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
        // Automatically extract and toast standard API, validation, database, or network errors
        const errMsg = error.response?.data?.message || error.response?.data?.error || error.message || "An unexpected network error occurred";
        toast.error(errMsg);
        
        return Promise.reject(error);
    }
);

export default api;
