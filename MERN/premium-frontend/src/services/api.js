import axios from "axios";

const api = axios.create({
    baseURL: "/api",
    withCredentials: true, // Important for cookies
});

// Response interceptor to handle errors
api.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        // You can handle 401 errors globally here if needed (e.g., redirect to login)
        // if (error.response && error.response.status === 401) {
        //   // Handle logout or refresh token logic
        // }
        return Promise.reject(error);
    }
);

export default api;
