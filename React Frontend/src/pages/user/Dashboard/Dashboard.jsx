// src/pages/user/Dashboard/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { getMySessions, deleteSession } from '../../../services/publicInterviewService';

const Dashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // State for sessions, loading, errors, and deletion
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingSessionId, setDeletingSessionId] = useState(null);

  // Stats data for the dashboard
  const stats = [
    { 
      name: 'Total Sessions', 
      value: sessions.length,
      icon: (
        <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: 'bg-blue-100'
    },
    { 
      name: 'Completed Sessions', 
      value: sessions.filter(s => s.isCompleted).length,
      icon: (
        <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'bg-green-100'
    },
    { 
      name: 'Avg. Completion', 
      value: sessions.length > 0 
        ? `${Math.round(sessions.reduce((sum, s) => 
            sum + (s.completedResponsesCount / s.questionCount * 100), 0) / sessions.length)}%`
        : '0%',
      icon: (
        <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      color: 'bg-blue-100'
    },
    { 
      name: 'Practice Domains', 
      value: [...new Set(sessions.map(s => s.domainName))].length,
      icon: (
        <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      color: 'bg-orange-100'
    }
  ];

  const features = [
    {
      title: 'Practice Interview',
      description: 'Start a new AI-powered voice interview',
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      ),
      action: () => navigate('/user/domains'),
      color: 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700',
    },
    {
      title: 'My Sessions',
      description: 'Review past interviews and feedback',
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      action: () => navigate('/user/sessions'),
      color: 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700',
    },
    {
      title: 'Progress Tracker',
      description: 'See your improvement over time',
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      action: () => navigate('/user/progress'),
      color: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700',
    },
    {
      title: 'Skill Library',
      description: 'Explore available domains and topics',
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      action: () => navigate('/user/domains'),
      color: 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700',
    },
  ];

  // Fetch recent sessions on component mount
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        setError('');
        console.log("Dashboard: Fetching user's recent interview sessions...");
        const sessionData = await getMySessions();
        
        // Sort sessions by startedAt descending (newest first) and take the first 3
        const sortedSessions = sessionData
          .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
          .slice(0, 3);
          
        console.log("Dashboard: Recent sessions fetched:", sortedSessions);
        setSessions(sortedSessions);
      } catch (err) {
        console.error('Dashboard - Failed to fetch recent sessions:', err);
        if (err.response && err.response.data) {
          setError(`Failed to load recent sessions: ${err.response.data.message || 'Unknown error'}`);
        } else {
          setError('Failed to load recent sessions. Please check your connection and try again.');
        }
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);

  const handleDeleteSession = async (sessionId, sessionTitleOrDate) => {
    const confirmMessage = `Are you sure you want to delete the session from ${sessionTitleOrDate}? This action cannot be undone.`;
    if (!window.confirm(confirmMessage)) {
        return;
    }

    setDeletingSessionId(sessionId);
    setError('');

    try {
        console.log("Dashboard: Deleting session:", sessionId);
        await deleteSession(sessionId);
        console.log("Dashboard: Session deleted:", sessionId);
        setSessions(prevSessions => prevSessions.filter(session => session.id !== sessionId));
    } catch (err) {
        console.error('Dashboard - Failed to delete session:', err);
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

  const handleViewResults = (sessionId) => {
    navigate(`/user/interview/results/${sessionId}`);
  };

  const handleResumeSession = (sessionId) => {
    navigate(`/user/interview/session/${sessionId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6 md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                User Dashboard
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Welcome back, {currentUser?.firstName || currentUser?.email?.split('@')[0] || 'User'}!
              </p>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4">
              <button
                onClick={() => navigate('/user/domains')}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Start Practice
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Section */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {stats.map((stat) => (
            <div key={stat.name} className="bg-white overflow-hidden shadow rounded-2xl border border-gray-100">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 rounded-lg p-3 ${stat.color}`}>
                    {stat.icon}
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">{stat.name}</dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">{stat.value}</div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                onClick={feature.action}
                className={`${feature.color} rounded-2xl shadow-lg cursor-pointer transition-all duration-300 transform hover:scale-105`}
              >
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-lg bg-white bg-opacity-20">
                      {feature.icon}
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-white">{feature.title}</h3>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-white opacity-90">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Sessions Preview */}
        <div className="bg-white shadow rounded-2xl border border-gray-100 overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Sessions</h3>
              <button
                onClick={() => navigate('/user/sessions')}
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                View all
              </button>
            </div>
          </div>
          
          {/* Loading State */}
          {loading && (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading recent sessions...</p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="p-6">
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sessions List or Empty State */}
          {!loading && !error && (
            <div className="divide-y divide-gray-100">
              {sessions.length > 0 ? (
                sessions.map((session) => (
                  <div key={session.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center mb-2">
                          {/* Domain Logo */}
                          {session.logoUrl ? (
                            <div className="flex-shrink-0 w-8 h-8 rounded-md overflow-hidden mr-3">
                              <img 
                                src={`http://localhost:5143${session.logoUrl}`} 
                                alt={session.domainName || 'Domain'}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.parentElement.outerHTML = `
                                    <div class="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center mr-3">
                                      <svg class="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                      </svg>
                                    </div>
                                  `;
                                }}
                              />
                            </div>
                          ) : (
                            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center mr-3">
                              <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                            </div>
                          )}
                          
                          <h3 className="text-base font-medium text-gray-900 truncate">
                            {session.domainName || `Session ${session.id.substring(0, 8)}...`}
                          </h3>
                          <span className={`ml-3 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(session.isCompleted)}`}>
                            {getStatusText(session.isCompleted)}
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:space-x-4 text-sm text-gray-500 mb-3">
                          <span>
                            Started: {new Date(session.startedAt).toLocaleDateString()}
                          </span>
                          <span>
                            Questions: {session.completedResponsesCount} / {session.questionCount}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-cyan-600 h-2 rounded-full" 
                            style={{ width: `${calculateProgress(session.completedResponsesCount, session.questionCount)}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="ml-4 flex-shrink-0 flex items-center space-x-2">
                        {session.isCompleted ? (
                          <button
                            onClick={() => handleViewResults(session.id)}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            View Results
                          </button>
                        ) : (
                          <button
                            onClick={() => handleResumeSession(session.id)}
                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            Resume
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteSession(session.id, new Date(session.startedAt).toLocaleString())}
                          disabled={deletingSessionId === session.id}
                          className={`p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                            deletingSessionId === session.id
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-red-100 text-red-600 hover:bg-red-200 focus:ring-red-500'
                          }`}
                          aria-label={deletingSessionId === session.id ? "Deleting session..." : "Delete session"}
                        >
                          {deletingSessionId === session.id ? (
                            <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                ))
              ) : (
                <div className="p-12 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No sessions yet</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by completing your first practice interview.</p>
                  <div className="mt-6">
                    <button
                      onClick={() => navigate('/user/domains')}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                    >
                      <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      Start Practice Interview
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tips Section */}
        <div className="bg-gradient-to-r from-blue-500 to-cyan-600 rounded-2xl shadow-lg">
          <div className="p-6 sm:p-8">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-xl font-bold text-white">Interview Tip</h3>
                <p className="mt-3 text-blue-100 text-lg">
                  Practice answering behavioral questions using the STAR method (Situation, Task, Action, Result).
                  This framework helps structure your responses clearly and effectively.
                </p>
                <div className="mt-6">
                  <button 
                    onClick={() => navigate('/user/domains')}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50"
                  >
                    Practice Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;