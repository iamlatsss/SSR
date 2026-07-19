import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "./AuthContext.jsx";

const ProtectedRoute = ({ allowedRoles = [] }) => {
  const { user, authChecked } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (authChecked && !user) {
      // Avoid showing the warning toast if the user is simply visiting the main root entry point
      if (location.pathname !== "/") {
        toast.warn("Please login first to access this page!", {
          toastId: "login-required",
        });
      }
    }
  }, [user, authChecked, location]);

  if (!authChecked) {
    return <div className="flex justify-center items-center h-screen dark:bg-dark-bg text-slate-500">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check user roles 
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    toast.error("You do not have permission to access this page.");
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
