// src/App.jsx
import { Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom'; // <-- Import Navigate
import { useState, useEffect } from 'react';
import LoginPage from './pages/public/LoginPage/LoginPage';
import RegisterPage from './pages/public/RegisterPage/RegisterPage';
import { useAuth } from './contexts/AuthContext';
import PrivateRoute from './components/layout/PrivateRoute/PrivateRoute';

// --- Import User Dashboard Components ---
import Dashboard from './pages/user/Dashboard/Dashboard';
import DomainSelectionPage from './pages/user/DomainSelectionPage/DomainSelectionPage';
import InterviewSessionPage from './pages/user/InterviewSessionPage/InterviewSessionPage';
import SessionResultsPage from './pages/user/SessionResultsPage/SessionResultsPage';
import MySessionsPage from './pages/user/MySessionsPage/MySessionsPage';

// --- Import Company Dashboard Components ---
import CompanyDashboard from './pages/company/CompanyDashboard/CompanyDashboard';
import CreateInterviewPage from './pages/company/CreateInterviewPage/CreateInterviewPage';
import MyInterviewsPage from './pages/company/MyInterviewsPage/MyInterviewsPage';
import InterviewDetailsPage from './pages/company/InterviewDetailsPage/InterviewDetailsPage';
import InterviewResultsPage from './pages/company/InterviewResultsPage/InterviewResultsPage';
import SessionDetailsPage from './pages/company/SessionDetailsPage/SessionDetailsPage';
import SavedCandidatesPage from './pages/company/SavedCandidatesPage/SavedCandidatesPage';

// --- Import Admin Dashboard Components ---
import AdminDashboard from './pages/admin/AdminDashboard/AdminDashboard';
import ManageDomainsPage from './pages/admin/ManageDomainsPage/ManageDomainsPage';
import ManageQuestionsPage from './pages/admin/ManageQuestionsPage/ManageQuestionsPage';
import UserManagement from './pages/admin/UserManagement/UserManagement';
import RecentActivityPage from './pages/admin/RecentActivityPage/RecentActivityPage';

// --- Import Candidate Interview Components ---
import StartInterviewPage from './pages/public/CandidateInterview/StartInterviewPage/StartInterviewPage';
import CandidateInterviewSessionPage from './pages/public/CandidateInterview/CandidateInterviewSessionPage/CandidateInterviewSessionPage';
import CompletionPage from './pages/public/CandidateInterview/CompletionPage/CompletionPage';

import { USER_TYPES } from './utils/constants.js';

// --- Redirect Component ---
const RedirectDashboard = () => {
  const { currentUser } = useAuth();

  // If user is logged in, redirect based on type
  if (currentUser) {
    switch (currentUser.userType) {
      case USER_TYPES.REGULAR:
        return <Navigate to="/user/dashboard" replace />;
      case USER_TYPES.COMPANY:
        return <Navigate to="/company/dashboard" replace />;
      case USER_TYPES.ADMIN:
        return <Navigate to="/admin/dashboard" replace />;
      default:
        // If user type is somehow unknown but logged in, fall through to render HomePage
        break; // Fall through to render HomePage
    }
  }

  // If no user is logged in, render the HomePage
  return <LoginPage />;
};

// Modern Navigation Component
const Navigation = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      console.log("App - User logged out successfully");
      navigate('/login');
    } catch (err) {
      console.error("App - Logout failed:", err);
    }
  };

  const getUserDashboardLink = () => {
    switch (currentUser?.userType) {
      case USER_TYPES.REGULAR:
        return '/user/dashboard';
      case USER_TYPES.COMPANY:
        return '/company/dashboard';
      case USER_TYPES.ADMIN:
        return '/admin/dashboard';
      default:
        return '/';
    }
  };

  const renderUserNavigation = () => {
    switch (currentUser?.userType) {
      case USER_TYPES.REGULAR:
        return (
          <>
            <Link to="/user/dashboard" className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Dashboard</Link>
            <Link to="/user/domains" className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Practice</Link>
            <Link to="/user/sessions" className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium">My Sessions</Link>
          </>
        );
      case USER_TYPES.COMPANY:
        return (
          <>
            <Link to="/company/dashboard" className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Dashboard</Link>
            <Link to="/company/interviews" className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Interviews</Link>
            <Link to="/company/saved-candidates" className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Saved Candidates</Link>
          </>
        );
      case USER_TYPES.ADMIN:
        return (
          <>
            <Link to="/admin/dashboard" className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Dashboard</Link>
            <Link to="/admin/domains" className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Domains</Link>
          </>
        );
      default:
        return null;
    }
  };

  if (!currentUser) {
    return (
      <nav className="bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="text-white text-xl font-bold">InterviewAI</Link>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link to="/login" className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Login</Link>
                <Link to="/register" className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Register</Link>
              </div>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to={getUserDashboardLink()} className="text-white text-xl font-bold">InterviewAI</Link>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              <span className="text-gray-300 text-sm px-3 py-2">
                Welcome, {currentUser.email}
              </span>
              {renderUserNavigation()}
              <button
                onClick={handleLogout}
                className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-400 hover:text-white focus:outline-none focus:text-white"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <div className="text-gray-300 text-sm px-3 py-2">
              Welcome, {currentUser.email}
            </div>
            {renderUserNavigation()}
            <button
              onClick={handleLogout}
              className="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium w-full text-left"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

// Modern Home Page Component
const HomePage = () => { 
  const { currentUser } = useAuth();

  const renderUserContent = () => {
    switch (currentUser?.userType) {
      case USER_TYPES.REGULAR:
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Ready to Practice?</h2>
            <div className="space-y-4">
              <Link 
                to="/user/domains" 
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300"
              >
                Start Practice Interview
              </Link>
              <div className="text-gray-600">or</div>
              <Link 
                to="/user/sessions" 
                className="inline-block bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded transition duration-300"
              >
                View My Sessions
              </Link>
            </div>
          </div>
        );
      case USER_TYPES.COMPANY:
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Company Dashboard</h2>
            <div className="space-y-4">
              <Link 
                to="/company/interviews/create" 
                className="inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300"
              >
                Create New Interview
              </Link>
              <div className="text-gray-600">or</div>
              <Link 
                to="/company/interviews" 
                className="inline-block bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded transition duration-300"
              >
                View My Interviews
              </Link>
            </div>
          </div>
        );
      case USER_TYPES.ADMIN:
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Admin Dashboard</h2>
            <div className="space-y-4">
              <Link 
                to="/admin/domains" 
                className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300"
              >
                Manage Domains
              </Link>
            </div>
          </div>
        );
      default:
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Welcome to InterviewAI</h2>
            <p className="text-xl text-gray-600 mb-8">AI-powered voice interview platform for practice and recruitment</p>
            <div className="space-y-4">
              <Link 
                to="/login" 
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300"
              >
                Login
              </Link>
              <div className="text-gray-600">or</div>
              <Link 
                to="/register" 
                className="inline-block bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded transition duration-300"
              >
                Register
              </Link>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Interview<span className="text-blue-600">AI</span>
            </h1>
            <p className="text-xl text-gray-600">
              Master your interviews with AI-powered voice practice
            </p>
          </div>
          {renderUserContent()}
        </div>
      </div>
    </div>
  );
};

