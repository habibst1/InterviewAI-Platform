// src/pages/company/MyInterviewsPage/MyInterviewsPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { getMyInterviews, deleteInterview } from '../../../services/companyInterviewService';

const MyInterviewsPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [deletingInterviewId, setDeletingInterviewId] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  // Get logo URL from currentUser
  const logoUrl = currentUser?.logoUrl;
  
  // Extract company name from email or use stored company name
  const companyName = currentUser?.email?.split('@')?.[1] || 'Company';

  useEffect(() => {
    const fetchInterviews = async () => {
      try {
        setLoading(true);
        setError('');
        console.log("Fetching company interviews...");
        const interviewData = await getMyInterviews();
        console.log("Interviews fetched:", interviewData);
        const sortedInterviews = interviewData.sort((a, b) =>
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        setInterviews(sortedInterviews);
      } catch (err) {
        console.error('MyInterviewsPage - Failed to fetch interviews:', err);
        if (err.response && err.response.data) {
          setError(`Failed to load interviews: ${err.response.data.message || 'Unknown error'}`);
        } else {
          setError('Failed to load interviews. Please check your connection and try again.');
        }
        setInterviews([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInterviews();
  }, []);

  const handleViewDetails = (interviewId) => {
    navigate(`/company/interviews/${interviewId}`);
  };

  const handleCreateNew = () => {
    navigate('/company/interviews/create');
  };

  // --- Handler for Delete ---
  const handleDelete = async (interviewId, interviewTitle) => {
    // Basic confirmation
    const confirmed = window.confirm(`Are you sure you want to delete the interview "${interviewTitle}"? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      setDeletingInterviewId(interviewId); // Set loading state for this item
      setDeleteError(''); // Clear previous delete error
      await deleteInterview(interviewId);
      console.log(`Interview ${interviewId} deleted successfully.`);
      // Update state to remove the deleted interview
      setInterviews(prevInterviews => prevInterviews.filter(i => i.id !== interviewId));
    } catch (err) {
      console.error('MyInterviewsPage - Failed to delete interview:', err);
      let errorMsg = 'Failed to delete interview.';
      if (err.response) {
        if (err.response.status === 404) {
           errorMsg = 'Interview not found or access denied.';
        } else if (err.response.data && err.response.data.message) {
          errorMsg = `Deletion failed: ${err.response.data.message}`;
        }
      }
      setDeleteError(errorMsg); // Set error state
    } finally {
      setDeletingInterviewId(null); // Clear loading state
    }
  };

  const handleViewResults = (interviewId) => {
    navigate(`/company/interviews/${interviewId}/results`);
  };

  const getStatusColor = (isActive) => {
    return isActive 
      ? 'bg-green-100 text-green-800 border-green-200' 
      : 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusText = (isActive) => {
    return isActive ? 'Active' : 'Finished';
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading Your Interviews</h3>
          <p className="text-gray-600">Fetching your interview data...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-red-600 text-2xl font-bold">!</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Interviews</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="flex space-x-3 justify-center">
              <button
                onClick={() => navigate('/company/dashboard')}
                className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Page Content
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
       {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6 flex items-center justify-between">
            <div className="flex items-center min-w-0">
              {/* Company Logo */}
              {logoUrl ? (
                <div className="flex-shrink-0 mr-4">
                  <img 
                    src={`http://localhost:5143${logoUrl}`} 
                    alt="Company Logo" 
                    className="h-12 w-12 rounded-lg object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <div className="flex-shrink-0 mr-4">
                  <div className="h-12 w-12 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
              )}
              
              <div>
                <h1 className="text-2xl font-bold text-gray-900">My Interviews</h1>
                <p className="text-gray-600 mt-1">Manage your screening processes</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/company/dashboard')}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

         {/* Display Delete Error if any */}
        {deleteError && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <strong className="font-bold">Error! </strong>
            <span className="block sm:inline">{deleteError}</span>
          </div>
        )}

        {/* Stats Overview */}
        {interviews.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="text-3xl font-bold text-gray-900 mb-1">{interviews.length}</div>
              <div className="text-gray-600 text-sm">Total Interviews</div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="text-3xl font-bold text-green-600 mb-1">
                {interviews.filter(i => i.isActive).length}
              </div>
              <div className="text-gray-600 text-sm">Active</div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="text-3xl font-bold text-purple-600 mb-1">
                {interviews.reduce((sum, i) => sum + (i.sessionCount || 0), 0)}
              </div>
              <div className="text-gray-600 text-sm">Total Sessions</div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="text-3xl font-bold text-indigo-600 mb-1">
                {interviews.reduce((sum, i) => sum + (i.invitationCount || 0), 0)}
              </div>
              <div className="text-gray-600 text-sm">Invitations Sent</div>
            </div>
          </div>
        )}
        {/* Create Interview Button - Moved above Recent Interviews */}
        <div className="mb-6">
          <button
            onClick={handleCreateNew}
            className="w-full md:w-auto px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all font-medium shadow-sm flex items-center justify-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create New Interview
          </button>
        </div>
        {/* Interviews List */}
        {interviews.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Recent Interviews</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {interviews.map((interview) => (
                <div key={interview.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-end justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center mb-3">
                        <h3 className="text-xl font-semibold text-gray-900">{interview.title}</h3>
                        <span className={`ml-4 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(interview.isActive)}`}>
                          {getStatusText(interview.isActive)}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                            <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500">Created Date</div>
                            <div className="text-base font-semibold text-gray-900 mt-1">
                              {new Date(interview.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500">Questions</div>
                            <div className="text-base font-semibold text-gray-900 mt-1">{interview.questionCount || 0}</div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500">Sessions</div>
                            <div className="text-base font-semibold text-gray-900 mt-1">{interview.sessionCount || 0}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="ml-8 flex flex-col items-end justify-between">
                      <div className="flex items-center space-x-2"> {/* Wrapper for buttons */}
                        <button
                          onClick={() => handleViewDetails(interview.id)}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm shadow-sm"
                        >
                          Details
                        </button>
                        {/* Results Button */}
                        <button
                          onClick={() => handleViewResults(interview.id)}
                          disabled={interview.sessionCount === 0}
                          className={`px-4 py-2 rounded-lg font-medium text-sm shadow-sm transition-all flex items-center ${
                            interview.sessionCount === 0
                              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                              : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 transform hover:-translate-y-0.5'
                          }`}
                          title={interview.sessionCount === 0 ? "No sessions available" : "View candidate results"}
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          Results
                          {interview.sessionCount > 0 && (
                            <span className="ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform scale-90 bg-red-500 rounded-full">
                              {interview.sessionCount}
                            </span>
                          )}
                        </button>                        
                        {/* --- Small Delete Icon Button --- */}
                        <button
                          onClick={() => handleDelete(interview.id, interview.title)} // Pass ID and Title for confirmation
                          disabled={deletingInterviewId === interview.id} // Disable while deleting this item
                          className={`p-2 rounded-lg transition-colors ${
                            deletingInterviewId === interview.id
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed' // Disabled state
                              : 'bg-red-50 text-red-600 hover:bg-red-100' // Normal state
                          }`}
                          title="Delete Interview"
                        >
                          {deletingInterviewId === interview.id ? (
                            // Show spinner if this interview is being deleted
                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            // Show trash icon
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
                      <div className="text-sm text-gray-500 mt-2">
                        {interview.invitationCount || 0} invitations sent
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          // Empty State
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">No Interviews Yet</h3>
            <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
              Get started by creating your first interview screening process.
            </p>
            <button
              onClick={handleCreateNew}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all font-medium text-base shadow-sm"
            >
              Create Your First Interview
            </button>
          </div>
        )}
        {/* Tips Section */}
        {interviews.length > 0 && (
          <div className="mt-8 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-6 border border-purple-100">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-4">
                <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Interview Tip</h3>
                <p className="text-gray-700 text-base">
                  Regularly review your interview results to identify trends and improve your hiring process.
                  Consider A/B testing different question sets to optimize candidate experience.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyInterviewsPage;