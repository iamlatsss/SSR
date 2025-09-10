import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import ProtectedRoute from './context/protection.jsx';
// import PublicRoute from './context/publicRoute.jsx';

import Home from './pages/Dashboard/Home/home.jsx';
import Login from './pages/UserAuth/Login.jsx';
import Admin from './pages/Admin/admin.jsx';
import Quotation from './pages/Quotation/quotation.jsx';
import Bookingdetails from './pages/Booking/bookingdetails.jsx';
// import Bookings from './pages/Booking/bookings.jsx';
import Bookingstatus from './pages/Booking/bookingstatus.jsx';


function App() {
  return (
    <Routes>

      {/* <Route path="/Login" element={<PublicRoute> <Login /> </PublicRoute>} /> */}
      <Route path="/Login" element={<Login />} />
      
      <Route path="/" element={<Navigate to="/Home" replace />} />
      <Route path="/Home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/Admin" element={<ProtectedRoute  allowedRoles={['admin']}><Admin /></ProtectedRoute>} />

      <Route path="/Quotation" element={<ProtectedRoute><Quotation /></ProtectedRoute>} />
      <Route path="/Bookingdetails" element={<ProtectedRoute><Bookingdetails /></ProtectedRoute>} />
      {/* <Route path="/Bookings" element={<ProtectedRoute><Bookings /></ProtectedRoute>} /> */}
      <Route path="/Bookingstatus" element={<ProtectedRoute><Bookingstatus /></ProtectedRoute>} />

    </Routes>
  );
}

export default App;
