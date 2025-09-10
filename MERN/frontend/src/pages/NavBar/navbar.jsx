import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Navbar.css";

function Navbar() {
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const session = localStorage.getItem("session");
    if (session) {
      const sessionData = JSON.parse(session);
      if (sessionData.expiry > Date.now()) {
        setUser({ email: sessionData.email });
      } else {
        setUser(null);
        localStorage.removeItem("session");
      }
    } else {
      setUser(null);
    }
  }, []);

  // Outside click closes the dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem("session");
    setUser(null);
    setOpen(false);
    navigate("/Login", { replace: true });
  };

  if (!user) return null;

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <img
          src="/images/SSR_nobg.webp"
          alt="SSR Logo"
          className="navbar-logo"
        />
        <ul className="navbar-list">
          <li>
            <Link to="/" className="navbar-link">
              Home
            </Link>
          </li>
          <li>
            <Link to="/about" className="navbar-link">
              About
            </Link>
          </li>
          <li>
            <Link to="/contact" className="navbar-link">
              Contact
            </Link>
          </li>
          {user.role === "admin" && (
            <li>
              <Link to="/admin" className="navbar-link">
                Admin
              </Link>
            </li>
          )}
        </ul>
      </div>
      <div className="navbar-right">
        <a href="https://api.whatsapp.com/send?phone=917700990630">
          <img src="/svg/whatsapp-icon-bw.svg" className="navbar-social-icon" />
        </a>
        <a href="https://www.facebook.com/sentil.kumar.984">
          <img src="/svg/facebook-icon-bw.svg" className="navbar-social-icon" />
        </a>
        <a href="https://www.linkedin.com/in/sentilkumar-a-s-a-mumbai-a2770915/">
          <img src="/svg/linkedin-icon-bw.svg" className="navbar-social-icon" />
        </a>

        <div className="user-button-container" ref={dropdownRef}>
          <div
            className="user-button-main"
            tabIndex={0}
            role="button"
            aria-haspopup="true"
            aria-expanded={open}
            aria-label={`User menu for ${user.email}`}
            onClick={() => setOpen(!open)}
          >
            {user.email}
            <span className={`arrow ${open ? "open" : ""}`}></span>
          </div>
          {open && (
            <div className="dropdown-menu" role="menu">
              <button
                className="dropdown-item"
                onClick={() => alert("Go to profile")}
              >
                Profile
              </button>
              <button className="dropdown-item" onClick={handleLogout}>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
