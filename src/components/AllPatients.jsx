import React, { useState, useEffect } from 'react';
import {
    Search,
    MoreVertical,
    Eye,
    Edit2,
    Trash2,
    Plus,
    FileText,
    ChevronLeft,
    ChevronRight,
    X,
    Calendar,
    Phone,
    User,
    Mail,
    Filter,
    Download
} from 'lucide-react';
import { API_BASE } from '../constants/api';

const AllPatients = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [activeMenu, setActiveMenu] = useState(null);
    const [selectedPatients, setSelectedPatients] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState('All');
    const [genderFilter, setGenderFilter] = useState('All');
    const [dateFilter, setDateFilter] = useState('');
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc');
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [totalPages, setTotalPages] = useState(1);
    const [totalPatients, setTotalPatients] = useState(0);

    // Fetch patients from API
    useEffect(() => {
        fetchPatients();
    }, [currentPage, searchTerm, statusFilter, genderFilter, dateFilter, sortBy, sortOrder]);

    const fetchPatients = async () => {
        try {
            setLoading(true);
            setError(null);

            const token = localStorage.getItem('token');
            if (!token) {
                setError('No authentication token found');
                setLoading(false);
                return;
            }

            // Fetch patients from MongoDB via the doctors/patients endpoint
            const response = await fetch(`${API_BASE}/doctors/patients`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch patients');
            }

            const data = await response.json();

            if (data.success) {
                // The data is already in the correct format from the backend
                let transformedPatients = data.patients.map(patient => ({
                    id: patient.id,
                    name: patient.name || 'Unknown',
                    email: patient.email || 'N/A',
                    phone: patient.phone || 'N/A',
                    age: patient.age ?? 'N/A',
                    gender: patient.gender || 'N/A',
                    bloodType: patient.bloodType || 'N/A',
                    lastVisit: patient.lastVisit || 'N/A',
                    documents: patient.documents || 0,
                    status: (patient.sessionStatus === 'accepted' || patient.sessionStatus === 'pending') &&
                        patient.sessionExpiresAt && new Date(patient.sessionExpiresAt) > new Date()
                        ? 'Active' : 'Inactive',
                    sessionId: patient.sessionId,
                    sessionStatus: patient.sessionStatus,
                    sessionExpiresAt: patient.sessionExpiresAt,
                    totalSessions: patient.totalSessions || 0,
                    createdAt: patient.createdAt
                }));

                // Apply client-side filtering
                if (searchTerm) {
                    const search = searchTerm.toLowerCase();
                    transformedPatients = transformedPatients.filter(p =>
                        (p.name || '').toLowerCase().includes(search) ||
                        (p.email || '').toLowerCase().includes(search) ||
                        (p.phone || '').toLowerCase().includes(search)
                    );
                }

                if (statusFilter !== 'All') {
                    transformedPatients = transformedPatients.filter(p => p.status === statusFilter);
                }

                if (genderFilter !== 'All') {
                    transformedPatients = transformedPatients.filter(p => p.gender === genderFilter);
                }

                if (dateFilter) {
                    transformedPatients = transformedPatients.filter(p => p.lastVisit === dateFilter);
                }

                // Apply client-side sorting
                transformedPatients.sort((a, b) => {
                    let aVal = a[sortBy];
                    let bVal = b[sortBy];

                    if (sortBy === 'name') {
                        return sortOrder === 'asc'
                            ? String(aVal || '').localeCompare(String(bVal || ''))
                            : String(bVal || '').localeCompare(String(aVal || ''));
                    } else if (sortBy === 'age') {
                        const aAge = Number.isFinite(Number(aVal)) ? Number(aVal) : -1;
                        const bAge = Number.isFinite(Number(bVal)) ? Number(bVal) : -1;
                        return sortOrder === 'asc' ? aAge - bAge : bAge - aAge;
                    } else if (sortBy === 'lastVisit') {
                        const aDate = aVal && aVal !== 'N/A' ? new Date(aVal) : new Date(0);
                        const bDate = bVal && bVal !== 'N/A' ? new Date(bVal) : new Date(0);
                        return sortOrder === 'asc'
                            ? aDate - bDate
                            : bDate - aDate;
                    } else if (sortBy === 'createdAt') {
                        const aDate = a.createdAt ? new Date(a.createdAt) : new Date(0);
                        const bDate = b.createdAt ? new Date(b.createdAt) : new Date(0);
                        return sortOrder === 'asc' ? aDate - bDate : bDate - aDate;
                    }
                    return 0;
                });

                // Show complete list returned from backend (no page-size slicing).
                setPatients(transformedPatients);
                setTotalPatients(transformedPatients.length);
                setTotalPages(1);
                setCurrentPage(1);
            } else {
                throw new Error(data.message || 'Failed to fetch patients');
            }
        } catch (err) {
            console.error('Error fetching patients:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const currentPatients = patients;

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
        setSelectedPatients([]); // Clear selection on page change
    };

    const toggleSelectAll = () => {
        if (selectedPatients.length === currentPatients.length) {
            setSelectedPatients([]);
        } else {
            setSelectedPatients(currentPatients.map(p => p.id));
        }
    };

    const toggleSelectPatient = (patientId) => {
        setSelectedPatients(prev =>
            prev.includes(patientId)
                ? prev.filter(id => id !== patientId)
                : [...prev, patientId]
        );
    };

    const handleViewDetails = (patient) => {
        setSelectedPatient(patient);
        setIsDrawerOpen(true);
    };

    const handleExport = () => {
        const patientsToExport = selectedPatients.length > 0
            ? patients.filter(p => selectedPatients.includes(p.id))
            : patients;

        if (patientsToExport.length === 0) return;

        // Create CSV content
        const headers = ['Name', 'Age', 'Gender', 'Phone', 'Email', 'Last Visit', 'Status', 'Blood Type'];
        const rows = patientsToExport.map(p => [
            p.name,
            p.age,
            p.gender,
            p.phone,
            p.email,
            p.lastVisit,
            p.status,
            p.bloodType
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        // Download the file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `patients_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen bg-[#F9FAFB] p-6 lg:p-10 font-inter">
            {/* 1️⃣ Filter Bar Header */}
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 mb-8 shadow-sm">
                <div className="flex flex-col gap-6">
                    <div className="flex justify-between items-center">
                        <h1 className="text-xl font-bold text-[#111827]" style={{ fontFamily: "'Outfit', sans-serif" }}>All Patients</h1>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleExport}
                                className="bg-white border border-[#E5E7EB] hover:bg-gray-50 text-gray-700 px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-sm"
                            >
                                <Download className="h-4 w-4" />
                                Export {selectedPatients.length > 0 ? `(${selectedPatients.length})` : ''}
                            </button>
                            <button className="bg-primary hover:opacity-90 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-sm hover:shadow-md active:scale-95">
                                <Plus className="h-4 w-4" />
                                Add Patient
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        {/* Search Input */}
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search users..."
                                className="w-full pl-11 pr-4 py-2.5 bg-[#F3F4F6] border-none rounded-full doctor-focus-ring transition-all text-sm placeholder:text-gray-400"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                            />
                        </div>

                        {/* Filter Icon Separator */}
                        <div className="flex items-center gap-4 text-gray-300">
                            <Filter className="h-4 w-4 text-gray-400" />
                        </div>

                        {/* Dropdown Filters */}
                        <div className="flex flex-wrap items-center gap-3">
                            <select
                                className="bg-[#F3F4F6] border-none rounded-full px-4 py-2.5 text-sm font-medium text-gray-600 doctor-focus-ring transition-all cursor-pointer min-w-[130px]"
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                            >
                                <option value="All">All Status</option>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>

                            <select
                                className="bg-[#F3F4F6] border-none rounded-full px-4 py-2.5 text-sm font-medium text-gray-600 doctor-focus-ring transition-all cursor-pointer min-w-[130px]"
                                value={genderFilter}
                                onChange={(e) => {
                                    setGenderFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                            >
                                <option value="All">All Genders</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                            </select>

                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                    <Calendar className="h-3.5 w-3.5" />
                                </span>
                                <input
                                    type="date"
                                    className="bg-[#F3F4F6] border-none rounded-full pl-9 pr-4 py-2.5 text-sm font-medium text-gray-600 doctor-focus-ring transition-all cursor-pointer min-w-[150px]"
                                    value={dateFilter}
                                    onChange={(e) => {
                                        setDateFilter(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                />
                            </div>

                            <select
                                className="bg-[#F3F4F6] border-none rounded-full px-4 py-2.5 text-sm font-medium text-gray-600 doctor-focus-ring transition-all cursor-pointer min-w-[130px]"
                                value={sortBy}
                                onChange={(e) => {
                                    setSortBy(e.target.value);
                                    setCurrentPage(1);
                                }}
                            >
                                <option value="createdAt">Newest Joined</option>
                                <option value="name">Sort by Name</option>
                                <option value="age">Sort by Age</option>
                                <option value="lastVisit">Sort by Last Visit</option>
                            </select>

                            {(searchTerm || statusFilter !== 'All' || genderFilter !== 'All' || dateFilter || sortBy !== 'createdAt') && (
                                <button
                                    onClick={() => {
                                        setSearchTerm('');
                                        setStatusFilter('All');
                                        setGenderFilter('All');
                                        setDateFilter('');
                                        setSortBy('createdAt');
                                        setSortOrder('desc');
                                        setCurrentPage(1);
                                    }}
                                    className="px-4 py-2.5 text-sm font-bold text-primary hover:bg-primary-50 rounded-xl transition-all"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                    <p className="text-sm font-medium">Error: {error}</p>
                </div>
            )}

            {/* 3️⃣ Simple Table */}
            <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50/50 border-b border-[#E5E7EB]">
                            <th className="pl-6 py-4 w-10">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/10 cursor-pointer"
                                    checked={currentPatients.length > 0 && selectedPatients.length === currentPatients.length}
                                    onChange={toggleSelectAll}
                                />
                            </th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Age</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Visit</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Documents</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr>
                                <td colSpan="8" className="px-6 py-12 text-center">
                                    <div className="flex flex-col items-center justify-center gap-3">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                        <p className="text-sm text-gray-500">Loading patients...</p>
                                    </div>
                                </td>
                            </tr>
                        ) : currentPatients.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="px-6 py-12 text-center">
                                    <p className="text-sm text-gray-500">No Patients Assigned Yet</p>
                                </td>
                            </tr>
                        ) : (
                            currentPatients.map((patient) => (
                                <tr
                                    key={patient.id}
                                    className={`hover:bg-gray-50/50 transition-colors ${selectedPatients.includes(patient.id) ? 'bg-primary-50/30' : ''}`}
                                >
                                    <td className="pl-6 py-4">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/10 cursor-pointer"
                                            checked={selectedPatients.includes(patient.id)}
                                            onChange={() => toggleSelectPatient(patient.id)}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-full bg-primary-50 flex items-center justify-center text-primary font-bold text-sm border border-primary/20 uppercase">
                                                {patient.name.charAt(0)}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-[#111827]">{patient.name}</span>
                                                <span className="text-[11px] text-gray-500 font-medium">#{patient.id.slice(-6).toUpperCase()}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-sm font-medium text-gray-600">
                                        {Number.isFinite(Number(patient.age)) ? `${patient.age}y` : patient.age}
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                                            <Phone className="h-3.5 w-3.5 text-gray-400" />
                                            {patient.phone}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                                            <Calendar className="h-3.5 w-3.5 text-gray-400" />
                                            {patient.lastVisit === 'N/A' ? 'Never' : patient.lastVisit}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2">
                                            <FileText className="h-3.5 w-3.5 text-gray-400" />
                                            <span className="text-sm font-bold text-gray-700">{patient.documents}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border-2 ${patient.status === 'Active'
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                            : 'bg-slate-50 text-slate-500 border-slate-100'
                                            }`}>
                                            {patient.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="relative inline-block text-left">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === patient.id ? null : patient.id); }}
                                                className="p-1 hover:bg-gray-100 rounded transition-all text-gray-400"
                                            >
                                                <MoreVertical className="h-5 w-5" />
                                            </button>

                                            {activeMenu === patient.id && (
                                                <>
                                                    <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setActiveMenu(null); }} />
                                                    <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 origin-top-right ring-1 ring-black ring-opacity-5">
                                                        <button onClick={(e) => { e.stopPropagation(); handleViewDetails(patient); setActiveMenu(null); }} className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                                                            <Eye className="h-3.5 w-3.5" /> View Details
                                                        </button>
                                                        <button onClick={(e) => { e.stopPropagation(); setActiveMenu(null); }} className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                                                            <Edit2 className="h-3.5 w-3.5" /> Edit Patient
                                                        </button>
                                                        <button onClick={(e) => { e.stopPropagation(); setActiveMenu(null); }} className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50">
                                                            <Trash2 className="h-3.5 w-3.5" /> Delete
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )))}
                    </tbody>
                </table>

                {/* Pagination */}
                <div className="px-6 py-4 bg-gray-50/50 border-t border-[#E5E7EB] flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                        Page <span className="font-semibold text-gray-900">{currentPage}</span> of <span className="font-semibold text-gray-900">{totalPages}</span>
                        {' '}| Total: <span className="font-semibold text-gray-900">{totalPatients}</span>
                    </p>
                    <div className="flex gap-2">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => prev - 1)}
                            className="p-1.5 border border-gray-200 rounded hover:bg-white disabled:opacity-40 transition-colors"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => prev + 1)}
                            className="p-1.5 border border-gray-200 rounded hover:bg-white disabled:opacity-40 transition-colors"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* 4️⃣ Side Drawer */}
            {isDrawerOpen && (
                <>
                    <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-[1px] z-40" onClick={() => setIsDrawerOpen(false)} />
                    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl z-50 transform transition-transform border-l border-gray-200 p-6 overflow-y-auto">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-lg font-bold text-gray-900">Patient Profile</h2>
                            <button onClick={() => setIsDrawerOpen(false)} className="p-2 hover:bg-gray-50 rounded-full text-gray-400">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex flex-col items-center mb-10 pt-4">
                            <h3 className="text-xl font-bold text-gray-900">{selectedPatient?.name}</h3>
                            <p className="text-sm text-gray-500">{selectedPatient?.id}</p>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Age / Gender</p>
                                    <p className="text-sm font-semibold text-gray-700">{selectedPatient?.age} / {selectedPatient?.gender}</p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Blood Group</p>
                                    <p className="text-sm font-semibold text-gray-700">{selectedPatient?.bloodType || 'N/A'}</p>
                                </div>
                            </div>

                            <div className="p-4 border border-gray-100 rounded-lg space-y-4">
                                <div className="flex items-center gap-3">
                                    <Phone className="h-4 w-4 text-gray-400" />
                                    <span className="text-sm text-gray-600">{selectedPatient?.phone}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Mail className="h-4 w-4 text-gray-400" />
                                    <span className="text-sm text-gray-600">{selectedPatient?.email}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Calendar className="h-4 w-4 text-gray-400" />
                                    <span className="text-sm text-gray-600">Last visit: {selectedPatient?.lastVisit}</span>
                                </div>
                            </div>

                             <button className="w-full bg-primary text-white py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-95">
                                 <Edit2 className="h-4 w-4" />
                                 Edit Full Record
                             </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default AllPatients;
