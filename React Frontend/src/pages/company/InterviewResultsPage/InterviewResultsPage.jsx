// src/pages/company/InterviewResultsPage/InterviewResultsPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
// Import the new service methods
import { getInterviewResults, saveCandidateSession, removeSavedCandidate } from '../../../services/companyInterviewService';

const InterviewResultsPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { interviewId } = useParams();

  const [results, setResults] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // State to track which candidates are being saved/unsaved
  const [savingStates, setSavingStates] = useState({});

  // Sorting and filtering states
  const [sortBy, setSortBy] = useState('completed'); // completed, score, email
  const [sortOrder, setSortOrder] = useState('desc'); // asc, desc
  const [filterStatus, setFilterStatus] = useState('all'); // all, completed, inprogress
  const [searchTerm, setSearchTerm] = useState('');

  // Get logo URL from currentUser
  const logoUrl = currentUser?.logoUrl;
  
  // Extract company name from email or use stored company name
  const companyName = currentUser?.email?.split('@')?.[1] || 'Company';

  useEffect(() => {
    const fetchResults = async () => {
      if (!interviewId) {
        setError('Interview ID is missing.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        console.log(`Fetching results for interview ${interviewId}...`);
        const resultsData = await getInterviewResults(interviewId);
        console.log(`Results fetched for interview ${interviewId}:`, resultsData);
        setResults(resultsData);
      } catch (err) {
        console.error(`InterviewResultsPage - Failed to fetch results for ${interviewId}:`, err);
        if (err.response) {
          if (err.response.status === 403 || err.response.status === 404) {
            setError(err.response.data?.message || 'Access denied or interview not found.');
          } else if (err.response.data) {
            setError(`Failed to load results: ${err.response.data.message || 'Unknown error'}`);
          } else {
            setError('Failed to load results.');
          }
        } else {
          setError('Failed to load results. Please check your connection and try again.');
        }
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [interviewId]);

  // Apply sorting and filtering
  useEffect(() => {
    let filtered = [...results];

    // Apply status filter
    if (filterStatus === 'completed') {
      filtered = filtered.filter(r => r.isCompleted);
    } else if (filterStatus === 'inprogress') {
      filtered = filtered.filter(r => !r.isCompleted);
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(r =>
        r.candidateEmail.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'email':
          comparison = a.candidateEmail.localeCompare(b.candidateEmail);
          break;
        case 'score':
          const scoreA = a.averageScore !== null ? a.averageScore : -1;
          const scoreB = b.averageScore !== null ? b.averageScore : -1;
          comparison = scoreA - scoreB;
          break;
        case 'completed':
          // Always show completed first — logical sort, ignore sortOrder
          comparison = (a.isCompleted === b.isCompleted) ? 0 : a.isCompleted ? -1 : 1;
          return comparison; // Do not reverse for 'completed'
        default:
          comparison = 0;
      }

      // Reverse only for other sorts (email, score)
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredResults(filtered);
  }, [results, sortBy, sortOrder, filterStatus, searchTerm]);

  const handleViewSessionDetails = (sessionId) => {
    if (interviewId && sessionId) {
      navigate(`/company/interviews/${interviewId}/sessions/${sessionId}`);
    } else {
      console.error("Cannot navigate to session details: Missing interviewId or sessionId");
      alert("Unable to view session details.");
    }
  };

  // Handle saving/un-saving a candidate
  const handleSaveUnsaveCandidate = async (sessionId, isCurrentlySaved, savedCandidateId, candidateEmail) => {
    // Set loading state for this specific candidate
    setSavingStates(prev => ({ ...prev, [sessionId]: true }));

    try {
      if (isCurrentlySaved && savedCandidateId) {
        // Un-save the candidate
        console.log(`Un-saving candidate session ${sessionId}...`);
        await removeSavedCandidate(savedCandidateId);
        // Update local state to reflect unsaved status
        setResults(prevResults =>
          prevResults.map(result =>
            result.sessionId === sessionId
              ? { ...result, isSaved: false, savedCandidateId: null }
              : result
          )
        );
        console.log(`Candidate session ${sessionId} unsaved successfully.`);
      } else {
        // Save the candidate
        console.log(`Saving candidate session ${sessionId}...`);
        const response = await saveCandidateSession(sessionId);
        // Update local state to reflect saved status and ID
        setResults(prevResults =>
          prevResults.map(result =>
            result.sessionId === sessionId
              ? { ...result, isSaved: true, savedCandidateId: response.savedCandidateId }
              : result
          )
        );
        console.log(`Candidate session ${sessionId} saved successfully:`, response);
      }
    } catch (err) {
      console.error(`InterviewResultsPage - Failed to ${isCurrentlySaved ? 'unsave' : 'save'} candidate session ${sessionId}:`, err);
      let errorMsg = `Failed to ${isCurrentlySaved ? 'unsave' : 'save'} candidate.`;
      if (err.response) {
        if (err.response.status === 409) {
          errorMsg = 'Candidate is already saved.';
        } else if (err.response.data && err.response.data.message) {
          errorMsg = `${isCurrentlySaved ? 'Unsave' : 'Save'} failed: ${err.response.data.message}`;
        }
      }
      alert(errorMsg);
    } finally {
      // Reset loading state for this specific candidate
      setSavingStates(prev => {
        const newState = { ...prev };
        delete newState[sessionId];
        return newState;
      });
    }
  };

  const getStatusColor = (isCompleted) => {
    return isCompleted
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-yellow-100 text-yellow-800 border-yellow-200';
  };

  const getStatusText = (isCompleted) => {
    return isCompleted ? 'Completed' : 'In Progress';
  };

  const getScoreColor = (score) => {
    if (score === null || score === undefined) return 'text-gray-500';
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const calculateOverallAverage = () => {
    const completedResults = results.filter(r => r.isCompleted && r.averageScore !== null);
    if (completedResults.length === 0) return 0;
    const sum = completedResults.reduce((acc, r) => acc + (r.averageScore || 0), 0);
    return sum / completedResults.length;
  };

  const handleSort = (newSortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  };

  const getSortIndicator = (column) => {
    if (sortBy !== column) return null;
    return sortOrder === 'asc' ? ' ↑' : ' ↓';
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading Results</h3>
          <p className="text-gray-600">Analyzing candidate performance...</p>
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
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Results</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="flex space-x-3 justify-center">
              <button
                onClick={() => navigate(-1)}
                className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Go Back
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
                <h1 className="text-2xl font-bold text-gray-900">Interview Results</h1>
                <p className="text-gray-600 mt-1">Review candidate performance</p>
              </div>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        {results && results.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="text-3xl font-bold text-gray-900 mb-1">{results.length}</div>
              <div className="text-gray-600 text-sm">Total Candidates</div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="text-3xl font-bold text-green-600 mb-1">
                {results.filter(r => r.isCompleted).length}
              </div>
              <div className="text-gray-600 text-sm">Completed</div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="text-3xl font-bold text-purple-600 mb-1">
                {calculateOverallAverage().toFixed(1)}%
              </div>
              <div className="text-gray-600 text-sm">Avg. Score</div>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        {results && results.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="md:col-span-2">
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                  Search Candidates
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    id="search"
                    placeholder="Search by email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="status"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="block w-full py-2 px-3 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="inprogress">In Progress</option>
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label htmlFor="sort" className="block text-sm font-medium text-gray-700 mb-1">
                  Sort By
                </label>
                <select
                  id="sort"
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [newSortBy, newSortOrder] = e.target.value.split('-');
                    setSortBy(newSortBy);
                    setSortOrder(newSortOrder);
                  }}
                  className="block w-full py-2 px-3 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="completed-asc">Status (Completed first)</option>
                  <option value="email-asc">Email (A-Z)</option>
                  <option value="email-desc">Email (Z-A)</option>
                  <option value="score-desc">Score (High to Low)</option>
                  <option value="score-asc">Score (Low to High)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Results List */}
        {filteredResults && filteredResults.length > 0 ? (
          <div className="space-y-6">
            {filteredResults.map((result) => (
              <div key={result.sessionId} className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                {/* Candidate Header */}
                <div className="px-6 py-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">{result.candidateEmail}</h2>
                      <p className="text-sm text-gray-500 mt-1">Session ID: {result.sessionId.substring(0, 8)}...</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      {/* Save/Unsave Button - Updated Styles */}
                      <button
                        onClick={() => handleSaveUnsaveCandidate(
                          result.sessionId,
                          result.isSaved || false,
                          result.savedCandidateId,
                          result.candidateEmail
                        )}
                        disabled={savingStates[result.sessionId]}
                        className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                          savingStates[result.sessionId]
                            ? 'text-gray-400 cursor-not-allowed'
                            : result.isSaved
                              ? 'text-yellow-500 hover:bg-yellow-50 hover:text-yellow-600'
                              : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                        }`}
                        title={result.isSaved ? 'Remove from saved' : 'Save candidate'}
                      >
                        {savingStates[result.sessionId] ? (
                          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <>
                            {/* Bookmark outline (shown when not saved) */}
                            <svg 
                              className={`w-5 h-5 transition-opacity duration-200 ${
                                result.isSaved ? 'opacity-0' : 'opacity-100'
                              }`} 
                              fill="none" 
                              viewBox="0 0 24 24" 
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                            
                            {/* Bookmark solid (shown when saved) */}
                            <svg 
                              className={`w-5 h-5 absolute transition-opacity duration-200 ${
                                result.isSaved ? 'opacity-100' : 'opacity-0'
                              }`} 
                              viewBox="0 0 24 24" 
                              fill="currentColor"
                            >
                              <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                          </>
                        )}
                      </button>

                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(result.isCompleted)}`}>
                        {getStatusText(result.isCompleted)}
                      </span>
                      {result.isCompleted && result.averageScore !== null && (
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${getScoreColor(result.averageScore)}`}>
                            {result.averageScore.toFixed(1)}%
                          </div>
                          <div className="text-xs text-gray-500">Average Score</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Candidate Stats */}
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Questions Answered</div>
                        <div className="text-lg font-semibold text-gray-900">
                          {result.responseCount || 0}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Completed</div>
                        <div className="text-lg font-semibold text-gray-900">
                          {result.isCompleted ? 'Yes' : 'No'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Status</div>
                        <div className="text-lg font-semibold text-gray-900">
                          {result.isCompleted ? 'Final' : 'In Progress'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <div className="px-6 py-4">
                  <button
                    onClick={() => handleViewSessionDetails(result.sessionId)}
                    className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                  >
                    View Detailed Session
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Empty State
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">No Results Found</h3>
            <p className="text-gray-600 text-lg mb-2">
              {results.length > 0
                ? "No candidates match your current filters."
                : "No candidates have completed this interview."}
            </p>
            {results.length > 0 && (
              <p className="text-gray-500 mb-8">Try adjusting your search or filter criteria.</p>
            )}
            <div className="flex justify-center gap-3">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('all');
                }}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Clear Filters
              </button>
              <button
                onClick={() => navigate(-1)}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                Back to Interview Details
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewResultsPage;