import React from 'react';
import { Routes, Route } from 'react-router-dom';

import Home from './pages/Dashboard/Home/home.jsx';

function App() {
  return (
    <Routes>

      <Route path="/" element={<Home />} />




    </Routes>
  );
}

export default App;
