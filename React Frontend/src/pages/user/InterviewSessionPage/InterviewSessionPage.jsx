// src/pages/user/InterviewSessionPage/InterviewSessionPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { submitResponse, getNextQuestion } from '../../../services/publicInterviewService';

const InterviewSessionPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  // --- Get sessionId ONLY from path parameters ---
  const { sessionId: sessionIdPathParam } = useParams(); // Gets :sessionId from /user/interview/session/:sessionId
  
  // --- Simplified refs for flag tracking ---
  const isNewSessionCheckedRef = useRef(false);
  const isNewSessionRef = useRef(false);
  const isLoadingNextQuestionRef = useRef(false); // For tracking next question loading

  // State for the active session
  const [sessionId] = useState(sessionIdPathParam); // Directly use path param for state
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [loading, setLoading] = useState(!!sessionIdPathParam);
  const [error, setError] = useState('');

  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isPlayingQuestion, setIsPlayingQuestion] = useState(false);

  const audioPlaybackRef = useRef(null);
  const timerRef = useRef(null);
  const hasBeenInitialized = useRef(false);
  const [showLoading, setShowLoading] = useState(false);

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

  const resumeExistingSession = async (resumeSessionId) => {
    if (!resumeSessionId) {
      setError('Session ID is missing for resume.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setShowLoading(true);
      setError('');
      console.log("Resuming interview session:", resumeSessionId);

      const nextQuestionData = await getNextQuestion(resumeSessionId);
      console.log("Resumed session, next question:", nextQuestionData);

      // Set state with the resumed session data
      setCurrentQuestion(nextQuestionData);
      if (nextQuestionData.totalQuestions !== undefined) {
        setTotalQuestions(nextQuestionData.totalQuestions);
      }

      // Show loading state for at least 1.5 seconds for better UX
      setTimeout(() => {
        setShowLoading(false);
      }, 1500);
    } catch (err) {
      console.error('InterviewSessionPage - Failed to resume interview:', err);
      if (err.response) {
        if (err.response.status === 404) {
          setError('Session not found or access denied.');
        } else if (err.response.data) {
          setError(`Failed to resume interview: ${err.response.data.message || 'Unknown error'}`);
        } else {
          setError('Failed to resume interview.');
        }
      } else {
        setError('Failed to resume interview. Please check your connection and try again.');
      }
      setShowLoading(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasBeenInitialized.current) {
      console.log("InterviewSessionPage: Already initialized.");
      if (loading && (sessionId || currentQuestion)) {
        setLoading(false);
      }
      return;
    }

    hasBeenInitialized.current = true;
    console.log("InterviewSessionPage: Initializing...");

    // --- ONE-TIME CHECK for the localStorage flag ---
    if (!isNewSessionCheckedRef.current) {
      console.log(`Checking if session ${sessionIdPathParam} is newly created...`);
      const flagValue = localStorage.getItem(`isNewSession_${sessionIdPathParam}`);
      isNewSessionRef.current = (flagValue === 'true');
      console.log(`Is new session flag found? ${isNewSessionRef.current}`);
      
      // ALWAYS remove the flag after checking
      localStorage.removeItem(`isNewSession_${sessionIdPathParam}`);
      
      isNewSessionCheckedRef.current = true;
    }

    if (sessionIdPathParam) {
      console.log("Resuming session:", sessionIdPathParam);
      resumeExistingSession(sessionIdPathParam);
    } else {
      setError('Invalid session link.');
      setLoading(false);
    }
  }, [sessionIdPathParam, navigate]);

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

  const startRecording = async () => {
    setError('');
    setRecordedAudioUrl(null);
    setAudioChunks([]);
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

      recorder.start(100); // Request data every 100ms
      setIsRecording(true);
      console.log('Recording started...');
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Could not access microphone. Please check permissions.');
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.requestData(); // Ensure all data is flushed
      mediaRecorder.stop();
      setIsRecording(false);
      console.log('Recording stopped.');
    }
  };

  const handleSubmit = async () => {
    // Ensure we have a sessionId (should be set by now via path param)
    if (!sessionId || !currentQuestion || audioChunks.length === 0) {
      setError('No recording available to submit or session not ready.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      await submitResponse({
        sessionId, // Use the state variable which holds the active session ID (from path)
        questionOrder: currentQuestion.order,
        audioResponse: audioBlob,
      });

      console.log('Response submitted successfully.');
      
      // --- Set flag for next question loading ---
      isLoadingNextQuestionRef.current = true;
      
      await fetchNextQuestion(); // This logic handles navigating to results when done
    } catch (err) {
      console.error('InterviewSessionPage - Failed to submit response:', err);
      if (err.response && err.response.data) {
        setError(`Failed to submit response: ${err.response.data.message || 'Unknown error'}`);
      } else {
        setError('Failed to submit response. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
      setAudioChunks([]);
      setRecordedAudioUrl(null);
      if (mediaRecorder) {
        setMediaRecorder(null);
      }
    }
  };

  // --- fetchNextQuestion to handle completion ---
  const fetchNextQuestion = async () => {
    // Ensure we have a sessionId (from path/state)
    if (!sessionId) {
      setError("Session ID is missing, cannot fetch next question.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setShowLoading(true); // Show persistent loading overlay
      setError('');
      console.log("Fetching next question for session:", sessionId);

      const nextQuestionData = await getNextQuestion(sessionId); // Use state sessionId
      console.log("Next question received:", nextQuestionData);

      // Check for completion signals from the backend
      if (
        (nextQuestionData && nextQuestionData.code === 'NO_MORE_QUESTIONS') ||
        (nextQuestionData && nextQuestionData.message && nextQuestionData.message.includes('No more questions'))
      ) {
        console.log("Interview completed!");
        // Navigate to results page for this specific session
        navigate(`/user/interview/results/${sessionId}`);
        return;
      }

      // Update state with the new question
      setCurrentQuestion(nextQuestionData);
      if (nextQuestionData.totalQuestions !== undefined && nextQuestionData.totalQuestions !== totalQuestions) {
        setTotalQuestions(nextQuestionData.totalQuestions);
      }

      // Show loading state for at least 1.5 seconds for better UX
      setTimeout(() => {
        setShowLoading(false);
        // --- Reset next question loading flag ---
        isLoadingNextQuestionRef.current = false;
      }, 1500);
    } catch (err) {
      console.error('InterviewSessionPage - Failed to get next question:', err);
      // Handle errors from the API call
      if (err.response) {
        if (err.response.status === 404) {
          // Check for specific completion code/message in the error response data
          if (
            (err.response.data && err.response.data.code === 'NO_MORE_QUESTIONS') ||
            (err.response.data && err.response.data.message && err.response.data.message.includes('No more questions'))
          ) {
            // Interview is complete (detected via 404 error with specific code/message)
            console.log("Interview completed (detected via 404 error with completion code/message)!");
            navigate(`/user/interview/results/${sessionId}`);
            return; // Exit the function
          } else {
            // 404 error but not specifically for "no more questions"
            setError(`Session issue (404): ${err.response.data?.message || 'Session not found or access denied.'}`);
          }
        } else if (err.response.data) {
          // Other error status codes with data
          setError(`Failed to get next question (${err.response.status}): ${err.response.data.message || 'Unknown error'}`);
        } else {
          // Other error status codes without specific data
          setError(`Failed to get next question (${err.response.status}).`);
        }
      } else {
        // Network error or other issue preventing the request
        setError('Failed to get next question. Please check your connection and try again.');
      }
      setShowLoading(false);
      // --- Reset next question loading flag on error ---
      isLoadingNextQuestionRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (recordedAudioUrl) {
        URL.revokeObjectURL(recordedAudioUrl);
      }
    };
  }, [recordedAudioUrl]);

  // --- PERSISTENT LOADING OVERLAY ---
  // Shows a full-screen loading state
  if (showLoading || (loading && (!sessionId || !currentQuestion))) {
    
    // --- Determine loading message based on flags ---
    let loadingMessage = 'Resuming your interview...'; // Default

    if (isLoadingNextQuestionRef.current) {
      loadingMessage = 'Loading next question...';
    } else if (isNewSessionRef.current) {
      loadingMessage = 'Starting your interview...';
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-6"></div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {loadingMessage}
          </h3>
          <p className="text-gray-600">Preparing your AI interview experience</p>
        </div>
      </div>
    );
  }

  // --- ERROR STATE ---
  // Shows a full-screen error message
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
              <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Something went wrong</h3>
            <div className="mt-2 text-gray-600 mb-8">
              <p>{error}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/user/domains')}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-medium shadow-lg"
              >
                Back to Domains
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium"
              >
                Retry Resume
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN INTERVIEW INTERFACE ---
  // Renders the main interview UI when a question is loaded
  if (currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Hidden Audio Element for Question Playback */}
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
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Interview in Progress
                </h1>
                <p className="text-sm text-gray-500">
                  Question {currentQuestion.order} of {totalQuestions}
                </p>
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
                      recordedAudioUrl ? (
                        // --- Show recorded audio preview when recording is complete ---
                        <div className="space-y-4">
                          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                            <h5 className="text-sm font-medium text-blue-900 mb-2">Your Recording</h5>
                            <audio 
                              controls 
                              src={recordedAudioUrl}
                              className="w-full mb-3"
                            >
                              Your browser does not support the audio element.
                            </audio>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-3">
                            <button
                              onClick={handleSubmit}
                              disabled={isSubmitting}
                              className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 font-medium transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                              {isSubmitting ? (
                                <>
                                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
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
                              }}
                              className="flex-1 px-4 py-3 text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 font-medium transition-all flex items-center justify-center gap-2"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              Record Again
                            </button>
                          </div>
                        </div>
                      ) : (
                        // --- ORIGINAL: Show start recording button when no recording exists ---
                        <button
                          onClick={startRecording}
                          disabled={isSubmitting}
                          className="w-full px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 font-medium transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <svg className="-ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                          </svg>
                          Start Recording
                        </button>
                        // --- END ORIGINAL ---
                      )
                    ) : (
                      // --- RECORDING IN PROGRESS ---
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
                      // --- END RECORDING IN PROGRESS ---
                    )}
                  </div>

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

  // --- FALLBACK LOADING STATE ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading question...</p>
      </div>
    </div>
  );
};

export default InterviewSessionPage;