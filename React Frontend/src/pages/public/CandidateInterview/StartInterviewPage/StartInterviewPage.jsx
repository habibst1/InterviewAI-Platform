// src/pages/public/CandidateInterview/StartInterviewPage/StartInterviewPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { startCandidateInterview } from '../../../../services/candidateInterviewService';

const StartInterviewPage = () => {
  const navigate = useNavigate();
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const emailFromUrl = searchParams.get('email');

  const [candidateEmail, setCandidateEmail] = useState(emailFromUrl || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Invalid interview link: Token is missing.');
    } else {
      setInfoMessage(`You are about to start an interview using the link token: ${token.substring(0, 8)}...`);
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setError('Cannot start interview: Token is missing.');
      return;
    }
    if (!candidateEmail.trim()) {
      setError('Please enter your email address.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(candidateEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setError('');
    setInfoMessage('Starting your interview...');

    try {
      console.log("Starting candidate interview with email:", candidateEmail);
      const startData = await startCandidateInterview(token, { candidateEmail });
      console.log("Interview started successfully:", startData);
      navigate(`/candidate-interview/session/${startData.sessionId}`, { state: { initialQuestionData: startData, logoUrl: startData.logoUrl } });
    } catch (err) {
      console.error('StartInterviewPage - Failed to start interview:', err);
      if (err.response) {
        if (err.response.status === 400) {
          if (err.response.data?.code === 'MISSING_CANDIDATE_EMAIL') {
            setError('Email address is required.');
          } else if (err.response.data?.code === 'EMAIL_MISMATCH') {
            setError('The email you entered does not match the invitation email.');
          } else {
            setError(`Invalid request: ${err.response.data?.message || 'Unknown error'}`);
          }
        } else if (err.response.status === 404) {
          setError('Invalid or expired interview link.');
        } else if (err.response.status === 409) {
          setError('This interview link has already been used.');
        } else if (err.response.data) {
          setError(`Failed to start interview: ${err.response.data.message || 'Unknown error'}`);
        } else {
          setError('Failed to start interview.');
        }
      } else {
        setError('Failed to start interview. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
      if (error) setInfoMessage('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Candidate Interview</h1>
          <p className="text-gray-600">Get ready to showcase your skills</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="p-8">
            {/* Info Messages */}
            {infoMessage && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-blue-800">{infoMessage}</h3>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  </div>
                </div>
              </div>
            )}

            {/* Email Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="candidateEmail" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Email Address
                </label>
                <input
                  type="email"
                  id="candidateEmail"
                  value={candidateEmail}
                  onChange={(e) => setCandidateEmail(e.target.value)}
                  required
                  disabled={loading || !token}
                  placeholder="candidate@example.com"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 disabled:opacity-50"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Please ensure this email matches the one the invitation was sent to.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !token}
                className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Starting Interview...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Start Interview
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Instructions Section */}
          <div className="bg-gray-50 border-t border-gray-100 p-8">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Before You Begin</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center mt-0.5">
                    <span className="text-white text-xs font-bold">1</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Prepare Your Setup</h3>
                    <p className="text-sm text-gray-600 mt-1">Ensure you have a working microphone and find a quiet place.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center mt-0.5">
                    <span className="text-white text-xs font-bold">2</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Listen Carefully</h3>
                    <p className="text-sm text-gray-600 mt-1">You'll be asked a series of questions. Listen carefully to each one.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center mt-0.5">
                    <span className="text-white text-xs font-bold">3</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Record Your Answer</h3>
                    <p className="text-sm text-gray-600 mt-1">Press "Record" to start and "Stop" when finished.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center mt-0.5">
                    <span className="text-white text-xs font-bold">4</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Submit & Continue</h3>
                    <p className="text-sm text-gray-600 mt-1">Submit your answer to proceed to the next question.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-yellow-800">Important Note</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    You cannot pause the interview once started. Take your time to think before recording, 
                    but keep your responses concise and focused.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-gray-500 text-sm">
            Having trouble? Contact your recruiter for assistance
          </p>
        </div>
      </div>
    </div>
  );
};

export default StartInterviewPage;