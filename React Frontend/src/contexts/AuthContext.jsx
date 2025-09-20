// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { login as loginService, logout as logoutService } from '../services/authService';
import apiClient from '../services/apiClient'; 

// 1. Create the Context
const AuthContext = createContext();

// 2. Create a custom hook to use the AuthContext easily
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// 3. Create the AuthProvider component that will wrap parts of the app
export const AuthProvider = ({ children }) => {
  // State to hold the current user data
  const [currentUser, setCurrentUser] = useState(null);
  // State to indicate if the authentication check is still loading (e.g., on app start)
  const [isLoading, setIsLoading] = useState(true);

  // Function to handle user login
  const login = async (credentials) => {
    try {
      // 1. Call the login service function
      const userData = await loginService(credentials);
      // 2. If successful, update the currentUser state with the data from the backend
      // The backend returns { userId: "...", email: "...", userType: "...", roles: [...], logoUrl: "..." }
      setCurrentUser({
        id: userData.userId, // Map backend userId to id
        email: userData.email,
        userType: userData.userType,
        roles: userData.roles || [], // Ensure roles is an array
        logoUrl: userData.logoUrl || null, // Store logo URL for company users
        // token: userData.token // Add JWT later
      });
      // 3. Optionally, store user data in localStorage for persistence across browser sessions
      // The actual auth state (logged in/out) is managed by the cookie, but storing user details
      // can improve perceived performance on reload.
      localStorage.setItem('user', JSON.stringify({
        id: userData.userId,
        email: userData.email,
        userType: userData.userType,
        roles: userData.roles || [],
        logoUrl: userData.logoUrl || null,
      }));
      return userData; // Return data to the caller (e.g., LoginPage) if needed
    } catch (error) {
      // 4. If login fails, re-throw the error so the LoginPage can handle it (e.g., show message)
      console.error('AuthProvider - Login Error:', error);
      throw error;
    }
  };

  // Function to handle user logout
  const logout = async () => {
    try {
      // 1. Call the logout service function (handles any backend logout logic if needed)
      await logoutService();
      // 2. Clear the currentUser state
      setCurrentUser(null);
      // 3. Clear user data from localStorage
      localStorage.removeItem('user');
      // 4. Optionally, instruct the API client to clear any auth headers if used (not needed for cookies)
      // apiClient.defaults.headers.common['Authorization'] = null; // If using Bearer tokens
      // For cookies, the browser handles them. Refreshing or navigating usually suffices.
      console.log('AuthProvider - User logged out');
    } catch (error) {
      console.error('AuthProvider - Logout Error:', error);
      // Even if logout API call fails, clear local state
      setCurrentUser(null);
      localStorage.removeItem('user');
    }
  };

  // Function to check if the user is authenticated (useful for initial load or protected routes)
  // In cookie-based auth, this often involves checking if the cookie exists or making a simple
  // authenticated request to the backend. We'll do a simple check using localStorage for quick UI update,
  // and potentially a lightweight API call for certainty.
  const checkAuthStatus = async () => {
    setIsLoading(true); // Set loading state while checking
    try {
      // 1. Check localStorage first for a quick UI update
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setCurrentUser(parsedUser);
        console.log('AuthProvider - User restored from localStorage');
      }

    } catch (error) {
      console.error('AuthProvider - Error checking auth status:', error);
      // If checking auth fails, assume not authenticated
      setCurrentUser(null);
      localStorage.removeItem('user');
    } finally {
      // 3. Always stop loading after the check is complete
      setIsLoading(false);
    }
  };

  // Effect hook to check auth status when the app loads
  useEffect(() => {
    checkAuthStatus();
    // The empty dependency array [] means this runs once on component mount (app start)
  }, []);

  // 4. The value provided by the context
  const value = {
    currentUser,
    isLoading,
    login,
    logout,
  };

  // 5. Provide the context value to children components
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};