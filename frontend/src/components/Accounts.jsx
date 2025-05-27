import React, { useState, useEffect } from "react";
import Header from "./header";
import { FaEdit, FaSearch, FaSort, FaTimes, FaSortUp, FaSortDown, FaUserCog, FaFilter, FaChevronDown, FaCheck } from "react-icons/fa";

const Accounts = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [sortDirection, setSortDirection] = useState("asc");
  const [activeSortField, setActiveSortField] = useState("student_no");
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState(null);
  const [programFilter, setProgramFilter] = useState("all");
  const [originalStudentData, setOriginalStudentData] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState("success");

  // Check if mobile on resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load students from API
  const loadStudents = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/v1/students', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load students');
      }
      
      const data = await response.json();
      // Transform the data to add full name property
      const transformedData = data.map(student => ({
        ...student,
        fullName: `${student.first_name} ${student.last_name}`.toUpperCase()
      }));
      
      setStudents(transformedData);
      setFilteredStudents(transformedData);
    } catch (error) {
      console.error("Error loading students:", error);
    } finally {
      setLoading(false);
    }
  };

  // Load students on mount
  useEffect(() => {
    loadStudents();
  }, []);

  // Handle search input
  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    filterStudents(term, programFilter);
  };

  // Handle program filter
  const handleProgramFilter = (e) => {
    const program = e.target.value;
    setProgramFilter(program);
    filterStudents(searchTerm, program);
  };

  // Combined filter function
  const filterStudents = (term, program) => {
    setFilteredStudents(
      students.filter(
        (student) => 
          (program === "all" || student.program === program) &&
          (term === "" || 
            student.fullName.toLowerCase().includes(term) ||
            student.student_no.toLowerCase().includes(term) ||
            student.program.toLowerCase().includes(term) ||
            student.year_level.toLowerCase().includes(term) ||
            student.block.toLowerCase().includes(term))
      )
    );
  };

  // Handle column-based sorting
  const handleSort = (key) => {
    const newDirection = key === activeSortField && sortDirection === "asc" ? "desc" : "asc";
    setActiveSortField(key);
    setSortDirection(newDirection);

    const sortedStudents = [...filteredStudents].sort((a, b) => {
      const valueA = key === "fullName" ? a[key] : String(a[key]).toLowerCase();
      const valueB = key === "fullName" ? b[key] : String(b[key]).toLowerCase();
      
      if (newDirection === "asc") {
        return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
      } else {
        return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
      }
    });

    setFilteredStudents(sortedStudents);
  };

  // Get appropriate sort icon
  const getSortIcon = (field) => {
    if (field !== activeSortField) return <FaSort className="text-gray-400 text-[10px] sm:text-xs" />;
    return sortDirection === "asc" ? 
      <FaSortUp className="text-orange-600 text-[10px] sm:text-xs" /> : 
      <FaSortDown className="text-orange-600 text-[10px] sm:text-xs" />;
  };

  // Handle update action - open modal with student data
  const handleUpdate = (student) => {
    setCurrentStudent({ ...student });
    setOriginalStudentData({ ...student });
    setIsUpdateModalOpen(true);
  };

  // Handle input change in the update form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Handle block field - always uppercase
    if (name === "block") {
      setCurrentStudent({ ...currentStudent, [name]: value.toUpperCase() });
    } else {
      setCurrentStudent({ ...currentStudent, [name]: value });
    }
    
    // Update the fullName if first_name or last_name changes (though these won't be editable)
    if (name === "first_name" || name === "last_name") {
      setCurrentStudent(prev => ({
        ...prev,
        fullName: `${name === "first_name" ? value : prev.first_name} ${name === "last_name" ? value : prev.last_name}`.toUpperCase()
      }));
    }
  };

  // Show confirmation modal for update
  const showUpdateConfirmation = (e) => {
    e.preventDefault();
    setIsConfirmModalOpen(true);
  };

  // Submit updated student after confirmation
  const handleUpdateSubmit = async () => {
    try {
      setIsUpdating(true);
      
      const response = await fetch(`http://localhost:8000/api/v1/students/${currentStudent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          // Only send editable fields
          program: currentStudent.program,
          year_level: currentStudent.year_level,
          block: currentStudent.block.toUpperCase() // Ensure uppercase
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to update student');
      }
      
      // Update local state with the returned data
      const updatedStudents = students.map((student) =>
        student.id === data.id ? {
          ...data,
          fullName: `${data.first_name} ${data.last_name}`.toUpperCase()
        } : student
      );
      
      setStudents(updatedStudents);
      
      // Also update the filtered students
      const updatedFilteredStudents = filteredStudents.map((student) =>
        student.id === data.id ? {
          ...data,
          fullName: `${data.first_name} ${data.last_name}`.toUpperCase()
        } : student
      );
      
      setFilteredStudents(updatedFilteredStudents);
      
      // Close modals
      setIsConfirmModalOpen(false);
      setIsUpdateModalOpen(false);
      setCurrentStudent(null);
      
      // Show success message
      setToastType("success");
      setToastMessage("Student information updated successfully!");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      
    } catch (error) {
      console.error("Error updating student:", error);
      
      // Show error message
      setToastType("error");
      setToastMessage(error.message || "Failed to update student");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      
      // Close confirmation modal but keep update modal open
      setIsConfirmModalOpen(false);
    } finally {
      setIsUpdating(false);
    }
  };

  // Close the update modal
  const closeUpdateModal = () => {
    setIsUpdateModalOpen(false);
    setCurrentStudent(null);
  };

  // Close the confirmation modal
  const closeConfirmModal = () => {
    setIsConfirmModalOpen(false);
  };

  // Get unique programs for filter
  const uniquePrograms = [...new Set(students.map(student => student.program))];

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <Header username="Admin" />

      {/* Main Content - Responsive margin */}
      <div className={`p-3 sm:p-5 transition-all duration-300 ${isMobile ? '' : 'ml-[250px]'}`}>
        {/* Page Title and Search Bar - Responsive layout */}
        <div className="bg-gradient-to-r from-orange-100 to-gray-100 p-4 sm:p-6 rounded-lg shadow-md border border-gray-300 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center">
              <FaUserCog className="text-orange-600 mr-2 sm:mr-3 text-lg sm:text-xl" />
              Manage Student Accounts
            </h1>
            <div className="flex flex-col sm:flex-row w-full sm:w-auto space-y-2 sm:space-y-0 sm:space-x-2">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaFilter className="text-gray-500 text-xs" />
                </div>
                <select
                  value={programFilter}
                  onChange={handleProgramFilter}
                  className="pl-8 sm:pl-10 pr-6 sm:pr-8 py-1.5 sm:py-2 border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 appearance-none bg-white text-[11px] sm:text-sm w-full sm:w-auto"
                >
                  <option value="all">All Programs</option>
                  {uniquePrograms.map(program => (
                    <option key={program} value={program}>{program}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <FaChevronDown className="text-[9px] sm:text-xs" />
                </div>
              </div>
              
              <div className="relative w-full sm:w-auto">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaSearch className="text-orange-500 text-xs sm:text-sm" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearch}
                  placeholder="Search students..."
                  className="w-full sm:w-60 pl-10 pr-4 py-1.5 sm:py-2 border border-orange-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-[11px] sm:text-sm"
                />
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      filterStudents("", programFilter);
                    }}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    <FaTimes className="text-xs" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Results Summary - Mobile text size */}
        <div className="text-[10px] sm:text-sm text-gray-600 mb-3 sm:mb-4">
          Showing {filteredStudents.length} of {students.length} students
          {programFilter !== "all" && <span> in {programFilter}</span>}
          {searchTerm && <span> matching "{searchTerm}"</span>}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
          </div>
        )}

        {/* Mobile Card View - Only visible on mobile */}
        {!loading && (
          <div className="block sm:hidden space-y-3 mb-4">
            {filteredStudents.map((student) => (
              <div key={student.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-3 border-b border-gray-100">
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-medium text-xs text-gray-900">{student.fullName}</div>
                    <div className="flex space-x-1">
                      <span className={`px-2 py-0.5 inline-flex text-[9px] leading-5 font-medium rounded-full ${
                        student.program === "BSIT" ? "bg-blue-100 text-blue-800" :
                        student.program === "BSCS" ? "bg-purple-100 text-purple-800" :
                        "bg-green-100 text-green-800"
                      }`}>
                        {student.program}
                      </span>
                      <span className="px-2 py-0.5 inline-flex text-[9px] leading-5 font-medium rounded-full bg-amber-100 text-amber-800">
                        {student.year_level}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2 mt-2 text-[9px]">
                    <div className="bg-gray-50 p-1.5 rounded">
                      <div className="text-gray-500 mb-0.5">Student No.</div>
                      <div className="font-medium text-gray-800">{student.student_no}</div>
                    </div>
                    <div className="bg-gray-50 p-1.5 rounded">
                      <div className="text-gray-500 mb-0.5">Block</div>
                      <div className="font-medium text-gray-800">{student.block}</div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-2 mt-3">
                    <button
                      className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1 rounded-md hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center text-[10px]"
                      onClick={() => handleUpdate(student)}
                    >
                      <FaEdit className="mr-1" /> Edit
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {filteredStudents.length === 0 && !loading && (
              <div className="text-center py-6 bg-white rounded-lg shadow-sm border border-gray-200">
                <p className="text-gray-500 text-sm">No students found.</p>
              </div>
            )}
          </div>
        )}

        {/* Desktop Table - Hidden on mobile */}
        {!loading && (
          <div className="hidden sm:block overflow-x-auto bg-white rounded-lg shadow-md border border-gray-300">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-orange-50 to-gray-100">
                <tr>
                  <th
                    className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-orange-100 transition-colors"
                    onClick={() => handleSort("fullName")}
                  >
                    <div className="flex items-center">
                      <span>Full Name</span>
                      <div className="ml-1">{getSortIcon("fullName")}</div>
                    </div>
                  </th>
                  <th
                    className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-orange-100 transition-colors"
                    onClick={() => handleSort("student_no")}
                  >
                    <div className="flex items-center">
                      <span>Student No.</span>
                      <div className="ml-1">{getSortIcon("student_no")}</div>
                    </div>
                  </th>
                  <th
                    className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-orange-100 transition-colors hidden sm:table-cell"
                    onClick={() => handleSort("program")}
                  >
                    <div className="flex items-center">
                      <span>Program</span>
                      <div className="ml-1">{getSortIcon("program")}</div>
                    </div>
                  </th>
                  <th
                    className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-orange-100 transition-colors hidden sm:table-cell"
                    onClick={() => handleSort("year_level")}
                  >
                    <div className="flex items-center">
                      <span>Year</span>
                      <div className="ml-1">{getSortIcon("year_level")}</div>
                    </div>
                  </th>
                  <th
                    className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-orange-100 transition-colors hidden sm:table-cell"
                    onClick={() => handleSort("block")}
                  >
                    <div className="flex items-center">
                      <span>Block</span>
                      <div className="ml-1">{getSortIcon("block")}</div>
                    </div>
                  </th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-center text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-orange-50 transition-colors">
                    <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium">{student.fullName}</td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm">{student.student_no}</td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm hidden sm:table-cell">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full ${
                        student.program === "BSIT" ? "bg-blue-100 text-blue-800" :
                        student.program === "BSCS" ? "bg-purple-100 text-purple-800" :
                        "bg-green-100 text-green-800"
                      }`}>
                        {student.program}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm hidden sm:table-cell">
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full bg-amber-100 text-amber-800">
                        {student.year_level}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm hidden sm:table-cell">
                      {student.block}
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-center">
                      <button
                        className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-2 sm:px-4 py-1 sm:py-2 rounded-md hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center text-xs sm:text-sm mx-auto"
                        onClick={() => handleUpdate(student)}
                      >
                        <FaEdit className="mr-1 sm:mr-2" />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredStudents.length === 0 && !loading && (
                  <tr>
                    <td colSpan="6" className="px-4 sm:px-6 py-6 sm:py-8 text-center">
                      <p className="text-gray-500 text-base sm:text-lg">No students found.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Update Modal with blurry transparent background */}
      {isUpdateModalOpen && currentStudent && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm bg-black/30">
          <div className="bg-gradient-to-br from-gray-100 to-white rounded-lg shadow-xl p-4 sm:p-8 w-full max-w-[600px] relative z-10 border-t-4 border-orange-600 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">Update Student</h2>
              <button 
                onClick={closeUpdateModal}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                <FaTimes size={20} />
              </button>
            </div>
            
            <form onSubmit={showUpdateConfirmation} className="space-y-4">
              {/* First Name - Read Only */}
              <div>
                <label htmlFor="first_name" className="block text-xs sm:text-sm font-medium text-gray-700">
                  First Name
                </label>
                <input
                  type="text"
                  id="first_name"
                  name="first_name"
                  value={currentStudent.first_name}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 bg-gray-100 text-gray-600 text-sm cursor-not-allowed"
                  readOnly
                  disabled
                />
              </div>
              
              {/* Last Name - Read Only */}
              <div>
                <label htmlFor="last_name" className="block text-xs sm:text-sm font-medium text-gray-700">
                  Last Name
                </label>
                <input
                  type="text"
                  id="last_name"
                  name="last_name"
                  value={currentStudent.last_name}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 bg-gray-100 text-gray-600 text-sm cursor-not-allowed"
                  readOnly
                  disabled
                />
              </div>
              
              {/* Student No - Read Only */}
              <div>
                <label htmlFor="student_no" className="block text-xs sm:text-sm font-medium text-gray-700">
                  Student No.
                </label>
                <input
                  type="text"
                  id="student_no"
                  name="student_no"
                  value={currentStudent.student_no}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 bg-gray-100 text-gray-600 text-sm cursor-not-allowed"
                  readOnly
                  disabled
                />
              </div>
              
              {/* Program */}
              <div>
                <label htmlFor="program" className="block text-xs sm:text-sm font-medium text-gray-700">
                  Program
                </label>
                <select
                  id="program"
                  name="program"
                  value={currentStudent.program}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                  required
                >
                  <option value="BSIT">BSIT</option>
                  <option value="BSCS">BSCS</option>
                  <option value="BSEMC">BSEMC</option>
                </select>
              </div>
              
              {/* Year Level - Updated to only go up to 3rd year */}
              <div>
                <label htmlFor="year_level" className="block text-xs sm:text-sm font-medium text-gray-700">
                  Year Level
                </label>
                <select
                  id="year_level"
                  name="year_level"
                  value={currentStudent.year_level}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                  required
                >
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                </select>
              </div>
              
              {/* Block - Auto uppercase */}
              <div>
                <label htmlFor="block" className="block text-xs sm:text-sm font-medium text-gray-700">
                  Block
                </label>
                <input
                  type="text"
                  id="block"
                  name="block"
                  value={currentStudent.block}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm uppercase"
                  placeholder="Enter block (e.g., A, B, C)"
                  required
                />
              </div>
              
              <div className="flex justify-end gap-3 sm:gap-4 pt-4">
                <button
                  type="button"
                  onClick={closeUpdateModal}
                  className="px-3 sm:px-5 py-1.5 sm:py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors text-xs sm:text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 sm:px-5 py-1.5 sm:py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors text-xs sm:text-sm"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {isConfirmModalOpen && currentStudent && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm bg-black/30">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-orange-100 mb-4">
                <FaEdit className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Confirm Update</h3>
              <p className="text-sm text-gray-500 mb-4">
                Are you sure you want to update this student's information?
              </p>
              
              {/* Display changes */}
              {originalStudentData && (
                <div className="bg-gray-50 p-3 rounded-lg text-left text-xs mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Changes to be made:</h4>
                  <ul className="space-y-1">
                    {currentStudent.program !== originalStudentData.program && (
                      <li>
                        <span className="font-medium">Program:</span> {originalStudentData.program} → {currentStudent.program}
                      </li>
                    )}
                    {currentStudent.year_level !== originalStudentData.year_level && (
                      <li>
                        <span className="font-medium">Year Level:</span> {originalStudentData.year_level} → {currentStudent.year_level}
                      </li>
                    )}
                    {currentStudent.block !== originalStudentData.block && (
                      <li>
                        <span className="font-medium">Block:</span> {originalStudentData.block} → {currentStudent.block}
                      </li>
                    )}
                  </ul>
                  {currentStudent.program === originalStudentData.program && 
                   currentStudent.year_level === originalStudentData.year_level && 
                   currentStudent.block === originalStudentData.block && (
                    <p className="text-gray-500 text-center">No changes detected</p>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-center gap-4 mt-5">
              <button
                type="button"
                onClick={closeConfirmModal}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateSubmit}
                disabled={isUpdating}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors text-sm font-medium flex items-center"
              >
                {isUpdating ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <FaCheck className="mr-2" /> Confirm
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
          toastType === "success" ? "bg-green-50 border-l-4 border-green-500" : 
          "bg-red-50 border-l-4 border-red-500"
        }`}>
          <div className="flex items-center">
            <div className={`flex-shrink-0 ${
              toastType === "success" ? "text-green-500" : "text-red-500"
            }`}>
              {toastType === "success" ? <FaCheck /> : <FaTimes />}
            </div>
            <div className="ml-3">
              <p className={`text-sm font-medium ${
                toastType === "success" ? "text-green-800" : "text-red-800"
              }`}>
                {toastMessage}
              </p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setShowToast(false)}
                className="inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <FaTimes />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Accounts;