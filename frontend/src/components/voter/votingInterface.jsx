import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  FaCheck, FaTimesCircle, FaVoteYea, FaArrowLeft, 
  FaExclamationCircle, FaCheckCircle, FaInfo
} from "react-icons/fa";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

// Utility Components
const LoadingScreen = () => (
  <div className="bg-gray-50 min-h-screen">
    <div className="p-3 sm:p-5 flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-t-2 border-b-2 border-orange-500 mb-3 sm:mb-4"></div>
        <h2 className="text-lg sm:text-xl font-semibold text-gray-700">Loading election data...</h2>
        <p className="text-xs sm:text-sm text-gray-500">Please wait while we prepare your ballot.</p>
      </div>
    </div>
  </div>
);

const ErrorScreen = ({ error, onBackToDashboard }) => (
  <div className="bg-gray-50 min-h-screen">
    <div className="p-3 sm:p-5 flex items-center justify-center h-screen">
      <div className="text-center bg-white p-5 sm:p-8 rounded-xl shadow-md border border-gray-200 max-w-md mx-3">
        <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-red-100 text-red-500 mb-3 sm:mb-4">
          <FaExclamationCircle className="text-2xl sm:text-3xl" />
        </div>
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">{error}</h2>
        <p className="text-sm sm:text-base text-gray-600 mb-5">Unable to load the election data.</p>
        <button
          onClick={onBackToDashboard}
          className="bg-orange-500 hover:bg-orange-600 text-white py-2 px-5 sm:px-6 rounded-lg transition-colors text-sm sm:text-base"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  </div>
);

const ElectionHeader = ({ electionInfo, onBackToDashboard }) => (
  <div className="bg-gradient-to-r from-orange-100 to-gray-100 p-3 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center">
    <div className="flex-shrink-0 mb-3 sm:mb-0">
      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden border-3 sm:border-4 border-white shadow-lg">
        <img 
          src={electionInfo.logo} 
          alt={electionInfo.name} 
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = "/assets/default-org.jpg";
          }}
        />
      </div>
    </div>
    <div className="sm:ml-6 flex-1">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-800">{electionInfo.name}</h1>
      <p className="text-xs sm:text-sm text-gray-600">{electionInfo.description}</p>
    </div>
    <button
      onClick={onBackToDashboard}
      className="flex items-center text-xs sm:text-sm text-gray-600 hover:text-orange-600 transition-colors mt-3 sm:mt-0"
    >
      <FaArrowLeft className="mr-1.5" /> Back to Dashboard
    </button>
  </div>
);

const VotingInstructions = ({ allPositionsSelected, positions, selectedCandidates }) => (
  <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
    <div className="p-2.5 sm:p-3 bg-blue-100 rounded-md flex-shrink-0 flex sm:block items-center">
      <FaInfo className="text-blue-600 mr-2 sm:mr-0" />
      <h2 className="text-sm font-medium text-blue-800 sm:hidden">Instructions</h2>
    </div>
    <div className="flex-1">
      <h2 className="text-base sm:text-lg font-medium text-gray-800 mb-1.5 sm:mb-2 hidden sm:block">Voting Instructions</h2>
      <ul className="list-disc list-inside text-gray-600 text-xs sm:text-sm space-y-0.5 sm:space-y-1">
        <li>Select <strong>one candidate</strong> for each position</li>
        <li>You must vote for all positions to submit your ballot</li>
        <li>Review your choices carefully in the confirmation screen before final submission</li>
        <li>Once submitted, your vote cannot be changed</li>
      </ul>
    </div>
    
    <div className="bg-orange-100 p-2.5 sm:p-3 rounded-lg flex-shrink-0 sm:ml-4">
      <div className="text-xs sm:text-sm text-orange-800">
        <div className="font-semibold mb-0.5 sm:mb-1">Ballot Status:</div>
        <div className="flex items-center">
          {allPositionsSelected() ? (
            <>
              <FaCheckCircle className="text-green-500 mr-1.5" /> 
              Ready to submit
            </>
          ) : (
            <>
              <FaExclamationCircle className="text-orange-500 mr-1.5" /> 
              {positions.length - Object.keys(selectedCandidates).length} positions left
            </>
          )}
        </div>
      </div>
    </div>
  </div>
);

