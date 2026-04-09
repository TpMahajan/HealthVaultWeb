/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';
import { API_BASE } from '../constants/api';
// Removed AppointmentForm import - no longer needed
import Footer from './Footer';
import AIAssistant from './AIAssistant';
import AnimatedChatButton from './AnimatedChatButton';
import { Users, QrCode, ArrowRight, Calendar, Clock, Activity, TrendingUp, AlertTriangle, CheckCircle, FileText, Heart, Shield, Plus, RefreshCw, X, Home, Settings, LogOut, Info, Search, User, Sun, Moon, Menu, ChevronLeft, ChevronDown, Bell, UserCircle, Stethoscope, Zap, History } from 'lucide-react';
import PatientDashboard from './PatientDashboard';
import { fetchTrackedAdUrl } from '../superadmin/api';
import { usePublicConfigRealtime } from '../hooks/usePublicConfigRealtime';
import {
  formatDateInputValueInSelectedTimeZone,
  getCurrentDateInSelectedTimeZone,
} from '../utils/timezone';

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
  const [publicAds, setPublicAds] = useState([]);
  const [publicAlerts, setPublicAlerts] = useState([]);
  const [publicAdIndex, setPublicAdIndex] = useState(0);
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const dashboardLoadInFlightRef = useRef(false);
  const publicContentLoadInFlightRef = useRef(false);
  const lastRealtimeRefreshRef = useRef(0);

  const navigationItems = user?.role === 'patient'
    ? [
      { name: 'Dashboard', href: '/dashboard', icon: Home },
      { name: 'My medical Vault', href: '/vault', icon: FileText },
      { name: 'Profile', href: '/profile', icon: UserCircle },
      { name: 'Settings', href: '/settings', icon: Settings },
    ]
    : [
      { name: 'Dashboard', href: '/dashboard', icon: Home },
      { name: 'Active Session', href: '/patients', icon: Users },
      { name: 'Session History', href: '/history', icon: History },
      { name: 'Profile', href: '/profile', icon: UserCircle },
      { name: 'Settings', href: '/settings', icon: Settings },
    ];

  const normalizeAlertPlatforms = (alert) => {
    if (Array.isArray(alert?.platforms) && alert.platforms.length > 0) {
      return alert.platforms.map((entry) => String(entry).trim().toUpperCase());
    }
    const legacy = String(alert?.platform || "ALL").trim().toUpperCase();
    if (!legacy || legacy === "ALL") return ["APP", "WEB"];
    return legacy.split(",").map((entry) => entry.trim()).filter(Boolean);
  };

  const isAlertActive = (alert) => {
    if (!alert || typeof alert !== "object") return false;
    if (alert.isActive === false) return false;
    const now = Date.now();
    const startAt = new Date(alert.startAt || 0).getTime();
    if (Number.isFinite(startAt) && startAt > 0 && startAt > now) return false;
    const endAt = new Date(alert.endAt || 0).getTime();
    if (Number.isFinite(endAt) && endAt > 0 && endAt < now) return false;
    const platforms = normalizeAlertPlatforms(alert);
    if (platforms.length > 0 && !platforms.includes("WEB")) return false;
    return Boolean(String(alert.message || "").trim());
  };

  // Calculate today's appointments count
  const getTodayAppointmentsCount = (appointments) => {
    if (!appointments || appointments.length === 0) return 0;

    const todayString = getCurrentDateInSelectedTimeZone();

    const todayAppointments = appointments.filter(appointment => {
      const appointmentDateString = formatDateInputValueInSelectedTimeZone(
        appointment.appointmentDate,
        { fallback: '' }
      );
      return appointmentDateString === todayString;
    });

    return todayAppointments.length;
  };

  // Keep today's count in sync with already-loaded appointments data.
  const updateTodayAppointmentsCount = useCallback(() => {
    const todayCount = getTodayAppointmentsCount(appointments);
    setDashboardData((prev) => ({
      ...prev,
      todayAppointments: todayCount,
    }));
  }, [appointments]);

  const loadPublicDashboardContent = useCallback(async () => {
    if (publicContentLoadInFlightRef.current) return;
    publicContentLoadInFlightRef.current = true;
    try {
      const [adsResponse, configResponse] = await Promise.all([
        fetch(`${API_BASE}/public/ads?placement=${encodeURIComponent("WEB_LANDING")}`, {
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch(`${API_BASE}/public/ui-config`, {
          headers: { 'Content-Type': 'application/json' }
        })
      ]);

      if (adsResponse.ok) {
        const adsData = await adsResponse.json();
        const ads = Array.isArray(adsData?.ads) ? adsData.ads : [];
        setPublicAds(ads);
      }

      if (configResponse.ok) {
        const configData = await configResponse.json();
        const rawAlerts = Array.isArray(configData?.config?.dashboardAlerts)
          ? configData.config.dashboardAlerts
          : [];
        const filteredAlerts = rawAlerts
          .filter(isAlertActive)
          .sort((left, right) => {
            const a = new Date(left?.createdAt || left?.startAt || 0).getTime();
            const b = new Date(right?.createdAt || right?.startAt || 0).getTime();
            return b - a;
          });
        setPublicAlerts(filteredAlerts);
      }
    } catch (error) {
      console.error("❌ Failed to load public dashboard content:", error);
    } finally {
      publicContentLoadInFlightRef.current = false;
    }
  }, []);

  const handlePublicAdClick = async (ad) => {
    const fallbackUrl = String(ad?.redirectUrl || "").trim();
    if (!fallbackUrl) return;

    let targetUrl = fallbackUrl;
    const adId = String(ad?._id || ad?.id || "").trim();
    if (adId) {
      let userId = "";
      let userType = "";
      try {
        const rawUser = localStorage.getItem("user");
        if (rawUser) {
          const parsed = JSON.parse(rawUser);
          userId = String(parsed?.id || parsed?._id || "").trim();
        }
      } catch {
        userId = "";
      }
      userType = String(localStorage.getItem("role") || "").trim();
      const trackedUrl = await fetchTrackedAdUrl({
        adId,
        platform: "web",
        surface: "WEB_LANDING",
        userId,
        userType,
        sourceApp: "healthvault_web_dashboard",
      });
      if (trackedUrl) {
        targetUrl = trackedUrl;
      }
    }

    window.open(targetUrl, "_blank", "noopener,noreferrer");
  };


  // Load dashboard data from doctor's active sessions and history
  const loadDashboardData = async (isRefresh = false) => {
    if (dashboardLoadInFlightRef.current) return;
    dashboardLoadInFlightRef.current = true;
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setAppointmentsLoading(true);

      const token = localStorage.getItem('token');
      if (!token) throw new Error('Please log in as a doctor');

      // Fetch active sessions and ALL sessions for history
      let sessionsRes, allSessionsRes, appointmentsRes;

      try {
        [sessionsRes, allSessionsRes, appointmentsRes] = await Promise.all([
          fetch(`${API_BASE}/sessions/mine`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${API_BASE}/sessions/history`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${API_BASE}/appointments`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
      } catch (networkError) {
        console.warn('📡 Network error during dashboard load');
        sessionsRes = { ok: false };
        allSessionsRes = { ok: false };
        appointmentsRes = { ok: false };
      }

      if (!sessionsRes.ok) throw new Error('Failed to load active sessions');

      const sessionsData = await sessionsRes.json();
      const activeSessions = sessionsData.success ? (sessionsData.patients || []) : [];

      // Handle all sessions history
      let historyItems = [];
      if (allSessionsRes.ok) {
        const allSessionsData = await allSessionsRes.json();
        historyItems = allSessionsData.history || [];
      }

      // Calculate statistics
      // Unique patients across all history and active sessions
      const allPatientIds = new Set([
        ...activeSessions.map(p => p.id),
        ...historyItems.map(p => p.id)
      ]);
      const totalPatients = allPatientIds.size;
      const expiringSoon = activeSessions.filter(p => p.isExpiringSoon).length;
      // ACTUAL APPROVED SCANS: total active + completed/expired history (meaning they were approved)
      const approvedHistoryCount = historyItems.filter(h => h.originalStatus === 'accepted' || h.originalStatus === 'ended' || h.status === 'completed' || h.status === 'expired').length;
      const recentScans = activeSessions.length + approvedHistoryCount;

      // Generate real recent activity from session history
      const recentActivity = historyItems.slice(0, 5).map((item, index) => {
        let type = 'scan';
        if (item.status === 'completed') type = 'record';
        if (item.status === 'declined' || item.status === 'expired') type = 'alert';

        let message = 'Session update';
        if (item.status === 'completed') message = 'Session completed';
        if (item.status === 'declined') message = 'Session declined';
        if (item.status === 'expired') message = 'Session expired';

        return {
          id: item.sessionId || index,
          type: type,
          message: message,
          patient: item.name || 'Unknown Patient',
          time: item.date === new Date().toLocaleDateString() ? item.time : item.date
        };
      });

      // Calculate today's appointments and set appointments state
      let todayAppointmentsCount = 0;
      if (appointmentsRes.ok) {
        const appointmentsData = await appointmentsRes.json();
        if (appointmentsData.success && appointmentsData.appointments) {
          todayAppointmentsCount = getTodayAppointmentsCount(appointmentsData.appointments);
          setAppointments(appointmentsData.appointments);
        }
      }
      setAppointmentsLoading(false);

      setDashboardData({
        totalPatients,
        recentScans,
        todayAppointments: todayAppointmentsCount,
        criticalPatients: expiringSoon,
        recentActivity
      });

    } catch (error) {
      console.error('❌ Dashboard - Error loading data:', error);
      // Minimal fallback to avoid total blank screen
      setDashboardData(prev => ({
        ...prev,
        totalPatients: prev.totalPatients || 0,
        recentActivity: prev.recentActivity.length > 0 ? prev.recentActivity : []
      }));
      setAppointmentsLoading(false);
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
      dashboardLoadInFlightRef.current = false;
    }
  };

  // Load dashboard data on component mount
  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    loadPublicDashboardContent();
  }, [loadPublicDashboardContent]);

  useEffect(() => {
    if (publicAds.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setPublicAdIndex((prev) => (prev + 1) % publicAds.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [publicAds.length]);

  useEffect(() => {
    if (publicAds.length === 0 && publicAdIndex !== 0) {
      setPublicAdIndex(0);
      return;
    }
    if (publicAds.length > 0 && publicAdIndex >= publicAds.length) {
      setPublicAdIndex(0);
    }
  }, [publicAdIndex, publicAds.length]);

  usePublicConfigRealtime({
    platform: "WEB",
    surface: "WEB_LANDING",
    onEvent: (event) => {
      if (
        event.type === "ads.updated" ||
        event.type === "alerts.updated" ||
        event.type === "ui-config.updated"
      ) {
        const now = Date.now();
        if (now - lastRealtimeRefreshRef.current < 1000) return;
        lastRealtimeRefreshRef.current = now;
        loadPublicDashboardContent();
      }
    },
  });

  useEffect(() => {
    updateTodayAppointmentsCount();
  }, [updateTodayAppointmentsCount]);

  // Refresh dashboard data
  const handleRefresh = () => {
    loadDashboardData(true);
    loadPublicDashboardContent();
  };

  const activePublicAd =
    publicAds.length > 0 ? publicAds[publicAdIndex % publicAds.length] : null;
  const alertTickerText = publicAlerts
    .map((alert) => String(alert?.message || "").trim())
    .filter(Boolean)
    .join("   •   ");

  return (
    <>
      {(publicAlerts.length > 0 || activePublicAd) && (
        <div className="space-y-3 mb-5">
          {publicAlerts.length > 0 && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 shadow-sm dark:border-rose-800/40 dark:bg-rose-900/20">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center dark:bg-rose-900/40 dark:text-rose-300">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="overflow-hidden">
                   <p className="text-[10px] font-bold uppercase tracking-widest text-rose-600 dark:text-rose-300">
                    Live Alerts
                  </p>
                  <p className="text-sm font-semibold text-rose-700 dark:text-rose-100 whitespace-nowrap overflow-hidden text-ellipsis">
                    {alertTickerText}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activePublicAd && (
            <button
              type="button"
              onClick={() => handlePublicAdClick(activePublicAd)}
              className="w-full overflow-hidden rounded-2xl border border-cyan-100 bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20 transition hover:opacity-95"
            >
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <Shield className="h-5 w-5" />
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100">
                    Sponsored
                  </p>
                  <p className="truncate text-base font-bold">
                    {String(activePublicAd.title || "Medical Vault Update")}
                  </p>
                  <p className="truncate text-xs text-cyan-50/90">
                    {String(activePublicAd.redirectUrl || "Tap to open")}
                  </p>
                </div>
                {publicAds.length > 1 && (
                  <span className="ml-auto rounded-full bg-white/15 px-2 py-1 text-[10px] font-black tracking-wider">
                    {publicAdIndex + 1}/{publicAds.length}
                  </span>
                )}
              </div>
            </button>
          )}
        </div>
      )}

      {/* Dashboard Content */}
      {user?.role === 'patient' ? (
        <PatientDashboard />
      ) : (
        <div className="space-y-6">
          {/* Welcome Section */}
          <div className="relative overflow-hidden bg-white dark:bg-white/5 dark:backdrop-blur-md p-8 rounded-[16px] shadow-sm border border-gray-200 dark:border-white/10 mb-6 group transition-all duration-500 hover:bg-white/5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="max-w-2xl">
                <div className="flex items-center space-x-5 mb-2">
                  <div className="relative p-3 bg-slate-50 dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 group-hover:scale-110 transition-all duration-300 shrink-0">
                    <Stethoscope className="h-6 w-6 text-primary" />
                    <div className="absolute -top-1 -right-1 h-2 w-2 bg-emerald-500 rounded-full border-2 border-white dark:border-[#121212] animate-pulse"></div>
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Welcome back, <span className="text-primary">Dr. {user?.name?.split(' ')[1] || user?.name || 'Physician'}</span>!
                  </h2>
                </div>
                <p className="text-[11px] md:text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest opacity-80">
                  Secure management of clinical records
                </p>
              </div>
              <div className="flex items-center">
                <button
                  onClick={() => navigate('/scan')}
                  className="group relative flex items-center gap-3 bg-primary text-white px-7 py-3.5 rounded-xl hover:opacity-90 transition-all duration-300 shadow-lg shadow-primary/20 font-bold active:scale-95 overflow-hidden"
                >
                  <div className="absolute inset-0 w-[40px] h-full bg-white/20 -skew-x-[20deg] -translate-x-[100px] group-hover:translate-x-[300px] transition-transform duration-700 ease-in-out"></div>
                  <QrCode className="h-5 w-5" />
                  Scan Patient QR
                </button>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12 bg-white/70 dark:bg-white/5 backdrop-blur-md rounded-xl shadow-sm border border-white/50 dark:border-white/10">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-300">Loading dashboard data...</span>
            </div>
          )}

          {/* Dashboard Content */}
          {!loading && (
            <>
              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <StatCard
                  label="Total Patients"
                  value={dashboardData.totalPatients}
                  icon={Users}
                  color="blue"
                  trend=""
                  subtitle="Total unique patients"
                />
                <StatCard
                  label="Approved Scans"
                  value={dashboardData.recentScans}
                  icon={QrCode}
                  color="emerald"
                  trend=""
                  subtitle="Active sessions"
                />
                <div
                  className="cursor-pointer"
                  onClick={() => {
                    if (dashboardData.todayAppointments > 0) {
                      setShowAppointments(true);
                    }
                  }}
                >
                  <StatCard
                    label="Today's Visits"
                    value={dashboardData.todayAppointments}
                    icon={Calendar}
                    color="violet"
                    badge="Today"
                    subtitle="Scheduled visits"
                  />
                </div>
                <StatCard
                  label="Expiring Soon"
                  value={dashboardData.criticalPatients}
                  icon={AlertTriangle}
                  color="rose"
                  badge="Alert"
                  subtitle="Attention needed"
                />
              </div>

              {/* Main Dashboard Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
                {/* Quick Actions - LEFT SUBGRID */}
                <div className="lg:col-span-5 space-y-6">
                  <div className="bg-white dark:bg-white/5 dark:backdrop-blur-md p-7 rounded-[16px] shadow-sm border border-gray-200 dark:border-white/10">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="h-9 w-9 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
                        <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">Quick Actions</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-6">
                      <button
                        onClick={() => navigate('/scan')}
                        className="group relative w-full flex items-center p-5 rounded-[16px] bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 shadow-[0_4_12px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300"
                      >
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
                          <QrCode className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="ml-4 text-left">
                          <span className="text-base font-bold text-slate-900 dark:text-white block">Scan Patient QR</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Access patient records quickly</span>
                        </div>
                        <div className="ml-auto p-2 bg-slate-50 dark:bg-slate-800 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                          <ArrowRight className="h-4 w-4" />
                        </div>
                      </button>

                      <button
                        onClick={() => navigate('/patients')}
                        className="group relative w-full flex items-center p-5 rounded-[16px] bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 shadow-[0_4_12px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300"
                      >
                        <div className="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
                          <Users className="h-6 w-6 text-teal-600" />
                        </div>
                        <div className="ml-4 text-left">
                          <span className="text-base font-bold text-slate-900 dark:text-white block">View Active Session</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Manage patient sessions</span>
                        </div>
                        <div className="ml-auto p-2 bg-slate-50 dark:bg-slate-800 rounded-lg group-hover:bg-teal-600 group-hover:text-white transition-all duration-300">
                          <ArrowRight className="h-4 w-4" />
                        </div>
                      </button>

                      <button
                        onClick={() => setShowAppointments(true)}
                        className="group relative w-full flex items-center p-5 rounded-[16px] bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300"
                      >
                        <div className="p-3 bg-violet-50 dark:bg-violet-900/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
                          <Calendar className="h-6 w-6 text-violet-600" />
                        </div>
                        <div className="ml-4 text-left">
                          <span className="text-base font-bold text-slate-900 dark:text-white block">View Appointments</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Check your clinical schedule</span>
                        </div>
                        <div className="ml-auto p-2 bg-slate-50 dark:bg-white/5 rounded-lg group-hover:bg-violet-600 group-hover:text-white transition-all duration-300">
                          <ArrowRight className="h-4 w-4" />
                        </div>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Recent Activity - RIGHT SUBGRID */}
                <div className="lg:col-span-7">
                  <div className="bg-white dark:bg-white/5 dark:backdrop-blur-md p-7 rounded-[16px] shadow-sm border border-gray-200 dark:border-white/10 h-full">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-3">
                        <div className="h-9 w-9 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20">
                          <History className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent Activity</h3>
                      </div>
                      <button
                        onClick={handleRefresh}
                        className="p-2.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all active:scale-95 border border-transparent hover:border-blue-100/50"
                        aria-label="Refresh History"
                      >
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                      </button>
                    </div>

                    <div className="relative mt-2 px-1">
                      {/* Continuous Vertical Line */}
                      <div className="absolute left-[21px] top-0 bottom-0 w-[2px] bg-slate-100 dark:bg-white/5 z-0"></div>

                      <div className="space-y-0 relative z-10">
                        {dashboardData.recentActivity.length > 0 ? (
                          dashboardData.recentActivity.map((activity, index) => (
                            <ActivityItem
                              key={activity.id}
                              color={activity.type === 'alert' ? 'red' : activity.type === 'record' ? 'green' : 'blue'}
                              title={activity.message}
                              subtitle={`${activity.patient} • ${activity.time}`}
                              icon={activity.type === 'alert' ? AlertTriangle : activity.type === 'record' ? FileText : QrCode}
                              isLast={index === dashboardData.recentActivity.length - 1}
                            />
                          ))
                        ) : (
                          <div className="py-12 flex flex-col items-center justify-center text-center">
                            <div className="p-5 bg-gray-50 dark:bg-white/5 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 mb-4 scale-animation">
                              <Activity className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                            </div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">No recent history</p>
                            <p className="text-xs text-gray-500 max-w-[200px] leading-relaxed">System activity and patient interactions will appear here.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Appointments List Modal */}
      {
        showAppointments && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAppointments(false)} />
            <div className="relative w-full max-w-4xl bg-white dark:bg-[#1F1F1F] rounded-[24px] shadow-2xl border border-transparent dark:border-white/5 overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-white/5 shrink-0">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                    <Calendar className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">My Appointments</h3>
                    <p className="text-sm text-slate-500 font-medium">Dr. {user?.name?.split(' ')[1] || user?.name || 'Physician'}'s clinical schedule</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAppointments(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors"
                  aria-label="Close modal"
                >
                  <X className="h-6 w-6 text-gray-400" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {appointmentsLoading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Loading clinical schedule...</p>
                  </div>
                ) : appointments.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {appointments.sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate)).map((apt) => (
                      <div
                        key={apt._id}
                        className="group bg-slate-50 dark:bg-white/5 rounded-2xl p-5 border border-transparent hover:border-blue-200 dark:hover:border-blue-900/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5 hover:-translate-y-1"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 bg-white dark:bg-[#1C1C1C] rounded-xl flex items-center justify-center shadow-sm font-bold text-blue-600">
                              {apt.patientName?.charAt(0) || 'P'}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900 dark:text-white leading-none">{apt.patientName}</h4>
                              <div className="flex items-center mt-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                <span className={`px-2 py-0.5 rounded-full ${apt.appointmentType === 'emergency' ? 'bg-rose-100 text-rose-600' :
                                  apt.appointmentType === 'follow-up' ? 'bg-violet-100 text-violet-600' :
                                    'bg-emerald-100 text-emerald-600'
                                  }`}>
                                  {apt.appointmentType}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="px-3 py-1 bg-blue-50 dark:bg-blue-900/40 rounded-full">
                            <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Status: {apt.status || 'scheduled'}</span>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center text-sm text-slate-600 dark:text-slate-300">
                            <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center mr-3 shrink-0">
                              <Calendar className="h-4 w-4 text-slate-500" />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date & Time</p>
                              <p className="font-semibold text-slate-800 dark:text-slate-200">
                                {new Date(apt.appointmentDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} • {apt.appointmentTime}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center text-sm text-slate-600 dark:text-slate-300">
                              <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center mr-3 shrink-0">
                                <Clock className="h-4 w-4 text-slate-500" />
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Duration</p>
                                <p className="font-semibold text-slate-800 dark:text-slate-200">{apt.duration} minutes</p>
                              </div>
                            </div>
                            <div className="flex items-center text-sm text-slate-600 dark:text-slate-300">
                              <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center mr-3 shrink-0">
                                <FileText className="h-4 w-4 text-slate-500" />
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reason</p>
                                <p className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[100px]">{apt.reason}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 flex items-center justify-end">
                          <button
                            onClick={() => navigate(`/patient-details/${apt.patientId}`)}
                            className="text-[11px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest flex items-center gap-1 group/btn"
                          >
                            View Patient <ArrowRight className="h-3 w-3 transition-transform group-hover/btn:translate-x-1" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 bg-slate-50 dark:bg-white/5 rounded-3xl border-2 border-dashed border-slate-200 dark:border-white/10">
                    <div className="p-5 bg-white dark:bg-[#1C1C1C] rounded-2xl shadow-sm mb-4">
                      <Calendar className="h-10 w-10 text-slate-300" />
                    </div>
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2 underline decoration-blue-500/30">No Appointments Found</h4>
                    <p className="text-sm text-slate-500 font-medium max-w-xs text-center leading-relaxed">You don't have any appointments scheduled for the upcoming days.</p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 bg-slate-50 dark:bg-white/5 border-t border-gray-100 dark:border-white/5 flex justify-between items-center shrink-0">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Total Appointments: <span className="text-slate-900 dark:text-white">{appointments.length}</span>
                </p>
                <button
                  onClick={() => setShowAppointments(false)}
                  className="px-6 py-2.5 bg-slate-900 dark:bg-white dark:text-slate-900 text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg"
                >
                  Close Schedule
                </button>
              </div>
            </div>
          </div>
        )
      }
    </>
  );
};

export default Dashboard;

/* ----------------------
 * Helper Components
 * --------------------*/
const ActivityItem = ({ color, title, subtitle, icon: Icon, isLast }) => (
  <div className={`relative group flex items-start space-x-4 p-4 transition-all duration-300 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 rounded-2xl ${!isLast ? 'border-b border-slate-50 dark:border-slate-800/30' : ''}`}>
    {/* Status Point (Circle Icon) */}
    <div className={`relative z-10 shrink-0 h-9 w-9 rounded-full flex items-center justify-center shadow-sm border-4 border-white dark:border-slate-900 group-hover:scale-110 transition-transform duration-300 ${color === 'blue' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' :
      color === 'green' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' :
        color === 'red' ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400' :
          'bg-purple-50 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400'
      }`}>
      <Icon className="h-4 w-4" />
    </div>

    {/* Content */}
    <div className="flex-1 min-w-0 pt-1">
      <div className="flex flex-col">
        <h4 className="text-[13px] font-bold text-slate-900 dark:text-white leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {title}
        </h4>
        <div className="flex items-center mt-1.5 space-x-2">
          <div className={`h-1.5 w-1.5 rounded-full ${color === 'blue' ? 'bg-blue-400' : color === 'green' ? 'bg-emerald-400' : color === 'red' ? 'bg-rose-400' : 'bg-purple-400'}`} />
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium tracking-wide uppercase">{subtitle}</p>
        </div>
      </div>
    </div>

    {/* Hover Arrow Indicator */}
    <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0 pt-1">
      <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
    </div>
  </div>
);

const AnimatedCounter = ({ value, duration = 1500 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime;
    let animationFrame;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);

      // Easing function (easeOutExpo)
      const easeValue = percentage === 1 ? 1 : 1 - Math.pow(2, -10 * percentage);

      setCount(Math.floor(easeValue * value));

      if (percentage < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return <span>{count}</span>;
};

const StatCard = ({ label, value, icon: Icon, color, trend, badge, subtitle }) => {
  const colors = {
    blue: "text-primary bg-primary/10 dark:bg-primary/20 dark:text-primary",
    emerald: "text-teal-600 bg-teal-50 dark:bg-teal-900/40 dark:text-teal-400",
    violet: "text-primary bg-primary/10 dark:bg-primary/20 dark:text-primary",
    rose: "text-rose-600 bg-rose-50 dark:bg-rose-900/40 dark:text-rose-400"
  };

  return (
    <div className="group relative bg-white dark:bg-white/5 dark:backdrop-blur-md p-5 rounded-[16px] border border-gray-200 dark:border-white/10 shadow-sm hover:bg-white/10 hover:-translate-y-1.5 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] overflow-hidden">
      <div className="flex items-center space-x-5 relative z-10">
        {/* Icon Container */}
        <div className={`h-14 w-14 rounded-xl ${colors[color]} flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-sm shrink-0`}>
          <Icon className="h-6 w-6" />
        </div>

        {/* Content Container */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
            {trend && (
              <div className="flex items-center space-x-1 px-2 py-0.5 bg-emerald-500/10 rounded-full shrink-0">
                <TrendingUp className="h-2.5 w-2.5 text-emerald-500" />
                <span className="text-[10px] font-bold text-emerald-500">{trend}</span>
              </div>
            )}
            {badge && (
              <span className={`text-[10px] font-bold uppercase tracking-wider ${colors[color].split(' ')[0]} bg-opacity-20 px-2.5 py-0.5 rounded-full shrink-0`}>
                {badge}
              </span>
            )}
          </div>

          <div className="flex items-baseline space-x-1">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              <AnimatedCounter value={value} />
            </h3>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-1 opacity-80 truncate">
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
};
