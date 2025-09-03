import React from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';  // your CSS file
import Button from './userMenu.jsx'; 

function Navbar() {
  return (
    <>
      <nav className="navbar">
        <ul className="navbar-list">
          <img src="../../../../public/images/SSR_nobg.webp" alt="SSR Logo" className="navbar-logo" />
          <li>
            <Link to="/" className="navbar-link">Home</Link>
          </li>
          <li>
            <Link to="/about" className="navbar-link">About</Link>
          </li>
          <li>
            <Link to="/contact" className="navbar-link">Contact</Link>
          </li>
        </ul>
      </nav>
    </>
  );
}

export default Navbar;
