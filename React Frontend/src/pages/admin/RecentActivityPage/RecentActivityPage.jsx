// src/pages/admin/RecentActivity/RecentActivityPage/RecentActivityPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRecentActivity } from '../../../services/adminService'; // Adjust path as needed

const RecentActivityPage = () => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1); // For potential pagination later
  const [hasMore, setHasMore] = useState(true); // For potential pagination later

  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true);
      setError('');
      try {
        const limit = 100; // Fetch up to 100 for this view
        const activityData = await getRecentActivity(limit);

        if (activityData.length < limit) {
            setHasMore(false); // Assume no more if we get less than requested
        }

        // Format activity data for display (similar to dashboard)
        const formattedActivities = activityData.map(activity => ({
          id: activity.id,
          title: activity.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          description: activity.description,
          time: getTimeAgo(new Date(activity.timestamp)),
          timestamp: activity.timestamp,
          type: activity.type.split('_')[0] || activity.type // Fallback to full type if no underscore
        }));

        setActivities(formattedActivities);
      } catch (err) {
        console.error('RecentActivityPage - Failed to fetch activities:', err);
        setError('Failed to load recent activity. Please try again later.');
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []); // Run once on mount

  // Helper function to format time ago (same as dashboard)
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


  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading Activity Log</h3>
          <p className="text-gray-600">Fetching recent activities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                Recent Activity Log
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                A detailed view of recent platform events
              </p>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              ← Back to Dashboard
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

        {/* Activity List Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Activity Feed</h2>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
              {activities.length} activities
            </span>
          </div>

          {activities.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {activities.map((activity) => (
                <div key={activity.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        {/* Simple icon based on type prefix */}
                        <div className="flex-shrink-0 mr-4">
                          {activity.type === 'domain' && (
                            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                              <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                              </svg>
                            </div>
                          )}
                          {activity.type === 'question' && (
                             <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                          )}
                          {activity.type === 'company' && (
                             <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                            </div>
                          )}
                          {activity.type === 'admin' && (
                             <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                              <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                          )}
                          {activity.type === 'user' && (
                             <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                              <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                          )}
                          {activity.type === 'session' && (
                             <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center">
                              <svg className="w-5 h-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                          {/* Default icon if type doesn't match */}
                          {!['domain', 'question', 'company', 'admin', 'user', 'session'].includes(activity.type) && (
                             <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-base font-medium text-gray-900">{activity.title}</p>
                          <p className="text-sm text-gray-500 mt-1">{activity.description}</p>
                          <div className="flex items-center text-xs text-gray-500 mt-2">
                            <svg className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                            </svg>
                            <time dateTime={activity.timestamp}>{activity.time}</time>
                            <span className="mx-2">•</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                              {activity.type}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                     <div className="ml-4 flex-shrink-0 text-xs text-gray-500 font-mono">
                      ID: {activity.id.substring(0, 8)}...
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Empty State
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                 <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No activity found</h3>
              <p className="text-gray-500">There hasn't been any recent activity on the platform.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecentActivityPage;