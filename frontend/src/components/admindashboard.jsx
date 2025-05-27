import React, { useState, useEffect, useCallback } from "react";
import { FaUsers, FaUserCheck, FaUserGraduate, FaChartBar, FaRegClock, FaAngleRight, FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import Header from "./header";
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

// Constants for election status and organization keys
const ELECTION_STATUS = {
  NOT_STARTED: "not_started",
  ONGOING: "ongoing",
  FINISHED: "finished"
};

const ORGANIZATION_KEYS = {
  "CCS Student Council": "ccs",
  "ELITES": "elites",
  "SPECS": "specs",
  "IMAGES": "images"
};

const AdminDashboard = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showStopConfirmation, setShowStopConfirmation] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [modalData, setModalData] = useState({ title: "", logo: "" });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusMap, setStatusMap] = useState({});
  const [electionTimes, setElectionTimes] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [electionDurations, setElectionDurations] = useState({});
  const [showCreateConfirmation, setShowCreateConfirmation] = useState(false);
  const [pendingCreateOrg, setPendingCreateOrg] = useState(null);
  const [successMessage, setSuccessMessage] = useState("Operation completed successfully!");
  const navigate = useNavigate();

  // Fetch analytics and status for organizations
  const fetchData = useCallback(async () => {
    try {
      const [analyticsRes, orgsRes] = await Promise.all([
  axios.get(`${API_BASE_URL}/elections/statistics`, {
    headers: {
      "Authorization": `Bearer ${localStorage.getItem("token")}`,
    }
  }),
  axios.get(`${API_BASE_URL}/organizations`, {
    headers: {
      "Authorization": `Bearer ${localStorage.getItem("token")}`,
    }
  })
      ]);

      setAnalyticsData(analyticsRes.data);
      
        const map = {};
      const times = {};
      const durations = {};
      orgsRes.data.forEach((org) => {
        const key = ORGANIZATION_KEYS[org.name];
        if (key) {
          map[key] = org.status;
          if ((org.status === ELECTION_STATUS.ONGOING || org.status === ELECTION_STATUS.FINISHED) && org.end_time) {
            times[key] = org.end_time;
            durations[key] = org.duration_hours;
          }
        }
      });
      setStatusMap(map);
      setElectionTimes(times);
      setElectionDurations(durations);
      setLoading(false);
    } catch (err) {
      console.error("Data fetch error:", err);
      setErrorMessage("Failed to fetch data. Please try again.");
      setShowError(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Refresh data every second for real-time updates
    const interval = setInterval(fetchData, 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Enhanced countdown timer calculation
  const getCountdown = (endTime) => {
    if (!endTime) return { hours: "00", minutes: "00", seconds: "00" };
    const now = new Date().getTime();
    const end = new Date(endTime).getTime();
    const distance = end - now;

    if (distance < 0) return { hours: "00", minutes: "00", seconds: "00" };

    const hours = Math.floor(distance / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    return {
      hours: hours.toString().padStart(2, '0'),
      minutes: minutes.toString().padStart(2, '0'),
      seconds: seconds.toString().padStart(2, '0')
    };
  };

  const handleOpenModal = (title, logo) => {
    setModalData({ title, logo });
    setIsModalOpen(true);
    setShowConfirmation(false);
    setShowStopConfirmation(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setShowConfirmation(false);
    setShowStopConfirmation(false);
  };


  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleStartElection = async (e) => {
    e.preventDefault();
    setShowConfirmation(true);
  };

  const handleConfirmStart = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
    const orgName = modalData.title;
    const duration = Math.min(
      parseInt(document.getElementById("duration").value, 10) || 24,
      24
    );
    const votersSelect = document.getElementById("voters");
    let eligibleVoters = "All CCS Students";
    if (votersSelect) {
      const val = votersSelect.value;
      if (val === "bsit") eligibleVoters = "BSIT Students";
      if (val === "bscs") eligibleVoters = "BSCS Students";
      if (val === "bsemc") eligibleVoters = "BSEMC Students";
    }

      const res = await axios.post(`${API_BASE_URL}/elections/start`, {
        organization_name: orgName,
        duration_hours: duration,
        eligible_voters: eligibleVoters,
      }, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        }
      });
      
      if (res.status !== 200) throw new Error("Failed to start election");
      
      setShowConfirmation(false);
      setIsModalOpen(false);
      setShowSuccess(true);
      
      // Refresh data immediately
      await fetchData();
      
      // Hide success message after 3 seconds
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error("Start election error:", err);
      setErrorMessage(err.response?.data?.detail || "Failed to start election. Please try again.");
      setShowError(true);
      setTimeout(() => setShowError(false), 5000);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStopElection = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const res = await axios.post(`${API_BASE_URL}/elections/stop`, {
        organization_name: modalData.title
      }, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        }
      });
      
      if (res.status !== 200) throw new Error("Failed to stop election");
      
      setShowStopConfirmation(false);
      setIsModalOpen(false);
      setShowSuccess(true);
      
      // Refresh data immediately
      await fetchData();
      
      // Hide success message after 3 seconds
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error("Stop election error:", err);
      setErrorMessage(err.response?.data?.detail || "Failed to stop election. Please try again.");
      setShowError(true);
      setTimeout(() => setShowError(false), 5000);
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper for status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case ELECTION_STATUS.ONGOING:
        return (
          <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full mr-1 sm:mr-1.5"></span>
            Ongoing
          </span>
        );
      case ELECTION_STATUS.FINISHED:
        return (
          <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-orange-500 rounded-full mr-1 sm:mr-1.5"></span>
            Finished
          </span>
        );
      case ELECTION_STATUS.NOT_STARTED:
      default:
        return (
          <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full mr-1 sm:mr-1.5"></span>
            Not Started
          </span>
        );
    }
  };

  // Use loading state for analytics section only
  const analytics = analyticsData || {
    totalVoters: 0,
    candidates: { 
      "CCS Student Council": 0, 
      "ELITES": 0, 
      "SPECS": 0, 
      "IMAGES": 0 
    },
    voted: { BSIT: 0, BSCS: 0, BSEMC: 0 },
    votersByProgram: { BSIT: 0, BSCS: 0, BSEMC: 0 },
    orgVoted: {
      "CCS Student Council": 0,
      "ELITES": 0,
      "SPECS": 0,
      "IMAGES": 0
    },
    orgVoters: {
      "CCS Student Council": 0,
      "ELITES": 0,
      "SPECS": 0,
      "IMAGES": 0
    }
  };
  const totalVoted = Object.values(analytics.voted).reduce((a, b) => a + b, 0);
  const votingPercentage =
    analytics.totalVoters > 0
      ? Math.round((totalVoted / analytics.totalVoters) * 100)
      : 0;

  const getOrgKey = (orgName) => {
    if (orgName === "CCS Student Council") return "ccs";
    return orgName.toLowerCase();
  };

  const getElectionTimes = (endTime, duration) => {
    if (!endTime || !duration) return { startTime: null, endTime: null };
    
    const end = new Date(endTime);
    const start = new Date(end.getTime() - (duration * 60 * 60 * 1000));
    
    return {
      startTime: start.toLocaleString(),
      endTime: end.toLocaleString()
    };
  };

  const renderModalContent = () => {
    const orgKey = ORGANIZATION_KEYS[modalData.title];
    const status = statusMap[orgKey];
    const isElectionOngoing = status === ELECTION_STATUS.ONGOING;
    const isElectionFinished = status === ELECTION_STATUS.FINISHED;

    const getStatusColor = (status) => {
      switch (status) {
        case ELECTION_STATUS.ONGOING:
          return "from-green-500 to-green-600";
        case ELECTION_STATUS.FINISHED:
          return "from-orange-500 to-orange-600";
        default:
          return "from-orange-500 to-orange-600";
      }
    };

    const getStatusIcon = (status) => {
      switch (status) {
        case ELECTION_STATUS.ONGOING:
          return (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          );
        case ELECTION_STATUS.FINISHED:
          return (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          );
        default:
      return (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          );
      }
    };

    const endTime = electionTimes[orgKey];
    const duration = electionDurations[orgKey] || 24;
    const { startTime, endTime: calculatedEndTime } = getElectionTimes(endTime, duration);

    if (isElectionOngoing) {
      return (
        <div className="p-4 sm:p-6 md:p-8 flex flex-col md:flex-row gap-6 md:gap-8">
          {/* Left Section - Organization Info */}
          <div className="flex flex-col items-center md:w-1/3 gap-4 sm:gap-6">
            <div className="relative md:mt-8">
              <div className="absolute inset-0 bg-gradient-to-br from-green-200 to-green-400 rounded-full blur-md"></div>
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 md:w-44 md:h-44 rounded-full overflow-hidden border-4 border-white shadow-lg">
                <img
                  src={modalData.logo}
                  alt="Logo"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-800">{modalData.title}</h3>
              <div className="mt-2">
                {getStatusBadge(ELECTION_STATUS.ONGOING)}
              </div>
              {endTime && (
                <div className="mt-4 bg-green-50 rounded-lg p-3">
                  <span className="text-sm text-green-600 font-medium">Time Remaining</span>
                  <div className="text-2xl font-mono bg-white px-4 py-2 rounded-lg mt-1 shadow-sm">
                    {getCountdown(endTime).hours}:{getCountdown(endTime).minutes}:{getCountdown(endTime).seconds}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Section - Election Info */}
          <div className="flex flex-col md:w-2/3 gap-4 sm:gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                {getStatusIcon(status)}
                Election Informations
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-2 bg-green-50 rounded-lg">
                  <span className="text-sm text-gray-600">Status</span>
                  <span className="text-sm font-medium text-green-600">Active</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Started At</span>
                  <span className="text-sm font-medium text-gray-800">
                    {startTime}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Ends At</span>
                  <span className="text-sm font-medium text-gray-800">
                    {calculatedEndTime}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-3 sm:pt-4 border-t border-gray-200 mt-3 sm:mt-4">
              <button
                className="px-4 sm:px-8 py-2 sm:py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-colors shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 flex items-center text-xs sm:text-sm"
                onClick={() => setShowStopConfirmation(true)}
                type="button"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Stop Election
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (isElectionFinished) {
      return (
        <div className="flex flex-col h-full">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          {/* Left Section - Organization Info */}
          <div className="flex flex-col items-center md:w-1/3 gap-4 sm:gap-6">
            <div className="relative md:mt-8">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-200 to-orange-400 rounded-full blur-md"></div>
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 md:w-44 md:h-44 rounded-full overflow-hidden border-4 border-white shadow-lg">
                <img
                  src={modalData.logo}
                  alt="Logo"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-800">{modalData.title}</h3>
              <div className="mt-2">
                {getStatusBadge(ELECTION_STATUS.FINISHED)}
              </div>
              <div className="mt-4 bg-orange-50 rounded-lg p-3">
                <span className="text-sm text-orange-600 font-medium">Election Complete</span>
                <div className="text-sm text-gray-600 mt-1">
                  Ended: {calculatedEndTime}
                </div>
              </div>
            </div>
          </div>

          {/* Right Section - Quick Actions Only */}
          <div className="flex flex-col md:w-2/3 gap-4 sm:gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Quick Actions
              </h4>
              <div className="space-y-3">
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-blue-800">Archive Current Data</h5>
                      <p className="text-xs text-blue-600 mt-1">All election data and candidates have been automatically preserved for record keeping.</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-green-800">Start New Election Cycle</h5>
                      <p className="text-xs text-green-600 mt-1">Ready to create a fresh election with new candidates and positions for the next term.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-purple-800">Manage Candidates</h5>
                      <p className="text-xs text-purple-600 mt-1">Current candidates are archived. Add new candidates when ready to start the next election.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Footer with Action Button */}
      <div className="bg-gray-50 border-t border-gray-200 p-4 flex-shrink-0">
        <div className="flex justify-center">
          <button
            className="px-6 sm:px-8 py-3 sm:py-3.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-colors shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 flex items-center text-sm sm:text-base font-medium"
            onClick={() => handleCreateNewElection(modalData.title, modalData.logo)}
            type="button"
            disabled={isProcessing}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {isProcessing ? "Creating..." : "Create New Election"}
          </button>
        </div>
      </div>
    </div>
      );
    }

    // Default view for not started elections
    return (
      <div className="p-4 sm:p-6 md:p-8 flex flex-col md:flex-row gap-6 md:gap-8">
        {/* Left Section */}
        <div className="flex flex-col items-center md:w-1/3 gap-4 sm:gap-6">
          <div className="relative md:mt-8">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-200 to-orange-400 rounded-full blur-md"></div>
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 md:w-44 md:h-44 rounded-full overflow-hidden border-4 border-white shadow-lg">
              <img
                src={modalData.logo}
                alt="Logo"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-800">{modalData.title}</h3>
            <div className="mt-2">
              {getStatusBadge(ELECTION_STATUS.NOT_STARTED)}
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex flex-col md:w-2/3 gap-4 sm:gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <svg className="h-4 w-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Configure Election Settings
            </h4>
            
            <form className="space-y-4 sm:space-y-5">
              {/* Duration Selector */}
              <div className="space-y-1 sm:space-y-2">
                <label htmlFor="duration" className="block text-xs sm:text-sm font-medium text-gray-700">
                  Set Duration (hours)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <input
                    type="number"
                    id="duration"
                    min="1"
                    max="24"
                    defaultValue="8"
                    className="pl-8 sm:pl-10 w-full border border-gray-300 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors bg-white shadow-sm text-sm"
                    onInput={(e) => {
                      // Limit to 2 digits
                      if (e.target.value.length > 2) {
                        e.target.value = e.target.value.slice(0, 2);
                      }
                      // Ensure value is between 1-24
                      if (parseInt(e.target.value) > 24) {
                        e.target.value = "24";
                      } else if (parseInt(e.target.value) < 1 && e.target.value !== "") {
                        e.target.value = "1";
                      }
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Set how long the election will run after starting (1-24 hours)
                </p>
              </div>

              {/* Voters */}
              <div className="space-y-1 sm:space-y-2">
                <label htmlFor="voters" className="block text-xs sm:text-sm font-medium text-gray-700">
                  Eligible Voters
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <select
                    id="voters"
                    className="pl-8 sm:pl-10 w-full border border-gray-300 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors bg-white shadow-sm appearance-none text-sm"
                    style={{ backgroundImage: "url('data:image/svg+xml;charset=US-ASCII,<svg width=\"20\" height=\"20\" xmlns=\"http://www.w3.org/2000/svg\" fill=\"%23666\"><path d=\"M7 10l5 5 5-5H7z\"/></svg>')", backgroundPosition: "right 0.5rem center", backgroundRepeat: "no-repeat", paddingRight: "2.5rem" }}
                  >
                    <option value="all">All CCS Students</option>
                    <option value="bsit">BSIT Students</option>
                    <option value="bscs">BSCS Students</option>
                    <option value="bsemc">BSEMC Students</option>
                  </select>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  This determines which students will be able to participate in this election.
                </p>
              </div>
            </form>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-3 sm:pt-4 border-t border-gray-200 mt-3 sm:mt-4">
              <button
                className="px-4 sm:px-8 py-2 sm:py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-colors shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 flex items-center text-xs sm:text-sm"
                onClick={handleStartElection}
                type="button"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Start Election
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderStartConfirmation = () => (
    <div className="fixed inset-0 backdrop-blur-md bg-black/20 flex items-center justify-center z-50 transition-all duration-300 animate-fadeIn p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 sm:p-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-orange-100 mb-4">
            <svg className="h-8 w-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Start Election</h3>
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Organization:</span>
              <span className="text-sm font-medium text-gray-800">{modalData.title}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Duration:</span>
              <span className="text-sm font-medium text-gray-800">
                {document.getElementById("duration")?.value || 24} hours
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Eligible Voters:</span>
              <span className="text-sm font-medium text-gray-800">
                {document.getElementById("voters")?.value === "all" ? "All CCS Students" :
                 document.getElementById("voters")?.value === "bsit" ? "BSIT Students" :
                 document.getElementById("voters")?.value === "bscs" ? "BSCS Students" :
                 "BSEMC Students"}
              </span>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Are you sure you want to start the election? This will allow eligible voters to cast their votes.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowConfirmation(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmStart}
              disabled={isProcessing}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Starting...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Start Election
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStopConfirmation = () => (
    <div className="fixed inset-0 backdrop-blur-md bg-black/20 flex items-center justify-center z-50 transition-all duration-300 animate-fadeIn p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 sm:p-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Stop Election</h3>
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Organization:</span>
              <span className="text-sm font-medium text-gray-800">{modalData.title}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Current Status:</span>
              <span className="text-sm font-medium text-green-600">Active</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Time Remaining:</span>
              <span className="text-sm font-medium text-gray-800">
                {getCountdown(electionTimes[ORGANIZATION_KEYS[modalData.title]]).hours}:{getCountdown(electionTimes[ORGANIZATION_KEYS[modalData.title]]).minutes}:{getCountdown(electionTimes[ORGANIZATION_KEYS[modalData.title]]).seconds}
              </span>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Are you sure you want to stop this election? This action cannot be undone and will prevent further voting.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowStopConfirmation(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleStopElection}
              disabled={isProcessing}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Stopping...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Stop Election
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Add this function to your component to handle creating a new election

const handleCreateNewElection = (orgName, logo) => {
  setPendingCreateOrg({ orgName, logo });
  setShowCreateConfirmation(true);
};

// Actually call backend after confirmation
const confirmCreateNewElection = async () => {
  setIsProcessing(true);
  try {
    const duration = 8; // Default to 8 hours
    const eligibleVoters = "All CCS Students";
    const res = await axios.post(
      `${API_BASE_URL}/organizations/new`,
      {
        organization_name: pendingCreateOrg.orgName,
        duration_hours: duration,
        eligible_voters: eligibleVoters,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );
    if (res.status !== 200 && res.status !== 201) throw new Error("Failed to create new election");
    
    setSuccessMessage("New election created and previous candidates archived");
    setShowSuccess(true);
    setIsModalOpen(false);
    setShowCreateConfirmation(false);
    setPendingCreateOrg(null);
    
    // Refresh data immediately
    await fetchData();
    
    setTimeout(() => setShowSuccess(false), 3000);
  } catch (err) {
    setErrorMessage(
      err.response?.data?.detail || "Failed to create new election. Please try again."
    );
    setShowError(true);
    setShowCreateConfirmation(false);
    setPendingCreateOrg(null);
    setTimeout(() => setShowError(false), 5000);
  } finally {
    setIsProcessing(false);
  }
};

  // Confirmation modal for creating new election
  const renderCreateConfirmation = () => (
    <div className="fixed inset-0 backdrop-blur-md bg-black/20 flex items-center justify-center z-50 transition-all duration-300 animate-fadeIn p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 sm:p-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Create New Election</h3>
          <p className="text-sm text-gray-500 mb-6">
            Are you sure you want to create a new election for this organization?
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => { setShowCreateConfirmation(false); setPendingCreateOrg(null); }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmCreateNewElection}
              disabled={isProcessing}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create Election
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-gray-50 min-h-screen">
      <Header username="Admin" onMenuClick={toggleSidebar} />

      <div className="main-content md:ml-[250px] p-4 sm:p-6">
        {/* Welcome Banner */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Welcome back, Admin!</h1>
          <p className="text-gray-600 mt-1">Here's what's happening with your elections today.</p>
        </div>

        {/* Analytics Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Total Voters Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 relative">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-orange-100 to-orange-50 p-2.5 sm:p-3 rounded-xl shadow-sm">
                  <FaUsers className="text-xl sm:text-2xl text-orange-600" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-medium text-gray-500">Total Voters</h3>
                    <div className="flex items-end gap-2">
                      {loading ? (
                        <span className="animate-pulse text-gray-400">Loading...</span>
                      ) : (
                        <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">{analytics.totalVoters}</p>
                      )}
                    </div>
                  </div>
                </div>
                <span className="bg-gradient-to-r from-green-100 to-green-50 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm">
                  Active
                </span>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500"></div>
          </div>

          {/* Total Candidates Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 relative">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-blue-100 to-blue-50 p-2.5 sm:p-3 rounded-xl shadow-sm">
                  <FaUserCheck className="text-xl sm:text-2xl text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-medium text-gray-500">Total Candidates</h3>
                    <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      {loading ? "..." : Object.values(analytics.candidates).reduce((a, b) => a + b, 0)}
                    </p>
                  </div>
                </div>
                <span className="bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm">
                  Registered
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-gradient-to-br from-gray-50 to-white p-2 rounded-lg text-center shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-base sm:text-lg font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">{analytics.candidates["CCS Student Council"] || 0}</p>
                  <p className="text-xs text-gray-500 truncate">CCS SC</p>
                </div>
                <div className="bg-gradient-to-br from-gray-50 to-white p-2 rounded-lg text-center shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-base sm:text-lg font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">{analytics.candidates["ELITES"] || 0}</p>
                  <p className="text-xs text-gray-500">ELITES</p>
                </div>
                <div className="bg-gradient-to-br from-gray-50 to-white p-2 rounded-lg text-center shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-base sm:text-lg font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">{analytics.candidates["SPECS"] || 0}</p>
                  <p className="text-xs text-gray-500">SPECS</p>
                </div>
                <div className="bg-gradient-to-br from-gray-50 to-white p-2 rounded-lg text-center shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-base sm:text-lg font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">{analytics.candidates["IMAGES"] || 0}</p>
                  <p className="text-xs text-gray-500">IMAGES</p>
                </div>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-blue-400 to-blue-500"></div>
          </div>

          {/* Voters Participation Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 relative">
  <div className="p-4 sm:p-6">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="bg-gradient-to-br from-green-100 to-green-50 p-2.5 sm:p-3 rounded-xl shadow-sm">
        <FaChartBar className="text-xl sm:text-2xl text-green-600" />
        </div>
        <div>
          <h3 className="text-sm sm:text-base font-medium text-gray-500">Voters Participation</h3>
          <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
            {loading ? "..." : `${votingPercentage}%`}
          </p>
        </div>
      </div>
      <span className="bg-gradient-to-r from-orange-100 to-orange-50 text-orange-700 text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm">
        Turnout
      </span>
    </div>
    <div className="space-y-3">
      <div className="h-3 w-full bg-gradient-to-r from-gray-100 to-gray-50 rounded-full shadow-inner overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full shadow-sm transition-all duration-500"
          style={{ width: `${votingPercentage}%` }}
        ></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-orange-50 to-white p-3 rounded-lg shadow-sm">
          <p className="text-xs text-orange-600 mb-1 font-medium">CCS Student Council</p>
          <p className="text-lg font-semibold text-gray-800">{analytics.orgVoted?.["CCS Student Council"] || 0}</p>
          <p className="text-xs text-gray-500">
            of {analytics.orgVoters?.["CCS Student Council"] || analytics.totalVoters || 0} eligible
          </p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-white p-3 rounded-lg shadow-sm">
          <p className="text-xs text-blue-600 mb-1 font-medium">ELITES</p>
          <p className="text-lg font-semibold text-gray-800">{analytics.orgVoted?.["ELITES"] || 0}</p>
          <p className="text-xs text-gray-500">
            of {analytics.orgVoters?.["ELITES"] || analytics.votersByProgram?.BSIT || 0} eligible
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-purple-50 to-white p-3 rounded-lg shadow-sm">
          <p className="text-xs text-purple-600 mb-1 font-medium">SPECS</p>
          <p className="text-lg font-semibold text-gray-800">{analytics.orgVoted?.["SPECS"] || 0}</p>
          <p className="text-xs text-gray-500">
            of {analytics.orgVoters?.["SPECS"] || analytics.votersByProgram?.BSCS || 0} eligible
          </p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-white p-3 rounded-lg shadow-sm">
          <p className="text-xs text-green-600 mb-1 font-medium">IMAGES</p>
          <p className="text-lg font-semibold text-gray-800">{analytics.orgVoted?.["IMAGES"] || 0}</p>
          <p className="text-xs text-gray-500">
            of {analytics.orgVoters?.["IMAGES"] || analytics.votersByProgram?.BSEMC || 0} eligible
          </p>
        </div>
      </div>
    </div>
  </div>
  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 via-green-400 to-green-500"></div>
</div>

          {/* Status Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow relative">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-purple-100 p-2 sm:p-3 rounded-lg">
                  <FaRegClock className="text-xl sm:text-2xl text-purple-600" />
                </div>
                <span className="bg-purple-100 text-purple-700 text-xs font-semibold px-2 sm:px-3 py-1 rounded-full">
                  Live
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-medium text-gray-500">Election Status</h3>
              <div className="mt-2 space-y-2">
                {["CCS Student Council", "ELITES", "SPECS", "IMAGES"].map((org) => {
                  const key = org === "CCS Student Council" ? "ccs" : org.toLowerCase();
                  const status = statusMap[key];
                  const endTime = electionTimes[key];
                  const countdown = getCountdown(endTime);
                  return (
                    <div key={org} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                      <span className="text-xs text-gray-600">{org}</span>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(status)}
                        {status === "ongoing" && (
                          <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg shadow-sm">
                            <div className="flex flex-col items-center">
                              <span className="text-xs font-bold text-green-600">{countdown.hours}</span>
                              <span className="text-[10px] text-gray-500">HRS</span>
                            </div>
                            <span className="text-gray-300">:</span>
                            <div className="flex flex-col items-center">
                              <span className="text-xs font-bold text-green-600">{countdown.minutes}</span>
                              <span className="text-[10px] text-gray-500">MIN</span>
                            </div>
                            <span className="text-gray-300">:</span>
                            <div className="flex flex-col items-center">
                              <span className="text-xs font-bold text-green-600">{countdown.seconds}</span>
                              <span className="text-[10px] text-gray-500">SEC</span>
                            </div>
                          </div>
                        )}
                </div>
                </div>
                  );
                })}
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-500 via-purple-400 to-purple-500"></div>
          </div>
        </div>

        {/* Manage Elections Title */}
        <div className="flex justify-between items-center mb-4 sm:mb-6 flex-wrap gap-2">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Manage Elections</h2>
        </div>

        {/* Organization Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* CCS Student Council Card */}
          <div className="group bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all hover:-translate-y-1 duration-300">
            <div className="p-4 sm:p-6 flex flex-col items-center">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-4 border-gray-200 group-hover:border-orange-200 transition-all mb-3 sm:mb-4">
                <img
                  src="/assets/STUDENT-COUNCIL.jpg"
                  alt="Student Council"
                  className="w-full h-full object-cover"
                />
              </div>
              <h5 className="text-base sm:text-lg font-semibold text-gray-800 mb-2 text-center">CCS Student Council</h5>
              <div className="flex items-center mb-2 sm:mb-3">
                {getStatusBadge(statusMap.ccs)}
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-5 text-center line-clamp-3">
                Founded in 2013, Gordon College CCS Student Council is a
                recognized Student Society on Information Technology, Computer
                Science, and Entertainment and Multimedia Computing.
              </p>
              <button
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all flex items-center justify-center shadow-sm group-hover:shadow-md text-xs sm:text-sm"
                onClick={() => handleOpenModal("CCS Student Council", "/assets/STUDENT-COUNCIL.jpg")}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Manage Election
              </button>
            </div>
          </div>

          {/* ELITES Card */}
          <div className="group bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all hover:-translate-y-1 duration-300">
            <div className="p-4 sm:p-6 flex flex-col items-center">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-4 border-gray-200 group-hover:border-orange-200 transition-all mb-3 sm:mb-4">
                <img
                  src="/assets/ELITES.jpg"
                  alt="Elites"
                  className="w-full h-full object-cover"
                />
              </div>
              <h5 className="text-base sm:text-lg font-semibold text-gray-800 mb-2 text-center">ELITES</h5>
              <div className="flex items-center mb-2 sm:mb-3">
                {getStatusBadge(statusMap.elites)}
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-5 text-center line-clamp-3">
                Founded in 2022, GCCCS ELITES (Empowered League of Information
                Technology Education Students).
              </p>
              <button
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all flex items-center justify-center shadow-sm group-hover:shadow-md text-xs sm:text-sm"
                onClick={() => handleOpenModal("ELITES", "/assets/ELITES.jpg")}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Manage Election
              </button>
            </div>
          </div>

          {/* SPECS Card */}
          <div className="group bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all hover:-translate-y-1 duration-300">
            <div className="p-4 sm:p-6 flex flex-col items-center">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-4 border-gray-200 group-hover:border-orange-200 transition-all mb-3 sm:mb-4">
                <img
                  src="/assets/SPECS.jpg"
                  alt="Specs"
                  className="w-full h-full object-cover"
                />
              </div>
              <h5 className="text-base sm:text-lg font-semibold text-gray-800 mb-2 text-center">SPECS</h5>
              <div className="flex items-center mb-2 sm:mb-3">
                {getStatusBadge(statusMap.specs)}
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-5 text-center line-clamp-3">
                The Society of Programming Enthusiasts in Computer Science
                (SPECS) is an organization under the GCCCS.
              </p>
              <button
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all flex items-center justify-center shadow-sm group-hover:shadow-md text-xs sm:text-sm"
                onClick={() => handleOpenModal("SPECS", "/assets/SPECS.jpg")}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Manage Election
              </button>
            </div>
          </div>

          {/* IMAGES Card */}
          <div className="group bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all hover:-translate-y-1 duration-300">
            <div className="p-4 sm:p-6 flex flex-col items-center">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-4 border-gray-200 group-hover:border-orange-200 transition-all mb-3 sm:mb-4">
                <img
                  src="/assets/IMAGES.jpg"
                  alt="Images"
                  className="w-full h-full object-cover"
                />
              </div>
              <h5 className="text-base sm:text-lg font-semibold text-gray-800 mb-2 text-center">IMAGES</h5>
              <div className="flex items-center mb-2 sm:mb-3">
                {getStatusBadge(statusMap.images)}
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-5 text-center line-clamp-3">
                The Innovative Multimedia Artists Guild of Empowered Students
                (IMAGES) is a creatives organization of the GCCCS.
              </p>
              <button
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all flex items-center justify-center shadow-sm group-hover:shadow-md text-xs sm:text-sm"
                onClick={() => handleOpenModal("IMAGES", "/assets/IMAGES.jpg")}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Manage Election
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 flex items-center justify-center z-50 transition-all duration-300 animate-fadeIn p-4">
          <div className="bg-gradient-to-br from-white to-gray-100 rounded-2xl shadow-2xl w-full max-w-[900px] flex flex-col overflow-hidden border border-gray-200 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 sm:p-6 flex justify-between items-center sticky top-0 z-10">
              <div className="flex items-center">
                <div className="bg-white p-1.5 sm:p-2 rounded-full mr-3 sm:mr-4">
                  <img
                    src={modalData.logo}
                    alt="Logo"
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover"
                  />
                </div>
                <h5 className="text-lg sm:text-xl font-bold text-white">{modalData.title}</h5>
              </div>
              <button
                className="text-white hover:text-gray-200 bg-white/20 rounded-full w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center transition-all hover:bg-white/30"
                onClick={handleCloseModal}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            {renderModalContent()}
          </div>
        </div>
      )}

      {/* Confirmation Dialogs */}
      {showConfirmation && renderStartConfirmation()}
      {showStopConfirmation && renderStopConfirmation()}
      {showCreateConfirmation && renderCreateConfirmation()}

      {/* Error Notification */}
      {showError && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fadeIn z-50">
          <FaExclamationCircle className="text-xl" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Success Notification */}
      {showSuccess && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fadeIn z-50">
          <FaCheckCircle className="text-xl" />
          <span>Operation completed successfully!</span>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;