// src/pages/company/SessionDetailsPage/SessionDetailsPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
// Import the new service methods for save/unsave
import { getCompanyInterviewSession, saveCandidateSession, removeSavedCandidate } from '../../../services/companyInterviewService';

const SessionDetailsPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { interviewId, sessionId } = useParams();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // State for save/unsave functionality
  const [isSaved, setIsSaved] = useState(false);
  const [savedCandidateId, setSavedCandidateId] = useState(null);
  const [savingState, setSavingState] = useState(false); // true when saving/un-saving

  // Get logo URL from currentUser
  const logoUrl = currentUser?.logoUrl;
  
  // Extract company name from email or use stored company name
  const companyName = currentUser?.email?.split('@')?.[1] || 'Company';

  useEffect(() => {
    const fetchSessionDetails = async () => {
      if (!sessionId) {
        setError('Session ID is missing.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        console.log(`Fetching details for session ${sessionId}...`);
        const sessionData = await getCompanyInterviewSession(sessionId);
        console.log(`Details fetched for session ${sessionId}:`, sessionData);
        setSession(sessionData);

        // Set initial saved state based on API response
        // This now works because your backend includes IsSaved and SavedCandidateId
        setIsSaved(sessionData.isSaved || false);
        setSavedCandidateId(sessionData.savedCandidateId || null);

      } catch (err) {
        console.error(`SessionDetailsPage - Failed to fetch details for ${sessionId}:`, err);
        if (err.response) {
          if (err.response.status === 404) {
            setError('Session not found or access denied.');
          } else if (err.response.data) {
            setError(`Failed to load session: ${err.response.data.message || 'Unknown error'}`);
          } else {
            setError('Failed to load session.');
          }
        } else {
          setError('Failed to load session. Please check your connection and try again.');
        }
        setSession(null);
        // Reset saved state on error
        setIsSaved(false);
        setSavedCandidateId(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSessionDetails();
  }, [sessionId]);

  // Function to handle saving/un-saving the candidate
  const handleSaveUnsaveCandidate = async () => {
    if (!sessionId) {
      console.error('Session ID is missing.');
      return;
    }

    setSavingState(true);
    try {
      if (isSaved && savedCandidateId) {
        // Unsave the candidate
        console.log(`Un-saving candidate session ${sessionId}...`);
        await removeSavedCandidate(savedCandidateId);
        setIsSaved(false);
        setSavedCandidateId(null);
        console.log(`Candidate session ${sessionId} unsaved successfully.`);
        // Optional: Add success toast notification here
      } else {
        // Save the candidate
        console.log(`Saving candidate session ${sessionId}...`);
        const response = await saveCandidateSession(sessionId);
        setIsSaved(true);
        setSavedCandidateId(response.savedCandidateId);
        console.log(`Candidate session ${sessionId} saved successfully:`, response);
      }
    } catch (err) {
      console.error(`SessionDetailsPage - Failed to ${isSaved ? 'unsave' : 'save'} candidate session ${sessionId}:`, err);
      let errorMsg = `Failed to ${isSaved ? 'remove' : 'save'} candidate.`;
      if (err.response) {
        if (err.response.status === 409) {
          errorMsg = 'Candidate is already saved.';
        } else if (err.response.data && err.response.data.message) {
          errorMsg = `${isSaved ? 'Unsave' : 'Save'} failed: ${err.response.data.message}`;
        }
      }
      alert(errorMsg); // Fallback to alert for now
    } finally {
      setSavingState(false);
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

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading Session Details</h3>
          <p className="text-gray-600">Fetching candidate response data...</p>
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
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Session</h3>
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

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Session Not Found</h3>
          <p className="text-gray-600 mb-6">The session details could not be loaded.</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            Go Back
          </button>
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
                <h1 className="text-2xl font-bold text-gray-900">Session Details</h1>
                <p className="text-gray-600 mt-1">Review candidate responses</p>
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
        {/* Session Summary */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden mb-8">
          {/* Session Overview Header with Save Button */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Session Overview</h2>
            {/* Save/Unsave Button moved here */}
            <button
              onClick={handleSaveUnsaveCandidate}
              disabled={savingState}
              className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                savingState
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : isSaved
                    ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border border-yellow-300'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
              title={isSaved ? 'Remove from saved candidates' : 'Save this candidate'}
            >
              {savingState ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isSaved ? 'Removing...' : 'Saving...'}
                </>
              ) : (
                <>
                  {/* Filled Bookmark Icon (shown when saved) */}
                  <svg
                    className={`w-4 h-4 mr-2 transition-opacity duration-200 ${
                      isSaved ? 'opacity-100' : 'opacity-0 absolute'
                    }`}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  {/* Outline Bookmark Icon (shown when not saved) */}
                  <svg
                    className={`w-4 h-4 mr-2 transition-opacity duration-200 ${
                      isSaved ? 'opacity-0' : 'opacity-100'
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  {isSaved ? 'Saved' : 'Save Candidate'}
                </>
              )}
            </button>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mr-4">
                    <span className="text-white text-xl font-bold">
                      {session.candidateEmail?.charAt(0)?.toUpperCase() || 'C'}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{session.candidateEmail}</h3>
                    <p className="text-gray-600">Candidate</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Interview</div>
                      <div className="text-base font-semibold text-gray-900">{session.interviewTitle}</div>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Started</div>
                      <div className="text-base font-semibold text-gray-900">
                        {new Date(session.startedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Session Status</h3>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(session.isCompleted)}`}>
                    {getStatusText(session.isCompleted)}
                  </span>
                </div>

                {session.isCompleted && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Overall Performance</span>
                      <span className={`text-2xl font-bold ${getScoreColor(session.averageScore)}`}>
                        {session.averageScore?.toFixed(1) || '0.0'}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          session.averageScore >= 85 ? 'bg-green-500' :
                          session.averageScore >= 70 ? 'bg-blue-500' :
                          session.averageScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(100, session.averageScore || 0)}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-3 border border-gray-100">
                    <div className="text-sm text-gray-500">Questions</div>
                    <div className="text-lg font-semibold text-gray-900">{session.responses?.length || 0}</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-100">
                    <div className="text-sm text-gray-500">Session ID</div>
                    <div className="text-sm font-mono text-gray-900 truncate">
                      {sessionId?.substring(0, 8) || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Responses Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Question Responses</h2>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
              {session.responses?.length || 0} responses
            </span>
          </div>

          <div className="divide-y divide-gray-100">
            {session.responses && session.responses.length > 0 ? (
              session.responses.map((response, index) => (
                <div key={`${response.order}-${response.questionText}`} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <span className="text-lg font-semibold text-gray-900 mr-3">Q{response.order}.</span>
                      <h3 className="text-base font-medium text-gray-900">{response.questionText}</h3>
                    </div>
                    {response.score !== null && (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${
                        response.score >= 85 ? 'bg-green-100 text-green-800' :
                        response.score >= 70 ? 'bg-blue-100 text-blue-800' :
                        response.score >= 50 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {response.score.toFixed(1)}%
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">AI Feedback</h4>
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                        <p className="text-gray-800">{response.feedback || 'No feedback available.'}</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Candidate Response</h4>
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                        <p className="text-gray-800">{response.userAudioTranscribed || 'Transcription not available.'}</p>
                      </div>
                    </div>
                  </div>

                  {response.sampleAnswer && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Sample Answer</h4>
                      <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                        <p className="text-gray-800">{response.sampleAnswer}</p>
                      </div>
                    </div>
                  )}

                  {response.userAudioUrl && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Candidate Audio</h4>
                      <audio
                        controls
                        src={response.userAudioUrl}
                        className="w-full max-w-md"
                      >
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-12 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No responses recorded</h3>
                <p className="mt-1 text-sm text-gray-500">This session doesn't have any responses yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionDetailsPage;