import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './navbar.css';  // Regular CSS file

const UserButton = ({ user, onLogout }) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Always render the user dropdown, since user is always logged in
  return (
    <div className="user-button-container" ref={dropdownRef}>
      <div
        className="user-button-main"
        onClick={() => setOpen(!open)}
        tabIndex="0"
        role="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`User menu for ${user.name}`}
      >
        {user.name}
        <span className={`arrow ${open ? 'open' : ''}`}></span>
      </div>
      {open && (
        <div className="dropdown-menu" role="menu">
          <button className="dropdown-item" onClick={() => alert('Go to profile')}>
            Profile
          </button>
          <button className="dropdown-item" onClick={() => { onLogout(); setOpen(false); }}>
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

export default UserButton;
