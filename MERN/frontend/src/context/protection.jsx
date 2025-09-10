import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "react-toastify";

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState(null); // Will hold verified user info
  const [showRedirect, setShowRedirect] = useState(false);

  useEffect(() => {
    async function verifyUser() {
      try {
        const res = await fetch("/auth/me", { credentials: "include" });
        
        if (!res.ok) throw new Error("Unauthenticated");
        const userData = await res.json();
        
        console.log(userData)
        // Check if user role is allowed
        if (allowedRoles.length > 0 && !allowedRoles.includes(userData.role)) {
          toast.error("You do not have permission to access this page.");
          setShowRedirect(true);
        } else {
          setUser(userData);
        }
      } catch (error) {
        toast.warn("Please login first to access this page!", {
          toastId: "login-required",
        });
        setShowRedirect(true);
      } finally {
        setAuthChecked(true);
      }
    }
    verifyUser();
  }, [allowedRoles]);

  if (!authChecked) {
    // Or return a spinner/loader while verifying
    return null;
  }

  if (showRedirect) {
    return <Navigate to="/Login" replace />;
  }

  return user ? children : null;
};

export default ProtectedRoute;
