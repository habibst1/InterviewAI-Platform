// src/pages/user/MySessionsPage/MySessionsPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMySessions, deleteSession } from '../../../services/publicInterviewService';
import { useAuth } from '../../../contexts/AuthContext';

const MySessionsPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingSessionId, setDeletingSessionId] = useState(null);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        setError('');
        console.log("Fetching user's interview sessions...");
        const sessionData = await getMySessions();
        console.log("Sessions fetched:", sessionData);
        const sortedSessions = sessionData.sort((a, b) =>
          new Date(b.startedAt) - new Date(a.startedAt)
        );
        setSessions(sortedSessions);
      } catch (err) {
        console.error('MySessionsPage - Failed to fetch sessions:', err);
        if (err.response && err.response.data) {
          setError(`Failed to load sessions: ${err.response.data.message || 'Unknown error'}`);
        } else {
          setError('Failed to load sessions. Please check your connection and try again.');
        }
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);

  const handleViewResults = (sessionId) => {
    navigate(`/user/interview/results/${sessionId}`);
  };

  const handleResumeSession = (sessionId) => {
    navigate(`/user/interview/session/${sessionId}`);
  };

  const handleDeleteSession = async (sessionId, sessionTitleOrDate) => {
    const confirmMessage = `Are you sure you want to delete the session from ${sessionTitleOrDate}? This action cannot be undone.`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setDeletingSessionId(sessionId);
    setError('');

    try {
      console.log("Deleting session:", sessionId);
      await deleteSession(sessionId);
      console.log("Session deleted:", sessionId);
      setSessions(prevSessions => prevSessions.filter(session => session.id !== sessionId));
    } catch (err) {
      console.error('MySessionsPage - Failed to delete session:', err);
      if (err.response) {
        if (err.response.status === 404) {
          setError('Session not found or access denied. It might have already been deleted.');
          setSessions(prevSessions => prevSessions.filter(session => session.id !== sessionId));
        } else if (err.response.data) {
          setError(`Failed to delete session: ${err.response.data.message || 'Unknown error'}`);
        } else {
          setError('Failed to delete session.');
        }
      } else {
        setError('Failed to delete session. Please check your connection and try again.');
      }
    } finally {
      setDeletingSessionId(null);
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

  const calculateProgress = (completed, total) => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading Your Sessions</h3>
          <p className="text-gray-600">Fetching your interview data...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-red-600 text-2xl font-bold">!</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Sessions</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="flex space-x-3 justify-center">
              <button
                onClick={() => navigate('/user/dashboard')}
                className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Interview Sessions</h1>
              <p className="text-gray-600 mt-1">Review your practice interviews and track your progress</p>
            </div>
            <button
              onClick={() => navigate('/user/dashboard')}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-lg p-3">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <div className="text-3xl font-bold text-gray-900">{sessions.length}</div>
                <div className="text-gray-600 text-sm">Total Sessions</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-lg p-3">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <div className="text-3xl font-bold text-gray-900">
                  {sessions.filter(s => s.isCompleted).length}
                </div>
                <div className="text-gray-600 text-sm">Completed</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-yellow-100 rounded-lg p-3">
                <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <div className="text-3xl font-bold text-gray-900">
                  {sessions.filter(s => !s.isCompleted).length}
                </div>
                <div className="text-gray-600 text-sm">In Progress</div>
              </div>
            </div>
          </div>
        </div>

        {/* Create Session Button */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/user/domains')}
            className="w-full md:w-auto px-5 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all font-medium shadow-sm flex items-center justify-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Start New Interview
          </button>
        </div>

        {/* Sessions List */}
        {sessions.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">All Sessions</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {sessions.map((session) => (
                <div key={session.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center mb-3">
                        {/* Domain Logo */}
                        {session.logoUrl ? (
                          <div className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden mr-3">
                            <img 
                              src={`http://localhost:5143${session.logoUrl}`} 
                              alt={session.domainName || 'Domain'}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.parentElement.outerHTML = `
                                  <div class="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                                    <svg class="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                  </div>
                                `;
                              }}
                            />
                          </div>
                        ) : (
                          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                          </div>
                        )}
                        
                        <h3 className="text-xl font-semibold text-gray-900">
                          {session.domainName || 'Practice Interview'}
                        </h3>
                        <span className={`ml-4 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(session.isCompleted)}`}>
                          {getStatusText(session.isCompleted)}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500">Started Date</div>
                            <div className="text-base font-semibold text-gray-900 mt-1">
                              {new Date(session.startedAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })} at {new Date(session.startedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500">Questions</div>
                            <div className="text-base font-semibold text-gray-900 mt-1">
                              {session.completedResponsesCount} / {session.questionCount}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-6">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-cyan-600 h-2.5 rounded-full" 
                            style={{ width: `${calculateProgress(session.completedResponsesCount, session.questionCount)}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>Progress</span>
                          <span>{calculateProgress(session.completedResponsesCount, session.questionCount)}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="ml-8 flex flex-col items-end justify-between">
                      <div className="flex items-center space-x-2">
                        {session.isCompleted ? (
                          <button
                            onClick={() => handleViewResults(session.id)}
                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all font-medium text-sm shadow-sm flex items-center"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View Results
                          </button>
                        ) : (
                          <button
                            onClick={() => handleResumeSession(session.id)}
                            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium text-sm shadow-sm flex items-center"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Resume
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteSession(session.id, new Date(session.startedAt).toLocaleString())}
                          disabled={deletingSessionId === session.id}
                          className={`p-2 rounded-lg transition-colors ${
                            deletingSessionId === session.id
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-red-50 text-red-600 hover:bg-red-100'
                          }`}
                          aria-label={deletingSessionId === session.id ? "Deleting session..." : "Delete session"}
                        >
                          {deletingSessionId === session.id ? (
                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
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
            <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">No Sessions Yet</h3>
            <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
              Get started by completing your first practice interview.
            </p>
            <button
              onClick={() => navigate('/user/domains')}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all font-medium text-base shadow-sm"
            >
              Start Your First Interview
            </button>
          </div>
        )}

        {/* Tips Section */}
        {sessions.length > 0 && (
          <div className="mt-8 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-2xl p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-4">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Interview Tip</h3>
                <p className="text-blue-100 text-base">
                  Review your completed sessions to see how you've improved over time. 
                  Focus on areas where you scored lower and practice similar questions.
                  Consistent practice is key to interview success!
                </p>
                <div className="mt-4">
                  <button 
                    onClick={() => navigate('/user/domains')}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50"
                  >
                    Practice More
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MySessionsPage;