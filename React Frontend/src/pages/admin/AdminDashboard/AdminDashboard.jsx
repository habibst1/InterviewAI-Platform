// src/pages/admin/AdminDashboard/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  getTotalDomainCount, 
  getTotalQuestionCount, 
  getActiveCompanyCount,
  getRecentActivity,
  getTotalRegularUserCount,
  getTotalInterviewSessionCount,
  getTotalCompanyInterviewSessionCount
} from '../../../services/adminService';

const AdminDashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // State for Dashboard Data ---
  const [dashboardStats, setDashboardStats] = useState({
    totalDomains: '...',
    totalQuestions: '...',
    activeCompanies: '...',
    totalRegularUsers: '...', 
    totalInterviewSessions: '...', 
    totalCompanyInterviewSessions: '...' 
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch Dashboard Data ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const [
          domainCountResult, 
          questionCountResult, 
          companyCountResult,
          activityResult,
          regularUserCountResult,
          sessionCountResult,
          companySessionCountResult
        ] = await Promise.allSettled([
          getTotalDomainCount(),
          getTotalQuestionCount(),
          getActiveCompanyCount(),
          getRecentActivity(5),
          getTotalRegularUserCount(),
          getTotalInterviewSessionCount(),
          getTotalCompanyInterviewSessionCount()
        ]);

        const counts = {};

        if (domainCountResult.status === 'fulfilled') {
          counts.totalDomains = domainCountResult.value;
        } else {
          console.error("Failed to fetch domain count:", domainCountResult.reason);
          counts.totalDomains = 'N/A';
        }

        if (questionCountResult.status === 'fulfilled') {
          counts.totalQuestions = questionCountResult.value;
        } else {
          console.error("Failed to fetch question count:", questionCountResult.reason);
          counts.totalQuestions = 'N/A';
        }

        if (companyCountResult.status === 'fulfilled') {
          counts.activeCompanies = companyCountResult.value;
        } else {
          console.error("Failed to fetch company count:", companyCountResult.reason);
          counts.activeCompanies = 'N/A';
        }

        // Handle results for Regular Users ---
        if (regularUserCountResult.status === 'fulfilled') {
          counts.totalRegularUsers = regularUserCountResult.value;
        } else {
          console.error("Failed to fetch regular user count:", regularUserCountResult.reason);
          counts.totalRegularUsers = 'N/A';
        }

        // Handle result for User Interview Sessions ---
        if (sessionCountResult.status === 'fulfilled') {
          counts.totalInterviewSessions = sessionCountResult.value;
        } else {
          console.error("Failed to fetch user interview session count:", sessionCountResult.reason);
          counts.totalInterviewSessions = 'N/A';
        }

        // Handle result for Company Interview Sessions ---
        if (companySessionCountResult.status === 'fulfilled') {
          counts.totalCompanyInterviewSessions = companySessionCountResult.value;
        } else {
          console.error("Failed to fetch company interview session count:", companySessionCountResult.reason);
          counts.totalCompanyInterviewSessions = 'N/A';
        }

        if (activityResult.status === 'fulfilled') {
          const formattedActivities = activityResult.value.map(activity => ({
            id: activity.id,
            title: activity.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            description: activity.description,
            time: getTimeAgo(new Date(activity.timestamp)),
            timestamp: activity.timestamp,
            type: activity.type.split('_')[0]
          }));
          setRecentActivity(formattedActivities);
        } else {
          console.error("Failed to fetch recent activity:", activityResult.reason);
          setRecentActivity([]);
        }

        setDashboardStats(counts);

      } catch (err) {
        console.error("Unexpected error fetching dashboard ", err);
        setError('Failed to load dashboard data. Please try again later.');
        // Set all stats to N/A on unexpected error
        setDashboardStats({ 
          totalDomains: 'N/A', 
          totalQuestions: 'N/A', 
          activeCompanies: 'N/A',
          totalRegularUsers: 'N/A', // Reset new stats
          totalInterviewSessions: 'N/A', // Reset new stats
          totalCompanyInterviewSessions: 'N/A' // Reset new stats
        });
        setRecentActivity([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Helper function to format time ago
  const getTimeAgo = (date) => {
     const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    let interval = seconds / 31536000; // Years
    if (interval > 1) {
      const years = Math.floor(interval);
      return `${years} year${years > 1 ? 's' : ''} ago`;
    }

    interval = seconds / 2592000; // Months
    if (interval > 1) {
      const months = Math.floor(interval);
      return `${months} month${months > 1 ? 's' : ''} ago`;
    }

    interval = seconds / 86400; // Days
    if (interval > 1) {
      const days = Math.floor(interval);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }

    interval = seconds / 3600; // Hours
    if (interval > 1) {
      const hours = Math.floor(interval);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }

    interval = seconds / 60; // Minutes
    if (interval > 1) {
      const minutes = Math.floor(interval);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }

    return 'Just now';
  };

  const adminInfo = currentUser?.email || 'Admin';

  // Stats array to include new items (6 items total) ---
  const stats = [
    {
      name: 'Total Domains',
      value: dashboardStats.totalDomains,
      icon: (
        <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      color: 'bg-purple-100'
    },
    {
      name: 'Total Questions',
      value: dashboardStats.totalQuestions,
      icon: (
        <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'bg-blue-100'
    },
    {
      name: 'Total Companies',
      value: dashboardStats.activeCompanies,
      icon: (
        <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: 'bg-green-100'
    },
    // Stat for Total Regular Users ---
    {
      name: 'Total Users',
      value: dashboardStats.totalRegularUsers,
      icon: (
        <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      color: 'bg-indigo-100'
    },
    // Stat for Total User Interview Sessions ---
    {
      name: 'Total User Sessions', // Renamed for clarity
      value: dashboardStats.totalInterviewSessions,
      icon: (
        <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      color: 'bg-amber-100'
    },
    // Stat for Total Company Interview Sessions ---
    {
      name: 'Total Company Sessions',
      value: dashboardStats.totalCompanyInterviewSessions,
      icon: (
        <svg className="w-6 h-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {/* Calendar with Briefcase or similar icon */}
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m-2-3h4m-5 0a1 1 0 01-1-1V8a1 1 0 011-1h6a1 1 0 011 1v3a1 1 0 01-1 1H9z" />
        </svg>
      ),
      color: 'bg-rose-100'
    }
  ];

  // --Quick Actions ---
  const quickActions = [
    {
      title: 'Manage Domains',
      description: 'Create and edit interview domains',
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      action: () => navigate('/admin/domains'),
      color: 'bg-gradient-to-r from-gray-600 to-gray-800 hover:from-gray-700 hover:to-gray-900',
    },
    {
      title: 'Manage Questions',
      description: 'Add and organize question bank',
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      action: () => navigate('/admin/domains'), // Navigate to domains, user can then go to questions
      color: 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700',
    },
    {
      title: 'User Management',
      description: 'Manage companies and users',
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      action: () => navigate('/admin/users'),
      color: 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700',
    },
  ];

  // --- Loading State for Dashboard ---
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading Dashboard</h3>
          <p className="text-gray-600">Fetching your data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6 md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                Admin Dashboard
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Welcome, {adminInfo}
              </p>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4">
              <button
                onClick={() => navigate('/admin/domains')}
                className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-gray-600 to-gray-800 hover:from-gray-700 hover:to-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all"
              >
                Manage Domains
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
         {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{error}</h3>
              </div>
            </div>
          </div>
        )}

        {/* Stats Section - Displayed in two rows */}
        <div className="mb-8">
          {/* First Row: 3 items */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-5">
            {stats.slice(0, 3).map((stat) => (
              <div key={stat.name} className="bg-white overflow-hidden shadow rounded-2xl border border-gray-100">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center">
                    <div className={`flex-shrink-0 rounded-lg p-3 ${stat.color}`}>
                      {stat.icon}
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">{stat.name}</dt>
                        <dd className="flex items-baseline">
                          <div className="text-2xl font-semibold text-gray-900">{stat.value}</div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Second Row: 3 items */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {stats.slice(3, 6).map((stat) => ( // Changed slice to (3, 6) for items 4, 5, 6
              <div key={stat.name} className="bg-white overflow-hidden shadow rounded-2xl border border-gray-100">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center">
                    <div className={`flex-shrink-0 rounded-lg p-3 ${stat.color}`}>
                      {stat.icon}
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">{stat.name}</dt>
                        <dd className="flex items-baseline">
                          <div className="text-2xl font-semibold text-gray-900">{stat.value}</div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Administration Tools</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {quickActions.map((action) => (
              <div
                key={action.title}
                onClick={action.action}
                className={`${action.color} rounded-2xl shadow-lg cursor-pointer transition-all duration-300 transform hover:scale-105`}
              >
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-lg bg-white bg-opacity-20">
                      {action.icon}
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-white">{action.title}</h3>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-white opacity-90">
                    {action.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity - Uses state */}
        <div className="bg-white shadow rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Activity</h3>
              <button
                onClick={() => navigate('/admin/activity')}
                className="text-sm font-medium text-purple-600 hover:text-purple-700"
              >
                View all
              </button>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div key={activity.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                      <p className="text-sm text-gray-500">{activity.description}</p>
                    </div>
                    <div className="ml-4 flex-shrink-0 flex items-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {activity.type}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center text-sm text-gray-500">
                    <svg className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    <time dateTime={activity.timestamp}>{activity.time}</time>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-8 text-center text-gray-500">
                No recent activity found.
              </div>
            )}
          </div>
        </div>

        {/* Tips Section */}
        <div className="mt-8 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl shadow-lg">
          <div className="p-6 sm:p-8">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-xl font-bold text-white">Admin Tip</h3>
                <p className="mt-3 text-purple-100 text-lg">
                  Regular maintenance of question banks and domains ensures optimal performance for all users.
                  Consider reviewing and updating content quarterly to keep the platform fresh and relevant.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;