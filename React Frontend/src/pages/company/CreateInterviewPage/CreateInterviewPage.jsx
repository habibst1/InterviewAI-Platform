// src/pages/company/CreateInterviewPage/CreateInterviewPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { createInterview } from '../../../services/companyInterviewService';

const CreateInterviewPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [customQuestions, setCustomQuestions] = useState([{ text: '', idealAnswer: '', difficulty: 'C' }]);
  const [questionsPerTier, setQuestionsPerTier] = useState({
    E: 1,
    D: 1,
    C: 1,
    B: 1,
    A: 0,
  });
  const [candidateEmails, setCandidateEmails] = useState(['']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  // Get logo URL from currentUser
  const logoUrl = currentUser?.logoUrl;
  
  // Extract company name from email or use stored company name
  const companyName = currentUser?.email?.split('@')?.[1] || 'Company';

  // Handlers for Custom Questions
  const handleAddQuestion = () => {
    setCustomQuestions([...customQuestions, { text: '', idealAnswer: '', difficulty: 'C' }]);
  };

  const handleRemoveQuestion = (index) => {
    if (customQuestions.length <= 1) return;
    const newQuestions = [...customQuestions];
    newQuestions.splice(index, 1);
    setCustomQuestions(newQuestions);
  };

  const handleQuestionChange = (index, field, value) => {
    const newQuestions = [...customQuestions];
    newQuestions[index][field] = value;
    setCustomQuestions(newQuestions);
  };

  // Handlers for Questions Per Tier
  const handleTierChange = (tier, value) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      setQuestionsPerTier(prev => ({ ...prev, [tier]: numValue }));
    }
  };

  // Handlers for Candidate Emails
  const handleAddEmail = () => {
    setCandidateEmails([...candidateEmails, '']);
  };

  const handleRemoveEmail = (index) => {
    if (candidateEmails.length <= 1) return;
    const newEmails = [...candidateEmails];
    newEmails.splice(index, 1);
    setCandidateEmails(newEmails);
  };

  const handleEmailChange = (index, value) => {
    const newEmails = [...candidateEmails];
    newEmails[index] = value;
    setCandidateEmails(newEmails);
  };

  // Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setShowSuccessPopup(false);

    // Basic validation
    if (!title.trim()) {
      setError('Please provide a title for the interview.');
      return;
    }

    // Validate custom questions
    const filledQuestions = customQuestions.filter(q =>
      q.text.trim() || q.idealAnswer.trim()
    );
    for (let i = 0; i < filledQuestions.length; i++) {
      const q = filledQuestions[i];
      if (!q.text.trim()) {
        setError(`Question ${i + 1} text is required.`);
        return;
      }
      if (!q.idealAnswer.trim()) {
        setError(`Question ${i + 1} ideal answer is required.`);
        return;
      }
    }

    // Validate candidate emails
    const filledEmails = candidateEmails.filter(email => email.trim());
    for (let i = 0; i < filledEmails.length; i++) {
      const email = filledEmails[i];
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError(`Candidate email ${i + 1} is invalid.`);
        return;
      }
    }

    // Prepare data for API
    const validCustomQuestions = customQuestions
      .filter(q => q.text.trim() && q.idealAnswer.trim())
      .map(q => {
        let numericDifficulty;
        switch (q.difficulty) {
          case 'E': numericDifficulty = 0; break;
          case 'D': numericDifficulty = 1; break;
          case 'C': numericDifficulty = 2; break;
          case 'B': numericDifficulty = 3; break;
          case 'A': numericDifficulty = 4; break;
          default: numericDifficulty = 2;
        }
        return {
          text: q.text.trim(),
          idealAnswer: q.idealAnswer.trim(),
          difficulty: numericDifficulty
        };
      });

    const validCandidateEmails = candidateEmails
      .map(email => email.trim())
      .filter(email => email.length > 0);

    const interviewData = {
      title: title.trim(),
      questions: validCustomQuestions,
      questionsPerTier,
      candidateEmails: validCandidateEmails
    };

    console.log("Prepared interview data:", interviewData);

    setLoading(true);
    try {
      const response = await createInterview(interviewData);
      console.log("Interview created successfully:", response);
      
      // Show success popup
      setShowSuccessPopup(true);
      
      // Reset form fields
      setTitle('');
      setCustomQuestions([{ text: '', idealAnswer: '', difficulty: 'C' }]);
      setQuestionsPerTier({
        E: 1,
        D: 1,
        C: 1,
        B: 1,
        A: 0,
      });
      setCandidateEmails(['']);
      
      // Hide popup after 3 seconds
      setTimeout(() => {
        setShowSuccessPopup(false);
      }, 3000);
      
    } catch (err) {
      console.error('CreateInterviewPage - Failed to create interview:', err);
      if (err.response && err.response.data) {
        setError(`Failed to create interview: ${err.response.data.message || 'Unknown error'}`);
      } else {
        setError('Failed to create interview. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewMyInterviews = () => {
    navigate('/company/interviews');
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Creating Your Interview</h3>
          <p className="text-gray-600">Setting up questions and generating candidate links...</p>
        </div>
      </div>
    );
  }

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
                <h1 className="text-2xl font-bold text-gray-900">Create New Interview</h1>
                <p className="text-gray-600 mt-1">Set up your custom screening process</p>
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
        {/* Error Message */}
        {error && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-2xl p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 text-xl">!</span>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-red-800">Something went wrong</h3>
                <p className="text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Form */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <form onSubmit={handleSubmit}>
            {/* Interview Title */}
            <div className="p-6 border-b border-gray-100">
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Interview Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="e.g., Senior Frontend Developer Screening"
              />
            </div>

            {/* Custom Questions Section */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Custom Questions</h3>
                  <p className="text-sm text-gray-600 mt-1">Add your own interview questions</p>
                </div>
              </div>
              
              <div className="space-y-6">
                {customQuestions.map((question, index) => (
                  <div key={index} className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-gray-900">Question #{index + 1}</h4>
                      {customQuestions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(index)}
                          disabled={loading}
                          className="text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Question Text
                        </label>
                        <textarea
                          value={question.text}
                          onChange={(e) => handleQuestionChange(index, 'text', e.target.value)}
                          placeholder="What is your approach to handling cross-browser compatibility issues?"
                          disabled={loading}
                          rows={3}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Ideal Answer
                        </label>
                        <textarea
                          value={question.idealAnswer}
                          onChange={(e) => handleQuestionChange(index, 'idealAnswer', e.target.value)}
                          placeholder="A strong candidate would mention specific techniques like feature detection, CSS resets, vendor prefixes, and testing strategies..."
                          disabled={loading}
                          rows={3}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Difficulty Level
                        </label>
                        <div className="grid grid-cols-5 gap-2">
                          {['E', 'D', 'C', 'B', 'A'].map((tier) => (
                            <button
                              key={tier}
                              type="button"
                              onClick={() => handleQuestionChange(index, 'difficulty', tier)}
                              className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                                question.difficulty === tier
                                  ? 'bg-purple-600 text-white shadow-sm'
                                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                              }`}
                              disabled={loading}
                            >
                              {tier}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {/* Add Question Button Moved Here */}
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    disabled={loading}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 flex items-center"
                  >
                    <span>+</span>
                  </button>
                </div>                
              </div>
            </div>

            {/* Questions Per Tier Section */}
            <div className="p-6 border-b border-gray-100">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Question Pool</h3>
                <p className="text-sm text-gray-600 mt-1">Select how many questions from each difficulty tier</p>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {Object.entries(questionsPerTier).map(([tier, count]) => (
                  <div key={tier} className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 text-center border border-purple-100">
                    <div className="text-2xl font-bold text-purple-600 mb-1">{tier}</div>
                    <div className="text-xs text-purple-500 uppercase tracking-wide mb-3">Tier</div>
                    <input
                      type="number"
                      min="0"
                      value={count}
                      onChange={(e) => handleTierChange(tier, e.target.value)}
                      disabled={loading}
                      className="w-full px-3 py-2 border border-purple-200 rounded-lg text-center focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Candidate Emails Section */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Invite Candidates</h3>
                  <p className="text-sm text-gray-600 mt-1">Enter email addresses to send unique links</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddEmail}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50"
                >
                  + Add Email
                </button>
              </div>
              
              <div className="space-y-3">
                {candidateEmails.map((email, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="flex-1">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => handleEmailChange(index, e.target.value)}
                        placeholder="candidate@company.com"
                        disabled={loading}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      />
                    </div>
                    {candidateEmails.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveEmail(index)}
                        disabled={loading}
                        className="p-3 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Form Actions */}
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => navigate('/company/dashboard')}
                disabled={loading}
                className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all font-medium disabled:opacity-50 shadow-sm"
              >
                {loading ? (
                  <span className="flex items-center">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                    Creating...
                  </span>
                ) : (
                  'Create Interview'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-green-500 text-white px-8 py-6 rounded-xl shadow-2xl transform transition-all duration-500 ease-in-out animate-fadeInOut">
            <div className="flex items-center">
              <div className="mr-3 text-2xl">✓</div>
              <div>
                <h3 className="text-xl font-bold">Success!</h3>
                <p>Interview created successfully</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(20px); }
          20% { opacity: 1; transform: translateY(0); }
          80% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-20px); }
        }
        .animate-fadeInOut {
          animation: fadeInOut 3s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
};

export default CreateInterviewPage;