const ErrorAlert = ({ error, onDismiss }) => (
  error && (
    <div className="bg-red-50 border-l-4 border-red-500 p-3 mb-4 sm:mb-6 rounded-r-lg">
      <div className="flex">
        <div className="flex-shrink-0">
          <FaExclamationCircle className="text-red-500 mt-0.5" />
        </div>
        <div className="ml-3">
          <p className="text-xs sm:text-sm text-red-700">{error}</p>
        </div>
        <button 
          className="ml-auto text-red-500 hover:text-red-700" 
          onClick={onDismiss}
        >
          <FaTimesCircle />
        </button>
      </div>
    </div>
  )
);

const CandidateCard = ({ candidate, isSelected, onSelect, getPartylistStyle }) => (
  <label 
    htmlFor={`candidate-${candidate.id}`}
    className={`relative block cursor-pointer rounded-xl border transition-all ${
      isSelected 
        ? 'border-green-500 bg-green-50 ring-2 ring-green-500' 
        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
    }`}
  >
    <input
      type="radio"
      id={`candidate-${candidate.id}`}
      name={`position-${candidate.position}`}
      value={candidate.id}
      className="sr-only"
      checked={isSelected}
      onChange={onSelect}
    />
    
    <div className="flex flex-col items-center p-4 sm:p-6">
      <div className={`w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-2 mb-3 ${
        isSelected 
          ? 'border-green-500' 
          : 'border-gray-200'
      }`}>
        <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 text-xl relative">
          {candidate.name.charAt(0).toUpperCase()}
          
          <img 
            src={candidate.photo}
            alt={candidate.name} 
            className="w-full h-full object-cover absolute inset-0"
            onLoad={(e) => {
              console.log(`Image loaded successfully for ${candidate.name}`);
            }}
            onError={(e) => {
              console.error(`Image failed to load for ${candidate.name}:`, candidate.photo);
              e.target.style.display = 'none'; // Hide the image on error
            }}
          />
        </div>
      </div>
      
      <div className="text-center">
        <div className="font-semibold text-sm sm:text-base text-gray-800 mb-1">
          {candidate.name}
        </div>
        
        {candidate.partylist ? (
          <div className="mb-2">
            <div className="text-xs text-gray-500 mb-1">Partylist:</div>
            <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border-2 ${getPartylistStyle(candidate.partylist)}`}>
              {candidate.partylist}
            </span>
          </div>
        ) : (
          <div className="mb-2">
            <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border-2 border-gray-200">
              Independent
            </span>
          </div>
        )}
        
        {isSelected && (
          <div className="absolute top-3 right-3 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center">
            <FaCheck size={12} />
          </div>
        )}
      </div>
    </div>
  </label>
);

const PositionSection = ({ position, selectedCandidates, handleSelectCandidate, getPartylistStyle, partylistFilter }) => (
  <div 
    id={`position-${position.name}`}
    className={`mb-5 sm:mb-8 bg-white rounded-xl shadow-md border ${
      selectedCandidates[position.name] ? 'border-green-200' : 'border-gray-200'
    }`}
  >
    <div className="p-3 sm:p-5 border-b border-gray-200">
      <h2 className="text-base sm:text-xl font-semibold text-gray-800">
        {position.name}
      </h2>
    </div>
    
    <div className="p-3 sm:p-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {position.candidates
          .filter(candidate => {
            // Only show candidates with a partylist assigned
            if (!candidate.partylist) return false;
            
            if (partylistFilter === 'all') return true;
            return candidate.partylist === partylistFilter;
          })
          .map((candidate) => (
            <CandidateCard 
              key={candidate.id}
              candidate={candidate}
              isSelected={selectedCandidates[position.name] === candidate.id}
              onSelect={() => handleSelectCandidate(position.name, candidate.id)}
              getPartylistStyle={getPartylistStyle}
            />
          ))
        }
      </div>
    </div>
  </div>
);

const SubmitButton = ({ allPositionsSelected, positions, selectedCandidates, onSubmit }) => (
  <div className="sticky bottom-0 bg-white p-3 sm:p-4 border-t border-gray-200 rounded-t-xl shadow-md z-10">
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center max-w-7xl mx-auto gap-2 sm:gap-0">
      <div>
        <p className="text-xs sm:text-sm text-gray-600">
          {allPositionsSelected() 
            ? "All positions selected. Ready for submission." 
            : `Select candidates for ${positions.length - Object.keys(selectedCandidates).length} more position(s).`
          }
        </p>
      </div>
      <button
        onClick={onSubmit}
        disabled={!allPositionsSelected()}
        className={`flex items-center justify-center py-2 px-4 sm:px-6 rounded-lg text-sm font-medium ${
          allPositionsSelected() 
            ? 'bg-orange-600 hover:bg-orange-700 text-white' 
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        } transition-all`}
      >
        <FaVoteYea className="mr-1.5 sm:mr-2" /> Submit Ballot
      </button>
    </div>
  </div>
);

const ConfirmationModal = ({ 
  positions, 
  getSelectedCandidate, 
  getPartylistStyle, 
  onBack, 
  onSubmit, 
  submitting 
}) => (
  <div className="fixed inset-0 backdrop-blur-md bg-opacity-20 flex items-center justify-center p-3 sm:p-4 z-50">
    <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-y-auto">
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <h2 className="text-lg sm:text-2xl font-bold text-gray-800">Confirm Your Vote</h2>
        <p className="text-xs sm:text-sm text-gray-600">Please review your selections before final submission</p>
      </div>
      
      <div className="p-3 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {positions.map((position) => (
            <div key={position.name} className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm sm:text-base font-medium text-gray-800 mb-3">{position.name}</h3>
              
              {getSelectedCandidate(position.name) ? (
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-green-500 mb-2">
                    <img 
                      src={getSelectedCandidate(position.name).photo}
                      alt={getSelectedCandidate(position.name).name} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "/assets/default-org.jpg";
                      }}
                    />
                  </div>
                  
                  <div className="font-medium text-sm sm:text-base text-gray-800 text-center mb-2">
                    {getSelectedCandidate(position.name).name}
                  </div>
                  
                  {getSelectedCandidate(position.name).partylist ? (
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-1">Partylist:</div>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${getPartylistStyle(getSelectedCandidate(position.name).partylist)}`}>
                        {getSelectedCandidate(position.name).partylist}
                      </span>
                    </div>
                  ) : (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                      Independent
                    </span>
                  )}
                </div>
              ) : (
                <div className="text-red-500 text-sm">No candidate selected</div>
              )}
            </div>
          ))}
        </div>
        
        <div className="mt-5 sm:mt-8 bg-orange-50 border border-orange-200 p-3 sm:p-4 rounded-lg">
          <div className="flex items-start">
            <div className="text-orange-500 mt-0.5 flex-shrink-0">
              <FaExclamationCircle size={16} />
            </div>
            <div className="ml-3">
              <h3 className="text-sm sm:text-base font-medium text-orange-800">Important Notice</h3>
              <p className="text-xs sm:text-sm text-orange-700">
                Your vote is final once submitted and cannot be changed. Please ensure your selections are correct.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-3 sm:p-6 border-t border-gray-200 flex flex-col sm:flex-row justify-between gap-2 sm:gap-0">
        <button
          onClick={onBack}
          className="py-2 px-4 sm:px-6 border border-gray-300 hover:bg-gray-100 rounded-lg flex items-center justify-center font-medium text-sm text-gray-700 transition-colors order-2 sm:order-1"
        >
          <FaArrowLeft className="mr-1.5 sm:mr-2" /> Back to Ballot
        </button>
        
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="py-2 px-4 sm:px-6 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center justify-center font-medium text-sm transition-colors order-1 sm:order-2"
        >
          {submitting ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-1.5 sm:mr-2"></div>
              Submitting...
            </>
          ) : (
            <>
              <FaCheck className="mr-1.5 sm:mr-2" /> Confirm and Submit
            </>
          )}
        </button>
      </div>
    </div>
  </div>
);

