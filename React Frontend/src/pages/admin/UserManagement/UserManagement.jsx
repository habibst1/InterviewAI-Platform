// src/pages/admin/UserManagement/UserManagement.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCompanies, deleteCompany, createAdmin, removeAdmin, getAdmins } from '../../../services/adminService';

// Confirmation Dialog Component
const ConfirmationDialog = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Delete", isDanger = true }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              {isDanger && (
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              )}
              <div className={`mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left ${isDanger ? 'sm:w-full' : ''}`}>
                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                  {title}
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    {message}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm ${
                isDanger 
                  ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' 
                  : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
              }`}
              onClick={onConfirm}
            >
              {confirmText}
            </button>
            <button
              type="button"
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Simple Modal Component ---
const Modal = ({ isOpen, onClose, title, children, size = 'sm:max-w-lg' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" 
        aria-hidden="true"
        onClick={onClose}
      ></div>
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div 
          className={`inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle w-full ${size}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-headline"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
            <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-headline">
              {title}
            </h3>
            <button
              type="button"
              className="text-gray-400 hover:text-gray-500 focus:outline-none"
              onClick={onClose}
              aria-label="Close"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="px-6 py-5 bg-white">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

// Loading Skeleton Component ---
const UserSkeleton = () => (
  <div className="p-6 hover:bg-gray-50 transition-colors animate-pulse">
    <div className="flex items-center justify-between">
      <div className="flex-1 min-w-0">
        <div className="flex items-center">
          <div className="w-12 h-12 rounded-xl bg-gray-200 mr-4"></div>
          <div>
            <div className="h-5 bg-gray-200 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
      </div>
      <div className="ml-6">
        <div className="h-8 w-20 bg-gray-200 rounded"></div>
      </div>
    </div>
  </div>
);

const UserManagement = () => {
  const navigate = useNavigate();

  // --- State for Companies ---
  const [companies, setCompanies] = useState([]);
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [companyError, setCompanyError] = useState('');
  const [deletingCompanyId, setDeletingCompanyId] = useState(null);
  const [companySearchQuery, setCompanySearchQuery] = useState('');

  // --- State for Admins ---
  const [admins, setAdmins] = useState([]);
  const [filteredAdmins, setFilteredAdmins] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [adminError, setAdminError] = useState('');
  const [removingAdminId, setRemovingAdminId] = useState(null);
  const [adminSearchQuery, setAdminSearchQuery] = useState('');

  // --- State for Creating Admin (Modal) ---
  const [newAdminData, setNewAdminData] = useState({ email: '', password: '', department: '' });
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [createAdminError, setCreateAdminError] = useState('');
  const [isCreateAdminModalOpen, setIsCreateAdminModalOpen] = useState(false);

  // --- State for Confirmation Dialogs ---
  const [confirmationDialog, setConfirmationDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    confirmText: 'Delete',
    isDanger: true
  });

  // Fetch Companies
  useEffect(() => {
    const fetchCompanies = async () => {
      setLoadingCompanies(true);
      setCompanyError('');
      try {
        const companyData = await getCompanies();
        setCompanies(companyData);
        setFilteredCompanies(companyData); // Initialize filtered list
      } catch (err) {
        console.error('UserManagement - Failed to fetch companies:', err);
        setCompanyError('Failed to load companies. Please try again.');
        setCompanies([]);
        setFilteredCompanies([]);
      } finally {
        setLoadingCompanies(false);
      }
    };

    fetchCompanies();
  }, []);

  // Fetch Admins
  useEffect(() => {
    const fetchAdmins = async () => {
      setLoadingAdmins(true);
      setAdminError('');
      try {
        const adminData = await getAdmins();
        setAdmins(adminData);
        setFilteredAdmins(adminData); // Initialize filtered list
      } catch (err) {
        console.error('UserManagement - Failed to fetch admins:', err);
        setAdminError('Failed to load admins. Please try again.');
        setAdmins([]);
        setFilteredAdmins([]);
      } finally {
        setLoadingAdmins(false);
      }
    };

    fetchAdmins();
  }, []);

  // --- Apply Search Filters ---
  useEffect(() => {
    let result = [...companies];
    if (companySearchQuery) {
      const query = companySearchQuery.toLowerCase();
      result = result.filter(c => 
        (c.companyName?.toLowerCase().includes(query)) || 
        (c.email?.toLowerCase().includes(query))
      );
    }
    setFilteredCompanies(result);
  }, [companies, companySearchQuery]);

  useEffect(() => {
    let result = [...admins];
    if (adminSearchQuery) {
      const query = adminSearchQuery.toLowerCase();
      result = result.filter(a => 
        (a.email?.toLowerCase().includes(query)) || 
        (a.department?.toLowerCase().includes(query))
      );
    }
    setFilteredAdmins(result);
  }, [admins, adminSearchQuery]);

  // --- Apply Search Filters ---
  useEffect(() => {
    let result = [...companies];
    if (companySearchQuery) {
      const query = companySearchQuery.toLowerCase();
      result = result.filter(c => 
        (c.companyName?.toLowerCase().includes(query)) || 
        (c.email?.toLowerCase().includes(query))
      );
    }
    setFilteredCompanies(result);
  }, [companies, companySearchQuery]);

  useEffect(() => {
    let result = [...admins];
    if (adminSearchQuery) {
      const query = adminSearchQuery.toLowerCase();
      result = result.filter(a => 
        (a.email?.toLowerCase().includes(query)) || 
        (a.department?.toLowerCase().includes(query))
      );
    }
    setFilteredAdmins(result);
  }, [admins, adminSearchQuery]);

  // --- Open Confirmation Dialog ---
  const openConfirmationDialog = ({ title, message, onConfirm, confirmText = "Delete", isDanger = true }) => {
    setConfirmationDialog({
      isOpen: true,
      title,
      message,
      onConfirm,
      confirmText,
      isDanger
    });
  };

  const closeConfirmationDialog = () => {
    setConfirmationDialog({
      isOpen: false,
      title: '',
      message: '',
      onConfirm: null,
      confirmText: 'Delete',
      isDanger: true
    });
  };

  const handleDeleteCompany = async (companyId, companyName) => {
    // Use the confirmation dialog
    openConfirmationDialog({
      title: "Delete Company",
      message: `Are you sure you want to delete the company "${companyName}"? This action cannot be undone.`,
      onConfirm: async () => {
        closeConfirmationDialog();
        setDeletingCompanyId(companyId);
        setCompanyError('');
        try {
          await deleteCompany(companyId);
          setCompanies(prev => prev.filter(c => c.id !== companyId));
          // Update filtered list if search is active
          if (companySearchQuery) {
              setFilteredCompanies(prev => prev.filter(c => c.id !== companyId));
          }
        } catch (err) {
          console.error('UserManagement - Failed to delete company:', err);
          setCompanyError(`Failed to delete company "${companyName}". Please try again.`);
        } finally {
          setDeletingCompanyId(null);
        }
      },
      confirmText: "Delete",
      isDanger: true
    });
  };

  const handleRemoveAdmin = async (adminId, adminEmail) => {
    // Use the confirmation dialog
    openConfirmationDialog({
      title: "Remove Administrator",
      message: `Are you sure you want to remove the administrator "${adminEmail}"? They will lose access.`,
      onConfirm: async () => {
        closeConfirmationDialog();
        setRemovingAdminId(adminId);
        setAdminError('');
        try {
          await removeAdmin(adminId);
          setAdmins(prevAdmins => prevAdmins.filter(admin => admin.id !== adminId));
          // Update filtered list if search is active
          if (adminSearchQuery) {
              setFilteredAdmins(prev => prev.filter(a => a.id !== adminId));
          }
        } catch (err) {
          console.error('UserManagement - Failed to remove admin:', err);
          if (err.response?.data?.message) {
            setAdminError(`Failed to remove admin: ${err.response.data.message}`);
          } else {
            setAdminError(`Failed to remove admin "${adminEmail}". Please try again.`);
          }
        } finally {
          setRemovingAdminId(null);
        }
      },
      confirmText: "Remove",
      isDanger: true
    });
  };

  const handleCreateAdminChange = (e) => {
    const { name, value } = e.target;
    setNewAdminData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (!newAdminData.email || !newAdminData.password) {
      setCreateAdminError('Email and password are required.');
      return;
    }
    setIsCreatingAdmin(true);
    setCreateAdminError('');
    try {
      const newAdmin = await createAdmin(newAdminData);
      try {
        const updatedAdmins = await getAdmins();
        setAdmins(updatedAdmins);
        setFilteredAdmins(updatedAdmins); // Refresh filtered list too
      } catch (refreshError) {
        console.error("Failed to refresh admin list after creation:", refreshError);
        // Optimistically add to local state if refresh fails
        setAdmins(prev => [...prev, newAdmin]);
        if (adminSearchQuery) {
            setFilteredAdmins(prev => [...prev, newAdmin]);
        }
      }
      // Reset form and close modal
      setNewAdminData({ email: '', password: '', department: '' });
      setIsCreateAdminModalOpen(false);
      // --- Add success feedback ---
      alert(`Admin user ${newAdmin.email} created successfully!`); 
    } catch (err) {
      console.error('UserManagement - Failed to create admin:', err);
      if (err.response?.data?.message) {
        setCreateAdminError(`Failed to create admin: ${err.response.data.message}`);
      } else {
        setCreateAdminError('Failed to create admin. Please try again.');
      }
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  const openCreateAdminModal = () => {
    setNewAdminData({ email: '', password: '', department: '' });
    setCreateAdminError('');
    setIsCreatingAdmin(false);
    setIsCreateAdminModalOpen(true);
  };

  // --- Dismiss Errors ---
  const dismissCompanyError = () => setCompanyError('');
  const dismissAdminError = () => setAdminError('');
  const dismissCreateAdminError = () => setCreateAdminError('');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
              <p className="text-gray-600 mt-1">Manage companies and administrators</p>
            </div>
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Create Admin Button */}
        <div className="flex justify-end mb-6">
          <button
            onClick={openCreateAdminModal}
            className="px-5 py-2.5 bg-gradient-to-r from-gray-600 to-gray-800 text-white rounded-lg hover:from-gray-700 hover:to-gray-900 transition-all font-medium shadow-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add New Admin
          </button>
        </div>

        {/* Create Admin Modal */}
        <Modal
          isOpen={isCreateAdminModalOpen}
          onClose={() => setIsCreateAdminModalOpen(false)}
          title="Add New Admin"
          size="sm:max-w-md" // Slightly smaller modal
        >
          {/* --- Make error dismissible --- */}
          {createAdminError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-2 flex-1">
                  <h3 className="text-red-800 font-medium">{createAdminError}</h3>
                </div>
                <button
                  onClick={dismissCreateAdminError}
                  className="flex-shrink-0 ml-2 text-red-500 hover:text-red-700"
                  aria-label="Dismiss"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          {/* --- Make error dismissible --- */}
          <form onSubmit={handleCreateAdmin} className="space-y-5">
            <div>
              <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700 mb-2">
                Admin Email
              </label>
              <input
                type="email"
                id="adminEmail"
                name="email"
                value={newAdminData.email}
                onChange={handleCreateAdminChange}
                required
                disabled={isCreatingAdmin}
                placeholder="admin@example.com"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label htmlFor="adminPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                id="adminPassword"
                name="password"
                value={newAdminData.password}
                onChange={handleCreateAdminChange}
                required
                disabled={isCreatingAdmin}
                placeholder="Secure password"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label htmlFor="adminDepartment" className="block text-sm font-medium text-gray-700 mb-2">
                Department (Optional)
              </label>
              <input
                type="text"
                id="adminDepartment"
                name="department"
                value={newAdminData.department}
                onChange={handleCreateAdminChange}
                disabled={isCreatingAdmin}
                placeholder="e.g., HR, IT"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCreateAdminModalOpen(false)}
                disabled={isCreatingAdmin}
                className="px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreatingAdmin}
                className="px-4 py-2.5 bg-gradient-to-r from-gray-600 to-gray-800 text-white rounded-lg hover:from-gray-700 hover:to-gray-900 transition-all font-medium shadow disabled:opacity-50 flex items-center gap-2"
              >
                {isCreatingAdmin ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Creating...
                  </>
                ) : (
                  'Create Admin'
                )}
              </button>
            </div>
          </form>
        </Modal>

        {/* Admins List Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-gray-900">Administrators</h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                {admins.length} total
              </span>
              {adminSearchQuery && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {filteredAdmins.length} filtered
                </span>
              )}
            </div>
            {/* --- Search for Admins --- */}
            <div className="relative w-full sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={adminSearchQuery}
                onChange={(e) => setAdminSearchQuery(e.target.value)}
                placeholder="Search admins..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* --- Make error dismissible --- */}
          {adminError && (
            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-2 flex-1">
                  <h3 className="text-red-800 font-medium">{adminError}</h3>
                </div>
                <button
                  onClick={dismissAdminError}
                  className="flex-shrink-0 ml-2 text-red-500 hover:text-red-700"
                  aria-label="Dismiss"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {loadingAdmins ? (
            <div className="divide-y divide-gray-100">
              {[...Array(3)].map((_, i) => <UserSkeleton key={i} />)}
            </div>
          ) : filteredAdmins.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {filteredAdmins.map((admin) => (
                <div key={admin.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center mr-4 flex-shrink-0">
                          <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base font-semibold text-gray-900 truncate">
                            {admin.email}
                          </h3>
                          {admin.department && (
                            <p className="text-gray-600 text-sm truncate">
                              <span className="font-medium">Department:</span> {admin.department}
                            </p>
                          )}
                          <div className="flex items-center text-xs text-gray-500 mt-1">
                            <svg className="flex-shrink-0 mr-1 h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                            </svg>
                            <time dateTime={admin.createdAt}>
                              {new Date(admin.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </time>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <button
                        onClick={() => handleRemoveAdmin(admin.id, admin.email)}
                        disabled={removingAdminId === admin.id}
                        className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors font-medium text-sm disabled:opacity-50 flex items-center gap-1"
                      >
                        {removingAdminId === admin.id ? (
                          <>
                            <span className="w-3 h-3 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></span>
                            Removing
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1v3M4 7h16" />
                            </svg>
                            Remove
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-base font-medium text-gray-900 mb-1">
                {admins.length > 0 ? 'No matching administrators found' : 'No administrators found'}
              </h3>
              <p className="text-gray-500 text-sm">
                {admins.length > 0 ? 'Try adjusting your search.' : 'Create an admin user to get started.'}
              </p>
              {admins.length === 0 && (
                <button
                  onClick={openCreateAdminModal}
                  className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm"
                >
                  Create Admin
                </button>
              )}
            </div>
          )}
        </div>

        {/* Companies List Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-gray-900">Companies</h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                {companies.length} total
              </span>
              {companySearchQuery && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {filteredCompanies.length} filtered
                </span>
              )}
            </div>
            {/* --- Search for Companies --- */}
            <div className="relative w-full sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={companySearchQuery}
                onChange={(e) => setCompanySearchQuery(e.target.value)}
                placeholder="Search companies..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* --- Make error dismissible --- */}
          {companyError && (
            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-2 flex-1">
                  <h3 className="text-red-800 font-medium">{companyError}</h3>
                </div>
                <button
                  onClick={dismissCompanyError}
                  className="flex-shrink-0 ml-2 text-red-500 hover:text-red-700"
                  aria-label="Dismiss"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {loadingCompanies ? (
            <div className="divide-y divide-gray-100">
              {[...Array(3)].map((_, i) => <UserSkeleton key={i} />)}
            </div>
          ) : filteredCompanies.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {filteredCompanies.map((company) => (
                <div key={company.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        {/* Company Logo or Default Icon */}
                        <div className="w-12 h-12 rounded-xl  flex items-center justify-center mr-4 flex-shrink-0 overflow-hidden">
                          {company.logoUrl ? (
                            <img 
                              src={`http://localhost:5143/${company.logoUrl}`} 
                              alt={company.companyName || 'Company logo'}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                // Hide the image and show the default icon if image fails to load
                                e.target.style.display = 'none';
                                e.target.parentNode.innerHTML = `
                                  <svg class="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                  </svg>
                                `;
                              }}
                            />
                          ) : (
                            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base font-semibold text-gray-900 truncate">
                            {company.companyName || 'Unnamed Company'}
                          </h3>
                          <p className="text-gray-600 text-sm truncate">{company.email}</p>
                          <div className="flex items-center text-xs text-gray-500 mt-1">
                            <svg className="flex-shrink-0 mr-1 h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                            </svg>
                            <time dateTime={company.createdAt}>
                              {new Date(company.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </time>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <button
                        onClick={() => handleDeleteCompany(company.id, company.companyName || 'Unnamed Company')}
                        disabled={deletingCompanyId === company.id}
                        className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors font-medium text-sm disabled:opacity-50 flex items-center gap-1"
                      >
                        {deletingCompanyId === company.id ? (
                          <>
                            <span className="w-3 h-3 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></span>
                            Deleting
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1v3M4 7h16" />
                            </svg>
                            Delete
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-base font-medium text-gray-900 mb-1">
                {companies.length > 0 ? 'No matching companies found' : 'No companies found'}
              </h3>
              <p className="text-gray-500 text-sm">
                {companies.length > 0 ? 'Try adjusting your search.' : 'Companies that register will appear here.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* --- Confirmation Dialog --- */}
      <ConfirmationDialog
        isOpen={confirmationDialog.isOpen}
        onClose={closeConfirmationDialog}
        onConfirm={confirmationDialog.onConfirm}
        title={confirmationDialog.title}
        message={confirmationDialog.message}
        confirmText={confirmationDialog.confirmText}
        isDanger={confirmationDialog.isDanger}
      />
    </div>
  );
};

export default UserManagement;