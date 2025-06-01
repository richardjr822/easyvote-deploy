import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaUser, FaLock, FaSignInAlt, FaUserCircle, FaVoteYea, FaCheckCircle } from "react-icons/fa";
import { login, getCurrentUser } from '../services/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const Login = () => {
  const [role, setRole] = useState("Voter");
  const [studentId, setStudentId] = useState("");  // Changed from username to studentId
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Check if user is already logged in
  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      // Redirect to appropriate dashboard based on user type
      if (user.userType === "admin") {
        navigate("/admin");
      } else {
        navigate("/voter");
      }
    }
  }, [navigate]);

  const validateForm = () => {
    const newErrors = {};
    if (!studentId.trim()) newErrors.studentId = role === "Admin" ? "Username is required" : "Student ID is required";
    if (!password) newErrors.password = "Password is required";
    if (password && password.length < 6) newErrors.password = "Password must be at least 6 characters";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      // The login function now handles storing data in localStorage
      const data = await login(
        { studentId, password },
        role
      );
      
      console.log("Login successful", { studentId, role });
      
      // Navigate based on role
      if (data.user_type === "admin") {
        navigate("/admin");
      } else {
        navigate("/voter");
      }
    } catch (error) {
      console.error("Login error:", error);
      setErrors({
        ...errors,
        login: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-gray-50 py-6 md:py-0">
      {/* Background Image with parallax effect */}
      <div className="absolute inset-0 bg-cover bg-center bg-fixed"
        style={{ backgroundImage: "url('/assets/campus-bg.jpg')" }}>
        <div className="absolute inset-0 bg-white bg-opacity-80 backdrop-blur-sm"></div>
      </div>

      {/* Decorative Elements - Hide some on smaller screens */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Top Left Circle */}
        <div className="absolute -top-20 -left-20 w-40 md:w-64 h-40 md:h-64 rounded-full bg-orange-100 opacity-70"></div>
        
        {/* Bottom Right Circle */}
        <div className="absolute -bottom-32 -right-32 w-64 md:w-96 h-64 md:h-96 rounded-full bg-orange-100 opacity-60"></div>
        
        {/* Scattered Icons - hide on small screens */}
        <div className="hidden sm:block absolute top-20 right-20 text-orange-200 opacity-50 text-4xl md:text-6xl">
          <FaVoteYea />
        </div>
        <div className="hidden sm:block absolute bottom-40 left-40 text-orange-200 opacity-40 text-3xl md:text-5xl transform rotate-12">
          <FaCheckCircle />
        </div>
        <div className="hidden sm:block absolute top-1/2 left-20 text-orange-200 opacity-50 text-2xl md:text-4xl transform -rotate-12">
          <FaVoteYea />
        </div>
        
        {/* Dotted Pattern - smaller on mobile */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, #f97316 1px, transparent 1px)',
          backgroundSize: '30px 30px',
          opacity: 0.3
        }}></div>
      </div>

      {/* Login Container - Added enhanced shadow for mobile */}
      <div 
        className="z-10 flex flex-col md:flex-row items-center w-11/12 max-w-5xl 
          bg-white rounded-2xl overflow-hidden animate-fadeIn relative border border-gray-100 my-2 md:my-0
          shadow-[0_10px_50px_-12px_rgba(0,0,0,0.25)] md:shadow-2xl"
      >
        {/* Decorative shapes - smaller on mobile */}
        <div className="absolute -top-10 -right-10 w-20 md:w-40 h-20 md:h-40 bg-orange-50 rounded-full opacity-65 z-0"></div>
        <div className="absolute -bottom-10 -left-10 w-20 md:w-40 h-20 md:h-40 bg-orange-50 rounded-full opacity-65 z-0"></div>
        
        {/* Left Section - Better padding on mobile */}
        <div 
          className="w-full md:w-1/2 bg-gradient-to-br from-orange-50 to-orange-100 text-gray-800 p-4 md:p-12 flex flex-col items-center justify-center h-full relative overflow-hidden"
        >
          {/* Decorative elements for left panel */}
          <div className="absolute top-0 right-0 h-full w-20 bg-gradient-to-l from-orange-100/65 to-transparent"></div>
          <div className="absolute bottom-0 left-0 h-20 w-full bg-gradient-to-t from-orange-100/65 to-transparent"></div>
          <div className="absolute top-10 left-10 w-12    md:w-16 h-12 md:h-16 rounded-full bg-orange-200 opacity-45"></div>
          
          <div className="mb-2 md:mb-8 transform transition-all hover:scale-105 duration-300 relative z-10">
            <img
              src="/assets/blacklogo.png"
              alt="EasyVote Logo"
              className="w-26 md:w-40"
            />
          </div>
          
          <h1 className="text-lg md:text-4xl font-bold mb-1 md:mb-4 text-center relative z-10">
            Welcome to <span className="text-orange-500">EasyVote</span>
          </h1>
          
          <p className="text-gray-600 text-center text-xs md:text-base mb-2 md:mb-8 relative z-10">
            Secure, fast, and hassle-free voting for CCS student elections—
            anytime, anywhere!
          </p>
          
          {/* Feature Cards - Hidden on mobile */}
          <div className="hidden md:grid grid-cols-3 gap-2 md:gap-4 w-full max-w-xs relative z-10">
            <div className="bg-white shadow-sm p-2 md:p-3 rounded-xl flex flex-col items-center transform transition hover:scale-105 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-50/65 to-transparent"></div>
              <div className="text-orange-500 text-lg md:text-xl mb-1 relative">🔒</div>
              <p className="text-xs text-center text-gray-700 relative">Secure Voting</p>
            </div>
            <div className="bg-white shadow-sm p-2 md:p-3 rounded-xl flex flex-col items-center transform transition hover:scale-105 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-50/65 to-transparent"></div>
              <div className="text-orange-500 text-lg md:text-xl mb-1 relative">⚡</div>
              <p className="text-xs text-center text-gray-700 relative">Fast Results</p>
            </div>
            <div className="bg-white shadow-sm p-2 md:p-3 rounded-xl flex flex-col items-center transform transition hover:scale-105 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-50/65 to-transparent"></div>
              <div className="text-orange-500 text-lg md:text-xl mb-1 relative">📱</div>
              <p className="text-xs text-center text-gray-700 relative">Mobile Ready</p>
            </div>
          </div>
          
          {/* Bottom decorative line */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-24 md:w-36 h-1 bg-gradient-to-r from-transparent via-orange-200 to-transparent"></div>
        </div>

        {/* Right Section - Better padding on mobile */}
        <div className="w-full md:w-1/2 p-4 md:p-12 relative">
          {/* Subtle pattern for right panel */}
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(#f8f8f8 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            opacity: 0.6
          }}></div>
          
          <div className="flex flex-col items-center relative z-10">
            <div className="text-orange-600 mb-3 md:mb-6 relative">
              <div className="absolute -top-4 -right-4 w-6 md:w-8 h-6 md:h-8 bg-orange-100 rounded-full opacity-65"></div>
              <div className="absolute -bottom-4 -left-4 w-6 md:w-8 h-6 md:h-8 bg-orange-100 rounded-full opacity-65"></div>
              <FaUserCircle className="text-4xl md:text-7xl animate-pulse" />
            </div>
            
            <h2 className="text-lg md:text-2xl font-bold text-gray-800 mb-3 md:mb-6">Sign In</h2>
            
            <form onSubmit={handleSubmit} className="w-full max-w-md">
              {/* Display login error if any */}
              {errors.login && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {errors.login}
                </div>
              )}
              
              {/* Student ID / Username Input - Updated label and state */}
              <div className="mb-3 md:mb-5">
                <div className={`flex items-center border-2 ${errors.studentId ? 'border-red-500' : 'border-gray-300'} rounded-lg overflow-hidden focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-200 transition-all bg-white`}>
                  <span className="px-3 md:px-4 py-2 md:py-3 bg-gray-50 text-gray-500">
                    <FaUser />
                  </span>
                  <input
                    type="text"
                    name="studentId"
                    placeholder={role === "Admin" ? "Admin Username" : "Student ID (e.g., 202310001)"}
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="flex-1 p-2 md:p-3 text-gray-700 focus:outline-none text-sm md:text-base"
                    required
                  />
                </div>
                {errors.studentId && (
                  <p className="text-red-500 text-xs mt-1">{errors.studentId}</p>
                )}
              </div>

              {/* Password Input */}
              <div className="mb-4 md:mb-6">
                <div className={`flex items-center border-2 ${errors.password ? 'border-red-500' : 'border-gray-300'} rounded-lg overflow-hidden focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-200 transition-all bg-white`}>
                  <span className="px-3 md:px-4 py-2 md:py-3 bg-gray-50 text-gray-500">
                    <FaLock />
                  </span>
                  <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="flex-1 p-2 md:p-3 text-gray-700 focus:outline-none text-sm md:text-base"
                    required
                  />
                </div>
                {errors.password && (
                  <p className="text-red-500 text-xs mt-1">{errors.password}</p>
                )}
              </div>

              {/* Role and Login Button - Stack on smaller screens */}
              <div className="flex flex-col sm:flex-row justify-between gap-2 md:gap-4 mb-3">
                {/* Role Selector */}
                <div className="relative flex-1">
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full appearance-none bg-gray-50 border-2 border-gray-300 rounded-lg px-3 md:px-4 py-2 md:py-2.5 text-sm md:text-base text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all h-10 md:h-12"
                  >
                    <option value="Admin">Administrator</option>
                    <option value="Voter">Student Voter</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <svg
                      className="fill-current h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </div>
                </div>

                {/* Login Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-orange-600 text-white px-4 md:px-6 py-2 md:py-2.5 rounded-lg shadow-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all flex items-center justify-center relative overflow-hidden h-10 md:h-12"
                >
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-10 -left-10 w-20 h-20 bg-white opacity-10 rounded-full transform rotate-45"></div>
                    <div className="absolute -bottom-10 -right-10 w-20 h-20 bg-white opacity-10 rounded-full"></div>
                  </div>
                  <div className="relative flex items-center gap-2">
                    {isLoading ? (
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 md:h-5 md:w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                    ) : (
                      <>
                        <FaSignInAlt className="text-base md:text-lg" />
                        <span className="text-sm md:text-base">Sign In</span>
                      </>
                    )}
                  </div>
                </button>
              </div>

              {/* Privacy Notice */}
              <div className="text-xs text-gray-500 text-center mt-4 leading-relaxed">
                <p>
                  By clicking the login button, you recognize the authority of Gordon College to process your personal and sensitive information, pursuant to the{" "}
                  <a 
                    href="https://gordoncollegeccs.edu.ph/datapolicy/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-orange-600 hover:text-orange-700 underline hover:no-underline transition-all duration-200"
                  >
                    Gordon College General Privacy Notice
                  </a>
                  {" "}and applicable laws.
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
      
      {/* Footer - positioned as static on mobile */}
      <div className="z-20 text-center w-full text-gray-600 text-xs mt-4 md:mt-0 md:absolute md:bottom-4 px-4">
        <p>© 2025 EasyVote - Gordon College CCS Elections System</p>
      </div>
    </div>
  );
};

export default Login;