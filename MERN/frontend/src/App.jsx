import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import ProtectedRoute from './context/protection.jsx';
// import PublicRoute from './context/publicRoute.jsx';

import Home from './pages/Home/home.jsx';
import Login from './pages/UserAuth/Login.jsx';
import Admin from './pages/Admin/admin.jsx';
import Quotation from './pages/Quotation/quotation.jsx';
import Bookingdetails from './pages/Booking/bookingdetails.jsx';
import Bookings from './pages/Booking/bookings.jsx';
import Bookingstatus from './pages/Booking/bookingstatus.jsx';
import DOPage from './pages/DO_FC/dopage.jsx';
import FCPage from './pages/DO_FC/fcpage.jsx';
import Test from './pages/test.jsx';
import KYC from './pages/KYC/kyc.jsx';
import kyclist from './pages/KYC/kyclist.jsx';


function App() {
  return (
    <Routes>

      {/* <Route path="/Login" element={<PublicRoute> <Login /> </PublicRoute>} /> */}
      <Route path="/Login" element={<Login />} />
      
      <Route path="/" element={<Navigate to="/Home" replace />} />
      <Route path="/Home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/Admin" element={<ProtectedRoute  allowedRoles={['Admin']}><Admin /></ProtectedRoute>} />

      <Route path="/Quotation" element={<ProtectedRoute><Quotation /></ProtectedRoute>} />
      <Route path="/Bookingdetails" element={<ProtectedRoute><Bookingdetails /></ProtectedRoute>} />
      <Route path="/Bookings" element={<ProtectedRoute><Bookings /></ProtectedRoute>} />
      <Route path="/Bookingstatus" element={<ProtectedRoute><Bookingstatus /></ProtectedRoute>} />
      <Route path="/DOPage" element={<ProtectedRoute><DOPage /></ProtectedRoute>} />
      <Route path="/FCPage" element={<ProtectedRoute><FCPage /></ProtectedRoute>} />
      <Route path="/KYC" element={<ProtectedRoute><KYC /></ProtectedRoute>} />
      <Route path="/kyclist" element={<ProtectedRoute><kyclist /></ProtectedRoute>} />

      <Route path="/test" element={<ProtectedRoute><Test /></ProtectedRoute>} />

    </Routes>
  );
}

export default App;
