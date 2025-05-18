import React, { useState, useRef, useEffect } from "react";
import {
  FaFilter, FaEye, FaTrophy, FaTimesCircle, FaMedal,
  FaChevronLeft, FaChevronRight, FaSpinner
} from "react-icons/fa";
import Header from "./header";

const Tally = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [councils, setCouncils] = useState({});
  const [selectedCouncil, setSelectedCouncil] = useState("");
  const [positions, setPositions] = useState([]);
  const [currentPositionIndex, setCurrentPositionIndex] = useState(0);
  const [showWinners, setShowWinners] = useState(false);
  const tableRef = useRef(null);
  
  // Check if mobile on resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch election results data
  useEffect(() => {
    const fetchElectionResults = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch results from your API
        const response = await fetch('http://localhost:8000/api/v1/elections/results', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to load election results');
        }
        
        const data = await response.json();
        
        // Process data into the required format
        const formattedData = {};
        
        // Process the API response into our required format
        data.forEach(election => {
          const council = election.organization_name;
          const status = election.election_status;
          
          if (!formattedData[council]) {
            formattedData[council] = {
              status: status,
              positions: {}
            };
          }
          
          // Group candidates by position
          election.positions.forEach(position => {
            const positionName = position.name;
            const candidates = position.candidates;
            
            // Prepare data for charts
            const labels = candidates.map(c => c.name);
            const voteCounts = candidates.map(c => c.vote_count);
            const colors = [
              "rgba(234, 88, 12, 0.8)", 
              "rgba(59, 130, 246, 0.8)", 
              "rgba(16, 185, 129, 0.8)",
              "rgba(124, 58, 237, 0.8)",
              "rgba(236, 72, 153, 0.8)"
            ];
            
            // Limit colors array to the number of candidates
            const slicedColors = colors.slice(0, candidates.length);
            
            formattedData[council].positions[positionName] = {
              labels,
              data: voteCounts,
              colors: slicedColors
            };
          });
        });
        
        setCouncils(formattedData);
        
        // Set initial selected council and positions
        if (Object.keys(formattedData).length > 0) {
          const firstCouncil = Object.keys(formattedData)[0];
          setSelectedCouncil(firstCouncil);
          setPositions(Object.keys(formattedData[firstCouncil].positions));
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching election results:", error);
        setError(error.message);
        setLoading(false);
      }
    };
    
    fetchElectionResults();
  }, []);

  // Function to get all winners for each organization
  const getAllWinners = () => {
    const allWinners = {};
    
    Object.keys(councils).forEach(council => {
      allWinners[council] = {};
      
      Object.keys(councils[council].positions).forEach(position => {
        const positionData = councils[council].positions[position];
        const highestVotes = Math.max(...positionData.data);
        const winnerIndex = positionData.data.indexOf(highestVotes);
        const totalVotes = positionData.data.reduce((sum, votes) => sum + votes, 0);
        const percentage = ((highestVotes / totalVotes) * 100).toFixed(2);
        
        allWinners[council][position] = {
          name: positionData.labels[winnerIndex],
          votes: highestVotes,
          percentage: percentage
        };
      });
    });
    
    return allWinners;
  };

  const handleCouncilSelect = (council) => {
    setSelectedCouncil(council);
    setPositions(Object.keys(councils[council].positions));
    setCurrentPositionIndex(0);
  };

  const handleSelectPosition = (index) => {
    setCurrentPositionIndex(index);
  };

  const navigatePosition = (direction) => {
    if (direction === 'next' && currentPositionIndex < positions.length - 1) {
      setCurrentPositionIndex(currentPositionIndex + 1);
    } else if (direction === 'prev' && currentPositionIndex > 0) {
      setCurrentPositionIndex(currentPositionIndex - 1);
    }
  };

  // If loading or error, show appropriate UI
  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <Header username="Admin" />
        <div className={`p-3 sm:p-5 transition-all duration-300 ${isMobile ? '' : 'ml-[250px]'}`}>
          <div className="flex flex-col items-center justify-center h-[70vh]">
            <FaSpinner className="animate-spin text-orange-500 text-4xl mb-4" />
            <p className="text-gray-600">Loading election results...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <Header username="Admin" />
        <div className={`p-3 sm:p-5 transition-all duration-300 ${isMobile ? '' : 'ml-[250px]'}`}>
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
            <p className="font-medium">Error loading election results</p>
            <p className="text-sm mt-1">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Handle case where no data is loaded
  if (!selectedCouncil || !positions.length || Object.keys(councils).length === 0) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <Header username="Admin" />
        <div className={`p-3 sm:p-5 transition-all duration-300 ${isMobile ? '' : 'ml-[250px]'}`}>
          <div className="bg-white border border-gray-200 text-gray-700 p-8 rounded-lg text-center">
            <p className="font-medium text-lg mb-2">No Election Results Available</p>
            <p className="text-gray-500">There are currently no election results to display.</p>
          </div>
        </div>
      </div>
    );
  }

  const currentPosition = positions[currentPositionIndex];
  const currentData = councils[selectedCouncil].positions[currentPosition];
  const totalVotes = currentData.data.reduce((sum, votes) => sum + votes, 0);
  
  // Find highest vote getter (winner)
  const highestVotes = Math.max(...currentData.data);
  const winnerIndex = currentData.data.indexOf(highestVotes);
  const winnerName = currentData.labels[winnerIndex];
  
  // Calculate vote percentages
  const votePercentages = currentData.data.map(votes => ((votes / totalVotes) * 100).toFixed(2));

  // Prepare sorted candidate data for display
  const sortedCandidates = currentData.labels.map((name, index) => ({
    name,
    votes: currentData.data[index],
    percentage: votePercentages[index],
    isWinner: index === winnerIndex
  })).sort((a, b) => b.votes - a.votes); // Sort by votes high to low

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <Header username="Admin" />

      {/* Main Content - Responsive margin */}
      <div className={`p-3 sm:p-5 transition-all duration-300 ${isMobile ? '' : 'ml-[250px]'}`}>
        {/* Page Title - Responsive sizing */}
        <div className="bg-gradient-to-r from-orange-100 to-gray-100 p-4 sm:p-6 rounded-lg shadow-md border border-gray-300 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 bg-orange-500 rounded-lg text-white mr-2 sm:mr-4">
                <FaEye className="text-lg sm:text-xl" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">Election Results</h1>
                {selectedCouncil && councils[selectedCouncil].status === "ongoing" && (
                  <div className="flex items-center mt-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-green-100 text-green-800">
                      <span className="animate-pulse w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                      Live Election
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center">
              <button
                onClick={() => setShowWinners(true)}
                className="w-full sm:w-auto px-3 sm:px-4 py-1.5 sm:py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition flex items-center justify-center text-xs sm:text-sm"
              >
                <FaTrophy className="mr-1 sm:mr-2 text-xs sm:text-sm" />
                View Winners
              </button>
            </div>
          </div>
        </div>

        {/* Council Filter - Mobile scrollable */}
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow-md mb-4 sm:mb-6">
          <div className="font-medium text-xs sm:text-sm text-gray-600 flex items-center mb-2">
            <FaFilter className="mr-1 text-orange-500" /> Select Council:
          </div>
          <div className="overflow-x-auto pb-1">
            <div className="flex items-center gap-2 min-w-max">
              {Object.keys(councils).map((council) => (
                <button
                  key={council}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors text-[11px] sm:text-sm whitespace-nowrap ${
                    selectedCouncil === council
                      ? "bg-orange-500 text-white"
                      : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                  }`}
                  onClick={() => handleCouncilSelect(council)}
                >
                  {council}
                  {councils[council].status === "ongoing" && (
                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-medium bg-green-100 text-green-800">
                      Live
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Position Navigation - Mobile optimized with arrows */}
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow-md mb-4 sm:mb-6">
          <div className="font-medium text-xs sm:text-sm text-gray-600 mb-2 flex items-center">
            <FaEye className="mr-1 text-orange-500" /> Position:
          </div>
          
          {/* Mobile Position Slider */}
          <div className="sm:hidden flex items-center justify-between mb-2">
            <button 
              onClick={() => navigatePosition('prev')}
              disabled={currentPositionIndex === 0}
              className={`p-1.5 rounded-full ${currentPositionIndex === 0 ? 'text-gray-300' : 'text-orange-500'}`}
            >
              <FaChevronLeft />
            </button>
            <div className="text-center font-medium text-sm text-gray-800">
              {currentPosition} ({currentPositionIndex + 1}/{positions.length})
            </div>
            <button 
              onClick={() => navigatePosition('next')}
              disabled={currentPositionIndex === positions.length - 1}
              className={`p-1.5 rounded-full ${currentPositionIndex === positions.length - 1 ? 'text-gray-300' : 'text-orange-500'}`}
            >
              <FaChevronRight />
            </button>
          </div>
          
          {/* Desktop Position Buttons */}
          <div className="hidden sm:flex flex-wrap gap-2">
            {positions.map((position, index) => (
              <button
                key={position}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors text-xs sm:text-sm ${
                  currentPositionIndex === index
                    ? "bg-orange-500 text-white"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                }`}
                onClick={() => handleSelectPosition(index)}
              >
                {position}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Cards - Responsive grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 mb-4 sm:mb-6">
          {/* Total Votes Card */}
          <div className="bg-white p-3 sm:p-4 rounded-lg shadow-md border-l-4 border-blue-500">
            <div className="text-xs sm:text-sm text-gray-500 mb-1">Total Votes Cast</div>
            <div className="text-xl sm:text-2xl font-bold text-gray-800">{totalVotes}</div>
            <div className="text-[10px] sm:text-xs text-gray-500 mt-1">For {currentPosition} position</div>
          </div>
          
          {/* Leading Candidate Card */}
          <div className="bg-white p-3 sm:p-4 rounded-lg shadow-md border-l-4 border-orange-500">
            <div className="text-xs sm:text-sm text-gray-500 mb-1">Leading Candidate</div>
            <div className="flex items-center">
              <FaTrophy className="text-orange-500 mr-2 text-sm sm:text-base" />
              <div className="text-xl sm:text-2xl font-bold text-gray-800 truncate">{winnerName}</div>
            </div>
            <div className="text-[10px] sm:text-xs text-gray-500 mt-1">
              {highestVotes} votes ({((highestVotes / totalVotes) * 100).toFixed(2)}%)
            </div>
          </div>
        </div>

        {/* Mobile View - Card-based results */}
        <div className="sm:hidden space-y-3 mb-4">
          {sortedCandidates.map((candidate, index) => (
            <div 
              key={candidate.name}
              className={`p-3 rounded-lg shadow-sm border ${candidate.isWinner ? 'border-orange-300 bg-orange-50' : 'border-gray-200 bg-white'}`}
            >
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center">
                  {index === 0 ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-100 text-orange-800 mr-2">
                      <FaTrophy className="mr-1 text-orange-500" /> {index + 1}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-800 mr-2">
                      {index + 1}
                    </span>
                  )}
                  <div className="font-medium text-sm text-gray-900 truncate max-w-[180px]">{candidate.name}</div>
                </div>
                <div className="text-xs text-gray-700 font-medium">{candidate.votes} votes</div>
              </div>
              <div className="flex justify-between items-center text-[10px] text-gray-500 mb-1.5">
                <div>Percentage</div>
                <div>{candidate.percentage}%</div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`${candidate.isWinner ? 'bg-orange-600' : 'bg-blue-500'} h-2 rounded-full`}
                  style={{ width: `${candidate.percentage}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Results Table */}
        <div className="hidden sm:block bg-white p-4 sm:p-6 rounded-lg shadow-md">
          <div ref={tableRef}>
            <div className="overflow-x-auto" id="resultsTable">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th scope="col" className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Candidate
                    </th>
                    <th scope="col" className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vote Count
                    </th>
                    <th scope="col" className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Percentage
                    </th>
                    <th scope="col" className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Visual
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedCandidates.map((candidate, index) => (
                    <tr key={candidate.name} className={candidate.isWinner ? "bg-orange-50" : ""}>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                        <div className="text-xs sm:text-sm text-gray-900">
                          {index === 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-orange-100 text-orange-800">
                              <FaTrophy className="mr-1 text-orange-500" /> {index + 1}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-gray-100 text-gray-800">
                              {index + 1}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                        <div className="text-xs sm:text-sm font-medium text-gray-900">{candidate.name}</div>
                      </td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                        <div className="text-xs sm:text-sm text-gray-900">{candidate.votes}</div>
                      </td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                        <div className="text-xs sm:text-sm text-gray-900">{candidate.percentage}%</div>
                      </td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-orange-600 h-2 rounded-full" style={{ width: `${candidate.percentage}%` }}></div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Winners Modal - Mobile Optimized with blurry backdrop */}
      {showWinners && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center z-50 p-3 sm:p-0">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-3 sm:p-5 bg-gradient-to-r from-orange-500 to-orange-600 text-white flex justify-between items-center">
              <div className="flex items-center">
                <FaTrophy className="text-lg sm:text-2xl mr-2 sm:mr-3" />
                <h2 className="text-base sm:text-xl font-bold">Election Winners</h2>
              </div>
              <button 
                onClick={() => setShowWinners(false)}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <FaTimesCircle className="text-lg sm:text-xl" />
              </button>
            </div>
            
            <div className="p-3 sm:p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-4 sm:space-y-8">
                {Object.entries(getAllWinners()).map(([council, positions]) => (
                  <div key={council} className="border-b border-gray-200 pb-4 sm:pb-6 last:border-0">
                    <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4 flex items-center">
                      <span className="w-2 h-6 bg-orange-500 rounded-full mr-2"></span>
                      {council}
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      {Object.entries(positions).map(([position, winner]) => (
                        <div 
                          key={position} 
                          className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow"
                        >
                          <h4 className="text-xs sm:text-sm font-medium text-gray-500 mb-1">{position}</h4>
                          <div className="flex items-center mb-1 sm:mb-2">
                            <FaMedal className="text-amber-500 mr-1 sm:mr-2 text-xs sm:text-base" />
                            <span className="text-sm sm:text-lg font-bold text-gray-800 truncate">{winner.name}</span>
                          </div>
                          <div className="text-[10px] sm:text-sm text-gray-600">
                            {winner.votes} votes ({winner.percentage}%)
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="border-t border-gray-200 p-3 sm:p-4 bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowWinners(false)}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors text-xs sm:text-sm"
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

export default Tally;