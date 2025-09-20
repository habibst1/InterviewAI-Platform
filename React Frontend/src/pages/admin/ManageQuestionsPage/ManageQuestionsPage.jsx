// src/pages/admin/ManageQuestionsPage/ManageQuestionsPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { getQuestionsByDomain, createQuestion, updateQuestion, deleteQuestion, changeQuestionDifficulty, getDomainConfiguration , updateDomainConfiguration } from '../../../services/adminService';

// --- Map difficulties for display/UI ---
const DIFFICULTY_CONFIG = {
  0: { label: 'E', short: 'E', color: 'bg-green-500', bg: 'bg-green-50', border: 'border-green-200' },
  1: { label: 'D', short: 'D', color: 'bg-blue-500', bg: 'bg-blue-50', border: 'border-blue-200' },
  2: { label: 'C', short: 'C', color: 'bg-yellow-500', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  3: { label: 'B', short: 'B', color: 'bg-orange-500', bg: 'bg-orange-50', border: 'border-orange-200' },
  4: { label: 'A', short: 'A', color: 'bg-red-500', bg: 'bg-red-50', border: 'border-red-200' }
};

const ManageQuestionsPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { domainId } = useParams();
  const [questions, setQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter states
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // State for creating/editing a question
  const [isEditing, setIsEditing] = useState(false);
  const [currentQuestionId, setCurrentQuestionId] = useState(null);
  const [questionForm, setQuestionForm] = useState({
    text: '',
    idealAnswer: '',
    difficulty: 2,
    audioUrl: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // State for deleting a question
  const [deletingQuestionId, setDeletingQuestionId] = useState(null);

  // State for changing difficulty inline
  const [changingDifficultyId, setChangingDifficultyId] = useState(null);
  const [newDifficulty, setNewDifficulty] = useState(2);

    // Domain configuration state
  const [domainConfig, setDomainConfig] = useState(null);
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [configForm, setConfigForm] = useState({
    questionsPerE: 2,
    questionsPerD: 2,
    questionsPerC: 2,
    questionsPerB: 2,
    questionsPerA: 2
  });
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configError, setConfigError] = useState('');
  const [configWarning, setConfigWarning] = useState(''); // New warning state

  useEffect(() => {
    const fetchQuestions = async () => {
      if (!domainId) {
        setError('Domain ID is missing.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError('');
        const questionsData = await getQuestionsByDomain(domainId);
        
        // Sort questions by difficulty (E to A = 0 to 4)
        const sortedQuestions = [...questionsData].sort((a, b) => a.difficulty - b.difficulty);
        
        setQuestions(sortedQuestions);
        setFilteredQuestions(sortedQuestions);
      } catch (err) {
        console.error(`ManageQuestionsPage - Failed to fetch questions:`, err);
        if (err.response && err.response.data) {
          setError(`Failed to load questions: ${err.response.data.message || 'Unknown error'}`);
        } else {
          setError('Failed to load questions. Please check your connection and try again.');
        }
        setQuestions([]);
        setFilteredQuestions([]);
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [domainId]);

  // Apply filters whenever questions, difficultyFilter, or searchQuery change
  useEffect(() => {
    let result = [...questions];
    // Apply difficulty filter
    if (difficultyFilter !== 'all') {
      result = result.filter(q => q.difficulty === Number(difficultyFilter));
    }
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(q =>
        q.text.toLowerCase().includes(query) ||
        q.idealAnswer.toLowerCase().includes(query)
      );
    }
    setFilteredQuestions(result);
  }, [questions, difficultyFilter, searchQuery]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const finalValue = name === 'difficulty' ? Number(value) : value;
    setQuestionForm(prev => ({ ...prev, [name]: finalValue }));
  };

  // Fetch domain configuration
  useEffect(() => {
    const fetchDomainConfig = async () => {
      if (!domainId) return;
      try {
        const config = await getDomainConfiguration(domainId);
        setDomainConfig(config);
        setConfigForm({
          questionsPerE: config.questionsPerE,
          questionsPerD: config.questionsPerD,
          questionsPerC: config.questionsPerC,
          questionsPerB: config.questionsPerB,
          questionsPerA: config.questionsPerA
        });
      } catch (err) {
        console.error('Failed to fetch domain configuration:', err);
        // If no config exists, use defaults
        setDomainConfig({
          questionsPerE: 2,
          questionsPerD: 2,
          questionsPerC: 2,
          questionsPerB: 2,
          questionsPerA: 2
        });
      }
    };
    fetchDomainConfig();
  }, [domainId]);

  // Check for configuration warnings
  useEffect(() => {
    if (!domainConfig || questions.length === 0) return;

    // Count questions by difficulty
    const difficultyCounts = questions.reduce((acc, question) => {
      const key = `questionsPer${DIFFICULTY_CONFIG[question.difficulty].short}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    // Check if any configured count exceeds available questions
    const warnings = [];
    Object.entries(domainConfig).forEach(([key, requiredCount]) => {
      const actualCount = difficultyCounts[key] || 0;
      if (requiredCount > actualCount) {
        const difficultyLetter = key.charAt(key.length - 1);
        const difficultyLabel = Object.values(DIFFICULTY_CONFIG).find(
          d => d.short === difficultyLetter
        )?.label || difficultyLetter;
        warnings.push(
          `Need ${requiredCount} ${difficultyLabel} questions but only ${actualCount} available`
        );
      }
    });

    setConfigWarning(warnings.length > 0 ? warnings.join('; ') : '');
  }, [domainConfig, questions]);

  // Handle domain configuration form changes
  const handleConfigInputChange = (e) => {
    const { name, value } = e.target;
    setConfigForm(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
  };

  // Save domain configuration
  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setIsSavingConfig(true);
    setConfigError('');
    try {
      const updatedConfig = await updateDomainConfiguration(domainId, configForm);
      setDomainConfig(updatedConfig);
      setIsEditingConfig(false);
    } catch (err) {
      console.error('Failed to update domain configuration:', err);
      setConfigError('Failed to update configuration. Please try again.');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleStartCreate = () => {
    setIsEditing(false);
    setCurrentQuestionId(null);
    setQuestionForm({ text: '', idealAnswer: '', difficulty: 2, audioUrl: '' });
    setFormError('');
  };

  const handleStartEdit = (question) => {
    setIsEditing(true);
    setCurrentQuestionId(question.id);
    setQuestionForm({
      text: question.text,
      idealAnswer: question.idealAnswer,
      difficulty: question.difficulty,
      audioUrl: question.audioUrl || ''
    });
    setFormError('');
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setCurrentQuestionId(null);
    setQuestionForm({ text: '', idealAnswer: '', difficulty: 2, audioUrl: '' });
    setFormError('');
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    if (!questionForm.text.trim() || !questionForm.idealAnswer.trim()) {
      setFormError('Question text and ideal answer are required.');
      return;
    }
    setIsSaving(true);
    setFormError('');
    setError('');
    try {
      if (isEditing && currentQuestionId) {
        // Optimistic update
        setQuestions(prevQuestions =>
          prevQuestions.map(q =>
            q.id === currentQuestionId ? { ...q, ...questionForm } : q
          )
        );
        try {
          await updateQuestion(currentQuestionId, { ...questionForm, domainId });
        } catch (apiError) {
          // Rollback on error
          setQuestions(prevQuestions =>
            prevQuestions.map(q => {
              const originalQuestion = questions.find(origQ => origQ.id === q.id);
              return q.id === currentQuestionId && originalQuestion ? { ...originalQuestion } : q;
            })
          );
          throw apiError;
        }
        handleCancelEdit();
      } else {
        const savedQuestion = await createQuestion({ ...questionForm, domainId });
        setQuestions(prevQuestions => [...prevQuestions, savedQuestion]);
        handleCancelEdit();
      }
    } catch (err) {
      console.error('ManageQuestionsPage - Failed to save question:', err);
      if (err.response && err.response.data) {
        setFormError(`Failed to save question: ${err.response.data.message || 'Unknown error'}`);
      } else {
        setFormError('Failed to save question. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteQuestion = async (questionId, questionText) => {
    const truncatedText = questionText.length > 50 ? questionText.substring(0, 47) + '...' : questionText;
    if (!window.confirm(`Are you sure you want to delete:
"${truncatedText}"?`)) {
      return;
    }
    setDeletingQuestionId(questionId);
    setError('');
    try {
      await deleteQuestion(questionId);
      setQuestions(prevQuestions => prevQuestions.filter(q => q.id !== questionId));
    } catch (err) {
      console.error('ManageQuestionsPage - Failed to delete question:', err);
      if (err.response && err.response.data) {
        setError(`Failed to delete question: ${err.response.data.message || 'Unknown error'}`);
      } else {
        setError('Failed to delete question. Please try again.');
      }
    } finally {
      setDeletingQuestionId(null);
    }
  };

  const handleStartChangeDifficulty = (questionId, currentDifficulty) => {
    setChangingDifficultyId(questionId);
    setNewDifficulty(currentDifficulty);
  };

  const handleCancelChangeDifficulty = () => {
    setChangingDifficultyId(null);
    setNewDifficulty(2);
  };

  const handleSaveDifficulty = async (questionId) => {
    const currentQuestion = questions.find(q => q.id === questionId);
    const currentDifficultyNumeric = currentQuestion?.difficulty;
    if (newDifficulty === currentDifficultyNumeric) {
      handleCancelChangeDifficulty();
      return;
    }
    setError('');
    try {
      const updatedQuestion = await changeQuestionDifficulty(questionId, DIFFICULTY_CONFIG[newDifficulty].short);
      setQuestions(prevQuestions =>
        prevQuestions.map(q =>
          q.id === questionId ? { ...q, difficulty: newDifficulty } : q
        )
      );
      handleCancelChangeDifficulty();
    } catch (err) {
      console.error('ManageQuestionsPage - Failed to change difficulty:', err);
      if (err.response && err.response.data) {
        setError(`Failed to change difficulty: ${err.response.data.message || 'Unknown error'}`);
      } else {
        setError('Failed to change difficulty. Please try again.');
      }
    }
  };

  const clearFilters = () => {
    setDifficultyFilter('all');
    setSearchQuery('');
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl shadow-lg p-6 h-96">
                  <div className="h-6 bg-gray-200 rounded w-2/3 mb-4"></div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <div className="h-6 bg-gray-200 rounded w-1/4 mb-6"></div>
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="border border-gray-200 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="h-4 bg-gray-200 rounded w-16"></div>
                          <div className="h-4 bg-gray-200 rounded w-24"></div>
                        </div>
                        <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
       {/* Header */}
       <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Question Manager</h1>
              <p className="text-gray-600 mt-1">Create and organize your interview questions</p>
            </div>
            <Link
              to="/admin/domains"
              className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              ← Back to Domains
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats and Create Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="bg-white rounded-2xl shadow-sm px-4 py-3 border border-gray-100">
              <span className="text-xl font-bold text-gray-900">{questions.length}</span>
              <span className="text-gray-600 text-sm ml-2">Questions</span>
            </div>
            <div className="hidden sm:block w-px h-8 bg-gray-200"></div>
            <div className="text-sm text-gray-600">
              Manage your question bank efficiently
            </div>
          </div>
          <button
            onClick={handleStartCreate}
            className="px-5 py-2.5 bg-gradient-to-r from-gray-600 to-gray-800 text-white rounded-lg hover:from-gray-700 hover:to-gray-900 transition-all font-medium shadow-lg"
          >
            Add New Question
          </button>
        </div>

        {/* Error Messages */}
        {(error || formError || configError) && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  {error || formError || configError}
                </h3>
              </div>
            </div>
          </div>
        )}

        {/* Configuration Warning */}
        {configWarning && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Configuration Warning: {configWarning}
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>Please add more questions or adjust your domain configuration.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Question Form Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden sticky top-24">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900">
                  {isEditing ? 'Edit Question' : 'Create Question'}
                </h2>
                <p className="text-gray-600 text-sm mt-1">
                  {isEditing ? 'Modify existing question' : 'Add a new question to your bank'}
                </p>
              </div>
              <div className="p-6">
                <form onSubmit={handleSaveQuestion} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Question Text
                    </label>
                    <textarea
                      name="text"
                      value={questionForm.text}
                      onChange={handleInputChange}
                      required
                      disabled={isSaving}
                      placeholder="What is your approach to handling cross-browser compatibility?"
                      rows="4"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ideal Answer
                    </label>
                    <textarea
                      name="idealAnswer"
                      value={questionForm.idealAnswer}
                      onChange={handleInputChange}
                      required
                      disabled={isSaving}
                      placeholder="A strong candidate would mention specific techniques like feature detection..."
                      rows="4"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all resize-none"
                    />
                  </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Difficulty
                      </label>
                      <select
                        name="difficulty"
                        value={questionForm.difficulty}
                        onChange={handleInputChange}
                        disabled={isSaving}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all"
                      >
                        {[0, 1, 2, 3, 4].map(num => (
                          <option key={num} value={num}>
                            {DIFFICULTY_CONFIG[num].label}
                          </option>
                        ))}
                      </select>
                    </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex-1 px-4 py-2.5 bg-gradient-to-r from-gray-600 to-gray-800 text-white rounded-lg hover:from-gray-700 hover:to-gray-900 transition-all font-medium shadow-lg disabled:opacity-50"
                    >
                      {isSaving ? (
                        <span className="flex items-center justify-center">
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                          {isEditing ? 'Updating...' : 'Creating...'}
                        </span>
                      ) : (
                        <>
                          {isEditing ? 'Update Question' : 'Create Question'}
                        </>
                      )}
                    </button>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        className="px-4 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Questions List with Filters */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Question Bank</h2>
                  <p className="text-gray-600 text-sm mt-1">
                    {filteredQuestions.length} of {questions.length} questions
                  </p>
                </div>
              </div>

              {/* Filters */}
              <div className="p-6 border-b border-gray-100 bg-gray-50">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search questions..."
                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="sm:w-48">
                    <select
                      value={difficultyFilter}
                      onChange={(e) => setDifficultyFilter(e.target.value)}
                      className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    >
                      <option value="all">All Difficulties</option>
                      {[0, 1, 2, 3, 4].map(num => (
                        <option key={num} value={num}>
                          {DIFFICULTY_CONFIG[num].label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {(difficultyFilter !== 'all' || searchQuery) && (
                    <button
                      onClick={clearFilters}
                      className="px-3 py-2.5 text-sm text-gray-600 hover:text-gray-900 font-medium"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>

              <div className="p-6">
                {filteredQuestions.length > 0 ? (
                  <div className="space-y-4">
                    {filteredQuestions.map((question) => {
                      const difficultyConfig = DIFFICULTY_CONFIG[question.difficulty];
                      return (
                        <div
                          key={question.id}
                          className={`${difficultyConfig.bg} ${difficultyConfig.border} border rounded-2xl p-5 hover:shadow-md transition-all`}
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className={`${difficultyConfig.color} w-3 h-3 rounded-full`}></div>
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white ${difficultyConfig.color}`}>
                                {difficultyConfig.short}
                              </span>
                              <span className="text-xs text-gray-500 font-mono">
                                {question.id.substring(0, 8)}...
                              </span>
                            </div>
                            {changingDifficultyId === question.id ? (
                              <div className="flex items-center gap-2">
                                <select
                                  value={newDifficulty}
                                  onChange={(e) => setNewDifficulty(Number(e.target.value))}
                                  className="px-2 py-1 text-xs border border-gray-300 rounded-lg"
                                >
                                  {[0, 1, 2, 3, 4].map(num => (
                                    <option key={num} value={num}>
                                      {DIFFICULTY_CONFIG[num].short}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => handleSaveDifficulty(question.id)}
                                  className="px-2 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={handleCancelChangeDifficulty}
                                  className="px-2 py-1 text-xs bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleStartChangeDifficulty(question.id, question.difficulty)}
                                  className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                  title="Change difficulty"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                  </svg>
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="space-y-3">
                            <div>
                              <p className="text-gray-900 font-medium">{question.text}</p>
                            </div>
                            <div className="bg-white/70 rounded-lg p-3 border border-gray-100">
                              <p className="text-gray-700 text-sm">{question.idealAnswer}</p>
                            </div>
                            {question.audioUrl && (
                              <div className="pt-2">
                                <audio
                                  controls
                                  src={question.audioUrl}
                                  className="w-full"
                                >
                                  Your browser does not support the audio element.
                                </audio>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
                            <button
                              onClick={() => handleStartEdit(question)}
                              className="px-3 py-1.5 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteQuestion(question.id, question.text)}
                              disabled={deletingQuestionId === question.id}
                              className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                              {deletingQuestionId === question.id ? (
                                <span className="flex items-center">
                                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></span>
                                  Deleting
                                </span>
                              ) : (
                                'Delete'
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                       <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {questions.length > 0 ? 'No matching questions' : 'No questions yet'}
                    </h3>
                    <p className="text-gray-600 mb-6">
                      {questions.length > 0
                        ? 'Try adjusting your filters or search terms'
                        : 'Get started by creating your first question'
                      }
                    </p>
                    {questions.length === 0 && (
                      <button
                        onClick={handleStartCreate}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                      >
                        Create Your First Question
                      </button>
                    )}
                    {(difficultyFilter !== 'all' || searchQuery) && (
                      <button
                        onClick={clearFilters}
                        className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium mt-2"
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Domain Configuration Section */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Domain Configuration</h2>
            {!isEditingConfig ? (
              <button
                onClick={() => setIsEditingConfig(true)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                Edit Configuration
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleSaveConfig}
                  disabled={isSavingConfig}
                  className="px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-800 text-white rounded-lg hover:from-gray-700 hover:to-gray-900 transition-all font-medium shadow-lg disabled:opacity-50"
                >
                  {isSavingConfig ? (
                    <span className="flex items-center">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                      Saving...
                    </span>
                  ) : (
                    'Save'
                  )}
                </button>
                <button
                  onClick={() => {
                    setIsEditingConfig(false);
                    if (domainConfig) {
                      setConfigForm({
                        questionsPerE: domainConfig.questionsPerE,
                        questionsPerD: domainConfig.questionsPerD,
                        questionsPerC: domainConfig.questionsPerC,
                        questionsPerB: domainConfig.questionsPerB,
                        questionsPerA: domainConfig.questionsPerA
                      });
                    }
                  }}
                  className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
          <div className="p-6">
            {isEditingConfig ? (
              <form onSubmit={handleSaveConfig} className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {['E', 'D', 'C', 'B', 'A'].map((level, index) => (
                  <div key={level}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Questions {level}
                    </label>
                    <input
                      type="number"
                      name={`questionsPer${level}`}
                      value={configForm[`questionsPer${level}`]}
                      onChange={handleConfigInputChange}
                      min="0"
                      max="20"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all"
                    />
                  </div>
                ))}
              </form>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {['E', 'D', 'C', 'B', 'A'].map((level, index) => (
                  <div key={level} className="bg-gray-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {domainConfig ? domainConfig[`questionsPer${level}`] : 2}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Questions {level}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageQuestionsPage;