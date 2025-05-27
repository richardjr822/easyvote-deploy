import React, { useState, useEffect, useMemo } from "react";
import Header from "./header";
import axios from "axios";
import { 
  FaSearch, FaClipboardList, FaDownload, FaFilter, 
  FaChevronDown, FaRegCalendarAlt, FaSort, FaSortUp, FaSortDown, 
  FaChevronLeft, FaChevronRight, FaUsers, FaTimes, FaSpinner,
  FaUndo, FaExclamationTriangle
} from "react-icons/fa";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const Archives = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Check if mobile on resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // State variables
  const [candidatesSearchTerm, setCandidatesSearchTerm] = useState("");
  const [candidatesYearFilter, setCandidatesYearFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [candidatesData, setCandidatesData] = useState([]);
  const [stats, setStats] = useState({
    totalCandidates: 0,
    candidates: {},
    years: []
  });
  const [error, setError] = useState(null);
  
  // Sorting states
  const [candidatesSortField, setCandidatesSortField] = useState("archiveId");
  const [candidatesSortDirection, setCandidatesSortDirection] = useState("asc");
  
  // Pagination states
  const [candidatesPage, setCandidatesPage] = useState(1);
  const [itemsPerPage] = useState(5);

  // New state variables for unarchive modal
  const [showUnarchiveModal, setShowUnarchiveModal] = useState(false);
  const [candidateToUnarchive, setCandidateToUnarchive] = useState(null);

  // New state variables for success message
  const [successMessage, setSuccessMessage] = useState(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Fetch data from backend
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch statistics and candidates in parallel with auth headers
        const [statsRes, candidatesRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/archives/statistics`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }),
          axios.get(`${API_BASE_URL}/archives/candidates`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          })
        ]);
        
        // Update state with fetched data
        setStats(statsRes.data);
        setCandidatesData(candidatesRes.data);
      } catch (err) {
        console.error("Error fetching archive data:", err);
        setError("Failed to load archive data. Please try again.");
      } finally {
        // Delay slightly to show loading state
        setTimeout(() => setIsLoading(false), 500);
      }
    };
    
    fetchData();
  }, []);

  // Filter and sort candidates data
  const filteredCandidates = useMemo(() => {
    return candidatesData
      .filter(candidate => 
        (candidatesYearFilter === "all" || candidate.archivedYear?.toString() === candidatesYearFilter) &&
        (candidatesSearchTerm === "" || 
          candidate.name?.toLowerCase().includes(candidatesSearchTerm.toLowerCase()) ||
          candidate.group?.toLowerCase().includes(candidatesSearchTerm.toLowerCase()) ||
          candidate.position?.toLowerCase().includes(candidatesSearchTerm.toLowerCase()) ||
          candidate.candidateId?.toString().includes(candidatesSearchTerm))
      )
      .sort((a, b) => {
        const aValue = a[candidatesSortField] || '';
        const bValue = b[candidatesSortField] || '';
        
        if (candidatesSortDirection === "asc") {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        } else {
          return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
        }
      });
  }, [candidatesData, candidatesSearchTerm, candidatesYearFilter, candidatesSortField, candidatesSortDirection]);

  // Calculate pages for pagination
  const totalCandidatesPages = Math.ceil(filteredCandidates.length / itemsPerPage);
  
  // Get current page items
  const currentCandidates = filteredCandidates.slice(
    (candidatesPage - 1) * itemsPerPage,
    candidatesPage * itemsPerPage
  );

  // Sorting handlers
  const handleCandidatesSort = (field) => {
    if (candidatesSortField === field) {
      setCandidatesSortDirection(candidatesSortDirection === "asc" ? "desc" : "asc");
    } else {
      setCandidatesSortField(field);
      setCandidatesSortDirection("asc");
    }
  };

  // Get appropriate sort icon
  const getSortIcon = (field, currentSortField, direction) => {
    if (field !== currentSortField) return <FaSort className="text-gray-400 text-[10px] sm:text-xs" />;
    return direction === "asc" ? 
      <FaSortUp className="text-orange-600 text-[10px] sm:text-xs" /> : 
      <FaSortDown className="text-orange-600 text-[10px] sm:text-xs" />;
  };

  // Format date string for better display
  const formatDate = (dateString) => {
    if (!dateString) return "";
    if (dateString.includes("T")) {
      // Handle ISO format
      const date = new Date(dateString);
      return date.toLocaleString();
    }
    if (dateString.includes(" ")) {
      // Handle datetime format
      const [date, time] = dateString.split(" ");
      const [year, month, day] = date.split("-");
      return `${month}/${day}/${year} ${time}`;
    }
    // Handle date only format
    const [year, month, day] = dateString.split("-");
    return `${month}/${day}/${year}`;
  };

  // Handle export to CSV
  const exportToCSV = (data, filename) => {
    // Convert data to CSV format
    const csvRows = [];
    const headers = Object.keys(data[0]);
    csvRows.push(headers.join(','));
    
    for (const row of data) {
      const values = headers.map(header => {
        const val = row[header];
        return `"${val}"`;
      });
      csvRows.push(values.join(','));
    }
    
    const csvData = csvRows.join('\n');
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Error display component
  const ErrorDisplay = ({ message }) => (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
      <p className="text-red-600 font-medium mb-2">Error Loading Data</p>
      <p className="text-red-500 text-sm">{message}</p>
      <button 
        onClick={() => window.location.reload()}
        className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700"
      >
        Retry
      </button>
    </div>
  );

  // Unarchive candidate function
  const handleUnarchiveClick = (candidate) => {
    setCandidateToUnarchive(candidate);
    setShowUnarchiveModal(true);
  };

  // The actual unarchive function that makes the API call
  const confirmUnarchive = async () => {
    if (!candidateToUnarchive) return;
    
    try {
      setIsLoading(true);
      const response = await axios.post(`${API_BASE_URL}/archives/unarchive/${candidateToUnarchive.archiveId}`, {}, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.data.success) {
        // Remove the candidate from the local state
        setCandidatesData(prev => prev.filter(c => c.candidateId !== candidateToUnarchive.candidateId));
        
        // Update stats
        setStats(prev => ({
          ...prev,
          totalCandidates: prev.totalCandidates - 1
        }));
        
        // Set success message and show toast
        setSuccessMessage(`${candidateToUnarchive.name} was successfully unarchived`);
        setShowSuccessToast(true);
        
        // Hide the toast after 5 seconds
        setTimeout(() => {
          setShowSuccessToast(false);
          setTimeout(() => setSuccessMessage(null), 500); // Clear message after fade out
        }, 5000);
        
        // Close the modal
        setShowUnarchiveModal(false);
        setCandidateToUnarchive(null);
      }
    } catch (error) {
      console.error("Error unarchiving candidate:", error);
      // You could show an error message in the modal
    } finally {
      setIsLoading(false);
    }
  };
  
  // Unarchive modal component
  const UnarchiveModal = () => {
    if (!showUnarchiveModal || !candidateToUnarchive) return null;
    
    return (
      <div className="fixed inset-0 backdrop-blur-md bg-white/30 flex items-center justify-center z-50 p-4 transition-all duration-300">
        <div className="bg-white rounded-xl shadow-lg max-w-md w-full overflow-hidden animate-fadeIn">
          <div className="bg-orange-50 p-4 border-b border-orange-100">
            <div className="flex items-center">
              <div className="bg-orange-100 p-2 rounded-full mr-3">
                <FaExclamationTriangle className="text-orange-600 text-lg" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Confirm Unarchive</h3>
            </div>
          </div>
          
          <div className="p-5">
            <p className="text-gray-600 mb-4">
              Are you sure you want to unarchive <span className="font-semibold text-gray-800">{candidateToUnarchive.name}</span>?
            </p>
            
            <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg mb-4">
              This will restore the candidate to the active candidates list and remove them from the archives.
            </p>
            
            <div className="flex items-center gap-3 mt-6">
              <img
                src={candidateToUnarchive.photoUrl?.startsWith('http') 
                  ? candidateToUnarchive.photoUrl 
                  : `${API_BASE_URL.replace('/api/v1', '')}${candidateToUnarchive.photoUrl?.startsWith('/') ? '' : '/'}${candidateToUnarchive.photoUrl || ''}`}
                alt={candidateToUnarchive.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-orange-200"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/assets/default-profile.jpg';
                }}
              />
              <div>
                <p className="font-medium text-gray-900">{candidateToUnarchive.name}</p>
                <p className="text-sm text-gray-500">{candidateToUnarchive.position} • {candidateToUnarchive.group}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 px-5 py-4 flex justify-end space-x-3 border-t border-gray-100">
            <button
              onClick={() => {
                setShowUnarchiveModal(false);
                setCandidateToUnarchive(null);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              onClick={confirmUnarchive}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 flex items-center"
            >
              <FaUndo className="mr-2 text-xs" />
              Unarchive
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Success toast component
  const SuccessToast = () => {
    if (!showSuccessToast || !successMessage) return null;
    
    return (
      <div className="fixed bottom-5 right-5 bg-white rounded-lg shadow-lg border border-green-200 p-4 z-50 max-w-md animate-fadeIn transition-all duration-300 transform flex items-center">
        <div className="bg-green-100 p-2 rounded-full mr-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h3 className="font-medium text-gray-900">Success!</h3>
          <p className="text-sm text-gray-600">{successMessage}</p>
        </div>
        <button 
          onClick={() => setShowSuccessToast(false)} 
          className="ml-auto text-gray-400 hover:text-gray-500"
        >
          <FaTimes />
        </button>
      </div>
    );
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <Header username="Admin" />

      {/* Main Content - Responsive margin */}
      <div className={`p-3 sm:p-5 transition-all duration-300 ${isMobile ? '' : 'ml-[250px]'}`}>
        {/* Dashboard Header - Mobile Optimized */}
        <div className="bg-gradient-to-r from-orange-100 to-gray-100 p-4 sm:p-6 rounded-xl shadow-md border border-gray-200 mb-4 sm:mb-6">
          <div className="flex flex-col justify-between">
            <div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 flex items-center">
                <FaClipboardList className="text-orange-600 mr-2 sm:mr-3 text-base sm:text-xl" />
                Candidates Archives
              </h1>
              <p className="text-[11px] sm:text-sm text-gray-600 mt-1">View and analyze historical candidate data</p>
            </div>
          </div>
        </div>

        {/* Display error if any */}
        {error && !isLoading && (
          <ErrorDisplay message={error} />
        )}

        {/* Loading Indicator */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <FaSpinner className="text-orange-500 text-4xl animate-spin mb-4" />
            <p className="text-gray-600">Loading archive data...</p>
          </div>
        ) : (
          <>
            {/* Stats Cards - Mobile Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 mb-4 sm:mb-6">
              {/* Total Archives Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-3 sm:p-5">
                  <div className="flex items-center justify-between mb-2 sm:mb-4">
                    <div className="bg-orange-100 p-2 sm:p-3 rounded-lg">
                      <FaClipboardList className="text-base sm:text-2xl text-orange-600" />
                    </div>
                  </div>
                  <h3 className="text-[10px] sm:text-base font-medium text-gray-500">Total Archived Candidates</h3>
                  <div className="flex items-end gap-1 sm:gap-2">
                    <p className="text-lg sm:text-3xl font-bold text-gray-800">{stats.totalCandidates}</p>
                    <span className="text-[9px] sm:text-sm text-orange-600 font-medium mb-1">From {stats.years?.length || 0} elections</span>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 h-1.5 w-full"></div>
              </div>

              {/* Total Organizations Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-3 sm:p-5">
                  <div className="flex items-center justify-between mb-2 sm:mb-4">
                    <div className="bg-green-100 p-2 sm:p-3 rounded-lg">
                      <FaUsers className="text-base sm:text-2xl text-green-600" />
                    </div>
                  </div>
                  <h3 className="text-[10px] sm:text-base font-medium text-gray-500">Organizations</h3>
                  <div className="flex items-end gap-1 sm:gap-2">
                    <p className="text-lg sm:text-3xl font-bold text-gray-800">{Object.keys(stats.candidates || {}).length}</p>
                    <span className="text-[9px] sm:text-sm text-green-600 font-medium mb-1">Student Organizations</span>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-green-500 to-green-600 h-1.5 w-full"></div>
              </div>

              {/* Archive Years Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-3 sm:p-5">
                  <div className="flex items-center justify-between mb-2 sm:mb-4">
                    <div className="bg-purple-100 p-2 sm:p-3 rounded-lg">
                      <FaRegCalendarAlt className="text-base sm:text-2xl text-purple-600" />
                    </div>
                  </div>
                  <h3 className="text-[10px] sm:text-base font-medium text-gray-500">Archive Years</h3>
                  <div className="flex items-end gap-1 sm:gap-2">
                    <p className="text-lg sm:text-3xl font-bold text-gray-800">{stats.years?.length || 0}</p>
                    <div className="flex flex-wrap gap-1 mb-1">
                      {(stats.years || []).slice(0, 3).map(year => (
                        <span key={year} className="text-[9px] sm:text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                          {year}
                        </span>
                      ))}
                      {(stats.years?.length || 0) > 3 && (
                        <span className="text-[9px] sm:text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                          +{(stats.years?.length || 0) - 3}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 h-1.5 w-full"></div>
              </div>
            </div>

            {/* Candidates Archive Section */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
              <div className="p-3 sm:p-4 md:p-6">
                {/* Search and Filter Row - Mobile Stacked */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 space-y-3 sm:space-y-0">
                  <h2 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center">
                    <FaClipboardList className="text-orange-600 mr-2 text-sm sm:text-base" />
                    Candidates Archives
                  </h2>
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaFilter className="text-gray-500 text-xs" />
                      </div>
                      <select
                        value={candidatesYearFilter}
                        onChange={(e) => {
                          setCandidatesYearFilter(e.target.value);
                          setCandidatesPage(1);
                        }}
                        className="pl-8 sm:pl-10 pr-6 sm:pr-8 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 appearance-none bg-white text-[11px] sm:text-sm"
                      >
                        <option value="all">All Years</option>
                        {(stats.years || []).map(year => (
                          <option key={year} value={year.toString()}>{year}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                        <FaChevronDown className="text-[9px] sm:text-xs" />
                      </div>
                    </div>
                    
                    <div className="relative w-full sm:w-auto">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaSearch className="text-gray-500 text-xs" />
                      </div>
                      <input
                        type="text"
                        value={candidatesSearchTerm}
                        onChange={(e) => {
                          setCandidatesSearchTerm(e.target.value);
                          setCandidatesPage(1);
                        }}
                        placeholder="Search candidates..."
                        className="w-full sm:w-60 pl-8 sm:pl-10 pr-4 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-[11px] sm:text-sm"
                      />
                      {candidatesSearchTerm && (
                        <button
                          onClick={() => setCandidatesSearchTerm("")}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500"
                        >
                          <FaTimes className="text-xs" />
                        </button>
                      )}
                    </div>

                    {/* Export button */}
                    <button
                      onClick={() => exportToCSV(filteredCandidates, `candidate_archives_${new Date().toISOString().split('T')[0]}.csv`)}
                      className="px-3 sm:px-4 py-1.5 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center text-[11px] sm:text-sm"
                    >
                      <FaDownload className="mr-1 sm:mr-2 text-[10px] sm:text-xs" />
                      Export CSV
                    </button>
                  </div>
                </div>

                {/* Results Summary - Mobile Text Size */}
                <div className="text-[10px] sm:text-sm text-gray-600 mb-3 sm:mb-4">
                  Showing {currentCandidates.length} of {filteredCandidates.length} candidates
                  {candidatesYearFilter !== "all" && <span> from {candidatesYearFilter}</span>}
                  {candidatesSearchTerm && <span> matching "{candidatesSearchTerm}"</span>}
                </div>

                {/* Mobile Card View - Only visible on mobile */}
                <div className="block sm:hidden space-y-3 mb-4">
                  {/* Mobile candidate card */}
                  {currentCandidates.length > 0 ? (
                    currentCandidates.map((candidate) => (
                      <div key={candidate.archiveId} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-3 border-b border-gray-100">
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center">
                              {/* Candidate photo - small circle */}
                              <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 mr-2">
                                {candidate.photoUrl ? (
                                  <img 
                                    src={candidate.photoUrl?.startsWith('http') 
                                      ? candidate.photoUrl 
                                      : `${API_BASE_URL.replace('/api/v1', '')}${candidate.photoUrl?.startsWith('/') ? '' : '/'}${candidate.photoUrl || ''}`}
                                    alt={candidate.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.src = '/assets/default-profile.jpg';
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-600 font-medium">
                                    {candidate.name?.charAt(0) || '?'}
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="font-medium text-xs text-gray-900">{candidate.name}</div>
                                <div className="text-[9px] text-gray-500">ID: {candidate.position}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 inline-flex text-[9px] leading-5 font-medium rounded-full bg-green-100 text-green-800">
                                {candidate.votes} votes
                              </span>
                              <button
                                onClick={() => handleUnarchiveClick(candidate)}
                                className="p-1 rounded-full bg-orange-100 text-orange-600 hover:bg-orange-200"
                                title="Unarchive candidate"
                              >
                                <FaUndo className="text-[10px]" />
                              </button>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 mt-2 text-[9px]">
                            <div className="bg-gray-50 p-1.5 rounded">
                              <div className="text-gray-500 mb-0.5">Position</div>
                              <div className="font-medium text-gray-800">{candidate.position}</div>
                            </div>
                            <div className="bg-gray-50 p-1.5 rounded">
                              <div className="text-gray-500 mb-0.5">Organization</div>
                              <div className="font-medium text-gray-800">{candidate.group}</div>
                            </div>
                            <div className="bg-gray-50 p-1.5 rounded">
                              <div className="text-gray-500 mb-0.5">Year</div>
                              <div className="font-medium text-gray-800">{candidate.archivedYear}</div>
                            </div>
                            <div className="bg-gray-50 p-1.5 rounded">
                              <div className="text-gray-500 mb-0.5">Created</div>
                              <div className="font-medium text-gray-800">{formatDate(candidate.createdAt)}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <p className="text-gray-500">No candidate archives found.</p>
                    </div>
                  )}
                </div>

                {/* Desktop Table - Hidden on mobile */}
                <div className="hidden sm:block overflow-x-auto">
                  {filteredCandidates.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {[
                            { field: "name", label: "Name" },
                            { field: "group", label: "Organization" },
                            { field: "position", label: "Position" },
                            { field: "archivedYear", label: "Archived Year" },
                            { field: "createdAt", label: "Created At" },
                            { field: "votes", label: "Votes" },
                            { field: "actions", label: "Actions" },
                          ].map(({ field, label }) => (
                            <th
                              key={field}
                              onClick={() => field !== "actions" ? handleCandidatesSort(field) : null}
                              className={`px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-700 uppercase tracking-wider ${field !== "actions" ? "cursor-pointer hover:bg-gray-100" : ""} transition-colors`}
                            >
                              <div className="flex items-center">
                                <span>{label}</span>
                                {field !== "actions" && (
                                  <div className="ml-1">
                                    {getSortIcon(field, candidatesSortField, candidatesSortDirection)}
                                  </div>
                                )}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {currentCandidates.map((candidate) => (
                          <tr key={candidate.archiveId} className="hover:bg-orange-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10 rounded-full overflow-hidden bg-gray-200">
                                  {candidate.photoUrl ? (
                                    <img 
                                      src={candidate.photoUrl?.startsWith('http') 
                                        ? candidate.photoUrl 
                                        : `${API_BASE_URL.replace('/api/v1', '')}${candidate.photoUrl?.startsWith('/') ? '' : '/'}${candidate.photoUrl || ''}`}
                                    alt={candidate.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.src = '/assets/default-profile.jpg';
                                    }}
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-600 font-medium">
                                      {candidate.name?.charAt(0) || '?'}
                                    </div>
                                  )}
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">{candidate.name}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full ${
                                candidate.group === "CCS Student Council" ? "bg-blue-100 text-blue-800" :
                                candidate.group === "ELITES" ? "bg-purple-100 text-purple-800" :
                                candidate.group === "SPECS" ? "bg-green-100 text-green-800" :
                                "bg-yellow-100 text-yellow-800"
                              }`}>
                                {candidate.group}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {candidate.position}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {candidate.archivedYear}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {formatDate(candidate.createdAt)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full bg-green-100 text-green-800">
                                {candidate.votes}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <button
                                onClick={() => handleUnarchiveClick(candidate)}
                                className="text-orange-600 hover:text-orange-900 flex items-center gap-1"
                                title="Unarchive candidate"
                              >
                                <FaUndo className="text-xs" />
                                <span>Unarchive</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500 text-lg">No candidate archives found.</p>
                    </div>
                  )}
                </div>

                {/* Pagination - Mobile Optimized */}
                {filteredCandidates.length > 0 && (
                  <div className="flex justify-between items-center mt-4 sm:mt-6">
                    <div className="text-[10px] sm:text-sm text-gray-600">
                      Page {candidatesPage} of {totalCandidatesPages || 1}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setCandidatesPage((prev) => Math.max(prev - 1, 1))}
                        disabled={candidatesPage === 1}
                        className={`px-2 sm:px-3 py-1 rounded-lg text-[10px] sm:text-sm font-medium ${
                          candidatesPage === 1
                            ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        <FaChevronLeft className="text-[9px] sm:text-xs" />
                      </button>
                      <button
                        onClick={() => setCandidatesPage((prev) => Math.min(prev + 1, totalCandidatesPages))}
                        disabled={candidatesPage === totalCandidatesPages || totalCandidatesPages === 0}
                        className={`px-2 sm:px-3 py-1 rounded-lg text-[10px] sm:text-sm font-medium ${
                          candidatesPage === totalCandidatesPages || totalCandidatesPages === 0
                            ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        <FaChevronRight className="text-[9px] sm:text-xs" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Unarchive Modal */}
      <UnarchiveModal />
      
      {/* Success Toast */}
      <SuccessToast />
    </div>
  );
};

export default Archives;