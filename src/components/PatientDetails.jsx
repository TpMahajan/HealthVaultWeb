import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Calendar,
  FileText,
  Download,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  FileImage,
  FileText as FileTextIcon,
  Loader,
  Upload,
  Plus,
  MessageCircle,
  Activity,
  History,
  ChevronDown,
  MoreHorizontal,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import MedicalRecordsModal from './MedicalRecordsModal';
import DocumentUploadModal from './DocumentUploadModal';
import AppointmentModal from './AppointmentModal';
import AIAssistant from './AIAssistant';
import AnimatedChatButton from './AnimatedChatButton';
import { generatePatientSummaryPDF } from '../utils/pdfGenerator';
import { API_BASE } from '../constants/api';

const PatientDetails = () => {
  const isDev = import.meta.env.DEV;
  const debugLog = (...args) => {
    if (isDev) console.log(...args);
  };
  const createInlinePreviewState = () => ({
    visible: false,
    loading: false,
    error: '',
    previewType: null,
    url: '',
    title: '',
    fileName: '',
    mimeType: '',
    size: null,
    downloadUrl: '',
    record: null
  });
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setToastNotification } = useNotifications();
  const [patient, setPatient] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRecordsModal, setShowRecordsModal] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(null);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [isAnonymousView, setIsAnonymousView] = useState(false);
  const [inlinePreview, setInlinePreview] = useState(createInlinePreviewState());
  const [appointments, setAppointments] = useState([]);
  const [isCachedData, setIsCachedData] = useState(false);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsSearchTerm, setRecordsSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showSessionExpiredPopup, setShowSessionExpiredPopup] = useState(false);
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [showSessionDropdown, setShowSessionDropdown] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [isEndModalOpen, setIsEndModalOpen] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const [profileImageLoadFailed, setProfileImageLoadFailed] = useState(false);
  const [profileImageCandidateIndex, setProfileImageCandidateIndex] = useState(0);
  const previewRequestIdRef = useRef(0);
  const previewObjectUrlRef = useRef('');
  const actionsDropdownRef = useRef(null);
  const sessionDropdownRef = useRef(null);

  const showSessionToast = (type, message) => {
    const toastId = `session-toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const titleByType = {
      success: 'Success',
      error: 'Error',
      warning: 'Warning'
    };

    setToastNotification({
      id: toastId,
      title: titleByType[type] || 'Notice',
      message,
      body: message,
      type
    });

    window.setTimeout(() => {
      setToastNotification((current) => (current?.id === toastId ? null : current));
    }, 5000);
  };

  const resolveSessionId = (session) => String(
    session?._id || session?.sessionId || session?.id || ''
  ).trim();

  const isValidSessionId = (sessionId) => /^[0-9a-fA-F]{24}$/.test(sessionId);

  const revokePreviewObjectUrl = (targetUrl = null) => {
    const urlToRevoke = targetUrl || previewObjectUrlRef.current;
    if (urlToRevoke && String(urlToRevoke).startsWith('blob:')) {
      window.URL.revokeObjectURL(urlToRevoke);
    }
    if (!targetUrl || previewObjectUrlRef.current === targetUrl) {
      previewObjectUrlRef.current = '';
    }
  };

  const closeInlinePreview = () => {
    previewRequestIdRef.current += 1;
    revokePreviewObjectUrl();
    setInlinePreview(createInlinePreviewState());
  };

  useEffect(() => {
    return () => {
      previewRequestIdRef.current += 1;
      revokePreviewObjectUrl();
    };
  }, []);

  useEffect(() => {
    setProfileImageLoadFailed(false);
    setProfileImageCandidateIndex(0);
  }, [
    patient?.id,
    patient?.profileImage,
    patient?.profilePictureUrl,
    patient?.profilePicture,
    patient?.avatar,
    patient?.avatarUrl,
    patient?.photoUrl
  ]);

  useEffect(() => {
    if (!showActionsDropdown && !showSessionDropdown) return undefined;

    const handleClickOutsideDropdowns = (event) => {
      const target = event.target;
      const clickedActions = actionsDropdownRef.current?.contains(target);
      const clickedSession = sessionDropdownRef.current?.contains(target);

      if (!clickedActions && !clickedSession) {
        setShowActionsDropdown(false);
        setShowSessionDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutsideDropdowns);
    document.addEventListener('touchstart', handleClickOutsideDropdowns);
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideDropdowns);
      document.removeEventListener('touchstart', handleClickOutsideDropdowns);
    };
  }, [showActionsDropdown, showSessionDropdown]);


  // Fetch patient data from API
  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Role detection with proper priority
        const urlToken = null;
        const storedToken = localStorage.getItem("token");
        const storedRole = localStorage.getItem("role");

        const hasUrlAnonToken = !!urlToken;
        const isDoctor = !hasUrlAnonToken && storedToken && storedRole === "doctor";
        const isPatient = !hasUrlAnonToken && storedToken && storedRole === "patient";
        const isAnonymous = false;

        debugLog('PatientDetails role detection', {
          isDoctor,
          isPatient,
          isAnonymous,
          hasStoredToken: !!storedToken,
          hasUrlToken: !!urlToken,
          storedRole,
          urlToken: urlToken ? urlToken.substring(0, 20) + '...' : null
        });

        // Additional debugging for anonymous access
        if (urlToken) {
          try {
            const tokenPayload = JSON.parse(atob(urlToken.split('.')[1] || ''));
            console.log('🔍 PatientDetails - URL token payload:', tokenPayload);
          } catch (e) {
            console.error('❌ PatientDetails - Failed to decode URL token:', e);
          }
        }

        setIsAnonymousView(isAnonymous);

        let apiUrl = '';
        let headers = { 'Content-Type': 'application/json' };

        if (isDoctor) {
          console.log('🔐 PatientDetails - Doctor access flow');
          apiUrl = `${API_BASE}/users/${id}`;
          headers['Authorization'] = `Bearer ${storedToken}`;
        } else if (isPatient) {
          console.log('👤 PatientDetails - Patient self-access flow');
          apiUrl = `${API_BASE}/auth/me`;
          headers['Authorization'] = `Bearer ${storedToken}`;
        } else {
          setError('No valid access method found. Please log in.');
          setLoading(false);
          return;
        }

        debugLog("Calling patient API", apiUrl);

        const response = await fetch(apiUrl, { headers });
        const data = await response.json();

        debugLog('PatientDetails API response', {
          status: response.status,
          ok: response.ok,
          data: data
        });

        if (!response.ok) {
          console.error('❌ PatientDetails - API error:', data);
          setError(data.message || `Failed to fetch patient data: ${response.status}`);
          setLoading(false);
          return;
        }

        if (data.success) {
          let user = null;
          if (isPatient) {
            // For /auth/me, user is nested under data.data
            user = data.data?.user;
            console.log('👤 PatientDetails - Patient self-access user data:', user);
          } else {
            // For /users/:id, user is nested under data.data.user
            user = data.data?.user || data.data;
            console.log('🔍 PatientDetails - Direct user data:', user);
            console.log('🔍 PatientDetails - Full data structure:', data.data);
          }

          if (user) {
            // Debug logging for anonymous access
            if (isAnonymous) {
              console.log('👻 Frontend - Raw user data from API:', user);
              console.log('👻 Frontend - Medications:', user.medications);
              console.log('👻 Frontend - Medical History:', user.medicalHistory);
              console.log('👻 Frontend - Allergies:', user.allergies);
              console.log('👻 Frontend - Emergency Contact:', user.emergencyContact);
            }

            // Explicitly extract allergies first - this is critical for anonymous access
            const userAllergies = user.allergies;
            console.log('🔍 Extracting allergies - user.allergies:', userAllergies, 'type:', typeof userAllergies, 'exists:', 'allergies' in user);

            // Build patientData object
            const patientData = {
              id: user._id || user.id,
              name: user.name || 'Unknown',
              age: user.age || null,
              allergies: userAllergies || null,
              gender: user.gender || null,
              dateOfBirth: user.dateOfBirth || null,
              bloodType: user.bloodType || null,
              height: user.height || null,
              weight: user.weight || null,
              email: user.email || null,
              mobile: user.mobile || null,
              lastVisit: user.lastVisit || null,
              nextAppointment: user.nextAppointment || null,
              emergencyContact: user.emergencyContact || {
                name: null,
                relationship: null,
                phone: null
              },
              medicalHistory: Array.isArray(user.medicalHistory) ? user.medicalHistory : [],
              medications: Array.isArray(user.medications) ? user.medications : [],
              medicalRecords: user.medicalRecords || [],
              profileImage: user.profileImage || null,
              profilePicture: user.profilePicture || user.profileImage || null,
              profilePictureUrl:
                user.profilePictureUrl ||
                user.profilePictureURL ||
                user.photoUrl ||
                null,
              avatar: user.avatar || null,
              avatarUrl: user.avatarUrl || null,
              photoUrl: user.photoUrl || null
            };

            // Explicitly set allergies AFTER creating the object to ensure it's never lost
            if (userAllergies !== null && userAllergies !== undefined) {
              patientData.allergies = String(userAllergies);
            } else {
              patientData.allergies = '';
            }

            console.log('🔍 After creating patientData - allergies:', patientData.allergies, 'has property:', 'allergies' in patientData);
            console.log('🔍 patientData object keys:', Object.keys(patientData));

            // Final verification
            console.log('✅ PatientDetails - Processed patient data:', patientData);
            console.log('✅ PatientDetails - Allergies in patientData:', patientData.allergies, 'type:', typeof patientData.allergies);
            console.log('✅ PatientDetails - Has allergies property:', 'allergies' in patientData);

            if (isAnonymous) {
              console.log('👻 Frontend - Raw user.allergies:', user.allergies, 'type:', typeof user.allergies);
              console.log('👻 Frontend - Processed patientData.allergies:', patientData.allergies, 'type:', typeof patientData.allergies);
              console.log('👻 Frontend - Processed medications:', patientData.medications);
              console.log('👻 Frontend - Processed medical history:', patientData.medicalHistory);
              console.log('👻 Frontend - Processed emergency contact:', patientData.emergencyContact);
              console.log('👻 Frontend - Allergies will display?', patientData.allergies && typeof patientData.allergies === 'string' && patientData.allergies.trim() !== '');
            }

            // Final check before setting state - ensure allergies is present
            if (!('allergies' in patientData)) {
              console.error('❌ CRITICAL: allergies missing from patientData! Adding it now.');
              patientData.allergies = userAllergies ? String(userAllergies) : '';
            }

            // Log final state before setting
            console.log('🎯 Final patientData before setState - allergies:', patientData.allergies, 'has property:', 'allergies' in patientData);
            console.log('🎯 Final patientData keys:', Object.keys(patientData));

            setPatient(patientData);
            setIsCachedData(false);
          } else {
            console.error('❌ PatientDetails - No user data found in response');
            setError("Patient data not found in response.");
          }
        } else {
          console.error('❌ PatientDetails - API returned success: false:', data);
          setError(data.message || "Failed to fetch patient data");
        }
      } catch (err) {
      if (isDev) console.error('PatientDetails fetch error:', err);
        setError("Failed to fetch patient data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchPatientData();
    // Ensure single fetch per id/token by cleaning up race conditions
    return () => {
      setLoading(false);
    };
  }, [id]);

  // Fetch medical records from the new endpoint
  const fetchMedicalRecords = async (patientId) => {
    if (isCachedData) {
      // For cached data, we don't have access to the backend
      setMedicalRecords([]);
      return;
    }

    try {
      setRecordsLoading(true);

      // Use same role detection logic as fetchPatientData
      const urlToken = null;
      const storedToken = localStorage.getItem("token");
      const storedRole = localStorage.getItem("role");

      const hasUrlAnonToken = !!urlToken;
      const isDoctor = !hasUrlAnonToken && storedToken && storedRole === "doctor";
      const isPatient = !hasUrlAnonToken && storedToken && storedRole === "patient";
      const isAnonymous = false;

      console.log('🔍 Fetching medical records for patient:', patientId);
      console.log('🔍 Role detection for records:', { isDoctor, isPatient, isAnonymous });

      let endpoint = '';
      let headers = { 'Content-Type': 'application/json' };

      if (isDoctor) {
        // Doctor: session-validated
        endpoint = `${API_BASE}/users/${patientId}/records`;
        headers['Authorization'] = `Bearer ${storedToken}`;
      } else if (isPatient) {
        // Patient: own files listing
        endpoint = `${API_BASE}/files/user/${patientId}`;
        headers['Authorization'] = `Bearer ${storedToken}`;
      } else {
        console.log('No auth context available for fetching medical records');
        setMedicalRecords([]);
        setRecordsLoading(false);
        return;
      }

      console.log('📡 Calling endpoint:', endpoint, 'headers:', Object.keys(headers));
      const response = await fetch(endpoint, { headers });

      console.log('📡 Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('📋 Response data:', data);

        if (data.success) {
          let allRecords = [];
          // Handle different response structures
          if (data.records) {
            // Grouped structure
            allRecords = [
              ...(data.records.reports || []),
              ...(data.records.prescriptions || []),
              ...(data.records.bills || []),
              ...(data.records.insurance || [])
            ];
          } else if (data.documents) {
            // Direct documents array
            allRecords = data.documents;
          } else if (Array.isArray(data)) {
            // Direct array
            allRecords = data;
          }

          console.log('📄 Records found:', allRecords.length);
          setMedicalRecords(allRecords);
          console.log('✅ Medical records loaded:', allRecords.length, 'records');
        } else {
          console.error('❌ API returned success: false:', data.message);
          setMedicalRecords([]);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Endpoint failed:', endpoint, `HTTP ${response.status}: ${errorData.message || response.statusText}`);
        setMedicalRecords([]);
      }
    } catch (err) {
      console.error('Error fetching medical records:', err);
      setMedicalRecords([]);
    } finally {
      setRecordsLoading(false);
    }
  };

  // Fetch session history (visits) for the patient
  const fetchSessionHistory = async (patientId) => {
    if (isCachedData || isAnonymousView) {
      setSessionHistory([]);
      return;
    }

    try {
      setHistoryLoading(true);
      const token = localStorage.getItem("token");

      console.log('🔍 Fetching session history for patientId:', patientId);

      const response = await fetch(`${API_BASE}/sessions/patient/${patientId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSessionHistory(data.history || []);
          console.log(`✅ Loaded ${data.history?.length || 0} previous sessions`);
        }
      }
    } catch (err) {
      console.error('Error fetching session history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Fetch active session between current doctor and current patient
  const fetchActiveSession = async (patientId) => {
    if (isAnonymousView || isCachedData) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/sessions/patient/${patientId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.history) && data.history.length > 0) {
          const latest = data.history.find((entry) => entry.status === "accepted") || null;
          setActiveSession(latest);
        } else {
          setActiveSession(null);
        }
      }
    } catch (err) {
      console.error('Error fetching active session:', err);
    }
  };

  // Fetch medical records when patient data is loaded
  useEffect(() => {
    if (patient && patient.id) {
      fetchMedicalRecords(patient.id);
      fetchSessionHistory(patient.id);
      fetchActiveSession(patient.id);
    }
    // Avoid duplicate fetches when route re-renders quickly
    // by not depending on isCachedData changes here
  }, [patient]);

  // Debug: Log allergies for anonymous view
  useEffect(() => {
    if (isAnonymousView && patient) {
      console.log('👻 Allergies Debug - patient object:', patient);
      console.log('👻 Allergies Debug - patient.allergies:', patient.allergies);
      console.log('👻 Allergies Debug - type:', typeof patient.allergies);
      console.log('👻 Allergies Debug - is string:', typeof patient.allergies === 'string');
      console.log('👻 Allergies Debug - trimmed length:', patient.allergies ? patient.allergies.trim().length : 0);
      console.log('👻 Allergies Debug - should display:', patient.allergies && typeof patient.allergies === 'string' && patient.allergies.trim() !== '');
    }
  }, [patient, isAnonymousView]);

  // Monitor doctor's active status and show popup if they go inactive
  useEffect(() => {
    if (user?.isActive === false && !isAnonymousView) {
      setShowSessionExpiredPopup(true);
    }
  }, [user?.isActive, isAnonymousView]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'reviewed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'active':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'controlled':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'reviewed':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'active':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'pdf':
        return <FileTextIcon className="h-5 w-5 text-red-500" />;
      case 'image':
        return <FileImage className="h-5 w-5 text-blue-500" />;
      default:
        return <FileTextIcon className="h-5 w-5 text-gray-500 dark:text-gray-400 dark:text-gray-500" />;
    }
  };

  const handleViewAllRecords = () => {
    setShowRecordsModal(true);
  };

  const handleCloseRecordsModal = () => {
    setShowRecordsModal(false);
  };

  // Helper: fetch signed preview URL for a document
  const getSignedPreviewUrl = async (docId, token) => {
    let res;
    try {
      const url = `${API_BASE}/files/${docId}/preview`;
      const options = { method: 'GET', mode: 'cors', redirect: 'follow' };
      if (token) {
        options.headers = { 'Authorization': `Bearer ${token}` };
      }
      res = await fetch(url, options);
    } catch (e) {
      throw new Error('Network error while fetching preview URL');
    }
    if (!res.ok) {
      let message = `HTTP ${res.status}: ${res.statusText || 'Preview failed'}`;
      try {
        const data = await res.json();
        message = data.message || data.msg || message;
      } catch { }
      throw new Error(message);
    }
    const data = await res.json();
    const resolvedUrl =
      data?.signedUrl ||
      data?.fileUrl ||
      data?.documentUrl ||
      data?.url ||
      data?.proxyUrl ||
      null;
    if (!resolvedUrl) throw new Error('No file URL received');
    return resolvedUrl;
  };

  // Helper: fetch signed download URL for a document
  const getSignedDownloadUrl = async (docId, token) => {
    let res;
    try {
      const url = `${API_BASE}/files/${docId}/download?json=true`;
      const options = { method: 'GET', mode: 'cors', redirect: 'follow' };
      if (token) {
        options.headers = { 'Authorization': `Bearer ${token}` };
      }
      res = await fetch(url, options);
    } catch (e) {
      throw new Error('Network error while fetching download URL');
    }
    if (!res.ok) {
      let message = `HTTP ${res.status}: ${res.statusText || 'Download failed'}`;
      try {
        const data = await res.json();
        message = data.message || data.msg || message;
      } catch { }
      throw new Error(message);
    }
    const data = await res.json();
    const resolvedUrl =
      data?.signedUrl ||
      data?.fileUrl ||
      data?.documentUrl ||
      data?.url ||
      data?.proxyUrl ||
      null;
    if (!resolvedUrl) throw new Error('No file URL received');
    return resolvedUrl;
  };

  // Resolve a usable file URL from common record fields
  const normalizeFileUrl = (rawUrl) => {
    if (!rawUrl || typeof rawUrl !== 'string') return null;
    const trimmed = rawUrl.trim().replace(/\\/g, '/');
    if (!trimmed) return null;

    if (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('blob:') ||
      trimmed.startsWith('data:')
    ) {
      return trimmed;
    }

    if (trimmed.startsWith('/')) {
      const apiRoot = String(API_BASE || '').replace(/\/api\/?$/, '');
      return `${apiRoot}${trimmed}`;
    }

    if (trimmed.startsWith('uploads/')) {
      const apiRoot = String(API_BASE || '').replace(/\/api\/?$/, '');
      return `${apiRoot}/${trimmed}`;
    }

    return trimmed;
  };

  const resolveProfileImageUrl = (rawUrl) => {
    const raw = String(rawUrl || '').trim().replace(/\\/g, '/');
    if (!raw) return null;
    const lower = raw.toLowerCase();
    if (lower === 'null' || lower === 'undefined') return null;

    if (
      /^(https?:)?\/\//i.test(raw) ||
      raw.startsWith('data:') ||
      raw.startsWith('blob:')
    ) {
      return raw;
    }

    const apiRoot = String(API_BASE || '').replace(/\/api\/?$/, '');
    if (raw.startsWith('/uploads/')) return `${apiRoot}${raw}`;
    if (raw.startsWith('uploads/')) return `${apiRoot}/${raw}`;
    if (raw.startsWith('/')) return `${apiRoot}${raw}`;
    return `${apiRoot}/uploads/${raw}`;
  };

  const resolveDocumentUrl = (doc) => {
    const candidates = [
      doc?.fileUrl,
      doc?.documentUrl,
      doc?.url,
      doc?.location,
      doc?.signedUrl,
      doc?.secureUrl,
      doc?.publicUrl,
      doc?.previewUrl,
      doc?.downloadUrl,
      doc?.file?.url,
      doc?.file?.fileUrl,
      doc?.path,
      doc?.filePath,
      doc?.filename,
      doc?.fileName
    ];

    for (const candidate of candidates) {
      const normalized = normalizeFileUrl(candidate);
      if (normalized) return normalized;
    }

    return null;
  };

  const resolveDocumentFileName = (doc, fileUrl = '') => {
    const fromDoc =
      doc?.fileName ||
      doc?.originalName ||
      doc?.title ||
      doc?.name ||
      'document';

    let fileName = String(fromDoc).trim() || 'document';
    const baseUrl = String(fileUrl || '').split('?')[0];
    const urlPart = baseUrl.split('/').pop() || '';
    const decodedUrlPart = decodeURIComponent(urlPart);

    if (decodedUrlPart && decodedUrlPart.includes('.')) {
      const hasExtension = /\.[a-z0-9]+$/i.test(fileName);
      if (!hasExtension) {
        const ext = decodedUrlPart.split('.').pop();
        if (ext) fileName = `${fileName}.${ext}`;
      }
    }

    return fileName;
  };

  const getPreviewType = (doc, fileUrl) => {
    const mimeType = String(doc?.mimeType || doc?.fileType || '').toLowerCase();
    const urlWithoutQuery = String(fileUrl || '').split('?')[0].toLowerCase();
    const isPdf = mimeType.includes('pdf') || urlWithoutQuery.endsWith('.pdf');
    const isImage =
      mimeType.startsWith('image/') ||
      /\.(jpeg|jpg|png|webp|gif|bmp|svg)$/i.test(urlWithoutQuery);

    return { isPdf, isImage };
  };

  const getResolvedPreviewKind = (doc, fileUrl, detectedMimeType = '') => {
    const normalizedDoc = {
      ...doc,
      mimeType: detectedMimeType || doc?.mimeType || doc?.fileType || ''
    };
    const { isPdf, isImage } = getPreviewType(normalizedDoc, fileUrl);
    if (isImage) return 'image';
    if (isPdf) return 'pdf';
    return 'unsupported';
  };

  const isSignedS3Url = (url = '') => {
    const normalized = String(url || '');
    return /amazonaws\.com/i.test(normalized) && /[?&]X-Amz-(Signature|Credential)=/i.test(normalized);
  };

  const isRawS3ObjectUrl = (url = '') => {
    const normalized = String(url || '');
    return /amazonaws\.com/i.test(normalized) && !isSignedS3Url(normalized);
  };

  const addSecureCandidate = (list, seen, rawUrl, options = {}) => {
    const normalized = normalizeFileUrl(rawUrl);
    if (!normalized) return;

    const {
      requiresAuth = false,
      label = 'candidate',
      allowRawS3 = false
    } = options;

    if (!allowRawS3 && isRawS3ObjectUrl(normalized)) {
      return;
    }

    const computedRequiresAuth = requiresAuth || normalized.startsWith(API_BASE);
    const dedupeKey = `${computedRequiresAuth ? 'auth' : 'public'}|${normalized}`;
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    list.push({ url: normalized, requiresAuth: computedRequiresAuth, label });
  };

  const collectDoctorSecureCandidates = async (doc, token, intent = 'preview', preferredUrl = null) => {
    const candidates = [];
    const seen = new Set();
    const docId = doc?._id;

    const normalizedPreferred = String(preferredUrl || '');
    const isLegacyFailingApiCandidate =
      normalizedPreferred.startsWith(`${API_BASE}/files/`) &&
      (normalizedPreferred.includes('/preview') || normalizedPreferred.includes('/download'));

    if (!isLegacyFailingApiCandidate) {
      addSecureCandidate(candidates, seen, preferredUrl, {
        requiresAuth: normalizedPreferred.startsWith(API_BASE),
        label: 'preferred'
      });
    }

    if (docId) {
      const proxyDisposition = intent === 'download' ? 'attachment' : 'inline';
      addSecureCandidate(candidates, seen, `${API_BASE}/files/${docId}/proxy?disposition=${proxyDisposition}`, {
        requiresAuth: true,
        label: 'proxy'
      });

      // Signed endpoint probes are useful when proxy fetch is blocked by browser/network
      // restrictions but a direct signed URL can still render in iframe/image.
      if (intent === 'preview') {
        try {
          const signedPreviewUrl = await getSignedPreviewUrl(docId, token);
          addSecureCandidate(candidates, seen, signedPreviewUrl, {
            requiresAuth: String(signedPreviewUrl || '').startsWith(API_BASE),
            label: 'signed_preview'
          });
        } catch (previewProbeError) {
          console.error('[PatientDetails] Signed preview probe failed:', previewProbeError);
        }

        try {
          const signedDownloadUrl = await getSignedDownloadUrl(docId, token);
          addSecureCandidate(candidates, seen, signedDownloadUrl, {
            requiresAuth: String(signedDownloadUrl || '').startsWith(API_BASE),
            label: 'signed_download_fallback'
          });
        } catch (downloadProbeError) {
          console.error('[PatientDetails] Signed download probe for preview failed:', downloadProbeError);
        }
      } else {
        try {
          const signedDownloadUrl = await getSignedDownloadUrl(docId, token);
          addSecureCandidate(candidates, seen, signedDownloadUrl, {
            requiresAuth: String(signedDownloadUrl || '').startsWith(API_BASE),
            label: 'signed_download'
          });
        } catch (downloadProbeError) {
          console.error('[PatientDetails] Signed download probe failed:', downloadProbeError);
        }
      }
    }

    const resolvedUrl = resolveDocumentUrl(doc);
    addSecureCandidate(candidates, seen, resolvedUrl, {
      requiresAuth: String(resolvedUrl || '').startsWith(API_BASE),
      label: 'record_url'
    });

    // Keep this as a last resort only when no secure candidates were resolved.
    if (!candidates.length) {
      addSecureCandidate(candidates, seen, buildPublicS3UrlFromDoc(doc), {
        label: 'public_s3_fallback',
        allowRawS3: false
      });
    }

    return candidates;
  };

  const fetchBlobFromCandidate = async (candidate, token) => {
    const requestOptions = { method: 'GET', mode: 'cors', redirect: 'follow' };
    if (candidate?.requiresAuth && token) {
      requestOptions.headers = { Authorization: `Bearer ${token}` };
    }

    const response = await fetch(candidate.url, requestOptions);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText || 'File fetch failed'}`);
    }

    const blob = await response.blob();
    if (!blob || blob.size === 0) {
      throw new Error('Empty file response');
    }

    return {
      blob,
      contentType: response.headers.get('content-type') || blob.type || '',
      sourceUrl: candidate.url
    };
  };

  const buildPublicS3UrlFromDoc = (doc) => {
    const key = doc?.s3Key;
    if (!key || typeof key !== 'string') return null;

    const bucket = doc?.s3Bucket || 'medical-vault-storage';
    const region = doc?.s3Region || 'ap-south-1';
    if (!bucket) return null;

    const encodedKey = key
      .split('/')
      .map((part) => encodeURIComponent(part))
      .join('/');

    if (region === 'us-east-1') {
      return `https://${bucket}.s3.amazonaws.com/${encodedKey}`;
    }

    return `https://${bucket}.s3.${region}.amazonaws.com/${encodedKey}`;
  };

  const openLoadingPreviewWindow = (title = 'Document Preview') => {
    // Keep script access to this tab so async preview resolution can replace its URL.
    const win = window.open('', '_blank');
    if (!win) return null;

    try {
      win.document.title = title;
      win.document.body.innerHTML =
        '<div style="font-family: Arial, sans-serif; padding: 24px; color: #1f2937;">Loading document preview...</div>';
    } catch (error) {
      console.error('[PatientDetails] Failed to initialize preview window:', error);
    }

    return win;
  };

  const renderPreviewFallbackPage = (previewWindow, doc, message, downloadUrl = null) => {
    if (!previewWindow || previewWindow.closed) return;

    const safeTitle = String(doc?.title || doc?.originalName || 'Document');
    const safeType = String(doc?.mimeType || doc?.fileType || doc?.type || 'Unknown');
    const safeMessage = String(message || 'Unable to preview this document.');
    const safeDownloadUrl = downloadUrl ? String(downloadUrl).replace(/"/g, '&quot;') : '';

    const downloadSection = safeDownloadUrl
      ? `<p style="margin: 14px 0 0;">
           <a href="${safeDownloadUrl}" target="_blank" rel="noopener noreferrer"
              style="display:inline-block; padding:10px 14px; border-radius:8px; background:#2563eb; color:#fff; text-decoration:none; font-weight:600;">
             Download Document
           </a>
         </p>`
      : '';

    try {
      previewWindow.document.title = `${safeTitle} - Preview`;
      previewWindow.document.body.innerHTML = `
        <div style="font-family: Arial, sans-serif; padding: 24px; color: #111827;">
          <h2 style="margin:0 0 8px;">Preview Not Available</h2>
          <p style="margin:0 0 16px; color:#4b5563;">${safeMessage}</p>
          <div style="padding:14px; border:1px solid #e5e7eb; border-radius:10px; background:#f9fafb;">
            <p style="margin:0 0 6px;"><strong>Title:</strong> ${safeTitle}</p>
            <p style="margin:0;"><strong>Type:</strong> ${safeType}</p>
          </div>
          ${downloadSection}
        </div>
      `;
    } catch (error) {
      console.error('[PatientDetails] Failed to render preview fallback page:', error);
    }
  };

  const handlePreviewInNewTab = async (doc) => {
    let previewWindow = null;
    let generatedObjectUrl = '';
    try {
      console.log('[PatientDetails] Starting preview for document:', doc);
      if (!doc) {
        console.error('[PatientDetails] Invalid document object:', doc);
        return;
      }
      previewWindow = openLoadingPreviewWindow(doc?.title || 'Document Preview');

      const storedToken = localStorage.getItem('token');
      const preferredUrl = normalizeFileUrl(resolveDocumentUrl(doc));
      const candidates = await collectDoctorSecureCandidates(doc, storedToken, 'preview', preferredUrl);

      if (!candidates.length) {
        console.error('Invalid file URL', doc);
        if (previewWindow) {
          renderPreviewFallbackPage(previewWindow, doc, 'No valid file URL found for this record.');
        }
        return;
      }

      let fallbackDownloadUrl = '';

      // Prefer opening a direct renderable URL in the new tab if available.
      for (const candidate of candidates) {
        const previewKind = getResolvedPreviewKind(
          doc,
          candidate.url,
          String(doc?.mimeType || doc?.fileType || '')
        );
        if (!candidate.requiresAuth && previewKind !== 'unsupported' && !isRawS3ObjectUrl(candidate.url)) {
          fallbackDownloadUrl = fallbackDownloadUrl || candidate.url;
          if (previewWindow && !previewWindow.closed) {
            previewWindow.location.replace(candidate.url);
          } else {
            window.open(candidate.url, '_blank', 'noopener,noreferrer');
          }
          return;
        }
      }

      // Fallback: authenticated blob fetch (proxy/direct), then open object URL in new tab.
      for (const candidate of candidates) {
        try {
          const { blob, contentType, sourceUrl } = await fetchBlobFromCandidate(candidate, storedToken);
          const resolvedSourceUrl = sourceUrl || candidate.url;
          fallbackDownloadUrl = fallbackDownloadUrl || resolvedSourceUrl;

          const previewKind = getResolvedPreviewKind(doc, resolvedSourceUrl, contentType);
          if (previewKind === 'unsupported') {
            continue;
          }

          generatedObjectUrl = window.URL.createObjectURL(blob);
          if (previewWindow && !previewWindow.closed) {
            previewWindow.location.replace(generatedObjectUrl);
          } else {
            window.open(generatedObjectUrl, '_blank', 'noopener,noreferrer');
          }

          // Keep object URL alive long enough for the new tab to load.
          setTimeout(() => {
            try {
              window.URL.revokeObjectURL(generatedObjectUrl);
            } catch (revokeError) {
              console.error('[PatientDetails] Failed to revoke preview object URL:', revokeError);
            }
          }, 5 * 60 * 1000);
          return;
        } catch (fetchError) {
          console.error(`[PatientDetails] New-tab preview fetch failed via ${candidate.label}:`, fetchError);
        }
      }

      if (!fallbackDownloadUrl) {
        fallbackDownloadUrl = candidates.find((candidate) => !candidate.requiresAuth)?.url || '';
      }

      if (previewWindow) {
        renderPreviewFallbackPage(
          previewWindow,
          doc,
          'This file could not be rendered in a new tab preview. You can download it instead.',
          fallbackDownloadUrl
        );
        return;
      }

      if (fallbackDownloadUrl) {
        window.open(fallbackDownloadUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Preview failed', error);
      if (previewWindow) {
        renderPreviewFallbackPage(previewWindow, doc, 'Preview failed while loading the document.');
      }
      if (generatedObjectUrl) {
        try {
          window.URL.revokeObjectURL(generatedObjectUrl);
        } catch {
          // noop
        }
      }
    }
  };

  // Handle preview for medical records
  const handlePreview = async (doc) => {
    closeInlinePreview();
    await handlePreviewInNewTab(doc);
  };

  const handleInlinePreviewLoadError = () => {
    setInlinePreview((prev) => ({
      ...prev,
      loading: false,
      error: 'Unable to load document preview'
    }));
  };

  const formatPreviewFileSize = (sizeInBytes) => {
    if (typeof sizeInBytes !== 'number' || Number.isNaN(sizeInBytes) || sizeInBytes <= 0) {
      return 'Unavailable';
    }
    if (sizeInBytes < 1024) return `${sizeInBytes} B`;
    if (sizeInBytes < 1024 * 1024) return `${Math.round(sizeInBytes / 1024)} KB`;
    return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Handle download for medical records
  const handleDownload = async (doc, initialFileUrl = null) => {
    try {
      console.log('[PatientDetails] Starting download for document:', doc);
      if (!doc) {
        console.error('[PatientDetails] Invalid document object:', doc);
        return;
      }

      const isDoctorPortal = localStorage.getItem('role') === 'doctor';
      if (isDoctorPortal) {
        const storedToken = localStorage.getItem('token');
        const preferredUrl = normalizeFileUrl(initialFileUrl) || normalizeFileUrl(resolveDocumentUrl(doc));
        const candidates = await collectDoctorSecureCandidates(doc, storedToken, 'download', preferredUrl);

        if (!candidates.length) {
          console.error('Invalid file URL', doc);
          return;
        }

        const fileName = resolveDocumentFileName(doc, candidates[0]?.url);

        for (const candidate of candidates) {
          try {
            const { blob } = await fetchBlobFromCandidate(candidate, storedToken);
            const objectUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = objectUrl;
            a.download = fileName || 'document';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(objectUrl);
            return;
          } catch (fetchError) {
            console.error(`[PatientDetails] Download fetch failed via ${candidate.label}:`, fetchError);
          }
        }

        const directCandidate = candidates.find((candidate) => !candidate.requiresAuth && !isRawS3ObjectUrl(candidate.url));
        if (directCandidate) {
          try {
            const a = document.createElement('a');
            a.href = directCandidate.url;
            a.download = fileName || 'document';
            a.target = '_blank';
            a.rel = 'noopener';
            document.body.appendChild(a);
            a.click();
            a.remove();
            return;
          } catch (fallbackError) {
            console.error('Download failed', fallbackError);
          }
        }

        console.error('[PatientDetails] Download failed: no secure source could be resolved');
        return;
      }

      const storedToken = localStorage.getItem('token');
      let fileUrl = normalizeFileUrl(initialFileUrl) || resolveDocumentUrl(doc);

      // Fallback for legacy records without direct URL fields
      if (!fileUrl && doc?._id) {
        try {
          fileUrl = await getSignedDownloadUrl(doc._id, storedToken);
        } catch (signedError) {
          console.error('[PatientDetails] Failed to fetch signed download URL:', signedError);
        }
      }

      // Try preview endpoint as download fallback if download endpoint fails
      if (!fileUrl && doc?._id) {
        try {
          fileUrl = await getSignedPreviewUrl(doc._id, storedToken);
        } catch (previewFallbackError) {
          console.error('[PatientDetails] Failed to fetch signed preview URL for download fallback:', previewFallbackError);
        }
      }

      // Final fallback: construct S3 public URL from record fields if available
      if (!fileUrl) {
        fileUrl = normalizeFileUrl(buildPublicS3UrlFromDoc(doc));
      }

      if (!fileUrl) {
        console.error('Invalid file URL', doc);
        alert('Unable to download this file because its URL is missing or invalid.');
        return;
      }

      const fileName = resolveDocumentFileName(doc, fileUrl);
      try {
        const requestOptions = {};
        if (fileUrl.startsWith(API_BASE) && storedToken) {
          requestOptions.headers = { Authorization: `Bearer ${storedToken}` };
        }

        const response = await fetch(fileUrl, requestOptions);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText || 'Download failed'}`);
        }

        const blob = await response.blob();
        const objectUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = fileName || 'document';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(objectUrl);
      } catch (fetchError) {
        // Fallback when cross-origin blob fetch is blocked by CORS
        console.error('[PatientDetails] Blob download failed, falling back to direct link:', fetchError);
        try {
          const a = document.createElement('a');
          a.href = fileUrl;
          a.download = fileName || 'document';
          a.target = '_blank';
          a.rel = 'noopener';
          document.body.appendChild(a);
          a.click();
          a.remove();
        } catch (fallbackError) {
          console.error('Download failed', fallbackError);
          window.open(fileUrl, '_blank', 'noopener,noreferrer');
        }
      }
    } catch (error) {
      console.error('Download failed', error);
    }
  };

  // Handle download all medical records
  const handleDownloadAll = async (docs) => {
    setDownloadLoading('bulk');

    try {
      const storedToken = localStorage.getItem('token');
      const isAnonymous = false;

      console.log(`🔽 Starting bulk download for ${docs.length} files`);

      // Download files sequentially to avoid overwhelming the browser
      for (let i = 0; i < docs.length; i++) {
        const doc = docs[i];

        if (doc && doc._id) {
          try {
            // Get signed URL via backend download endpoint and open in new tab
            const signedUrl = await getSignedDownloadUrl(doc._id, isAnonymous ? null : storedToken);
            const link = document.createElement('a');
            link.href = signedUrl;
            link.target = '_blank';
            link.rel = 'noopener';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            console.log(`🔽 Download triggered ${i + 1}/${docs.length}: ${doc.title}`);
          } catch (error) {
            console.error(`Error downloading ${doc.title}:`, error);
          }

          // Small delay between downloads
          if (i < docs.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }

      setDownloadLoading(null);
      console.log(`🔽 Bulk download completed for ${docs.length} files`);

    } catch (error) {
      console.error('Bulk download failed:', error);
      alert('Bulk download failed. Please try again.');
      setDownloadLoading(null);
    }
  };

  // Legacy function for backward compatibility (keeping for any other usage)
  const handleDownloadRecord = async (record) => {
    setDownloadLoading(record.id);

    try {
      // Simulate download process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create a mock download
      const blob = new Blob(['Mock file content'], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${record.title}.${record.fileType}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setDownloadLoading(null);
    }
  };

  const handleBulkDownload = async () => {
    // Use the new handleDownloadAll function with the medical records
    await handleDownloadAll(medicalRecords);
  };

  // Session Management Handlers
  const handleEndSession = () => {
    setIsEndModalOpen(true);
    setShowActionsDropdown(false);
  };

  const handleFinishSession = async () => {
    if (!activeSession || isEnding) return;

    const sessionId = resolveSessionId(activeSession);
    if (!sessionId || !isValidSessionId(sessionId)) {
      showSessionToast('warning', 'Invalid session ID');
      return;
    }

    setIsEnding(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/sessions/end/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          diagnosis: "Routine Checkup",
          notes: "Session finished by doctor."
        })
      });

      if (response.ok) {
        console.log('✅ Session ended successfully');
        setActiveSession(null);
        setIsEndModalOpen(false);
        showSessionToast('success', 'Session ended successfully');
        if (patient?.id) {
          await Promise.all([
            fetchSessionHistory(patient.id),
            fetchActiveSession(patient.id)
          ]);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to end session:', errorData);
        showSessionToast('error', 'Failed to end session');
      }
    } catch (err) {
      console.error('Error ending session:', err);
      showSessionToast('error', 'Failed to end session');
    } finally {
      setIsEnding(false);
    }
  };

  const handleExtendSession = async () => {
    if (!activeSession) return;

    setIsExtending(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/sessions/extend/${activeSession._id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ minutes: 20 })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Session extension request sent');
        alert(data.message || 'Extension request sent to patient for approval.');
        setShowActionsDropdown(false);
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to extend session');
      }
    } catch (err) {
      console.error('Error extending session:', err);
      alert('An error occurred while extending the session');
    } finally {
      setIsExtending(false);
    }
  };

  // New handler functions for document upload and appointment scheduling
  const handleDocumentUpload = () => {
    console.log('🚀 PatientDetails - Opening document upload modal');
    console.log('👤 Patient data:', patient);
    setShowDocumentUpload(true);
  };

  const handleCloseDocumentUpload = () => {
    setShowDocumentUpload(false);
  };

  const handleDocumentUploadSuccess = (newDocument) => {
    setDocuments(prev => [newDocument, ...prev]);
    // Refresh medical records after successful upload
    if (patient && patient.id) {
      fetchMedicalRecords(patient.id);
    }
    console.log('Document uploaded successfully:', newDocument);
  };

  const handleScheduleAppointment = () => {
    setShowAppointmentModal(true);
  };

  const handleCloseAppointmentModal = () => {
    setShowAppointmentModal(false);
  };

  const handleAppointmentCreated = (newAppointment) => {
    console.log('🔄 handleAppointmentCreated called with:', newAppointment);
    console.log('🔄 Current appointments before update:', appointments);

    setAppointments(prev => {
      const updatedAppointments = [newAppointment, ...prev];
      console.log('📅 Updated appointments state:', updatedAppointments);
      return updatedAppointments;
    });
    console.log('✅ Appointment added to local state successfully');
  };

  const handleToggleSessionDropdown = () => {
    setShowSessionDropdown((prev) => {
      const next = !prev;
      if (next) setShowActionsDropdown(false);
      return next;
    });
  };

  const handleToggleActionsDropdown = () => {
    setShowActionsDropdown((prev) => {
      const next = !prev;
      if (next) setShowSessionDropdown(false);
      return next;
    });
  };

  // Test function for debugging appointment creation
  // Call this in browser console: window.testAppointmentCreation()
  if (isDev) window.testAppointmentCreation = async () => {
    console.log('🧪 Testing appointment creation...');
    console.log('👤 Current patient:', patient);
    console.log('🔑 Token present:', localStorage.getItem('token') ? 'Yes' : 'No');

    if (!patient) {
      console.error('❌ No patient loaded');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      console.error('❌ No authentication token');
      return;
    }

    const testData = {
      patientId: patient.id || patient.patientId,
      patientName: patient.name,
      patientEmail: patient.email || '',
      patientPhone: patient.mobile || '',
      appointmentDate: '2024-01-20',
      appointmentTime: '14:30',
      duration: 30,
      reason: 'Test appointment from console',
      appointmentType: 'consultation',
      notes: 'Test notes'
    };

    try {
      const response = await fetch(`${API_BASE}/appointments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testData)
      });

      console.log('📥 Response:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });

      const responseText = await response.text();
      console.log('📥 Response body:', responseText);

      if (response.ok) {
        const data = JSON.parse(responseText);
        console.log('✅ Success:', data);

        // Test the handleAppointmentCreated function
        handleAppointmentCreated(data.appointment);
      } else {
        console.error('❌ Failed:', response.status, responseText);
      }
    } catch (error) {
      console.error('❌ Error:', error);
    }
  };

  // Filter medical records based on category and search term
  const filteredMedicalRecords = medicalRecords.filter(record => {
    // Filter by category
    const categoryMatch = selectedCategory === 'all' ||
      record.category?.toLowerCase() === selectedCategory.toLowerCase();

    // Filter by search term
    if (!recordsSearchTerm) {
      return categoryMatch;
    }

    const searchLower = recordsSearchTerm.toLowerCase();
    const searchMatch = (
      record.title?.toLowerCase().includes(searchLower) ||
      record.category?.toLowerCase().includes(searchLower) ||
      new Date(record.uploadedAt || record.createdAt).toLocaleDateString().toLowerCase().includes(searchLower)
    );

    return categoryMatch && searchMatch;
  });

  const handleDownloadSummary = async () => {
    setDownloadLoading('summary');

    try {
      const result = await generatePatientSummaryPDF(patient, documents, appointments);

      if (result.success) {
        console.log('PDF generated successfully:', result.filename);
      } else {
        console.error('PDF generation failed:', result.error);
        alert('Failed to generate PDF summary. Please try again.');
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Failed to generate PDF summary. Please try again.');
    } finally {
      setDownloadLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-cyan-50/20 dark:from-[#080b10] dark:via-[#0d1117] dark:to-[#111827] flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="mx-auto h-20 w-20 bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl flex items-center justify-center mb-6 shadow-xl">
            <Loader className="h-9 w-9 text-teal-500 dark:text-teal-400 animate-spin" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2" style={{ fontFamily: "'Josefin Sans', system-ui, sans-serif" }}>Loading Patient Details</h3>
          <p className="text-slate-500 dark:text-slate-400">Please wait while we fetch patient information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-cyan-50/20 dark:from-[#080b10] dark:via-[#0d1117] dark:to-[#111827] flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="mx-auto h-20 w-20 bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-red-200/60 dark:border-red-500/20 rounded-3xl flex items-center justify-center mb-6 shadow-xl">
            <AlertCircle className="h-9 w-9 text-red-500 dark:text-red-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2" style={{ fontFamily: "'Josefin Sans', system-ui, sans-serif" }}>Error Loading Patient</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6">{error}</p>
          <div className="flex justify-center gap-3">
            <button onClick={() => navigate('/scan')} className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 hover:scale-[1.03] transition-all duration-200">
              Scan QR Code Again
            </button>
            <button onClick={() => navigate('/patients')} className="px-5 py-2.5 bg-white/70 dark:bg-white/10 backdrop-blur-md border border-white/50 dark:border-white/10 text-slate-700 dark:text-slate-200 font-semibold rounded-xl hover:bg-white/90 dark:hover:bg-white/15 transition-all duration-200">
              Back to Patients
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!patient) {
    console.log('❌ PatientDetails - No patient data, showing error state');
    console.log('❌ PatientDetails - Current state:', { loading, error, patient });
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-cyan-50/20 dark:from-[#080b10] dark:via-[#0d1117] dark:to-[#111827] flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="mx-auto h-20 w-20 bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl flex items-center justify-center mb-6 shadow-xl">
            <User className="h-9 w-9 text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2" style={{ fontFamily: "'Josefin Sans', system-ui, sans-serif" }}>Patient Not Found</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6">The patient you're looking for doesn't exist.</p>
          <button onClick={() => navigate('/scan')} className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 hover:scale-[1.03] transition-all duration-200">
            Scan QR Code
          </button>
        </div>
      </div>
    );
  }

  const patientProfileImageCandidates = [
    patient.profilePictureUrl,
    patient.profilePicture,
    patient.profileImage,
    patient.avatarUrl,
    patient.avatar,
    patient.photoUrl
  ]
    .map((candidate) => resolveProfileImageUrl(candidate))
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index);
  const patientProfileImageSrc = patientProfileImageCandidates[profileImageCandidateIndex] || null;
  const hasPatientProfileImage = !!patientProfileImageSrc && !profileImageLoadFailed;
  const patientInitials =
    (patient.name || '')
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'P';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/20 to-cyan-50/10 dark:from-[#080b10] dark:via-[#0d1117] dark:to-[#111827] animate-fade-in">
      <div className="relative z-10 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Session Expired Popup */}
      {showSessionExpiredPopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-white/5 dark:backdrop-blur-xl dark:border dark:border-white/10 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <div className="flex items-start gap-4 mb-4">
              <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  Session Expired
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  Your profile has been deactivated. This active session has been automatically ended.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Please activate your profile in Settings to continue attending sessions.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowSessionExpiredPopup(false);
                  navigate('/patients');
                }}
                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-white/10 dark:border dark:border-white/10 text-gray-700 dark:text-slate-200 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-white/15 transition-colors"
              >
                Back to Patients
              </button>
              <button
                onClick={() => {
                  setShowSessionExpiredPopup(false);
                  navigate('/settings');
                }}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#0EA5A4] to-[#0891B2] dark:bg-none dark:bg-white/10 dark:backdrop-blur-md dark:border dark:border-white/15 text-white rounded-lg font-medium shadow-[0_10px_24px_rgba(14,165,164,0.26)] dark:shadow-[0_10px_28px_rgba(8,47,73,0.45)] hover:shadow-[0_14px_30px_rgba(14,165,164,0.34)] dark:hover:bg-white/15 dark:hover:border-[#22D3EE]/35 transition-all duration-200"
              >
                Go to Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/patients')}
          className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 mb-5 text-sm font-medium transition-colors duration-200 group"
        >
          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/70 dark:bg-white/5 border border-white/60 dark:border-white/10 group-hover:border-teal-300 dark:group-hover:border-teal-500/40 shadow-sm transition-all duration-200">
            <ArrowLeft className="h-3.5 w-3.5" />
          </span>
          Back to Patients
        </button>

        {/* Cached Data Notice */}
        {isCachedData && (
          <div className="mb-5 bg-amber-50/80 dark:bg-amber-900/10 backdrop-blur-md border border-amber-200/60 dark:border-amber-500/20 rounded-2xl p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">Cached Patient Data</h3>
                <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">You're viewing cached patient information. Some details may be limited. To see complete data, scan the QR code again.</p>
                <button onClick={() => navigate('/scan')} className="mt-2 px-3 py-1 bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-xs font-semibold rounded-lg shadow-sm hover:scale-[1.03] transition-all duration-200">
                  Scan QR Code for Full Data
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Patient name + actions hero row */}
        <div className="relative z-50 bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl shadow-xl dark:shadow-[0_20px_48px_rgba(0,0,0,0.4)] p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight truncate" style={{ fontFamily: "'Josefin Sans', system-ui, sans-serif" }}>{patient.name}</h1>
              <p className="mt-1 text-sm text-slate-400 dark:text-slate-500 font-mono tracking-wide">ID: {patient.id}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:flex-nowrap">
              {!isAnonymousView && (
                <button
                  onClick={() => {
                    setShowActionsDropdown(false);
                    setShowSessionDropdown(false);
                    navigate(`/messages?counterpart=${encodeURIComponent(patient.id)}&name=${encodeURIComponent(patient.name || '')}`);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Chat</span>
                </button>
              )}

              {/* Manage Session Dropdown */}
              {activeSession && !isAnonymousView && (
                <div ref={sessionDropdownRef} className="relative">
                  <button
                    onClick={handleToggleSessionDropdown}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                  >
                    <Activity className="h-4 w-4" />
                    <span>Manage Session</span>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${showSessionDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  <div
                    className={`absolute right-0 mt-3 w-56 sm:w-64 bg-white dark:bg-[#111827]/95 dark:backdrop-blur-xl rounded-[2rem] shadow-2xl border border-slate-100 dark:border-white/10 p-2 z-50 overflow-hidden origin-top-right transition-all duration-200 ${
                      showSessionDropdown
                        ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
                        : 'opacity-0 -translate-y-1 scale-95 pointer-events-none'
                    }`}
                    aria-hidden={!showSessionDropdown}
                  >
                        <div className="p-3 mb-2 border-b border-slate-50 dark:border-white/10">
                          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-2">Session Controls</p>
                        </div>

                        <button
                          onClick={() => {
                            handleExtendSession();
                            setShowSessionDropdown(false);
                          }}
                          disabled={isExtending}
                          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-amber-50 dark:hover:bg-amber-900/20 text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 rounded-2xl transition-all group disabled:opacity-50"
                        >
                          <div className="p-2 bg-amber-100/50 dark:bg-amber-900/30 rounded-xl group-hover:bg-amber-100 dark:group-hover:bg-amber-900/50 transition-colors">
                            {isExtending ? <Loader className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-bold">Extend Time</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Add 20 mins to session</p>
                          </div>
                        </button>

                        <button
                          onClick={() => {
                            handleEndSession();
                            setShowSessionDropdown(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 rounded-2xl transition-all group"
                        >
                          <div className="p-2 bg-red-100/50 dark:bg-red-900/30 rounded-xl group-hover:bg-red-100 dark:group-hover:bg-red-900/50 transition-colors">
                            <X className="h-4 w-4" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-bold">Finish Session</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">End & save diagnosis</p>
                          </div>
                        </button>
                      </div>
                </div>
              )}

              {/* Actions Dropdown (Replacing separate buttons) */}
              <div ref={actionsDropdownRef} className="relative">
                <button
                  onClick={handleToggleActionsDropdown}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/80 dark:bg-white/10 backdrop-blur-md border border-white/60 dark:border-white/15 text-slate-700 dark:text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span>Patient Actions</span>
                  <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${showActionsDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                <div
                  className={`absolute right-0 mt-3 w-56 sm:w-64 bg-white dark:bg-[#111827]/95 dark:backdrop-blur-xl rounded-[2rem] shadow-2xl border border-slate-100 dark:border-white/10 p-2 z-50 overflow-hidden origin-top-right transition-all duration-200 ${
                    showActionsDropdown
                      ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
                      : 'opacity-0 -translate-y-1 scale-95 pointer-events-none'
                  }`}
                  aria-hidden={!showActionsDropdown}
                >
                      <div className="p-3 mb-2 border-b border-slate-50 dark:border-white/10">
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-2">Manage Records</p>
                      </div>

                      {!isAnonymousView && (
                        <button
                          onClick={() => {
                            handleDocumentUpload();
                            setShowActionsDropdown(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-2xl transition-all group"
                        >
                          <div className="p-2 bg-blue-100/50 dark:bg-blue-900/30 rounded-xl group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
                            <Upload className="h-4 w-4" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-bold">Upload Document</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Add medical files</p>
                          </div>
                        </button>
                      )}

                      {!isAnonymousView && (
                        <button
                          onClick={() => {
                            handleScheduleAppointment();
                            setShowActionsDropdown(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-2xl transition-all group"
                        >
                          <div className="p-2 bg-emerald-100/50 dark:bg-emerald-900/30 rounded-xl group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/50 transition-colors">
                            <Calendar className="h-4 w-4" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-bold">Book Appointment</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Schedule next visit</p>
                          </div>
                        </button>
                      )}

                      {!isAnonymousView && (
                        <button
                          onClick={() => {
                            navigate(`/messages?counterpart=${encodeURIComponent(patient.id)}&name=${encodeURIComponent(patient.name || '')}`);
                            setShowActionsDropdown(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 text-slate-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 rounded-2xl transition-all group"
                        >
                          <div className="p-2 bg-cyan-100/50 dark:bg-cyan-900/30 rounded-xl group-hover:bg-cyan-100 dark:group-hover:bg-cyan-900/50 transition-colors">
                            <MessageCircle className="h-4 w-4" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-bold">Open Chat</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Message patient directly</p>
                          </div>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          handleDownloadSummary();
                          setShowActionsDropdown(false);
                        }}
                        disabled={downloadLoading === 'summary'}
                        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 rounded-2xl transition-all group disabled:opacity-50"
                      >
                        <div className="p-2 bg-rose-100/50 dark:bg-rose-900/30 rounded-xl group-hover:bg-rose-100 dark:group-hover:bg-rose-900/50 transition-colors">
                          {downloadLoading === 'summary' ? (
                            <Loader className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold">Download Summary</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Export patient PDF</p>
                        </div>
                      </button>
                    </div>
              </div>
            </div>
          </div>
        </div>{/* end header glass card */}
      </div>{/* end header section */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Patient Info Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl shadow-xl dark:shadow-[0_20px_48px_rgba(0,0,0,0.4)] p-5 sm:p-6 lg:sticky lg:top-24 transition-all duration-300 hover:shadow-2xl hover:-translate-y-0.5">
            {/* Avatar + name */}
            <div className="flex flex-col items-center text-center mb-6">
              {hasPatientProfileImage ? (
                <img
                  src={patientProfileImageSrc}
                  alt={`${patient.name} avatar`}
                  className="h-24 w-24 rounded-full object-cover border-4 border-white dark:border-white/20 shadow-lg mb-3 transition-all duration-200 hover:scale-[1.03]"
                  onError={() => {
                    console.error('Failed to load profile picture:', patientProfileImageSrc);
                    if (profileImageCandidateIndex < patientProfileImageCandidates.length - 1) {
                      setProfileImageCandidateIndex((prev) => prev + 1);
                      return;
                    }
                    setProfileImageLoadFailed(true);
                  }}
                  onLoad={() => {
                    console.log('Profile picture loaded successfully');
                    setProfileImageLoadFailed(false);
                  }}
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-500 border-4 border-white dark:border-white/20 shadow-lg flex items-center justify-center mb-3 transition-all duration-200 hover:scale-[1.03]">
                  <span className="text-2xl font-black text-white">{patientInitials}</span>
                </div>
              )}
              <h2 className="text-lg font-bold text-slate-900 dark:text-white" style={{ fontFamily: "'Josefin Sans', system-ui, sans-serif" }}>
                {patient.name}
              </h2>
              <p className="text-sm text-slate-400 dark:text-slate-500">{patient.age ? `${patient.age} years` : '—'}</p>
            </div>

            {/* Info fields */}
            <div className="space-y-2.5">
              {[
                { label: 'Date of Birth', value: patient.dateOfBirth || '—' },
                { label: 'Blood Type', value: patient.bloodType || '—', highlight: true },
                { label: 'Height', value: patient.height || '—' },
                { label: 'Weight', value: patient.weight || '—' },
              ].map(({ label, value, highlight }) => (
                <div key={label} className="flex items-center justify-between px-3 py-2.5 bg-slate-50/80 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                  <span className="text-xs font-medium text-slate-400 dark:text-slate-500">{label}</span>
                  <span className={`text-sm font-semibold ${highlight ? 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 px-2 py-0.5 rounded-lg' : 'text-slate-800 dark:text-slate-200'}`}>{value}</span>
                </div>
              ))}
            </div>

            {/* Emergency Contact */}
            <div className="mt-5 pt-5 border-t border-slate-100 dark:border-white/10">
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Emergency Contact</h3>
              {patient.emergencyContact?.name ? (
                <div className="px-3 py-3 bg-slate-50/80 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                  <p className="font-semibold text-slate-800 dark:text-white text-sm">{patient.emergencyContact.name}</p>
                  {patient.emergencyContact.relationship && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{patient.emergencyContact.relationship}</p>}
                  {patient.emergencyContact.phone && <p className="text-xs text-teal-600 dark:text-teal-400 mt-0.5 font-medium">{patient.emergencyContact.phone}</p>}
                </div>
              ) : (
                <div className="flex flex-col items-center py-4 px-3 bg-slate-50/80 dark:bg-white/5 rounded-xl border border-dashed border-slate-200 dark:border-white/10">
                  <AlertCircle className="h-6 w-6 text-slate-300 dark:text-slate-600 mb-1.5" />
                  <p className="text-xs text-slate-400 dark:text-slate-500 text-center">No emergency contact on file</p>
                </div>
              )}
            </div>

            {!isAnonymousView && (
              <div className="mt-5 pt-5 border-t border-slate-100 dark:border-white/10">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Next Appointment</h3>
                {patient.nextAppointment ? (
                  <div className="px-3 py-3 bg-teal-50/80 dark:bg-teal-900/10 rounded-xl border border-teal-100 dark:border-teal-500/20">
                    <p className="font-semibold text-teal-800 dark:text-teal-300 text-sm">{patient.nextAppointment}</p>
                    <p className="text-xs text-teal-600 dark:text-teal-500 mt-0.5">2:00 PM - Cardiology</p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 dark:text-slate-500">No upcoming appointments</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Tabs glass container */}
          <div className="bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl shadow-xl dark:shadow-[0_20px_48px_rgba(0,0,0,0.4)] overflow-hidden mb-6">
            <div className="border-b border-slate-100 dark:border-white/10 overflow-x-auto">
              <nav className="flex px-4 min-w-max">
                {[
                  { id: 'overview', name: 'Overview', count: null },
                  { id: 'records', name: 'Records', fullName: 'Medical Records', count: medicalRecords.length },
                  { id: 'medications', name: 'Meds', fullName: 'Medications', count: patient.medications.length },
                  { id: 'history', name: 'History', fullName: 'Medical History', count: patient.medicalHistory.length },
                  { id: 'visits', name: 'Visits', fullName: 'Visit Sessions', count: sessionHistory.length }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                  className={`relative py-4 px-2 mr-5 text-sm font-semibold whitespace-nowrap transition-all duration-200 ease-in-out border-b-2 ${
                    activeTab === tab.id
                      ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-white/20'
                  }`}
                  >
                    <span className="sm:hidden">{tab.name}</span>
                    <span className="hidden sm:inline">{tab.fullName || tab.name}</span>
                    {tab.count !== null && tab.count !== undefined && (
                      <span className="ml-2 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 py-0.5 px-2 rounded-full text-xs font-semibold">
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-3 sm:p-4 md:p-6">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Recent Activity Card */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50/60 dark:from-blue-900/10 dark:to-indigo-900/5 border border-blue-100 dark:border-blue-500/20 rounded-2xl p-5 shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-9 w-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-sm font-bold text-blue-900 dark:text-white">Recent Activity</h3>
                      </div>
                      <p className="text-sm text-blue-700 dark:text-slate-300 mb-1">Last visit: {patient.lastVisit || 'N/A'}</p>
                      <p className="text-sm text-blue-700 dark:text-slate-300">
                        {(() => {
                          const now = new Date();
                          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                          const addedThisMonth = (medicalRecords || []).filter(r => {
                            const dt = new Date(r.uploadedAt || r.createdAt || 0);
                            return !isNaN(dt) && dt >= startOfMonth && dt <= now;
                          }).length;
                          return `Records added: ${addedThisMonth} this month`;
                        })()}
                      </p>
                    </div>
                    {/* Health Status Card */}
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50/60 dark:from-emerald-900/10 dark:to-teal-900/5 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl p-5 shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-9 w-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                          <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <h3 className="text-sm font-bold text-emerald-900 dark:text-white">Health Status</h3>
                      </div>
                      <p className="text-sm text-emerald-700 dark:text-slate-300 mb-1">Overall: <span className="font-semibold">Stable</span></p>
                      <p className="text-sm text-emerald-700 dark:text-slate-300">Risk Level: <span className="font-semibold">Low</span></p>
                    </div>
                  </div>

                  {/* Allergies */}
                  {(() => {
                    const allergies = patient?.allergies;
                    const shouldShow = allergies &&
                      (typeof allergies === 'string' || typeof allergies === 'object') &&
                      String(allergies).trim() !== '';
                    if (isAnonymousView) {
                      console.log('👻 Allergies Render - allergies:', allergies);
                      console.log('👻 Allergies Render - shouldShow:', shouldShow);
                      console.log('👻 Allergies Render - patient exists:', !!patient);
                    }
                    return shouldShow ? (
                      <div className="bg-gradient-to-br from-red-50 to-rose-50/60 dark:from-red-900/10 dark:to-rose-900/5 border border-red-200 dark:border-red-500/20 rounded-2xl p-5 shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="h-9 w-9 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                          </div>
                          <h3 className="text-sm font-bold text-red-900 dark:text-rose-200">⚠ Allergies</h3>
                        </div>
                        <p className="text-sm text-red-700 dark:text-slate-300 font-medium">{String(allergies)}</p>
                      </div>
                    ) : null;
                  })()}

                  {/* Quick Actions removed as requested */}
                </div>
              )}

              {/* Medical Records Tab */}
              {activeTab === 'records' && (
                <div className="space-y-4 sm:space-y-6">
                  {/* Records Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">Medical Records</h3>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-300">
                        {recordsLoading ? 'Loading...' : `${medicalRecords.length} records available`}
                      </p>
                    </div>
                    {/* Desktop buttons */}
                    <div className="hidden sm:flex space-x-2 md:space-x-3">
                      <button
                        onClick={() => fetchMedicalRecords(patient.id)}
                        className="inline-flex items-center px-3 md:px-4 py-2 bg-slate-100 border border-slate-200 dark:bg-white/10 dark:backdrop-blur-md dark:border-white/15 text-slate-700 dark:text-slate-100 text-xs md:text-sm font-medium rounded-full hover:bg-slate-200 dark:hover:bg-white/15 dark:hover:border-[#22D3EE]/30 transition-all duration-200 ease-in-out hover:scale-[1.03] hover:shadow-md dark:shadow-[0_10px_24px_rgba(2,6,23,0.45)]"
                      >
                        <Loader className="h-3.5 w-3.5 md:h-4 md:w-4 md:mr-2" />
                        <span className="hidden md:inline">Refresh</span>
                      </button>
                      <button
                        onClick={handleViewAllRecords}
                        className="inline-flex items-center px-3 md:px-4 py-2 bg-gradient-to-r from-[#0EA5A4] to-[#0891B2] dark:bg-none dark:bg-white/10 dark:backdrop-blur-md dark:border dark:border-white/15 text-white text-xs md:text-sm font-medium rounded-full transition-all duration-200 ease-in-out hover:scale-[1.03] hover:shadow-md dark:shadow-[0_12px_30px_rgba(8,47,73,0.45)] dark:hover:bg-white/15 dark:hover:border-[#22D3EE]/35"
                      >
                        <Eye className="h-3.5 w-3.5 md:h-4 md:w-4 md:mr-2" />
                        <span className="hidden md:inline">View All</span>
                      </button>
                      <button
                        onClick={handleBulkDownload}
                        disabled={downloadLoading === 'bulk'}
                        className="inline-flex items-center px-3 md:px-4 py-2 bg-gradient-to-r from-[#0EA5A4] to-[#0891B2] dark:bg-none dark:bg-white/10 dark:backdrop-blur-md dark:border dark:border-white/15 text-white text-xs md:text-sm font-medium rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out hover:scale-[1.03] hover:shadow-md dark:shadow-[0_12px_30px_rgba(8,47,73,0.45)] dark:hover:bg-white/15 dark:hover:border-[#22D3EE]/35"
                      >
                        {downloadLoading === 'bulk' ? (
                          <Loader className="h-3.5 w-3.5 md:h-4 md:w-4 md:mr-2 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5 md:h-4 md:w-4 md:mr-2" />
                        )}
                        <span className="hidden md:inline">Download All</span>
                      </button>
                    </div>
                    {/* Mobile buttons */}
                    <div className="grid grid-cols-3 gap-2 sm:hidden">
                      <button
                        onClick={() => fetchMedicalRecords(patient.id)}
                        className="inline-flex items-center justify-center px-2 py-2 bg-slate-100 border border-slate-200 dark:bg-white/10 dark:backdrop-blur-md dark:border-white/15 text-slate-700 dark:text-slate-100 text-xs font-medium rounded-full hover:bg-slate-200 dark:hover:bg-white/15 dark:hover:border-[#22D3EE]/30 transition-all duration-200 ease-in-out hover:scale-[1.03]"
                      >
                        <Loader className="h-3.5 w-3.5 mr-1" />
                        Refresh
                      </button>
                      <button
                        onClick={handleViewAllRecords}
                        className="inline-flex items-center justify-center px-2 py-2 bg-gradient-to-r from-[#0EA5A4] to-[#0891B2] dark:bg-none dark:bg-white/10 dark:backdrop-blur-md dark:border dark:border-white/15 text-white text-xs font-medium rounded-full transition-all duration-200 ease-in-out hover:scale-[1.03] dark:shadow-[0_12px_30px_rgba(8,47,73,0.45)] dark:hover:bg-white/15 dark:hover:border-[#22D3EE]/35"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        View
                      </button>
                      <button
                        onClick={handleBulkDownload}
                        disabled={downloadLoading === 'bulk'}
                        className="inline-flex items-center justify-center px-2 py-2 bg-gradient-to-r from-[#0EA5A4] to-[#0891B2] dark:bg-none dark:bg-white/10 dark:backdrop-blur-md dark:border dark:border-white/15 text-white text-xs font-medium rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out hover:scale-[1.03] dark:shadow-[0_12px_30px_rgba(8,47,73,0.45)] dark:hover:bg-white/15 dark:hover:border-[#22D3EE]/35"
                      >
                        {downloadLoading === 'bulk' ? (
                          <Loader className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            <Download className="h-3.5 w-3.5 mr-1" />
                            All
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Category Filter and Search Bar */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* Search Bar */}
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="Search records by title, category, or date..."
                        value={recordsSearchTerm}
                        onChange={(e) => setRecordsSearchTerm(e.target.value)}
                        className="w-full px-4 py-3 pl-10 bg-white dark:bg-slate-900/70 border border-gray-300 dark:border-white/10 rounded-full doctor-focus-ring text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-400"
                      />
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    </div>

                    {/* Category Dropdown */}
                    <div className="sm:w-64">
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-900/70 border border-gray-300 dark:border-white/10 rounded-full doctor-focus-ring text-gray-900 dark:text-white text-sm font-medium"
                      >
                        <option value="all">All Categories</option>
                        <option value="report">Reports</option>
                        <option value="prescription">Prescriptions</option>
                        <option value="bill">Bills</option>
                        <option value="insurance">Insurance Details</option>
                      </select>
                    </div>
                  </div>

                  {/* Records List */}
                  {recordsLoading ? (
                    <div className="text-center py-12">
                      <Loader className="h-16 w-16 text-blue-600 dark:text-blue-400 mx-auto mb-4 animate-spin" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        Loading medical records...
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300">
                        Please wait while we fetch the patient's medical records.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredMedicalRecords.map((record) => (
                        <div
                          key={record._id}
                          className="flex items-center justify-between p-4 bg-white dark:bg-white/5 dark:backdrop-blur-md rounded-xl shadow-sm dark:shadow-[0_14px_30px_rgba(2,6,23,0.35)] border border-gray-100 dark:border-white/10 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ease-in-out"
                        >
                          <div className="flex items-center space-x-4">
                            {getFileIcon(record.mimeType?.includes('pdf') ? 'pdf' : 'image')}
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white">{record.title}</h4>
                              <p className="text-sm text-gray-600 dark:text-slate-300">
                                {record.category} • {new Date(record.uploadedAt || record.createdAt).toLocaleDateString()} • {Math.round(record.size / 1024)}KB
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => handlePreview(record)}
                              className="p-2 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-all duration-200 ease-in-out"
                              title="Preview"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDownload(record)}
                              className="p-2 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-all duration-200 ease-in-out"
                              title="Download"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Empty State */}
                  {!recordsLoading && filteredMedicalRecords.length === 0 && (
                    <div className="text-center py-12">
                      <FileText className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        {recordsSearchTerm ? 'No records match your search' : 'No medical records found'}
                      </h3>
                      <p className="text-gray-600 dark:text-slate-300 mb-4">
                        {recordsSearchTerm
                          ? `No records found matching "${recordsSearchTerm}". Try a different search term.`
                          : "This patient doesn't have any medical records yet, or there might be an issue loading them."
                        }
                      </p>
                      <div className="space-x-3">
                        <button
                          onClick={() => fetchMedicalRecords(patient.id)}
                          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-[#0EA5A4] to-[#0891B2] dark:bg-none dark:bg-white/10 dark:backdrop-blur-md dark:border dark:border-white/15 text-white text-sm font-medium rounded-full transition-all duration-200 ease-in-out hover:scale-[1.03] hover:shadow-md dark:shadow-[0_12px_30px_rgba(8,47,73,0.45)] dark:hover:bg-white/15 dark:hover:border-[#22D3EE]/35"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Refresh Records
                        </button>
                        <button
                          onClick={handleDocumentUpload}
                          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-[#0EA5A4] to-[#0891B2] dark:bg-none dark:bg-white/10 dark:backdrop-blur-md dark:border dark:border-white/15 text-white text-sm font-medium rounded-full transition-all duration-200 ease-in-out hover:scale-[1.03] hover:shadow-md dark:shadow-[0_12px_30px_rgba(8,47,73,0.45)] dark:hover:bg-white/15 dark:hover:border-[#22D3EE]/35"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Add First Record
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Medications Tab */}
              {activeTab === 'medications' && (
                <div className="space-y-4">
                  {patient.medications && patient.medications.length > 0 ? (
                    patient.medications.map((med, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 bg-white dark:bg-white/5 dark:backdrop-blur-md rounded-xl shadow-sm dark:shadow-[0_14px_30px_rgba(2,6,23,0.35)] border border-gray-100 dark:border-white/10 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ease-in-out"
                      >
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">{med.name}</h4>
                          <p className="text-sm text-gray-600 dark:text-slate-300">{med.dosage} • {med.frequency}</p>
                          {med.prescribed && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">Prescribed: {med.prescribed}</p>
                          )}
                        </div>
                        <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor('active')}`}>
                          Active
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No medications found</h3>
                      <p className="text-gray-600 dark:text-gray-300">This patient doesn't have any medications recorded yet.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Medical History Tab */}
              {activeTab === 'history' && (
                <div className="space-y-4">
                  {patient.medicalHistory && patient.medicalHistory.length > 0 ? (
                    patient.medicalHistory.map((condition, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 bg-white dark:bg-white/5 dark:backdrop-blur-md rounded-xl shadow-sm dark:shadow-[0_14px_30px_rgba(2,6,23,0.35)] border border-gray-100 dark:border-white/10 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ease-in-out"
                      >
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">{condition.condition}</h4>
                          {condition.diagnosed && (
                            <p className="text-sm text-gray-600 dark:text-slate-300">Diagnosed: {condition.diagnosed}</p>
                          )}
                        </div>
                        {condition.status && (
                          <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(condition.status.toLowerCase())}`}>
                            {condition.status}
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No medical history found</h3>
                      <p className="text-gray-600 dark:text-gray-300">This patient doesn't have any medical history recorded yet.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Visit Sessions Tab */}
              {activeTab === 'visits' && (
                <div className="space-y-4">
                  {historyLoading ? (
                    <div className="text-center py-12">
                      <Loader className="h-12 w-12 text-blue-600 dark:text-blue-400 mx-auto mb-4 animate-spin" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Loading visit history...</h3>
                    </div>
                  ) : sessionHistory && sessionHistory.length > 0 ? (
                    <div className="relative border-l-2 border-gray-200 dark:border-white/10 ml-4 pb-4">
                      {sessionHistory.map((session, index) => (
                        <div key={session.sessionId || index} className="mb-8 ml-6 relative">
                          <div className="absolute -left-[29px] top-1 h-3 w-3 rounded-full bg-blue-500 shadow-sm animate-pulse" />
                          <div className="bg-white dark:bg-white/5 dark:backdrop-blur-md rounded-xl p-4 shadow-sm dark:shadow-[0_14px_30px_rgba(2,6,23,0.35)] border border-gray-100 dark:border-white/10 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ease-in-out">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                              <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <User className="h-4 w-4 text-blue-500" />
                                {session.doctorName}
                              </h4>
                              <span className="text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full">
                                {session.date} • {session.time}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-300">
                              <div className="flex items-center gap-2">
                                <Activity className="h-4 w-4 text-gray-400" />
                                <span>Specialization: {session.doctorSpecialization}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-gray-400" />
                                <span>Duration: {session.duration} minutes</span>
                              </div>
                            </div>
                            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600 flex items-center justify-between">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${session.status === 'ended' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-300' :
                                session.status === 'accepted' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300' :
                                  'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300'
                                }`}>
                                {session.status === 'ended' ? 'Visit Completed' : session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                              </span>
                              <span className="text-[10px] text-gray-400 uppercase tracking-wider">Session ID: {session.sessionId.toString().slice(-6)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16 bg-gray-50 dark:bg-white/5 dark:backdrop-blur-md rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10">
                      <div className="mx-auto h-20 w-20 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mb-6">
                        <History className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Visit Sessions Found</h3>
                      <p className="text-gray-600 dark:text-gray-300 max-w-xs mx-auto">This patient does not have any recorded medical visits in our system yet.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Doctor inline preview modal is intentionally disabled; preview opens in a new tab */}
      {false && inlinePreview.visible && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 w-full max-w-6xl h-[88vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-3 p-4 border-b border-gray-100 dark:border-slate-700">
              <div className="flex items-center gap-2 min-w-0">
                {inlinePreview.downloadUrl && (
                  <button
                    onClick={() => handleDownload(inlinePreview.record, inlinePreview.downloadUrl)}
                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-all duration-200 ease-in-out"
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                )}
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {inlinePreview.title || inlinePreview.fileName || 'Document Preview'}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {inlinePreview.fileName || 'document'}
                    {inlinePreview.mimeType ? ` | ${inlinePreview.mimeType}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={closeInlinePreview}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-all duration-200 ease-in-out"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-gray-50 dark:bg-slate-950 p-4 overflow-auto">
              {inlinePreview.loading && (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <Loader className="h-8 w-8 text-blue-600 dark:text-blue-400 animate-spin mb-3" />
                  <p className="text-sm text-gray-600 dark:text-gray-300">Loading document preview...</p>
                </div>
              )}

              {!inlinePreview.loading && inlinePreview.error && (
                <div className="h-full flex flex-col items-center justify-center text-center px-4">
                  <AlertCircle className="h-8 w-8 text-red-500 mb-3" />
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Unable to load document preview</p>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mb-4">{inlinePreview.error}</p>
                  {inlinePreview.downloadUrl && (
                    <button
                      onClick={() => handleDownload(inlinePreview.record, inlinePreview.downloadUrl)}
                      className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-[#0EA5A4] to-[#0891B2] dark:bg-none dark:bg-white/10 dark:backdrop-blur-md dark:border dark:border-white/15 text-white text-sm font-medium rounded-full transition-all duration-200 ease-in-out hover:scale-[1.03] hover:shadow-md dark:shadow-[0_12px_30px_rgba(8,47,73,0.45)] dark:hover:bg-white/15 dark:hover:border-[#22D3EE]/35"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download File
                    </button>
                  )}
                </div>
              )}

              {!inlinePreview.loading && !inlinePreview.error && inlinePreview.previewType === 'image' && inlinePreview.url && (
                <div className="h-full flex items-center justify-center">
                  <img
                    src={inlinePreview.url}
                    alt={inlinePreview.title || 'Medical record preview'}
                    className="max-w-full max-h-full object-contain rounded-lg"
                    onError={handleInlinePreviewLoadError}
                  />
                </div>
              )}

              {!inlinePreview.loading && !inlinePreview.error && inlinePreview.previewType === 'pdf' && inlinePreview.url && (
                <iframe
                  src={inlinePreview.url}
                  title={inlinePreview.title || 'PDF Preview'}
                  className="w-full h-full rounded-lg bg-white dark:bg-slate-900"
                  onError={handleInlinePreviewLoadError}
                />
              )}

              {!inlinePreview.loading && !inlinePreview.error && inlinePreview.previewType === 'unsupported' && (
                <div className="h-full flex items-center justify-center px-4">
                  <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
                    <h4 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-3">Preview not available for this file type</h4>
                    <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                      <p><span className="font-medium">File name:</span> {inlinePreview.fileName || 'document'}</p>
                      <p><span className="font-medium">File type:</span> {inlinePreview.mimeType || 'Unknown'}</p>
                      <p><span className="font-medium">File size:</span> {formatPreviewFileSize(inlinePreview.size)}</p>
                    </div>
                    {inlinePreview.downloadUrl && (
                      <button
                        onClick={() => handleDownload(inlinePreview.record, inlinePreview.downloadUrl)}
                        className="mt-4 inline-flex items-center px-4 py-2 bg-gradient-to-r from-[#0EA5A4] to-[#0891B2] dark:bg-none dark:bg-white/10 dark:backdrop-blur-md dark:border dark:border-white/15 text-white text-sm font-medium rounded-full transition-all duration-200 ease-in-out hover:scale-[1.03] hover:shadow-md dark:shadow-[0_12px_30px_rgba(8,47,73,0.45)] dark:hover:bg-white/15 dark:hover:border-[#22D3EE]/35"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download File
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Medical Records Modal */}
      {
        patient && (
          <MedicalRecordsModal
            isOpen={showRecordsModal}
            onClose={handleCloseRecordsModal}
            patient={patient}
            records={medicalRecords || []}
          />
        )
      }

      {/* Document Upload Modal */}
      {
        patient && (
          <DocumentUploadModal
            isOpen={showDocumentUpload}
            onClose={handleCloseDocumentUpload}
            patient={patient}
            onUploadSuccess={handleDocumentUploadSuccess}
          />
        )
      }

      {/* Appointment Modal */}
      {
        patient && (
          <AppointmentModal
            isOpen={showAppointmentModal}
            onClose={handleCloseAppointmentModal}
            patient={patient}
            onAppointmentCreated={handleAppointmentCreated}
          />
        )
      }

      {/* Finish Session Confirmation Modal */}
      {
        isEndModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-[400px] rounded-[16px] border border-white/40 dark:border-white/10 bg-white/85 dark:bg-slate-900/90 backdrop-blur-xl shadow-[0_20px_45px_rgba(15,23,42,0.22)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.55)] p-6 sm:p-7 animate-in fade-in zoom-in-95 duration-200">
              <div className="text-center">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Finish Session?</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Are you sure you want to end this session?
                </p>
              </div>

              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  onClick={() => setIsEndModalOpen(false)}
                  disabled={isEnding}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/5 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-white/10 transition-colors disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFinishSession}
                  disabled={isEnding}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isEnding ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      Ending...
                    </>
                  ) : (
                    'End Session'
                  )}
                </button>
              </div>
            </div>
          </div>
        )
      }

      </div>
    </div>
  );
};

export default PatientDetails;


