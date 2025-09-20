// src/pages/user/DomainSelectionPage/DomainSelectionPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDomains, startInterview } from '../../../services/publicInterviewService';
import { useAuth } from '../../../contexts/AuthContext';

const DomainSelectionPage = () => {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startingDomainId, setStartingDomainId] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchDomains = async () => {
      try {
        setLoading(true);
        setError('');
        const domainData = await getDomains();
        setDomains(domainData);
      } catch (err) {
        console.error('DomainSelectionPage - Failed to fetch domains:', err);
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

  const handleDomainSelect = async (domainId) => {
    setStartingDomainId(domainId);
    setError('');

    try {
      console.log("DomainSelectionPage: Starting interview for domain:", domainId);
      const startData = await startInterview(domainId);
      console.log("DomainSelectionPage: Interview started:", startData);

      localStorage.setItem(`isNewSession_${startData.sessionId}`, 'true');
      navigate(`/user/interview/session/${startData.sessionId}`);
    } catch (err) {
      console.error('DomainSelectionPage - Failed to start interview:', err);
      if (err.response && err.response.data) {
        setError(`Failed to start interview: ${err.response.data.message || 'Unknown error'}`);
      } else {
        setError('Failed to start interview. Please try again.');
      }
    } finally {
      setStartingDomainId(null);
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading Practice Domains</h3>
          <p className="text-gray-600">Preparing your interview options...</p>
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
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Domains</h3>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6 md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                Practice Domains
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Select a technology area to start your AI-powered interview practice
              </p>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4">
            <button
              onClick={() => navigate('/user/dashboard')}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              ← Back to Dashboard
            </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Section */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-2xl border border-gray-100">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-100 rounded-lg p-3">
                  <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Domains</dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">{domains.length}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-2xl border border-gray-100">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-100 rounded-lg p-3">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Completed Sessions</dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {domains.reduce((sum, domain) => sum + domain.sessionCount, 0)}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-2xl border border-gray-100">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-purple-100 rounded-lg p-3">
                  <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Popular Domain</dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {domains.length > 0 
                          ? domains.reduce((prev, current) => 
                              (prev.sessionCount > current.sessionCount) ? prev : current
                            ).name
                          : 'N/A'}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 rounded-2xl bg-red-50 p-4 border border-red-200">
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

        {/* Domains Grid */}
        {domains.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Available Practice Domains</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
              {domains.map((domain) => (
                <div
                  key={domain.id}
                  onClick={() => !startingDomainId && handleDomainSelect(domain.id)}
                  className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-300 transform hover:-translate-y-1 hover:shadow-md ${
                    startingDomainId === domain.id 
                      ? 'opacity-75 cursor-not-allowed' 
                      : 'cursor-pointer group'
                  }`}
                >
                  <div className="p-6">
                    <div className="flex items-center mb-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center bg-gray-100 overflow-hidden">
                        {domain.logoUrl ? (
                          <img 
                            src={`http://localhost:5143${domain.logoUrl}`} 
                            alt={domain.name} 
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.parentElement.innerHTML = `
                                <div class="w-12 h-12 rounded-lg flex items-center justify-center bg-gray-200">
                                  <svg class="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </div>
                              `;
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-gray-200">
                            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <h3 className="ml-4 text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                        {domain.name}
                      </h3>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {domain.sessionCount || 0} sessions
                      </span>
                      {startingDomainId === domain.id ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      ) : (
                        <svg className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">No Domains Available</h3>
            <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
              Check back later for new practice domains.
            </p>
            <button
              onClick={() => navigate('/user/dashboard')}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all font-medium text-base shadow-sm"
            >
              Back to Dashboard
            </button>
          </div>
        )}

        {/* Tips Section */}
        {domains.length > 0 && (
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
                  Start with domains you're most familiar with to build confidence, then gradually move to more challenging areas.
                  Consistent practice across different domains will make you a well-rounded candidate.
                </p>
                <div className="mt-4">
                  <button 
                    onClick={() => navigate('/user/dashboard')}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50"
                  >
                    View Progress
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

export default DomainSelectionPage;