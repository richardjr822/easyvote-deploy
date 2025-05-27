import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { 
  FaVoteYea, FaInfoCircle, FaClock, FaChevronRight, 
  FaRegListAlt, FaTimes, FaExclamationTriangle, FaCheckCircle,
  FaSpinner, FaReceipt
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const VoterDashboard = () => {
  const navigate = useNavigate();
  
  // Memoized helper functions
  const getPhilippinesTime = useCallback(() => {
    return new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Manila"}));
  }, []);
  
  // State management
  const [currentTime, setCurrentTime] = useState(getPhilippinesTime());
  const [animatedCards, setAnimatedCards] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipContent, setTooltipContent] = useState("");
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [studentInfo, setStudentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [electionsLoading, setElectionsLoading] = useState(true);
  const [voteStatusLoading, setVoteStatusLoading] = useState(true);
  const [filteredElections, setFilteredElections] = useState([]);
  const [error, setError] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const [dbElectionIds, setDbElectionIds] = useState({});
  const modalRef = useRef(null);
  
  // Cache for API calls
  const apiCache = useRef(new Map());
  const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes cache
  
  // Loading Skeleton Component
  const SkeletonCard = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 animate-pulse overflow-hidden">
      {/* Header Skeleton */}
      <div className="h-24 bg-gradient-to-r from-gray-200 to-gray-300 relative">
        <div className="absolute inset-0 flex items-center p-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gray-300 mr-3 sm:mr-4"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-300 rounded w-1/2"></div>
          </div>
        </div>
      </div>
      
      {/* Content Skeleton */}
      <div className="p-4 sm:p-5">
        <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-4/5 mb-4"></div>
        
        {/* Status Box Skeleton */}
        <div className="bg-gray-100 p-3 rounded-lg mb-4">
          <div className="h-2 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-6 bg-gray-200 rounded w-2/3 mx-auto"></div>
        </div>
        
        {/* Button Skeleton */}
        <div className="h-10 bg-gray-200 rounded w-full"></div>
      </div>
    </div>
  );

  // Loading Dots Component
  const LoadingDots = ({ text = "Loading" }) => (
    <div className="flex items-center justify-center space-x-1">
      <span className="text-gray-600">{text}</span>
      <div className="flex space-x-1">
        <div className="w-1 h-1 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-1 h-1 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-1 h-1 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
    </div>
  );

  // Shimmer Effect Component
  const ShimmerEffect = ({ className = "" }) => (
    <div className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] ${className}`} 
         style={{ animation: 'shimmer 2s infinite' }}>
    </div>
  );

  // Memoized constants
  const organizationIds = useMemo(() => ({
    "CCS Student Council": "20575c31-893e-47ba-9727-2e1c1c0500dd",
    "ELITES": "c96c96d9-8eef-4914-ae18-89bbee67c97e",
    "SPECS": "0aed0089-e798-48ee-bdfc-1ff32edb11d6",
    "IMAGES": "5bd13196-8ce6-474d-b260-7c00297f306b"
  }), []);

  const organizationHelpers = useMemo(() => ({
    getProgramFullName: (programCode) => {
      const programs = {
        "BSIT": "Bachelor of Science in Information Technology",
        "BSCS": "Bachelor of Science in Computer Science",
        "BSEMC": "Bachelor of Science in Entertainment and Multimedia Computing"
      };
      return programs[programCode] || programCode;
    },
    
    getOrgGradient: (name) => {
      const gradients = {
        "CCS Student Council": "from-blue-100 to-gray-100",
        "ELITES": "from-purple-100 to-gray-100",
        "SPECS": "from-green-100 to-gray-100",
        "IMAGES": "from-orange-100 to-gray-100"
      };
      return gradients[name] || "from-gray-100 to-gray-100";
    },
    
    getOrgBorderColor: (name) => {
      const colors = {
        "CCS Student Council": "border-blue-600",
        "ELITES": "border-purple-600",
        "SPECS": "border-green-600",
        "IMAGES": "border-orange-600"
      };
      return colors[name] || "border-gray-600";
    },
    
    getOrganizationLogo: (name) => {
      const logos = {
        "CCS Student Council": "/assets/STUDENT-COUNCIL.jpg",
        "ELITES": "/assets/ELITES.jpg",
        "SPECS": "/assets/SPECS.jpg",
        "IMAGES": "/assets/IMAGES.jpg"
      };
      return logos[name] || "/assets/default-org.jpg";
    },
    
    getOrganizationDescription: (name) => {
      const descriptions = {
        "CCS Student Council": "Founded in 2013, Gordon College CCS Student Council is a recognized Student Society on Information Technology, Computer Science, and Entertainment and Multimedia Computing.",
        "ELITES": "Founded in 2022, GCCCS ELITES (Empowered League of Information Technology Education Students) represents the collective voice of IT students at Gordon College.",
        "SPECS": "Society of Programmers and Enthusiasts in Computer Science (SPECS) is the official organization for BSCS students at Gordon College.",
        "IMAGES": "Interactive Media and Graphics Enthusiasts Society (IMAGES) serves as the premier organization for BSEMC students at Gordon College."
      };
      return descriptions[name] || "Student organization at Gordon College.";
    }
  }), []);

  // Cached fetch function
  const cachedFetch = useCallback(async (url, options = {}) => {
    const cacheKey = `${url}-${JSON.stringify(options)}`;
    const cached = apiCache.current.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          ...options.headers
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Cache successful responses
      apiCache.current.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      
      return data;
    } catch (error) {
      console.error(`Error fetching ${url}:`, error);
      throw error;
    }
  }, []);

  // Debounced resize handler
  useEffect(() => {
    let timeoutId;
    
    const debouncedHandleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsMobile(window.innerWidth < 768);
      }, 150);
    };
    
    window.addEventListener('resize', debouncedHandleResize);
    return () => {
      window.removeEventListener('resize', debouncedHandleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  // Optimized election data fetching
  const fetchElectionData = useCallback(async (program, studentId) => {
    try {
      setElectionsLoading(true);
      
      // Fetch organizations data
      const organizationsData = await cachedFetch('http://localhost:8000/api/v1/organizations');
      
      // Create elections with basic data first (for immediate display)
      const elections = organizationsData.map(org => {
        const eligiblePrograms = getEligiblePrograms(org.name);
        const endTime = org.end_time ? new Date(org.end_time) : null;
        
        return {
          id: organizationIds[org.name] || "unknown",
          code: org.name.toLowerCase().replace(/\s+/g, '-'),
          name: org.name,
          logo: organizationHelpers.getOrganizationLogo(org.name),
          description: organizationHelpers.getOrganizationDescription(org.name),
          endTime: endTime,
          bgGradient: organizationHelpers.getOrgGradient(org.name),
          borderColor: organizationHelpers.getOrgBorderColor(org.name),
          forPrograms: eligiblePrograms,
          status: org.status || "not_started",
          hasVoted: false, // Will be updated asynchronously
          loadingVoteStatus: true // Loading indicator for vote status
        };
      });
      
      // Filter based on program immediately
      const filtered = elections.filter(election => {
        return election.name === "CCS Student Council" || 
               election.forPrograms.includes(program);
      });
      
      // Set filtered elections immediately for fast display
      setFilteredElections(filtered);
      setElectionsLoading(false);
      
      // Fetch additional data asynchronously
      setVoteStatusLoading(true);
      
      try {
        const [electionIds, voteStatuses] = await Promise.all([
          fetchElectionIds(filtered),
          fetchVoteStatus(filtered, studentId)
        ]);
        
        setDbElectionIds(electionIds);
        
        // Update elections with vote status
        setFilteredElections(prevElections => 
          prevElections.map(election => ({
            ...election,
            hasVoted: voteStatuses[election.id] || false,
            loadingVoteStatus: false
          }))
        );
      } catch (error) {
        console.error("Error fetching additional election data:", error);
        // Update loading status even if fetch fails
        setFilteredElections(prevElections => 
          prevElections.map(election => ({
            ...election,
            loadingVoteStatus: false
          }))
        );
      } finally {
        setVoteStatusLoading(false);
      }
      
    } catch (error) {
      console.error("Error fetching election data:", error);
      setFilteredElections([]);
      setElectionsLoading(false);
      setVoteStatusLoading(false);
      throw error;
    }
  }, [cachedFetch, organizationIds, organizationHelpers]);

  // Helper function to get eligible programs
  const getEligiblePrograms = useCallback((orgName) => {
    const programMap = {
      "CCS Student Council": ["BSIT", "BSCS", "BSEMC"],
      "ELITES": ["BSIT"],
      "SPECS": ["BSCS"],
      "IMAGES": ["BSEMC"]
    };
    return programMap[orgName] || [];
  }, []);

  // Separate function to fetch election IDs
  const fetchElectionIds = useCallback(async (elections) => {
    const electionIds = {};
    
    // Use Promise.allSettled to continue even if some fail
    const promises = elections.map(async (election) => {
      try {
        const statusData = await cachedFetch(
          `http://localhost:8000/api/v1/elections/status/${encodeURIComponent(election.name)}`
        );
        if (statusData.election_id) {
          electionIds[election.id] = statusData.election_id;
        }
      } catch (error) {
        console.error(`Error getting election ID for ${election.name}:`, error);
      }
    });
    
    await Promise.allSettled(promises);
    return electionIds;
  }, [cachedFetch]);

  // Separate function to fetch vote status
  const fetchVoteStatus = useCallback(async (elections, studentId) => {
    if (!studentId) return {};
    
    const voteStatuses = {};
    
    // Check vote status for each election
    const promises = elections.map(async (election) => {
      try {
        // First get the election ID
        const statusData = await cachedFetch(
          `http://localhost:8000/api/v1/elections/status/${encodeURIComponent(election.name)}`
        );
        
        if (statusData.election_id) {
          const voteData = await cachedFetch(
            `http://localhost:8000/api/v1/votes/check-voted?election_id=${statusData.election_id}&student_id=${studentId}`
          );
          voteStatuses[election.id] = voteData.has_voted || false;
        }
      } catch (error) {
        console.error(`Error checking vote status for ${election.name}:`, error);
        voteStatuses[election.id] = false;
      }
    });
    
    await Promise.allSettled(promises);
    return voteStatuses;
  }, [cachedFetch]);

  // Optimized user data fetching with parallel loading
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        
        // Fetch user data
        const userData = await cachedFetch('http://localhost:8000/api/v1/students/me');
        
        // Update student info immediately
        const enhancedUserData = {
          ...userData,
          programFull: organizationHelpers.getProgramFullName(userData.program)
        };
        setStudentInfo(enhancedUserData);
        setLoading(false);
        
        // Fetch election data asynchronously
        await fetchElectionData(userData.program, userData.id);
        
      } catch (error) {
        console.error("Error fetching user data:", error);
        setError("Failed to load your profile. Please refresh the page.");
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [cachedFetch, organizationHelpers.getProgramFullName, fetchElectionData]);

  // Optimized timer updates - only when needed
  useEffect(() => {
    let intervalId;
    
    const hasOngoingElections = filteredElections.some(election => 
      election.status === "ongoing" && election.endTime
    );
    
    if (hasOngoingElections && !loading) {
      intervalId = setInterval(() => {
        const philippinesTime = getPhilippinesTime();
        setCurrentTime(philippinesTime);
        
        // Check if any elections have ended
        setFilteredElections(prevElections => {
          let hasChanges = false;
          const updatedElections = prevElections.map(election => {
            if (election.status === "ongoing" && election.endTime && philippinesTime >= election.endTime) {
              hasChanges = true;
              return { ...election, status: "finished" };
            }
            return election;
          });
          
          return hasChanges ? updatedElections : prevElections;
        });
      }, 1000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [filteredElections, loading, getPhilippinesTime]);

  // Memoized time calculations
  const timeHelpers = useMemo(() => ({
    getRemainingTime: (endTime) => {
      const philippinesTime = getPhilippinesTime();
      const timeDiff = endTime - philippinesTime;
      
      if (timeDiff <= 0) return "Voting has ended";
      
      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
      
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} remaining`;
    },
    
    getFormattedDate: (date) => {
      return new Date(date.toLocaleString("en-US", {timeZone: "Asia/Manila"})).toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
        timeZone: 'Asia/Manila'
      });
    }
  }), [getPhilippinesTime]);

  // Animate cards on initial load
  useEffect(() => {
    if (!electionsLoading && filteredElections.length > 0) {
      const timer = setTimeout(() => {
        setAnimatedCards(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [electionsLoading, filteredElections.length]);

  // Preload images
  useEffect(() => {
    if (filteredElections.length > 0) {
      filteredElections.forEach(election => {
        if (election.logo) {
          const img = new Image();
          img.src = election.logo;
        }
      });
    }
  }, [filteredElections]);

  // Event handlers
  const handleStartVoting = useCallback((electionCode) => {
    const election = filteredElections.find(e => e.code === electionCode);
    
    if (election?.hasVoted) {
      alert("You have already voted in this election. You cannot vote again.");
      return;
    }
    
    if (election?.status !== "ongoing") {
      alert("This election is not currently active for voting.");
      return;
    }
    
    navigate(`/voting-interface/${electionCode}`);
  }, [filteredElections, navigate]);

  const handleViewReceipt = useCallback(async (electionId, dbElectionId) => {
    try {
      const actualElectionId = dbElectionId || dbElectionIds[electionId];
      
      if (!actualElectionId) {
        alert("Receipt information unavailable. This might happen if the election data is still being processed. Please try again later.");
        return;
      }
      
      setLoadingReceipt(true);
      setShowReceiptModal(true);
      
      const data = await cachedFetch(
        `http://localhost:8000/api/v1/votes/receipt?election_id=${actualElectionId}&student_id=${studentInfo.id}`
      );
      
      const election = filteredElections.find(e => e.id === electionId);
      
      if (!election) {
        throw new Error('Election details not found');
      }
      
      // Process image URLs
      if (data.votes) {
        data.votes.forEach((vote) => {
          if (vote.candidate_image) {
            vote.candidate_image = processImageUrl(vote.candidate_image);
          }
        });
      }
      
      setReceiptData({
        election: election,
        votes: data.votes || [],
        votedAt: data.voted_at || new Date().toISOString(),
        status: election.status
      });
    } catch (error) {
      alert(`Could not load your vote receipt: ${error.message}`);
      setShowReceiptModal(false);
    } finally {
      setLoadingReceipt(false);
    }
  }, [dbElectionIds, studentInfo?.id, filteredElections, cachedFetch]);

  // Helper function to process image URLs
  const processImageUrl = useCallback((imagePath) => {
    if (!imagePath) return null;
    
    const cleanPath = imagePath.trim();
    
    if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
      return cleanPath;
    } else if (cleanPath.startsWith('assets/')) {
      return '/' + cleanPath;
    } else if (!cleanPath.includes('/')) {
      return '/assets/candidates/' + cleanPath;
    } else if (!cleanPath.startsWith('/')) {
      return '/' + cleanPath;
    }
    
    return cleanPath;
  }, []);

  // Memoized sorted receipt votes
  const sortedReceiptVotes = useMemo(() => {
    if (!receiptData?.votes) return [];
    
    const positionOrder = {
      'PRESIDENT': 1, 'VICE PRESIDENT': 2, 'SECRETARY': 3, 'TREASURER': 4,
      'AUDITOR': 5, 'BUSINESS MANAGER': 6, 'P.R.O': 7, 'PRO': 7,
      'PUBLIC RELATIONS OFFICER': 7, 'SENATOR': 8, 'REPRESENTATIVE': 9,
      'GOVERNOR': 10, 'COUNCILOR': 11, 'SERGEANT AT ARMS': 12,
      'MUSE': 13, 'ESCORT': 14
    };
    
    return [...receiptData.votes].sort((a, b) => {
      const orderA = positionOrder[a.position.toUpperCase()] || 999;
      const orderB = positionOrder[b.position.toUpperCase()] || 999;
      
      if (orderA === orderB) {
        return a.position.localeCompare(b.position);
      }
      
      return orderA - orderB;
    });
  }, [receiptData]);

  // Modal event handlers
  const handleOpenInstructionsModal = useCallback((e) => {
    e.preventDefault();
    setShowInstructionsModal(true);
  }, []);

  // Main loading screen with enhanced skeleton
  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <div className="p-3 sm:p-5">
          {/* Skeleton Welcome Banner */}
          <div className="bg-gradient-to-r from-orange-100 to-gray-100 p-4 sm:p-6 rounded-xl shadow-md border border-gray-200 mb-4 sm:mb-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-orange-300"></div>
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
            <div className="absolute bottom-0 right-0 opacity-10">
              <FaVoteYea size={80} className="text-gray-400" />
            </div>
          </div>
          
          {/* Skeleton Elections Header */}
          <div className="flex items-center mb-4">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-48"></div>
            </div>
          </div>
          
          {/* Skeleton Elections Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          
          {/* Loading indicator */}
          <div className="mt-8 text-center">
            <LoadingDots text="Loading your dashboard" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-6 max-w-md w-full text-center">
          <FaExclamationTriangle className="text-red-500 text-4xl mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Add shimmer animation CSS */}
      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
      
      {/* Main Content */}
      <div className="p-3 sm:p-5">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-orange-100 to-gray-100 p-4 sm:p-6 rounded-xl shadow-md border border-gray-200 mb-4 sm:mb-6 transform transition-all duration-500 ease-in-out relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-orange-300"></div>
          <div className="relative z-10">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-800 mb-1 sm:mb-2 flex items-center">
              Welcome, <span className="text-orange-600 ml-1">{studentInfo?.fullName}!</span>
            </h1>
            {isMobile ? (
              <>
                <p className="text-xs text-gray-600 font-medium">
                  {studentInfo?.programFull}
                </p>
                <p className="text-xs text-gray-600">
                  {studentInfo?.year_level} • ID: {studentInfo?.student_no}
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-600">
                <span className="font-medium">{studentInfo?.programFull}</span> • {studentInfo?.year_level} • ID: {studentInfo?.student_no}
              </p>
            )}
          </div>
          <div className="absolute bottom-0 right-0 opacity-10">
            <FaVoteYea size={isMobile ? 80 : 120} className="text-orange-600" />
          </div>
        </div>

        <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4 flex items-center">
          <FaVoteYea className="mr-2 text-orange-600" /> Available Elections
          {electionsLoading && (
            <FaSpinner className="ml-2 animate-spin text-orange-500 text-sm" />
          )}
        </h2>
        
        {/* Show loading state for elections */}
        {electionsLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {[1, 2].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filteredElections.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-200">
            <FaInfoCircle className="text-orange-500 text-3xl mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">No Elections Available</h3>
            <p className="text-sm text-gray-600">There are currently no active elections available for your program.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {filteredElections.map((election, index) => (
                <div 
                  key={election.id}
                  className={`card bg-white rounded-xl shadow-sm hover:shadow-lg border border-gray-200 transition-all duration-300 h-full transform ${
                    animatedCards ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
                  } group overflow-hidden`}
                  style={{ transitionDelay: `${index * 150}ms` }}
                >
                  <div className={`flex items-center justify-between p-4 sm:p-5 bg-gradient-to-r ${election.bgGradient} rounded-t-xl relative`}>
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/0 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="flex items-center relative z-10">
                      <div className={`w-12 h-12 sm:w-16 sm:h-16 md:w-18 md:h-18 rounded-full overflow-hidden border-3 sm:border-4 ${election.borderColor} mr-3 sm:mr-4 shadow-md group-hover:shadow-lg transition-all`}>
                        <img
                          src={election.logo}
                          alt={election.name}
                          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "/assets/default-org.jpg";
                          }}
                        />
                      </div>
                      <div>
                        <h3 className="text-base sm:text-xl font-bold text-gray-800 group-hover:text-gray-900 transition-colors">{election.name}</h3>
                        <div className="flex items-center mt-1">
                          {election.status === "ongoing" && (
                            <span className="bg-green-500 text-white text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded-full flex items-center">
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-white mr-1 animate-pulse"></span>
                              Ongoing
                            </span>
                          )}
                          {election.status === "not_started" && (
                            <span className="bg-gray-500 text-white text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded-full flex items-center">
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-white mr-1"></span>
                              Not Yet Started
                            </span>
                          )}
                          {election.status === "finished" && (
                            <span className="bg-blue-500 text-white text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded-full flex items-center">
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-white mr-1"></span>
                              Finished
                            </span>
                          )}
                          {election.status === "ongoing" && election.endTime && (
                            <span className="text-[10px] sm:text-xs text-gray-500 ml-2">
                              Ends: {timeHelpers.getFormattedDate(election.endTime)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 sm:p-5 flex flex-col">
                    <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-2">
                      {election.description}
                    </p>
                    
                    {election.status === "ongoing" && election.endTime && (
                      <div className="bg-gray-50 p-3 rounded-lg mb-4 sm:mb-5 border border-gray-100">
                        <h4 className="text-[10px] sm:text-xs text-gray-500 mb-1.5 flex items-center">
                          <FaClock className="mr-1.5 text-orange-500" /> TIME REMAINING
                        </h4>
                        <div className="flex items-center justify-center">
                          <div className="inline-flex bg-white px-3 py-2 rounded-lg border border-orange-100 shadow-sm">
                            <span className="text-sm sm:text-base font-medium text-orange-600 tracking-wider animate-pulse-subtle">
                              {timeHelpers.getRemainingTime(election.endTime)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {(election.status !== "ongoing" || election.hasVoted) && (
                      <div className="bg-gray-50 p-3 rounded-lg mb-4 sm:mb-5 border border-gray-100">
                        <h4 className="text-[10px] sm:text-xs text-gray-500 mb-1.5 flex items-center">
                          <FaInfoCircle className="mr-1.5 text-blue-500" /> STATUS
                        </h4>
                        <div className="flex items-center justify-center">
                          <div className="inline-flex bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
                            {election.loadingVoteStatus ? (
                              <div className="flex items-center">
                                <FaSpinner className="animate-spin text-gray-500 mr-2" />
                                <span className="text-sm text-gray-500">Checking status...</span>
                              </div>
                            ) : (
                              <span className="text-sm sm:text-base font-medium text-gray-700">
                                {election.hasVoted && "You have already voted"}
                                {!election.hasVoted && election.status === "not_started" && "Election has not started yet"}
                                {!election.hasVoted && election.status === "finished" && "Election has ended"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-auto">
                      {election.loadingVoteStatus ? (
                        <div className="flex items-center justify-center px-4 sm:px-5 py-2.5 sm:py-3 bg-gray-200 text-gray-500 text-xs sm:text-sm rounded-lg w-full">
                          <FaSpinner className="animate-spin mr-2" />
                          Loading...
                        </div>
                      ) : election.hasVoted ? (
                        <div className="flex flex-col space-y-2">
                          <button
                            disabled
                            className="flex items-center justify-center px-4 sm:px-5 py-2.5 sm:py-3 bg-green-400 text-white text-xs sm:text-sm rounded-lg w-full cursor-not-allowed opacity-75"
                          >
                            <FaCheckCircle className="mr-2" /> Already Voted
                          </button>
                          <button
                            onClick={() => handleViewReceipt(election.id, dbElectionIds[election.id])}
                            className="flex items-center justify-center px-4 sm:px-5 py-1.5 sm:py-2 bg-blue-500 text-white text-xs sm:text-sm rounded-lg hover:bg-blue-600 transition-all w-full shadow-sm hover:shadow-md"
                          >
                            <FaReceipt className="mr-2" /> View Receipt
                          </button>
                        </div>
                      ) : (
                        <>
                          {election.status === "ongoing" && (
                            <button
                              onClick={() => handleStartVoting(election.code)}
                              className="flex items-center justify-center px-4 sm:px-5 py-2.5 sm:py-3 bg-orange-600 text-white text-xs sm:text-sm rounded-lg hover:bg-orange-700 transition-all w-full shadow-sm hover:shadow-md hover:translate-y-[-1px] active:translate-y-[1px]"
                            >
                              <FaVoteYea className="mr-2" /> Start Voting
                            </button>
                          )}
                          
                          {election.status === "not_started" && (
                            <button
                              disabled
                              className="flex items-center justify-center px-4 sm:px-5 py-2.5 sm:py-3 bg-gray-400 text-white text-xs sm:text-sm rounded-lg w-full cursor-not-allowed opacity-75"
                            >
                              <FaInfoCircle className="mr-2" /> Not Yet Started
                            </button>
                          )}
                          
                          {election.status === "finished" && (
                            <button
                              disabled
                              className="flex items-center justify-center px-4 sm:px-5 py-2.5 sm:py-3 bg-red-400 text-white text-xs sm:text-sm rounded-lg w-full cursor-not-allowed opacity-75"
                            >
                              <FaExclamationTriangle className="mr-2" /> Election Ended - Missed
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Vote status loading indicator */}
            {voteStatusLoading && (
              <div className="mt-4 text-center">
                <LoadingDots text="Checking your vote status" />
              </div>
            )}
          </>
        )}

        {/* Information Box */}
        <div className="mt-5 sm:mt-7 p-4 sm:p-5 border border-blue-200 rounded-xl bg-blue-50/70 text-xs sm:text-sm text-gray-700 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 w-1 sm:w-1.5 h-full bg-blue-500"></div>
          <div className="flex items-start">
            <div className="bg-white p-2 sm:p-2.5 rounded-full mr-3 sm:mr-4 shadow-sm border border-blue-100">
              <FaInfoCircle className="text-blue-600 text-sm sm:text-base" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-blue-800 text-sm sm:text-base">Important Information:</p>
              <ul className="list-disc list-inside mt-2 sm:mt-3 space-y-1 sm:space-y-1.5 text-xs sm:text-sm text-blue-700">
                <li>You can only vote once for each election. Your choices cannot be changed after submission.</li>
                <li>Make sure to review your selections carefully before finalizing your ballot.</li>
                <li>You must vote for all available positions to submit your ballot.</li>
              </ul>
              
              <div className="mt-3 sm:mt-4 flex items-center">
                <a 
                  href="#" 
                  onClick={handleOpenInstructionsModal}
                  className="text-blue-600 hover:text-blue-800 flex items-center font-medium text-xs sm:text-sm bg-white px-3 py-1.5 rounded-lg shadow-sm border border-blue-100 hover:bg-blue-50 transition-colors"
                >
                  View Voting Instructions <FaChevronRight className="ml-1.5 text-[10px] sm:text-xs" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modals - keeping existing modal code */}
      {/* Instructions Modal */}
      {showInstructionsModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center z-50 animate-fadeIn">
          <div 
            ref={modalRef}
            className="bg-white rounded-xl shadow-xl max-w-2xl w-11/12 md:w-3/4 lg:w-2/3 animate-scaleIn m-3 max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="p-4 sm:p-5 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center">
                <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <FaRegListAlt className="text-blue-600" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-800">Voting Instructions</h3>
              </div>
              <button 
                onClick={() => setShowInstructionsModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
              >
                <FaTimes className="text-gray-500" />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              <div className="prose prose-sm max-w-none">
                <h4 className="text-gray-800 font-medium mb-3 flex items-center">
                  <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center mr-2 text-xs">1</span> 
                  Before You Vote
                </h4>
                <ul className="mb-4 text-gray-700 space-y-2">
                  <li className="flex items-start">
                    <FaCheckCircle className="text-green-500 mt-1 mr-2 flex-shrink-0" /> Ensure you are using a stable internet connection to avoid disruptions.
                  </li>
                  <li className="flex items-start">
                    <FaCheckCircle className="text-green-500 mt-1 mr-2 flex-shrink-0" /> Familiarize yourself with the candidates and their platforms before starting.
                  </li>
                  <li className="flex items-start">
                    <FaCheckCircle className="text-green-500 mt-1 mr-2 flex-shrink-0" /> Make sure you have enough time to complete the voting process without interruption.
                  </li>
                </ul>

                <h4 className="text-gray-800 font-medium mb-3 flex items-center">
                  <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center mr-2 text-xs">2</span> 
                  Voting Process
                </h4>
                <ul className="mb-4 text-gray-700 space-y-2">
                  <li className="flex items-start">
                    <FaCheckCircle className="text-green-500 mt-1 mr-2 flex-shrink-0" /> Click the "Start Voting" button for the election you wish to participate in.
                  </li>
                  <li className="flex items-start">
                    <FaCheckCircle className="text-green-500 mt-1 mr-2 flex-shrink-0" /> For each position, select one candidate by clicking on their card.
                  </li>
                  <li className="flex items-start">
                    <FaCheckCircle className="text-green-500 mt-1 mr-2 flex-shrink-0" /> You must select a candidate for every position to proceed.
                  </li>
                  <li className="flex items-start">
                    <FaCheckCircle className="text-green-500 mt-1 mr-2 flex-shrink-0" /> Review your selections carefully on the summary page.
                  </li>
                  <li className="flex items-start">
                    <FaCheckCircle className="text-green-500 mt-1 mr-2 flex-shrink-0" /> Submit your ballot by clicking the "Submit Vote" button.
                  </li>
                </ul>

                <h4 className="text-gray-800 font-medium mb-3 flex items-center">
                  <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center mr-2 text-xs">3</span> 
                  After Voting
                </h4>
                <ul className="mb-4 text-gray-700 space-y-2">
                  <li className="flex items-start">
                    <FaCheckCircle className="text-green-500 mt-1 mr-2 flex-shrink-0" /> You will receive a confirmation that your vote has been recorded.
                  </li>
                  <li className="flex items-start">
                    <FaCheckCircle className="text-green-500 mt-1 mr-2 flex-shrink-0" /> You can view your submitted ballot, but you cannot change your votes.
                  </li>
                  <li className="flex items-start">
                    <FaCheckCircle className="text-green-500 mt-1 mr-2 flex-shrink-0" /> Election results will be published after the voting period ends.
                  </li>
                </ul>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4 mt-4">
                  <div className="flex items-start">
                    <FaExclamationTriangle className="text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <p className="text-yellow-800 font-medium mb-1">Important Notes:</p>
                      <p className="text-yellow-700 text-sm">Once you submit your ballot, your votes cannot be changed or revoked. Please ensure you review your selections carefully before submission.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 sm:p-5 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowInstructionsModal(false)}
                className="px-4 sm:px-6 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                Got it, thanks!
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Vote Receipt Modal */}
      {showReceiptModal && receiptData && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-11/12 animate-scaleIn m-3 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 text-center border-b border-dashed border-gray-300">
              <div className="flex items-center justify-center mb-2">
                <FaReceipt className="text-gray-600 text-xl mr-2" />
                <h3 className="text-lg font-bold text-gray-800">VOTE RECEIPT</h3>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p className="font-semibold">{receiptData.election.name.toUpperCase()}</p>
                <p>Election Receipt</p>
                <p className="text-xs">
                  Date: {new Date(receiptData.votedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    timeZone: 'Asia/Manila'
                  })}
                </p>
              </div>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 font-mono text-sm">
              {loadingReceipt ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <FaSpinner className="animate-spin text-blue-500 text-2xl mb-4" />
                  <LoadingDots text="Loading your receipt" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="border-b border-dashed border-gray-300 pb-2">
                    <p className="text-center text-xs text-gray-500 uppercase tracking-wider">
                      Your Votes
                    </p>
                  </div>
                  
                  {sortedReceiptVotes.map((vote, index) => (
                    <div key={index} className="border-b border-dotted border-gray-200 pb-3 mb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800 text-xs uppercase tracking-wide">
                            {vote.position}
                          </p>
                          <p className="text-gray-700 mt-1 break-words">
                            {vote.candidate_name}
                          </p>
                        </div>
                        <div className="ml-2 text-right">
                          <span className="text-green-600 font-bold">✓</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {sortedReceiptVotes.length === 0 && (
                    <div className="text-center py-6 text-gray-500">
                      <FaExclamationTriangle className="mx-auto text-yellow-500 text-xl mb-2" />
                      <p className="text-sm">No votes recorded</p>
                    </div>
                  )}
                  
                  <div className="border-t border-double border-gray-400 pt-3 mt-4">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>TOTAL POSITIONS:</span>
                      <span>{sortedReceiptVotes.length}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-600 mt-1">
                      <span>STATUS:</span>
                      <span className="font-semibold text-green-600">COMPLETED</span>
                    </div>
                  </div>
                  
                  <div className="border-t border-dashed border-gray-300 pt-3 mt-4 text-center">
                    <p className="text-xs text-gray-500 leading-relaxed">
                      *** OFFICIAL VOTING RECEIPT ***<br/>
                      Your vote has been recorded securely.<br/>
                      This receipt is for your records only.<br/>
                      Changes cannot be made after submission.
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-3 border-t border-dashed border-gray-300 bg-gray-50 text-center">
              <p className="text-xs text-gray-500 mb-3">
                Thank you for participating in the election!
              </p>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="px-6 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoterDashboard;