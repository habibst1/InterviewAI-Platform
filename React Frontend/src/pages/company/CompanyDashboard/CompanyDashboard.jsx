// src/pages/company/Dashboard/CompanyDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { getMyInterviews } from '../../../services/companyInterviewService';

const CompanyDashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Extract company name from email or use stored company name
  const companyName = currentUser?.email?.split('@')?.[1] || 'Company';
  
  // Get logo URL from currentUser
  const logoUrl = currentUser?.logoUrl;

  useEffect(() => {
    const fetchInterviews = async () => {
      try {
        setLoading(true);
        setError('');
        const interviewData = await getMyInterviews();
        const sortedInterviews = interviewData.sort((a, b) =>
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        setInterviews(sortedInterviews.slice(0, 4)); // Get only recent 4 interviews
      } catch (err) {
        console.error('CompanyDashboard - Failed to fetch interviews:', err);
        setError('Failed to load interview data.');
      } finally {
        setLoading(false);
      }
    };

    fetchInterviews();
  }, []);

  const handleCreateInterview = () => {
    navigate('/company/interviews/create');
  };

  const stats = [
    { 
      name: 'Active Interviews', 
      value: interviews.filter(i => i.isActive).length,
      icon: (
        <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: 'bg-purple-100'
    },
    { 
      name: 'Total Candidates', 
      value: interviews.reduce((sum, i) => sum + (i.invitationCount || 0), 0),
      icon: (
        <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: 'bg-blue-100'
    },
    { 
      name: 'Completed Sessions', 
      value: interviews.reduce((sum, i) => sum + (i.sessionCount || 0), 0),
      icon: (
        <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'bg-green-100'
    },
    { 
      name: 'Pending Reviews', 
      value: interviews.filter(i => i.isActive).length > 0 ? 
             interviews.filter(i => i.isActive).reduce((sum, i) => sum + (i.sessionCount || 0), 0) : 0,
      icon: (
        <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'bg-orange-100'
    }
  ];

  const quickActions = [
    {
      title: 'Create New Interview',
      description: 'Set up a new candidate screening',
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
      action: handleCreateInterview,
      color: 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700',
    },
    {
      title: 'View All Interviews',
      description: 'Manage your active interviews',
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      href: '/company/interviews',
      color: 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700',
    },
    {
      title: 'Saved Candidates',
      description: 'View your bookmarked candidates',
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      ),
      href: '/company/saved-candidates',
      color: 'bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700',
    },
  ];

  const recentActivity = interviews.slice(0, 3).map(interview => ({
    id: interview.id,
    title: interview.title,
    description: `${interview.questionCount} questions • ${interview.sessionCount || 0} sessions`,
    time: new Date(interview.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    }),
    type: interview.isActive ? 'active' : 'finished',
    interviewId: interview.id
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6 md:flex md:items-center md:justify-between">
            <div className="flex items-center min-w-0">
              {/* Company Logo */}
              {logoUrl ? (
                <div className="flex-shrink-0 mr-4">
                  <img 
                    src={`http://localhost:5143${logoUrl}`} 
                    alt="Company Logo" 
                    className="h-12 w-12 rounded-lg object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <div className="flex-shrink-0 mr-4">
                  <div className="h-12 w-12 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
              )}
              
              <div>
                <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                  Company Dashboard
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  
                </p>
              </div>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4">
              <button
                onClick={handleCreateInterview}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create Interview
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Section */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {stats.map((stat) => (
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

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {quickActions.map((action) => (
              <div
                key={action.title}
                onClick={action.action}
                className={`${action.color} rounded-2xl shadow-lg cursor-pointer transition-all duration-300 transform hover:scale-105`}
              >
                {action.href ? (
                  <Link to={action.href} className="block p-6">
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
                  </Link>
                ) : (
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
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1  gap-8">
          {/* Recent Interviews */}
          <div className="bg-white shadow rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Interviews</h3>
                <Link 
                  to="/company/interviews" 
                  className="text-sm font-medium text-purple-600 hover:text-purple-700"
                >
                  View all
                </Link>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {loading ? (
                <div className="p-6 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                </div>
              ) : error ? (
                <div className="p-6 text-center">
                  <p className="text-gray-500">Failed to load interviews</p>
                </div>
              ) : recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {activity.title}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {activity.description}
                        </p>
                      </div>
                      <div className="ml-4 flex-shrink-0 flex items-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          activity.type === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {activity.type === 'active' ? 'Active' : 'Finished'}
                        </span>
                        <button
                          onClick={() => navigate(`/company/interviews/${activity.interviewId}`)}
                          className="ml-3 text-purple-600 hover:text-purple-800"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500">
                      <svg className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                      <time dateTime={activity.time}>{activity.time}</time>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No interviews</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by creating your first interview.</p>
                  <div className="mt-6">
                    <button
                      onClick={handleCreateInterview}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                    >
                      <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Create Interview
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

    {/* Tips Section */}
    <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl shadow-lg">
      <div className="p-4 sm:p-6">
        <div className="flex items-start pt-4 pb-2">
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-semibold text-white">Recruitment Tip</h3>
            <p className="mt-2 text-purple-100 text-sm">
              Use our AI-powered candidate matching to automatically filter top candidates based on your interview results. 
              This can save you up to 60% of initial screening time.
            </p>
            <div className="mt-4">
              <button className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-purple-600 bg-white hover:bg-purple-50">
                Learn More
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyDashboard;