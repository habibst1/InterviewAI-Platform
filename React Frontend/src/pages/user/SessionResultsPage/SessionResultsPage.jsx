// src/pages/user/SessionResultsPage/SessionResultsPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getResults } from '../../../services/publicInterviewService';
import { useAuth } from '../../../contexts/AuthContext';

const SessionResultsPage = () => {
  const { sessionId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchResults = async () => {
      if (!sessionId) {
        setError('Session ID is missing.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        console.log("Fetching results for session:", sessionId);
        const resultsData = await getResults(sessionId);
        console.log("Results fetched:", resultsData);
        setResults(resultsData);
      } catch (err) {
        console.error('SessionResultsPage - Failed to fetch results:', err);
        if (err.response) {
          if (err.response.status === 404) {
            setError('Session not found or access denied.');
          } else if (err.response.data) {
            setError(`Failed to load results: ${err.response.data.message || 'Unknown error'}`);
          } else {
            setError('Failed to load results.');
          }
        } else {
          setError('Failed to load results. Please check your connection and try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [sessionId]);

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading Your Results</h3>
          <p className="text-gray-600">Analyzing your interview performance...</p>
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
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Results</h3>
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

  // Results Still Processing
  if (results && results.message) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Results Processing</h3>
            <div className="mt-2 text-blue-600 font-medium mb-2">{results.message}</div>
            <p className="text-gray-600 mb-6">
              Our AI is analyzing your responses. This usually takes a few minutes.
            </p>
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
                Refresh Results
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Results Display
  if (results) {
    // Calculate score color based on value
    const getScoreColor = (score) => {
      if (score >= 85) return 'text-green-600';
      if (score >= 70) return 'text-blue-600';
      if (score >= 50) return 'text-yellow-600';
      return 'text-red-600';
    };

    // Calculate overall score percentage for progress bar
    const overallScore = results.totalScore !== undefined ? results.totalScore : 0;
    const scorePercentage = Math.min(100, Math.max(0, overallScore));

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Interview Results</h1>
                <p className="text-gray-600 mt-1">Review your performance and feedback</p>
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
          {/* Overall Score Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Performance Summary</h2>
            </div>
            <div className="p-6">
              <div className="flex flex-col md:flex-row items-center justify-between">
                <div className="text-center md:text-left mb-6 md:mb-0">
                  <div className="text-5xl font-bold text-gray-900 mb-2">
                    <span className={getScoreColor(overallScore)}>{overallScore.toFixed(1)}</span>
                    <span className="text-gray-400 text-2xl">/100</span>
                  </div>
                  <p className="text-gray-600">Overall Score</p>
                </div>
                
                <div className="w-full md:w-1/2">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Performance</span>
                    <span className="text-sm font-medium text-gray-700">{scorePercentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full ${
                        overallScore >= 85 ? 'bg-green-500' : 
                        overallScore >= 70 ? 'bg-blue-500' : 
                        overallScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${scorePercentage}%` }}
                    ></div>
                  </div>
                  
                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-semibold text-blue-700">
                        {results.breakdown ? results.breakdown.length : 0}
                      </p>
                      <p className="text-sm text-blue-600">Questions Answered</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-semibold text-green-700">
                        {results.breakdown ? results.breakdown.filter(q => q.score !== null).length : 0}
                      </p>
                      <p className="text-sm text-green-600">Evaluated</p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-semibold text-yellow-700">
                        {results.pendingEvaluations || 0}
                      </p>
                      <p className="text-sm text-yellow-600">Pending Evaluations</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Question Breakdown */}
          {results.breakdown && results.breakdown.length > 0 ? (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Question Analysis</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {results.breakdown.map((item, index) => (
                  <div key={index} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-xl font-semibold text-gray-900">Question {item.order}</h3>
                      <div className="flex items-center">
                        {item.score !== null ? (
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            item.score >= 85 ? 'bg-green-100 text-green-800' :
                            item.score >= 70 ? 'bg-blue-100 text-blue-800' :
                            item.score >= 50 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {item.score.toFixed(1)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                          </svg>
                          Your Answer (Transcribed)
                        </h4>
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                          <p className="text-gray-800">
                            {item.userAudioTranscribed || 'Transcription not available.'}
                          </p>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          AI Feedback
                        </h4>
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                          <p className="text-gray-800">
                            {item.feedback || 'No feedback available.'}
                          </p>
                        </div>
                      </div>
                      
                      {item.sampleAnswer && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                            <svg className="w-4 h-4 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Sample Answer
                          </h4>
                          <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                            <p className="text-gray-800">
                              {item.sampleAnswer}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">No Detailed Results</h3>
              <p className="text-gray-600 text-lg max-w-md mx-auto">
                No question breakdown is available at this time.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => navigate('/user/domains')}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all font-medium text-base shadow-sm"
                >
                  Practice More
                </button>
              </div>
            </div>
          )}

          {/* Tips Section */}
          <div className="mt-8 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-2xl p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-4">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Next Steps</h3>
                <p className="text-blue-100 text-base">
                  Review the feedback for each question and identify areas for improvement. 
                  Consider practicing similar questions to strengthen your skills. Focus on 
                  the questions where your score was lower to maximize your progress.
                </p>
                <div className="mt-4">
                  <button 
                    onClick={() => navigate('/user/domains')}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50"
                  >
                    Practice Similar Questions
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback State
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Unable to Display Results</h3>
        <p className="text-gray-600 mb-6">An unexpected error occurred while loading your results.</p>
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
  );
};

export default SessionResultsPage;