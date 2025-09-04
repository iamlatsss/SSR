import React from 'react';
import { Routes, Route } from 'react-router-dom';

import Home from './pages/Dashboard/Home/home.jsx';

import Login from './pages/UserAuth/Login.jsx';


function App() {
  return (
    <Routes>

      <Route path="/" element={<Home />} />
      <Route path="/Login" element={<Login />} />
      



    </Routes>
  );
}

export default App;
