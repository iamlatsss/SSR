import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './context/protection';
import PublicRoute from './context/publicRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Admin from './pages/Admin';
import Quotation from './pages/Quotation';
import BookingList from './pages/BookingList';
import BookingForm from './pages/Bookings';
import IGM from './pages/IGM';
import KYCList from './pages/KYCList';
import DOFC from './pages/DOFC.jsx'; // Combined DO/FC

// Placeholder for now
const Settings = () => (
  <DashboardLayout title="Settings">
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Settings</h2>
      <p className="text-slate-600 dark:text-slate-400">Settings go here.</p>
    </div>
  </DashboardLayout>
);

function App() {
  return (
    <AuthProvider>
        <Router>
        <Routes>
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            
            <Route element={<ProtectedRoute />}>
                <Route path="/" element={<Home />} />
                <Route path="/quotation" element={<Quotation />} />
                <Route path="/bookings" element={<BookingList />} />
                <Route path="/booking-form" element={<BookingForm />} />
                <Route path="/igm" element={<IGM />} />
                <Route path="/kyc" element={<KYCList />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/do-fc" element={<DOFC />} />
                
                {/* Users Management (formerly Admin) - Restricted to Admin */}
                <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
                    <Route path="/users" element={<Admin />} />
                </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Router>
    </AuthProvider> 
  );
}

export default App;
