// src/pages/company/InterviewDetailsPage/InterviewDetailsPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { getInterviewDetails, inviteCandidates, finishInterview } from '../../../services/companyInterviewService';

const InterviewDetailsPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { interviewId } = useParams();

  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [newCandidateEmails, setNewCandidateEmails] = useState(['']);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [inviteError, setInviteError] = useState('');

  const [isFinishing, setIsFinishing] = useState(false);
  const [finishError, setFinishError] = useState('');

  const [visibleTokens, setVisibleTokens] = useState({});

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');

  // Get logo URL from currentUser
  const logoUrl = currentUser?.logoUrl;
  
  // Extract company name from email or use stored company name
  const companyName = currentUser?.email?.split('@')?.[1] || 'Company';

  // Difficulty mapping
  const difficultyMap = {
    0: 'E',
    1: 'D',
    2: 'C',
    3: 'B',
    4: 'A'
  };

  // Difficulty styling
  const getDifficultyStyle = (difficulty) => {
    switch(difficulty) {
      case 'E': return 'bg-green-100 border-green-200 text-green-800';
      case 'D': return 'bg-blue-100 border-blue-200 text-blue-800';
      case 'C': return 'bg-yellow-100 border-yellow-200 text-yellow-800';
      case 'B': return 'bg-orange-100 border-orange-200 text-orange-800';
      case 'A': return 'bg-red-100 border-red-200 text-red-800';
      default: return 'bg-gray-100 border-gray-200 text-gray-800';
    }
  };

  // Question background color based on difficulty
  const getQuestionBackground = (difficulty) => {
    switch(difficulty) {
      case 'E': return 'bg-green-50';
      case 'D': return 'bg-blue-50';
      case 'C': return 'bg-yellow-50';
      case 'B': return 'bg-orange-50';
      case 'A': return 'bg-red-50';
      default: return 'bg-white';
    }
  };

  useEffect(() => {
    const fetchInterviewDetails = async () => {
      if (!interviewId) {
        setError('Interview ID is missing.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        setInviteError('');
        setFinishError('');
        console.log(`Fetching details for interview ${interviewId}...`);
        const interviewData = await getInterviewDetails(interviewId);
        
        // Sort questions by order (ascending)
        if (interviewData.questions && interviewData.questions.length > 0) {
          interviewData.questions.sort((a, b) => (a.order || 0) - (b.order || 0));
        }
        
        console.log(`Details fetched for interview ${interviewId}:`, interviewData);
        setInterview(interviewData);
      } catch (err) {
        console.error(`InterviewDetailsPage - Failed to fetch details for ${interviewId}:`, err);
        if (err.response) {
          if (err.response.status === 404) {
            setError('Interview not found or access denied.');
          } else if (err.response.data) {
            setError(`Failed to load interview: ${err.response.data.message || 'Unknown error'}`);
          } else {
            setError('Failed to load interview.');
          }
        } else {
          setError('Failed to load interview. Please check your connection and try again.');
        }
        setInterview(null);
      } finally {
        setLoading(false);
      }
    };

    fetchInterviewDetails();
  }, [interviewId]);

  // Filter questions based on search term and difficulty
  const getFilteredQuestions = () => {
    if (!interview?.questions) return [];
    
    return interview.questions.filter(question => {
      // Filter by search term
      const matchesSearch = question.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           question.idealAnswer.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filter by difficulty
      const difficultySymbol = difficultyMap[question.difficulty];
      const matchesDifficulty = selectedDifficulty === 'all' || 
                               difficultySymbol === selectedDifficulty;
      
      return matchesSearch && matchesDifficulty;
    });
  };

  // Handlers for inviting more candidates
  const handleAddEmail = () => {
    setNewCandidateEmails([...newCandidateEmails, '']);
  };

  const handleRemoveEmail = (index) => {
    if (newCandidateEmails.length <= 1) return;
    const newEmails = [...newCandidateEmails];
    newEmails.splice(index, 1);
    setNewCandidateEmails(newEmails);
  };

  const handleEmailChange = (index, value) => {
    const newEmails = [...newCandidateEmails];
    newEmails[index] = value;
    setNewCandidateEmails(newEmails);
  };

  const handleInviteCandidates = async (e) => {
    e.preventDefault();
    setInviteError('');
    setInviteSuccess(false);

    const filledEmails = newCandidateEmails.filter(email => email.trim());
    if (filledEmails.length === 0) {
      setInviteError('Please enter at least one email address.');
      return;
    }
    for (let i = 0; i < filledEmails.length; i++) {
      const email = filledEmails[i];
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setInviteError(`Candidate email ${i + 1} is invalid.`);
        return;
      }
    }

    const validEmails = filledEmails.map(email => email.trim());

    setIsInviting(true);
    try {
      console.log(`Inviting candidates to interview ${interviewId}:`, validEmails);
      const response = await inviteCandidates(interviewId, validEmails);
      console.log("Candidates invited successfully:", response);
      
      // Update the interview state with new invitations
      if (response.links && Array.isArray(response.links)) {
        const newInvitations = response.links.map(link => ({
          candidateEmail: link.candidateEmail,
          isUsed: false,
          uniqueLinkToken: link.uniqueLinkToken  // Add the token
        }));
        
        setInterview(prev => ({
          ...prev,
          invitedCandidates: [
            ...(prev.invitedCandidates || []),
            ...newInvitations
          ],
          invitationCount: (prev.invitationCount || 0) + response.links.length
        }));
      }
      
      setInviteSuccess(true);
      setNewCandidateEmails(['']);
      alert(`Successfully invited ${response.links?.length || 0} candidates.`);
    } catch (err) {
      console.error(`InterviewDetailsPage - Failed to invite candidates to ${interviewId}:`, err);
      if (err.response && err.response.data) {
        setInviteError(`Failed to invite candidates: ${err.response.data.message || 'Unknown error'}`);
      } else {
        setInviteError('Failed to invite candidates. Please check your connection and try again.');
      }
    } finally {
      setIsInviting(false);
    }
  };

  // Handler for finishing the interview
  const handleFinishInterview = async () => {
    if (!window.confirm("Are you sure you want to finish this interview? This will deactivate it and prevent new candidates from starting it.")) {
      return;
    }

    setFinishError('');
    setIsFinishing(true);
    try {
      console.log(`Finishing interview ${interviewId}...`);
      await finishInterview(interviewId);
      console.log(`Interview ${interviewId} finished successfully.`);
      setInterview(prev => ({ ...prev, isActive: false }));
      alert("Interview finished successfully.");
    } catch (err) {
      console.error(`InterviewDetailsPage - Failed to finish interview ${interviewId}:`, err);
      if (err.response && err.response.data) {
        setFinishError(`Failed to finish interview: ${err.response.data.message || 'Unknown error'}`);
      } else {
        setFinishError('Failed to finish interview. Please check your connection and try again.');
      }
    } finally {
      setIsFinishing(false);
    }
  };

  const handleViewResults = () => {
    navigate(`/company/interviews/${interviewId}/results`);
  };

  const toggleTokenVisibility = (index) => {
    setVisibleTokens(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading Interview Details</h3>
          <p className="text-gray-600">Fetching your interview information...</p>
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
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Interview</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="flex space-x-3 justify-center">
              <button
                onClick={() => navigate('/company/interviews')}
                className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Back to Interviews
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

  if (!interview) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Interview Not Found</h3>
          <p className="text-gray-600 mb-6">The interview details could not be loaded.</p>
          <button
            onClick={() => navigate('/company/interviews')}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            Back to Interviews
          </button>
        </div>
      </div>
    );
  }

  // Get filtered questions
  const filteredQuestions = getFilteredQuestions();

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
                <h1 className="text-2xl font-bold text-gray-900">Interview Details</h1>
                <p className="text-gray-600 mt-1">Manage your screening process</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/company/interviews')}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              ← Back to Interviews
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Interview Summary */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900">{interview.title}</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Status</div>
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    interview.isActive 
                      ? 'bg-green-100 text-green-800 border border-green-200' 
                      : 'bg-gray-100 text-gray-800 border border-gray-200'
                  }`}>
                    {interview.isActive ? 'Active' : 'Finished'}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Created</div>
                  <div className="text-base font-semibold text-gray-900">
                    {new Date(interview.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Sessions</div>
                  <div className="text-base font-semibold text-gray-900">{interview.sessionCount || 0}</div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleViewResults}
                disabled={!interview.isActive && interview.sessionCount === 0}
                className="px-5 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                View Results
              </button>
              
              {interview.isActive ? (
                <button
                  onClick={handleFinishInterview}
                  disabled={isFinishing}
                  className="px-5 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isFinishing ? (
                    <span className="flex items-center">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                      Finishing...
                    </span>
                  ) : (
                    'Finish Interview'
                  )}
                </button>
              ) : (
                <button
                  disabled
                  className="px-5 py-3 bg-gray-400 text-white rounded-lg font-medium cursor-not-allowed"
                >
                  Interview Finished
                </button>
              )}
            </div>
            
            {finishError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{finishError}</h3>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Questions Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Questions</h2>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 mt-1">
                {filteredQuestions.length} of {interview.questions?.length || 0} questions
              </span>
            </div>
            
            {/* Search and Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              {/* Search Input */}
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search questions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              
              {/* Difficulty Filter */}
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
              >
                <option value="all">All Questions</option>
                <option value="E">E</option>
                <option value="D">D</option>
                <option value="C">C</option>
                <option value="B">B</option>
                <option value="A">A</option>
              </select>
            </div>
          </div>
          
          <div className="divide-y divide-gray-100">
            {filteredQuestions.length > 0 ? (
              filteredQuestions.map((question, index) => {
                // Convert numeric difficulty to symbol
                const difficultySymbol = difficultyMap[question.difficulty] || 'Unknown';
                
                return (
                  <div 
                    key={question.id} 
                    className={`p-6 ${getQuestionBackground(difficultySymbol)}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <span className="text-lg font-semibold text-gray-900 mr-3">Q{index + 1}.</span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getDifficultyStyle(difficultySymbol)}`}>
                          {difficultySymbol}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Question Text</h4>
                        <p className="text-gray-900">{question.text}</p>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Ideal Answer</h4>
                        <p className="text-gray-900 bg-white bg-opacity-70 p-4 rounded-lg border border-gray-200">{question.idealAnswer}</p>
                      </div>
                      
                      {question.audioUrl && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Audio Question</h4>
                          <audio 
                            controls 
                            src={question.audioUrl}
                            className="w-full max-w-md"
                          >
                            Your browser does not support the audio element.
                          </audio>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-12 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No questions found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm || selectedDifficulty !== 'all' 
                    ? 'Try adjusting your search or filter criteria' 
                    : 'This interview uses questions from the general pool.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Invitations Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900">Invitations</h2>
          </div>
          
          {/* Invite More Candidates Form */}
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Invite More Candidates</h3>
            
            {inviteSuccess && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">Candidates invited successfully!</h3>
                  </div>
                </div>
              </div>
            )}
            
            {inviteError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{inviteError}</h3>
                  </div>
                </div>
              </div>
            )}
            
            <form onSubmit={handleInviteCandidates} className="space-y-4">
              {newCandidateEmails.map((email, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="flex-1">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => handleEmailChange(index, e.target.value)}
                      placeholder="candidate@company.com"
                      disabled={isInviting}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    />
                  </div>
                  {newCandidateEmails.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveEmail(index)}
                      disabled={isInviting}
                      className="p-3 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleAddEmail}
                  disabled={isInviting}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50"
                >
                  + Add Email
                </button>
                <button
                  type="submit"
                  disabled={isInviting}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50"
                >
                  {isInviting ? (
                    <span className="flex items-center">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                      Sending Invitations...
                    </span>
                  ) : (
                    'Send Invitations'
                  )}
                </button>
              </div>
            </form>
          </div>
          
          {/* Sent Invitations List */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Sent Invitations</h3>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                {interview.invitedCandidates?.length || 0} sent
              </span>
            </div>
            
            {interview.invitedCandidates && interview.invitedCandidates.length > 0 ? (
              <div className="space-y-3">
                {interview.invitedCandidates.map((invitation, index) => (
                  <div key={index} className="p-4 pb-2 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                          <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{invitation.candidateEmail}</div>
                          <div className="text-sm text-gray-500">Invited candidate</div>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        invitation.isUsed 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {invitation.isUsed ? 'Completed' : 'Pending'}
                      </span>
                    </div>
                    
                    {/* Token Toggle Section */}
                    {invitation.uniqueLinkToken && (
                      <div className="mt-3">
                        <button
                          onClick={() => toggleTokenVisibility(index)}
                          className="text-sm text-purple-600 hover:text-purple-800 font-medium flex items-center"
                        >
                          {visibleTokens[index] ? 'Hide Token' : 'View Token'}
                        </button>
                        
                        {/* Collapsible Token Display */}
                        {visibleTokens[index] && (
                          <div className="mt-2 p-2 bg-white rounded border border-gray-200">
                            <div className="flex items-center">
                              <code className="flex-1 text-sm font-mono bg-gray-100 p-2 rounded break-all">
                                {invitation.uniqueLinkToken}
                              </code>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(invitation.uniqueLinkToken);
                                  alert('Token copied to clipboard!');
                                }}
                                className="ml-2 p-2 text-gray-500 hover:text-gray-700"
                                title="Copy token"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No invitations sent</h3>
                <p className="mt-1 text-sm text-gray-500">Invite candidates using the form above.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewDetailsPage;