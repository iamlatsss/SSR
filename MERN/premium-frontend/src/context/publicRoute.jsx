import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

const PublicRoute = ({ children }) => {
  const { user, authChecked } = useAuth();

  if (!authChecked) {
    return <div className="flex h-screen items-center justify-center dark:bg-dark-bg text-slate-500">Loading...</div>;
  }

  // If user is authenticated, redirect to Dashboard
  if (user) {
    return <Navigate to="/" replace />;
  }

  // Otherwise properly render the child component
  return children ? children : <Outlet />;
};

export default PublicRoute;

