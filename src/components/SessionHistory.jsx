import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, Filter, Calendar, Clock, User, FileText, ChevronRight, CheckCircle, Activity, Download, X, ChevronDown, CreditCard, AlertCircle, Check, ChevronLeft, FileSpreadsheet, FileDown, FileBox, ArrowLeft, RefreshCw, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { API_BASE } from '../constants/api';
import AppointmentModal from './AppointmentModal';
import { generatePatientSummaryPDF } from '../utils/pdfGenerator';

const SessionHistory = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('All');
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [lastFetched, setLastFetched] = useState(null);

    // Advanced filter states
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [sessionTypeFilter, setSessionTypeFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [durationFilter, setDurationFilter] = useState('All');
    const [timePreset, setTimePreset] = useState('All'); // New Preset state
    const [showFilters, setShowFilters] = useState(false);

    // Drawer state
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState(null);
    const [showAppointmentModal, setShowAppointmentModal] = useState(false);
    const [appointmentPatient, setAppointmentPatient] = useState(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Export Dropdown state
    const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
    const exportDropdownRef = useRef(null);
    const tableContainerRef = useRef(null);
    const appointmentLaunchTimeoutRef = useRef(null);

    // Handle outside click for export dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target)) {
                setExportDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ─────────────────────────────────────────────────────────────────────────
    // Fetch COMPLETED sessions from MongoDB via /api/sessions/session-history
    // MongoDB URI: process.env.MONGO_URI (loaded from .env in backend/config/database.js)
    // Filter applied on backend: only ended/expired/declined sessions for THIS doctor
    // ─────────────────────────────────────────────────────────────────────────
    const fetchSessions = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);
            setError(null);

            const token = localStorage.getItem('token');
            if (!token) {
                setError('No authentication token found. Please log in.');
                return;
            }

            const endpoints = [
                `${API_BASE}/sessions/session-history`,
                `${API_BASE}/sessions/history`, // Backward-compatible fallback
            ];

            let data = null;
            let endpointUsed = endpoints[0];

            for (const endpoint of endpoints) {
                endpointUsed = endpoint;
                const response = await fetch(endpoint, {
                    credentials: 'include',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                // Try fallback endpoint only when route itself is missing.
                if (response.status === 404) continue;

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    const serverMessage = errData?.message || `Server error: ${response.status}`;
                    throw new Error(`${serverMessage} (${endpointUsed})`);
                }

                data = await response.json();
                break;
            }

            if (!data) {
                throw new Error(`Session history endpoint not found (${endpoints[0]})`);
            }

            if (data.success) {
                // Backend already filters to completed sessions only
                setSessions(data.sessions || []);
                setLastFetched(new Date());
                console.log(`✅ [SessionHistory] Loaded ${data.sessions?.length ?? 0} completed sessions from MongoDB`);
                console.log('📊 Meta:', data.meta);
            } else {
                throw new Error(data.message || 'Failed to fetch sessions');
            }
        } catch (err) {
            console.error('❌ [SessionHistory] Fetch error:', err);
            const rawMessage = String(err?.message || '');
            const isNetworkError =
                err?.name === 'TypeError' &&
                rawMessage.toLowerCase().includes('failed to fetch');

            if (isNetworkError) {
                setError(
                    `Unable to connect to backend at ${API_BASE}. ` +
                    `Ensure backend is running on http://localhost:5001 and CORS allows ${window.location.origin}.`
                );
            } else {
                setError(rawMessage || 'Failed to load sessions');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // ─────────────────────────────────────────────────────────────────────────
    // Update Session in MongoDB (called when a session ends)
    // PATCH /api/sessions/:sessionId/update
    // Saves diagnosis, notes, and marks status as 'ended'
    // ─────────────────────────────────────────────────────────────────────────
    const updateSessionInMongo = useCallback(async (sessionId, { diagnosis, notes, status }) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('No auth token');

            const res = await fetch(`${API_BASE}/sessions/${sessionId}/update`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ diagnosis, notes, status })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Failed to update session');
            }

            console.log(`✅ [SessionUpdate] Session ${sessionId} updated in MongoDB:`, data.session);

            // Refresh session list after update so history is current
            await fetchSessions(true);
            return data.session;
        } catch (err) {
            console.error('❌ [SessionUpdate] Error:', err);
            throw err;
        }
    }, [fetchSessions]);

    // Initial load + expose updateSessionInMongo on window for other components to call
    useEffect(() => {
        fetchSessions();
        // Expose globally so ActivePatients / other components can trigger history refresh
        window.__sessionHistoryRefresh = () => fetchSessions(true);
        window.__updateSessionInMongo = updateSessionInMongo;
        return () => {
            delete window.__sessionHistoryRefresh;
            delete window.__updateSessionInMongo;
        };
    }, [fetchSessions, updateSessionInMongo]);


    // Dynamic Stats and Chart Data
    const stats = {
        totalSessions: sessions.length,
        avgDuration: sessions.length > 0
            ? Math.round(sessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0) / sessions.length)
            : 0,
        sessionsToday: sessions.filter(s => {
            const date = new Date(s.createdAt);
            const now = new Date();
            return date.getDate() === now.getDate() &&
                date.getMonth() === now.getMonth() &&
                date.getFullYear() === now.getFullYear();
        }).length,
        growthRate: "+12%" // Keeping this as a visual placeholder
    };


    const filteredSessions = sessions.filter(session => {
        const matchesSearch = (session.patientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (session.patientId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (session.diagnosis || '').toLowerCase().includes(searchTerm.toLowerCase());

        // Date Logic for Presets
        const sessionDate = new Date(session.date);
        const today = new Date();
        let matchesPreset = true;

        if (timePreset === 'This Week') {
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
            matchesPreset = sessionDate >= startOfWeek;
        } else if (timePreset === 'This Month') {
            matchesPreset = sessionDate.getMonth() === today.getMonth() && sessionDate.getFullYear() === today.getFullYear();
        } else if (timePreset === 'Last 2 Months') {
            const twoMonthsAgo = new Date(today);
            twoMonthsAgo.setMonth(today.getMonth() - 2);
            matchesPreset = sessionDate >= twoMonthsAgo;
        }

        const matchesDateFrom = !dateFrom || sessionDate >= new Date(dateFrom);
        const matchesDateTo = !dateTo || sessionDate <= new Date(dateTo);
        const matchesStatus = statusFilter === 'All' || session.status?.toLowerCase() === statusFilter.toLowerCase();

        return matchesSearch && matchesPreset && matchesDateFrom && matchesDateTo && matchesStatus;
    });

    const resetFilters = () => {
        setDateFrom('');
        setDateTo('');
        setSessionTypeFilter('All');
        setStatusFilter('All');
        setDurationFilter('All');
        setTimePreset('All');
        setCurrentPage(1);
    };

    // Calculate pagination (strictly 10 sessions per page)
    const totalPages = Math.ceil(filteredSessions.length / itemsPerPage);
    const safeCurrentPage = totalPages > 0 ? Math.min(currentPage, totalPages) : 1;
    const currentSessions = filteredSessions.slice((safeCurrentPage - 1) * itemsPerPage, safeCurrentPage * itemsPerPage);
    const startIndex = filteredSessions.length === 0 ? 0 : ((safeCurrentPage - 1) * itemsPerPage) + 1;
    const endIndex = filteredSessions.length === 0 ? 0 : Math.min(safeCurrentPage * itemsPerPage, filteredSessions.length);

    const goToPage = (page) => {
        const boundedPage = Math.min(Math.max(page, 1), Math.max(totalPages, 1));
        setCurrentPage(boundedPage);
        if (tableContainerRef.current && typeof tableContainerRef.current.scrollTo === 'function') {
            tableContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    useEffect(() => {
        if (totalPages === 0 && currentPage !== 1) {
            setCurrentPage(1);
        } else if (totalPages > 0 && currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, dateFrom, dateTo, statusFilter, timePreset]);

    // Highlight matching text in search results
    const highlightText = (text, search) => {
        if (!search.trim()) return text;

        const parts = text.toString().split(new RegExp(`(${search})`, 'gi'));
        return (
            <>
                {parts.map((part, index) =>
                    part.toLowerCase() === search.toLowerCase() ? (
                        <mark key={index} className="bg-primary/20 dark:bg-primary/30 text-slate-900 dark:text-white px-0.5 rounded">
                            {part}
                        </mark>
                    ) : (
                        part
                    )
                )}
            </>
        );
    };

    const openDrawer = (session) => {
        setSelectedSession(session);
        setDrawerOpen(true);
    };

    const closeDrawer = () => {
        setDrawerOpen(false);
        setTimeout(() => setSelectedSession(null), 300); // Wait for animation to complete
    };

    const handleCloseAppointmentModal = () => {
        setShowAppointmentModal(false);
    };

    const handleAppointmentCreated = (newAppointment) => {
        console.log('✅ Appointment created from Session History:', newAppointment);
    };

    const handleBookAppointment = () => {
        if (!selectedSession) return;

        const resolvedPatientId = selectedSession.patientMongoId || selectedSession.patientId || '';
        if (!resolvedPatientId) return;

        setAppointmentPatient({
            id: resolvedPatientId,
            patientId: resolvedPatientId,
            name: selectedSession.patientName || 'Unknown Patient',
            email: selectedSession.patientEmail || '',
            mobile: selectedSession.patientMobile || ''
        });

        closeDrawer();

        if (appointmentLaunchTimeoutRef.current) {
            clearTimeout(appointmentLaunchTimeoutRef.current);
        }

        appointmentLaunchTimeoutRef.current = setTimeout(() => {
            setShowAppointmentModal(true);
        }, 320);
    };

    const handleDownloadSummary = async () => {
        if (!selectedSession) {
            alert('No session data available to download summary.');
            return;
        }

        const resolvedPatientId = selectedSession.patientMongoId || selectedSession.patientId || '';
        if (!resolvedPatientId || !selectedSession.patientName) {
            alert('No data available to download summary.');
            return;
        }

        try {
            const patientSummaryPayload = {
                id: resolvedPatientId,
                patientId: selectedSession.patientId || resolvedPatientId,
                name: selectedSession.patientName,
                email: selectedSession.patientEmail || '',
                mobile: selectedSession.patientMobile || '',
                age: selectedSession.patientAge || '',
                gender: selectedSession.patientGender || '',
                bloodType: selectedSession.patientBloodType || '',
                medicalHistory: [],
                medications: []
            };

            const summaryAppointments = [selectedSession, ...selectedPatientPastSessions].map((session) => ({
                appointmentDate: session.createdAt || session.date,
                appointmentTime: session.time || '',
                reason: session.diagnosis || session.type || 'Session Summary',
                status: session.status || 'Completed'
            }));

            const result = await generatePatientSummaryPDF(patientSummaryPayload, [], summaryAppointments);

            if (!result?.success) {
                alert('Failed to generate PDF summary. Please try again.');
            }
        } catch (error) {
            console.error('PDF generation error:', error);
            alert('Failed to generate PDF summary. Please try again.');
        }
    };

    const selectedPatientPastSessions = useMemo(() => {
        if (!selectedSession) return [];

        const selectedPatientKey = selectedSession.patientMongoId || selectedSession.patientId || '';

        return sessions
            .filter((session) => {
                if (session.id === selectedSession.id) return false;

                const currentPatientKey = session.patientMongoId || session.patientId || '';
                if (selectedPatientKey && currentPatientKey) {
                    return currentPatientKey === selectedPatientKey;
                }

                return (session.patientName || '').trim().toLowerCase() === (selectedSession.patientName || '').trim().toLowerCase();
            })
            .sort((a, b) => {
                const aTime = new Date(a.createdAt || a.date || 0).getTime();
                const bTime = new Date(b.createdAt || b.date || 0).getTime();
                return bTime - aTime;
            });
    }, [sessions, selectedSession]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && drawerOpen) {
                closeDrawer();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [drawerOpen]);

    useEffect(() => {
        if (!drawerOpen) return undefined;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [drawerOpen]);

    useEffect(() => {
        return () => {
            if (appointmentLaunchTimeoutRef.current) {
                clearTimeout(appointmentLaunchTimeoutRef.current);
            }
        };
    }, []);

    const handleExport = (format) => {
        setExportDropdownOpen(false);
        const fileName = `session_history_${new Date().toISOString().split('T')[0]}`;

        if (format === 'PDF') {
            try {
                const doc = new jsPDF();

                // Add header
                doc.setFontSize(20);
                doc.setTextColor(30, 41, 59); // Slate-800
                doc.text('Session History Report', 14, 22);

                doc.setFontSize(10);
                doc.setTextColor(100, 116, 139); // Slate-500
                doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

                // Simple Table
                let yPos = 45;
                const headers = ['Patient', 'Date', 'Duration', 'Status'];
                const colWidths = [60, 40, 30, 40];

                // Header background
                doc.setFillColor(248, 250, 252); // bg-slate-50
                doc.rect(14, yPos - 5, 180, 8, 'F');

                doc.setFont(undefined, 'bold');
                doc.setTextColor(30, 41, 59);
                headers.forEach((h, i) => {
                    let xOffset = 14 + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
                    doc.text(h, xOffset, yPos);
                });

                yPos += 10;
                doc.setFont(undefined, 'normal');
                doc.setTextColor(51, 65, 85);

                sessions.forEach((s) => {
                    if (yPos > 280) {
                        doc.addPage();
                        yPos = 20;
                    }

                    const rowData = [s.patientName, s.date, `${s.duration}m`, s.status];
                    rowData.forEach((text, i) => {
                        let xOffset = 14 + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
                        doc.text(String(text), xOffset, yPos);
                    });
                    yPos += 8;
                });

                doc.save(`${fileName}.pdf`);
            } catch (err) {
                console.error('PDF Generation Error:', err);
                alert('Failed to generate PDF. Please ensure all dependencies are loaded.');
            }
        } else if (format === 'Excel') {
            // Proper Excel-compatible HTML format
            const excelHeader = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Sessions</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
<body>
    <table border="1">
        <thead>
            <tr style="background-color: #f1f5f9; font-weight: bold;">
                <th>Patient Name</th><th>Patient ID</th><th>Date</th><th>Duration</th><th>Status</th>
            </tr>
        </thead>
        <tbody>
            ${sessions.map(s => `<tr><td>${s.patientName}</td><td>${s.patientId}</td><td>${s.date}</td><td>${s.duration}m</td><td>${s.status}</td></tr>`).join('')}
        </tbody>
    </table>
</body>
</html>`;
            const blob = new Blob([excelHeader], { type: 'application/vnd.ms-excel' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${fileName}.xls`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } else {
            // Standard CSV with UTF-8 BOM for Excel compatibility
            const BOM = "\uFEFF";
            const csvHeaders = "Patient Name,Patient ID,Date,Duration,Status\n";
            const csvRows = sessions.map(s => `"${s.patientName}","${s.patientId}","${s.date}","${s.duration}m","${s.status}"`).join('\n');
            const blob = new Blob([BOM + csvHeaders + csvRows], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${fileName}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    };

    return (
        <div className="relative space-y-6">
            {/* Page Header - matches Dashboard welcome section */}
            <div className="relative overflow-hidden bg-white dark:bg-[#1F1F1F] p-8 rounded-[16px] shadow-[0_4px_12px_rgba(0,0,0,0.04)] border border-gray-200 dark:border-white/5 group transition-all duration-500 hover:shadow-md">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div className="max-w-2xl">
                        <div className="flex items-center space-x-5 mb-2">
                            <div className="relative p-3 bg-slate-50 dark:bg-white/5 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 group-hover:scale-110 transition-all duration-300 shrink-0">
                                <Clock className="h-6 w-6 text-primary" />
                            </div>
                            <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Session History</h2>
                        </div>
                        <p className="text-[11px] md:text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest opacity-80">Review all past clinical sessions and outcomes</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => fetchSessions(true)} disabled={refreshing} className="p-3 rounded-xl border border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/5 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/10 transition-all shadow-sm dark:shadow-lg disabled:opacity-50">
                            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-primary' : ''}`} />
                        </button>
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400 group-focus-within:text-primary transition-colors z-10" />
                            <input type="text" placeholder="Search by patient name or ID" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-700 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-primary/20 focus:border-primary w-full md:w-72 transition-all shadow-sm dark:shadow-lg" />
                            {searchTerm && (<button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-all z-10"><X className="h-3.5 w-3.5" /></button>)}
                        </div>
                        <button onClick={() => setShowFilters(!showFilters)} className={`p-3 border rounded-xl transition-all shadow-sm dark:shadow-lg ${showFilters ? 'bg-primary text-white border-primary' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 dark:bg-white/5 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/10'}`}>
                            <Filter className="h-4 w-4" />
                        </button>
                        <button onClick={() => navigate('/scan')} className="group relative flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl hover:shadow-primary/30 transition-all duration-300 shadow-lg shadow-primary/20 font-bold active:scale-95 overflow-hidden whitespace-nowrap">
                            <Plus className="h-4 w-4" /><span>New Session</span>
                        </button>
                    </div>
                </div>
            </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-6 bg-primary rounded-xl shadow-md text-white cursor-default">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 bg-white/10 rounded-xl">
                                <CheckCircle className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-sm font-semibold opacity-90">Total Sessions</span>
                        </div>
                        <p className="text-[32px] font-semibold leading-none mb-2">{stats.totalSessions.toLocaleString()}</p>
                        <p className="text-xs opacity-75 font-medium">{stats.growthRate} from last month</p>
                    </div>

                    <div className="p-6 bg-white dark:bg-[#1F1F1F] border border-gray-100 dark:border-white/5 rounded-xl shadow-md cursor-default">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 bg-primary/10 rounded-xl">
                                <Clock className="h-5 w-5 text-primary dark:text-primary" />
                            </div>
                            <span className="text-sm font-semibold text-[#475569] dark:text-slate-300">Avg. Duration</span>
                        </div>
                        <p className="text-[32px] font-semibold text-slate-800 dark:text-white leading-none mb-2">{stats.avgDuration}m</p>
                        <p className="text-xs text-[#475569] dark:text-slate-400 font-medium">Consistent with target</p>
                    </div>

                    <div className="p-6 bg-white dark:bg-[#1F1F1F] border border-gray-100 dark:border-white/5 rounded-xl shadow-md cursor-default">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 bg-primary-50 rounded-xl">
                                <Activity className="h-5 w-5 text-primary dark:text-primary" />
                            </div>
                            <span className="text-sm font-semibold text-[#475569] dark:text-slate-300">Today</span>
                        </div>
                        <p className="text-[32px] font-semibold text-slate-800 dark:text-white leading-none mb-2">{stats.sessionsToday}</p>
                        <p className="text-xs text-[#475569] dark:text-slate-400 font-medium">Sessions scheduled for today</p>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-[16px] p-4 flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm font-bold text-red-900 dark:text-red-200">Error loading sessions</p>
                            <p className="text-xs text-red-700 dark:text-red-300 mt-1">{error}</p>
                        </div>
                        <button
                            onClick={() => setError(null)}
                            className="p-1 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg transition-all"
                        >
                            <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                        </button>
                    </div>
                )}

                {/* Advanced Filters Section */}
                {showFilters && (
                    <div className="bg-white dark:bg-[#1F1F1F] border border-gray-100 dark:border-white/5 rounded-2xl p-6 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Session Filters</h3>
                            <button
                                onClick={resetFilters}
                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-[#475569] hover:text-[#DC2626] dark:text-slate-400 transition-all font-inter"
                            >
                                <X className="h-3.5 w-3.5" />
                                Reset Filters
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* Date Presets */}
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">Range</label>
                                <div className="relative">
                                    <select
                                        value={timePreset}
                                        onChange={(e) => setTimePreset(e.target.value)}
                                        className="w-full pl-4 pr-10 py-3 bg-[#F8FAFC] dark:bg-[#121212] border border-slate-200 dark:border-white/5 rounded-xl text-sm font-semibold text-slate-900 dark:text-white transition-all appearance-none cursor-pointer focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    >
                                        <option value="All">All Time</option>
                                        <option value="This Week">This Week</option>
                                        <option value="This Month">This Month</option>
                                        <option value="Last 2 Months">Last 2 Months</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                </div>
                            </div>

                            {/* Date From */}
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">From</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        type="date"
                                        value={dateFrom}
                                        onChange={(e) => setDateFrom(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-[#F8FAFC] dark:bg-[#121212] border border-slate-200 dark:border-white/5 rounded-xl text-sm font-semibold text-slate-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            {/* Date To */}
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">To</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        type="date"
                                        value={dateTo}
                                        onChange={(e) => setDateTo(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-[#F8FAFC] dark:bg-[#121212] border border-slate-200 dark:border-white/5 rounded-xl text-sm font-semibold text-slate-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            {/* Status */}
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">Status</label>
                                <div className="relative">
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="w-full pl-4 pr-10 py-3 bg-[#F8FAFC] dark:bg-[#121212] border border-slate-200 dark:border-white/5 rounded-xl text-sm font-semibold text-slate-900 dark:text-white transition-all appearance-none cursor-pointer focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    >
                                        <option value="All">All Status</option>
                                        <option value="Active">Active</option>
                                        <option value="Completed">Completed</option>
                                        <option value="Pending">Pending</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* History List */}
                <div className="bg-white dark:bg-[#1F1F1F] border border-gray-100 dark:border-white/5 rounded-xl shadow-md overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-primary-50 dark:bg-primary/10 rounded-xl">
                                <FileText className="h-5 w-5 text-primary dark:text-primary" />
                            </div>
                            <h2 className="text-xl font-semibold text-slate-800 dark:text-white">Past Sessions</h2>
                        </div>

                        <div className="relative" ref={exportDropdownRef}>
                            <button
                                onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                                className="flex items-center gap-2 px-4 py-2 bg-primary hover:opacity-90 text-white rounded-lg text-xs font-bold shadow-md transition-all active:scale-95"
                            >
                                <Download className="h-3.5 w-3.5" />
                                <span>Export</span>
                                <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${exportDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {exportDropdownOpen && (
                                <div className="absolute right-0 mt-3 w-52 bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-white/10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] z-[100] overflow-hidden animate-dropdown">
                                    <div className="p-1.5">
                                        <button
                                            className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg transition-all group"
                                            onClick={() => handleExport('PDF')}
                                        >
                                            <div className="p-1.5 bg-rose-50 dark:bg-rose-500/10 rounded-md group-hover:scale-110 transition-transform">
                                                <FileText className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                                            </div>
                                            <span>Export as PDF</span>
                                        </button>
                                        <button
                                            className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg transition-all group"
                                            onClick={() => handleExport('Excel')}
                                        >
                                            <div className="p-1.5 bg-primary/10 dark:bg-primary/20 rounded-md group-hover:scale-110 transition-transform">
                                                <FileSpreadsheet className="h-3.5 w-3.5 text-primary dark:text-primary" />
                                            </div>
                                            <span>Export as Excel</span>
                                        </button>
                                        <button
                                            className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg transition-all group"
                                            onClick={() => handleExport('CSV')}
                                        >
                                            <div className="p-1.5 bg-primary-50 dark:bg-primary/10 rounded-md group-hover:scale-110 transition-transform">
                                                <FileBox className="h-3.5 w-3.5 text-primary dark:text-primary" />
                                            </div>
                                            <span>Export as CSV</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div ref={tableContainerRef} className="overflow-x-auto max-h-[600px] custom-scrollbar">
                        <table className="w-full border-collapse">
                            <thead className="sticky top-0 z-20 bg-white dark:bg-[#1A1A1A] border-b border-slate-100 dark:border-white/5">
                                <tr>
                                    <th className="w-[28%] px-7 py-5 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Patient</th>
                                    <th className="w-[22%] px-7 py-5 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Email</th>
                                    <th className="w-[18%] px-7 py-5 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Schedule</th>
                                    <th className="w-[12%] px-7 py-5 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Duration</th>
                                    <th className="w-[8%] px-7 py-5 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Sessions</th>
                                    <th className="w-[8%] px-7 py-5 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Status</th>
                                    <th className="w-[4%] px-7 py-5 text-right text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Detail</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                                {loading ? (
                                    [...Array(5)].map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-6 py-6" colSpan="7"><div className="h-12 bg-gray-100 dark:bg-white/5 rounded-2xl w-full"></div></td>
                                        </tr>
                                    ))
                                ) : currentSessions.length > 0 ? (
                                    currentSessions.map((session) => (
                                        <tr
                                            key={session.id}
                                            className="group transition-colors duration-150 hover:bg-[#F8FAFC] dark:hover:bg-white/[0.02] cursor-pointer"
                                            onClick={() => openDrawer(session)}
                                        >
                                            <td className="px-7 py-6">
                                                <div className="flex items-center gap-3">
                                                    {session.followUpRequired && (
                                                        <div className="h-4 w-4 bg-rose-500 rounded-full flex items-center justify-center shrink-0" title="Follow-up Required">
                                                            <AlertCircle className="h-2.5 w-2.5 text-white" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="text-base font-semibold text-slate-800 dark:text-white group-hover:text-primary transition-colors">
                                                            {highlightText(session.patientName, searchTerm)}
                                                        </p>
                                                        <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">
                                                            {highlightText(session.patientId, searchTerm)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-7 py-6">
                                                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                                    {highlightText(session.patientEmail, searchTerm)}
                                                </p>
                                            </td>
                                            <td className="px-7 py-6">
                                                <div className="space-y-1">
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                                        <Calendar className="h-3 w-3 text-primary" />
                                                        {session.date}
                                                    </span>
                                                    <span className="text-[11px] font-medium text-slate-500 flex items-center gap-2">
                                                        <Clock className="h-3 w-3" />
                                                        {session.time}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-7 py-6">
                                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-white/5 px-2.5 py-1.5 rounded-lg border border-slate-100 dark:border-white/5">
                                                    {session.duration}
                                                </span>
                                            </td>
                                            <td className="px-7 py-6">
                                                <div className="flex items-center">
                                                    <div className="px-3 py-1 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-lg border border-slate-100 dark:border-white/5 min-w-[32px] text-center">
                                                        {session.patientSessionCount}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-7 py-6">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider shadow-sm border ${session.status === 'Completed'
                                                    ? 'bg-primary/10 text-primary border-primary/20 dark:bg-primary/20'
                                                    : session.status === 'Cancelled'
                                                        ? 'bg-red-100 text-[#DC2626] border-red-200 dark:bg-red-900/30'
                                                        : 'bg-primary/10 text-primary border-primary/20 dark:bg-primary/20'
                                                    }`}>
                                                    {session.status === 'Completed' ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                                    {session.status}
                                                </span>
                                            </td>
                                            <td className="px-7 py-6 text-right">
                                                <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-all duration-200">
                                                    <div className="p-2 text-slate-400 hover:text-primary bg-slate-50 hover:bg-primary-50 dark:bg-white/5 dark:hover:bg-primary/10 rounded-xl transition-all">
                                                        <ChevronRight className="h-4 w-4" />
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="px-7 py-20 text-center text-slate-400 dark:text-slate-500">
                                            <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                            <p className="font-bold uppercase tracking-widest text-[11px]">No completed sessions found</p>
                                            <p className="text-[10px] mt-1 text-slate-400">Active sessions appear here only after they end or expire</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    <div className="px-7 py-5 border-t border-gray-100 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            Showing <span className="text-slate-900 dark:text-white">{startIndex}–{endIndex}</span> of <span className="text-slate-900 dark:text-white">{filteredSessions.length}</span> sessions
                        </p>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => goToPage(safeCurrentPage - 1)}
                                disabled={safeCurrentPage === 1}
                                className={`p-2 rounded-xl transition-all active-scale tooltip-trigger ${safeCurrentPage === 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-primary'}`}
                                data-tooltip="Previous Page"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>

                            <span className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/10">
                                Page {safeCurrentPage} / {Math.max(totalPages, 1)}
                            </span>

                            <button
                                onClick={() => goToPage(safeCurrentPage + 1)}
                                disabled={safeCurrentPage === totalPages || totalPages === 0}
                                className={`p-2 rounded-xl transition-all active-scale tooltip-trigger ${safeCurrentPage === totalPages || totalPages === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-primary'}`}
                                data-tooltip="Next Page"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Session Details Modal */}
                {drawerOpen && selectedSession && createPortal(
                    <div className="fixed inset-0 z-[999] flex items-center justify-center p-5">
                        {/* Backdrop */}
                        <div
                            className="absolute top-0 left-0 w-full h-full z-[999] bg-[rgba(0,0,0,0.4)] backdrop-blur-[5px] transition-opacity duration-300 animate-in fade-in"
                            onClick={closeDrawer}
                        />

                        {/* Modal Panel */}
                        <div className="relative z-[1000] w-[92%] max-w-[640px] max-h-[90vh] overflow-y-auto overflow-x-hidden custom-scrollbar bg-[#F8FAFC] dark:bg-[#1F1F1F] rounded-[16px] shadow-[0_20px_60px_rgba(0,0,0,0.3)] border border-gray-200 dark:border-white/10 animate-in fade-in zoom-in-95 duration-200 origin-center">

                            {/* Sticky Header */}
                            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-5 bg-[#F8FAFC] dark:bg-[#1F1F1F] border-b border-gray-200 dark:border-white/10 rounded-t-xl">
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Session Details</h2>
                                <button
                                    onClick={closeDrawer}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-all"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="p-6 space-y-5">

                                {/* Patient Info */}
                                <div className="flex items-center gap-3 p-4 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-[16px] shadow-sm">
                                    <div className="h-11 w-11 shrink-0 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-base border border-primary/20 dark:border-primary/30">
                                        {selectedSession.patientName ? selectedSession.patientName.charAt(0).toUpperCase() : <User className="h-5 w-5" />}
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-slate-900 dark:text-white">{selectedSession.patientName}</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{selectedSession.patientId}</p>
                                    </div>
                                </div>

                                {/* Details Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="p-4 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-[16px] shadow-sm">
                                        <div className="flex items-center gap-1.5 mb-2">
                                            <Calendar className="h-3.5 w-3.5 text-primary" />
                                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Date & Time</span>
                                        </div>
                                        <p className="text-sm font-semibold text-slate-800 dark:text-white">{selectedSession.date}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{selectedSession.time}</p>
                                    </div>
                                    <div className="p-4 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-[16px] shadow-sm">
                                        <div className="flex items-center gap-1.5 mb-2">
                                            <Clock className="h-3.5 w-3.5 text-primary" />
                                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Duration</span>
                                        </div>
                                        <p className="text-sm font-semibold text-slate-800 dark:text-white">
                                            {selectedSession.duration}{String(selectedSession.duration).includes('m') ? '' : ' min'}
                                        </p>
                                    </div>
                                </div>

                                {/* Session Type */}
                                <div className="p-4 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-[16px] shadow-sm">
                                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2">Session Type</label>
                                    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                        selectedSession.type === 'Emergency'
                                            ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
                                            : 'bg-primary/10 text-primary border-primary/20 dark:bg-primary/20 dark:text-primary dark:border-primary/30'
                                    }`}>
                                        {selectedSession.type || 'Regular Checkup'}
                                    </span>
                                </div>

                                {/* Divider */}
                                <div className="border-t border-gray-100 dark:border-white/5" />

                                {/* Next Appointment Section */}
                                <div className="p-4 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-[16px] shadow-sm">
                                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2">Next Appointment</label>
                                    <div className="p-4 bg-slate-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800 dark:text-white">10 April 2026</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">11:30 AM</p>
                                        </div>
                                        <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 dark:bg-primary/20">
                                            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                            Available
                                        </span>
                                    </div>

                                    <button
                                        onClick={handleBookAppointment}
                                        className="w-full mt-3 flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-teal-500 text-white px-5 py-3 rounded-xl hover:opacity-90 transition-all duration-300 shadow-lg shadow-primary/20 text-sm font-bold active:scale-95"
                                    >
                                        <Calendar className="h-4 w-4" />
                                        Book Appointment
                                    </button>
                                </div>

                                {/* Past Sessions */}
                                <div className="p-4 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-[16px] shadow-sm">
                                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2">Past Sessions</label>
                                    <div className="border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden">
                                        <div className="grid grid-cols-4 px-4 py-2 bg-slate-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Date</span>
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Time</span>
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Duration</span>
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">Status</span>
                                        </div>

                                        <div className="max-h-44 overflow-y-auto custom-scrollbar divide-y divide-gray-200 dark:divide-white/10">
                                            {selectedPatientPastSessions.length > 0 ? (
                                                selectedPatientPastSessions.map((session) => {
                                                    const normalizedStatus = String(session.status || '').toLowerCase() === 'completed' ? 'Completed' : 'Pending';
                                                    return (
                                                        <div key={session.id} className="grid grid-cols-4 px-4 py-2.5 text-xs">
                                                            <span className="text-slate-700 dark:text-slate-200 font-medium">{session.date}</span>
                                                            <span className="text-slate-500 dark:text-slate-400">{session.time}</span>
                                                            <span className="text-slate-500 dark:text-slate-400">{session.duration}</span>
                                                            <div className="text-right">
                                                                <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                                                    normalizedStatus === 'Completed'
                                                                        ? 'bg-primary/10 text-primary border-primary/20 dark:bg-primary/20'
                                                                        : 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30'
                                                                }`}>
                                                                    {normalizedStatus}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="px-4 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                                                    No past sessions available
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleDownloadSummary}
                                    className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-primary to-teal-500 hover:opacity-90 shadow-lg shadow-primary/20 transition-all active:scale-95"
                                >
                                    <Download className="h-4 w-4" />
                                    Download Summary
                                </button>

                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                {appointmentPatient && (
                    <AppointmentModal
                        isOpen={showAppointmentModal}
                        onClose={handleCloseAppointmentModal}
                        patient={appointmentPatient}
                        onAppointmentCreated={handleAppointmentCreated}
                    />
                )}
            </div>
    );
};

export default SessionHistory;
