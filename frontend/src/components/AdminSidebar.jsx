import React, { useState, useEffect, useRef } from "react";
import { FaUserCircle, FaHome, FaUserPlus, FaClipboardList, FaUsers, FaArchive, FaSignOutAlt, FaBars, FaTimes, FaExclamationTriangle, FaUserFriends } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";
import { logout, getCurrentUser } from "../services/api"; // Import the logout function

const AdminSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [userInfo, setUserInfo] = useState({ fullName: "Admin User", userType: "admin" });
  const dialogRef = useRef(null);

  // Fetch user info on component mount
  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setUserInfo({
        fullName: user.fullName || "Admin User",
        userType: user.userType || "admin"
      });
    } else {
      // If no user is found, redirect to login
      navigate("/");
    }
  }, [navigate]);

  // Check if mobile view based on window size
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobileView(window.innerWidth < 1024);
    };
    
    // Initial check
    checkIfMobile();
    
    // Add event listener
    window.addEventListener('resize', checkIfMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    if (isMobileView) {
      setIsMobileMenuOpen(false);
    }
  }, [location.pathname, isMobileView]);

  // Handle logout process
  const handleLogoutClick = (e) => {
    e.preventDefault();
    setShowLogoutDialog(true);
  };
  
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
    <>
      {/* Mobile Menu Toggle Button */}
      <button 
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-30 p-2 rounded-lg bg-white shadow-md text-orange-500 hover:bg-orange-50 transition-colors"
        aria-label="Toggle Menu"
      >
        {isMobileMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
      </button>

      {/* Transparent Blurred Backdrop for Mobile */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 backdrop-blur-[3px] bg-transparent z-20 transition-all duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* Original Sidebar with added responsive classes */}
      <div className={`
        w-[250px] fixed h-screen bg-white shadow-lg border-r border-gray-100 py-6 px-4 flex flex-col justify-between z-30
        transition-all duration-300 ease-in-out
        ${isMobileView ? (isMobileMenuOpen ? 'left-0' : '-left-[270px]') : 'left-0'}
      `}>
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full -translate-x-1/2 -translate-y-1/2 opacity-60"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-50 rounded-full translate-x-1/2 translate-y-1/2 opacity-60"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(#f8f8f8 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          opacity: 0.4
        }}></div>
        
        {/* User Info Section - Mobile Optimized */}
        <div className="flex flex-col items-center relative z-10 pt-2 lg:pt-1">
          <div className="relative">
            <div className="w-16 h-16 lg:w-24 lg:h-24 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg transition-all duration-200">
              <FaUserCircle className="text-white text-3xl lg:text-5xl" />
            </div>
            <div className="absolute bottom-0 right-0 w-5 h-5 lg:w-8 lg:h-8 bg-white rounded-full border-2 border-orange-500 flex items-center justify-center shadow-md">
              <div className="w-2.5 h-2.5 lg:w-4 lg:h-4 rounded-full bg-green-500"></div>
            </div>
          </div>
          <h3 className="mt-2 lg:mt-4 text-gray-800 font-semibold text-sm lg:text-base">
            {userInfo.fullName}
          </h3>
          <span className="text-[10px] lg:text-xs bg-orange-100 text-orange-700 px-2 lg:px-3 py-0.5 lg:py-1 rounded-full font-medium mt-0.5 lg:mt-1">
            Administrator
          </span>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 mt-6 lg:mt-7 relative z-10">
          <p className="text-[10px] lg:text-xs font-semibold text-gray-400 mb-1 lg:mb-2 px-4">MENU</p>
          
          <MenuItem 
            to="/admin"
            icon={FaHome}
            label="Home"
            isActive={location.pathname === "/admin"}
          />
          
          <MenuItem 
            to="/create"
            icon={FaUserPlus}
            label="Create"
            isActive={location.pathname === "/create"}
          />

          <MenuItem 
            to="/tally"
            icon={FaClipboardList}
            label="Tally"
            isActive={location.pathname === "/tally"}
          />

          <MenuItem 
            to="/view-candidates"
            icon={FaUserFriends}
            label="View Candidates"
            isActive={location.pathname === "/view-candidates"}
          />
          
          <p className="text-[10px] lg:text-xs font-semibold text-gray-400 mt-4 lg:mt-6 mb-1 lg:mb-2 px-4">MANAGEMENT</p>
          
          <MenuItem 
            to="/accounts"
            icon={FaUsers}
            label="Accounts"
            isActive={location.pathname === "/accounts"}
          />
          
          <MenuItem 
            to="/archives"
            icon={FaArchive}
            label="Archives"
            isActive={location.pathname === "/archives"}
          />
        </nav>

        {/* Logout Button - Circle on Mobile, Full width on Desktop */}
        <div className="mt-4 lg:mt-6 flex justify-center relative z-10">
          <button
            onClick={handleLogoutClick}
            className="bg-gray-100 hover:bg-orange-50 text-gray-700 hover:text-orange-600 lg:w-full 
            py-2 lg:py-3 px-4 
            rounded-full lg:rounded-xl 
            flex items-center justify-center transition-all duration-200 group
            w-12 h-12 lg:h-auto lg:aspect-auto"
          >
            <FaSignOutAlt className="text-lg lg:text-base text-orange-500 group-hover:rotate-90 transition-transform duration-300" />
            <span className="font-medium hidden lg:inline ml-2">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content Spacer - only visible on desktop */}
      <div className="hidden lg:block w-[250px] flex-shrink-0"></div>

      {/* Logout Confirmation Dialog with Blurred Backdrop */}
      {showLogoutDialog && (
        <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center z-50 animate-fadeIn">
          <div 
            ref={dialogRef}
            className="bg-white rounded-lg shadow-xl max-w-sm w-10/12 sm:w-96 p-4 sm:p-5 m-3 animate-scaleIn"
          >
            <div className="flex items-center mb-3 sm:mb-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                <FaExclamationTriangle className="text-red-600 text-base sm:text-lg" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-800">Confirm Logout</h3>
            </div>
            
            <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-5">
              Are you sure you want to log out of your administrator account? Any unsaved changes will be lost.
            </p>
            
            <div className="flex justify-end gap-2 sm:gap-3">
              <button
                onClick={cancelLogout}
                className="px-3 sm:px-4 py-1 sm:py-2 bg-gray-200 text-gray-700 text-xs sm:text-sm font-medium rounded-md hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="px-3 sm:px-4 py-1 sm:py-2 bg-red-600 text-white text-xs sm:text-sm font-medium rounded-md hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// MenuItem Component - Use NavLink or Link for proper routing
const MenuItem = ({ to, icon: Icon, label, isActive }) => {
  const navigate = useNavigate();
  
  const handleClick = (e) => {
    e.preventDefault();
    navigate(to);
  };
  
  return (
    <a
      href={to}
      onClick={handleClick}
      className={`flex items-center px-3 lg:px-4 py-2 lg:py-3 mb-1.5 lg:mb-2 rounded-xl transition-all duration-200 group
        ${isActive 
          ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md' 
          : 'hover:bg-orange-50 text-gray-700'
        }`}
      style={{
        minHeight: '44px', // touch target for mobile
      }}
    >
      <Icon className={`text-base lg:text-lg mr-2 lg:mr-3 ${isActive ? 'text-white' : 'text-orange-500'}`} />
      <span className="font-medium text-sm lg:text-base">{label}</span>
      {isActive && (
        <div className="ml-auto bg-white bg-opacity-30 w-1 lg:w-1.5 h-4 lg:h-6 rounded-full"></div>
      )}
    </a>
  );
};

export default AdminSidebar;