import React, { useState, useEffect, useMemo } from "react";
import Header from "./header";
import { 
  FaSearch, FaPaperclip, FaSort, FaFilter, FaEdit, FaArchive, 
  FaUserEdit, FaImage, FaCheckCircle, FaTimes, 
  FaEye, FaChevronLeft, FaChevronRight, FaExclamationTriangle,
  FaEllipsisV, FaInfoCircle
} from "react-icons/fa";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';


const ViewCandidate = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Check if mobile on resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortDirection, setSortDirection] = useState("asc");
  const [activeSortField, setActiveSortField] = useState("name");
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
  
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isArchiveCandidateOpen, setIsArchiveCandidateOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [currentCandidate, setCurrentCandidate] = useState(null);
  const [candidateToArchive, setCandidateToArchive] = useState(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoName, setPhotoName] = useState("");
  
  // Toast notifications
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(isMobile ? 3 : 5);

  // Filter by organization and position
  const [organizationFilter, setOrganizationFilter] = useState("All");
  const [positionFilter, setPositionFilter] = useState("All");
  
  // Position hierarchy from VoterDashboard
  const positionHierarchy = useMemo(() => ({
    'PRESIDENT': 1,
    'VICE PRESIDENT': 2,
    'SECRETARY': 3,
    'TREASURER': 4,
    'AUDITOR': 5,
    'BUSINESS MANAGER': 6,
    'P.R.O': 7,
    'PRO': 7,
    'PUBLIC RELATIONS OFFICER': 7,
    'SENATOR': 8,
    'REPRESENTATIVE': 9,
    'GOVERNOR': 10,
    'COUNCILOR': 11,
    'SERGEANT AT ARMS': 12,
    'MUSE': 13,
    'ESCORT': 14
  }), []);

  // Load candidates from backend
  const loadCandidates = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/candidates/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load candidates');
      }
      
      const data = await response.json();
      const formattedCandidates = data.map(c => ({
        id: c.id,
        name: c.name.toUpperCase(), // Ensure name is uppercase
        position: c.position,
        group: c.group, 
        photo_url: c.photo_url,
        photoUrl: c.photo_url.startsWith('http') 
          ? c.photo_url 
          : `${API_BASE_URL.replace('/api/v1', '')}${c.photo_url}`
      }));
      
      setCandidates(formattedCandidates);
    } catch (error) {
      console.error("Error loading candidates:", error);
      setToastType("error");
      setToastMessage("Failed to load candidates");
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    } finally {
      setLoading(false);
    }
  };
  
  // Load candidates on component mount
  useEffect(() => {
    loadCandidates();
  }, []);

  // Update items per page when screen size changes
  useEffect(() => {
    setItemsPerPage(isMobile ? 3 : 5);
  }, [isMobile]);

  // Filter and sort candidates
  const filteredCandidates = useMemo(() => {
    return candidates.filter(candidate => {
      const matchesSearch = 
        candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.group.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesOrganization = organizationFilter === "All" || candidate.group === organizationFilter;
      const matchesPosition = positionFilter === "All" || candidate.position === positionFilter;
      
      return matchesSearch && matchesOrganization && matchesPosition;
    });
  }, [candidates, searchTerm, organizationFilter, positionFilter]);
  
  const sortedCandidates = useMemo(() => {
    return [...filteredCandidates].sort((a, b) => {
      if (activeSortField === "position") {
        // Use position hierarchy for sorting positions
        const orderA = positionHierarchy[a.position.toUpperCase()] || 999;
        const orderB = positionHierarchy[b.position.toUpperCase()] || 999;
        
        if (sortDirection === "asc") {
          return orderA - orderB;
        } else {
          return orderB - orderA;
        }
      } else {
        // Regular sorting for other fields
        if (sortDirection === "asc") {
          if (a[activeSortField] < b[activeSortField]) return -1;
          if (a[activeSortField] > b[activeSortField]) return 1;
        } else {
          if (a[activeSortField] > b[activeSortField]) return -1;
          if (a[activeSortField] < b[activeSortField]) return 1;
        }
      }
      return 0;
    });
  }, [filteredCandidates, activeSortField, sortDirection, positionHierarchy]);
  
  const paginatedCandidates = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedCandidates.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedCandidates, currentPage, itemsPerPage]);
  
  const totalPages = Math.ceil(sortedCandidates.length / itemsPerPage);
  
  // Search, sort, and filter handlers
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleSort = (key) => {
    const newDirection = key === activeSortField && sortDirection === "asc" ? "desc" : "asc";
    setActiveSortField(key);
    setSortDirection(newDirection);
  };

  const handleOrganizationFilter = (org) => {
    setOrganizationFilter(org);
    setCurrentPage(1);
  };
  
  const handlePositionFilter = (position) => {
    setPositionFilter(position);
    setCurrentPage(1);
  };
  
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };
  
  // Toggle action menu for mobile
  const toggleActionMenu = (id) => {
    setActionMenuOpen(actionMenuOpen === id ? null : id);
  };
  
  // Close action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setActionMenuOpen(null);
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);
  
  // View candidate details
  const handleView = (id) => {
    const candidate = candidates.find((c) => c.id === id);
    if (candidate) {
      setCurrentCandidate({ ...candidate });
      setIsViewModalOpen(true);
    }
  };

  // Archive candidate confirmation
  const handleArchiveConfirm = (id) => {
    setCandidateToArchive(id);
    setIsArchiveCandidateOpen(true);
  };

  // Archive a single candidate
  const handleArchiveCandidate = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/candidates/${candidateToArchive}/archive`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to archive candidate');
      }
      
      // Update local state
      const updatedCandidates = candidates.filter((candidate) => candidate.id !== candidateToArchive);
      setCandidates(updatedCandidates);
      setIsArchiveCandidateOpen(false);
      
      setToastType("success");
      setToastMessage("Candidate archived successfully!");
      setShowSuccessToast(true);
      
      setTimeout(() => {
        setShowSuccessToast(false);
      }, 3000);
      
    } catch (error) {
      console.error("Error archiving candidate:", error);
      setToastType("error");
      setToastMessage("Failed to archive candidate");
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    }
  };

  // Update candidate details
  const [isUpdateConfirmModalOpen, setIsUpdateConfirmModalOpen] = useState(false);
  const [originalCandidateData, setOriginalCandidateData] = useState(null);

  const handleUpdate = (id) => {
    const candidate = candidates.find((c) => c.id === id);
    if (candidate) {
      setCurrentCandidate({ ...candidate });
      setOriginalCandidateData({ ...candidate }); // Store original data for comparison
      setPhotoName(candidate.photo);
      setIsUpdateModalOpen(true);
    }
  };

  // Archive all candidates confirmation
  const handleArchiveAllConfirm = () => {
    setIsArchiveConfirmOpen(true);
  };

  // Archive all candidates
  const handleArchiveAll = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/candidates/archive-all`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to archive all candidates');
      }
      
      setCandidates([]);
      setIsArchiveConfirmOpen(false);
      
      setToastType("success");
      setToastMessage("All candidates have been archived successfully!");
      setShowSuccessToast(true);
      
      setTimeout(() => {
        setShowSuccessToast(false);
      }, 3000);
      
    } catch (error) {
      console.error("Error archiving all candidates:", error);
      setToastType("error");
      setToastMessage("Failed to archive all candidates");
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    }
  };

  // Form input handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === "name") {
      // Ensure name is always uppercase
      setCurrentCandidate({ ...currentCandidate, [name]: value.toUpperCase() });
    } else {
      setCurrentCandidate({ ...currentCandidate, [name]: value });
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Create a URL for the preview
      const previewUrl = URL.createObjectURL(file);
      setPhotoPreview(previewUrl);
      setPhotoName(file.name);
    }
  };

  // Get organization ID by name
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

  // Update candidate
  const showUpdateConfirmation = (e) => {
    e.preventDefault();
    setIsUpdateConfirmModalOpen(true);
  };

  const handleUpdateSubmit = async () => {
    try {
      // Create FormData for the API request
      const formData = new FormData();
      formData.append('name', currentCandidate.name.toUpperCase()); // Ensure uppercase
      formData.append('position', currentCandidate.position);
      formData.append('organization_id', await getOrgIdByName(currentCandidate.group));
      
      // Only append photo if a new one was selected
      if (photoName && photoPreview) {
        const response = await fetch(photoPreview);
        const blob = await response.blob();
        const file = new File([blob], photoName, { type: blob.type });
        formData.append('photo', file);
      }
      
      // Send update request to API
      const updateResponse = await fetch(`${API_BASE_URL}/candidates/${currentCandidate.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      
      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(errorData.detail || 'Failed to update candidate');
      }
      
      // Get updated candidate data
      const updatedCandidate = await updateResponse.json();
      
      // Update the local state with the new data
      setCandidates(candidates.map(candidate => 
        candidate.id === currentCandidate.id 
          ? {
              ...updatedCandidate,
              photoUrl: updatedCandidate.photo_url.startsWith('http') 
                ? updatedCandidate.photo_url 
                : `${API_BASE_URL.replace('/api/v1', '')}${updatedCandidate.photo_url}`
            }
          : candidate
      ));
      
      // Close modals and reset state
      setIsUpdateConfirmModalOpen(false); // Close confirmation modal
      setIsUpdateModalOpen(false);
      setCurrentCandidate(null);
      setPhotoPreview(null);
      setPhotoName("");
      
      // Show success message
      setToastType("success");
      setToastMessage("Candidate updated successfully!");
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
      
    } catch (error) {
      console.error("Error updating candidate:", error);
      setToastType("error");
      setToastMessage(error.message || "Failed to update candidate");
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    }
  };

  // Close confirmation modal
  const closeUpdateConfirmModal = () => {
    setIsUpdateConfirmModalOpen(false);
  };

  // Modal close handlers
  const closeUpdateModal = () => {
    setIsUpdateModalOpen(false);
    setCurrentCandidate(null);
    setPhotoPreview(null);
  };
  
  const closeViewModal = () => {
    setIsViewModalOpen(false);
    setCurrentCandidate(null);
  };

  // Get unique organizations and positions for filter dropdowns
  const uniqueOrganizations = useMemo(() => {
    return ["All", ...new Set(candidates.map(candidate => candidate.group))];
  }, [candidates]);

  const uniquePositions = useMemo(() => {
    const positions = [...new Set(candidates.map(candidate => candidate.position))];
    // Sort positions by hierarchy
    return ["All", ...positions.sort((a, b) => {
      const orderA = positionHierarchy[a.toUpperCase()] || 999;
      const orderB = positionHierarchy[b.toUpperCase()] || 999;
      return orderA - orderB;
    })];
  }, [candidates, positionHierarchy]);

  // Get photo URL either from server or placeholder
  const getPhotoUrl = (candidate) => {
    if (candidate.photoUrl) {
      return candidate.photoUrl;
    }
    return `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70)}`;
  };

  // Add this function after handleInputChange
  const hasChanges = () => {
    if (!currentCandidate || !originalCandidateData) return false;
    
    // Check if any field has changed
    if (currentCandidate.name !== originalCandidateData.name ||
        currentCandidate.position !== originalCandidateData.position ||
        currentCandidate.group !== originalCandidateData.group ||
        photoPreview) {
      return true;
    }
    
    return false;
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <Header username="Admin" onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />

      {/* Main Content - Responsive margin */}
      <div className={`p-3 sm:p-5 mt-0 sm:mt-5 transition-all duration-300 ${isMobile ? '' : 'ml-[250px]'}`}>
        {/* Page Title and Search/Actions Bar - Improved mobile layout */}
        <div className="bg-gradient-to-r from-orange-50 to-gray-50 p-4 sm:p-6 rounded-xl shadow-md border border-gray-200 mb-4 sm:mb-6">
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div className="flex items-center">
                <div className="p-2 sm:p-3 bg-orange-100 rounded-lg mr-3 shadow-sm">
                  <FaUserEdit className="text-xl sm:text-2xl text-orange-600" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">Manage Candidates</h1>
                  <p className="text-[10px] sm:text-xs md:text-sm text-gray-500 mt-1">View, edit, and manage election candidates</p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaSearch className="text-orange-500" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearch}
                  placeholder="Search candidates..."
                  className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              
              <div className="flex gap-2 sm:gap-3">
                {/* Organization Filter */}
                <div className="relative flex-1 min-w-[110px] sm:min-w-[120px]">
                  <select
                    value={organizationFilter}
                    onChange={(e) => handleOrganizationFilter(e.target.value)}
                    className="w-full py-1.5 sm:py-2 pl-3 sm:pl-4 pr-7 sm:pr-8 text-[10px] xs:text-xs sm:text-sm border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 appearance-none"
                  >
                    {uniqueOrganizations.map((org) => (
                      <option key={org} value={org} className="text-[10px] xs:text-xs sm:text-sm">
                        {org === "All" ? "All Organizations" : org}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 sm:px-2 text-gray-700">
                    <FaFilter className="text-orange-500 text-xs sm:text-sm" />
                  </div>
                </div>

                {/* Position Filter */}
                <div className="relative flex-1 min-w-[100px] sm:min-w-[110px]">
                  <select
                    value={positionFilter}
                    onChange={(e) => handlePositionFilter(e.target.value)}
                    className="w-full py-1.5 sm:py-2 pl-3 sm:pl-4 pr-7 sm:pr-8 text-[10px] xs:text-xs sm:text-sm border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 appearance-none"
                  >
                    {uniquePositions.map((position) => (
                      <option key={position} value={position} className="text-[10px] xs:text-xs sm:text-sm">
                        {position === "All" ? "All Positions" : position}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 sm:px-2 text-gray-700">
                    <FaSort className="text-orange-500 text-xs sm:text-sm" />
                  </div>
                </div>
                
                <button
                  onClick={handleArchiveAllConfirm}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 sm:px-4 py-2 rounded-lg shadow-sm hover:shadow-md hover:from-orange-600 hover:to-orange-700 transition-all duration-200 flex items-center whitespace-nowrap"
                >
                  <FaArchive className="mr-1 sm:mr-2" />
                  <span className="text-[10px] sm:text-sm">Archive All</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Results Summary - Mobile optimized */}
        <div className="mb-4 p-3 sm:p-4 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="text-[10px] xs:text-xs sm:text-sm text-gray-600">
              Showing {paginatedCandidates.length} of {filteredCandidates.length} candidates
              {organizationFilter !== "All" && (
                <span className="ml-1">
                  in <span className="font-medium text-orange-600">{organizationFilter}</span>
                </span>
              )}
              {positionFilter !== "All" && (
                <span className="ml-1">
                  for <span className="font-medium text-blue-600">{positionFilter}</span>
                </span>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-xs sm:text-sm text-gray-600 mr-1">Sort:</span>
              {["name", "position"].map((field) => (
                <button
                  key={field}
                  className={`px-2 sm:px-3 py-1 text-[10px] xs:text-xs font-medium rounded-lg transition-all ${
                    activeSortField === field
                    ? 'bg-orange-100 text-orange-700 border border-orange-200'
                    : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                  }`}
                  onClick={() => handleSort(field)}
                >
                  {field.charAt(0).toUpperCase() + field.slice(1)}
                  {activeSortField === field && (
                    <span className="ml-1">
                      {sortDirection === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </button>
              ))}
              {/* Only show org sort option on larger screens */}
              <div className="hidden sm:flex">
                <button
                  className={`ml-1 px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                    activeSortField === "group"
                    ? 'bg-orange-100 text-orange-700 border border-orange-200'
                    : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                  }`}
                  onClick={() => handleSort("group")}
                >
                  Organization
                  {activeSortField === "group" && (
                    <span className="ml-1">
                      {sortDirection === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Clear Filters Button - Only show when filters are active */}
        {(organizationFilter !== "All" || positionFilter !== "All") && (
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => {
                setOrganizationFilter("All");
                setPositionFilter("All");
                setCurrentPage(1);
              }}
              className="text-xs sm:text-sm text-gray-600 hover:text-orange-600 bg-white border border-gray-300 px-3 py-1.5 rounded-lg hover:border-orange-300 transition-colors flex items-center"
            >
              <FaTimes className="mr-1" />
              Clear Filters
            </button>
          </div>
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
          </div>
        )}

        {/* Mobile Card View */}
        {!loading && (
          <div className="block sm:hidden">
            {paginatedCandidates.length > 0 ? (
              <div className="space-y-3">
                {paginatedCandidates.map((candidate) => (
                  <div 
                    key={candidate.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                  >
                    <div className="flex items-center p-3 border-b border-gray-100">
                      <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden border border-gray-300 mr-3">
                        <img
                          src={getPhotoUrl(candidate)}
                          alt={candidate.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-sm sm:text-base text-gray-900">{candidate.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 inline-flex text-[10px] xs:text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            {candidate.position}
                          </span>
                          <span className="text-[10px] xs:text-xs text-gray-500">{candidate.group}</span>
                        </div>
                      </div>
                      <div className="relative">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleActionMenu(candidate.id);
                          }}
                          className="p-2 rounded-full hover:bg-gray-100"
                        >
                          <FaEllipsisV className="text-gray-500" />
                        </button>
                        
                        {/* Dropdown Menu */}
                        {actionMenuOpen === candidate.id && (
                          <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                            <div className="py-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleView(candidate.id)}
                                className="w-full text-left px-4 py-2 text-[11px] sm:text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                              >
                                <FaEye className="mr-2 text-blue-500" />
                                View Details
                              </button>
                              <button
                                onClick={() => handleUpdate(candidate.id)}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                              >
                                <FaEdit className="mr-2 text-orange-500" />
                                Edit
                              </button>
                              <button
                                onClick={() => handleArchiveConfirm(candidate.id)}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                              >
                                <FaArchive className="mr-2 text-red-500" />
                                Archive
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="px-3 py-2 flex justify-end items-center bg-gray-50 text-[10px] xs:text-xs text-gray-500">
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleView(candidate.id)}
                          className="p-1.5 rounded-md bg-blue-100 text-blue-600"
                        >
                          <FaEye />
                        </button>
                        <button
                          onClick={() => handleUpdate(candidate.id)}
                          className="p-1.5 rounded-md bg-orange-100 text-orange-600"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleArchiveConfirm(candidate.id)}
                          className="p-1.5 rounded-md bg-red-100 text-red-600"
                        >
                          <FaArchive />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 text-center">
                <div className="flex flex-col items-center">
                  <div className="p-4 bg-gray-100 rounded-full mb-4">
                    <FaSearch className="text-gray-400 text-2xl" />
                  </div>
                  <p className="text-gray-500 text-base font-medium">No candidates found.</p>
                  <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filters.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Desktop Table View */}
        {!loading && (
          <div className="hidden sm:block bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Photo
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Position
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Organization
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedCandidates.length > 0 ? (
                    paginatedCandidates.map((candidate) => (
                      <tr 
                        key={candidate.id} 
                        className="hover:bg-orange-50/50 transition-colors group"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border border-gray-300">
                            <img
                              src={getPhotoUrl(candidate)}
                              alt={candidate.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{candidate.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            {candidate.position}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{candidate.group}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleView(candidate.id)}
                              className="bg-gray-100 p-2 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors"
                              title="View Details"
                            >
                              <FaEye />
                            </button>
                            <button
                              onClick={() => handleUpdate(candidate.id)}
                              className="bg-blue-100 p-2 rounded-lg text-blue-600 hover:bg-blue-200 transition-colors"
                              title="Edit Candidate"
                            >
                              <FaEdit />
                            </button>
                            <button
                              onClick={() => handleArchiveConfirm(candidate.id)}
                              className="bg-red-100 p-2 rounded-lg text-red-600 hover:bg-red-200 transition-colors"
                              title="Archive Candidate"
                            >
                              <FaArchive />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <div className="p-4 bg-gray-100 rounded-full mb-4">
                            <FaSearch className="text-gray-400 text-2xl" />
                          </div>
                          <p className="text-gray-500 text-lg font-medium">No candidates found.</p>
                          <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filters.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Pagination - Mobile optimized */}
        {!loading && totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <div className="flex-1 flex justify-between">
              <button
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 md:py-2 text-[11px] sm:text-sm font-medium rounded-md ${
                  currentPage === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <FaChevronLeft className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1 sm:mr-2" />
                Prev
              </button>
              
              {/* Page info for mobile */}
              <div className="text-[10px] xs:text-xs sm:text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </div>
              
              <button
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className={`relative inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 md:py-2 text-[11px] sm:text-sm font-medium rounded-md ${
                  currentPage === totalPages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Next
                <FaChevronRight className="h-2.5 w-2.5 sm:h-3 sm:w-3 ml-1 sm:ml-2" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals - Mobile optimized */}
      
      {/* View Candidate Modal */}
      {isViewModalOpen && currentCandidate && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl p-0 w-full max-w-[500px] relative z-10 overflow-hidden">
            <div className="h-28 sm:h-32 bg-gradient-to-r from-orange-400 to-orange-600 relative">
              <button
                className="absolute top-3 right-3 bg-white/20 p-1.5 rounded-full hover:bg-white/30 transition-colors text-white"
                onClick={closeViewModal}
              >
                <FaTimes />
              </button>
              <div className="absolute -bottom-14 sm:-bottom-16 left-6 w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-white p-1.5">
                <div className="w-full h-full rounded-full bg-gray-200 overflow-hidden">
                  <img
                    src={getPhotoUrl(currentCandidate)}
                    alt={currentCandidate.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
            
            <div className="pt-16 sm:pt-20 px-4 sm:px-6 pb-6">
              <h3 className="text-base sm:text-xl md:text-2xl font-bold text-gray-800">{currentCandidate.name}</h3>
              
              <div className="mt-4 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="text-gray-500">Position</div>
                  <div className="px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-medium">
                    {currentCandidate.position}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-gray-500">Organization</div>
                  <div className="font-medium text-gray-800">{currentCandidate.group}</div>
                </div>
              </div>
              
              <div className="mt-8 flex justify-end gap-3">
                <button
                  onClick={closeViewModal}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    closeViewModal();
                    handleUpdate(currentCandidate.id);
                  }}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Archive All Confirmation Modal */}
      {isArchiveConfirmOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl p-4 sm:p-6 w-full max-w-[400px] relative z-10">
            <div className="text-center mb-6">
              <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <FaArchive className="text-orange-500 text-xl sm:text-2xl" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-800">Archive All Candidates</h3>
              <p className="text-sm text-gray-600 mt-2">
                Are you sure you want to archive all candidate data? This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setIsArchiveConfirmOpen(false)}
                className="px-4 sm:px-5 py-2 sm:py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleArchiveAll}
                className="px-4 sm:px-5 py-2 sm:py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Archive All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Single Candidate Confirmation Modal */}
      {isArchiveCandidateOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl p-4 sm:p-6 w-full max-w-[400px] relative z-10">
            <div className="text-center mb-6">
              <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <FaArchive className="text-red-500 text-xl sm:text-2xl" />
              </div>
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-800">Archive Candidate</h3>
              <p className="text-[11px] sm:text-sm text-gray-600 mt-2">
                Are you sure you want to archive this candidate? This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setIsArchiveCandidateOpen(false)}
                className="px-4 sm:px-5 py-2 sm:py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleArchiveCandidate}
                className="px-4 sm:px-5 py-2 sm:py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Modal */}
      {isUpdateModalOpen && currentCandidate && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl p-4 sm:p-6 w-full max-w-[600px] max-h-[90vh] overflow-y-auto relative z-10">
            <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg mr-3">
                  <FaEdit className="text-blue-500 text-lg" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-800">Update Candidate</h3>
              </div>
              <button
                className="text-gray-400 hover:text-gray-600 transition-colors text-xl"
                onClick={closeUpdateModal}
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={showUpdateConfirmation} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Name Field */}
                <div>
                  <label htmlFor="name" className="block text-[11px] sm:text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={currentCandidate.name}
                    onChange={handleInputChange}
                    className="block w-full border border-gray-300 rounded-lg shadow-sm px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors uppercase"
                    required
                  />
                </div>

                {/* Position Dropdown */}
                <div>
                  <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">
                    Position
                  </label>
                  <select
                    id="position"
                    name="position"
                    value={currentCandidate.position}
                    onChange={handleInputChange}
                    className="block w-full border border-gray-300 rounded-lg shadow-sm px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                  >
                    <option value="President">President</option>
                    <option value="Vice President">Vice President</option>
                    <option value="Secretary">Secretary</option>
                    <option value="Treasurer">Treasurer</option>
                    <option value="Auditor">Auditor</option>
                  </select>
                </div>

                {/* Organization Dropdown */}
                <div>
                  <label htmlFor="group" className="block text-sm font-medium text-gray-700 mb-1">
                    Organization
                  </label>
                  <select
                    id="group"
                    name="group"
                    value={currentCandidate.group}
                    onChange={handleInputChange}
                    className="block w-full border border-gray-300 rounded-lg shadow-sm px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                  >
                    <option value="CCS Student Council">CCS Student Council</option>
                    <option value="ELITES">ELITES</option>
                    <option value="SPECS">SPECS</option>
                    <option value="IMAGES">IMAGES</option>
                  </select>
                </div>

                {/* Photo Preview */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Photo
                  </label>
                  <div className="w-20 h-20 rounded-lg bg-gray-200 overflow-hidden border border-gray-300">
                    <img
                      src={photoPreview || getPhotoUrl(currentCandidate)}
                      alt={currentCandidate.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>

              {/* Photo Upload */}
              <div>
                <label htmlFor="updatePhoto" className="block text-sm font-medium text-gray-700 mb-1">
                  Upload New Photo
                </label>
                <div className="flex flex-col">
                  <label
                    htmlFor="updatePhoto"
                    className="flex items-center gap-2 cursor-pointer bg-gray-100 border border-gray-300 rounded-lg px-4 py-2.5 hover:bg-gray-200 transition-colors w-fit"
                  >
                    <FaPaperclip className="text-orange-500" />
                    <span className="text-sm text-gray-700">Select new image</span>
                  </label>
                  <input
                    type="file"
                    id="updatePhoto"
                    name="photo"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                  
                  <div className="mt-2">
                    {photoName && (
                      <div className="text-sm text-gray-700 flex items-center">
                        <FaImage className="text-gray-400 mr-2" />
                        <span className="truncate max-w-[200px]">{photoName}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 mt-6">
                <button
                  type="button"
                  onClick={closeUpdateModal}
                  className="px-4 sm:px-5 py-2 sm:py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!hasChanges()}
                  className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg transition-all ${
                    hasChanges() 
                      ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Confirmation Modal */}
      {isUpdateConfirmModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl p-4 sm:p-6 w-full max-w-[500px] relative z-10">
            <div className="text-center mb-5">
              <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <FaEdit className="text-orange-500 text-xl sm:text-2xl" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-800">Confirm Update</h3>
              <p className="text-sm text-gray-600 mt-2">
                Please review your changes before confirming.
              </p>
            </div>
            
            {/* Display only changed fields */}
            <div className="bg-gray-50 rounded-lg p-4 mb-5">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Changes to be applied:</h4>
              <div className="space-y-3">
                {/* Only show if name changed */}
                {currentCandidate.name !== originalCandidateData.name && (
                  <div className="bg-white p-3 rounded border border-gray-200">
                    <div className="text-xs font-medium text-gray-500 mb-1">Name</div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-red-100 flex-shrink-0 flex items-center justify-center">
                          <span className="text-red-500 text-xs">-</span>
                        </div>
                        <div className="text-sm text-gray-500 break-all">{originalCandidateData.name}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-green-100 flex-shrink-0 flex items-center justify-center">
                          <span className="text-green-500 text-xs">+</span>
                        </div>
                        <div className="text-sm font-medium text-gray-800 break-all">{currentCandidate.name}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Only show if position changed */}
                {currentCandidate.position !== originalCandidateData.position && (
                  <div className="bg-white p-3 rounded border border-gray-200">
                    <div className="text-xs font-medium text-gray-500 mb-1">Position</div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-red-100 flex-shrink-0 flex items-center justify-center">
                          <span className="text-red-500 text-xs">-</span>
                        </div>
                        <div className="text-sm text-gray-500">{originalCandidateData.position}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-green-100 flex-shrink-0 flex items-center justify-center">
                          <span className="text-green-500 text-xs">+</span>
                        </div>
                        <div className="text-sm font-medium text-gray-800">{currentCandidate.position}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Only show if organization changed */}
                {currentCandidate.group !== originalCandidateData.group && (
                  <div className="bg-white p-3 rounded border border-gray-200">
                    <div className="text-xs font-medium text-gray-500 mb-1">Organization</div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-red-100 flex-shrink-0 flex items-center justify-center">
                          <span className="text-red-500 text-xs">-</span>
                        </div>
                        <div className="text-sm text-gray-500">{originalCandidateData.group}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-green-100 flex-shrink-0 flex items-center justify-center">
                          <span className="text-green-500 text-xs">+</span>
                        </div>
                        <div className="text-sm font-medium text-gray-800">{currentCandidate.group}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Show photo change */}
                {photoPreview && (
                  <div className="bg-white p-3 rounded border border-gray-200">
                    <div className="text-xs font-medium text-gray-500 mb-1">Photo</div>
                    <div className="flex flex-col sm:flex-row gap-3 items-center">
                      <div className="text-center">
                        <div className="text-xs text-gray-500 mb-1">Current</div>
                        <div className="w-16 h-16 rounded-lg bg-gray-200 overflow-hidden border border-gray-300">
                          <img
                            src={getPhotoUrl(originalCandidateData)}
                            alt="Current"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                      <div className="text-gray-400">→</div>
                      <div className="text-center">
                        <div className="text-xs text-gray-500 mb-1">New</div>
                        <div className="w-16 h-16 rounded-lg bg-gray-200 overflow-hidden border border-gray-300">
                          <img
                            src={photoPreview}
                            alt="New"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Show message if no changes detected */}
                {!hasChanges() && (
                  <div className="text-center py-3">
                    <p className="text-gray-500 text-sm">No changes detected.</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-center gap-4">
              <button
                onClick={closeUpdateConfirmModal}
                className="px-4 sm:px-5 py-2 sm:py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateSubmit}
                disabled={!hasChanges()}
                className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg transition-all ${
                  hasChanges()
                    ? "bg-orange-600 text-white hover:bg-orange-700"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                Confirm Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification - Mobile optimized */}
      <div 
        className={`fixed bottom-4 sm:top-24 sm:bottom-auto left-1/2 sm:left-auto sm:right-6 transform -translate-x-1/2 sm:translate-x-0 transition-all duration-500 ease-in-out z-50 ${
          showSuccessToast ? 'translate-y-0 opacity-100' : 'translate-y-12 sm:translate-y-0 sm:translate-x-full opacity-0'
        }`}
      >
        <div className={`bg-white rounded-lg shadow-lg border-l-4 ${
          toastType === "success" ? 'border-green-500' : 
          toastType === "error" ? 'border-red-500' : 
          'border-blue-500'
        } flex items-center p-3 sm:p-4 w-[90vw] sm:max-w-md`}>
          <div className={`${
            toastType === "success" ? 'text-green-500' : 
            toastType === "error" ? 'text-red-500' : 
            'text-blue-500'
          } mr-3`}>
            {toastType === "success" ? (
              <FaCheckCircle className="text-lg" />
            ) : toastType === "error" ? (
              <FaTimes className="text-lg" />
            ) : (
              <FaInfoCircle className="text-lg" />
            )}
          </div>
          <div className="flex-grow">
            <p className="font-medium text-xs sm:text-sm md:text-base text-gray-800">{toastMessage}</p>
          </div>
          <button 
            onClick={() => setShowSuccessToast(false)} 
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <FaTimes />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewCandidate;