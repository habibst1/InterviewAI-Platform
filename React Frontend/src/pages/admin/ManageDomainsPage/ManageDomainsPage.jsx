// src/pages/admin/ManageDomainsPage/ManageDomainsPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { getAllDomains, createDomain, deleteDomain, updateDomain } from '../../../services/adminService';

// Simple Modal Component
const Modal = ({ isOpen, onClose, title, children, size = 'sm:max-w-lg' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Background Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" 
        aria-hidden="true"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* This element tricks the browser into centering the modal contents. */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div 
          className={`inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:w-full ${size}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-headline"
          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
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

const ManageDomainsPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // State for Creating Domain (Modal) ---
  const [newDomainName, setNewDomainName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  // State for Modal Visibility ---
  const [isCreateDomainModalOpen, setIsCreateDomainModalOpen] = useState(false);
  // State for Modal Visibility ---

  const [deletingDomainId, setDeletingDomainId] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const [uploadingLogoId, setUploadingLogoId] = useState(null);
  const [logoUploadError, setLogoUploadError] = useState('');

  const [editingDomainId, setEditingDomainId] = useState(null);
  const [editDomainName, setEditDomainName] = useState('');

  const [selectedLogoFile, setSelectedLogoFile] = useState(null);
  const [previewLogoUrl, setPreviewLogoUrl] = useState('');

  useEffect(() => {
    const fetchDomains = async () => {
      try {
        setLoading(true);
        setError('');
        setDeleteError('');
        console.log("Fetching all domains...");
        const domainData = await getAllDomains();
        console.log("Domains fetched:", domainData);
        const sortedDomains = domainData.sort((a, b) => a.name.localeCompare(b.name));
        setDomains(sortedDomains);
      } catch (err) {
        console.error('ManageDomainsPage - Failed to fetch domains:', err);
        if (err.response && err.response.data) {
          setError(`Failed to load domains: ${err.response.data.message || 'Unknown error'}`);
        } else {
          setError('Failed to load domains. Please check your connection and try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDomains();
  }, []);

  const handleDeleteDomain = async (domainId, domainName) => {
    if (!window.confirm(`Are you sure you want to delete the domain "${domainName}"? This will also delete all associated questions.`)) {
      return;
    }

    setDeletingDomainId(domainId);
    setDeleteError('');
    setError('');

    try {
      console.log("Deleting domain:", domainId);
      await deleteDomain(domainId);
      console.log("Domain deleted:", domainId);
      setDomains(prevDomains => prevDomains.filter(domain => domain.id !== domainId));
    } catch (err) {
      console.error('ManageDomainsPage - Failed to delete domain:', err);
      if (err.response && err.response.data) {
        if (err.response.status === 404) {
          setDeleteError(`Domain "${domainName}" not found.`);
        } else {
          setDeleteError(`Failed to delete domain "${domainName}": ${err.response.data.message || 'Unknown error'}`);
        }
      } else {
        setDeleteError(`Failed to delete domain "${domainName}". Please try again.`);
      }
    } finally {
      setDeletingDomainId(null);
    }
  };

  const handleLogoUpload = async (domainId, file) => {
    setUploadingLogoId(domainId);
    setLogoUploadError('');

    try {
      console.log(`Uploading logo for domain ${domainId}:`, file.name);
      const updatedDomainData = await updateDomain({ 
        id: domainId, 
        name: domains.find(d => d.id === domainId)?.name || '', // Preserve existing name
        logo: file // Pass the File object
      });
      console.log("Logo uploaded successfully:", updatedDomainData);

      setDomains(prevDomains => 
        prevDomains.map(domain => 
          domain.id === domainId 
            ? { ...domain, logoUrl: updatedDomainData.logoUrl } 
            : domain
        )
      );
    } catch (err) {
      console.error('ManageDomainsPage - Failed to upload logo:', err);
      if (err.response && err.response.data) {
        setLogoUploadError(`Failed to upload logo: ${err.response.data.message || 'Unknown error'}`);
      } else {
        setLogoUploadError('Failed to upload logo. Please try again.');
      }
    } finally {
      setUploadingLogoId(null);
    }
  };

  const handleLogoClick = (domainId) => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
          setLogoUploadError('Invalid file type. Please select a JPG, PNG, GIF, or WebP image.');
          return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
          setLogoUploadError('File size exceeds 5MB limit. Please select a smaller image.');
          return;
        }
        
        handleLogoUpload(domainId, file);
      }
    };
    
    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
  };

  const handleUpdateDomainName = async (domainId, newName) => {
    if (!newName.trim()) {
      setError('Domain name cannot be empty.');
      return;
    }

    try {
      setError('');
      console.log(`Updating domain ${domainId} name to:`, newName);
      
      const updatedDomainData = await updateDomain({ 
        id: domainId, 
        name: newName.trim(),
        logo: null // Don't change the logo
      });
      
      console.log("Domain name updated:", updatedDomainData);
      
      setDomains(prevDomains => 
        prevDomains.map(domain => 
          domain.id === domainId 
            ? { ...domain, name: newName.trim() } 
            : domain
        )
      );
      
      setEditingDomainId(null);
      setEditDomainName('');
    } catch (err) {
      console.error('ManageDomainsPage - Failed to update domain name:', err);
      if (err.response && err.response.data) {
        setError(`Failed to update domain: ${err.response.data.message || 'Unknown error'}`);
      } else {
        setError('Failed to update domain. Please try again.');
      }
    } finally {
    }
  };

  const handleLogoFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setLogoUploadError('Invalid file type. Please select a JPG, PNG, GIF, or WebP image.');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        setLogoUploadError('File size exceeds 5MB limit. Please select a smaller image.');
        return;
      }
      
      setSelectedLogoFile(file);
      setPreviewLogoUrl(URL.createObjectURL(file));
      setLogoUploadError('');
    }
  };

  const handleRemoveLogo = () => {
    setSelectedLogoFile(null);
    setPreviewLogoUrl('');
    setLogoUploadError('');
    // Reset the file input value if it exists
    const fileInput = document.getElementById('logo-upload-input-modal'); // Use modal-specific ID
    if (fileInput) {
        fileInput.value = '';
    }
  };

  const handleCreateDomain = async (e) => {
    e.preventDefault();
    if (!newDomainName.trim()) {
      setCreateError('Domain name cannot be empty.');
      return;
    }

    setIsCreating(true);
    setCreateError('');
    setError(''); // Clear general error

    try {
      console.log("Creating new domain:", newDomainName);
      
      const domainData = {
        name: newDomainName.trim()
      };
      
      if (selectedLogoFile) {
        domainData.logo = selectedLogoFile;
      }

      const newDomainData = await createDomain(domainData);
      console.log("Domain created:", newDomainData);
      
      setDomains(prevDomains => {
        const updatedDomains = [...prevDomains, newDomainData];
        return updatedDomains.sort((a, b) => a.name.localeCompare(b.name));
      });
      
      // Close the modal and reset form state on success
      setIsCreateDomainModalOpen(false);
      setNewDomainName('');
      setSelectedLogoFile(null);
      setPreviewLogoUrl('');
      setCreateError(''); // Clear any previous create error
      
    } catch (err) {
      console.error('ManageDomainsPage - Failed to create domain:', err);
      if (err.response && err.response.data) {
        if (err.response.data.code === 'DOMAIN_ALREADY_EXISTS') {
          setCreateError('A domain with this name already exists.');
        } else if (err.response.data.code === 'DOMAIN_NAME_REQUIRED') {
          setCreateError('Domain name is required.');
        } else {
          setCreateError(`Failed to create domain: ${err.response.data.message || 'Unknown error'}`);
        }
      } else {
        setCreateError('Failed to create domain. Please try again.');
      }
    } finally {
      setIsCreating(false);
    }
  };

  // Function to open the modal and reset form state ---
  const openCreateDomainModal = () => {
    // Reset form state when opening the modal
    setNewDomainName('');
    setSelectedLogoFile(null);
    setPreviewLogoUrl('');
    setCreateError('');
    setIsCreating(false);
    setIsCreateDomainModalOpen(true);
  };

  const closeCreateDomainModal = () => {
    setIsCreateDomainModalOpen(false);
    // Ensure form is reset when closing
    setNewDomainName('');
    setSelectedLogoFile(null);
    setPreviewLogoUrl('');
    setCreateError('');
    setIsCreating(false);
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading Domains</h3>
          <p className="text-gray-600">Fetching domain data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Manage Domains</h1>
              <p className="text-gray-600 mt-1">Create and organize interview domains</p>
            </div>
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Create Domain Button */}
        <div className="flex justify-end mb-6">
          <button
            onClick={openCreateDomainModal} // Open the modal
            className="px-5 py-2.5 bg-gradient-to-r from-gray-600 to-gray-800 text-white rounded-lg hover:from-gray-700 hover:to-gray-900 transition-all font-medium shadow-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create New Domain
          </button>
        </div>

        {/* Create Domain Modal */}
        <Modal
          isOpen={isCreateDomainModalOpen}
          onClose={closeCreateDomainModal} // Close the modal
          title="Create New Domain"
          size="sm:max-w-md" // Slightly smaller modal for compact form
        >
          {/* Error Message inside Modal */}
          {createError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-2">
                  <h3 className="text-red-800 font-medium">{createError}</h3>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleCreateDomain} className="space-y-5">
            <div>
              <label htmlFor="domainNameModal" className="block text-sm font-medium text-gray-700 mb-2">
                Domain Name
              </label>
              <input
                type="text"
                id="domainNameModal" // Unique ID for modal
                value={newDomainName}
                onChange={(e) => setNewDomainName(e.target.value)}
                required
                disabled={isCreating}
                placeholder="e.g., React, Data Science, Machine Learning"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Logo Upload Section for Modal */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Domain Logo (Optional)
              </label>
              <div className="flex items-center space-x-6">
                <div 
                  className="flex-shrink-0 cursor-pointer group"
                  onClick={() => {
                    if (!isCreating) {
                      const fileInput = document.getElementById('logo-upload-input-modal');
                      if (fileInput) {
                        fileInput.click();
                      }
                    }
                  }}
                >
                  <div className={`w-16 h-16 rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden transition-all duration-200 ${
                    !isCreating ? 'hover:border-gray-400 hover:bg-gray-200' : 'opacity-50 cursor-not-allowed'
                  }`}>
                    {previewLogoUrl ? (
                      <img 
                        src={previewLogoUrl} 
                        alt="Logo preview" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center">
                        <svg className={`w-8 h-8 ${!isCreating ? 'text-gray-400 group-hover:text-gray-600' : 'text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>

                <input
                  id="logo-upload-input-modal" // Unique ID for modal
                  type="file"
                  accept="image/*"
                  onChange={handleLogoFileChange}
                  disabled={isCreating}
                  className="sr-only"
                />

                <div className="flex-1">
                  <div className="flex items-center">
                    {selectedLogoFile && (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        disabled={isCreating}
                        className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    JPG, PNG, GIF up to 5MB
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button" 
                onClick={closeCreateDomainModal} // Close the modal
                disabled={isCreating}
                className="px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="px-4 py-2.5 bg-gradient-to-r from-gray-600 to-gray-800 text-white rounded-lg hover:from-gray-700 hover:to-gray-900 transition-all font-medium shadow-lg disabled:opacity-50 flex items-center gap-2"
              >
                {isCreating ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Creating...
                  </>
                ) : (
                  'Create Domain'
                )}
              </button>
            </div>
          </form>
        </Modal>

        {/* Logo Upload Error (outside modal, for inline logo changes) */}
        {logoUploadError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{logoUploadError}</h3>
              </div>
            </div>
          </div>
        )}

        {/* General Errors */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{error}</h3>
              </div>
            </div>
          </div>
        )}

        {deleteError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{deleteError}</h3>
              </div>
            </div>
          </div>
        )}

        {/* Domains List Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Existing Domains</h2>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
              {domains.length} domains
            </span>
          </div>
          
          {domains.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {domains.map((domain) => (
                <div key={domain.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <div 
                          onClick={() => handleLogoClick(domain.id)}
                          className="w-16 h-16 rounded-xl flex items-center justify-center mr-4 cursor-pointer shadow bg-transparent"
                        >
                          {uploadingLogoId === domain.id ? (
                            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : domain.logoUrl ? (
                            <img 
                              src={`http://localhost:5143${domain.logoUrl}`} // Adjust base URL if needed
                              alt={domain.name} 
                              className="w-12 h-12 rounded-lg object-contain"
                            />
                          ) : (
                            <svg className="w-8 h-8 text-white group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2z" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <h3 
                            className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-black transition-colors"
                            onClick={() => {
                              setEditingDomainId(domain.id);
                              setEditDomainName(domain.name);
                            }}
                          >
                            {editingDomainId === domain.id ? (
                              <div className="flex items-center">
                                <input
                                  type="text"
                                  value={editDomainName}
                                  onChange={(e) => setEditDomainName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleUpdateDomainName(domain.id, editDomainName);
                                    } else if (e.key === 'Escape') {
                                      setEditingDomainId(null);
                                      setEditDomainName('');
                                    }
                                  }}
                                  onBlur={() => handleUpdateDomainName(domain.id, editDomainName)}
                                  autoFocus
                                  className="px-2 py-1 border border-gray-300 rounded-md text-base focus:border-transparent"
                                />
                              </div>
                            ) : (
                              domain.name
                            )}
                          </h3>
                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <svg className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                            </svg>
                            <time dateTime={domain.createdAt}>
                              {new Date(domain.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </time>
                            <span className="mx-2">•</span>
                            <span>{domain.sessionCount || 0} sessions</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="ml-6 flex items-center space-x-3">
                      <Link
                        to={`/admin/domains/${domain.id}/questions`}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm"
                      >
                        Manage Questions
                      </Link>
                      <button
                        onClick={() => handleDeleteDomain(domain.id, domain.name)}
                        disabled={deletingDomainId === domain.id}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm disabled:opacity-50"
                      >
                        {deletingDomainId === domain.id ? (
                          <span className="flex items-center">
                            <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></span>
                            Deleting
                          </span>
                        ) : (
                          'Delete'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Empty State
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No domains found</h3>
              <p className="text-gray-500 mb-6">Get started by creating your first domain.</p>
              <button
                onClick={openCreateDomainModal} // Open modal from empty state too
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                Create Domain
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageDomainsPage;