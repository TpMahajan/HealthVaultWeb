import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, User, Eye, Loader, History, Activity, Shield, Plus,
  Trash2, Mail, ExternalLink, Calendar, ChevronRight, Filter,
  MoreVertical, Clock, UserCircle, AlertCircle, X, Edit2
} from 'lucide-react';
import { API_BASE } from '../constants/api';
import { useAuth } from '../context/AuthContext';

const Patients = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [patients, setPatients] = useState({ active: [], history: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('active'); // 'active' or 'history'
  const [showSessionEndedPopup, setShowSessionEndedPopup] = useState(false);
  const [endedSessionsCount, setEndedSessionsCount] = useState(0);
  const [activeMenu, setActiveMenu] = useState(null);

  // End Session Modal States
  const [isEndModalOpen, setIsEndModalOpen] = useState(false);
  const [sessionToEnd, setSessionToEnd] = useState(null);
  const [modalDiagnosis, setModalDiagnosis] = useState('');
  const [modalNotes, setModalNotes] = useState('');
  const [isEnding, setIsEnding] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const loadDoctorPatients = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('token');
        if (!token) {
          setError('Please log in as a doctor to view patients');
          setLoading(false);
          return;
        }

        const [sessionRes, historyRes] = await Promise.all([
          fetch(`${API_BASE}/sessions/mine`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${API_BASE}/sessions/history`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        if (!sessionRes.ok) {
          throw new Error(`Failed to fetch active sessions (${sessionRes.status})`);
        }

        let historyList = [];
        if (historyRes.ok) {
          const historyData = await historyRes.json();
          historyList = historyData.data || historyData.history || [];
        }

        const sessionData = await sessionRes.json();
        let activeList = sessionData.success ? (sessionData.patients || []) : [];

        setPatients({
          active: activeList,
          history: historyList
        });

      } catch (error) {
        console.error('❌ Error loading patients:', error);
        setError(error.message || 'Failed to load patients.');
      } finally {
        setLoading(false);
      }
    };

    loadDoctorPatients();
  }, []);

  // Monitor doctor's active status
  useEffect(() => {
    if (user?.isActive === false && patients.active.length > 0) {
      // Doctor went inactive, clear active sessions
      const count = patients.active.length;
      setEndedSessionsCount(count);
      setShowSessionEndedPopup(true);

      // Move all active sessions to history
      setPatients(prev => ({
        active: [],
        history: [
          ...prev.active.map(p => ({
            ...p,
            status: 'ended',
            notes: 'Session ended automatically: Doctor profile deactivated.'
          })),
          ...prev.history
        ]
      }));
    }
  }, [user?.isActive]);

  const filterBySearch = (list) => {
    if (!list) return [];
    return list.filter(patient =>
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (patient.id && patient.id.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  const activeSessions = filterBySearch(patients.active || []);

  const previousSessions = filterBySearch(patients.history || []).filter(session => {
    const sessionDate = new Date(session.createdAt || (session.sessions && session.sessions[0]?.visit_date));
    const today = new Date();
    return (
      sessionDate.getDate() === today.getDate() &&
      sessionDate.getMonth() === today.getMonth() &&
      sessionDate.getFullYear() === today.getFullYear()
    );
  });

  const handleViewDetails = (patient) => {
    navigate(`/patient-details/${patient.id}`);
  };

  const handleDeleteSession = (patient) => {
    setSessionToEnd(patient);
    setModalDiagnosis('');
    setModalNotes('');
    setIsEndModalOpen(true);
  };

  const handleEditPatient = (patient) => {
    navigate('/patients');
  };

  const handleDeletePatientHistory = async (session) => {
    if (!window.confirm('Are you sure you want to delete this session record?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/sessions/history/${session.sessionId || session.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setPatients(prev => ({
          ...prev,
          history: prev.history.filter(s => (s.sessionId || s.id) !== (session.sessionId || session.id))
        }));
      }
    } catch (err) {
      console.error('Error deleting session history:', err);
    }
  };

  const confirmEndSession = async () => {
    if (!sessionToEnd) return;

    setIsEnding(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/sessions/end/${sessionToEnd.sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          diagnosis: modalDiagnosis || 'Standard Checkup',
          notes: modalNotes || 'Session ended by doctor.'
        })
      });

      if (response.ok) {
        setPatients(prev => ({
          active: prev.active.filter(p => p.sessionId !== sessionToEnd.sessionId),
          history: [
            {
              ...sessionToEnd,
              status: 'completed',
              diagnosis: modalDiagnosis || 'Standard Checkup',
              notes: modalNotes || 'Session ended by doctor.',
              createdAt: new Date()
            },
            ...(prev.history || [])
          ]
        }));
        setIsEndModalOpen(false);
      }
    } catch (e) {
      console.error('Error ending session:', e);
    } finally {
      setIsEnding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center font-inter pt-20">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-slate-100 border-t-primary animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Activity className="h-6 w-6 text-primary" />
            </div>
          </div>
          <span className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">Loading Directory...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full relative z-10 space-y-6 font-inter bg-transparent">

      {/* Session Ended Popup */}
      {showSessionEndedPopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <div className="flex items-start gap-4 mb-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-primary dark:text-primary" />
              </div>
              <div className="mt-10 flex justify-center">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  Sessions Ended
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  Your profile has been deactivated. {endedSessionsCount} active session{endedSessionsCount !== 1 ? 's have' : ' has'} been automatically ended.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Patients have been notified about the session closure.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSessionEndedPopup(false)}
                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowSessionEndedPopup(false);
                  navigate('/settings');
                }}
                className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg font-medium hover:opacity-90 transition-colors"
              >
                Go to Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Decoration */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

      <div className="w-full relative z-10 space-y-6">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Premium title card — matches KPI card design system */}
          <div
            style={{
              display: 'inline-block',
              padding: '20px 24px',
              borderRadius: 16,
              background: 'var(--card-bg)', // removed fallback to allow Tailwind classes to work correctly
              border: '1px solid rgba(0,0,0,0.05)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
              minWidth: 320,
              maxWidth: 480,
              transition: 'all 0.3s ease',
              cursor: 'default',
            }}
            className="bg-white dark:bg-white/5 dark:backdrop-blur-md dark:border-white/10 dark:shadow-none"
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.08)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              {/* Left accent bar */}
              <div
                style={{
                  width: 3,
                  minWidth: 3,
                  borderRadius: 99,
                  background: 'var(--primary-gradient, var(--primary-color, #10B981))',
                  alignSelf: 'stretch',
                  marginTop: 2,
                }}
              />
              <div>
                <h1
                  className="text-slate-900 dark:text-white tracking-wide leading-tight"
                  style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, lineHeight: 1.2 }}
                >
                  Active Session
                </h1>
                <p
                  className="text-slate-500 dark:text-gray-400 font-medium"
                  style={{ fontSize: 13.5, margin: 0, lineHeight: 1.6 }}
                >
                  View and manage patients who are currently in a live session.
                </p>
              </div>
            </div>
          </div>

          <div className="flex p-1 bg-gray-200/50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl self-start md:self-auto mb-6">
            <button
              onClick={() => setViewMode('active')}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${viewMode === 'active'
                ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <Activity className="h-4 w-4" />
              Active
            </button>
            <button
              onClick={() => setViewMode('history')}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${viewMode === 'history'
                ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <History className="h-4 w-4" />
              History
            </button>
          </div>
        </div>

        {/* Quick Stats Row */}          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            {[
              { label: 'Active Sessions', val: activeSessions.length, icon: Activity, color: 'text-primary' },
              { label: 'Total Sessions Today', val: previousSessions.length, icon: Clock, color: 'text-primary' },
              { label: 'Average Duration', val: '18m', icon: Shield, color: 'text-primary' }
            ].map((stat, i) => (
              <div key={i} className="bg-white dark:bg-white/5 dark:backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-2xl shadow-sm dark:shadow-md p-5 flex justify-between items-center group hover:bg-gray-50 dark:hover:bg-white/10 transition-all duration-300">
                <div>
                  <p className="text-slate-500 dark:text-gray-400 text-sm font-medium mb-1">{stat.label}</p>
                  <p className="text-xl font-semibold text-slate-900 dark:text-white">{stat.val}</p>
                </div>
                <div className={`h-10 w-10 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center ${stat.color} transition-colors p-2`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            ))}
          </div>

        <div className="flex items-center justify-between gap-4 mt-6">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-400" />
            <input
              type="text"
              placeholder="Search for a patient..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-11 pl-11 pr-4 bg-white/5 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-primary transition-all placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-5 px-5 border-r border-gray-200 dark:border-white/10 h-8">
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold text-slate-400 dark:text-gray-500 leading-none">TOTAL</span>
                <span className="text-xs font-semibold text-slate-900 dark:text-white">{patients.active?.length + patients.history?.length}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold text-slate-400 dark:text-gray-500 leading-none">ACTIVE</span>
                <span className="text-xs font-semibold text-primary dark:text-primary">{patients.active?.length}</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/scan')}
              className="flex-1 md:flex-none h-[40px] px-5 py-2 bg-primary text-white rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105 flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
            >
              <Plus className="h-4 w-4" />
              New Session
            </button>
          </div>
        </div>
        {/* Content Area */}
        <div className="min-h-[400px] animate-in slide-in-from-bottom-5 duration-500">
          {viewMode === 'active' ? (
            <div className="space-y-4">
              {activeSessions.length === 0 ? (
                <div className="mt-10 flex justify-center">
                  <div className="bg-white dark:bg-white/5 dark:backdrop-blur-md border border-white/10 rounded-2xl p-10 max-w-md w-full text-center shadow-lg px-6 group transition-all duration-300 hover:bg-white/10">
                    <div className="h-16 w-16 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 p-3 translate-y-2 group-hover:translate-y-0 transition-transform">
                      <UserCircle className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">No Active Sessions</h3>
                    <p className="text-sm font-medium text-slate-500 dark:text-gray-400 mt-2">
                      No active sessions currently running. Initiate a new session to begin diagnosing patients.
                    </p>
                    <button
                      onClick={() => navigate('/scan')}
                      className="mt-6 inline-flex items-center gap-2.5 px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:scale-105 transition-all duration-200 shadow-lg shadow-primary/20"
                    >
                      <Plus className="h-4 w-4" />
                      Start New Session
                    </button>
                  </div>
                </div>
              ) : (
                activeSessions.map((patient) => (
                  <div
                    key={patient.sessionId}
                    className="group bg-white dark:bg-white/5 dark:backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-sm dark:shadow-lg hover:bg-gray-50 dark:hover:bg-white/10 transition-all duration-300"
                  >
                    <div className="flex items-center gap-4">

                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <img
                          src={`https://ui-avatars.com/api/?name=${patient.name.replace(' ', '+')}&background=random&color=fff&bold=true`}
                          alt={patient.name}
                          className="h-12 w-12 rounded-full object-cover border border-slate-100 shadow-sm"
                        />
                        <div className="absolute -bottom-1 -right-1 bg-primary border-[3px] border-white rounded-full p-0.5">
                          <Activity className="h-2 w-2 text-white" />
                        </div>
                      </div>

                      {/* Main Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="text-base font-semibold text-slate-900 dark:text-white tracking-wide truncate">
                            {patient.name}
                          </h3>
                          <span className="shrink-0 px-3 py-1 bg-primary/10 text-primary dark:text-primary text-xs rounded-full">
                            Active
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-gray-500">
                          <span>ID: <span className="font-mono text-slate-400 dark:text-gray-400">{patient.id.slice(0, 8)}</span></span>
                          <span className="w-1 h-1 rounded-full bg-gray-200 dark:bg-white/10" />
                          <span className="truncate max-w-[150px]">{patient.email}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pl-4 border-l border-slate-100 md:border-0">
                        <div className="flex items-center gap-3">
                          <SessionTimer expiresAt={patient.expiresAt || patient.expiryTime} />
                          <button
                            onClick={() => handleViewDetails(patient)}
                            className="h-9 px-4 bg-gray-50 dark:bg-white/10 hover:bg-gray-100 dark:hover:bg-white/20 border border-gray-200 dark:border-white/10 text-slate-700 dark:text-white text-xs font-semibold rounded-xl transition-all duration-200 flex items-center gap-2"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">View</span>
                          </button>
                        </div>
                        <button
                          onClick={() => handleDeleteSession(patient)}
                          className="h-9 w-9 flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                          aria-label="End Session"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-white/5 dark:backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-2xl shadow-sm dark:shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50/50 dark:bg-transparent border-b border-gray-200 dark:border-white/10">
                      <th className="px-8 py-6 text-slate-500 dark:text-gray-400 text-sm font-semibold tracking-wide uppercase">Patient Identity</th>
                      <th className="px-8 py-6 text-slate-500 dark:text-gray-400 text-sm font-semibold tracking-wide uppercase">Clinical Timestamp</th>
                      <th className="px-8 py-6 text-slate-500 dark:text-gray-400 text-sm font-semibold tracking-wide uppercase">Session Duration</th>
                      <th className="px-8 py-6 text-slate-500 dark:text-gray-400 text-sm font-semibold tracking-wide uppercase text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {previousSessions.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="px-8 py-16 text-center">
                          <div className="flex flex-col items-center">
                            <div className="h-12 w-12 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                              <History className="h-6 w-6 text-slate-300" />
                            </div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">No historical records found for today</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      previousSessions.map((session) => (
                        <tr key={session.sessionId || session.patient_id} className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition duration-300">
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center border border-gray-200 dark:border-white/10 text-primary font-semibold text-sm">
                                {session.name.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">{session.name}</p>
                                <p className="text-[11px] text-slate-500 dark:text-gray-500 uppercase tracking-wider">REF: {session.id?.slice(-8) || session.patient_id?.slice(-8)}</p>
                              </div>
                            </div>
                          </td>

                          <td className="px-8 py-5">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                              <span className="text-sm text-slate-600 dark:text-gray-300">
                                {new Date(session.createdAt || (session.sessions && session.sessions[0]?.visit_date)).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-2">
                              <Clock className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                              <span className="text-sm text-slate-600 dark:text-gray-300">
                                {session.duration || '15'}m
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-5 text-right">
                            <div className="relative inline-block text-left">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenu(activeMenu === (session.sessionId || session.id) ? null : (session.sessionId || session.id));
                                }}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-all text-gray-400 dark:text-gray-500"
                              >
                                <MoreVertical className="h-5 w-5" />
                              </button>

                              {activeMenu === (session.sessionId || session.id) && (
                                <>
                                  <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setActiveMenu(null); }} />
                                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl z-20 py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleViewDetails(session);
                                        setActiveMenu(null);
                                      }}
                                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                    >
                                      <Eye className="h-4 w-4" /> View Details
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditPatient(session);
                                        setActiveMenu(null);
                                      }}
                                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                    >
                                      <Edit2 className="h-4 w-4" /> Edit Patient
                                    </button>
                                    <div className="h-px bg-gray-100 dark:bg-white/5 my-1" />
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeletePatientHistory(session);
                                        setActiveMenu(null);
                                      }}
                                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                    >
                                      <Trash2 className="h-4 w-4" /> Delete
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* End Session Modal */}
      {isEndModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 dark:bg-black/65 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-[400px] rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#151515] shadow-[0_22px_48px_rgba(15,23,42,0.26)] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-5 pt-5 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">End Session?</h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-gray-300">
                    Are you sure you want to end this session?
                  </p>
                </div>
                <button
                  onClick={() => setIsEndModalOpen(false)}
                  disabled={isEnding}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white transition-colors disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4">
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-gray-400">
                  Session Notes (Optional)
                </label>
                <textarea
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="Add diagnosis, advice, or notes..."
                  rows={4}
                  className="w-full resize-none rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-100 dark:focus:ring-red-500/20 focus:border-red-300 dark:focus:border-red-400"
                />
              </div>
            </div>

            <div className="px-5 pb-5 flex gap-3">
              <button
                onClick={() => setIsEndModalOpen(false)}
                disabled={isEnding}
                className="flex-1 h-12 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white text-sm font-bold hover:bg-slate-200 dark:hover:bg-white/20 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmEndSession}
                disabled={isEnding}
                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-white text-sm font-bold shadow-lg shadow-red-500/25 hover:brightness-105 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isEnding ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    <span>Ending...</span>
                  </>
                ) : (
                  <span>Yes, End Session</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Patients;

const SessionTimer = ({ expiresAt }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [isCritical, setIsCritical] = useState(false);

  useEffect(() => {
    if (!expiresAt) {
      setTimeLeft('15:00');
      return;
    }

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const distance = expiry - now;

      if (distance < 0) {
        setTimeLeft('00:00');
        setIsCritical(true);
        clearInterval(interval);
        return;
      }

      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      const display = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
      setTimeLeft(display);
      setIsCritical(distance < 120000);
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${isCritical
      ? 'bg-rose-50 border-rose-100 text-rose-600 animate-pulse font-bold'
      : 'bg-slate-50 border-slate-100 text-slate-500 font-medium'
      }`}>
      <Clock className="h-3.5 w-3.5" />
      <span className="text-[11px] font-mono tracking-tighter">{timeLeft}</span>
    </div>
  );
};
