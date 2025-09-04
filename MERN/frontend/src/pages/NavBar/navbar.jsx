import React from "react";
import { Link } from "react-router-dom";
import "./Navbar.css"; // your CSS file
import Button from "./userMenu.jsx";

function Navbar() {
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
        <Button />
      </div>
    </nav>
  );
}

export default Navbar;
