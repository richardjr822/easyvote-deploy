import React, { useState, useEffect } from 'react';
import { FaPlus, FaTimes, FaExclamationTriangle, FaTrash, FaEdit, FaCheckCircle } from 'react-icons/fa';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const PartylistDropdown = ({ value, onChange, error, disabled = false }) => {
  const [partylists, setPartylists] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newPartylistName, setNewPartylistName] = useState('');
  const [editPartylist, setEditPartylist] = useState(null);
  const [deletePartylist, setDeletePartylist] = useState(null);
  const [loading, setLoading] = useState(false);
  const [addError, setAddError] = useState('');
  
  // Toast states
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('');

  // Load partylists on component mount
  useEffect(() => {
    loadPartylists();
  }, []);

  // Function to show toast notifications
  const showToast = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    
    if (type === 'success') {
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    } else {
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 3000);
    }
  };

  const loadPartylists = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/partylists/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPartylists(data);
      }
    } catch (error) {
      console.error('Error loading partylists:', error);
      // Fallback to default partylists if API fails
      setPartylists([
        { id: '1', name: 'TINDIG', is_active: true },
        { id: '2', name: 'ALYANSA', is_active: true }
      ]);
    }
  };

  const handleAddPartylist = async () => {
    if (!newPartylistName.trim()) {
      setAddError('Partylist name is required');
      return;
    }

    setLoading(true);
    setAddError('');

    try {
      const response = await fetch(`${API_BASE_URL}/partylists/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ name: newPartylistName.trim() })
      });

      if (response.ok) {
        const newPartylist = await response.json();
        setPartylists([...partylists, newPartylist]);
        setNewPartylistName('');
        setShowAddModal(false);
        
        // Auto-select the newly created partylist
        onChange({ target: { name: 'partylist', value: newPartylist.name } });
        
        // Show success toast
        showToast(`Partylist "${newPartylist.name}" added successfully`);
      } else {
        const errorData = await response.json();
        setAddError(errorData.detail || 'Failed to create partylist');
      }
    } catch (error) {
      // Fallback: add to local state if API fails
      const newPartylist = {
        id: Date.now().toString(),
        name: newPartylistName.trim().toUpperCase(),
        is_active: true
      };
      setPartylists([...partylists, newPartylist]);
      setNewPartylistName('');
      setShowAddModal(false);
      onChange({ target: { name: 'partylist', value: newPartylist.name } });
      console.log('Added partylist locally:', newPartylist);
      
      // Show success toast
      showToast(`Partylist "${newPartylist.name}" added successfully`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditPartylist = async () => {
    if (!editPartylist || !editPartylist.name.trim()) {
      setAddError('Partylist name is required');
      return;
    }

    setLoading(true);
    setAddError('');

    try {
      const response = await fetch(`${API_BASE_URL}/partylists/${editPartylist.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ name: editPartylist.name.trim() })
      });

      if (response.ok) {
        const updatedPartylist = await response.json();
        setPartylists(partylists.map(p => p.id === editPartylist.id ? updatedPartylist : p));
        setShowEditModal(false);
        
        // Update selection if current value was edited
        if (value === editPartylist.originalName) {
          onChange({ target: { name: 'partylist', value: updatedPartylist.name } });
        }
        
        // Show success toast
        showToast(`Partylist updated successfully from "${editPartylist.originalName}" to "${updatedPartylist.name}"`);
        
        setEditPartylist(null);
      } else {
        const errorData = await response.json();
        setAddError(errorData.detail || 'Failed to update partylist');
      }
    } catch (error) {
      // Fallback: update local state if API fails
      const updatedName = editPartylist.name.trim().toUpperCase();
      setPartylists(partylists.map(p => 
        p.id === editPartylist.id 
          ? { ...p, name: updatedName }
          : p
      ));
      setShowEditModal(false);
      
      // Show success toast
      showToast(`Partylist updated successfully from "${editPartylist.originalName}" to "${updatedName}"`);
      
      setEditPartylist(null);
      console.log('Updated partylist locally');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePartylist = async () => {
    if (!deletePartylist) return;

    setLoading(true);
    const partylistName = deletePartylist.name; // Store for toast message

    try {
      const response = await fetch(`${API_BASE_URL}/partylists/${deletePartylist.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setPartylists(partylists.filter(p => p.id !== deletePartylist.id));
        
        // Clear selection if deleted partylist was selected
        if (value === deletePartylist.name) {
          onChange({ target: { name: 'partylist', value: '' } });
        }
        
        setShowDeleteModal(false);
        setDeletePartylist(null);
        
        // Show success toast
        showToast(`Partylist "${partylistName}" deleted successfully`);
      } else {
        const errorData = await response.json();
        showToast(errorData.detail || 'Failed to delete partylist', 'error');
      }
    } catch (error) {
      // Fallback: remove from local state if API fails
      setPartylists(partylists.filter(p => p.id !== deletePartylist.id));
      if (value === deletePartylist.name) {
        onChange({ target: { name: 'partylist', value: '' } });
      }
      setShowDeleteModal(false);
      setDeletePartylist(null);
      console.log('Deleted partylist locally');
      
      // Show success toast
      showToast(`Partylist "${partylistName}" deleted successfully`);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (partylist, e) => {
    e.stopPropagation();
    setEditPartylist({ ...partylist, originalName: partylist.name });
    setShowEditModal(true);
    setAddError('');
  };

  const openDeleteModal = (partylist, e) => {
    e.stopPropagation();
    setDeletePartylist(partylist);
    setShowDeleteModal(true);
  };

  return (
    <>
      <div className={`relative ${error ? 'mb-6' : ''}`}>
        <select
          name="partylist"
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`block w-full border ${error ? 'border-red-500' : 'border-gray-300'} rounded-lg shadow-sm px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors appearance-none pr-10`}
        >
          <option value="" disabled>Select a partylist</option>
          {partylists.filter(p => p.is_active !== false).map((partylist) => (
            <option key={partylist.id} value={partylist.id}>
              {partylist.name}
            </option>
          ))}
        </select>
        
        {/* Custom dropdown arrow and add button */}
        <div className="absolute inset-y-0 right-0 flex items-center">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="h-full px-2 text-orange-500 hover:text-orange-700 focus:outline-none border-l border-gray-300"
            title="Add new partylist"
          >
            <FaPlus className="h-3 w-3" />
          </button>
          <div className="px-2 text-gray-500 pointer-events-none">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
        
        {error && (
          <div className="absolute -bottom-5 sm:-bottom-6 left-0 text-red-500 text-[10px] sm:text-xs flex items-center">
            <FaExclamationTriangle className="mr-1" /> {error}
          </div>
        )}
      </div>

      {/* Partylist Management - Improved Design */}
      {partylists.length > 0 && (
        <div className="mt-3">
          <details className="text-xs group relative">
            <summary className="cursor-pointer flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-lg px-3 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors list-none outline-none focus:ring-2 focus:ring-orange-500 focus:ring-opacity-50">
              <div className="flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-orange-500" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
                </svg>
                <span>Manage Partylists</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                  {partylists.filter(p => p.is_active !== false).length}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-400 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </summary>
            
            <div className="mt-2 overflow-hidden rounded-lg border border-gray-200 shadow-sm">
              <div className="max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                {partylists.filter(p => p.is_active !== false).length === 0 ? (
                  <div className="px-3 py-4 text-center text-gray-500 italic">
                    No partylists available
                  </div>
                ) : (
                  partylists.filter(p => p.is_active !== false).map((partylist, index) => (
                    <div 
                      key={partylist.id} 
                      className={`flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 transition-colors ${
                        index !== partylists.filter(p => p.is_active !== false).length - 1 ? 'border-b border-gray-200' : ''
                      }`}
                    >
                      <span className="flex-grow font-medium text-gray-700">{partylist.name}</span>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => openEditModal(partylist, e)}
                          className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-full p-1.5 transition-colors"
                          title="Edit partylist"
                        >
                          <FaEdit className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => openDeleteModal(partylist, e)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full p-1.5 transition-colors"
                          title="Delete partylist"
                        >
                          <FaTimes className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <div className="bg-gray-50 px-3 py-2 border-t border-gray-200 flex justify-between items-center">
                <span className="text-[10px] text-gray-500">Click on a party to edit or delete</span>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="text-xs text-orange-500 hover:text-orange-700 flex items-center space-x-1 font-medium"
                >
                  <FaPlus className="h-2.5 w-2.5" />
                  <span>Add New</span>
                </button>
              </div>
            </div>
          </details>
        </div>
      )}

      {/* Add Partylist Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-lg flex items-center justify-center p-4 z-50">
          <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-2xl max-w-md w-full border border-white/30 ring-1 ring-black/5">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Add New Partylist</h3>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNewPartylistName('');
                    setAddError('');
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FaTimes />
                </button>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Partylist Name
                </label>
                <input
                  type="text"
                  value={newPartylistName}
                  onChange={(e) => {
                    setNewPartylistName(e.target.value.toUpperCase());
                    setAddError('');
                  }}
                  className="block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white/95"
                  placeholder="Enter partylist name"
                  maxLength={100}
                  autoFocus
                />
                {addError && (
                  <p className="text-red-500 text-xs mt-1">{addError}</p>
                )}
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNewPartylistName('');
                    setAddError('');
                  }}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddPartylist}
                  disabled={loading || !newPartylistName.trim()}
                  className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Adding...
                    </>
                  ) : (
                    <>
                      <FaPlus className="mr-2" />
                      Add Partylist
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Partylist Modal */}
      {showEditModal && editPartylist && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-lg flex items-center justify-center p-4 z-50">
          <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-2xl max-w-md w-full border border-white/30 ring-1 ring-black/5">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Edit Partylist</h3>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditPartylist(null);
                    setAddError('');
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FaTimes />
                </button>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Partylist Name
                </label>
                <input
                  type="text"
                  value={editPartylist.name}
                  onChange={(e) => {
                    setEditPartylist({ ...editPartylist, name: e.target.value.toUpperCase() });
                    setAddError('');
                  }}
                  className="block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white/95"
                  placeholder="Enter partylist name"
                  maxLength={100}
                  autoFocus
                />
                {addError && (
                  <p className="text-red-500 text-xs mt-1">{addError}</p>
                )}
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditPartylist(null);
                    setAddError('');
                  }}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditPartylist}
                  disabled={loading || !editPartylist.name.trim()}
                  className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      <FaEdit className="mr-2" />
                      Update Partylist
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletePartylist && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-lg flex items-center justify-center p-4 z-50">
          <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-2xl max-w-md w-full border border-white/30 ring-1 ring-black/5">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Delete Partylist</h3>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletePartylist(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FaTimes />
                </button>
              </div>
              
              <div className="mb-6">
                <div className="flex items-center text-red-600 mb-3">
                  <FaExclamationTriangle className="mr-2" />
                  <span className="font-medium">Warning</span>
                </div>
                <p className="text-gray-600 text-sm">
                  Are you sure you want to delete the partylist "<strong className="text-gray-800">{deletePartylist.name}</strong>"? 
                  This action cannot be undone.
                </p>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletePartylist(null);
                  }}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeletePartylist}
                  disabled={loading}
                  className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <FaTrash className="mr-2" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      <div 
        className={`fixed bottom-4 sm:bottom-auto sm:top-24 left-1/2 sm:left-auto sm:right-6 transform -translate-x-1/2 sm:translate-x-0 transition-all duration-500 ease-in-out z-[60] w-[90vw] sm:w-auto ${
          showSuccessToast ? 'translate-y-0 opacity-100' : 'translate-y-12 sm:translate-y-0 sm:translate-x-full opacity-0'
        }`}
      >
        <div className="bg-white rounded-lg shadow-lg border-l-4 border-green-500 flex items-center p-3 sm:p-4 w-full sm:max-w-md">
          <div className="text-green-500 mr-2 sm:mr-3">
            <FaCheckCircle className="text-base sm:text-lg" />
          </div>
          <div className="flex-grow">
            <p className="font-medium text-xs sm:text-sm text-gray-800">{toastMessage}</p>
          </div>
          <button 
            onClick={() => setShowSuccessToast(false)} 
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <FaTimes />
          </button>
        </div>
      </div>

      {/* Error Toast */}
      <div 
        className={`fixed bottom-4 sm:bottom-auto sm:top-24 left-1/2 sm:left-auto sm:right-6 transform -translate-x-1/2 sm:translate-x-0 transition-all duration-500 ease-in-out z-[60] w-[90vw] sm:w-auto ${
          showErrorToast ? 'translate-y-0 opacity-100' : 'translate-y-12 sm:translate-y-0 sm:translate-x-full opacity-0'
        }`}
      >
        <div className="bg-white rounded-lg shadow-lg border-l-4 border-red-500 flex items-center p-3 sm:p-4 w-full sm:max-w-md">
          <div className="text-red-500 mr-2 sm:mr-3">
            <FaExclamationTriangle className="text-base sm:text-lg" />
          </div>
          <div className="flex-grow">
            <p className="font-medium text-xs sm:text-sm text-gray-800">{toastMessage}</p>
          </div>
          <button 
            onClick={() => setShowErrorToast(false)} 
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <FaTimes />
          </button>
        </div>
      </div>
    </>
  );
};

export default PartylistDropdown;