const SuccessModal = ({ electionInfo, positions, getSelectedCandidate, onBackToDashboard }) => (
  <div className="fixed inset-0 backdrop-blur-md bg-black bg-opacity-20 flex items-center justify-center p-3 sm:p-4 z-50">
    <div className="bg-white rounded-xl shadow-2xl max-w-md p-4 sm:p-8 text-center m-3">
      <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4 sm:mb-6">
        <FaCheckCircle className="text-3xl sm:text-4xl text-green-600" />
      </div>
      
      <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Vote Submitted Successfully!</h2>
      <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">
        Thank you for participating in the {electionInfo.name} election.
      </p>
      
      <div className="bg-gray-50 p-3 sm:p-4 rounded-lg text-left mb-4 sm:mb-6">
        <p className="text-sm font-medium text-gray-800">Your vote has been recorded for:</p>
        <ul className="mt-2 space-y-1 text-xs sm:text-sm text-gray-600">
          {positions.map((position) => (
            <li key={position.name} className="flex items-center">
              <FaCheckCircle className="text-green-500 mr-1.5 flex-shrink-0" />
              <span className="font-medium">{position.name}:</span> {getSelectedCandidate(position.name).name}
            </li>
          ))}
        </ul>
      </div>
      
      <p className="text-[10px] sm:text-xs text-gray-500 mb-4 sm:mb-6">
        You will be redirected to the dashboard shortly.
      </p>
      
      <button
        onClick={onBackToDashboard}
        className="bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 sm:px-6 rounded-lg transition-colors mx-auto text-sm"
      >
        Return to Dashboard
      </button>
    </div>
  </div>
);

