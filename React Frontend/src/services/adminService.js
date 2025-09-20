// src/services/adminService.js
import apiClient from './apiClient';

/**
 * Service for handling admin related API calls.
 */

/**
 * Fetches the list of all domains.
 * @returns {Promise<Array>} A promise that resolves to an array of domain objects.
 *                          Example: [{ id: "guid", name: "React", createdAt: "2023-...", sessionCount: 5, logoUrl: "/uploads/logos/..." }, ...]
 * @throws {Error} Throws an error if the API call fails.
 */
export const getAllDomains = async () => {
  try {
    const response = await apiClient.get('/admin/domains/all');
    return response.data; // Axios returns data in response.data
  } catch (error) {
    console.error('AdminService - GetAllDomains Error:', error);
    // Re-throw to let the calling component handle it (e.g., show error message)
    throw error;
  }
};

/**
 * Creates a new domain with an optional logo.
 * @param {Object} domainData - The data for the new domain.
 * @param {string} domainData.name - The name of the new domain.
 * @param {File} [domainData.logo] - Optional logo file to upload.
 * @returns {Promise<Object>} A promise that resolves to the created domain object.
 *                           Example: { id: "guid", name: "New Domain", createdAt: "2024-...", logoUrl: "/uploads/logos/..." }
 * @throws {Error} Throws an error if the API call fails.
 */
export const createDomain = async (domainData) => {
  try {
    // --- Handle file upload using FormData ---
    const formData = new FormData();
    formData.append('Name', domainData.name);
    
    // Append logo file if provided
    if (domainData.logo) {
      formData.append('Logo', domainData.logo);
    }

    // Use apiClient.post with FormData
    // Axios will automatically set the Content-Type to multipart/form-data
    const response = await apiClient.post('/admin/domains/create', formData, {
      headers: {
        'Content-Type': 'multipart/form-data', // Explicitly set, though Axios usually handles this
      },
    });
    return response.data;
  } catch (error) {
    console.error('AdminService - CreateDomain Error:', error);
    throw error;
  }
};

/**
 * Updates an existing domain's name and/or logo.
 * @param {Object} domainData - The updated data for the domain.
 * @param {string} domainData.id - The ID of the domain to update.
 * @param {string} domainData.name - The updated name of the domain.
 * @param {File} [domainData.logo] - Optional new logo file to upload.
 * @returns {Promise<Object>} A promise that resolves to the updated domain object.
 *                           Example: { id: "guid", name: "Updated Domain", createdAt: "2024-...", logoUrl: "/uploads/logos/..." }
 * @throws {Error} Throws an error if the API call fails.
 */
