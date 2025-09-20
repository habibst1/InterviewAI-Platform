// src/pages/public/CandidateInterview/InterviewSessionPage/InterviewSessionPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { submitCandidateResponse, getNextCandidateQuestion } from '../../../../services/candidateInterviewService';

const InterviewSessionPage = () => {
  const { sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showLoading, setShowLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading...');

  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isPlayingQuestion, setIsPlayingQuestion] = useState(false);

  // Add logoUrl state
  const [logoUrl, setLogoUrl] = useState(null);

  const audioPlaybackRef = useRef(null);
  const timerRef = useRef(null);

  // Timer effect for recording
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize with initial question data
  useEffect(() => {
    const initializeSession = async () => {
      const initialData = location.state?.initialQuestionData;
      const logoUrlFromState = location.state?.logoUrl; // Get logoUrl from state
      if (logoUrlFromState) {
        setLogoUrl(logoUrlFromState); // Set the logo URL
      }

      if (initialData && initialData.sessionId === sessionId) {
        console.log("Using initial question data from start:", initialData);
        // Show loading state for initial question loading
        setShowLoading(true);
        setLoadingMessage('Starting your interview...');
        setTimeout(() => {
          setCurrentQuestion({
            order: initialData.order,
            text: initialData.text,
            audioUrl: initialData.audioUrl,
            difficulty: initialData.difficulty,
          });
          setTotalQuestions(initialData.totalQuestions);
          setShowLoading(false);
        }, 1500);
      } else if (sessionId) {
        console.warn("InterviewSessionPage: No initial question data found in location state for session", sessionId);
        setError("Unable to load interview session. Please start from the provided link.");
      } else {
        setError("Session ID is missing.");
      }
    };

    initializeSession();
  }, [location.state, sessionId]);

  const playQuestionAudio = () => {
    if (currentQuestion?.audioUrl && audioPlaybackRef.current) {
      setIsPlayingQuestion(true);
      audioPlaybackRef.current.play();
      
      // Reset playing state when audio ends
      const handleEnded = () => {
        setIsPlayingQuestion(false);
        audioPlaybackRef.current.removeEventListener('ended', handleEnded);
      };
      
      audioPlaybackRef.current.addEventListener('ended', handleEnded);
    }
  };

  // Recording Logic
  const startRecording = async () => {
    setError('');
    setRecordedAudioUrl(null);
    setAudioChunks([]);
    setSubmissionSuccess(false);
    setTimeElapsed(0);

    if (!navigator.mediaDevices || !window.MediaRecorder) {
      setError('Audio recording is not supported in your browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);

      const chunks = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
          setAudioChunks(prev => [...prev, event.data]);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(audioUrl);
        console.log('Recording stopped, audio blob created.');
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      console.log('Recording started...');
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      console.log('Recording stopped.');
    }
  };

  // Submission Logic
  const handleSubmit = async () => {
    if (!sessionId || !currentQuestion || audioChunks.length === 0) {
      setError('No recording available to submit.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      await submitCandidateResponse({
        sessionId,
        questionOrder: currentQuestion.order,
        audioResponse: audioBlob,
      });

      console.log('Response submitted successfully.');
      setSubmissionSuccess(true);
      setAudioChunks([]);
      setRecordedAudioUrl(null);
      setMediaRecorder(null);

      await fetchNextQuestion();
    } catch (err) {
      console.error('InterviewSessionPage - Failed to submit response:', err);
      if (err.response && err.response.data) {
        setError(`Failed to submit response: ${err.response.data.message || 'Unknown error'}`);
      } else {
        setError('Failed to submit response. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch Next Question Logic
  const fetchNextQuestion = async () => {
    if (!sessionId) {
      console.error("fetchNextQuestion called but sessionId is missing.");
      setError("Unable to proceed: Session ID is missing.");
      return;
    }

    try {
      setLoading(true);
      setShowLoading(true);
      setLoadingMessage('Loading next question...');
      setError('');
      console.log("Fetching next question for session:", sessionId);

      const nextQuestionData = await getNextCandidateQuestion(sessionId);
      console.log("Next question received:", nextQuestionData);

      if (
        (nextQuestionData && nextQuestionData.code === 'NO_MORE_QUESTIONS') ||
        (nextQuestionData && nextQuestionData.message && nextQuestionData.message.includes('No more questions'))
      ) {
        console.log("Interview completed!");
        navigate(`/candidate-interview/completed/${sessionId}`);
        return;
      }

      if (nextQuestionData && typeof nextQuestionData === 'object' && nextQuestionData.order !== undefined) {
        setCurrentQuestion({
          order: nextQuestionData.order,
          text: nextQuestionData.text,
          audioUrl: nextQuestionData.audioUrl,
          difficulty: nextQuestionData.difficulty,
        });
        if (nextQuestionData.totalQuestions !== undefined) {
          setTotalQuestions(nextQuestionData.totalQuestions);
        }
        setSubmissionSuccess(false);
        setTimeElapsed(0);
      } else {
        console.error("fetchNextQuestion - Unexpected successful response format:", nextQuestionData);
        setError("Received unexpected data from the server. Unable to load the next question.");
      }
      
      // Show loading state for at least 1.5 seconds
      setTimeout(() => {
        setShowLoading(false);
      }, 1500);

    } catch (err) {
      console.error('InterviewSessionPage - Failed to get next question:', err);

      if (err.response) {
        if (err.response.status === 404) {
          if (
            (err.response.data && err.response.data.code === 'NO_MORE_QUESTIONS') ||
            (err.response.data && err.response.data.message && err.response.data.message.includes('No more questions'))
          ) {
            console.log("Interview completed!");
            navigate(`/candidate-interview/completed/${sessionId}`);
            return;
          } else {
            setError(`Session issue (404): ${err.response.data?.message || 'Session not found or access denied.'}`);
          }
        } else if (err.response.data) {
          setError(`Failed to get next question (${err.response.status}): ${err.response.data.message || 'Unknown error'}`);
        } else {
          setError(`Failed to get next question (${err.response.status}).`);
        }
      } else {
        setError('Failed to get next question. Please check your connection.');
      }
      
      setShowLoading(false);

    } finally {
      setLoading(false);
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (recordedAudioUrl) {
        URL.revokeObjectURL(recordedAudioUrl);
      }
    };
  }, [recordedAudioUrl]);

  // Persistent Loading State
  if (showLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-3xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{loadingMessage}</h3>
          <p className="text-gray-600">Preparing your interview experience...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Something Went Wrong</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate('/')}
                className="px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors font-medium"
              >
                Go to Homepage
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Interview Interface
  if (currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        {/* Hidden Audio Element */}
        <audio 
          ref={audioPlaybackRef} 
          src={currentQuestion.audioUrl}
          className="hidden"
        >
          Your browser does not support the audio element.
        </audio>

        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                {/* Logo Display */}
                {logoUrl && (
                  <div className="flex-shrink-0 mr-4">
                    <img 
                      src={`http://localhost:5143${logoUrl}`} 
                      alt="Company Logo" 
                      className="h-10 w-auto"
                    />
                  </div>
                )}
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Interview in Progress</h1>
                  <p className="text-sm text-gray-500">
                    Question {currentQuestion?.order} of {totalQuestions}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-6">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${(currentQuestion.order / totalQuestions) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* AI Interface - Main Screen (Taller Height) */}
            <div className="lg:col-span-2">
              <div className={`rounded-3xl shadow-2xl border-2 transition-all duration-500 ${
                isPlayingQuestion 
                  ? 'bg-gradient-to-br from-purple-600 via-indigo-700 to-blue-800 border-purple-400 shadow-purple-500/20' 
                  : 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700'
              }`}>
                <div className="p-8 h-[500px] flex flex-col items-center justify-center text-center">
                  {/* AI Avatar */}
                  <div className={`w-32 h-32 rounded-full mb-8 flex items-center justify-center transition-all duration-500 ${
                    isPlayingQuestion 
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shadow-purple-500/50 scale-110' 
                      : 'bg-gradient-to-r from-gray-600 to-gray-700'
                  }`}>
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center ${
                      isPlayingQuestion 
                        ? 'bg-gradient-to-r from-purple-400 to-pink-400 animate-pulse' 
                        : 'bg-gradient-to-r from-gray-500 to-gray-600'
                    }`}>
                      <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>

                  {/* Question Text */}
                  <div className="max-w-2xl">
                    
                    {isPlayingQuestion && (
                      <div className="flex items-center justify-center space-x-2 mt-4">
                        <div className="w-3 h-3 bg-purple-300 rounded-full animate-bounce"></div>
                        <div className="w-3 h-3 bg-purple-300 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-3 h-3 bg-purple-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Control Panel */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-3xl shadow-xl border border-gray-200 h-full">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Interview Controls</h3>
                </div>
                
                <div className="p-6 space-y-6">
                  {/* Question Audio Control */}
                  {currentQuestion.audioUrl && (
                    <div className="bg-gray-50 rounded-2xl p-4">
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                        <svg className="w-5 h-5 text-gray-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 001.414 1.414m-2.828-9.9a9 9 0 012.828-2.828" />
                        </svg>
                        Listen to Question
                      </h4>
                      <button
                        onClick={playQuestionAudio}
                        disabled={isPlayingQuestion}
                        className={`w-full px-4 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                          isPlayingQuestion
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                            : 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700 shadow-lg'
                        }`}
                      >
                        <svg className={`w-5 h-5 ${isPlayingQuestion ? 'animate-pulse' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isPlayingQuestion ? "M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" : "M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"} />
                        </svg>
                        {isPlayingQuestion ? 'Playing...' : 'Play Question'}
                      </button>
                    </div>
                  )}

                  {/* Recording Controls */}
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                      <svg className="w-5 h-5 text-gray-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      Your Response
                    </h4>
                    
                    {!isRecording ? (
                      <button
                        onClick={startRecording}
                        disabled={isSubmitting || submissionSuccess}
                        className="w-full px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 font-medium transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                        Start Recording
                      </button>
                    ) : (
                      <div className="space-y-4">
                        <div className="text-center">
                          <div className="inline-flex items-center px-3 py-1 rounded-full bg-red-100 text-red-800 mb-2">
                            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse mr-2"></div>
                            Recording
                          </div>
                          <div className="text-2xl font-mono text-gray-900 font-bold">
                            {formatTime(timeElapsed)}
                          </div>
                        </div>
                        <button
                          onClick={stopRecording}
                          className="w-full px-4 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 font-medium transition-all shadow-lg"
                        >
                          <svg className="w-5 h-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Submit Control */}
                  {recordedAudioUrl && (
                    <div className="bg-gray-50 rounded-2xl p-4">
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                        <svg className="w-5 h-5 text-gray-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Submit Answer
                      </h4>
                      <div className="space-y-3">
                        <audio 
                          controls 
                          src={recordedAudioUrl}
                          className="w-full mb-3"
                        >
                          Your browser does not support the audio element.
                        </audio>
                        <button
                          onClick={handleSubmit}
                          disabled={isSubmitting || submissionSuccess}
                          className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 font-medium transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {isSubmitting ? (
                            <>
                              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Submitting...
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                              </svg>
                              Submit Answer
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setRecordedAudioUrl(null);
                            setAudioChunks([]);
                            setSubmissionSuccess(false);
                          }}
                          className="w-full px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 font-medium transition-all"
                        >
                          Record Again
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Interview Tips */}
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-medium text-blue-900 mb-1">Pro Tip</h4>
                        <p className="text-sm text-blue-800">
                          Take your time to think before answering. It's okay to pause briefly.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback Loading State
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading question...</p>
      </div>
    </div>
  );
};

export default InterviewSessionPage;