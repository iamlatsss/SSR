import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Dashboard/Home/home.jsx';
import Login from './pages/UserAuth/Login.jsx';
import Quotation from './pages/Quotation/quotation.jsx';
import Bookingdetails from './pages/Booking/bookingdetails.jsx';
import Bookings from './pages/Booking/bookinglist.jsx';


function App() {
  return (
    <Routes>

      <Route path="/" element={<Home />} />
      <Route path="/Login" element={<Login />} />
      <Route path="/Quotation" element={<Quotation />} />
      <Route path="/Bookingdetails" element={<Bookingdetails />} />
      <Route path="/Bookings" element={<Bookings />} />

    </Routes>
  );
}

export default App;
