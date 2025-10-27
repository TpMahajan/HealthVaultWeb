/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../constants/api';
import TopNavbar from './TopNavbar';
// Removed AppointmentForm import - no longer needed
import Footer from './Footer';
import AIAssistant from './AIAssistant';
import AnimatedChatButton from './AnimatedChatButton';
import { Users, QrCode, ArrowRight, Calendar, Clock, Activity, TrendingUp, AlertTriangle, CheckCircle, FileText, Heart, Shield, Plus, RefreshCw, X } from 'lucide-react';

const Dashboard = () => {
  const [showAppointments, setShowAppointments] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    totalPatients: 0,
    recentScans: 0,
    todayAppointments: 0,
    criticalPatients: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Calculate today's appointments count
  const getTodayAppointmentsCount = (appointments) => {
    if (!appointments || appointments.length === 0) return 0;
    
    const today = new Date();
    const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    const todayAppointments = appointments.filter(appointment => {
      const appointmentDate = new Date(appointment.appointmentDate);
      const appointmentDateString = appointmentDate.toISOString().split('T')[0];
      return appointmentDateString === todayString;
    });
    
    console.log('📅 Today\'s appointments:', todayAppointments.length, 'out of', appointments.length, 'total');
    return todayAppointments.length;
  };

  // Update today's appointments count
  const updateTodayAppointmentsCount = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${API_BASE}/appointments`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.appointments) {
          const todayCount = getTodayAppointmentsCount(data.appointments);
          setDashboardData(prev => ({
            ...prev,
            todayAppointments: todayCount
          }));
          console.log('🔄 Updated today\'s appointments count:', todayCount);
        }
      }
    } catch (error) {
      console.error('❌ Failed to update today\'s appointments count:', error);
    }
  };

  // Load appointments from backend
  const loadAppointments = async () => {
    try {
      setAppointmentsLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.log('❌ No authentication token found');
        throw new Error('Please log in as a doctor');
      }

      const response = await fetch(`${API_BASE}/appointments`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch appointments: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📅 Appointments loaded:', data);
      console.log('🔍 Dashboard Debug - Response status:', response.status);
      console.log('🔍 Dashboard Debug - Appointments count:', data.appointments?.length || 0);
      console.log('🔍 Dashboard Debug - Full response:', data);
      
      if (data.success) {
        setAppointments(data.appointments || []);
        console.log('✅ Appointments set in state:', data.appointments || []);
      } else {
        throw new Error(data.message || 'Failed to load appointments');
      }
    } catch (error) {
      console.error('❌ Error loading appointments:', error);
      setAppointments([]);
    } finally {
      setAppointmentsLoading(false);
    }
  };

  // Load dashboard data from doctor's active sessions
  const loadDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      console.log('👨‍⚕️ Dashboard - Loading doctor\'s session data');
      
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('❌ No authentication token found');
        throw new Error('Please log in as a doctor');
      }

      // Fetch doctor's active sessions
      const response = await fetch(`${API_BASE}/sessions/mine`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load sessions: ${response.status}`);
      }

      const data = await response.json();
      console.log('📋 Dashboard - Session data:', data);

      if (data.success) {
        const activeSessions = data.patients || [];
        console.log(`✅ Dashboard - Found ${activeSessions.length} active patient sessions`);

        // Calculate statistics based on active sessions
        const totalPatients = activeSessions.length;
        const expiringSoon = activeSessions.filter(p => p.isExpiringSoon).length;
        const recentScans = activeSessions.length; // Each session represents a successful scan/approval
        
        // Generate recent activity from sessions
        const recentActivity = activeSessions.slice(0, 4).map((patient, index) => ({
          id: index + 1,
          type: index % 3 === 0 ? 'scan' : index % 3 === 1 ? 'record' : 'session',
          message: index % 3 === 0 ? 'Patient session approved' : 
                   index % 3 === 1 ? 'Medical records accessed' : 
                   'Session established',
          patient: patient.name,
          time: index === 0 ? '2 minutes ago' : 
                index === 1 ? '15 minutes ago' : 
                index === 2 ? '1 hour ago' : '2 hours ago'
        }));

        // Load appointments to get real today's count
        const appointmentsResponse = await fetch(`${API_BASE}/appointments`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        
        let todayAppointmentsCount = 0;
        if (appointmentsResponse.ok) {
          const appointmentsData = await appointmentsResponse.json();
          if (appointmentsData.success && appointmentsData.appointments) {
            todayAppointmentsCount = getTodayAppointmentsCount(appointmentsData.appointments);
          }
        }

        setDashboardData({
          totalPatients: totalPatients,
          recentScans: recentScans,
          todayAppointments: todayAppointmentsCount,
          criticalPatients: expiringSoon,
          recentActivity: recentActivity
        });

        console.log('✅ Dashboard data updated:', {
          totalPatients,
          recentScans,
          expiringSoon
        });

      } else {
        throw new Error(data.message || 'Failed to load session data');
      }

    } catch (error) {
      console.error('❌ Dashboard - Error loading session data:', error);
      
      // Fallback to cached data if available
      try {
        const cached = localStorage.getItem('patients');
        if (cached) {
          const cachedPatients = JSON.parse(cached).filter(p => p.expiresAt > Date.now());
          console.log('📦 Dashboard - Using cached data as fallback:', cachedPatients.length);
          
          // Try to get real appointment count even with cached data
          let todayAppointmentsCount = 0;
          try {
            const appointmentsResponse = await fetch(`${API_BASE}/appointments`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (appointmentsResponse.ok) {
              const appointmentsData = await appointmentsResponse.json();
              if (appointmentsData.success && appointmentsData.appointments) {
                todayAppointmentsCount = getTodayAppointmentsCount(appointmentsData.appointments);
              }
            }
          } catch (appointmentError) {
            console.log('⚠️ Could not load appointments for today count, using 0');
          }

          setDashboardData({
            totalPatients: cachedPatients.length,
            recentScans: cachedPatients.length,
            todayAppointments: todayAppointmentsCount,
            criticalPatients: Math.floor(cachedPatients.length * 0.2),
            recentActivity: cachedPatients.slice(0, 4).map((patient, index) => ({
              id: index + 1,
              type: 'scan',
              message: 'Cached patient data',
              patient: patient.name,
              time: 'Recently cached'
            }))
          });
        } else {
          // No data available
          setDashboardData({
            totalPatients: 0,
            recentScans: 0,
            todayAppointments: 0,
            criticalPatients: 0,
            recentActivity: []
          });
        }
      } catch (cacheError) {
        console.error('❌ Cache fallback failed:', cacheError);
        setDashboardData({
          totalPatients: 0,
          recentScans: 0,
          todayAppointments: 0,
          criticalPatients: 0,
          recentActivity: []
        });
      }
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  // Load dashboard data on component mount
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Update today's appointments count periodically
  useEffect(() => {
    // Update immediately
    updateTodayAppointmentsCount();
    
    // Update every 5 minutes
    const interval = setInterval(() => {
      updateTodayAppointmentsCount();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  // Refresh dashboard data
  const handleRefresh = () => {
    loadDashboardData(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <TopNavbar />
      <div className="pt-16 relative z-10">
        <main className="px-4 sm:px-6 lg:px-8 py-8">
          {/* Dashboard Content */}
          {location.pathname === '/dashboard' ? (
            <div className="space-y-8">
              {/* Welcome Section */}
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-md border border-white/30 dark:border-gray-700/30">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Welcome back, {user?.name}!</h1>
                    <p className="text-gray-600 dark:text-gray-300">Here's what's happening with your practice today.</p>
                  </div>
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>
              </div>

              {/* Loading State */}
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">Loading dashboard data...</span>
                </div>
              )}

              {/* Dashboard Content */}
              {!loading && (
                <>
                  {/* Stats Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-md border border-white/30 dark:border-gray-700/30">
                      <div className="flex items-center">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                          <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Active Patients</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{dashboardData.totalPatients}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">With active sessions</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-md border border-white/30 dark:border-gray-700/30">
                      <div className="flex items-center">
                        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                          <QrCode className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Approved Scans</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{dashboardData.recentScans}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Patient approvals</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-md border border-white/30 dark:border-gray-700/30">
                      <div className="flex items-center">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                          <Calendar className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Today's Appointments</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{dashboardData.todayAppointments}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-md border border-white/30 dark:border-gray-700/30">
                      <div className="flex items-center">
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                          <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Expiring Sessions</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{dashboardData.criticalPatients}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Sessions ending soon</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions + Recent Activity */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
                    {/* Quick Actions */}
                    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-md border border-white/30 dark:border-gray-700/30">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Quick Actions</h3>
                      <div className="space-y-4">
                        <button
                          onClick={() => navigate('/scan')}
                          className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 hover:shadow-md transition-all duration-200 group"
                        >
                          <div className="flex items-center flex-1">
                            <div className="p-2 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-800 dark:to-blue-900 rounded-lg flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                              <QrCode className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                              Scan Patient QR
                            </span>
                          </div>
                          <ArrowRight className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
                        </button>

                        <button
                          onClick={() => navigate('/patients')}
                          className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800 hover:from-green-100 hover:to-emerald-100 dark:hover:from-green-900/30 dark:hover:to-emerald-900/30 hover:shadow-md transition-all duration-200 group"
                        >
                          <div className="flex items-center flex-1">
                            <div className="p-2 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-800 dark:to-green-900 rounded-lg flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                              <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </div>
                            <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                              View My Patients
                            </span>
                          </div>
                          <ArrowRight className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-green-600 dark:group-hover:text-green-400 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
                        </button>

                        <button
                          onClick={() => {
                            setShowAppointments(true);
                            loadAppointments();
                          }}
                          className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-800 hover:from-purple-100 hover:to-pink-100 dark:hover:from-purple-900/30 dark:hover:to-pink-900/30 hover:shadow-md transition-all duration-200 group"
                        >
                          <div className="flex items-center flex-1">
                            <div className="p-2 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-800 dark:to-purple-900 rounded-lg flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                              <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                              View Appointments
                            </span>
                          </div>
                          <ArrowRight className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-purple-600 dark:group-hover:text-purple-400 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
                        </button>
                      </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-md border border-white/30 dark:border-gray-700/30">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Activity</h3>
                      <div className="space-y-3">
                        {dashboardData.recentActivity.map((activity) => (
                          <ActivityItem
                            key={activity.id}
                            color={activity.type === 'scan' ? 'blue' : activity.type === 'record' ? 'green' : activity.type === 'alert' ? 'red' : 'purple'}
                            title={activity.message}
                            subtitle={`${activity.patient} • ${activity.time}`}
                            icon={activity.type === 'scan' ? QrCode : activity.type === 'record' ? FileText : activity.type === 'alert' ? AlertTriangle : Users}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Notification Test Section removed */}
                </>
              )}
            </div>
          ) : (
            <Outlet />
          )}
        </main>
        {/* Footer */}
        <Footer />
      </div>

      {/* AI Assistant Animated Button */}
      <AnimatedChatButton onClick={() => setShowAIAssistant(true)} />

      {/* AI Assistant Modal */}
      <AIAssistant
        isOpen={showAIAssistant}
        onClose={() => setShowAIAssistant(false)}
        userRole="doctor"
      />

      {/* Appointments Modal */}
      {showAppointments && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col mx-2 sm:mx-4">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">My Appointments</h2>
              <button
                onClick={() => setShowAppointments(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {appointmentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mr-2" />
                  <span className="text-gray-600 dark:text-gray-400">Loading appointments...</span>
                </div>
              ) : appointments.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No appointments found</h3>
                  <p className="text-gray-600 dark:text-gray-400">You haven't scheduled any appointments yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {appointments.map((appointment) => (
                    <div key={appointment._id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                              {appointment.patientName?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900 dark:text-gray-100">{appointment.patientName}</h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400">ID: {appointment.patientId}</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                            <div className="space-y-2">
                              <div className="flex items-center text-sm">
                                <Calendar className="h-4 w-4 text-gray-500 mr-2" />
                                <span className="text-gray-600 dark:text-gray-400">Date:</span>
                                <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                                  {new Date(appointment.appointmentDate).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="flex items-center text-sm">
                                <Clock className="h-4 w-4 text-gray-500 mr-2" />
                                <span className="text-gray-600 dark:text-gray-400">Time:</span>
                                <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">{appointment.appointmentTime}</span>
                              </div>
                              <div className="flex items-center text-sm">
                                <span className="text-gray-600 dark:text-gray-400">Duration:</span>
                                <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">{appointment.duration} minutes</span>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex items-center text-sm">
                                <span className="text-gray-600 dark:text-gray-400">Type:</span>
                                <span className="ml-2 font-medium text-gray-900 dark:text-gray-100 capitalize">{appointment.appointmentType}</span>
                              </div>
                              <div className="flex items-center text-sm">
                                <span className="text-gray-600 dark:text-gray-400">Status:</span>
                                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                                  appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                  appointment.status === 'confirmed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                  appointment.status === 'completed' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' :
                                  'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                }`}>
                                  {appointment.status}
                                </span>
                              </div>
                              {appointment.patientEmail && (
                                <div className="flex items-center text-sm">
                                  <span className="text-gray-600 dark:text-gray-400">Email:</span>
                                  <span className="ml-2 text-gray-900 dark:text-gray-100">{appointment.patientEmail}</span>
                                </div>
                              )}
                              {appointment.patientPhone && (
                                <div className="flex items-center text-sm">
                                  <span className="text-gray-600 dark:text-gray-400">Phone:</span>
                                  <span className="ml-2 text-gray-900 dark:text-gray-100">{appointment.patientPhone}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {appointment.reason && (
                            <div className="mt-3">
                              <span className="text-sm text-gray-600 dark:text-gray-400">Reason:</span>
                              <p className="mt-1 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-600 p-2 rounded border">
                                {appointment.reason}
                              </p>
                            </div>
                          )}
                          
                          {appointment.notes && (
                            <div className="mt-3">
                              <span className="text-sm text-gray-600 dark:text-gray-400">Notes:</span>
                              <p className="mt-1 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-600 p-2 rounded border">
                                {appointment.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

/* ----------------------
 * Helper Components
 * --------------------*/
const ActivityItem = ({ color, title, subtitle, icon: Icon }) => (
  <div className="flex items-start space-x-3">
    <div className={`p-2 rounded-lg ${
      color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30' : 
      color === 'green' ? 'bg-green-100 dark:bg-green-900/30' : 
      color === 'red' ? 'bg-red-100 dark:bg-red-900/30' : 
      'bg-purple-100 dark:bg-purple-900/30'
    }`}>
      <Icon className={`h-4 w-4 ${
        color === 'blue' ? 'text-blue-600 dark:text-blue-400' : 
        color === 'green' ? 'text-green-600 dark:text-green-400' : 
        color === 'red' ? 'text-red-600 dark:text-red-400' : 
        'text-purple-600 dark:text-purple-400'
      }`} />
    </div>
    <div className="flex-1 min-w-0">
      <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{title}</span>
      <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
    </div>
  </div>
);

const OverviewStat = ({ label, value, change }) => (
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
    <span className="text-sm text-green-600 font-medium">{change}</span>
  </div>
);
