import React from "react";
import { FaUserCircle, FaHome, FaClipboardList, FaSignOutAlt } from "react-icons/fa";
import { useLocation, Link } from "react-router-dom";

const VoterSidebar = () => {
  const location = useLocation();

  return (
    <div className="w-[250px] fixed h-screen bg-white shadow-lg border-r border-gray-100 py-6 px-4 flex flex-col justify-between z-10">
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full -translate-x-1/2 -translate-y-1/2 opacity-60"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-50 rounded-full translate-x-1/2 translate-y-1/2 opacity-60"></div>
      <div className="absolute inset-0" style={{
        backgroundImage: 'radial-gradient(#f8f8f8 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        opacity: 0.4
      }}></div>
      
      {/* User Info Section */}
      <div className="flex flex-col items-center relative z-10 pt-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shadow-lg">
            <FaUserCircle className="text-white text-5xl" />
          </div>
          <div className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full border-2 border-orange-500 flex items-center justify-center shadow-md">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
          </div>
        </div>
        <h3 className="mt-4 text-gray-800 font-semibold">John Doe</h3>
        <span className="text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-medium mt-1">
          Voter
        </span>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 mt-12 relative z-10">
        <p className="text-xs font-semibold text-gray-400 mb-2 px-4">MENU</p>
        
        <MenuItem 
          to="/voter"
          icon={FaHome}
          label="Home"
          isActive={location.pathname === "/voter"}
        />
        
        <MenuItem 
          to="/candidates"
          icon={FaClipboardList}
          label="View Candidates"
          isActive={location.pathname === "/candidates"}
        />
      </nav>

      {/* Logout Button */}
      <div className="mt-6 flex justify-center relative z-10">
        <Link
          to="/"
          className="bg-gray-100 hover:bg-orange-50 text-gray-700 hover:text-orange-600 w-full py-3 px-4 rounded-xl flex items-center justify-center transition-all duration-200 group"
        >
          <FaSignOutAlt className="mr-2 text-orange-500 group-hover:rotate-90 transition-transform duration-300" />
          <span className="font-medium">Logout</span>
        </Link>
      </div>
    </div>
  );
};

// MenuItem Component for cleaner code
const MenuItem = ({ to, icon: Icon, label, isActive }) => {
  return (
    <Link
      to={to}
      className={`flex items-center px-4 py-3 mb-2 rounded-xl transition-all duration-200 group
        ${isActive 
          ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md' 
          : 'hover:bg-orange-50 text-gray-700'
        }`}
    >
      <Icon className={`text-lg mr-3 ${isActive ? 'text-white' : 'text-orange-500'}`} />
      <span className="font-medium">{label}</span>
      {isActive && (
        <div className="ml-auto bg-white bg-opacity-30 w-1.5 h-6 rounded-full"></div>
      )}
    </Link>
  );
};

export default VoterSidebar;