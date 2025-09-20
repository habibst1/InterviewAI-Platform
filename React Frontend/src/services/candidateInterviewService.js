// src/services/candidateInterviewService.js
import apiClient from './apiClient';

/**
 * Service for handling candidate interview related API calls.
 * These are typically public endpoints (AllowAnonymous).
 */


/**
 * Starts a candidate interview using the unique link token.
 * @param {string} token - The unique token from the interview link.
 * @param {Object} startData - The data required to start the interview.
 * @param {string} startData.candidateEmail - The candidate's email (must match invitation).
 * @returns {Promise<Object>} A promise that resolves to the first question DTO.
 *                           Example: { sessionId: "guid", order: 1, text: "...", audioUrl: "...", difficulty: "C", totalQuestions: 5, isLast: false }
 * @throws {Error} Throws an error if the API call fails.
 */
export const startCandidateInterview = async (token, startData) => {
  try {
    console.log(`CandidateInterviewService - Starting interview with token ${token}`, startData);
    // The backend endpoint is POST /api/candidate-interview/start/{token}
    const response = await apiClient.post(`/candidate-interview/start/${token}`, startData);
    console.log("CandidateInterviewService - Interview started:", response.data);
    return response.data;
  } catch (error) {
    console.error('CandidateInterviewService - StartCandidateInterview Error:', error);
    throw error;
  }
};

/**
 * Submits a candidate's audio response for a specific question in a session.
 * This is a multipart/form-data request.
 * @param {Object} responseDto - The response data.
 * @param {string} responseDto.sessionId - The ID of the interview session.
 * @param {number} responseDto.questionOrder - The order number of the question (1, 2, 3...).
 * @param {Blob} responseDto.audioResponse - The audio file (Blob) to submit.
 * @returns {Promise<void>} A promise that resolves if the submission is successful.
 * @throws {Error} Throws an error if the API call fails.
 */
export const submitCandidateResponse = async ({ sessionId, questionOrder, audioResponse }) => {
  try {
    const formData = new FormData();
    formData.append('SessionId', sessionId);
    formData.append('QuestionOrder', questionOrder);
    // The backend expects the file under the key 'AudioResponse'
    formData.append('AudioResponse', audioResponse);

    console.log(`CandidateInterviewService - Submitting response for session ${sessionId}, question ${questionOrder}`);
    // The backend endpoint is POST /candidate-interview/submit-response
    const response = await apiClient.post('/candidate-interview/submit-response', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    console.log("CandidateInterviewService - Response submitted.");
    // Should be empty or a simple confirmation (e.g., 200 OK or 204 No Content)
    return response.data;
  } catch (error) {
    console.error('CandidateInterviewService - SubmitCandidateResponse Error:', error);
    throw error;
  }
};

/**
 * Fetches the next unanswered question in a candidate's interview session.
 * @param {string} sessionId - The ID of the interview session.
 * @returns {Promise<Object>} A promise that resolves to the next question DTO.
 *                           Example: { sessionId: "guid", order: 2, text: "...", audioUrl: "...", difficulty: "D", totalQuestions: 5, isLast: false }
 *                           Or: { message: "Interview completed!", code: "NO_MORE_QUESTIONS" } (if 404 is returned)
 * @throws {Error} Throws an error if the API call fails.
 */
export const getNextCandidateQuestion = async (sessionId) => {
  try {
    // The backend expects { sessionId: "guid" } in the request body
    console.log(`CandidateInterviewService - Fetching next question for session ${sessionId}`);
    // The backend endpoint is POST /candidate-interview/next-question
    const response = await apiClient.post('/candidate-interview/next-question', { sessionId });
    console.log("CandidateInterviewService - Next question fetched:", response.data);
    return response.data;
  } catch (error) {
    console.error('CandidateInterviewService - GetNextCandidateQuestion Error:', error);
    throw error;
  }
};
