import React, { useEffect, useState, useRef } from "react";
import { FaCalendarAlt, FaClock, FaUserCircle, FaSignOutAlt, FaBars, FaTimes, FaChevronDown, FaExclamationTriangle } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";
import { logout, getCurrentUser } from "../../services/api"; // Import logout function

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const VoterHeader = ({ username: propUsername, studentInfo: propStudentInfo = {} }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [dateTime, setDateTime] = useState(new Date());
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [userInfo, setUserInfo] = useState({
    username: propUsername || "Student",
    studentId: propStudentInfo.id || ""
  });
  
  const dropdownRef = useRef(null);
  const userButtonRef = useRef(null);
  const dialogRef = useRef(null);

  // Fetch user info on component mount - FIX THE INFINITE LOOP HERE
  useEffect(() => {
    const fetchUserInfo = () => {
      const user = getCurrentUser();
      if (user) {
        // Only update state if the values are different to prevent infinite loops
        const newUsername = user.fullName || propUsername || "Student";
        const newStudentId = user.studentNo || propStudentInfo.id || "";
        
        if (newUsername !== userInfo.username || newStudentId !== userInfo.studentId) {
          setUserInfo({
            username: newUsername,
            studentId: newStudentId
          });
        }
      } else {
        // If no user is found, redirect to login
        navigate("/");
      }
    };
    
    fetchUserInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount, use empty dependency array

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target) &&
        userButtonRef.current &&
        !userButtonRef.current.contains(event.target)
      ) {
        setShowUserDropdown(false);
      }
      
      if (
        dialogRef.current && 
        !dialogRef.current.contains(event.target) &&
        showLogoutDialog
      ) {
        // Don't close the dialog when clicking outside
        // This makes sure the user deliberately chooses an option
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showLogoutDialog]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setShowMobileMenu(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update the date and time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setDateTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

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

  // Handle logout with custom dialog
  const handleLogoutClick = () => {
    setShowLogoutDialog(true);
    setShowUserDropdown(false); // Close the dropdown when opening dialog
  };
  
  // Updated logout function that actually logs out the user
  const confirmLogout = () => {
    // Call the logout function to clear authentication data
    logout();
    setShowLogoutDialog(false);
    // Redirect to login page
    navigate("/");
  };
  
  const cancelLogout = () => {
    setShowLogoutDialog(false);
  };

  return (
    <header className="bg-white text-gray-800 py-2 sm:py-3 px-3 sm:px-6 shadow-md border-b border-gray-300 transition-all duration-300 sticky top-0 z-50">
      {/* Mobile Header - Removed user icon */}
      <div className="flex items-center justify-end sm:hidden">
        <div className="flex items-center gap-2">
          <div className="text-[10px] font-medium bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full flex items-center">
            <FaClock className="mr-1 text-[8px]" />
            {formattedTime.split(' ')[0]}
            <span className="ml-1 text-[8px] uppercase">{formattedTime.split(' ')[1]}</span>
          </div>
          
          <button 
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="p-1.5 bg-gray-200 rounded-full text-gray-700 hover:bg-gray-300 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-orange-500"
            aria-label={showMobileMenu ? "Close menu" : "Open menu"}
          >
            {showMobileMenu ? <FaTimes className="text-red-600" /> : <FaBars />}
          </button>
        </div>
      </div>

      {/* Mobile Menu - Simplified */}
      {showMobileMenu && (
        <div className="mt-2 pt-2 border-t border-gray-200 sm:hidden animate-fadeIn">
          <div className="flex items-center mb-3 p-2 bg-orange-50 rounded-lg">
            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-2 border border-orange-200">
              <FaUserCircle className="text-orange-600" />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-800">{userInfo.username}</div>
              <div className="text-[10px] text-gray-600">{userInfo.studentId}</div>
            </div>
          </div>
          
          <div className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
            <div className="flex items-center text-[10px] text-gray-600">
              <FaCalendarAlt className="text-orange-500 mr-1" size={10} />
              <span>{formattedDate}</span>
            </div>
            
            <button 
              onClick={handleLogoutClick}
              className="flex items-center text-[10px] font-medium text-red-600 bg-red-50 px-2 py-1 rounded hover:bg-red-100 transition-colors duration-200"
            >
              <FaSignOutAlt className="mr-1" size={10} />
              Logout
            </button>
          </div>
        </div>
      )}

      {/* Desktop Header - Simplified Layout */}
      <div className="hidden sm:flex sm:items-center sm:justify-between">
        {/* Left Section: User Info with Dropdown */}
        <div className="flex items-center relative">
          <button
            ref={userButtonRef}
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center group focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-white focus:ring-orange-300 rounded-lg p-1"
            aria-expanded={showUserDropdown}
            aria-haspopup="true"
          >
            <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center mr-3 shadow-sm border border-orange-200 group-hover:bg-orange-200 transition-colors duration-200">
              <FaUserCircle className="text-orange-600 text-lg" />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-800 flex items-center group-hover:text-orange-600 transition-colors duration-200">
                {userInfo.username}
                <span className="bg-green-500 h-1.5 w-1.5 rounded-full ml-2 animate-pulse" title="Online"></span>
                <FaChevronDown className={`ml-1 text-xs transition-transform duration-200 ${showUserDropdown ? 'rotate-180' : ''}`} />
              </div>
              <div className="text-xs text-gray-500">
                <span className="font-medium text-orange-600">{userInfo.studentId}</span>
              </div>
            </div>
          </button>

          {/* Simplified User Dropdown - Only logout */}
          {showUserDropdown && (
            <div 
              ref={dropdownRef}
              className="absolute top-full left-0 mt-1 w-60 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 animate-fadeIn"
            >
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-xs text-gray-500">Signed in as</p>
                <p className="text-sm font-medium text-gray-800">{userInfo.username}</p>
              </div>
              <div className="px-3 py-2">
                <button 
                  onClick={handleLogoutClick}
                  className="flex items-center w-full text-xs p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors duration-200"
                >
                  <FaSignOutAlt className="mr-2" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Section: Date and Time only */}
        <div className="flex items-center">
          <div className="flex items-center bg-gray-50 px-3 py-1.5 rounded-md shadow-sm border border-gray-200 hover:border-gray-300 transition-colors duration-200">
            <div className="flex items-center text-gray-600">
              <FaCalendarAlt className="text-orange-500 mr-1.5" size={12} />
              <span className="text-xs font-medium">{formattedDate}</span>
            </div>
            <div className="h-3 w-px bg-gray-300 mx-2"></div>
            <div className="flex items-center text-gray-600">
              <FaClock className="text-orange-500 mr-1.5" size={12} />
              <span className="text-xs font-medium">
                <span className="animate-pulse-subtle">{formattedTime.split(':')[0]}:{formattedTime.split(':')[1]}</span>
                <span>:{formattedTime.split(':')[2]}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Logout Confirmation Dialog */}
      {showLogoutDialog && (
        <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center z-50 animate-fadeIn">
          <div 
            ref={dialogRef}
            className="bg-white rounded-lg shadow-xl max-w-sm w-11/12 sm:w-96 p-4 sm:p-5 animate-scaleIn"
          >
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                <FaExclamationTriangle className="text-red-600 text-lg" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">Confirm Logout</h3>
            </div>
            
            <p className="text-sm text-gray-600 mb-5">
              Are you sure you want to log out of your account? Any unsaved progress will be lost.
            </p>
            
            <div className="flex justify-end gap-2 sm:gap-3">
              <button
                onClick={cancelLogout}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-200 text-gray-700 text-xs sm:text-sm font-medium rounded-md hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-red-600 text-white text-xs sm:text-sm font-medium rounded-md hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default VoterHeader;