import React, { useEffect, useState } from "react";
import { FaCalendarAlt, FaClock, FaBars } from "react-icons/fa";
import { useLocation } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const Header = ({ username = "Admin", onMenuClick }) => {
  const location = useLocation();

  // State to store the current date and time
  const [dateTime, setDateTime] = useState(new Date());

  // Update the date and time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setDateTime(new Date());
    }, 1000);

    return () => clearInterval(interval); // Cleanup interval on component unmount
  }, []);

  // Map routes to titles with icons or badges
  const getTitle = () => {
    switch (location.pathname) {
      case "/admin":
        return "Admin Dashboard";
      case "/create":
        return "Create";
      case "/tally":
        return "Tally";
      case "/accounts":
        return "Accounts";
      case "/archives":
        return "Archives";
      default:
        return "Admin Dashboard";
    }
  };

  // Format date and time
  const formattedDate = dateTime.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const formattedTime = dateTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  return (
    <header className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 py-3 sm:py-4 md:py-6 px-4 sm:px-6 shadow-md border-b border-gray-300 flex justify-between items-center transition-all duration-300">
      {/* Menu Button (visible only on tablet and larger) */}
      <button 
        onClick={onMenuClick}
        className="hidden sm:block md:hidden text-gray-700 hover:text-orange-600 transition-colors"
        aria-label="Toggle menu"
      >
        <FaBars size={20} />
      </button>
      
      {/* Empty div for mobile only to maintain flex layout */}
      <div className="sm:hidden"></div>

      {/* Title Section (visible only on sm and up) */}
      <div className="hidden sm:flex items-center">
        <h1 className="text-lg sm:text-xl font-bold ml-0 md:ml-60 flex items-center">
          <span className="bg-gradient-to-r from-orange-500 to-orange-600 h-5 sm:h-6 w-1.5 rounded-full mr-2 sm:mr-3 hidden sm:block"></span>
          <span className="text-gray-800 tracking-wide truncate max-w-[150px] sm:max-w-none">
            {getTitle()}
          </span>
        </h1>
      </div>
      
      {/* Right Section: Date & Time (enhanced for mobile) */}
      <div className="flex items-center">
        {/* Date and Time */}
        <div className="flex flex-col xs:flex-row sm:flex-row items-end sm:items-center gap-1 sm:gap-2 bg-white px-3 sm:px-3 py-1.5 sm:py-1.5 rounded-lg sm:rounded-full shadow-sm border border-gray-200">
          <div className="flex items-center text-gray-600">
            <FaCalendarAlt className="text-orange-500 mr-1.5 sm:mr-2" size={13} />
            <span className="text-xs sm:text-xs font-medium">{formattedDate}</span>
          </div>
          <div className="h-0 w-0 sm:h-3 sm:w-px bg-gray-300 mx-0 sm:mx-1 hidden sm:block"></div>
          <div className="flex items-center text-gray-600">
            <FaClock className="text-orange-500 mr-1.5 sm:mr-2" size={13} />
            <span className="text-xs sm:text-xs font-medium animate-pulse-subtle">{formattedTime}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;