export const updateDomain = async (domainData) => {
  try {
    // --- Handle file upload using FormData for updates ---
    const formData = new FormData();
    formData.append('Id', domainData.id);
    formData.append('Name', domainData.name);
    
    // Append new logo file if provided (null means "don't change")
    if (domainData.logo) {
      formData.append('Logo', domainData.logo);
    }

    // Use apiClient.put with FormData for updates
    // Axios will automatically set the Content-Type to multipart/form-data
    const response = await apiClient.put(`/admin/domains/${domainData.id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data', // Explicitly set, though Axios usually handles this
      },
    });
    return response.data;
  } catch (error) {
    console.error('AdminService - UpdateDomain Error:', error);
    throw error;
  }
};

/**
 * Deletes a domain by its ID.
 * @param {string} domainId - The ID of the domain to delete.
 * @returns {Promise<void>} A promise that resolves if the deletion is successful.
 * @throws {Error} Throws an error if the API call fails.
 */
export const deleteDomain = async (domainId) => {
  try {
    // The backend uses DELETE /admin/domains/{domainId}/delete
    const response = await apiClient.delete(`/admin/domains/${domainId}/delete`);
    // Expecting 204 No Content on successful deletion
    return response.data; // Might be undefined for 204
  } catch (error) {
    console.error('AdminService - DeleteDomain Error:', error);
    throw error;
  }
};

/**
 * Fetches the list of questions for a specific domain.
 * @param {string} domainId - The ID of the domain.
 * @returns {Promise<Array>} A promise that resolves to an array of question objects.
 *                          Example: [{ id: "guid", text: "...", idealAnswer: "...", difficulty: "C", ... }, ...]
 * @throws {Error} Throws an error if the API call fails.
 */
export const getQuestionsByDomain = async (domainId) => {
  try {
    const response = await apiClient.get(`/admin/domains/${domainId}/questions`);
    return response.data;
  } catch (error) {
    console.error(`AdminService - GetQuestionsByDomain Error for domain ${domainId}:`, error);
    throw error;
  }
};

/**
 * Creates a new question.
 * @param {Object} questionData - The data for the new question.
 * @param {string} questionData.domainId - The ID of the domain to add the question to.
 * @param {string} questionData.text - The question text.
 * @param {string} questionData.idealAnswer - The ideal answer.
 * @param {number|string} questionData.difficulty - The difficulty level (0-4 or 'E'-'A').
 * @param {string} [questionData.audioUrl] - Optional URL for question audio.
 * @returns {Promise<Object>} A promise that resolves to the created question object.
 * @throws {Error} Throws an error if the API call fails.
 */
export const createQuestion = async (questionData) => {
  try {
    // --- UPDATED LOGIC: Handle both numeric and letter difficulties ---
    let numericDifficulty;
    if (typeof questionData.difficulty === 'number' && questionData.difficulty >= 0 && questionData.difficulty <= 4) {
        // If it's already a valid number, use it directly
        numericDifficulty = questionData.difficulty;
    } else if (typeof questionData.difficulty === 'string') {
        // If it's a string, map it to a number
        const difficultyMap = { 'E': 0, 'D': 1, 'C': 2, 'B': 3, 'A': 4 };
        numericDifficulty = difficultyMap[questionData.difficulty];
    } else {
        // Default if invalid or unexpected type
        console.warn(`Invalid difficulty value provided: ${questionData.difficulty}. Defaulting to 'C' (2).`);
        numericDifficulty = 2;
    }

    const requestData = {
      ...questionData,
      difficulty: numericDifficulty // Ensure it's the numeric value for the backend
    };

    const response = await apiClient.post('/admin/domains/questions/create', requestData);
    return response.data;
  } catch (error) {
    console.error('AdminService - CreateQuestion Error:', error);
    throw error;
  }
};

/**
 * Updates an existing question.
 * @param {string} questionId - The ID of the question to update.
 * @param {Object} questionData - The updated data for the question.
 * @param {string} questionData.text - The updated question text.
 * @param {string} questionData.idealAnswer - The updated ideal answer.
 * @param {number|string} questionData.difficulty - The updated difficulty level (0-4 or 'E'-'A').
 * @param {string} [questionData.audioUrl] - Optional updated URL for question audio.
 * @returns {Promise<Object>} A promise that resolves to the updated question object (or confirmation).
 * @throws {Error} Throws an error if the API call fails.
 */
export const updateQuestion = async (questionId, questionData) => {
  try {
     // --- UPDATED LOGIC: Handle both numeric and letter difficulties ---
    let numericDifficulty;
    if (typeof questionData.difficulty === 'number' && questionData.difficulty >= 0 && questionData.difficulty <= 4) {
        // If it's already a valid number, use it directly
        numericDifficulty = questionData.difficulty;
    } else if (typeof questionData.difficulty === 'string') {
        // If it's a string, map it to a number
        const difficultyMap = { 'E': 0, 'D': 1, 'C': 2, 'B': 3, 'A': 4 };
        numericDifficulty = difficultyMap[questionData.difficulty];
    } else {
        // Default if invalid or unexpected type
        console.warn(`Invalid difficulty value provided for update: ${questionData.difficulty}. Defaulting to 'C' (2).`);
        numericDifficulty = 2;
    }

    const requestData = {
      ...questionData,
      difficulty: numericDifficulty // Ensure it's the numeric value for the backend
    };

    const response = await apiClient.put(`/admin/domains/questions/${questionId}/update`, requestData);
    return response.data;
  } catch (error) {
    console.error(`AdminService - UpdateQuestion Error for question ${questionId}:`, error);
    throw error;
  }
};

/**
 * Changes the difficulty of an existing question.
 * @param {string} questionId - The ID of the question.
 * @param {string} difficulty - The new difficulty level (E, D, C, B, A).
 * @returns {Promise<Object>} A promise that resolves to the updated question object (containing ID and new difficulty).
 * @throws {Error} Throws an error if the API call fails.
 */
export const changeQuestionDifficulty = async (questionId, difficulty) => {
  try {
    // --- UPDATED LOGIC: Handle both numeric and letter difficulties for change ---
    let numericDifficulty;
    if (typeof difficulty === 'number' && difficulty >= 0 && difficulty <= 4) {
        // If it's already a valid number, use it directly
        numericDifficulty = difficulty;
    } else if (typeof difficulty === 'string') {
        // If it's a string, map it to a number
        const difficultyMap = { 'E': 0, 'D': 1, 'C': 2, 'B': 3, 'A': 4 };
        numericDifficulty = difficultyMap[difficulty];
    } else {
        // Default if invalid or unexpected type
        throw new Error(`Invalid difficulty value for change: ${difficulty}`);
    }

    // Backend expects PATCH /admin/domains/questions/{questionId}/difficulty?difficulty={value}
    const response = await apiClient.patch(`/admin/domains/questions/${questionId}/difficulty`, null, {
        params: { difficulty: numericDifficulty } // Pass the numeric difficulty as a query parameter
    });
    return response.data;
  } catch (error) {
    console.error(`AdminService - ChangeQuestionDifficulty Error for question ${questionId}:`, error);
    throw error;
  }
};

/**
 * Deletes a question by its ID.
 * @param {string} questionId - The ID of the question to delete.
 * @returns {Promise<void>} A promise that resolves if the deletion is successful.
 * @throws {Error} Throws an error if the API call fails.
 */
export const deleteQuestion = async (questionId) => {
  try {
    const response = await apiClient.delete(`/admin/domains/questions/${questionId}/delete`);
    // Expecting 204 No Content on successful deletion
    return response.data; // Might be undefined for 204
  } catch (error) {
    console.error(`AdminService - DeleteQuestion Error for question ${questionId}:`, error);
    throw error;
  }
};

// --- Domain Configuration Functions ---

/**
 * Fetches the configuration for a specific domain.
 * @param {string} domainId - The ID of the domain.
 * @returns {Promise<Object>} A promise that resolves to the domain configuration object.
 *                           Example: { id: "guid", domainId: "guid", questionsPerE: 2, questionsPerD: 2, ... }
 * @throws {Error} Throws an error if the API call fails.
 */
export const getDomainConfiguration = async (domainId) => {
  try {
    const response = await apiClient.get(`/admin/domains/${domainId}/configuration`);
    return response.data;
  } catch (error) {
    console.error(`AdminService - GetDomainConfiguration Error for domain ${domainId}:`, error);
    throw error;
  }
};

/**
 * Updates the configuration for a specific domain.
 * @param {string} domainId - The ID of the domain.
 * @param {Object} configData - The configuration data.
 * @param {number} configData.questionsPerE - Number of Easy questions.
 * @param {number} configData.questionsPerD - Number of Difficult questions.
 * @param {number} configData.questionsPerC - Number of Challenging questions.
 * @param {number} configData.questionsPerB - Number of Brain Teaser questions.
 * @param {number} configData.questionsPerA - Number of Advanced questions.
 * @returns {Promise<Object>} A promise that resolves to the updated configuration object.
 * @throws {Error} Throws an error if the API call fails.
 */
export const updateDomainConfiguration = async (domainId, configData) => {
  try {
    const response = await apiClient.put(`/admin/domains/${domainId}/configuration`, configData);
    return response.data;
  } catch (error) {
    console.error(`AdminService - UpdateDomainConfiguration Error for domain ${domainId}:`, error);
    throw error;
  }
};


// --- UPDATED: Dashboard Data Functions ---
// Now that the backend endpoints exist, uncomment the actual API calls.

/**
 * Fetches the total count of domains.
 * @returns {Promise<number>} A promise that resolves to the total domain count.
 * @throws {Error} Throws an error if the API call fails.
 */
export const getTotalDomainCount = async () => {
  try {
    // Use the dedicated backend endpoint
    const response = await apiClient.get('/admin/dashboard/stats/domains/count');
    return response.data.count; // Assuming backend returns { count: number }
  } catch (error) {
    console.error('AdminService - GetTotalDomainCount Error:', error);
    throw error;
  }
};

/**
 * Fetches the total count of questions across all domains.
 * @returns {Promise<number>} A promise that resolves to the total question count.
 * @throws {Error} Throws an error if the API call fails.
 */
export const getTotalQuestionCount = async () => {
  try {
    // Use the dedicated backend endpoint
    const response = await apiClient.get('/admin/dashboard/stats/questions/count');
    return response.data.count; // Assuming backend returns { count: number }
  } catch (error) {
    console.error('AdminService - GetTotalQuestionCount Error:', error);
    throw error;
  }
};

/**
 * Fetches the total count of companies.
 * @returns {Promise<number>} A promise that resolves to the total company count.
 * @throws {Error} Throws an error if the API call fails.
 */
export const getActiveCompanyCount = async () => { // Keep name for minimal change, or rename to getTotalCompanyCount
  try {
    const response = await apiClient.get('/admin/dashboard/stats/companies/count'); // Changed URL
    return response.data.count; // Assuming backend returns { count: number }
  } catch (error) {
    console.error('AdminService - GetActiveCompanyCount Error:', error); // You might want to update this log message name
    throw error;
  }
};

/**
 * Fetches the list of admin users.
 * @returns {Promise<Array>} A promise that resolves to an array of admin user objects.
 *                          Example: [{ id: "guid", email: "...", department: "...", createdAt: "..." }, ...]
 * @throws {Error} Throws an error if the API call fails.
 */
export const getAdmins = async () => {
  try {
    // Assuming you add a similar endpoint on the backend like `/admin/users/admins`
    // If you only have one endpoint to get all users, you might filter by type on the frontend
    // or preferably, have the backend provide a specific endpoint.
    // For now, let's assume a dedicated endpoint exists or you adapt the backend accordingly.
    const response = await apiClient.get('/admin/users/admins'); 
    return response.data;
  } catch (error) {
    console.error('AdminService - GetAdmins Error:', error);
    throw error;
  }
};

/**
 * Fetches recent activity logs.
 * @param {number} limit - The maximum number of activities to fetch (default: 10).
 * @returns {Promise<Array>} A promise that resolves to an array of recent activity objects.
 *                          Example: [
 *                            { id: "guid", type: "domain_created", description: "Domain 'React' created", timestamp: "2024-..." },
 *                            ...
 *                          ]
 * @throws {Error} Throws an error if the API call fails.
 */
export const getRecentActivity = async (limit = 10) => {
  try {
    // Use the dedicated backend endpoint
    const response = await apiClient.get('/admin/dashboard/activity/recent', {
      params: { limit } // Pass limit as a query parameter if supported by backend
    });
    // Expected response format: Array of activity objects
    return response.data;
  } catch (error) {
    console.error('AdminService - GetRecentActivity Error:', error);
    throw error;
  }
};


// --- User Management Functions ---

/**
 * Fetches the list of company users.
 * @returns {Promise<Array>} A promise that resolves to an array of company user objects.
 *                          Example: [{ id: "guid", email: "...", companyName: "...", createdAt: "..." }, ...]
 * @throws {Error} Throws an error if the API call fails.
 */
export const getCompanies = async () => {
  try {
    const response = await apiClient.get('/admin/users/companies');
    return response.data;
  } catch (error) {
    console.error('AdminService - GetCompanies Error:', error);
    throw error;
  }
};

/**
 * Deletes a company user by its ID.
 * @param {string} companyId - The ID of the company user to delete.
 * @returns {Promise<void>} A promise that resolves if the deletion is successful.
 * @throws {Error} Throws an error if the API call fails.
 */
export const deleteCompany = async (companyId) => {
  try {
    const response = await apiClient.delete(`/admin/users/companies/${companyId}`);
    return response.data; // Might be undefined for 204
  } catch (error) {
    console.error(`AdminService - DeleteCompany Error for company ${companyId}:`, error);
    throw error;
  }
};

/**
 * Creates a new admin user.
 * @param {Object} adminData - The data for the new admin.
 * @param {string} adminData.email - The email for the new admin.
 * @param {string} adminData.password - The password for the new admin.
 * @param {string} [adminData.department] - The optional department for the new admin.
 * @returns {Promise<Object>} A promise that resolves to the created admin user object.
 *                           Example: { id: "guid", email: "...", department: "...", createdAt: "..." }
 * @throws {Error} Throws an error if the API call fails.
 */
export const createAdmin = async (adminData) => {
  try {
    const response = await apiClient.post('/admin/users/admins', adminData);
    return response.data;
  } catch (error) {
    console.error('AdminService - CreateAdmin Error:', error);
    throw error;
  }
};

/**
 * Removes (deletes) an admin user by its ID.
 * @param {string} adminId - The ID of the admin user to remove.
 * @returns {Promise<void>} A promise that resolves if the removal is successful.
 * @throws {Error} Throws an error if the API call fails.
 */
export const removeAdmin = async (adminId) => {
  try {
    const response = await apiClient.delete(`/admin/users/admins/${adminId}`);
    return response.data; // Might be undefined for 204
  } catch (error) {
    console.error(`AdminService - RemoveAdmin Error for admin ${adminId}:`, error);
    throw error;
  }
};


/**
 * Fetches the total count of regular users.
 * @returns {Promise<number>} A promise that resolves to the total regular user count.
 * @throws {Error} Throws an error if the API call fails.
 */
export const getTotalRegularUserCount = async () => {
  try {
    const response = await apiClient.get('/admin/dashboard/stats/users/regular/count');
    return response.data.count; // Assuming backend returns { count: number }
  } catch (error) {
    console.error('AdminService - GetTotalRegularUserCount Error:', error);
    throw error;
  }
};

/**
 * Fetches the total count of interview sessions.
 * @returns {Promise<number>} A promise that resolves to the total interview session count.
 * @throws {Error} Throws an error if the API call fails.
 */
export const getTotalInterviewSessionCount = async () => {
  try {
    const response = await apiClient.get('/admin/dashboard/stats/sessions/count');
    return response.data.count; // Assuming backend returns { count: number }
  } catch (error) {
    console.error('AdminService - GetTotalInterviewSessionCount Error:', error);
    throw error;
  }
};


/**
 * Fetches the total count of company interview sessions.
 * @returns {Promise<number>} A promise that resolves to the total company interview session count.
 * @throws {Error} Throws an error if the API call fails.
 */
export const getTotalCompanyInterviewSessionCount = async () => {
  try {
    const response = await apiClient.get('/admin/dashboard/stats/company-sessions/count'); 
    return response.data.count; // Assuming backend returns { count: number }
  } catch (error) {
    console.error('AdminService - GetTotalCompanyInterviewSessionCount Error:', error);
    throw error;
  }
};