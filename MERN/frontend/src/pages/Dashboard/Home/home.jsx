import React, { useState, useEffect } from 'react'
import Sidebar from '../../NavBar/navbar.jsx'
import Navbar from '../../NavBar/navbar.jsx';


function home() {
  const username = "Latika ✨"
  const userRoles = "Boss!!"

  return (
    <div className="flex h-screen bg-background">
      <Navbar/>
      <div className="flex flex-col justify-center items-center flex-1">
        <h1 className="text-2xl font-bold mb-2">Hello, {username}!</h1>
        <div className="text-center">
          <div className="text-3xl font-extrabold mt-2 mb-2">Welcome to SSR</div>
        </div>
        <p className="text-lg">
          Your role: {userRoles}
        </p>
      </div>
    </div>
  );
}

export default home