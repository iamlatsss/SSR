import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "./AuthContext.jsx";

const ProtectedRoute = ({ allowedRoles = [] }) => {
  const { user, authChecked } = useAuth();
  const [showRedirect, setShowRedirect] = useState(false);

  useEffect(() => {
    if (authChecked) {
      if (!user) {
        toast.warn("Please login first to access this page!", {
          toastId: "login-required",
        });
        setShowRedirect(true);
        return;
      }
      // Check user roles 
      if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        toast.error("You do not have permission to access this page.");
        setShowRedirect(true);
      }
    }
  }, [user, authChecked, allowedRoles]);

  if (!authChecked) {
    return <div className="flex justify-center items-center h-screen dark:bg-dark-bg text-slate-500">Loading...</div>;
  }

  if (showRedirect) {
    return <Navigate to="/login" replace />;
  }

  return user ? <Outlet /> : null;
  
};

export default ProtectedRoute;
