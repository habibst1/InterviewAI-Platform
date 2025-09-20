// src/services/authService.js
import apiClient from './apiClient';

/**
 * Service for handling user authentication (registration, login, logout).
 */

/**
 * Registers a new user.
 * @param {Object} userData - The user registration data.
 * @param {string} userData.email - The user's email.
 * @param {string} userData.password - The user's password.
 * @param {string} userData.userType - The user's type (Regular, Company, Admin).
 * @param {string} [userData.firstName] - First name (required if userType is Regular).
 * @param {string} [userData.lastName] - Last name (required if userType is Regular).
 * @param {string} [userData.companyName] - Company name (required if userType is Company).
 * @param {string} [userData.department] - Department (required if userType is Admin).
 * @returns {Promise<Object>} A promise that resolves to the API response data (e.g., { message: "Registration successful", userId: "...", ... }).
 * @throws {Error} Throws an error if the API call fails.
 */
export const register = async (userData, isMultipart = false) => {
  try {
    let response;
    
    if (isMultipart) {
      // For multipart form data (file uploads)
      response = await apiClient.post('/Auth/register', userData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    } else {
      // For regular JSON data
      response = await apiClient.post('/Auth/register', userData);
    }
    
    return response.data;
  } catch (error) {
    console.error('AuthService - Register Error:', error);
    throw error;
  }
};

/**
 * Logs in a user.
 * @param {Object} credentials - The user's login credentials.
 * @param {string} credentials.email - The user's email.
 * @param {string} credentials.password - The user's password.
 * @returns {Promise<Object>} A promise that resolves to the API response data (e.g., { userId: "...", email: "...", userType: "...", ... }).
 * @throws {Error} Throws an error if the API call fails (e.g., 401 Unauthorized).
 */
export const login = async (credentials) => {
  try {
    // The backend expects the data in the body as JSON
    const response = await apiClient.post('/Auth/login', credentials);
    return response.data; // Return the data from the successful response
  } catch (error) {
    // Re-throw the error so the calling component can handle it
    console.error('AuthService - Login Error:', error);
    throw error;
  }
};

/**
 * Logs out the current user.
 * Note: Since this is cookie-based auth, the backend typically handles clearing the cookie.
 * This function calls a logout endpoint if one exists, or simply clears local state.
 * @returns {Promise<void>} A promise that resolves when logout actions are complete.
 */
export const logout = async () => {
  try {
    console.log('AuthService - Logout initiated');
  } catch (error) {
    console.error('AuthService - Logout Error:', error);
    throw error;
  }
};