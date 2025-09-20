// src/services/apiClient.js
import axios from 'axios';

// Create an Axios instance with default configuration
const apiClient = axios.create({
  baseURL: 'http://localhost:5143/api', 
  timeout: 10000, // 10 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // For cookie-based authentication
});


apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.data || error.message);

    return Promise.reject(error); // Re-throw the error so calling code can handle it
  }
);

export default apiClient;
