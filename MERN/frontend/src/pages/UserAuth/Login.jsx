import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {toast, ToastContainer} from "react-toastify";

const API_URI = import.meta.env.VITE_API_URI;
const PORT = import.meta.env.VITE_BACKEND_PORT;

const LoginForm = ({ onSwitch }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });
  const navigate = useNavigate();

  const setSession = (email, user_id, role) => {
    const expiryTime = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const sessionData = { user_id, email, role, expiry: expiryTime };
    localStorage.setItem("session", JSON.stringify(sessionData));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      console.log(loginData)
      const response = await fetch(`http://${API_URI}:${PORT}/auth/login/`, {
        method: "POST",
        credentials: 'include',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData)
      }); 
      
      if (!response.ok) throw new Error(`Network error: ${response.status}`);
      const data = await response.json();

      if (data.message === "Login successful") {
        setSession(data.user_data.email, data.user_data.user_id, data.user_data.role);
        toast.success("Login successful!");
        navigate("/Home");
      } else {
        toast.error(data.message || "Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      toast.error("Login failed. Try again.");
    }
  };

  return (
    <div className="login-bg bg-gray-900 flex items-center justify-center min-h-screen font-sans">
      <div className="login-card bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <div className="login-header text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Welcome Back</h1>
          <p className="text-gray-400">Sign in to continue</p>
        </div>
        <form onSubmit={handleLogin}>
          <div className="login-input mb-6">
            <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-300">
              email
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <i className="material-icons text-gray-400">person</i>
              </span>
              <input
                type="text"
                id="email"
                placeholder="Enter your email"
                required
                value={loginData.email}
                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5"
              />
            </div>
          </div>

          <div className="login-input mb-6">
            <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-300">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <i className="material-icons text-gray-400">lock</i>
              </span>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                placeholder="Enter your password"
                required
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3"
              >
                <i className="material-icons text-gray-400">
                  {showPassword ? "visibility_off" : "visibility"}
                </i>
              </button>
            </div>
          </div>

          <div className="login-options flex items-center justify-between mb-6">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="remember"
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="remember" className="ml-2 text-sm font-medium text-gray-300">
                Remember me
              </label>
            </div>
            <button
              type="button"
              className="text-sm text-blue-500 hover:underline"
              onClick={() => onSwitch("forgot")}
            >
              Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            className="w-full text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-800 font-medium rounded-lg text-sm px-5 py-3 text-center"
          >
            LOGIN
          </button>
        </form>
      </div>
      <ToastContainer position="top-right" autoClose={2000} />
    </div>
  );
};

export default LoginForm;