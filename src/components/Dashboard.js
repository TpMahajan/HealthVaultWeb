/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { API_BASE } from '../constants/api';
import TopNavbar from './TopNavbar';
// Removed AppointmentForm import - no longer needed
import Footer from './Footer';
import AIAssistant from './AIAssistant';
import AnimatedChatButton from './AnimatedChatButton';
import { Users, QrCode, ArrowRight, Calendar, Clock, Activity, TrendingUp, AlertTriangle, CheckCircle, FileText, Heart, Shield, Plus, RefreshCw, X, Home, Settings, LogOut, Info, Search, User, Sun, Moon } from 'lucide-react';

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
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
    <div className="min-h-screen bg-gray-100 flex font-sans" style={{ fontFamily: "'Josefin Sans', system-ui, -apple-system, sans-serif" }}>
      {/* Left Sidebar - Dark Blue */}
      <aside className="hidden lg:flex flex-col w-20 bg-[#1e3a8a] text-white fixed left-0 top-0 h-screen z-30">
        {/* Logo */}
        <div className="p-4 border-b border-blue-800">
          <div className="h-10 w-10 bg-yellow-400 rounded-lg flex items-center justify-center font-bold text-blue-900 text-lg">
            MV
          </div>
        </div>
        
        {/* Navigation Icons */}
        <nav className="flex-1 py-4 space-y-2">
          <button
            onClick={() => navigate('/dashboard')}
            className={`w-full flex items-center justify-center p-3 rounded-lg transition-colors ${
              location.pathname === '/dashboard' 
                ? 'bg-blue-600 text-white' 
                : 'text-blue-200 hover:bg-blue-800/50'
            }`}
            title="Dashboard"
          >
            <Home className="h-6 w-6" />
          </button>
          
          <button
            onClick={() => navigate('/scan')}
            className={`w-full flex items-center justify-center p-3 rounded-lg transition-colors ${
              location.pathname === '/scan' 
                ? 'bg-blue-600 text-white' 
                : 'text-blue-200 hover:bg-blue-800/50'
            }`}
            title="Scan QR"
          >
            <div className="h-8 w-8 bg-blue-500 rounded flex items-center justify-center">
              <Plus className="h-4 w-4 text-white" />
            </div>
          </button>
          
          <button
            onClick={() => navigate('/patients')}
            className={`w-full flex items-center justify-center p-3 rounded-lg transition-colors ${
              location.pathname === '/patients' 
                ? 'bg-blue-600 text-white' 
                : 'text-blue-200 hover:bg-blue-800/50'
            }`}
            title="Patients"
          >
            <Heart className="h-6 w-6" />
          </button>
          
          <button
            onClick={() => navigate('/profile')}
            className={`w-full flex items-center justify-center p-3 rounded-lg transition-colors ${
              location.pathname === '/profile' 
                ? 'bg-blue-600 text-white' 
                : 'text-blue-200 hover:bg-blue-800/50'
            }`}
            title="Profile"
          >
            <User className="h-6 w-6" />
          </button>
          
          <button
            onClick={() => navigate('/settings')}
            className={`w-full flex items-center justify-center p-3 rounded-lg transition-colors ${
              location.pathname === '/settings' 
                ? 'bg-blue-600 text-white' 
                : 'text-blue-200 hover:bg-blue-800/50'
            }`}
            title="Settings"
          >
            <Settings className="h-6 w-6" />
          </button>
          
          <button
            className="w-full flex items-center justify-center p-3 rounded-lg text-blue-200 hover:bg-blue-800/50 transition-colors"
            title="Info"
          >
            <Info className="h-6 w-6" />
          </button>
        </nav>
        
        {/* Profile Section with Refresh */}
        <div className="p-4 border-t border-blue-800 space-y-3">
          {/* Doctor Avatar with Refresh */}
          <div className="relative group">
            <button
              onClick={() => navigate('/profile')}
              className="w-full flex items-center justify-center"
              title="Profile"
            >
              <div className="relative">
                {user?.avatar || user?.avatarUrl ? (
                  <img
                    src={user.avatar || user.avatarUrl}
                    alt={user?.name || 'Doctor'}
                    className="h-12 w-12 rounded-full object-cover border-2 border-blue-500"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className={`h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center border-2 border-blue-400 ${user?.avatar || user?.avatarUrl ? 'hidden' : ''}`}>
                  <User className="h-6 w-6 text-white" />
                </div>
                {/* Refresh Icon Overlay */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRefresh();
                  }}
                  disabled={refreshing}
                  className="absolute -bottom-1 -right-1 h-6 w-6 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 disabled:opacity-50"
                  title="Refresh"
                >
                  <RefreshCw className={`h-3.5 w-3.5 text-white ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </button>
          </div>
          
          {/* Logout */}
          <button
            onClick={() => {
              localStorage.removeItem('token');
              navigate('/');
            }}
            className="w-full flex items-center justify-center p-3 rounded-lg text-blue-200 hover:bg-blue-800/50 transition-colors"
            title="Logout"
          >
            <LogOut className="h-6 w-6" />
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-[#1e3a8a] text-white rounded-lg"
      >
        <Home className="h-6 w-6" />
      </button>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed left-0 top-0 h-screen w-20 bg-[#1e3a8a] text-white z-50 lg:hidden">
            <div className="p-4 border-b border-blue-800">
              <div className="h-10 w-10 bg-yellow-400 rounded-lg flex items-center justify-center font-bold text-blue-900 text-lg">
                MV
              </div>
            </div>
            <nav className="flex-1 py-4 space-y-2">
              <button onClick={() => { navigate('/dashboard'); setSidebarOpen(false); }} className="w-full flex items-center justify-center p-3 rounded-lg bg-blue-600 text-white">
                <Home className="h-6 w-6" />
              </button>
              <button onClick={() => { navigate('/scan'); setSidebarOpen(false); }} className="w-full flex items-center justify-center p-3 rounded-lg text-blue-200 hover:bg-blue-800/50">
                <div className="h-8 w-8 bg-blue-500 rounded flex items-center justify-center">
                  <Plus className="h-4 w-4 text-white" />
                </div>
              </button>
              <button onClick={() => { navigate('/patients'); setSidebarOpen(false); }} className="w-full flex items-center justify-center p-3 rounded-lg text-blue-200 hover:bg-blue-800/50">
                <Heart className="h-6 w-6" />
              </button>
              <button onClick={() => { navigate('/profile'); setSidebarOpen(false); }} className="w-full flex items-center justify-center p-3 rounded-lg text-blue-200 hover:bg-blue-800/50">
                <User className="h-6 w-6" />
              </button>
              <button onClick={() => { navigate('/settings'); setSidebarOpen(false); }} className="w-full flex items-center justify-center p-3 rounded-lg text-blue-200 hover:bg-blue-800/50">
                <Settings className="h-6 w-6" />
              </button>
            </nav>
            <div className="p-4 border-t border-blue-800 space-y-3">
              <div className="relative">
                <button
                  onClick={() => { navigate('/profile'); setSidebarOpen(false); }}
                  className="w-full flex items-center justify-center"
                >
                  <div className="relative">
                    {user?.avatar || user?.avatarUrl ? (
                      <img
                        src={user.avatar || user.avatarUrl}
                        alt={user?.name || 'Doctor'}
                        className="h-12 w-12 rounded-full object-cover border-2 border-blue-500"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className={`h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center border-2 border-blue-400 ${user?.avatar || user?.avatarUrl ? 'hidden' : ''}`}>
                      <User className="h-6 w-6 text-white" />
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRefresh();
                        setSidebarOpen(false);
                      }}
                      disabled={refreshing}
                      className="absolute -bottom-1 -right-1 h-6 w-6 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 text-white ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </button>
              </div>
              <button onClick={() => { localStorage.removeItem('token'); navigate('/'); }} className="w-full flex items-center justify-center p-3 rounded-lg text-blue-200 hover:bg-blue-800/50">
                <LogOut className="h-6 w-6" />
              </button>
            </div>
          </aside>
        </>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-20">
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100 dark:from-gray-900 dark:via-gray-800/50 dark:to-gray-900">
          {/* Top Bar */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white" style={{ fontFamily: "'Josefin Sans', system-ui, sans-serif", fontWeight: 700 }}>Dashboard</h1>
              <button
                onClick={toggleTheme}
                className="flex items-center justify-center p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-colors duration-200"
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <main className="p-6">
            {/* Dashboard Content */}
            {location.pathname === '/dashboard' ? (
              <div className="space-y-6">
                {/* Welcome Section */}
                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-md rounded-xl shadow-sm border border-white/50 dark:border-gray-700/50 p-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1" style={{ fontFamily: "'Josefin Sans', system-ui, sans-serif", fontWeight: 700 }}>Welcome back, {user?.name || 'Doctor'}!</h2>
                    <p className="text-gray-600 dark:text-gray-300" style={{ fontFamily: "'Josefin Sans', system-ui, sans-serif", fontWeight: 400 }}>Here's what's happening with your practice today.</p>
                  </div>
                </div>

                {/* Loading State */}
                {loading && (
                  <div className="flex items-center justify-center py-12 bg-white/70 dark:bg-gray-800/70 backdrop-blur-md rounded-xl shadow-sm border border-white/50 dark:border-gray-700/50">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
                    <span className="ml-3 text-gray-600 dark:text-gray-300">Loading dashboard data...</span>
                  </div>
                )}

                {/* Dashboard Content */}
                {!loading && (
                  <>
                    {/* Stats Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-md rounded-xl shadow-sm border border-white/50 dark:border-gray-700/50 p-6 hover:shadow-md transition-shadow duration-200">
                        <div className="flex items-center">
                          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                            <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-300" style={{ fontFamily: "'Josefin Sans', system-ui, sans-serif", fontWeight: 500 }}>Active Patients</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white" style={{ fontFamily: "'Josefin Sans', system-ui, sans-serif", fontWeight: 700 }}>{dashboardData.totalPatients}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400" style={{ fontFamily: "'Josefin Sans', system-ui, sans-serif", fontWeight: 400 }}>With active sessions</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-md rounded-xl shadow-sm border border-white/50 dark:border-gray-700/50 p-6 hover:shadow-md transition-shadow duration-200">
                        <div className="flex items-center">
                          <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                            <QrCode className="h-6 w-6 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-300" style={{ fontFamily: "'Josefin Sans', system-ui, sans-serif", fontWeight: 500 }}>Approved Scans</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white" style={{ fontFamily: "'Josefin Sans', system-ui, sans-serif", fontWeight: 700 }}>{dashboardData.recentScans}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400" style={{ fontFamily: "'Josefin Sans', system-ui, sans-serif", fontWeight: 400 }}>Patient approvals</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-md rounded-xl shadow-sm border border-white/50 dark:border-gray-700/50 p-6 hover:shadow-md transition-shadow duration-200">
                        <div className="flex items-center">
                          <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                            <Calendar className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-300" style={{ fontFamily: "'Josefin Sans', system-ui, sans-serif", fontWeight: 500 }}>Today's Appointments</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white" style={{ fontFamily: "'Josefin Sans', system-ui, sans-serif", fontWeight: 700 }}>{dashboardData.todayAppointments}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-md rounded-xl shadow-sm border border-white/50 dark:border-gray-700/50 p-6 hover:shadow-md transition-shadow duration-200">
                        <div className="flex items-center">
                          <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-300" style={{ fontFamily: "'Josefin Sans', system-ui, sans-serif", fontWeight: 500 }}>Expiring Sessions</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white" style={{ fontFamily: "'Josefin Sans', system-ui, sans-serif", fontWeight: 700 }}>{dashboardData.criticalPatients}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400" style={{ fontFamily: "'Josefin Sans', system-ui, sans-serif", fontWeight: 400 }}>Sessions ending soon</p>
                          </div>
                        </div>
                      </div>
                  </div>

                    {/* Quick Actions + Recent Activity */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Quick Actions */}
                      <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-md rounded-xl shadow-sm border border-white/50 dark:border-gray-700/50 p-6 hover:shadow-md transition-shadow duration-200">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4" style={{ fontFamily: "'Josefin Sans', system-ui, sans-serif", fontWeight: 600 }}>Quick Actions</h3>
                        <div className="space-y-3">
                          <button
                            onClick={() => navigate('/scan')}
                            className="w-full flex items-center justify-between p-4 bg-blue-50/80 dark:bg-blue-900/20 backdrop-blur-sm rounded-xl border border-blue-200/50 dark:border-blue-800/50 hover:bg-blue-100/80 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200 group"
                          >
                            <div className="flex items-center flex-1">
                              <div className="p-2 bg-blue-500 dark:bg-blue-600 rounded-lg flex-shrink-0">
                                <QrCode className="w-5 h-5 text-white" />
                              </div>
                              <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-200" style={{ fontFamily: "'Josefin Sans', system-ui, sans-serif", fontWeight: 500 }}>
                                Scan Patient QR
                              </span>
                            </div>
                            <ArrowRight className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
                          </button>

                          <button
                            onClick={() => navigate('/patients')}
                            className="w-full flex items-center justify-between p-4 bg-green-50/80 dark:bg-green-900/20 backdrop-blur-sm rounded-xl border border-green-200/50 dark:border-green-800/50 hover:bg-green-100/80 dark:hover:bg-green-900/30 hover:border-green-300 dark:hover:border-green-700 transition-all duration-200 group"
                          >
                            <div className="flex items-center flex-1">
                              <div className="p-2 bg-green-500 dark:bg-green-600 rounded-lg flex-shrink-0">
                                <Users className="w-5 h-5 text-white" />
                              </div>
                              <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-200" style={{ fontFamily: "'Josefin Sans', system-ui, sans-serif", fontWeight: 500 }}>
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
                            className="w-full flex items-center justify-between p-4 bg-purple-50/80 dark:bg-purple-900/20 backdrop-blur-sm rounded-xl border border-purple-200/50 dark:border-purple-800/50 hover:bg-purple-100/80 dark:hover:bg-purple-900/30 hover:border-purple-300 dark:hover:border-purple-700 transition-all duration-200 group"
                          >
                            <div className="flex items-center flex-1">
                              <div className="p-2 bg-purple-500 dark:bg-purple-600 rounded-lg flex-shrink-0">
                                <Calendar className="w-5 h-5 text-white" />
                              </div>
                              <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-200" style={{ fontFamily: "'Josefin Sans', system-ui, sans-serif", fontWeight: 500 }}>
                                View Appointments
                              </span>
                            </div>
                            <ArrowRight className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-purple-600 dark:group-hover:text-purple-400 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
                          </button>
                        </div>
                      </div>

                      {/* Recent Activity */}
                      <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-md rounded-xl shadow-sm border border-white/50 dark:border-gray-700/50 p-6 hover:shadow-md transition-shadow duration-200">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4" style={{ fontFamily: "'Josefin Sans', system-ui, sans-serif", fontWeight: 600 }}>Recent Activity</h3>
                      <div className="space-y-3">
                          {dashboardData.recentActivity.length > 0 ? (
                            dashboardData.recentActivity.map((activity) => (
                          <ActivityItem
                            key={activity.id}
                            color={activity.type === 'scan' ? 'blue' : activity.type === 'record' ? 'green' : activity.type === 'alert' ? 'red' : 'purple'}
                            title={activity.message}
                            subtitle={`${activity.patient} • ${activity.time}`}
                            icon={activity.type === 'scan' ? QrCode : activity.type === 'record' ? FileText : activity.type === 'alert' ? AlertTriangle : Users}
                          />
                            ))
                          ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No recent activity</p>
                          )}
                        </div>
                    </div>
                  </div>

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
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-md rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-white/50">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900" style={{ fontFamily: "'Josefin Sans', system-ui, sans-serif", fontWeight: 600 }}>My Appointments</h2>
              <button
                onClick={() => setShowAppointments(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {appointmentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mr-2" />
                  <span className="text-gray-600">Loading appointments...</span>
                </div>
              ) : appointments.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2" style={{ fontFamily: "'Josefin Sans', system-ui, sans-serif", fontWeight: 600 }}>No appointments found</h3>
                  <p className="text-gray-600" style={{ fontFamily: "'Josefin Sans', system-ui, sans-serif", fontWeight: 400 }}>You haven't scheduled any appointments yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {appointments.map((appointment) => (
                    <div key={appointment._id} className="bg-gray-50/80 backdrop-blur-sm rounded-lg p-4 border border-gray-200/50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                              {appointment.patientName?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900" style={{ fontFamily: "'Josefin Sans', system-ui, sans-serif", fontWeight: 600 }}>{appointment.patientName}</h3>
                              <p className="text-sm text-gray-600" style={{ fontFamily: "'Josefin Sans', system-ui, sans-serif", fontWeight: 400 }}>ID: {appointment.patientId}</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                            <div className="space-y-2">
                              <div className="flex items-center text-sm">
                                <Calendar className="h-4 w-4 text-gray-500 mr-2" />
                                <span className="text-gray-600">Date:</span>
                                <span className="ml-2 font-medium text-gray-900">
                                  {new Date(appointment.appointmentDate).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="flex items-center text-sm">
                                <Clock className="h-4 w-4 text-gray-500 mr-2" />
                                <span className="text-gray-600">Time:</span>
                                <span className="ml-2 font-medium text-gray-900">{appointment.appointmentTime}</span>
                              </div>
                              <div className="flex items-center text-sm">
                                <span className="text-gray-600">Duration:</span>
                                <span className="ml-2 font-medium text-gray-900">{appointment.duration} minutes</span>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex items-center text-sm">
                                <span className="text-gray-600">Type:</span>
                                <span className="ml-2 font-medium text-gray-900 capitalize">{appointment.appointmentType}</span>
                              </div>
                              <div className="flex items-center text-sm">
                                <span className="text-gray-600">Status:</span>
                                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                                  appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                                  appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                  appointment.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {appointment.status}
                                </span>
                              </div>
                              {appointment.patientEmail && (
                                <div className="flex items-center text-sm">
                                  <span className="text-gray-600">Email:</span>
                                  <span className="ml-2 text-gray-900">{appointment.patientEmail}</span>
                                </div>
                              )}
                              {appointment.patientPhone && (
                                <div className="flex items-center text-sm">
                                  <span className="text-gray-600">Phone:</span>
                                  <span className="ml-2 text-gray-900">{appointment.patientPhone}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {appointment.reason && (
                            <div className="mt-3">
                              <span className="text-sm text-gray-600">Reason:</span>
                              <p className="mt-1 text-sm text-gray-900 bg-white/80 backdrop-blur-sm p-2 rounded border border-gray-200/50">
                                {appointment.reason}
                              </p>
                            </div>
                          )}
                          
                          {appointment.notes && (
                            <div className="mt-3">
                              <span className="text-sm text-gray-600">Notes:</span>
                              <p className="mt-1 text-sm text-gray-900 bg-white/80 backdrop-blur-sm p-2 rounded border border-gray-200/50">
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
      <span className="text-sm text-gray-700 dark:text-gray-200 font-medium" style={{ fontFamily: "'Josefin Sans', system-ui, sans-serif", fontWeight: 500 }}>{title}</span>
      <p className="text-xs text-gray-500 dark:text-gray-400" style={{ fontFamily: "'Josefin Sans', system-ui, sans-serif", fontWeight: 400 }}>{subtitle}</p>
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
