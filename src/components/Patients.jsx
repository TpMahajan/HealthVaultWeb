import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, User, Eye, Loader, History, Activity, Shield, Plus,
  Trash2, Mail, ExternalLink, Calendar, ChevronRight, Filter,
  MoreVertical, CheckCircle, Clock, UserCircle, AlertCircle, X
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
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center font-inter">
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
    <div className="min-h-screen bg-[#F5F7FB] dark:bg-[#0A0A0A] font-inter selection:bg-primary/10 selection:text-primary pb-20">

      {/* Session Ended Popup */}
      {showSessionEndedPopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <div className="flex items-start gap-4 mb-4">
              <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
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

      <div className="max-w-7xl mx-auto px-6 lg:px-10 relative pt-10">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-[32px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight mb-1">
              Active Session
            </h1>
            <p className="text-[#6B7280] dark:text-slate-400 font-medium text-sm">
              View and manage patients who are currently in a live session.
            </p>
          </div>

          <div className="flex p-1 bg-[#F1F5F9] dark:bg-white/5 rounded-xl self-start md:self-auto">
            <button
              onClick={() => setViewMode('active')}
              className={`flex items-center gap-2 px-6 py-2 rounded-[10px] text-[11px] font-black uppercase tracking-wider transition-all duration-300 ${viewMode === 'active'
                ? 'bg-white dark:bg-white/10 text-primary shadow-[0_2px_6px_rgba(0,0,0,0.05)]'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
            >
              <Activity className="h-3.5 w-3.5" />
              Active
            </button>
            <button
              onClick={() => setViewMode('history')}
              className={`flex items-center gap-2 px-6 py-2 rounded-[10px] text-[11px] font-black uppercase tracking-wider transition-all duration-300 ${viewMode === 'history'
                ? 'bg-white dark:bg-white/10 text-primary shadow-[0_2px_6px_rgba(0,0,0,0.05)]'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
            >
              <History className="h-3.5 w-3.5" />
              History
            </button>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Active Sessions', val: activeSessions.length, icon: Activity, color: 'text-primary' },
            { label: 'Total Sessions Today', val: previousSessions.length, icon: Clock, color: 'text-blue-500' },
            { label: 'Average Duration', val: '18m', icon: Shield, color: 'text-emerald-500' }
          ].map((stat, i) => (
            <div key={i} className="bg-white dark:bg-[#121212] p-5 rounded-[16px] border border-[#E5E7EB] dark:border-white/5 shadow-[0_4px_12px_rgba(0,0,0,0.04)] flex items-center justify-between group hover:shadow-md transition-all">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{stat.val}</p>
              </div>
              <div className={`h-11 w-11 rounded-[12px] bg-slate-50 dark:bg-white/5 flex items-center justify-center ${stat.color} transition-colors`}>
                <stat.icon className="h-5.5 w-5.5" />
              </div>
            </div>
          ))}
        </div>

        {/* Command Bar / Toolbar */}
        <div className="mb-8 p-1 bg-white dark:bg-[#121212] border border-[#E5E7EB] dark:border-white/5 rounded-full shadow-sm flex flex-col md:flex-row items-center gap-3 doctor-focus-ring">
          {/* Search Input */}
          <div className="flex-1 w-full relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search for a patient..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-11 pl-12 pr-4 bg-transparent text-sm font-medium text-slate-700 dark:text-white focus:outline-none placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto px-1">
            <div className="hidden md:flex items-center gap-5 px-5 border-r border-slate-100 dark:border-white/5 h-8">
               <div className="flex flex-col items-center">
                  <span className="text-[10px] font-black text-slate-400 leading-none">TOTAL</span>
                  <span className="text-xs font-black text-slate-900 dark:text-white">{patients.active?.length + patients.history?.length}</span>
               </div>
               <div className="flex flex-col items-center">
                  <span className="text-[10px] font-black text-slate-400 leading-none">ACTIVE</span>
                  <span className="text-xs font-black text-emerald-500">{patients.active?.length}</span>
               </div>
            </div>

            <button
              onClick={() => navigate('/scan')}
              className="flex-1 md:flex-none h-[44px] px-6 bg-[#0F172A] dark:bg-white text-white dark:text-black rounded-full text-[11px] font-bold uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
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
                <div className="flex flex-col items-center justify-center py-10">
                  <div className="bg-white dark:bg-[#121212] border border-dashed border-[#D1D5DB] dark:border-white/10 rounded-[16px] p-8 max-w-[520px] w-full text-center shadow-sm">
                    <div className="h-14 w-14 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-5 rotate-3 group-hover:rotate-0 transition-transform">
                      <UserCircle className="h-7 w-7 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Active Sessions</h3>
                    <p className="text-sm font-medium text-slate-400 dark:text-slate-500 mb-8 px-4">
                      No active sessions currently running. Initiate a new session to begin diagnosing patients.
                    </p>
                    <button
                      onClick={() => navigate('/scan')}
                      className="inline-flex items-center gap-2.5 px-6 py-3 bg-[#0F172A] dark:bg-white text-white dark:text-black rounded-xl text-xs font-black uppercase tracking-widest hover:shadow-lg transition-all active:scale-95"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Start New Session
                    </button>
                  </div>
                </div>
              ) : (
                activeSessions.map((patient) => (
                  <div
                    key={patient.sessionId}
                    className="group bg-white dark:bg-[#121212] rounded-[16px] p-5 border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200"
                  >
                    <div className="flex items-center gap-4">

                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <img
                          src={`https://ui-avatars.com/api/?name=${patient.name.replace(' ', '+')}&background=random&color=fff&bold=true`}
                          alt={patient.name}
                          className="h-12 w-12 rounded-full object-cover border border-slate-100 shadow-sm"
                        />
                        <div className="absolute -bottom-1 -right-1 bg-emerald-500 border-[3px] border-white rounded-full p-0.5">
                          <Activity className="h-2 w-2 text-white" />
                        </div>
                      </div>

                      {/* Main Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="text-base font-bold text-slate-900 truncate group-hover:text-primary transition-colors">
                            {patient.name}
                          </h3>
                          <span className="shrink-0 px-2 py-0.5 bg-primary-50 text-primary text-[9px] font-black uppercase tracking-wider rounded-md">
                            Active
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                          <span>ID: <span className="font-mono text-slate-400">{patient.id.slice(0, 8)}</span></span>
                          <span className="w-1 h-1 rounded-full bg-slate-300" />
                          <span className="truncate max-w-[150px]">{patient.email}</span>
                        </div>
                      </div>



                      {/* Actions */}
                      <div className="flex items-center gap-2 pl-4 border-l border-slate-100 md:border-0">
                        <div className="flex items-center gap-3">
                          <SessionTimer expiresAt={patient.expiresAt || patient.expiryTime} />
                          <button
                            onClick={() => handleViewDetails(patient)}
                            className="h-9 px-4 bg-white border border-slate-200 hover:border-primary/50 hover:text-primary text-slate-600 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all shadow-sm flex items-center gap-2 group-hover:bg-primary-50"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">View</span>
                          </button>
                        </div>
                        <button
                          onClick={() => handleDeleteSession(patient)}
                          className="h-9 w-9 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 border border-transparent rounded-lg transition-all"
                          title="End Session"
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
            <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100">
                      <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient Identity</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Clinical Timestamp</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Session Duration</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
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
                        <tr key={session.sessionId || session.patient_id} className="group hover:bg-primary-50 transition-colors">
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center border border-white shadow-sm font-bold text-slate-500 text-xs">
                                {session.name.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors">{session.name}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">REF: {session.id?.slice(-8) || session.patient_id?.slice(-8)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3.5 w-3.5 text-slate-400" />
                              <span className="text-xs font-bold text-slate-600">
                                {new Date(session.createdAt || (session.sessions && session.sessions[0]?.visit_date)).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-2">
                              <Clock className="h-3.5 w-3.5 text-slate-400" />
                              <span className="text-xs font-bold text-slate-600">
                                {session.duration || '15'}m
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-5 text-right">
                            <button
                              onClick={() => handleViewDetails(session)}
                              className="inline-flex items-center gap-2 text-[10px] font-black text-primary hover:opacity-80 uppercase tracking-widest bg-primary-50 hover:bg-primary/20 px-4 py-2 rounded-lg transition-all"
                            >
                              Open Dossier <ExternalLink className="h-3 w-3" />
                            </button>
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500">
            <div className="bg-[#F1F5F9] px-8 py-6 flex items-center justify-between border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-100 rounded-xl">
                  <Trash2 className="h-5 w-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Finish Session</h3>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Enter patient details</p>
                </div>
              </div>
              <button
                onClick={() => setIsEndModalOpen(false)}
                className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="flex items-center gap-4 p-4 bg-primary-50 rounded-2xl border border-primary/10">
                <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center border-2 border-primary/20 font-bold text-primary text-lg shadow-sm">
                  {sessionToEnd?.name?.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{sessionToEnd?.name}</p>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Patient</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Disease Name</label>
                  <textarea
                    value={modalDiagnosis}
                    onChange={(e) => setModalDiagnosis(e.target.value)}
                    placeholder="Enter disease or health issue"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all resize-none h-24"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Extra Notes</label>
                  <textarea
                    value={modalNotes}
                    onChange={(e) => setModalNotes(e.target.value)}
                    placeholder="Add any extra details or advice here..."
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all resize-none h-32"
                  />
                </div>
              </div>
            </div>

            <div className="px-8 py-6 bg-[#F1F5F9] border-t border-slate-200 flex gap-4">
              <button
                onClick={() => setIsEndModalOpen(false)}
                className="flex-1 px-6 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl text-sm font-bold hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmEndSession}
                disabled={isEnding}
                className="flex-1 px-6 py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-sm font-bold shadow-lg shadow-rose-200 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEnding ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    <span>Ending...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>Save & Finish</span>
                  </>
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