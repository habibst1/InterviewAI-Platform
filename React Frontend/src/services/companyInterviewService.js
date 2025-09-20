// src/services/companyInterviewService.js
import apiClient from './apiClient';

/**
 * Service for handling company interview related API calls.
 */

/**
 * Creates a new company interview.
 * @param {Object} interviewData - The data for the new interview.
 * @param {string} interviewData.title - The title of the interview.
 * @param {Array<Object>} interviewData.questions - An array of question objects.
 * @param {string} interviewData.questions[].text - The question text.
 * @param {string} interviewData.questions[].idealAnswer - The ideal answer.
 * @param {string} interviewData.questions[].difficulty - The difficulty level (e.g., 'E', 'D', 'C', 'B', 'A').
 * @param {Object} interviewData.questionsPerTier - An object mapping difficulty to the number of questions to select.
 * @param {number} interviewData.questionsPerTier.E - Number of Easy questions.
 * @param {number} interviewData.questionsPerTier.D - Number of Difficult questions.
 * @param {number} interviewData.questionsPerTier.C - Number of Challenging questions.
 * @param {number} interviewData.questionsPerTier.B - Number of Brain Teaser questions.
 * @param {number} interviewData.questionsPerTier.A - Number of Advanced questions.
 * @param {Array<string>} interviewData.candidateEmails - An array of candidate emails to invite.
 * @returns {Promise<Object>} A promise that resolves to the API response data.
 *                           Example: { message: "Interview created successfully.", interviewId: "...", links: [...] }
 * @throws {Error} Throws an error if the API call fails.
 */
export const createInterview = async (interviewData) => {
  try {
    console.log("CompanyInterviewService - Sending create interview request:", interviewData);
    const response = await apiClient.post('/company-interview/create', interviewData);
    console.log("CompanyInterviewService - Create interview response:", response.data);
    return response.data;
  } catch (error) {
    console.error('CompanyInterviewService - CreateInterview Error:', error);
    // Re-throw the error so the calling component can handle it
    throw error;
  }
};

/**
 * Invites additional candidates to an existing company interview.
 * @param {string} interviewId - The ID of the interview.
 * @param {Array<string>} candidateEmails - An array of candidate emails to invite.
 * @returns {Promise<Object>} A promise that resolves to the API response data containing the new links.
 *                           Example: { message: "Candidates invited successfully.", interviewId: "...", links: [...] }
 * @throws {Error} Throws an error if the API call fails.
 */
export const inviteCandidates = async (interviewId, candidateEmails) => {
    try {
        console.log(`CompanyInterviewService - Sending invite candidates request for interview ${interviewId}:`, candidateEmails);
        const response = await apiClient.post(`/company-interview/${interviewId}/invite`, { candidateEmails });
        console.log("CompanyInterviewService - Invite candidates response:", response.data);
        return response.data;
    } catch (error) {
        console.error('CompanyInterviewService - InviteCandidates Error:', error);
        throw error;
    }
};

/**
 * Fetches the list of company interviews created by the current company.
 * @returns {Promise<Array>} A promise that resolves to an array of interview objects.
 *                           Example: [{ id: "guid", title: "React Interview", isActive: true, ... }, ...]
 * @throws {Error} Throws an error if the API call fails.
 */
export const getMyInterviews = async () => {
    try {
        console.log("CompanyInterviewService - Fetching company interviews");
        const response = await apiClient.get('/company-interview/list');
        console.log("CompanyInterviewService - Fetched interviews:", response.data);
        return response.data;
    } catch (error) {
        console.error('CompanyInterviewService - GetMyInterviews Error:', error);
        throw error;
    }
};

/**
 * Fetches the results for a specific company interview.
 * @param {string} interviewId - The ID of the interview.
 * @returns {Promise<Array>} A promise that resolves to an array of session results.
 *                           Example: [{ sessionId: "guid", candidateEmail: "...", isCompleted: true, responses: [...] }, ...]
 * @throws {Error} Throws an error if the API call fails.
 */
export const getInterviewResults = async (interviewId) => {
    try {
        console.log(`CompanyInterviewService - Fetching results for interview ${interviewId}`);
        const response = await apiClient.get(`/company-interview/results/${interviewId}`);
        console.log(`CompanyInterviewService - Fetched results for interview ${interviewId}:`, response.data);
        return response.data;
    } catch (error) {
        console.error(`CompanyInterviewService - GetInterviewResults Error for ${interviewId}:`, error);
        throw error;
    }
};

/**
 * Fetches the details of a specific company interview.
 * @param {string} interviewId - The ID of the interview.
 * @returns {Promise<Object>} A promise that resolves to the interview details object.
 *                           Example: { id: "guid", title: "React Interview", isActive: true, questions: [...], invitedCandidates: [...] }
 * @throws {Error} Throws an error if the API call fails.
 */