// Main Component
const VotingInterface = () => {
  const { electionId } = useParams();
  const navigate = useNavigate();
  
  // -------------------- State Management --------------------
  // Core states
  const [selectedCandidates, setSelectedCandidates] = useState({});
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [positions, setPositions] = useState([]);
  const [electionInfo, setElectionInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // UI states
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [partylistFilter, setPartylistFilter] = useState('all');
  const [partylists, setPartylists] = useState([]);

  // -------------------- Helper Functions --------------------
  // Memoized helpers
  const organizationHelpers = useMemo(() => ({
    // Helper function to convert URL param to organization name
    convertElectionIdToOrgName: (id) => {
      switch(id) {
        case "ccs-student-council": return "CCS Student Council";
        case "elites": return "ELITES";
        case "specs": return "SPECS";
        case "images": return "IMAGES";
        default: return null;
      }
    },
    
    // Helper function for organization logos
    getOrganizationLogo: (name) => {
      const logoMap = {
        "CCS Student Council": "/assets/STUDENT-COUNCIL.jpg",
        "ELITES": "/assets/ELITES.jpg", 
        "SPECS": "/assets/SPECS.jpg",
        "IMAGES": "/assets/IMAGES.jpg"
      };
      return logoMap[name] || "/assets/default-org.jpg";
    },
    
    // Helper function for org descriptions
    getOrganizationDescription: (name) => {
      switch(name) {
        case "CCS Student Council":
          return "Student Council Election for College of Computing Sciences";
        case "ELITES":
          return "Empowered League of Information Technology Education Students";
        case "SPECS":
          return "Society of Programmers and Enthusiasts in Computer Science";
        case "IMAGES":
          return "Interactive Media and Graphics Enthusiasts Society";
        default:
          return "Student organization at Gordon College";
      }
    }
  }), []);

  // Add this to your organizationHelpers or as a separate memo in the component
  const positionHierarchy = useMemo(() => {
    // Position ordering by importance/rank
    const positionOrder = {
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
    };
    
    return {
      // Get position order or default to 999 for unknown positions
      getPositionOrder: (position) => {
        const normalizedPosition = position.toUpperCase();
        return positionOrder[normalizedPosition] || 999;
      },
      
      // Sort positions array by hierarchy
      sortPositions: (positionsArray) => {
        return [...positionsArray].sort((a, b) => {
          const orderA = positionOrder[a.name.toUpperCase()] || 999;
          const orderB = positionOrder[b.name.toUpperCase()] || 999;
          return orderA - orderB;
        });
      }
    };
  }, []);

  // -------------------- Data Fetching --------------------
  // Fetch partylists
  const fetchPartylists = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await fetch(`${API_BASE_URL}/partylists`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch partylists");
      }
      
      const data = await response.json();
      setPartylists(data);
      console.log("Partylists fetched:", data);
    } catch (error) {
      console.error("Error fetching partylists:", error);
    }
  }, []);

  // Main election data fetching
  useEffect(() => {
    const fetchElectionData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Convert election ID from URL param to organization name
        const orgName = organizationHelpers.convertElectionIdToOrgName(electionId);
        if (!orgName) {
          throw new Error("Invalid election ID");
        }
        
        // First get student information using the token
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error("Not authenticated. Please log in again.");
        }
        
        const studentResponse = await fetch(`${API_BASE_URL}/students/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!studentResponse.ok) {
          throw new Error("Failed to retrieve your student information");
        }
        
        const studentInfo = await studentResponse.json();
        const studentId = studentInfo.id;
        
        // 1. Get organization details
        const orgResponse = await fetch(`${API_BASE_URL}/organizations/by-name/${orgName}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!orgResponse.ok) {
          throw new Error("Failed to fetch organization details");
        }
        
        const orgData = await orgResponse.json();
        
        // 2. Get election status
        const statusResponse = await fetch(`${API_BASE_URL}/elections/status/${orgName}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!statusResponse.ok) {
          throw new Error("Failed to fetch election status");
        }
        
        const statusData = await statusResponse.json();
        const electionDbId = statusData.election_id;
        
        if (statusData.status !== "ongoing") {
          throw new Error(`This election is not currently active (Status: ${statusData.status})`);
        }
        
        // 3. Check if student has already voted in this election
        const votedResponse = await fetch(`${API_BASE_URL}/votes/check-voted?election_id=${electionDbId}&student_id=${studentId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!votedResponse.ok) {
          console.error("Error checking vote status:", await votedResponse.text());
        } else {
          const votedData = await votedResponse.json();
          if (votedData.has_voted) {
            throw new Error("You have already voted in this election. Each student can only vote once per election.");
          }
        }
        
        // 4. Get candidates for this organization
        const candidatesResponse = await fetch(`${API_BASE_URL}/candidates`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!candidatesResponse.ok) {
          throw new Error("Failed to fetch candidates");
        }
        
        const allCandidates = await candidatesResponse.json();
        
        // Filter candidates for this organization only
        const orgCandidates = allCandidates.filter(candidate => 
          candidate.group === orgName
        );
        
        if (orgCandidates.length === 0) {
          throw new Error("No candidates found for this election");
        }
        
        console.log("Org candidates:", orgCandidates);
        
        // Set election info
        const election = {
          id: orgData.id,
          name: orgName,
          logo: organizationHelpers.getOrganizationLogo(orgName),
          description: organizationHelpers.getOrganizationDescription(orgName),
          candidates: orgCandidates.map(candidate => ({
            id: candidate.id,
            name: candidate.name,
            position: candidate.position,
            group: candidate.group,
            partylist: candidate.partylist || null,
            photo: candidate.photo_url 
              ? (candidate.photo_url.startsWith('http') 
                  ? candidate.photo_url 
                  : `${API_BASE_URL.replace('/api/v1', '')}${candidate.photo_url.startsWith('/') ? '' : '/'}${candidate.photo_url}`)
              : organizationHelpers.getOrganizationLogo(orgName)
          }))
        };
        
        setElectionInfo(election);
        
        // Group candidates by position
        const positionGroups = election.candidates.reduce((groups, candidate) => {
          const position = candidate.position;
          if (!groups[position]) {
            groups[position] = [];
          }
          
          // Fix the image URL path with better logic
          if (candidate.photo) {
            console.log("Original image URL:", candidate.photo);
            
            // Check if it's a full URL (starts with http)
            if (!candidate.photo.startsWith('http')) {
              // For paths from the database that start with 'assets/'
              if (candidate.photo.startsWith('assets/')) {
                candidate.photo = '/' + candidate.photo;
              }
              // For paths that don't include directory structure at all (just filename.jpg)
              else if (!candidate.photo.includes('/')) {
                candidate.photo = '/assets/candidates/' + candidate.photo;
              }
              // For any other relative path, ensure it starts with /
              else if (!candidate.photo.startsWith('/')) {
                candidate.photo = '/' + candidate.photo;
              }
            }
            
            console.log("Fixed image URL for", candidate.name, ":", candidate.photo);
          }
          
          groups[position].push(candidate);
          return groups;
        }, {});
        
        // Convert to array format for rendering
        const positionsArray = Object.keys(positionGroups).map(position => ({
          name: position,
          candidates: positionGroups[position]
        }));
        
        // Sort positions by hierarchy before setting state
        const sortedPositions = positionHierarchy.sortPositions(positionsArray);
        setPositions(sortedPositions);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching election data:", error);
        setError(error.message || "Failed to load election data");
        setLoading(false);
      }
    };

    fetchElectionData();
    fetchPartylists();
  }, [electionId, organizationHelpers, fetchPartylists]);

  // Responsive design handling
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // -------------------- Voting Functionality --------------------
  // Check if all positions have selections
  const allPositionsSelected = useCallback(() => {
    return positions.every(position => 
      selectedCandidates[position.name] !== undefined
    );
  }, [positions, selectedCandidates]);

  // Handle candidate selection
  const handleSelectCandidate = useCallback((positionName, candidateId) => {
    setSelectedCandidates(prev => ({
      ...prev,
      [positionName]: candidateId
    }));
  }, []);

  // Get selected candidate details by position
  const getSelectedCandidate = useCallback((positionName) => {
    const candidateId = selectedCandidates[positionName];
    if (!candidateId) return null;
    
    const position = positions.find(p => p.name === positionName);
    if (!position) return null;
    
    return position.candidates.find(c => c.id === candidateId);
  }, [selectedCandidates, positions]);

  // Handle submit button click
  const handleSubmitClick = useCallback(() => {
    if (allPositionsSelected()) {
      setShowConfirmation(true);
    } else {
      // Highlight unselected positions
      setError("Please select a candidate for all positions before submitting.");
      
      // Auto-scroll to the first unselected position
      const firstUnselected = positions.find(position => 
        selectedCandidates[position.name] === undefined
      );
      
      if (firstUnselected) {
        const element = document.getElementById(`position-${firstUnselected.name}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [allPositionsSelected, positions, selectedCandidates]);

  // Handle back to voting from confirmation modal
  const handleBackToVoting = useCallback(() => {
    setShowConfirmation(false);
  }, []);

  // Return to dashboard
  const handleBackToDashboard = useCallback(() => {
    navigate("/voter");
  }, [navigate]);

  // Handle final vote submission
  const handleFinalSubmit = useCallback(async () => {
    try {
      setSubmitting(true);
      setError(null);
      
      // Get student ID using the authentication token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error("Not authenticated. Please log in again.");
      }
      
      // Fetch student information from the backend using the token
      const studentResponse = await fetch(`${API_BASE_URL}/students/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!studentResponse.ok) {
        throw new Error("Failed to retrieve your student information");
      }
      
      const studentInfo = await studentResponse.json();
      const studentId = studentInfo.id;
      
      console.log("Retrieved student ID:", studentId);
      
      // First get the current ongoing election ID
      const orgName = organizationHelpers.convertElectionIdToOrgName(electionId);
      const statusResponse = await fetch(`${API_BASE_URL}/elections/status/${orgName}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!statusResponse.ok) {
        throw new Error("Failed to fetch election status");
      }
      
      const statusData = await statusResponse.json();
      const electionDbId = statusData.election_id;
      
      // Format the votes data for submission
      const votesData = [];
      for (const position in selectedCandidates) {
        votesData.push({
          election_id: electionDbId,
          candidate_id: selectedCandidates[position],
          position: position
        });
      }
      
      // Submit votes to the backend
      const response = await fetch(`${API_BASE_URL}/votes/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          election_id: electionDbId,
          votes: votesData,
          student_id: studentId
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to submit vote");
      }
      
      if (response.ok) {
        console.log("Votes submitted successfully!");
        setSubmitSuccess(true);
        
        // Save the voted status to localStorage before redirecting
        const electionCode = window.location.pathname.split('/').pop(); // Get election code from URL
        localStorage.setItem(`voted_${electionCode}`, 'true');
        localStorage.setItem(`voted_timestamp_${electionCode}`, new Date().toISOString());
        
        // Force a complete page reload
        setTimeout(() => {
          window.location.href = "/voter";
        }, 2000);
      }
    } catch (error) {
      console.error("Error submitting votes:", error);
      setError(error.message || "Failed to submit your vote. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [selectedCandidates, electionId, organizationHelpers]);

  // -------------------- Styling & UI Helpers --------------------
  // Get partylist style
  const getPartylistStyle = useCallback((partylistName) => {
    if (!partylistName) return 'bg-gray-100 text-gray-600 border-gray-200';
    
    // Find the partylist to get its color if available
    const partylist = partylists.find(p => p.name === partylistName);
    
    if (partylist?.color) {
      // Use the color from the database if available
      return `bg-${partylist.color}-100 text-${partylist.color}-800 border-${partylist.color}-300`;
    }
    
    // Fallback colors based on the first letter of partylist name
    const firstChar = partylistName.charAt(0).toLowerCase();
    const colorMap = {
      a: 'green', b: 'blue', c: 'indigo', d: 'purple', e: 'pink',
      f: 'red', g: 'yellow', h: 'orange', i: 'teal', j: 'cyan',
      k: 'blue', l: 'indigo', m: 'purple', n: 'pink', o: 'red',
      p: 'yellow', q: 'orange', r: 'teal', s: 'cyan', t: 'blue',
      u: 'indigo', v: 'purple', w: 'pink', x: 'red', y: 'yellow',
      z: 'orange'
    };
    
    const color = colorMap[firstChar] || 'gray';
    return `bg-${color}-100 text-${color}-800 border-${color}-300`;
  }, [partylists]);

  // -------------------- Render Logic --------------------
  // Loading state
  if (loading) {
    return <LoadingScreen />;
  }

  // Error state with no election info
  if (error && !electionInfo) {
    return <ErrorScreen error={error} onBackToDashboard={handleBackToDashboard} />;
  }

  // Main component render
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="p-3 sm:p-5">
        {/* Election Header */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 mb-4 sm:mb-6 overflow-hidden">
          <ElectionHeader 
            electionInfo={electionInfo} 
            onBackToDashboard={handleBackToDashboard} 
          />
          
          <div className="p-3 sm:p-6">
            <VotingInstructions 
              allPositionsSelected={allPositionsSelected}
              positions={positions}
              selectedCandidates={selectedCandidates}
            />
          </div>
        </div>

        {/* Error Alert */}
        <ErrorAlert 
          error={error} 
          onDismiss={() => setError(null)} 
        />
        
        {/* Voting Sections by Position */}
        {positions.map((position) => (
          <PositionSection
            key={position.name}
            position={position}
            selectedCandidates={selectedCandidates}
            handleSelectCandidate={handleSelectCandidate}
            getPartylistStyle={getPartylistStyle}
            partylistFilter={partylistFilter}
          />
        ))}
        
        {/* Submit Button */}
        <SubmitButton 
          allPositionsSelected={allPositionsSelected}
          positions={positions}
          selectedCandidates={selectedCandidates}
          onSubmit={handleSubmitClick}
        />
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <ConfirmationModal
          positions={positions}
          getSelectedCandidate={getSelectedCandidate}
          getPartylistStyle={getPartylistStyle}
          onBack={handleBackToVoting}
          onSubmit={handleFinalSubmit}
          submitting={submitting}
        />
      )}

      {/* Success Modal */}
      {submitSuccess && (
        <SuccessModal
          electionInfo={electionInfo}
          positions={positions}
          getSelectedCandidate={getSelectedCandidate}
          onBackToDashboard={handleBackToDashboard}
        />
      )}
    </div>
  );
};

export default VotingInterface;