import React, { useState, useEffect } from 'react'
import Navbar from '../NavBar/navbar.jsx';
import { useAuth } from "../../context/AuthContext";

function home() {
  const { user } = useAuth();
  // console.log(user)

  return (
    <div className="flex h-screen bg-background">
      <Navbar/>
      <div className="flex flex-col justify-center items-center flex-1">
        <h1 className="text-2xl font-bold mb-2">Hello, {user.user_name}!</h1>
        <div className="text-center">
          <div className="text-3xl font-extrabold mt-2 mb-2">Welcome to SSR</div>
        </div>
        <p className="text-lg">
          Your role: {user.role}
        </p>
      </div>
    </div>
  );
}

export default home