export const getInterviewDetails = async (interviewId) => {
    try {
        console.log(`CompanyInterviewService - Fetching details for interview ${interviewId}`);
        const response = await apiClient.get(`/company-interview/${interviewId}`);
        console.log(`CompanyInterviewService - Fetched details for interview ${interviewId}:`, response.data);
        return response.data;
    } catch (error) {
        console.error(`CompanyInterviewService - GetInterviewDetails Error for ${interviewId}:`, error);
        throw error;
    }
};

/**
 * Finishes (deactivates) a specific company interview.
 * @param {string} interviewId - The ID of the interview to finish.
 * @returns {Promise<void>} A promise that resolves if the operation is successful.
 * @throws {Error} Throws an error if the API call fails.
 */
export const finishInterview = async (interviewId) => {
    try {
        console.log(`CompanyInterviewService - Sending finish interview request for ${interviewId}`);
        const response = await apiClient.post(`/company-interview/${interviewId}/finish`);
        console.log(`CompanyInterviewService - Finished interview ${interviewId}`, response.data);
        // Expecting 204 No Content, so response.data might be undefined
        return response.data;
    } catch (error) {
        console.error(`CompanyInterviewService - FinishInterview Error for ${interviewId}:`, error);
        throw error;
    }
};


/**
 * Fetches the details of a specific company interview session.
 * @param {string} sessionId - The ID of the session.
 * @returns {Promise<Object>} A promise that resolves to the session details object.
 *                           Example: { id: "guid", candidateEmail: "...", isCompleted: true, interviewTitle: "...", responses: [...] }
 * @throws {Error} Throws an error if the API call fails.
 */
export const getCompanyInterviewSession = async (sessionId) => {
    try {
        console.log(`CompanyInterviewService - Fetching details for session ${sessionId}`);
        const response = await apiClient.get(`/company-interview/session/${sessionId}`);
        console.log(`CompanyInterviewService - Fetched details for session ${sessionId}:`, response.data);
        return response.data;
    } catch (error) {
        console.error(`CompanyInterviewService - GetCompanyInterviewSession Error for ${sessionId}:`, error);
        throw error;
    }
};


export const deleteInterview = async (interviewId) => {
  try {
    const response = await apiClient.delete(`/company-interview/${interviewId}`);
    // If successful (204 No Content), return true or just the response
    return response; // Axios resolves if status is 2xx
  } catch (error) {
    console.error('Service - Error deleting interview:', error);
    throw error; // Re-throw to handle in component
  }
};

/**
 * Saves a candidate session
 * @param {string} sessionId - The ID of the session to save
 * @returns {Promise<Object>} A promise that resolves to the API response data
 * @throws {Error} Throws an error if the API call fails
 */
export const saveCandidateSession = async (sessionId) => {
  try {
    console.log(`CompanyInterviewService - Sending save candidate session request for ${sessionId}`);
    const response = await apiClient.post(`/company-interview/session/${sessionId}/save`);
    console.log(`CompanyInterviewService - Saved candidate session ${sessionId}`, response.data);
    return response.data;
  } catch (error) {
    console.error(`CompanyInterviewService - SaveCandidateSession Error for ${sessionId}:`, error);
    throw error;
  }
};

/**
 * Removes a saved candidate
 * @param {string} savedCandidateId - The ID of the saved candidate record to remove
 * @returns {Promise<void>} A promise that resolves if the operation is successful
 * @throws {Error} Throws an error if the API call fails
 */
export const removeSavedCandidate = async (savedCandidateId) => {
  try {
    console.log(`CompanyInterviewService - Sending remove saved candidate request for ${savedCandidateId}`);
    const response = await apiClient.delete(`/company-interview/saved/${savedCandidateId}`);
    console.log(`CompanyInterviewService - Removed saved candidate ${savedCandidateId}`, response.data);
    return response.data;
  } catch (error) {
    console.error(`CompanyInterviewService - RemoveSavedCandidate Error for ${savedCandidateId}:`, error);
    throw error;
  }
};

/**
 * Fetches all saved candidates for the current company
 * @returns {Promise<Array>} A promise that resolves to an array of saved candidate objects
 * @throws {Error} Throws an error if the API call fails
 */
export const getSavedCandidates = async () => {
  try {
    console.log("CompanyInterviewService - Fetching saved candidates");
    const response = await apiClient.get('/company-interview/saved');
    console.log("CompanyInterviewService - Fetched saved candidates:", response.data);
    return response.data;
  } catch (error) {
    console.error('CompanyInterviewService - GetSavedCandidates Error:', error);
    throw error;
  }
};