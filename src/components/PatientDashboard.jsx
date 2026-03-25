import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../constants/api';
import {
    History,
    User,
    Calendar,
    Clock,
    Activity,
    CheckCircle,
    FileText,
    TrendingUp,
    ArrowRight,
    Stethoscope,
    Loader,
    Shield,
    X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Footer from './Footer';

const PatientDashboard = () => {
    const { user } = useAuth();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalVisits: 0,
        lastVisit: 'N/A',
        activeSessions: 0
    });
    const [extensionRequests, setExtensionRequests] = useState([]);
    const [extensionLoading, setExtensionLoading] = useState(false);
    const [respondingSessionId, setRespondingSessionId] = useState('');
    const navigate = useNavigate();

    const fetchExtensionRequests = useCallback(async (silent = false) => {
        try {
            if (!silent) {
                setExtensionLoading(true);
            }
            const token = localStorage.getItem('token');
            if (!token) {
                setExtensionRequests([]);
                return;
            }

            const response = await fetch(`${API_BASE}/sessions/extension-requests`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json().catch(() => ({}));
            if (response.ok && data?.success) {
                setExtensionRequests(Array.isArray(data.requests) ? data.requests : []);
                return;
            }
            setExtensionRequests([]);
        } catch (error) {
            console.error('Failed to load extension requests:', error);
            if (!silent) {
                setExtensionRequests([]);
            }
        } finally {
            if (!silent) {
                setExtensionLoading(false);
            }
        }
    }, []);

    const handleExtensionResponse = async (sessionId, status) => {
        if (!sessionId || !status) return;
        try {
            setRespondingSessionId(sessionId);
            const token = localStorage.getItem('token');
            if (!token) throw new Error('Authentication required');

            const response = await fetch(`${API_BASE}/sessions/extend/${sessionId}/respond`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status })
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok || data?.success === false) {
                throw new Error(data?.message || 'Failed to respond to extension request');
            }

            await fetchExtensionRequests(true);
            if (status === 'accepted') {
                setStats((prev) => ({
                    ...prev,
                    activeSessions: Math.max(prev.activeSessions, 1),
                }));
            }
        } catch (error) {
            console.error('Failed to respond to extension request:', error);
            window.alert(error.message || 'Unable to respond to extension request.');
        } finally {
            setRespondingSessionId('');
        }
    };

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem('token');
                if (!token || !user?.id) return;

                console.log('👤 PatientDashboard - Fetching history for patient:', user.id);

                const response = await fetch(`${API_BASE}/sessions/patient/${user.id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    let historyList = data.success ? (data.history || []) : [];

                    // 🧪 Demo: Add Alexander Knight's session history as a fallback
                    if (historyList.length === 0 && user?.name === 'Alexander Knight') {
                        historyList = [{
                            sessionId: 'demo-session-8821',
                            doctorName: 'Dr. Sarah Wilson',
                            doctorSpecialization: 'Cardiologist',
                            date: '2026-02-12',
                            time: '11:30 AM',
                            duration: 25,
                            status: 'ended',
                            diagnosis: 'Hypertension Follow-up',
                            notes: 'Patient reporting mild headaches. BP checked: 140/90.'
                        },
                        {
                            sessionId: 'demo-session-7712',
                            doctorName: 'Dr. Michael Chen',
                            doctorSpecialization: 'General Physician',
                            date: '2026-01-20',
                            time: '09:00 AM',
                            duration: 15,
                            status: 'ended',
                            diagnosis: 'Routine Annual Wellness',
                            notes: 'All vitals normal. Encouraged daily exercise.'
                        }];
                    }

                    setHistory(historyList);

                    // Calculate stats
                    const totalVisits = historyList.filter(s => s.status === 'ended' || s.status === 'accepted').length;
                    const lastVisit = historyList.length > 0 ? historyList[0].date : 'N/A';
                    const activeSessions = historyList.filter(s => s.status === 'accepted').length;

                    setStats({
                        totalVisits,
                        lastVisit,
                        activeSessions
                    });
                    console.log(`✅ PatientDashboard - Loaded ${historyList.length} items`);
                }
            } catch (error) {
                console.error('❌ PatientDashboard - Error fetching history:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
        fetchExtensionRequests();
        const timer = window.setInterval(() => {
            fetchExtensionRequests(true);
        }, 15000);
        return () => window.clearInterval(timer);
    }, [fetchExtensionRequests, user]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <Loader className="h-10 w-10 text-blue-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-300">Loading your health history...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Welcome Section */}
            <div className="relative overflow-hidden bg-gradient-to-r from-blue-50/80 via-emerald-50/20 to-white dark:from-blue-900/20 dark:via-slate-800/50 dark:to-gray-800/70 p-10 rounded-[24px] shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-blue-100/50 dark:border-blue-900/30 group transition-all duration-500 hover:shadow-md">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div className="max-w-2xl">
                        <div className="flex items-center space-x-2 mb-4">
                            <div className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.2em]">Patient Portal</p>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">
                            Welcome back, <span className="text-blue-600 dark:text-blue-400">{user?.name?.split(' ')[0] || 'Patient'}</span>!
                        </h1>
                        <p className="text-base text-slate-500 dark:text-slate-400 font-medium max-w-md leading-relaxed">
                            Your personal health records, treatment history, and clinical interactions in one secure place.
                        </p>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="hidden sm:flex relative p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-blue-500/5 border border-blue-50 dark:border-slate-700 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                            <Activity className="h-10 w-10 text-emerald-500" />
                            <div className="absolute -top-1 -right-1 h-3 w-3 bg-blue-500 rounded-full border-2 border-white dark:border-slate-800 animate-pulse"></div>
                        </div>
                        <button
                            onClick={() => navigate('/profile')}
                            className="flex items-center gap-3 bg-[#2563EB] text-white px-8 py-4 rounded-xl hover:bg-blue-700 transition-all duration-300 shadow-lg shadow-blue-500/25 font-bold active:scale-95 whitespace-nowrap"
                        >
                            <User className="h-5 w-5" />
                            View Full Profile
                        </button>
                    </div>
                </div>

                {/* Decorative Background Elements */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-500/10 transition-colors duration-700"></div>
            <div className="absolute bottom-0 left-1/2 -ml-40 -mb-20 w-80 h-40 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
            </div>

            {(extensionLoading || extensionRequests.length > 0) && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 shadow-sm dark:border-amber-900/50 dark:bg-amber-900/20">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
                                Session Extension Requests
                            </p>
                            <p className="text-sm font-semibold text-amber-800 dark:text-amber-100">
                                Doctor requested extra time. Approve or decline.
                            </p>
                        </div>
                        {extensionLoading && (
                            <Loader className="h-4 w-4 animate-spin text-amber-700 dark:text-amber-200" />
                        )}
                    </div>

                    <div className="space-y-3">
                        {extensionRequests.map((request) => {
                            const isResponding = respondingSessionId === request.sessionId;
                            const doctorName = request?.doctor?.name || 'Doctor';
                            const minutes = Number(request?.minutes || 20);
                            return (
                                <div
                                    key={request.sessionId}
                                    className="rounded-xl border border-amber-200/70 bg-white/80 p-4 dark:border-amber-800/40 dark:bg-[#181B24]"
                                >
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                                Dr. {doctorName}
                                            </p>
                                            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                                                Requested +{minutes} minutes
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                disabled={isResponding}
                                                onClick={() =>
                                                    handleExtensionResponse(request.sessionId, 'accepted')
                                                }
                                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                                            >
                                                <CheckCircle className="h-3.5 w-3.5" />
                                                Approve
                                            </button>
                                            <button
                                                type="button"
                                                disabled={isResponding}
                                                onClick={() =>
                                                    handleExtensionResponse(request.sessionId, 'declined')
                                                }
                                                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-50 disabled:opacity-60 dark:border-rose-800/40 dark:bg-transparent dark:text-rose-300"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                                Decline
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Stats Cards - Medical Theme */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-7 rounded-[20px] shadow-[0_10px_30px_rgba(0,0,0,0.05)] border border-slate-100 dark:bg-slate-800 dark:border-slate-700 hover:shadow-[0_15px_40px_rgba(0,0,0,0.08)] transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                            <History className="h-6 w-6 text-[#2563EB]" />
                        </div>
                        <span className="text-[10px] font-bold px-3 py-1 bg-blue-50 text-[#2563EB] rounded-full uppercase tracking-wider">All History</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Visits</p>
                    <div className="flex items-baseline gap-2 mt-1">
                        <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{stats.totalVisits}</h3>
                        <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                            <TrendingUp className="h-3 w-3" /> Growth
                        </span>
                    </div>
                </div>

                <div className="bg-white p-7 rounded-[20px] shadow-[0_10px_30px_rgba(0,0,0,0.05)] border border-slate-100 dark:bg-slate-800 dark:border-slate-700 hover:shadow-[0_15px_40px_rgba(0,0,0,0.08)] transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-teal-50 dark:bg-teal-900/30 rounded-xl">
                            <Calendar className="h-6 w-6 text-[#14B8A6]" />
                        </div>
                        <span className="text-[10px] font-bold px-3 py-1 bg-teal-50 text-[#14B8A6] rounded-full uppercase tracking-wider">Recent</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Last Interaction</p>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white truncate mt-1">{stats.lastVisit}</h3>
                    <p className="text-[10px] text-slate-400 mt-1 font-medium italic">Latest session date</p>
                </div>

                <div className="bg-white p-7 rounded-[20px] shadow-[0_10px_30px_rgba(0,0,0,0.05)] border border-slate-100 dark:bg-slate-800 dark:border-slate-700 hover:shadow-[0_15px_40px_rgba(0,0,0,0.08)] transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
                            <Activity className="h-6 w-6 text-emerald-600" />
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-600 font-bold">
                            <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
                            <span className="text-[10px] uppercase tracking-wider">Active</span>
                        </div>
                    </div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Live Access</p>
                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{stats.activeSessions}</h3>
                    <p className="text-[10px] text-slate-400 mt-1 font-medium italic">Ongoing doctor sessions</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Session History List */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <History className="h-6 w-6 text-[#2563EB]" />
                            Recent Visit History
                        </h2>
                        <button
                            onClick={() => navigate('/vault')}
                            className="text-blue-600 dark:text-blue-400 text-sm font-semibold hover:underline flex items-center gap-1"
                        >
                            My Medical Vault <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="space-y-4">
                        {history.length > 0 ? (
                            history.map((session, index) => (
                                <div
                                    key={session.sessionId || index}
                                    className="group bg-white rounded-[20px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100 dark:bg-slate-800 dark:border-slate-700 hover:shadow-[0_10px_30px_rgba(0,0,0,0.06)] transition-all duration-300"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <Stethoscope className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 dark:text-white">
                                                    {session.doctorName || 'Medical Professional'}
                                                </h4>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                    <Activity className="h-3 w-3" />
                                                    {session.doctorSpecialization || 'Clinical Visit'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-3">
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{session.date}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">{session.time} • {session.duration} min</p>
                                            </div>
                                            <div className={`px-3 py-1 rounded-full text-xs font-bold border ${session.status === 'ended'
                                                ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400'
                                                : session.status === 'accepted'
                                                    ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400'
                                                    : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400'
                                                }`}>
                                                {session.status === 'ended' ? 'Visit Completed' : session.status.toUpperCase()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/30 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                                <div className="h-20 w-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <History className="h-10 w-10 text-gray-300" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Visit Sessions Yet</h3>
                                <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                                    Your medical visit history will appear here after your first consultation using Medical Vault.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Links / Health Tips */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl p-6 text-white shadow-xl">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Shield className="h-6 w-6" />
                            Your Privacy
                        </h3>
                        <p className="text-indigo-100 text-sm leading-relaxed mb-6">
                            Doctors only have access to your records during an active 20-minute session that you approve. You keep full control of your data.
                        </p>
                        <button
                            onClick={() => navigate('/settings')}
                            className="w-full bg-white text-indigo-600 font-bold py-3 rounded-xl hover:bg-indigo-50 transition-colors"
                        >
                            Privacy Settings
                        </button>
                    </div>

                    <div className="bg-white p-7 rounded-[22px] shadow-[0_10px_30px_rgba(0,0,0,0.05)] border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-500" />
                            Quick Actions
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                            <button
                                onClick={() => navigate('/vault')}
                                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <FileText className="h-5 w-5 text-purple-500" />
                                    <span className="font-semibold text-gray-700 dark:text-gray-200">My Medical Vault</span>
                                </div>
                                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
                            </button>
                            <button
                                onClick={() => navigate('/profile')}
                                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <User className="h-5 w-5 text-emerald-500" />
                                    <span className="font-semibold text-gray-700 dark:text-gray-200">Update Profile</span>
                                </div>
                                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PatientDashboard;