function App() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main>
        <Routes>
          {/* --- Root Route uses RedirectDashboard --- */}
          <Route path="/" element={<RedirectDashboard />} />

          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Candidate Interview Routes */}
          <Route path="/candidate-interview/:token" element={<StartInterviewPage />} />
          <Route path="/candidate-interview/session/:sessionId" element={<CandidateInterviewSessionPage />} />
          <Route path="/candidate-interview/completed/:sessionId" element={<CompletionPage />} />

          {/* Protected Routes for Regular Users */}
          <Route
            path="/user/dashboard"
            element={
              <PrivateRoute requiredUserType={USER_TYPES.REGULAR}>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/user/domains"
            element={
              <PrivateRoute requiredUserType={USER_TYPES.REGULAR}>
                <DomainSelectionPage />
              </PrivateRoute>
            }
          />
          {/* --- Dedicated route for an active interview session instance --- */}
          <Route path="/user/interview/session/:sessionId" element={
            <PrivateRoute requiredUserType={USER_TYPES.REGULAR}>
              <InterviewSessionPage />
            </PrivateRoute>
          } />
          <Route
            path="/user/interview/results/:sessionId"
            element={
              <PrivateRoute requiredUserType={USER_TYPES.REGULAR}>
                <SessionResultsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/user/sessions"
            element={
              <PrivateRoute requiredUserType={USER_TYPES.REGULAR}>
                <MySessionsPage />
              </PrivateRoute>
            }
          />

          {/* Protected Routes for Company Users */}
          <Route
            path="/company/dashboard"
            element={
              <PrivateRoute requiredUserType={USER_TYPES.COMPANY}>
                <CompanyDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/company/interviews"
            element={
              <PrivateRoute requiredUserType={USER_TYPES.COMPANY}>
                <MyInterviewsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/company/interviews/:interviewId"
            element={
              <PrivateRoute requiredUserType={USER_TYPES.COMPANY}>
                <InterviewDetailsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/company/interviews/:interviewId/results"
            element={
              <PrivateRoute requiredUserType={USER_TYPES.COMPANY}>
                <InterviewResultsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/company/interviews/:interviewId/sessions/:sessionId"
            element={
              <PrivateRoute requiredUserType={USER_TYPES.COMPANY}>
                <SessionDetailsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/company/interviews/create"
            element={
              <PrivateRoute requiredUserType={USER_TYPES.COMPANY}>
                <CreateInterviewPage />
              </PrivateRoute>
            }
          />
          {/* Saved Candidates Route */}
          <Route
            path="/company/saved-candidates"
            element={
              <PrivateRoute requiredUserType={USER_TYPES.COMPANY}>
                <SavedCandidatesPage />
              </PrivateRoute>
            }
          />
          {/* Protected Routes for Admin Users */}
          <Route
            path="/admin/dashboard"
            element={
              <PrivateRoute requiredUserType={USER_TYPES.ADMIN}>
                <AdminDashboard />
              </PrivateRoute>
            }
          />
          {/* --- Recent Activity Route --- */}
          <Route
            path="/admin/activity"
            element={
              <PrivateRoute requiredUserType={USER_TYPES.ADMIN}>
                <RecentActivityPage />
              </PrivateRoute>
            }
          />
          {/* --- User Management Route --- */}
          <Route
            path="/admin/users"
            element={
              <PrivateRoute requiredUserType={USER_TYPES.ADMIN}>
                <UserManagement />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/domains"
            element={
              <PrivateRoute requiredUserType={USER_TYPES.ADMIN}>
                <ManageDomainsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/domains/:domainId/questions"
            element={
              <PrivateRoute requiredUserType={USER_TYPES.ADMIN}>
                <ManageQuestionsPage />
              </PrivateRoute>
            }
          />

          {/* 404 Route */}
          <Route path="*" element={
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">404 - Page Not Found</h2>
                <p className="text-gray-600 mb-6">The page you are looking for does not exist.</p>
                <Link 
                  to="/" 
                  className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition duration-300"
                >
                  Go Home
                </Link>
              </div>
            </div>
          } />
        </Routes>
      </main>
    </div>
  );
}

export default App;