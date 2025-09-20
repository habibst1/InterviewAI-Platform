// src/pages/company/SavedCandidatesPage/SavedCandidatesPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { getSavedCandidates, removeSavedCandidate } from '../../../services/companyInterviewService';

const SavedCandidatesPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [savedCandidates, setSavedCandidates] = useState([]);
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtering and sorting states
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('saved'); // saved, email, score
  const [sortOrder, setSortOrder] = useState('desc'); // asc, desc

  // Get logo URL from currentUser
  const logoUrl = currentUser?.logoUrl;
  
  // Extract company name from email or use stored company name
  const companyName = currentUser?.email?.split('@')?.[1] || 'Company';

  useEffect(() => {
    const fetchSavedCandidates = async () => {
      try {
        setLoading(true);
        setError('');
        console.log("Fetching saved candidates...");
        const candidatesData = await getSavedCandidates();
        console.log("Saved candidates fetched:", candidatesData);
        setSavedCandidates(candidatesData);
      } catch (err) {
        console.error('SavedCandidatesPage - Failed to fetch saved candidates:', err);
        if (err.response && err.response.data) {
          setError(`Failed to load saved candidates: ${err.response.data.message || 'Unknown error'}`);
        } else {
          setError('Failed to load saved candidates. Please check your connection and try again.');
        }
        setSavedCandidates([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSavedCandidates();
  }, []);

  // Apply filtering and sorting
  useEffect(() => {
    let filtered = [...savedCandidates];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(candidate => 
        candidate.candidateEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.interviewTitle.toLowerCase().includes(searchTerm.toLowerCase())
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
        case 'saved':
          comparison = new Date(a.savedAt) - new Date(b.savedAt);
          break;
        case 'interview':
          comparison = a.interviewTitle.localeCompare(b.interviewTitle);
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredCandidates(filtered);
  }, [savedCandidates, searchTerm, sortBy, sortOrder]);

  const handleRemoveSavedCandidate = async (savedCandidateId, candidateEmail) => {
    // Confirmation
    const confirmed = window.confirm(`Are you sure you want to remove ${candidateEmail} from your saved candidates?`);
    if (!confirmed) return;

    try {
      console.log(`Removing saved candidate ${savedCandidateId}...`);
      await removeSavedCandidate(savedCandidateId);
      console.log(`Saved candidate ${savedCandidateId} removed successfully.`);
      // Update state to remove the deleted candidate
      setSavedCandidates(prev => prev.filter(c => c.id !== savedCandidateId));
    } catch (err) {
      console.error('SavedCandidatesPage - Failed to remove saved candidate:', err);
      let errorMsg = 'Failed to remove saved candidate.';
      if (err.response) {
        if (err.response.status === 404) {
          errorMsg = 'Saved candidate not found or access denied.';
        } else if (err.response.data && err.response.data.message) {
          errorMsg = `Removal failed: ${err.response.data.message}`;
        }
      }
      alert(errorMsg);
    }
  };

  const handleViewSessionDetails = (sessionId, interviewId) => {
    // Check if both IDs are available
    if (interviewId && sessionId) {
      // Navigate to the correct path: /company/interviews/:interviewId/sessions/:sessionId
      navigate(`/company/interviews/${interviewId}/sessions/${sessionId}`);
    } else {
      console.error("Cannot navigate to session details: Missing interviewId or sessionId");
      alert("Unable to view session details due to missing information.");
    }
  };

  const handleViewInterview = (interviewId) => {
    navigate(`/company/interviews/${interviewId}`);
  };

  const getScoreColor = (score) => {
    if (score === null || score === undefined) return 'text-gray-500';
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
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
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading Saved Candidates</h3>
          <p className="text-gray-600">Fetching your saved candidates...</p>
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
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Saved Candidates</h3>
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
                <h1 className="text-2xl font-bold text-gray-900">Saved Candidates</h1>
                <p className="text-gray-600 mt-1">Your bookmarked candidate sessions</p>
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
        {/* Stats Overview */}
        {savedCandidates.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="text-3xl font-bold text-gray-900 mb-1">{savedCandidates.length}</div>
              <div className="text-gray-600 text-sm">Total Saved Candidates</div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="text-3xl font-bold text-purple-600 mb-1">
                {savedCandidates.filter(c => c.averageScore !== null).length}
              </div>
              <div className="text-gray-600 text-sm">Scored Candidates</div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="text-3xl font-bold text-green-600 mb-1">
                {savedCandidates.filter(c => c.averageScore >= 80).length}
              </div>
              <div className="text-gray-600 text-sm">High Performers (80%+)</div>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        {savedCandidates.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div>
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
                    placeholder="Search by email or interview..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
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
                  <option value="saved-desc">Saved Date (Newest)</option>
                  <option value="saved-asc">Saved Date (Oldest)</option>
                  <option value="email-asc">Email (A-Z)</option>
                  <option value="email-desc">Email (Z-A)</option>
                  <option value="score-desc">Score (High to Low)</option>
                  <option value="score-asc">Score (Low to High)</option>
                  <option value="interview-asc">Interview (A-Z)</option>
                  <option value="interview-desc">Interview (Z-A)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Actions
                </label>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSortBy('saved');
                    setSortOrder('desc');
                  }}
                  className="w-full px-3 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Saved Candidates List */}
        {filteredCandidates.length > 0 ? (
          <div className="space-y-6">
            {filteredCandidates.map((candidate) => (
              <div key={candidate.id} className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                {/* Candidate Header */}
                <div className="px-6 py-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mr-4">
                        <span className="text-white font-bold">
                          {candidate.candidateEmail?.charAt(0)?.toUpperCase() || 'C'}
                        </span>
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">{candidate.candidateEmail}</h2>
                        <p className="text-sm text-gray-500">Saved on {new Date(candidate.savedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}</p>
                      </div>
                    </div>
                    {candidate.averageScore !== null && (
                      <div className={`text-2xl font-bold ${getScoreColor(candidate.averageScore)}`}>
                        {candidate.averageScore.toFixed(1)}%
                      </div>
                    )}
                  </div>
                </div>

                {/* Candidate Details */}
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Interview</div>
                        <div className="text-base font-semibold text-gray-900">{candidate.interviewTitle}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Session ID</div>
                        <div className="text-base font-semibold text-gray-900 font-mono">
                          {candidate.sessionId?.substring(0, 8) || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="px-6 py-4 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => handleViewSessionDetails(candidate.sessionId, candidate.interviewId)}
                    className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex-1"
                  >
                    View Session Details
                  </button>
                  
                  <button
                    onClick={() => handleViewInterview(candidate.interviewId)}
                    className="px-5 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium flex-1"
                  >
                    View Interview
                  </button>
                  
                  <button
                    onClick={() => handleRemoveSavedCandidate(candidate.id, candidate.candidateEmail)}
                    className="px-5 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors font-medium flex-1"
                  >
                    Remove
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">
              {savedCandidates.length > 0 ? "No Candidates Found" : "No Saved Candidates"}
            </h3>
            <p className="text-gray-600 text-lg mb-2">
              {savedCandidates.length > 0 
                ? "No candidates match your current filters." 
                : "You haven't saved any candidates yet."}
            </p>
            {savedCandidates.length > 0 && (
              <p className="text-gray-500 mb-8">Try adjusting your search or filter criteria.</p>
            )}
            <div className="flex justify-center gap-3">
              {savedCandidates.length > 0 ? (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSortBy('saved');
                    setSortOrder('desc');
                  }}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Clear Filters
                </button>
              ) : (
                <button
                  onClick={() => navigate('/company/interviews')}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  View Interviews
                </button>
              )}
              <button
                onClick={() => navigate('/company/dashboard')}
                className="px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedCandidatesPage;