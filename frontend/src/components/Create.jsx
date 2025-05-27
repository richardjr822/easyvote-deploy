import React, { useState, useEffect } from "react";
import { 
  FaPaperclip, FaUserPlus, FaImage, FaHistory, 
  FaCheckCircle, FaTimes, FaExclamationCircle
} from "react-icons/fa";
import Header from "./header";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const Create = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Check if mobile on resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [formData, setFormData] = useState({
    name: "",
    position: "",
    group: "",
    photo: null,
  });

  const [history, setHistory] = useState([]);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoName, setPhotoName] = useState("");
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.position) newErrors.position = "Position is required";
    if (!formData.group) newErrors.group = "Group is required";
    if (!formData.photo) newErrors.photo = "Photo is required";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Update the handleInputChange function to convert name to uppercase
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Convert name field to uppercase automatically
    if (name === "name") {
      setFormData({ ...formData, [name]: value.toUpperCase() });
    } else {
      setFormData({ ...formData, [name]: value });
    }
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors({...errors, [name]: null});
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrors({...errors, photo: "Image must be less than 5MB"});
        return;
      }
      
      setFormData({ ...formData, photo: file });
      setPhotoPreview(URL.createObjectURL(file));
      setPhotoName(file.name);
      
      // Clear error when field is edited
      if (errors.photo) {
        setErrors({...errors, photo: null});
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      // Create FormData object
      const formDataObj = new FormData();
      formDataObj.append('name', formData.name.toUpperCase()); // Ensure uppercase
      formDataObj.append('position', formData.position);
      formDataObj.append('organization_id', await getOrgIdByName(formData.group));
      formDataObj.append('photo', formData.photo);
      
      // Send to API
      const response = await fetch(`${API_BASE_URL}/candidates/with-position`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formDataObj
      });
      
      if (!response.ok) {
        // Handle specific error for duplicates (409 Conflict)
        if (response.status === 409) {
          const errorData = await response.json();
          setErrorMessage(errorData.detail);
          setShowErrorToast(true);
          setTimeout(() => setShowErrorToast(false), 5000);
          throw new Error(errorData.detail);
        }
        throw new Error('Failed to create candidate');
      }
      
      const newCandidate = await response.json();
      console.log("Candidate created:", newCandidate);
      
      // Update history
      const candidateWithDetails = {
        ...newCandidate,
        position: formData.position,
        organization: formData.group,
        photoUrl: newCandidate.photo_url.startsWith('http') 
          ? newCandidate.photo_url 
          : `${API_BASE_URL.replace('/api/v1', '')}${newCandidate.photo_url}`,
        timestamp: newCandidate.created_at
      };
      
      setHistory([candidateWithDetails, ...history]);
      
      // Reset form
      setFormData({
        name: "",
        position: "",
        group: "",
        photo: null,
      });
      setPhotoPreview(null);
      setPhotoName("");
      
      // Show success toast
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 5000);
    } catch (error) {
      console.error("Error creating candidate:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to get organization ID by name
  const getOrgIdByName = async (name) => {
    try {
      const response = await fetch(`${API_BASE_URL}/organizations/by-name/${encodeURIComponent(name)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get organization ID for ${name}`);
      }
      
      const data = await response.json();
      return data.id;
    } catch (error) {
      console.error(`Error getting organization ID: ${error.message}`);
      // Fallback to hardcoded values as last resort
      const orgMap = {
        "CCS Student Council": "20575c31-893e-47ba-9727-2e1c1c0500dd",
        "ELITES": "c96c96d9-8eef-4914-ae18-89bbee67c97e",
        "SPECS": "0aed0089-e798-48ee-bdfc-1ff32edb11d6",
        "IMAGES": "5bd13196-8ce6-474d-b260-7c00297f306b"
      };
      
      return orgMap[name] || null;
    }
  };

  // Function to load recent candidates
  const loadRecentCandidates = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/candidates/recent`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load recent candidates');
      }
      
      const candidates = await response.json();
      setHistory(candidates.map(c => ({
        ...c,
        photoUrl: c.photo_url.startsWith('http') 
          ? c.photo_url 
          : `${API_BASE_URL.replace('/api/v1', '')}${c.photo_url}`,
        timestamp: c.created_at
      })));
    } catch (error) {
      console.error("Error loading recent candidates:", error);
    }
  };

  // Call this function when component mounts
  useEffect(() => {
    loadRecentCandidates();
  }, []);

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <Header username="Admin" />

      {/* Main Content - Responsive margin */}
      <div className={`p-3 sm:p-5 transition-all duration-300 ${isMobile ? '' : 'ml-[250px]'}`}>
        {/* Page Title - Responsive sizing */}
        <div className="bg-gradient-to-r from-orange-100 to-gray-100 p-4 sm:p-6 rounded-lg shadow-md border border-gray-300 mb-4 sm:mb-6">
          <div className="flex items-center">
            <FaUserPlus className="text-xl sm:text-2xl md:text-3xl text-orange-600 mr-2 sm:mr-3" />
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">Create Candidate</h1>
          </div>
        </div>

        {/* Responsive grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Create Candidate Form */}
          <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md border border-gray-200">
            <div className="flex items-center mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-gray-200">
              <div className="p-2 sm:p-3 bg-orange-100 rounded-md mr-2 sm:mr-3">
                <FaUserPlus className="text-base sm:text-xl text-orange-600" />
              </div>
              <h2 className="text-base sm:text-xl font-semibold text-gray-800">New Candidate Details</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              {/* Name Field */}
              <div>
                <label htmlFor="name" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Candidate Name
                </label>
                <div className={`relative ${errors.name ? 'mb-6' : ''}`}>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`block w-full border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded-lg shadow-sm px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors uppercase`} // Added uppercase class
                    placeholder="ENTER CANDIDATE'S FULL NAME" // Changed to uppercase for visual consistency
                  />
                  {errors.name && (
                    <div className="absolute -bottom-5 sm:-bottom-6 left-0 text-red-500 text-[10px] sm:text-xs flex items-center">
                      <FaExclamationCircle className="mr-1" /> {errors.name}
                    </div>
                  )}
                </div>
              </div>

              {/* Two columns for Position and Group - Responsive */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {/* Position Dropdown */}
                <div>
                  <label htmlFor="position" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Position
                  </label>
                  <div className={`relative ${errors.position ? 'mb-6' : ''}`}>
                    <select
                      id="position"
                      name="position"
                      value={formData.position}
                      onChange={handleInputChange}
                      className={`block w-full border ${errors.position ? 'border-red-500' : 'border-gray-300'} rounded-lg shadow-sm px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors appearance-none`}
                    >
                      <option value="" disabled>Select a position</option>
                      <option value="President">President</option>
                      <option value="Vice President">Vice President</option>
                      <option value="Secretary">Secretary</option>
                      <option value="Treasurer">Treasurer</option>
                      <option value="Public Relations Officer">Public Relations Officer</option>
                      <option value="Auditor">Auditor</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 sm:px-3 text-gray-500">
                      <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 12a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                    {errors.position && (
                      <div className="absolute -bottom-5 sm:-bottom-6 left-0 text-red-500 text-[10px] sm:text-xs flex items-center">
                        <FaExclamationCircle className="mr-1" /> {errors.position}
                      </div>
                    )}
                  </div>
                </div>

                {/* Group Dropdown */}
                <div>
                  <label htmlFor="group" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Organization
                  </label>
                  <div className={`relative ${errors.group ? 'mb-6' : ''}`}>
                    <select
                      id="group"
                      name="group"
                      value={formData.group}
                      onChange={handleInputChange}
                      className={`block w-full border ${errors.group ? 'border-red-500' : 'border-gray-300'} rounded-lg shadow-sm px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors appearance-none`}
                    >
                      <option value="" disabled>Select an organization</option>
                      <option value="CCS Student Council">CCS Student Council</option>
                      <option value="ELITES">ELITES</option>
                      <option value="SPECS">SPECS</option>
                      <option value="IMAGES">IMAGES</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 sm:px-3 text-gray-500">
                      <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 12a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                    {errors.group && (
                      <div className="absolute -bottom-5 sm:-bottom-6 left-0 text-red-500 text-[10px] sm:text-xs flex items-center">
                        <FaExclamationCircle className="mr-1" /> {errors.group}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Photo Upload - Responsive */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">
                  Candidate Photo
                </label>
                <div className="flex flex-col sm:flex-row items-center sm:items-start">
                  <div className={`flex-1 ${errors.photo ? 'mb-6' : ''} relative w-full`}>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                      <input
                        type="file"
                        id="photo"
                        name="photo"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="hidden"
                      />
                      <label htmlFor="photo" className="w-full h-full flex flex-col items-center cursor-pointer">
                        <FaImage className="text-gray-400 text-xl sm:text-3xl mb-2" />
                        <span className="text-xs sm:text-sm font-medium text-gray-700 text-center">Click to upload photo</span>
                        <span className="text-[10px] sm:text-xs text-gray-500 mt-1 text-center">PNG, JPG up to 5MB</span>
                      </label>
                    </div>
                    {errors.photo && (
                      <div className="absolute -bottom-5 sm:-bottom-6 left-0 text-red-500 text-[10px] sm:text-xs flex items-center">
                        <FaExclamationCircle className="mr-1" /> {errors.photo}
                      </div>
                    )}
                  </div>

                  {photoPreview && (
                    <div className="mt-3 sm:mt-0 sm:ml-4 w-20 h-20 sm:w-24 sm:h-24 rounded-lg border-2 border-orange-200 overflow-hidden flex-shrink-0">
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
                {photoName && (
                  <p className="mt-2 text-[10px] sm:text-xs text-gray-600 flex items-center truncate">
                    <FaImage className="text-gray-400 mr-1 flex-shrink-0" /> 
                    <span className="truncate">{photoName}</span>
                  </p>
                )}
              </div>

              {/* Submit Button - Responsive */}
              <div className="flex justify-end pt-3 sm:pt-4 border-t border-gray-200 mt-4 sm:mt-8">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all flex items-center justify-center shadow-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-70 text-xs sm:text-sm"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-3 w-3 sm:h-4 sm:w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </>
                  ) : (
                    <>
                      <FaUserPlus className="mr-2 text-xs sm:text-sm" /> Create Candidate
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* History Card - Responsive */}
          <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md border border-gray-200">
            <div className="flex items-center mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-gray-200">
              <div className="p-2 sm:p-3 bg-orange-100 rounded-md mr-2 sm:mr-3">
                <FaHistory className="text-base sm:text-xl text-orange-600" />
              </div>
              <h2 className="text-base sm:text-xl font-semibold text-gray-800">Recently Added</h2>
            </div>
            
            {history.length > 0 ? (
              <div className="space-y-3 sm:space-y-4 max-h-[300px] sm:max-h-[500px] overflow-y-auto pr-1 sm:pr-2">
                {history.map((candidate, index) => (
                  <div
                    key={index}
                    className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="flex items-center mb-2 sm:mb-3">
                      {candidate.photoUrl ? (
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 border-orange-200 mr-2 sm:mr-3">
                          <img
                            src={candidate.photoUrl}
                            alt={candidate.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-200 flex items-center justify-center mr-2 sm:mr-3">
                          <FaUserPlus className="text-gray-500" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-medium text-sm sm:text-base text-gray-900">{candidate.name}</h3>
                        <p className="text-[10px] sm:text-xs text-gray-500">
                          {new Date(candidate.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-[10px] sm:text-xs">
                      <div className="bg-gray-50 rounded p-2">
                        <span className="text-gray-500">Position</span>
                        <p className="font-medium text-gray-800">{candidate.position}</p>
                      </div>
                      <div className="bg-gray-50 rounded p-2">
                        <span className="text-gray-500">Organization</span>
                        <p className="font-medium text-gray-800">{candidate.group}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 sm:py-8 flex flex-col items-center justify-center text-center">
                <div className="bg-gray-100 rounded-full p-3 sm:p-4 mb-2 sm:mb-3">
                  <FaUserPlus className="text-gray-400 text-xl sm:text-2xl" />
                </div>
                <p className="text-sm sm:text-base text-gray-500 mb-1">No candidates added yet</p>
                <p className="text-[10px] sm:text-xs text-gray-400">
                  New candidates will appear here after submission
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Success Toast - Mobile optimized */}
      <div 
        className={`fixed bottom-4 sm:bottom-auto sm:top-24 left-1/2 sm:left-auto sm:right-6 transform -translate-x-1/2 sm:translate-x-0 transition-all duration-500 ease-in-out z-50 w-[90vw] sm:w-auto ${
          showSuccessToast ? 'translate-y-0 opacity-100' : 'translate-y-12 sm:translate-y-0 sm:translate-x-full opacity-0'
        }`}
      >
        <div className="bg-white rounded-lg shadow-lg border-l-4 border-green-500 flex items-center p-3 sm:p-4 w-full sm:max-w-md">
          <div className="text-green-500 mr-2 sm:mr-3">
            <FaCheckCircle className="text-base sm:text-lg" />
          </div>
          <div className="flex-grow">
            <p className="font-medium text-xs sm:text-sm text-gray-800">Candidate created successfully!</p>
          </div>
          <button 
            onClick={() => setShowSuccessToast(false)} 
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <FaTimes />
          </button>
        </div>
      </div>

      {/* Error Toast - Mobile optimized */}
      <div 
        className={`fixed bottom-4 sm:bottom-auto sm:top-24 left-1/2 sm:left-auto sm:right-6 transform -translate-x-1/2 sm:translate-x-0 transition-all duration-500 ease-in-out z-50 w-[90vw] sm:w-auto ${
          showErrorToast ? 'translate-y-0 opacity-100' : 'translate-y-12 sm:translate-y-0 sm:translate-x-full opacity-0'
        }`}
      >
        <div className="bg-white rounded-lg shadow-lg border-l-4 border-red-500 flex items-center p-3 sm:p-4 w-full sm:max-w-md">
          <div className="text-red-500 mr-2 sm:mr-3">
            <FaExclamationCircle className="text-base sm:text-lg" />
          </div>
          <div className="flex-grow">
            <p className="font-medium text-xs sm:text-sm text-gray-800">{errorMessage}</p>
          </div>
          <button 
            onClick={() => setShowErrorToast(false)} 
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <FaTimes />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Create;