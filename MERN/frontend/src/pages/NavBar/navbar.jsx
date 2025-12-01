import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const menuItems = [
  { text: "🧾 KYC Details", route: "/KYC" },
  { text: "🧾 KYC Details", route: "/KYC_list" },
  { text: "🧾 Quotation Details", route: "/Quotation" },
  { text: "🧾 Booking Details", route: "/Bookingdetails" },
  { text: "🧾 Booking", route: "/Bookings" },
  { text: "🧾 Booking Status", route: "/Bookingstatus" },
  { text: "🧾 DO Page", route: "/DOpage" },
  { text: "🧾 FC Page", route: "/FCpage" },
  { text: "💁 KYC", route: "/KYC" },
  // { text: "📄 Invoice Format", route: "#" },
  // { text: "⚠️ Pre-Alert", route: "#" },
  // { text: "📇 BL Details", route: "#" },
];

function Navbar() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuDropdownRef = useRef(null);

  // Close profile dropdown on outside click
  useEffect(() => {
    function handleProfileOutsideClick(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleProfileOutsideClick);
    return () => document.removeEventListener("mousedown", handleProfileOutsideClick);
  }, []);

  // Close menu dropdown on outside click
  useEffect(() => {
    function handleMenuOutsideClick(event) {
      if (menuDropdownRef.current && !menuDropdownRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMenuOutsideClick);
    return () => document.removeEventListener("mousedown", handleMenuOutsideClick);
  }, []);

  if (!user) return null;

  return (
    <nav className="bg-gray-300 px-5 py-3 fixed top-0 left-0 w-full z-50 shadow-md flex items-center justify-between">
      {/* Left section */}
      <div className="flex items-center gap-4">
        <img src="/images/SSR_nobg.webp" alt="SSR Logo" className="h-12 w-auto" />
        <ul className="flex items-center gap-6 list-none m-0 p-0">
          <li>
            <Link to="/" className="text-black font-semibold text-lg hover:text-blue-600 hover:underline">
              Home
            </Link>
          </li>

          {/* Menu Dropdown */}
          <li className="relative" ref={menuDropdownRef}>
            <div
              className="text-black font-semibold text-lg cursor-pointer select-none relative inline-block"
              onClick={() => setMenuOpen((v) => !v)}
              tabIndex={0}
              role="button"
              aria-haspopup="true"
              aria-expanded={menuOpen}
            >
              Menu 
              <span className={`inline-block ml-1 border-t-4 border-x-4 border-x-transparent border-t-black transition-transform duration-300 ${menuOpen ? "rotate-180" : ""}`} />
            </div>
            {menuOpen && (
              <ul className="absolute top-full left-0 mt-1 bg-gray-900 rounded-lg shadow-lg w-48 z-50 flex flex-col">
                {menuItems.map(({ text, route }, idx) => (
                  <li key={idx}>
                    <Link className="block px-4 py-2 text-white hover:bg-blue-600" to={route}>
                      {text}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>

          {user.role === "Admin" && (
            <li>
              <Link to="/admin" className="text-black font-semibold text-lg hover:text-blue-600 hover:underline">
                Admin
              </Link>
            </li>
          )}
        </ul>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4 ml-auto">
        <a href="https://api.whatsapp.com/send?phone=917700990630" target="_blank" rel="noopener noreferrer">
          <img src="/svg/whatsapp-icon-bw.svg" alt="WhatsApp" className="h-10 w-auto" />
        </a>
        <a href="https://www.facebook.com/sentil.kumar.984" target="_blank" rel="noopener noreferrer">
          <img src="/svg/facebook-icon-bw.svg" alt="Facebook" className="h-10 w-auto" />
        </a>
        <a href="https://www.linkedin.com/in/sentilkumar-a-s-a-mumbai-a2770915/" target="_blank" rel="noopener noreferrer">
          <img src="/svg/linkedin-icon-bw.svg" alt="LinkedIn" className="h-10 w-auto" />
        </a>

        {/* Profile Dropdown */}
        <div className="relative inline-block select-none" ref={dropdownRef}>
          <div
            className="relative bg-gradient-to-tr from-blue-500 to-blue-700 text-white px-5 py-2 rounded-full font-semibold cursor-pointer flex items-center gap-2 outline-none"
            tabIndex={0}
            role="button"
            aria-haspopup="true"
            aria-expanded={open}
            aria-label={`User menu for ${user.email}`}
            onClick={() => setOpen(!open)}
          >
            {user.email}
            <span className={`inline-block border-t-4 border-x-4 border-x-transparent border-t-white transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
          </div>
          {open && (
            <div
              className="absolute top-full right-0 mt-1 bg-gray-900 rounded-lg shadow-lg w-48 z-50 flex flex-col"
              role="menu"
            >
              <button
                className="block px-4 py-3 text-white text-left hover:bg-blue-600"
                onClick={() => alert("Go to profile")}
              >
                Profile
              </button>
              <button
                className="block px-4 py-3 text-white text-left hover:bg-blue-600"
                onClick={logout}
              >
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
