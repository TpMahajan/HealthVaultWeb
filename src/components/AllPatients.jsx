import React, { useState, useEffect, useRef } from 'react';
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
    Download,
    Upload,
    ChevronDown,
    FileSpreadsheet,
    FileCode
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { API_BASE } from '../constants/api';
import * as XLSX from 'xlsx';

const createInitialPatientForm = () => ({
    name: '',
    phone: '',
    age: '',
    gender: 'Male',
    notes: '',
});

const createPatientFormFromPatient = (patient) => ({
    name: String(patient?.name || ''),
    phone: patient?.phone && patient.phone !== 'N/A' ? String(patient.phone) : '',
    age: Number.isFinite(Number(patient?.age)) ? String(patient.age) : '',
    gender: ['Male', 'Female', 'Other'].includes(patient?.gender) ? patient.gender : 'Male',
    notes: String(patient?.notes || ''),
});

const ADD_PATIENT_MAX_RETRIES = 2;
const ADD_PATIENT_RETRY_DELAY_MS = 400;
const PATIENTS_PER_PAGE = 10;
const EMPTY_NEXT_APPOINTMENT = 'Not Scheduled';

const formatAppointmentDateTime = (dateValue, timeValue = '') => {
    if (!dateValue) return null;

    let parsedDate = null;

    if (dateValue instanceof Date) {
        parsedDate = dateValue;
    } else if (typeof dateValue === 'string') {
        const trimmedValue = dateValue.trim();
        if (!trimmedValue || trimmedValue.toUpperCase() === 'N/A') return null;

        const normalizedValue = trimmedValue.replace(/\s+at\s+/i, ' ').replace(/\s+/g, ' ');

        if (timeValue) {
            parsedDate = new Date(`${normalizedValue.split('T')[0]}T${timeValue}`);
        }

        if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
            parsedDate = new Date(normalizedValue);
        }
    } else {
        parsedDate = new Date(dateValue);
    }

    if (!parsedDate || Number.isNaN(parsedDate.getTime())) return null;

    const formattedDate = parsedDate.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
    const formattedTime = parsedDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });

    return `${formattedDate}, ${formattedTime}`;
};

