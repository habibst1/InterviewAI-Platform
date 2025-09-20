import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';

/**
 * Component to protect routes that require authentication.
 * If the user is not logged in, they are redirected to the login page.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - The component(s) to render if authorized.
 * @param {string} [props.requiredUserType] - Optional. The required UserType (e.g., 'Regular', 'Company', 'Admin').
 *                                           If provided, access is denied if the user's type doesn't match.
 * @returns {JSX.Element} The protected component or a redirect.
 */
const PrivateRoute = ({ children, requiredUserType = null }) => {
  const { currentUser, isLoading } = useAuth();
  const location = useLocation(); // Get the current location to use for redirecting back after login

  // Show a loading state while checking auth status
  if (isLoading) {
    // You can replace this with a more sophisticated loading spinner
    return <div>Loading...</div>;
  }

  // Check if user is authenticated
  if (!currentUser) {
    // Redirect to login page, but save the attempted location they came from
    // so they can be sent back after logging in.
    // The `state` prop is used by the `useLocation` hook in the login page.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if a specific user type is required and if the user matches
  if (requiredUserType !== null && currentUser.userType !== requiredUserType) {
    // User is authenticated but not the correct type.
    // You can redirect them to a "Not Authorized" page or their own dashboard.
    // For now, let's log them out and redirect to login with an error message.
    // A more elegant solution might involve context-aware redirects or a 403 page.
    console.warn(`Access denied. Required UserType: ${requiredUserType}, User's UserType: ${currentUser.userType}`);
    // For simplicity, we'll redirect to a generic "not found" or home page.
    // You could also show an "Access Denied" message on this page.
    return <Navigate to="/" replace />; // Or redirect to their specific dashboard
    // Example for redirecting to user's own dashboard:
    // if (currentUser.userType === 'Regular') return <Navigate to="/user/dashboard" replace />;
    // if (currentUser.userType === 'Company') return <Navigate to="/company/dashboard" replace />;
    // if (currentUser.userType === 'Admin') return <Navigate to="/admin/dashboard" replace />;
    // return <Navigate to="/" replace />; // Fallback
  }

  // If user is authenticated and (if required) has the correct type, render the children
  return children;
};

export default PrivateRoute;
