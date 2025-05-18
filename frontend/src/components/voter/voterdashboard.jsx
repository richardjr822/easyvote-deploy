import React, { useState, useEffect, useRef } from "react";
import { 
  FaVoteYea, FaInfoCircle, FaClock, FaChevronRight, 
  FaRegListAlt, FaTimes, FaExclamationTriangle, FaCheckCircle,
  FaSpinner, FaReceipt
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const VoterDashboard = () => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [animatedCards, setAnimatedCards] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipContent, setTooltipContent] = useState("");
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [studentInfo, setStudentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filteredElections, setFilteredElections] = useState([]);
  const [error, setError] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const [dbElectionIds, setDbElectionIds] = useState({});
  const modalRef = useRef(null);
  
  // Check if mobile on resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Fetch student info from API
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        
        // Real API call to fetch the current user's data
        const response = await fetch('http://localhost:8000/api/v1/students/me', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }
        
        const userData = await response.json();
        
        // Add full program name to userData
        const programFullName = getProgramFullName(userData.program);
        const enhancedUserData = {
          ...userData,
          programFull: programFullName
        };
        
        setStudentInfo(enhancedUserData);
        
        // After getting student info, fetch real election data
        await fetchElectionData(userData.program);
        setLoading(false);
        
      } catch (error) {
        console.error("Error fetching user data:", error);
        setError("Failed to load your profile. Please refresh the page.");
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, []);
  
  // Add this function to convert program code to full name
  const getProgramFullName = (programCode) => {
    switch(programCode) {
      case "BSIT":
        return "Bachelor of Science in Information Technology";
      case "BSCS":
        return "Bachelor of Science in Computer Science";
      case "BSEMC":
        return "Bachelor of Science in Entertainment and Multimedia Computing";
      default:
        return programCode;
    }
  };
  
  // Organizations information with their IDs
  const organizationIds = {
    "CCS Student Council": "20575c31-893e-47ba-9727-2e1c1c0500dd",
    "ELITES": "c96c96d9-8eef-4914-ae18-89bbee67c97e",
    "SPECS": "0aed0089-e798-48ee-bdfc-1ff32edb11d6",
    "IMAGES": "5bd13196-8ce6-474d-b260-7c00297f306b"
  };
  
  // All available elections
  const allElections = [
    {
      id: organizationIds["CCS Student Council"],
      code: "ccs-student-council",
      name: "CCS Student Council",
      logo: "/assets/STUDENT-COUNCIL.jpg",
      description: "Founded in 2013, Gordon College CCS Student Council is a recognized Student Society on Information Technology, Computer Science, and Entertainment and Multimedia Computing.",
      endTime: (() => {
        const date = new Date();
        date.setHours(date.getHours() + 8);
        return date;
      })(),
      bgGradient: "from-blue-100 to-gray-100",
      borderColor: "border-blue-600",
      forPrograms: ["ALL", "BSIT", "BSCS", "BSEMC"] // Available for all programs
    },
    {
      id: organizationIds["ELITES"],
      code: "elites",
      name: "ELITES",
      logo: "/assets/ELITES.jpg",
      description: "Founded in 2022, GCCCS ELITES (Empowered League of Information Technology Education Students) represents the collective voice of IT students at Gordon College.",
      endTime: (() => {
        const date = new Date();
        date.setHours(date.getHours() + 8);
        return date;
      })(),
      bgGradient: "from-purple-100 to-gray-100",
      borderColor: "border-purple-600",
      forPrograms: ["BSIT"] // Only for BSIT students
    },
    {
      id: organizationIds["SPECS"],
      code: "specs",
      name: "SPECS",
      logo: "/assets/SPECS.jpg",
      description: "Society of Programmers and Enthusiasts in Computer Science (SPECS) is the official organization for BSCS students at Gordon College.",
      endTime: (() => {
        const date = new Date();
        date.setHours(date.getHours() + 8);
        return date;
      })(),
      bgGradient: "from-green-100 to-gray-100",
      borderColor: "border-green-600",
      forPrograms: ["BSCS"] // Only for BSCS students
    },
    {
      id: organizationIds["IMAGES"],
      code: "images",
      name: "IMAGES",
      logo: "/assets/IMAGES.jpg",
      description: "Interactive Media and Graphics Enthusiasts Society (IMAGES) serves as the premier organization for BSEMC students at Gordon College.",
      endTime: (() => {
        const date = new Date();
        date.setHours(date.getHours() + 8);
        return date;
      })(),
      bgGradient: "from-orange-100 to-gray-100",
      borderColor: "border-orange-600",
      forPrograms: ["BSEMC"] // Only for BSEMC students
    }
  ];
  
  // Function to filter elections based on program
  const filterElectionsByProgram = (program) => {
    const filtered = allElections.filter(election => 
      election.forPrograms.includes("ALL") || election.forPrograms.includes(program)
    );
    setFilteredElections(filtered);
  };
  
  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  
  // Animate cards on initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedCards(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setShowInstructionsModal(false);
      }
    };
    
    if (showInstructionsModal) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showInstructionsModal]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showInstructionsModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [showInstructionsModal]);

  // Function to navigate to voting interface
  const handleStartVoting = (electionId) => {
    // Log the navigation for debugging
    console.log(`Navigating to voting interface for election: ${electionId}`);
    
    // Make sure the election ID is valid
    if (!electionId) {
      console.error("Invalid election ID");
      return;
    }
    
    // Navigate to the voting interface with the election ID
    navigate(`/voting-interface/${electionId}`);
  };

  // 2. Add function to fetch real election data
  const fetchElectionData = async (program) => {
    try {
      // Fetch actual election status for each organization
      const response = await fetch('http://localhost:8000/api/v1/organizations', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch election data');
      }
      
      const organizationsData = await response.json();
      console.log("Organizations data:", organizationsData);
      
      // Create election cards with real data
      const realElections = [];
      
      // Map the organization data to our election format
      organizationsData.forEach(org => {
        // Only include ongoing elections
        if (org.status !== "ongoing") return;
        
        // Define which program can see which org election
        let eligiblePrograms = [];
        
        // CCS Student Council is visible to all programs
        if (org.name === "CCS Student Council") {
          eligiblePrograms = ["BSIT", "BSCS", "BSEMC"];
        } 
        // Program-specific organizations
        else if (org.name === "ELITES") {
          eligiblePrograms = ["BSIT"];
        } 
        else if (org.name === "SPECS") {
          eligiblePrograms = ["BSCS"];
        } 
        else if (org.name === "IMAGES") {
          eligiblePrograms = ["BSEMC"];
        }
        
        // Create election object
        const election = {
          id: organizationIds[org.name] || "unknown",
          code: org.name.toLowerCase().replace(/\s+/g, '-'),
          name: org.name,
          logo: getOrganizationLogo(org.name),
          description: getOrganizationDescription(org.name),
          // Use real end time or fallback
          endTime: org.end_time ? new Date(org.end_time) : addHours(new Date(), org.duration_hours || 8),
          bgGradient: getOrgGradient(org.name),
          borderColor: getOrgBorderColor(org.name),
          forPrograms: eligiblePrograms,
          status: org.status,
          hasVoted: false // Initialize as false initially
        };
        
        realElections.push(election);
      });
      
      // If no real election data is available, show "No Elections Available" message
      if (realElections.length === 0) {
        console.log("No active elections found, showing empty state");
        // Set to empty array to show the "No Elections Available" message
        setFilteredElections([]);
        return;
      }
      
      // Filter the real elections based on program
      const filtered = realElections.filter(election => {
        // Always show CCS Student Council to everyone
        if (election.name === "CCS Student Council") {
          return true;
        }
        
        // Show program-specific organizations
        return election.forPrograms.includes(program);
      });
      
      console.log("Filtered elections for program", program, ":", filtered);
      
      // IMPORTANT: Set filtered elections first with hasVoted=false for all
      setFilteredElections(filtered);
      
      // Then check if student has voted in a separate process
      if (filtered.length > 0 && studentInfo?.id) {
        const checkVoteStatuses = async () => {
          try {
            const votedElectionsIds = [];
            const dbElectionIds = {};
            
            // First get all election DB IDs in parallel
            const statusPromises = filtered.map(election => 
              fetch(`http://localhost:8000/api/v1/elections/status/${election.name}`, {
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
              })
              .then(response => {
                if (!response.ok) return null;
                return response.json();
              })
              .then(data => {
                if (data && data.election_id) {
                  dbElectionIds[election.id] = data.election_id;
                }
                return data;
              })
              .catch(err => {
                console.error(`Error getting election status for ${election.name}:`, err);
                return null;
              })
            );
            
            await Promise.all(statusPromises);
            setDbElectionIds(dbElectionIds);
            
            // Then check which elections the student has voted for
            const voteCheckPromises = Object.entries(dbElectionIds).map(([electionId, dbId]) => 
              fetch(`http://localhost:8000/api/v1/votes/check-voted?election_id=${dbId}&student_id=${studentInfo.id}`, {
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
              })
              .then(response => {
                if (!response.ok) return { electionId, hasVoted: false };
                return response.json().then(data => ({ electionId, hasVoted: data.has_voted }));
              })
              .catch(err => {
                console.error(`Error checking vote status:`, err);
                return { electionId, hasVoted: false };
              })
            );
            
            const voteResults = await Promise.all(voteCheckPromises);
            
            // Collect IDs of elections where student has voted
            voteResults.forEach(result => {
              if (result.hasVoted) {
                votedElectionsIds.push(result.electionId);
              }
            });
            
            console.log("Elections where student has voted:", votedElectionsIds);
            
            // Update the state in a single call with the new hasVoted flags
            setFilteredElections(prevElections => {
              // First create a basic update using API results
              const baseUpdate = prevElections.map(election => ({
                ...election,
                hasVoted: votedElectionsIds.includes(election.id)
              }));
              
              // Then check localStorage as a backup for each election
              return baseUpdate.map(election => {
                // If already marked as voted via API, keep it that way
                if (election.hasVoted) return election;
                
                // Check localStorage as backup
                const hasVotedLocal = localStorage.getItem(`voted_${election.code}`) === 'true';
                return { 
                  ...election, 
                  hasVoted: hasVotedLocal
                };
              });
            });

            // Additional check from localStorage for vote status (backup)
            const updatedWithLocalStorage = prevElections.map(election => {
              // First check API result
              if (votedElectionsIds.includes(election.id)) {
                return { ...election, hasVoted: true };
              }
              
              // Then check localStorage as backup
              const hasVotedLocal = localStorage.getItem(`voted_${election.code}`) === 'true';
              return { 
                ...election, 
                hasVoted: hasVotedLocal || election.hasVoted || false 
              };
            });
            
            return updatedWithLocalStorage;
          } catch (error) {
            console.error("Error checking voted elections:", error);
          }
        };
        
        // CRITICAL FIX: Actually call the function
        checkVoteStatuses();
      }
    } catch (error) {
      console.error("Error fetching election data:", error);
      setFilteredElections([]);
    }
  };

  // Helper function to add hours to date
  const addHours = (date, hours) => {
    const newDate = new Date(date);
    newDate.setHours(newDate.getHours() + hours);
    return newDate;
  };

  // Helper function for org gradients
  const getOrgGradient = (name) => {
    switch(name) {
      case "CCS Student Council": return "from-blue-100 to-gray-100";
      case "ELITES": return "from-purple-100 to-gray-100";
      case "SPECS": return "from-green-100 to-gray-100";
      case "IMAGES": return "from-orange-100 to-gray-100";
      default: return "from-gray-100 to-gray-100";
    }
  };

  // Helper function for org border colors
  const getOrgBorderColor = (name) => {
    switch(name) {
      case "CCS Student Council": return "border-blue-600";
      case "ELITES": return "border-purple-600";
      case "SPECS": return "border-green-600";
      case "IMAGES": return "border-orange-600";
      default: return "border-gray-600";
    }
  };

  // Helper function for org descriptions
  const getOrganizationDescription = (name) => {
    switch(name) {
      case "CCS Student Council":
        return "Founded in 2013, Gordon College CCS Student Council is a recognized Student Society on Information Technology, Computer Science, and Entertainment and Multimedia Computing.";
      case "ELITES":
        return "Founded in 2022, GCCCS ELITES (Empowered League of Information Technology Education Students) represents the collective voice of IT students at Gordon College.";
      case "SPECS":
        return "Society of Programmers and Enthusiasts in Computer Science (SPECS) is the official organization for BSCS students at Gordon College.";
      case "IMAGES":
        return "Interactive Media and Graphics Enthusiasts Society (IMAGES) serves as the premier organization for BSEMC students at Gordon College.";
      default:
        return "Student organization at Gordon College.";
    }
  };

  // Helper function for org logos
  const getOrganizationLogo = (name) => {
    switch(name) {
      case "CCS Student Council":
        return "/assets/STUDENT-COUNCIL.jpg";
      case "ELITES":
        return "/assets/ELITES.jpg";
      case "SPECS":
        return "/assets/SPECS.jpg";
      case "IMAGES":
        return "/assets/IMAGES.jpg";
      default:
        return "/assets/default-org.jpg";
    }
  };

  // Update the countdown timer function to get data from the backend
  const getRemainingTime = (endTime) => {
    const timeDiff = endTime - currentTime;
    if (timeDiff <= 0) return "Voting has ended";
    
    // Convert to hours, minutes, seconds
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} remaining`;
  };
  
  // Get formatted date
  const getFormattedDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    });
  };

  // Show tooltip with information about a term
  const handleInfoHover = (e, content) => {
    setTooltipContent(content);
    setTooltipPosition({ x: e.clientX, y: e.clientY });
    setShowTooltip(true);
  };

  // Open instructions modal
  const handleOpenInstructionsModal = (e) => {
    e.preventDefault();
    setShowInstructionsModal(true);
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-orange-500 text-4xl mx-auto mb-4" />
          <p className="text-gray-600">Loading your dashboard...</p>
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

  const handleViewReceipt = async (electionId, dbElectionId) => {
    try {
      // Check if dbElectionId exists
      if (!dbElectionId) {
        console.error(`No database ID found for election ${electionId}`);
        alert("Receipt information unavailable. Please try again later.");
        return;
      }
      
      setLoadingReceipt(true);
      setShowReceiptModal(true);
      
      // Fetch the vote receipt data
      const receiptResponse = await fetch(`http://localhost:8000/api/v1/votes/receipt?election_id=${dbElectionId}&student_id=${studentInfo.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!receiptResponse.ok) {
        throw new Error('Failed to load your vote receipt');
      }
      
      const data = await receiptResponse.json();
      
      // Find the election details
      const election = filteredElections.find(e => e.id === electionId);
      
      // Set the receipt data with election details
      setReceiptData({
        election: election,
        votes: data.votes || []
      });
    } catch (error) {
      console.error("Error fetching vote receipt:", error);
      alert("Could not load your vote receipt. Please try again later.");
    } finally {
      setLoadingReceipt(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Main Content */}
      <div className="p-3 sm:p-5">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-orange-100 to-gray-100 p-4 sm:p-6 rounded-xl shadow-md border border-gray-200 mb-4 sm:mb-6 transform transition-all duration-500 ease-in-out relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-orange-300"></div>
          <div className="relative z-10">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-800 mb-1 sm:mb-2 flex items-center">
              Welcome, <span className="text-orange-600 ml-1">{studentInfo.fullName}!</span>
            </h1>
            {isMobile ? (
              <>
                <p className="text-xs text-gray-600 font-medium">
                  {studentInfo.programFull}
                </p>
                <p className="text-xs text-gray-600">
                  {studentInfo.year_level} • ID: {studentInfo.student_no}
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-600">
                <span className="font-medium">{studentInfo.programFull}</span> • {studentInfo.year_level} • ID: {studentInfo.student_no}
              </p>
            )}
          </div>
          <div className="absolute bottom-0 right-0 opacity-10">
            <FaVoteYea size={isMobile ? 80 : 120} className="text-orange-600" />
          </div>
        </div>

        <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4 flex items-center">
          <FaVoteYea className="mr-2 text-orange-600" /> Available Elections
        </h2>
        
        {filteredElections.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-200">
            <FaInfoCircle className="text-orange-500 text-3xl mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">No Elections Available</h3>
            <p className="text-sm text-gray-600">There are currently no active elections available for your program.</p>
          </div>
        ) : (
          /* Cards Section - Responsive grid */
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
                          console.log(`Failed to load image for ${election.name}`);
                          e.target.onerror = null;
                          e.target.src = "/assets/default-org.jpg"; // Fallback image
                        }}
                      />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-xl font-bold text-gray-800 group-hover:text-gray-900 transition-colors">{election.name}</h3>
                      <div className="flex items-center mt-1">
                        <span className="bg-green-500 text-white text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded-full flex items-center">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-white mr-1 animate-pulse"></span>
                          Ongoing
                        </span>
                        <span className="text-[10px] sm:text-xs text-gray-500 ml-2">
                          Ends: {getFormattedDate(election.endTime)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 sm:p-5 flex flex-col">
                  <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-2">
                    {election.description}
                  </p>
                  
                  {/* Simplified Countdown Timer */}
                  <div className="bg-gray-50 p-3 rounded-lg mb-4 sm:mb-5 border border-gray-100">
                    <h4 className="text-[10px] sm:text-xs text-gray-500 mb-1.5 flex items-center">
                      <FaClock className="mr-1.5 text-orange-500" /> TIME REMAINING
                    </h4>
                    <div className="flex items-center justify-center">
                      <div className="inline-flex bg-white px-3 py-2 rounded-lg border border-orange-100 shadow-sm">
                        <span className="text-sm sm:text-base font-medium text-orange-600 tracking-wider animate-pulse-subtle">
                          {getRemainingTime(election.endTime)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="mt-auto">
                    {election.hasVoted ? (
                      <div className="flex flex-col space-y-2">
                        <button
                          disabled
                          className="flex items-center justify-center px-4 sm:px-5 py-2.5 sm:py-3 bg-gray-400 text-white text-xs sm:text-sm rounded-lg w-full cursor-not-allowed opacity-90"
                          style={{pointerEvents: 'none'}}
                        >
                          <FaCheckCircle className="mr-2" /> Already Voted
                        </button>
                        <button
                          onClick={() => handleViewReceipt(election.id, dbElectionIds[election.id])}
                          className="flex items-center justify-center px-4 sm:px-5 py-1.5 sm:py-2 bg-blue-500 text-white text-xs sm:text-sm rounded-lg hover:bg-blue-600 transition-all w-full"
                        >
                          <FaReceipt className="mr-2" /> View Receipt
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStartVoting(election.code)}
                        className="flex items-center justify-center px-4 sm:px-5 py-2.5 sm:py-3 bg-orange-600 text-white text-xs sm:text-sm rounded-lg hover:bg-orange-700 transition-all w-full shadow-sm hover:shadow-md hover:translate-y-[-1px] active:translate-y-[1px]"
                      >
                        <FaVoteYea className="mr-2" /> Start Voting
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
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
      
      {/* Tooltip */}
      {showTooltip && (
        <div 
          className="fixed bg-gray-900 text-white text-[10px] sm:text-xs rounded-lg py-1.5 px-3 z-50 max-w-xs pointer-events-none shadow-lg"
          style={{ 
            left: `${tooltipPosition.x + 15}px`, 
            top: `${tooltipPosition.y - 20}px`,
            opacity: 0.9
          }}
        >
          {tooltipContent}
          <div className="absolute left-0 top-1/2 -ml-2 -mt-1 border-t-2 border-r-2 border-transparent border-r-gray-900" style={{ transform: "rotate(45deg)" }}></div>
        </div>
      )}

      {/* Instructions Modal - Unchanged */}
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
                aria-label="Close modal"
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
          <div 
            className="bg-white rounded-xl shadow-xl max-w-2xl w-11/12 md:w-3/4 lg:w-2/3 animate-scaleIn m-3 max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="p-4 sm:p-5 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center">
                <div className={`w-10 h-10 ${receiptData.election.borderColor} bg-gray-100 rounded-full flex items-center justify-center mr-3 border-2`}>
                  <FaReceipt className="text-gray-600" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-800">Your Vote Receipt</h3>
                  <p className="text-sm text-gray-500">{receiptData.election.name} Election</p>
                </div>
              </div>
              <button 
                onClick={() => setShowReceiptModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close modal"
              >
                <FaTimes className="text-gray-500" />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              {loadingReceipt ? (
                <div className="flex justify-center py-8">
                  <FaSpinner className="animate-spin text-blue-500 text-3xl" />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                    <div className="flex items-start">
                      <FaInfoCircle className="text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                      <p className="text-sm text-blue-700">
                        This is a record of your votes for this election. Your votes have been securely recorded and cannot be changed.
                      </p>
                    </div>
                  </div>
                  
                  <div className="divide-y divide-gray-200">
                    {receiptData.votes.map((vote, index) => (
                      <div key={index} className="py-4">
                        <h4 className="text-base font-medium text-gray-800 mb-2">{vote.position}</h4>
                        <div className="ml-4 bg-gray-50 p-3 rounded-md border border-gray-200">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-white rounded-full border border-gray-300 overflow-hidden mr-3">
                              {vote.candidate_image ? (
                                <img src={vote.candidate_image} alt={vote.candidate_name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500">
                                  {vote.candidate_name.charAt(0)}
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{vote.candidate_name}</p>
                              <p className="text-xs text-gray-500">{vote.party}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 sm:p-5 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowReceiptModal(false)}
                className="px-4 sm:px-6 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoterDashboard;