const getNextAppointmentDisplay = (patient) => {
    const separateFieldDate = patient?.nextAppointmentDate
        || patient?.appointmentDate
        || patient?.upcomingAppointment?.appointmentDate;
    const separateFieldTime = patient?.nextAppointmentTime
        || patient?.appointmentTime
        || patient?.upcomingAppointment?.appointmentTime;

    const fromSeparateFields = formatAppointmentDateTime(separateFieldDate, separateFieldTime);
    if (fromSeparateFields) return fromSeparateFields;

    const directCandidates = [
        patient?.nextAppointment,
        patient?.nextAppointmentAt,
        patient?.nextScheduledAppointment,
        patient?.upcomingAppointment?.appointmentDateTime,
        patient?.upcomingAppointment?.dateTime
    ];

    for (const candidate of directCandidates) {
        const formatted = formatAppointmentDateTime(candidate);
        if (formatted) return formatted;
    }

    return EMPTY_NEXT_APPOINTMENT;
};

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
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAddingPatient, setIsAddingPatient] = useState(false);
    const [addPatientForm, setAddPatientForm] = useState(createInitialPatientForm());
    const [addPatientErrors, setAddPatientErrors] = useState({});
    const [addPatientApiError, setAddPatientApiError] = useState('');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isEditingPatient, setIsEditingPatient] = useState(false);
    const [editPatientForm, setEditPatientForm] = useState(createInitialPatientForm());
    const [editPatientErrors, setEditPatientErrors] = useState({});
    const [editPatientApiError, setEditPatientApiError] = useState('');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeletingPatient, setIsDeletingPatient] = useState(false);
    const [deletePatientError, setDeletePatientError] = useState('');
    const [actionPatient, setActionPatient] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [bulkFile, setBulkFile] = useState(null);
    const [isBulkUploading, setIsBulkUploading] = useState(false);
    const [bulkUploadError, setBulkUploadError] = useState('');
    const [bulkUploadResult, setBulkUploadResult] = useState('');
    const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Fetch patients from API
    useEffect(() => {
        fetchPatients();
    }, []);

    useEffect(() => {
        if (!successMessage) return undefined;
        const timeoutId = setTimeout(() => setSuccessMessage(''), 2500);
        return () => clearTimeout(timeoutId);
    }, [successMessage]);

    useEffect(() => {
        if (!isDrawerOpen) return undefined;

        const handleEscapeClose = (event) => {
            if (event.key === 'Escape') {
                setIsDrawerOpen(false);
                setIsExportDropdownOpen(false);
            }
        };

        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsExportDropdownOpen(false);
            }
        };

        window.addEventListener('keydown', handleEscapeClose);
        window.addEventListener('mousedown', handleClickOutside);
        return () => {
            window.removeEventListener('keydown', handleEscapeClose);
            window.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isDrawerOpen]);

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
                credentials: 'omit',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('[AllPatients] Fetch patients failed:', {
                    status: response.status,
                    message: errorData?.message || 'Unknown server error'
                });
                throw new Error(errorData?.message || `Failed to fetch patients (${response.status})`);
            }

            const data = await response.json();

            if (data.success) {
                // The data is already in the correct format from the backend
                let transformedPatients = data.patients.map(patient => {
                    const nextAppointment = getNextAppointmentDisplay(patient);

                    return ({
                    id: patient.id,
                    name: patient.name || 'Unknown',
                    email: patient.email || 'N/A',
                    phone: patient.phone || 'N/A',
                    age: patient.age ?? 'N/A',
                    gender: patient.gender || 'N/A',
                    bloodType: patient.bloodType || 'N/A',
                    lastVisit: patient.lastVisit || 'N/A',
                    nextAppointment,
                    hasNextAppointment: nextAppointment !== EMPTY_NEXT_APPOINTMENT,
                    notes: String(patient.notes ?? patient.allergies ?? ''),
                    documents: patient.documents || 0,
                    status: (patient.sessionStatus === 'accepted' || patient.sessionStatus === 'pending') &&
                        patient.sessionExpiresAt && new Date(patient.sessionExpiresAt) > new Date()
                        ? 'Active' : 'Inactive',
                    sessionId: patient.sessionId,
                    sessionStatus: patient.sessionStatus,
                    sessionExpiresAt: patient.sessionExpiresAt,
                    totalSessions: patient.totalSessions || 0,
                    createdAt: patient.createdAt
                    });
                });

                // Show complete list returned from backend (no page-size slicing).
                setPatients(transformedPatients);
                setTotalPatients(transformedPatients.length);
                setCurrentPage(1);
            } else {
                throw new Error(data.message || 'Failed to fetch patients');
            }
        } catch (err) {
            console.error('Error fetching patients:', err);
            const hasCachedPatients = Array.isArray(patients) && patients.length > 0;
            setError(
                hasCachedPatients
                    ? 'Unable to refresh data. Showing previously loaded patients.'
                    : (err.message || 'Failed to fetch patients')
            );
        } finally {
            setLoading(false);
        }
    };

    const currentPatients = React.useMemo(() => {
        let transformedPatients = [...patients];

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
                    transformedPatients = transformedPatients.filter(p => String(p.gender || '').toLowerCase() === String(genderFilter).toLowerCase());
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


        return transformedPatients;
    }, [patients, searchTerm, statusFilter, genderFilter, dateFilter, sortBy, sortOrder]);

    const paginatedPatients = React.useMemo(() => {
        const startIndex = (currentPage - 1) * PATIENTS_PER_PAGE;
        return currentPatients.slice(startIndex, startIndex + PATIENTS_PER_PAGE);
    }, [currentPatients, currentPage]);

    useEffect(() => {
        const computedTotalPages = Math.max(1, Math.ceil(currentPatients.length / PATIENTS_PER_PAGE));
        setTotalPatients(currentPatients.length);
        setTotalPages(computedTotalPages);
    }, [currentPatients]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const handlePageChange = (pageNumber) => {
        const boundedPage = Math.min(Math.max(pageNumber, 1), totalPages);
        setCurrentPage(boundedPage);
        setSelectedPatients([]); // Clear selection on page change
    };

    const toggleSelectAll = () => {
        if (
            paginatedPatients.length > 0 &&
            paginatedPatients.every((patient) => selectedPatients.includes(patient.id))
        ) {
            setSelectedPatients([]);
        } else {
            setSelectedPatients(paginatedPatients.map((patient) => patient.id));
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

    const handleExport = (format) => {
        setIsExportDropdownOpen(false);
        const patientsToExport = selectedPatients.length > 0
            ? patients.filter(p => selectedPatients.includes(p.id))
            : patients;

        if (patientsToExport.length === 0) return;

        const dateStr = new Date().toISOString().split('T')[0];
        const fileName = `patients_export_${dateStr}`;

        if (format === 'csv') {
            const headers = ['Name', 'Age', 'Gender', 'Phone', 'Email', 'Last Visit', 'Next Appointment', 'Status', 'Blood Type'];
            const rows = patientsToExport.map(p => [
                p.name,
                p.age,
                p.gender,
                p.phone,
                p.email,
                p.lastVisit,
                p.nextAppointment,
                p.status,
                p.bloodType
            ]);

            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `${fileName}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else if (format === 'excel') {
            const worksheet = XLSX.utils.json_to_sheet(patientsToExport.map(p => ({
                Name: p.name,
                Age: p.age,
                Gender: p.gender,
                Phone: p.phone,
                Email: p.email,
                'Last Visit': p.lastVisit,
                'Next Appointment': p.nextAppointment,
                Status: p.status,
                'Blood Type': p.bloodType
            })));
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Patients");
            XLSX.writeFile(workbook, `${fileName}.xlsx`);
        } else if (format === 'pdf') {
            const doc = new jsPDF();
            doc.text("Patient Records Export", 14, 15);
            doc.setFontSize(10);
            doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);
            
            const tableHeaders = [['Name', 'Age', 'Gender', 'Phone', 'Last Visit', 'Next Appointment', 'Status']];
            const tableRows = patientsToExport.map(p => [
                p.name,
                p.age,
                p.gender,
                p.phone,
                p.lastVisit,
                p.nextAppointment,
                p.status
            ]);

            autoTable(doc, {
                head: tableHeaders,
                body: tableRows,
                startY: 30,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [16, 185, 129] }
            });

            doc.save(`${fileName}.pdf`);
        }
    };


    const openAddPatientModal = () => {
        setAddPatientErrors({});
        setAddPatientApiError('');
        setAddPatientForm(createInitialPatientForm());
        setIsAddModalOpen(true);
    };

    const closeAddPatientModal = () => {
        if (isAddingPatient) return;
        setIsAddModalOpen(false);
        setAddPatientErrors({});
        setAddPatientApiError('');
    };

    const handleAddPatientFieldChange = (field, value) => {
        setAddPatientForm((prev) => ({ ...prev, [field]: value }));
        setAddPatientErrors((prev) => {
            if (!prev[field]) return prev;
            const next = { ...prev };
            delete next[field];
            return next;
        });
        if (addPatientApiError) setAddPatientApiError('');
    };

    const validateAddPatientForm = () => {
        const validationErrors = {};
        const name = String(addPatientForm.name || '').trim();
        const phone = String(addPatientForm.phone || '').trim();
        const ageRaw = String(addPatientForm.age || '').trim();

        if (!name) validationErrors.name = 'Full Name is required';
        if (!phone) {
            validationErrors.phone = 'Phone Number is required';
        } else if (!/^\+?[0-9]{7,15}$/.test(phone.replace(/\s+/g, ''))) {
            validationErrors.phone = 'Enter a valid phone number';
        }

        if (ageRaw) {
            const age = Number(ageRaw);
            if (!Number.isFinite(age) || age < 0 || age > 130) {
                validationErrors.age = 'Enter a valid age';
            }
        }

        if (addPatientForm.gender && !['Male', 'Female', 'Other'].includes(addPatientForm.gender)) {
            validationErrors.gender = 'Select a valid gender';
        }

        setAddPatientErrors(validationErrors);
        return Object.keys(validationErrors).length === 0;
    };

    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const submitAddPatientRequest = async (payload, token) => {
        let latestError = null;

        for (let attempt = 0; attempt <= ADD_PATIENT_MAX_RETRIES; attempt += 1) {
            try {
                const response = await fetch(`${API_BASE}/doctors/patients`, {
                    method: 'POST',
                    credentials: 'omit',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload),
                });

                const data = await response.json().catch(() => ({}));
                if (!response.ok || !data.success) {
                    const submitError = new Error(data?.message || 'Error adding patient');
                    submitError.status = response.status;
                    submitError.response = data;
                    throw submitError;
                }

                return data;
            } catch (submitError) {
                latestError = submitError;
                const isTimeoutError = submitError?.name === 'TimeoutError';
                const isNetworkError = submitError instanceof TypeError;
                const canRetry = isTimeoutError || isNetworkError;

                if (attempt < ADD_PATIENT_MAX_RETRIES && canRetry) {
                    console.warn(
                        `[AllPatients] Retry ${attempt + 1}/${ADD_PATIENT_MAX_RETRIES} for add patient after ${isTimeoutError ? 'timeout' : 'network'} error:`,
                        submitError?.message
                    );
                    await wait(ADD_PATIENT_RETRY_DELAY_MS * (attempt + 1));
                    continue;
                }

                throw submitError;
            }
        }

        throw latestError || new Error('Error adding patient');
    };

    const handleAddPatientSubmit = async (event) => {
        event.preventDefault();
        if (!validateAddPatientForm()) return;

        try {
            setIsAddingPatient(true);
            setAddPatientApiError('');

            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Authentication required. Please log in again.');
            }

            const payload = {
                name: String(addPatientForm.name || '').trim(),
                phone: String(addPatientForm.phone || '').trim(),
                age: String(addPatientForm.age || '').trim() ? Number(addPatientForm.age) : undefined,
                gender: addPatientForm.gender || undefined,
                notes: String(addPatientForm.notes || '').trim(),
            };

            await submitAddPatientRequest(payload, token);

            setIsAddModalOpen(false);
            setAddPatientForm(createInitialPatientForm());
            setAddPatientErrors({});
            setSuccessMessage('Patient added successfully');

            await fetchPatients();
        } catch (submitError) {
            console.error('[AllPatients] Error adding patient:', submitError);
            if (submitError?.name === 'TimeoutError') {
                setAddPatientApiError('Request timed out. Please try again.');
                return;
            }
            setAddPatientApiError(submitError?.message || 'Error adding patient');
        } finally {
            setIsAddingPatient(false);
        }
    };

    const openEditPatientModal = (patient) => {
        if (!patient) return;
        setActionPatient(patient);
        setSelectedPatient(patient);
        setEditPatientErrors({});
        setEditPatientApiError('');
        setEditPatientForm(createPatientFormFromPatient(patient));
        setIsDrawerOpen(false);
        setIsEditModalOpen(true);
    };

    const closeEditPatientModal = () => {
        if (isEditingPatient) return;
        setIsEditModalOpen(false);
        setEditPatientErrors({});
        setEditPatientApiError('');
        setActionPatient(null);
    };

    const handleEditPatientFieldChange = (field, value) => {
        setEditPatientForm((prev) => ({ ...prev, [field]: value }));
        setEditPatientErrors((prev) => {
            if (!prev[field]) return prev;
            const next = { ...prev };
            delete next[field];
            return next;
        });
        if (editPatientApiError) setEditPatientApiError('');
    };

    const validateEditPatientForm = () => {
        const validationErrors = {};
        const name = String(editPatientForm.name || '').trim();
        const phone = String(editPatientForm.phone || '').trim();
        const ageRaw = String(editPatientForm.age || '').trim();

        if (!name) validationErrors.name = 'Full Name is required';
        if (!phone) {
            validationErrors.phone = 'Phone Number is required';
        } else if (!/^\+?[0-9]{7,15}$/.test(phone.replace(/\s+/g, ''))) {
            validationErrors.phone = 'Enter a valid phone number';
        }

        if (ageRaw) {
            const age = Number(ageRaw);
            if (!Number.isFinite(age) || age < 0 || age > 130) {
                validationErrors.age = 'Enter a valid age';
            }
        }

        if (editPatientForm.gender && !['Male', 'Female', 'Other'].includes(editPatientForm.gender)) {
            validationErrors.gender = 'Select a valid gender';
        }

        setEditPatientErrors(validationErrors);
        return Object.keys(validationErrors).length === 0;
    };

    const handleEditPatientSubmit = async (event) => {
        event.preventDefault();
        if (!validateEditPatientForm()) return;
        if (!actionPatient?.id) {
            setEditPatientApiError('Unable to identify patient. Please try again.');
            return;
        }

        try {
            setIsEditingPatient(true);
            setEditPatientApiError('');

            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Authentication required. Please log in again.');
            }

            const payload = {
                name: String(editPatientForm.name || '').trim(),
                phone: String(editPatientForm.phone || '').trim(),
                age: String(editPatientForm.age || '').trim() ? Number(editPatientForm.age) : null,
                gender: editPatientForm.gender || undefined,
                notes: String(editPatientForm.notes || '').trim(),
            };

            const response = await fetch(`${API_BASE}/doctors/patients/${actionPatient.id}`, {
                method: 'PUT',
                credentials: 'omit',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.success) {
                throw new Error(data?.message || 'Error updating patient');
            }

            setIsEditModalOpen(false);
            setEditPatientForm(createInitialPatientForm());
            setEditPatientErrors({});
            setEditPatientApiError('');
            setActionPatient(null);
            setSuccessMessage('Patient updated successfully');

            if (selectedPatient?.id === actionPatient.id) {
                setSelectedPatient((prev) => prev ? {
                    ...prev,
                    name: payload.name,
                    phone: payload.phone,
                    age: payload.age ?? 'N/A',
                    gender: payload.gender || prev.gender,
                    notes: payload.notes,
                } : prev);
            }

            await fetchPatients();
        } catch (updateError) {
            console.error('[AllPatients] Error updating patient:', updateError);
            setEditPatientApiError(updateError?.message || 'Error updating patient');
        } finally {
            setIsEditingPatient(false);
        }
    };

    const openDeletePatientModal = (patient) => {
        if (!patient) return;
        setActionPatient(patient);
        setDeletePatientError('');
        setIsDeleteModalOpen(true);
    };

    const closeDeletePatientModal = () => {
        if (isDeletingPatient) return;
        setIsDeleteModalOpen(false);
        setDeletePatientError('');
        setActionPatient(null);
    };

    const handleDeletePatientConfirm = async () => {
        if (!actionPatient?.id) {
            setDeletePatientError('Unable to identify patient. Please try again.');
            return;
        }

        try {
            setIsDeletingPatient(true);
            setDeletePatientError('');

            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Authentication required. Please log in again.');
            }

            const response = await fetch(`${API_BASE}/doctors/patients/${actionPatient.id}`, {
                method: 'DELETE',
                credentials: 'omit',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.success) {
                throw new Error(data?.message || 'Error deleting patient');
            }

            setIsDeleteModalOpen(false);
            setDeletePatientError('');
            setSuccessMessage('Patient deleted successfully');

            if (selectedPatient?.id === actionPatient.id) {
                setSelectedPatient(null);
                setIsDrawerOpen(false);
            }

            setActionPatient(null);
            await fetchPatients();
        } catch (deleteError) {
            console.error('[AllPatients] Error deleting patient:', deleteError);
            setDeletePatientError(deleteError?.message || 'Error deleting patient');
        } finally {
            setIsDeletingPatient(false);
        }
    };


    const handleDownloadTemplate = () => {
        const csvContent = "data:text/csv;charset=utf-8,Name,Email,Phone,Age,Gender,Notes\\nJane Doe,jane@example.com,1234567890,30,Female,Patient notes\\nJohn Smith,john@example.com,9876543210,40,Male,Other notes";
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "patient_bulk_upload_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleBulkUpload = async () => {
        if (!bulkFile) {
            setBulkUploadError('Please select a file to upload.');
            return;
        }

        setIsBulkUploading(true);
        setBulkUploadError('');
        setBulkUploadResult('');

        try {
            const data = await bulkFile.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const parsedData = XLSX.utils.sheet_to_json(sheet);

            if (parsedData.length === 0) {
                throw new Error('The uploaded file is empty.');
            }

            const payloadPatients = parsedData.map((row, index) => {
                if (!row.Name || !row.Phone) {
                    throw new Error(`Missing required fields (Name or Phone) in row ${index + 2}.`);
                }
                const phoneStr = String(row.Phone).trim();
                const genderRaw = String(row.Gender || 'Male').trim();
                let gender = 'Male';
                if (/^female$/i.test(genderRaw)) gender = 'Female';
                if (/^other$/i.test(genderRaw)) gender = 'Other';

                return {
                    name: String(row.Name || '').trim(),
                    email: String(row.Email || '').trim() || undefined,
                    phone: phoneStr,
                    age: row.Age ? Number(row.Age) : undefined,
                    gender: gender,
                    notes: String(row.Notes || '').trim() || undefined
                };
            });

            const token = localStorage.getItem('token');
            let successful = 0;
            let failed = 0;
            
            for (const patient of payloadPatients) {
                try {
                    const res = await fetch(`${API_BASE}/doctors/patients`, {
                        method: 'POST',
                        credentials: 'omit',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(patient)
                    });
                    const resData = await res.json().catch(() => ({}));
                    if (!res.ok || !resData.success) throw new Error(resData?.message || 'Failed');
                    successful++;
                } catch (e) {
                    console.error('Failed to add row:', patient, e);
                    failed++;
                }
            }

            if (successful > 0) {
                setBulkUploadResult(`Successfully added ${successful} patients.${failed > 0 ? ` Failed to add ${failed} patients.` : ''}`);
                await fetchPatients();
                setTimeout(() => {
                    setIsBulkModalOpen(false);
                    setBulkFile(null);
                    setBulkUploadResult('');
                }, 2000);
            } else {
                throw new Error(`Failed to add any patients. ${failed} rows failed.`);
            }
        } catch (error) {
            console.error('[BulkUpload ERROR]', error);
            setBulkUploadError(error?.message || 'Error processing file.');
        } finally {
            setIsBulkUploading(false);
        }
    };

    return (
        <div className="w-full relative z-10 space-y-6 font-inter bg-transparent">
            {successMessage && (
                <div className="fixed top-4 right-4 z-[70] bg-white dark:bg-[#1A1A1A] border border-green-200 dark:border-green-500/30 text-green-700 dark:text-green-300 px-4 py-2 rounded-lg shadow-lg">
                    <p className="text-sm font-semibold">{successMessage}</p>
                </div>
            )}
            {/* 1ï¸âƒ£ Filter Bar Header */}
            <div className="bg-white dark:bg-white/5 dark:backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm dark:shadow-lg">
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                        <h1 className="text-xl font-semibold text-slate-900 dark:text-white tracking-wide">All Patients</h1>
                        <div className="flex items-center gap-3">
                                                        <button
                                onClick={() => { setIsBulkModalOpen(true); setBulkUploadError(''); setBulkUploadResult(''); setBulkFile(null); }}
                                className="bg-white dark:bg-white/10 hover:bg-gray-50 dark:hover:bg-white/20 border border-gray-200 dark:border-white/10 text-slate-700 dark:text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all"
                            >
                                <Upload className="h-4 w-4" />
                                Bulk Upload
                            </button>
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                                    className="bg-white dark:bg-white/10 hover:bg-gray-50 dark:hover:bg-white/20 border border-gray-200 dark:border-white/10 text-slate-700 dark:text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all"
                                >
                                    <Download className="h-4 w-4" />
                                    <span>Export {selectedPatients.length > 0 ? `(${selectedPatients.length})` : ''}</span>
                                    <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ${isExportDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isExportDropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-white/10 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="p-1.5 space-y-0.5">
                                            <button
                                                onClick={() => handleExport('pdf')}
                                                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-all"
                                            >
                                                <div className="h-7 w-7 flex items-center justify-center bg-rose-50 dark:bg-rose-900/40 rounded-lg group-hover:scale-110 transition-transform">
                                                    <FileText className="h-3.5 w-3.5 text-rose-500" />
                                                </div>
                                                <span className="font-semibold">Export as PDF</span>
                                            </button>

                                            <button
                                                onClick={() => handleExport('excel')}
                                                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-all"
                                            >
                                                <div className="h-7 w-7 flex items-center justify-center bg-emerald-50 dark:bg-emerald-900/40 rounded-lg group-hover:scale-110 transition-transform">
                                                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
                                                </div>
                                                <span className="font-semibold">Export as Excel</span>
                                            </button>

                                            <button
                                                onClick={() => handleExport('csv')}
                                                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-all"
                                            >
                                                <div className="h-7 w-7 flex items-center justify-center bg-blue-50 dark:bg-blue-900/40 rounded-lg group-hover:scale-110 transition-transform">
                                                    <FileCode className="h-3.5 w-3.5 text-blue-500" />
                                                </div>
                                                <span className="font-semibold">Export as CSV</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={openAddPatientModal}
                                className="bg-primary text-white px-5 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all hover:scale-105 duration-200 shadow-lg shadow-primary/20"
                            >
                                <Plus className="h-4 w-4" />
                                Add Patient
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        {/* Search Input */}
                        <div className="relative flex-1 min-w-[200px] max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search patients..."
                                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-primary transition-all"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                            />
                        </div>

                        {/* Filter Icon Separator */}
                        <div className="hidden sm:block w-px h-6 bg-gray-200 dark:bg-white/10 mx-2"></div>

                        {/* Dropdown Filters */}
                        <div className="flex flex-wrap items-center gap-3">
                            <select
                                className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 cursor-pointer min-w-[130px] shadow-sm selection-feedback"
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                            >
                                <option value="All" className="bg-white dark:bg-[#1a1a1a]">All Status</option>
                                <option value="Active" className="bg-white dark:bg-[#1a1a1a]">Active</option>
                                <option value="Inactive" className="bg-white dark:bg-[#1a1a1a]">Inactive</option>
                            </select>

                            <select
                                className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 cursor-pointer min-w-[130px] shadow-sm selection-feedback"
                                value={genderFilter}
                                onChange={(e) => {
                                    setGenderFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                            >
                                <option value="All" className="bg-white dark:bg-[#1a1a1a]">All Genders</option>
                                <option value="Male" className="bg-white dark:bg-[#1a1a1a]">Male</option>
                                <option value="Female" className="bg-white dark:bg-[#1a1a1a]">Female</option>
                                <option value="Other" className="bg-white dark:bg-[#1a1a1a]">Other</option>
                            </select>

                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none">
                                    <Calendar className="h-3.5 w-3.5" />
                                </span>
                                <input
                                    type="date"
                                    className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm font-medium text-slate-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 cursor-pointer min-w-[150px] shadow-sm"
                                    value={dateFilter}
                                    onChange={(e) => {
                                        setDateFilter(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                />
                            </div>

                            <select
                                className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 cursor-pointer min-w-[130px] shadow-sm selection-feedback"
                                value={sortBy}
                                onChange={(e) => {
                                    setSortBy(e.target.value);
                                    setCurrentPage(1);
                                }}
                            >
                                <option value="createdAt" className="bg-white dark:bg-[#1a1a1a]">Newest Joined</option>
                                <option value="name" className="bg-white dark:bg-[#1a1a1a]">Sort by Name</option>
                                <option value="age" className="bg-white dark:bg-[#1a1a1a]">Sort by Age</option>
                                <option value="lastVisit" className="bg-white dark:bg-[#1a1a1a]">Sort by Last Visit</option>
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
                                    className="px-3 py-2 text-sm font-bold text-primary hover:bg-primary-50 dark:hover:bg-primary/10 rounded-lg transition-all"
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
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
                    <p className="text-sm font-medium">Error: {error}</p>
                </div>
            )}

            {/* 3ï¸âƒ£ Simple Table */}
            <div className="bg-white dark:bg-white/5 dark:backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-2xl shadow-sm dark:shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-transparent border-b border-gray-200 dark:border-white/10">
                                <th className="pl-6 py-4 w-10">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-gray-300 dark:border-white/20 bg-white dark:bg-white/5 text-primary focus:ring-primary/20 cursor-pointer"
                                        checked={paginatedPatients.length > 0 && paginatedPatients.every((patient) => selectedPatients.includes(patient.id))}
                                        onChange={toggleSelectAll}
                                    />
                                </th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Age</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Phone</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Last Visit</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Next Appointment</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Documents</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5 bg-transparent">
                            {loading ? (
                                <tr>
                                    <td colSpan="9" className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Loading patients...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : currentPatients.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="px-6 py-12 text-center">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">No Patients Assigned Yet</p>
                                    </td>
                                </tr>
                        ) : (
                            paginatedPatients.map((patient) => (
                                <tr
                                    key={patient.id}
                                    className={`border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors duration-300 ${selectedPatients.includes(patient.id) ? 'bg-primary/10 dark:bg-primary/20' : ''}`}
                                >
                                    <td className="pl-6 py-4">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-gray-300 dark:border-white/20 bg-white dark:bg-white/5 text-primary focus:ring-primary/20 cursor-pointer"
                                            checked={selectedPatients.includes(patient.id)}
                                            onChange={() => toggleSelectPatient(patient.id)}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary font-bold text-sm border border-primary/20 dark:border-primary/30 uppercase">
                                                {patient.name.charAt(0)}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold text-slate-900 dark:text-white">{patient.name}</span>
                                                <span className="text-[11px] text-slate-500 dark:text-gray-500 font-medium">#{patient.id.slice(-6).toUpperCase()}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-sm font-medium text-slate-600 dark:text-gray-300">
                                        {Number.isFinite(Number(patient.age)) ? `${patient.age}y` : patient.age}
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-300 font-medium whitespace-nowrap">
                                            <Phone className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                                            {patient.phone}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-300 font-medium whitespace-nowrap">
                                            <Calendar className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                                            {patient.lastVisit === 'N/A' ? 'Never' : patient.lastVisit}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className={`flex items-center gap-2 text-sm font-medium whitespace-nowrap ${patient.hasNextAppointment ? 'text-slate-600 dark:text-gray-300' : 'text-slate-400 dark:text-gray-500'}`}>
                                            {patient.hasNextAppointment && <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />}
                                            <span>{patient.nextAppointment}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2">
                                            <FileText className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                                            <span className="text-sm font-semibold text-slate-700 dark:text-gray-300">{patient.documents}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${patient.status === 'Active'
                                            ? 'bg-primary/10 text-primary dark:text-primary'
                                            : 'bg-gray-500/10 text-gray-600 dark:text-gray-400'
                                            }`}>
                                            {patient.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="relative inline-block text-left">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === patient.id ? null : patient.id); }}
                                                className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-all text-gray-400 dark:text-gray-500"
                                            >
                                                <MoreVertical className="h-5 w-5" />
                                            </button>

                                            {activeMenu === patient.id && (
                                                <>
                                                    <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setActiveMenu(null); }} />
                                                    <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-white/10 rounded-lg shadow-lg z-20 py-1 origin-top-right ring-1 ring-black ring-opacity-5">
                                                        <button onClick={(e) => { e.stopPropagation(); handleViewDetails(patient); setActiveMenu(null); }} className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                                            <Eye className="h-3.5 w-3.5" /> View Details
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openEditPatientModal(patient);
                                                                setActiveMenu(null);
                                                            }}
                                                            disabled={isEditingPatient || isDeletingPatient}
                                                            className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                                        >
                                                            <Edit2 className="h-3.5 w-3.5" /> Edit Patient
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openDeletePatientModal(patient);
                                                                setActiveMenu(null);
                                                            }}
                                                            disabled={isEditingPatient || isDeletingPatient}
                                                            className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                                        >
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
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                    <p className="text-xs text-slate-500 dark:text-gray-500">
                        Page <span className="font-semibold text-slate-900 dark:text-white">{currentPage}</span> of <span className="font-semibold text-slate-900 dark:text-white">{totalPages}</span>
                        {' '}| Total: <span className="font-semibold text-slate-900 dark:text-white">{totalPatients}</span>
                    </p>
                    <div className="flex gap-2">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => handlePageChange(currentPage - 1)}
                            className="p-1.5 border border-gray-200 dark:border-white/10 rounded-xl text-slate-600 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-40 transition-colors"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => handlePageChange(currentPage + 1)}
                            className="p-1.5 border border-gray-200 dark:border-white/10 rounded-xl text-slate-600 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-40 transition-colors"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* 4ï¸âƒ£ Side Drawer */}
            {isAddModalOpen && (
                <>
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40" onClick={closeAddPatientModal} />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="w-full max-w-md bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Add Patient</h2>
                                <button
                                    type="button"
                                    onClick={closeAddPatientModal}
                                    className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors"
                                    disabled={isAddingPatient}
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <form onSubmit={handleAddPatientSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-gray-300 mb-1.5">Full Name *</label>
                                    <input
                                        type="text"
                                        value={addPatientForm.name}
                                        onChange={(e) => handleAddPatientFieldChange('name', e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                                        placeholder="Enter full name"
                                    />
                                    {addPatientErrors.name && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{addPatientErrors.name}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-gray-300 mb-1.5">Phone Number *</label>
                                    <input
                                        type="text"
                                        value={addPatientForm.phone}
                                        onChange={(e) => handleAddPatientFieldChange('phone', e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                                        placeholder="Enter phone number"
                                    />
                                    {addPatientErrors.phone && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{addPatientErrors.phone}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-gray-300 mb-1.5">Age</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={addPatientForm.age}
                                        onChange={(e) => handleAddPatientFieldChange('age', e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                                        placeholder="Enter age"
                                    />
                                    {addPatientErrors.age && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{addPatientErrors.age}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-gray-300 mb-1.5">Gender</label>
                                    <select
                                        value={addPatientForm.gender}
                                        onChange={(e) => handleAddPatientFieldChange('gender', e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                                    >
                                        <option value="Male" className="bg-white dark:bg-[#1a1a1a]">Male</option>
                                        <option value="Female" className="bg-white dark:bg-[#1a1a1a]">Female</option>
                                        <option value="Other" className="bg-white dark:bg-[#1a1a1a]">Other</option>
                                    </select>
                                    {addPatientErrors.gender && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{addPatientErrors.gender}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-gray-300 mb-1.5">Notes</label>
                                    <textarea
                                        value={addPatientForm.notes}
                                        onChange={(e) => handleAddPatientFieldChange('notes', e.target.value)}
                                        rows={3}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary resize-none"
                                        placeholder="Add notes (optional)"
                                    />
                                </div>

                                {addPatientApiError && (
                                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 px-3 py-2 rounded-lg">
                                        <p className="text-xs font-medium">{addPatientApiError}</p>
                                    </div>
                                )}

                                <div className="pt-2 flex items-center justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={closeAddPatientModal}
                                        disabled={isAddingPatient}
                                        className="px-4 py-2 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-semibold text-slate-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-60"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isAddingPatient}
                                        className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        {isAddingPatient ? 'Saving...' : 'Add Patient'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </>
            )}

            {isEditModalOpen && (
                <>
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40" onClick={closeEditPatientModal} />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="w-full max-w-md bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Edit Patient</h2>
                                <button
                                    type="button"
                                    onClick={closeEditPatientModal}
                                    className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors"
                                    disabled={isEditingPatient}
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <form onSubmit={handleEditPatientSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-gray-300 mb-1.5">Full Name *</label>
                                    <input
                                        type="text"
                                        value={editPatientForm.name}
                                        onChange={(e) => handleEditPatientFieldChange('name', e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                                        placeholder="Enter full name"
                                    />
                                    {editPatientErrors.name && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{editPatientErrors.name}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-gray-300 mb-1.5">Phone Number *</label>
                                    <input
                                        type="text"
                                        value={editPatientForm.phone}
                                        onChange={(e) => handleEditPatientFieldChange('phone', e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                                        placeholder="Enter phone number"
                                    />
                                    {editPatientErrors.phone && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{editPatientErrors.phone}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-gray-300 mb-1.5">Age</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={editPatientForm.age}
                                        onChange={(e) => handleEditPatientFieldChange('age', e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                                        placeholder="Enter age"
                                    />
                                    {editPatientErrors.age && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{editPatientErrors.age}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-gray-300 mb-1.5">Gender</label>
                                    <select
                                        value={editPatientForm.gender}
                                        onChange={(e) => handleEditPatientFieldChange('gender', e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                                    >
                                        <option value="Male" className="bg-white dark:bg-[#1a1a1a]">Male</option>
                                        <option value="Female" className="bg-white dark:bg-[#1a1a1a]">Female</option>
                                        <option value="Other" className="bg-white dark:bg-[#1a1a1a]">Other</option>
                                    </select>
                                    {editPatientErrors.gender && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{editPatientErrors.gender}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-gray-300 mb-1.5">Notes</label>
                                    <textarea
                                        value={editPatientForm.notes}
                                        onChange={(e) => handleEditPatientFieldChange('notes', e.target.value)}
                                        rows={3}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary resize-none"
                                        placeholder="Add notes (optional)"
                                    />
                                </div>

                                {editPatientApiError && (
                                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 px-3 py-2 rounded-lg">
                                        <p className="text-xs font-medium">{editPatientApiError}</p>
                                    </div>
                                )}

                                <div className="pt-2 flex items-center justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={closeEditPatientModal}
                                        disabled={isEditingPatient}
                                        className="px-4 py-2 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-semibold text-slate-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-60"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isEditingPatient}
                                        className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        {isEditingPatient ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </>
            )}

            {isDeleteModalOpen && (
                <>
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40" onClick={closeDeletePatientModal} />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="w-full max-w-sm bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Delete Patient</h2>
                                <button
                                    type="button"
                                    onClick={closeDeletePatientModal}
                                    className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors"
                                    disabled={isDeletingPatient}
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="px-6 py-5 space-y-4">
                                <p className="text-sm text-slate-700 dark:text-gray-300">
                                    Are you sure you want to delete this patient?
                                </p>
                                {deletePatientError && (
                                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 px-3 py-2 rounded-lg">
                                        <p className="text-xs font-medium">{deletePatientError}</p>
                                    </div>
                                )}
                                <div className="pt-1 flex items-center justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={closeDeletePatientModal}
                                        disabled={isDeletingPatient}
                                        className="px-4 py-2 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-semibold text-slate-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-60"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDeletePatientConfirm}
                                        disabled={isDeletingPatient}
                                        className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        {isDeletingPatient ? 'Deleting...' : 'Delete'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {isDrawerOpen && (
                <>
                    <div className="fixed inset-0 bg-slate-950/40 dark:bg-black/60 backdrop-blur-[2px] z-40 transition-opacity" onClick={() => setIsDrawerOpen(false)} />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="w-full max-w-md bg-white dark:bg-[#121212] shadow-2xl border border-gray-200 dark:border-white/10 rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white tracking-wide">Patient Profile</h2>
                                <button onClick={() => setIsDrawerOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full text-gray-400 transition-colors">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="flex flex-col items-center mb-10 pt-4">
                                <h3 className="text-xl font-semibold text-slate-900 dark:text-white tracking-wide">{selectedPatient?.name}</h3>
                                <p className="text-sm font-medium text-slate-500 dark:text-gray-500 mt-1">ID: #{selectedPatient?.id.slice(-6).toUpperCase()}</p>
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                                        <p className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-1">Age / Gender</p>
                                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{selectedPatient?.age} / {selectedPatient?.gender}</p>
                                    </div>
                                    <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                                        <p className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-1">Blood Group</p>
                                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{selectedPatient?.bloodType || 'N/A'}</p>
                                    </div>
                                </div>

                                <div className="p-5 border border-gray-100 dark:border-white/5 rounded-xl space-y-4 bg-gray-50 dark:bg-white/5">
                                    <div className="flex items-center gap-3">
                                        <Phone className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                        <span className="text-sm font-medium text-slate-700 dark:text-gray-300">{selectedPatient?.phone}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Mail className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                        <span className="text-sm font-medium text-slate-700 dark:text-gray-300">{selectedPatient?.email}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                        <span className="text-sm font-medium text-slate-700 dark:text-gray-300">Last visit: {selectedPatient?.lastVisit}</span>
                                    </div>
                                    <div className="border-t border-gray-200 dark:border-white/10 pt-3">
                                        <p className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-1">Notes</p>
                                        <p className="text-sm font-medium text-slate-700 dark:text-gray-300 whitespace-pre-wrap">
                                            {selectedPatient?.notes ? selectedPatient.notes : 'N/A'}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => openEditPatientModal(selectedPatient)}
                                    className="w-full bg-primary text-white py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-primary/20"
                                >
                                    <Edit2 className="h-4 w-4" />
                                    Edit Full Record
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        
            {/* Bulk Upload Modal */}
            {isBulkModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm" onClick={() => !isBulkUploading && setIsBulkModalOpen(false)}></div>
                    <div className="relative bg-white dark:bg-[#1A1A1A] rounded-2xl w-full max-w-md shadow-2xl dark:shadow-black/50 border border-gray-100 dark:border-white/10 overflow-hidden transform transition-all">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/10 bg-slate-50/50 dark:bg-white/5">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Bulk Upload Patients</h3>
                            <button onClick={() => !isBulkUploading && setIsBulkModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-6">
                            {/* Instructions */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
                                <p className="text-sm text-blue-800 dark:text-blue-300 font-medium mb-2">Upload multiple patients via Excel/CSV.</p>
                                <ul className="text-xs text-blue-700/80 dark:text-blue-400/80 list-disc ml-4 space-y-1">
                                    <li>Required columns: <strong className="text-gray-900 dark:text-white/80">Name, Phone</strong></li>
                                    <li>Optional columns: <strong className="text-gray-900 dark:text-white/80">Age, Gender, Notes, Email</strong></li>
                                </ul>
                                <button onClick={handleDownloadTemplate} className="mt-3 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                                    <Download className="h-3 w-3" /> Download Sample Template
                                </button>
                            </div>

                            {/* File Upload Area */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-2">Select Excel / CSV File</label>
                                <div className="relative flex items-center justify-center w-full">
                                    <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer ${bulkFile ? 'border-primary bg-primary/5' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-white/5'} transition-colors`}>
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <Upload className={`w-8 h-8 mb-3 ${bulkFile ? 'text-primary' : 'text-gray-400'}`} />
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {bulkFile ? <span className="font-semibold text-primary">{bulkFile.name}</span> : <span><span className="font-semibold">Click to upload</span> or drag and drop</span>}
                                            </p>
                                            {!bulkFile && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">.xlsx or .csv only</p>}
                                        </div>
                                        <input type="file" className="hidden" accept=".xlsx, .csv" onChange={(e) => { setBulkFile(e.target.files[0]); setBulkUploadError(''); }} disabled={isBulkUploading} />
                                    </label>
                                </div>
                            </div>

                            {/* Feedback Messages */}
                            {bulkUploadError && (
                                <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-red-800/50">
                                    {bulkUploadError}
                                </div>
                            )}
                            {bulkUploadResult && (
                                <div className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-3 rounded-xl border border-green-100 dark:border-green-800/50">
                                    {bulkUploadResult}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    onClick={() => !isBulkUploading && setIsBulkModalOpen(false)}
                                    disabled={isBulkUploading}
                                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-gray-300 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleBulkUpload}
                                    disabled={!bulkFile || isBulkUploading}
                                    className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center min-w-[120px]"
                                >
                                    {isBulkUploading ? (
                                        <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        'Upload Data'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AllPatients;
