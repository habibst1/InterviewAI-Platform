// src/services/publicInterviewService.js
import apiClient from './apiClient';

/**
 * Service for handling public interview related API calls.
 */

/**
 * Fetches the list of available interview domains.
 * @returns {Promise<Array>} A promise that resolves to an array of domain objects.
 *                          Example: [{ id: "guid", name: "React", createdAt: "2023-...", sessionCount: 5 }, ...]
 * @throws {Error} Throws an error if the API call fails.
 */
export const getDomains = async () => {
  try {
    const response = await apiClient.get('/interview/domains');
    return response.data; // Axios returns data in response.data
  } catch (error) {
    console.error('PublicInterviewService - GetDomains Error:', error);
    // Re-throw to let the calling component handle it (e.g., show error message)
    throw error;
  }
};

/**
 * Starts a new practice interview session for a given domain.
 * @param {string} domainId - The ID of the domain to start the interview for.
 * @returns {Promise<Object>} A promise that resolves to the interview start response.
 *                           Example: { sessionId: "guid", firstQuestion: {...}, totalQuestions: 8 }
 * @throws {Error} Throws an error if the API call fails.
 */
export const startInterview = async (domainId) => {
  try {
    // The backend expects { domainId: "guid" } in the request body
    const response = await apiClient.post('/interview/start', { domainId });
    return response.data;
  } catch (error) {
    console.error('PublicInterviewService - StartInterview Error:', error);
    throw error;
  }
};

/**
 * Submits a user's audio response for a specific question in a session.
 * This is a multipart/form-data request.
 * @param {Object} responseDto - The response data.
 * @param {string} responseDto.sessionId - The ID of the interview session.
 * @param {number} responseDto.questionOrder - The order number of the question (1, 2, 3...).
 * @param {File} responseDto.audioResponse - The audio file (Blob) to submit.
 * @returns {Promise<void>} A promise that resolves if the submission is successful.
 * @throws {Error} Throws an error if the API call fails.
 */
export const submitResponse = async ({ sessionId, questionOrder, audioResponse }) => {
  try {
    const formData = new FormData();
    formData.append('SessionId', sessionId);
    formData.append('QuestionOrder', questionOrder);
    // The backend expects the file under the key 'AudioResponse'
    formData.append('AudioResponse', audioResponse);

    // Use apiClient.post with the FormData
    // Axios will automatically set the Content-Type to multipart/form-data
    const response = await apiClient.post('/interview/submit-response', formData, {
      headers: {
        'Content-Type': 'multipart/form-data', // Explicitly set, though Axios usually handles this
      },
    });
    return response.data; // Should be empty or a simple confirmation
  } catch (error) {
    console.error('PublicInterviewService - SubmitResponse Error:', error);
    throw error;
  }
};

/**
 * Fetches the next unanswered question in an interview session.
 * @param {string} sessionId - The ID of the interview session.
 * @returns {Promise<Object>} A promise that resolves to the next question DTO.
 *                           Example: { order: 2, text: "...", audioUrl: "...", ... }
 * @throws {Error} Throws an error if the API call fails.
 */
export const getNextQuestion = async (sessionId) => {
  try {
    // The backend expects { sessionId: "guid" } in the request body
    const response = await apiClient.post('/interview/next-question', { sessionId });
    return response.data;
  } catch (error) {
    console.error('PublicInterviewService - GetNextQuestion Error:', error);
    throw error;
  }
};


/**
 * Fetches the results for a specific completed interview session.
 * @param {string} sessionId - The ID of the interview session.
 * @returns {Promise<Object>} A promise that resolves to the session results object.
 *                           Example: { sessionId: "guid", totalScore: 85.5, breakdown: [...], pendingEvaluations: 0 }
 *                           Or: { message: "Evaluations in progress..." }
 * @throws {Error} Throws an error if the API call fails.
 */
export const getResults = async (sessionId) => {
  try {
    // The backend now uses GET /interview/results/{sessionId}
    const response = await apiClient.get(`/interview/results/${sessionId}`);
    return response.data;
  } catch (error) {
    console.error('PublicInterviewService - GetResults Error:', error);
    throw error;
  }
};


/**
 * Fetches the list of interview sessions for the current user.
 * @returns {Promise<Array>} A promise that resolves to an array of session objects.
 *                          Example: [{ id: "guid", startedAt: "2023-...", isCompleted: true, questionCount: 8, completedResponsesCount: 8 }, ...]
 * @throws {Error} Throws an error if the API call fails.
 */
export const getMySessions = async () => {
  try {
    // The backend uses GET /interview/sessions
    const response = await apiClient.get('/interview/sessions');
    return response.data;
  } catch (error) {
    console.error('PublicInterviewService - GetMySessions Error:', error);
    throw error;
  }
};



/**
 * Deletes a specific interview session for the current user.
 * @param {string} sessionId - The ID of the session to delete.
 * @returns {Promise<void>} A promise that resolves if the deletion is successful (204 No Content).
 * @throws {Error} Throws an error if the API call fails (e.g., 404 Not Found, 500 Internal Server Error).
 */
export const deleteSession = async (sessionId) => {
    try {
        console.log(`PublicInterviewService - Deleting session ${sessionId}`);
        // The backend endpoint is DELETE /api/interview/sessions/{sessionId}
        const response = await apiClient.delete(`/interview/sessions/${sessionId}`);
        console.log(`PublicInterviewService - Session ${sessionId} deleted successfully.`);
        // Expecting 204 No Content, so response.data might be undefined
        return response.data; // Usually undefined for 204
    } catch (error) {
        console.error(`PublicInterviewService - DeleteSession Error for ${sessionId}:`, error);
        // Re-throw the error so the calling component can handle it (e.g., show error message)
        throw error;
    }
};

