import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
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
  X,
  Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Footer from './Footer';
import MedicalRecordsModal from './MedicalRecordsModal';
import DocumentUploadModal from './DocumentUploadModal';
import AppointmentModal from './AppointmentModal';
import AIAssistant from './AIAssistant';
import AnimatedChatButton from './AnimatedChatButton';
import { generatePatientSummaryPDF } from '../utils/pdfGenerator';
import { API_BASE } from '../constants/api';

const PatientDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { anonAuth, user } = useAuth();
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
  // Inline preview state (image on same page, PDFs in new tab)
  const [inlinePreview, setInlinePreview] = useState({ visible: false, url: '', title: '' });
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
  const [modalDiagnosis, setModalDiagnosis] = useState('');
  const [modalNotes, setModalNotes] = useState('');
  const [isEnding, setIsEnding] = useState(false);
  const [isExtending, setIsExtending] = useState(false);


  // Fetch patient data from API
  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Role detection with proper priority
        const urlToken = searchParams.get("token");
        const storedToken = localStorage.getItem("token");
        const storedRole = localStorage.getItem("role");

        // PRIORITY: URL token takes precedence over anything in localStorage
        const hasUrlAnonToken = !!urlToken;
        const isDoctor = !hasUrlAnonToken && storedToken && storedRole === "doctor";
        const isPatient = !hasUrlAnonToken && storedToken && storedRole === "patient";
        const isAnonymous = hasUrlAnonToken; // treat as anonymous whenever token is present in URL

        console.log('🔍 PatientDetails - Role detection:', {
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
        } else if (isAnonymous) {
          console.log('👻 PatientDetails - Anonymous access flow');
          apiUrl = `${API_BASE}/users/${id}`;
          // Prefer sending token via Authorization header (optionalAuth also supports query)
          headers['Authorization'] = `Bearer ${urlToken}`;
        } else {
          setError('No valid access method found. Please log in or scan a QR code.');
          setLoading(false);
          return;
        }

        console.log(`📡 PatientDetails - Calling API: ${apiUrl}`);
        console.log(`📡 PatientDetails - Headers:`, headers);

        const response = await fetch(apiUrl, { headers });
        const data = await response.json();

        console.log('📡 PatientDetails - Full API response:', {
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
              profilePicture: user.profilePicture || null,
              profilePictureUrl: user.profilePictureUrl || null
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
        console.error('💥 PatientDetails - Error fetching patient data:', err);
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
  }, [id, searchParams.get('token')]);

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
      const urlToken = searchParams.get("token");
      const storedToken = localStorage.getItem("token");
      const storedRole = localStorage.getItem("role");

      // PRIORITY: URL token takes precedence over anything in localStorage
      const hasUrlAnonToken = !!urlToken;
      const isDoctor = !hasUrlAnonToken && storedToken && storedRole === "doctor";
      const isPatient = !hasUrlAnonToken && storedToken && storedRole === "patient";
      const isAnonymous = hasUrlAnonToken; // treat as anonymous whenever token is present in URL

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
      } else if (isAnonymous) {
        // Anonymous: allowlisted records endpoint with Authorization header
        endpoint = `${API_BASE}/users/${patientId}/records`;
        headers['Authorization'] = `Bearer ${urlToken}`;
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
      const response = await fetch(`${API_BASE}/sessions/debug/${patientId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.debug?.activeSession) {
          setActiveSession(data.debug.activeSession);
          console.log('✅ Found active session:', data.debug.activeSession);
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
      const anonToken = searchParams.get('token');
      const url = `${API_BASE}/files/${docId}/preview${anonToken ? `?token=${encodeURIComponent(anonToken)}` : ''}`;
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
    if (!data.signedUrl) throw new Error('No signed URL received');
    return data.signedUrl;
  };

  // Helper: fetch signed download URL for a document
  const getSignedDownloadUrl = async (docId, token) => {
    let res;
    try {
      const anonToken = searchParams.get('token');
      const url = `${API_BASE}/files/${docId}/download?json=true${anonToken ? `&token=${encodeURIComponent(anonToken)}` : ''}`;
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
    if (!data.signedUrl) throw new Error('No signed URL received');
    return data.signedUrl;
  };

  // Handle preview for medical records
  const handlePreview = async (doc) => {
    try {
      console.log('👁️ Starting preview for document:', doc);

      // Validate document object
      if (!doc || !doc._id) {
        console.error('Invalid document object:', doc);
        alert('Invalid document. Please refresh the page and try again.');
        return;
      }

      const storedToken = localStorage.getItem('token');
      const storedRole = localStorage.getItem('role');
      const anonToken = searchParams.get('token');
      const isAnonymous = !storedToken && !!anonToken;

      // Determine file type with better detection
      const mimeType = doc.mimeType || doc.fileType || '';
      const fileName = doc.title || doc.originalName || '';
      const fileExtension = fileName.toLowerCase().split('.').pop() || '';

      // Enhanced file type detection
      const isPDF = mimeType.includes('pdf') ||
        fileExtension === 'pdf' ||
        fileName.toLowerCase().endsWith('.pdf');

      const isImage = mimeType.includes('image') ||
        ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(fileExtension) ||
        fileName.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/);

      // Handle generic MIME types by checking file extension
      const isGenericFile = mimeType === 'application/octet-stream' || mimeType === 'application/unknown';
      const isLikelyPDF = isGenericFile && fileExtension === 'pdf';
      const isLikelyImage = isGenericFile && ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(fileExtension);

      console.log('📄 File type detection:', {
        mimeType,
        fileName,
        fileExtension,
        isPDF,
        isImage,
        isGenericFile,
        isLikelyPDF,
        isLikelyImage
      });

      if (isPDF || isLikelyPDF) {
        // PDFs: open in new tab using signed URL
        const signedUrl = await getSignedPreviewUrl(doc._id, isAnonymous ? null : storedToken);
        const win = window.open(signedUrl, '_blank', 'noopener');
      } else if (isImage || isLikelyImage) {
        // Images: fetch signed URL; open in new tab for reliability and also set inline preview
        const signedUrl = await getSignedPreviewUrl(doc._id, isAnonymous ? null : storedToken);
        const win = window.open(signedUrl, '_blank', 'noopener');
        setInlinePreview({ visible: true, url: signedUrl, title: doc.title || 'Image Preview' });
      } else {
        // For other file types, automatically trigger download
        console.log('📁 Other file type, triggering download:', doc._id);
        handleDownload(doc);
      }
    } catch (error) {
      console.error('Preview failed:', error);
      alert(`Preview failed: ${error.message || error.toString()}`);
    }
  };

  // Handle download for medical records
  const handleDownload = async (doc) => {
    try {
      console.log('🔽 Starting download for document:', doc);

      // Validate document object
      if (!doc || !doc._id) {
        console.error('Invalid document object:', doc);
        alert('Invalid document. Please refresh the page and try again.');
        return;
      }

      const storedToken = localStorage.getItem('token');
      const anonToken = searchParams.get('token');
      const isAnonymous = !storedToken && !!anonToken;

      // Always use backend download endpoint to get signed URL, then trigger download
      const downloadUrl = await getSignedDownloadUrl(doc._id, isAnonymous ? null : storedToken);
      console.log('🔽 Signed download URL:', downloadUrl);

      // Show loading indicator
      const loadingMessage = document.createElement('div');
      loadingMessage.style.cssText = `
        position: fixed; top: 20px; right: 20px; background: #4CAF50; color: white; 
        padding: 12px 20px; border-radius: 4px; z-index: 10000; font-family: Arial, sans-serif;
      `;
      loadingMessage.textContent = 'Preparing download...';
      document.body.appendChild(loadingMessage);

      try {
        // Create a temporary link to trigger the browser to open/download
        const link = document.createElement('a');
        link.href = downloadUrl;
        // For cross-origin, download attr may be ignored; open in new tab is reliable
        link.target = '_blank';
        link.rel = 'noopener';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Update loading message to success
        loadingMessage.textContent = 'Download started!';
        loadingMessage.style.background = '#4CAF50';
        setTimeout(() => {
          if (document.body.contains(loadingMessage)) {
            try { document.body.removeChild(loadingMessage); } catch { }
          }
        }, 2000);

        console.log('🔽 Download triggered successfully');
      } finally {
        // Remove loading message if it still exists
        if (document.body.contains(loadingMessage)) {
          document.body.removeChild(loadingMessage);
        }
      }

    } catch (error) {
      console.error('Download failed with error:', error);
      const errorMessage = error.message || error.toString() || 'Unknown error occurred';
      alert(`Download failed: ${errorMessage}`);
    }
  };

  // Handle download all medical records
  const handleDownloadAll = async (docs) => {
    setDownloadLoading('bulk');

    try {
      const storedToken = localStorage.getItem('token');
      const anonToken = searchParams.get('token');
      const isAnonymous = !storedToken && !!anonToken;

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
    setModalDiagnosis('');
    setModalNotes('');
    setIsEndModalOpen(true);
    setShowActionsDropdown(false);
  };

  const confirmEndSession = async () => {
    if (!activeSession) return;

    setIsEnding(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/sessions/end/${activeSession._id}`, {
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
        if (patient?.id) fetchSessionHistory(patient.id);
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to end session');
      }
    } catch (err) {
      console.error('Error ending session:', err);
      alert('An error occurred while ending the session');
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
        console.log('✅ Session extended successfully');
        setActiveSession(prev => ({ ...prev, expiresAt: data.data.expiresAt }));
        alert('Session extended by 20 minutes!');
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

  // Test function for debugging appointment creation
  // Call this in browser console: window.testAppointmentCreation()
  window.testAppointmentCreation = async () => {
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
      <div className="max-w-7xl mx-auto bg-gray-50 dark:bg-gray-900 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-2xl flex items-center justify-center mb-6">
            <Loader className="h-8 w-8 text-blue-600 dark:text-blue-400 animate-spin" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2" style={{ fontFamily: "'Josefin Sans', system-ui, sans-serif", fontWeight: 600 }}>Loading Patient Details</h3>
          <p className="text-gray-600 dark:text-gray-300">Please wait while we fetch patient information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto bg-gray-50 dark:bg-gray-900 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 rounded-2xl flex items-center justify-center mb-6">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2" style={{ fontFamily: "'Josefin Sans', system-ui, sans-serif", fontWeight: 600 }}>Error Loading Patient</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
          <div className="flex justify-center space-x-3">
            <button
              onClick={() => navigate('/scan')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Scan QR Code Again
            </button>
            <button
              onClick={() => navigate('/patients')}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
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
      <div className="max-w-7xl mx-auto bg-gray-50 dark:bg-gray-900 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-2xl flex items-center justify-center mb-6">
            <User className="h-8 w-8 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2" style={{ fontFamily: "'Josefin Sans', system-ui, sans-serif", fontWeight: 600 }}>Patient Not Found</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">The patient you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/scan')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Scan QR Code
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto min-h-screen">
      {/* Session Expired Popup */}
      {showSessionExpiredPopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
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
                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Back to Patients
              </button>
              <button
                onClick={() => {
                  setShowSessionExpiredPopup(false);
                  navigate('/settings');
                }}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Go to Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/patients')}
          className="inline-flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:text-gray-100 mb-3 sm:mb-4 transition-colors duration-200 text-sm sm:text-base"
        >
          <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
          Back to Patients
        </button>

        {/* Cached Data Notice */}
        {isCachedData && (
          <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Cached Patient Data
                </h3>
                <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                  <p>
                    You're viewing cached patient information. Some details may be limited.
                    To see complete patient data, scan the patient's QR code again.
                  </p>
                </div>
                <div className="mt-3">
                  <button
                    onClick={() => navigate('/scan')}
                    className="bg-yellow-600 text-white px-3 py-1 rounded-md text-sm font-medium hover:bg-yellow-700 transition-colors"
                  >
                    Scan QR Code for Full Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white truncate" style={{ fontFamily: "'Josefin Sans', system-ui, sans-serif", fontWeight: 700 }}>{patient.name}</h1>
              <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-300 truncate" style={{ fontFamily: "'Josefin Sans', system-ui, sans-serif", fontWeight: 400 }}>Patient ID: {patient.id}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:gap-4 md:flex-nowrap">
              {/* Manage Session Dropdown (Only if session is active) */}
              {activeSession && !isAnonymousView && (
                <div className="relative">
                  <button
                    onClick={() => setShowSessionDropdown(!showSessionDropdown)}
                    className="inline-flex items-center px-4 sm:px-5 py-2.5 sm:py-3 bg-amber-500 hover:bg-amber-600 text-white text-xs sm:text-sm font-bold rounded-xl sm:rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-lg shadow-amber-200 dark:shadow-none group"
                  >
                    <Activity className="h-4 w-4 mr-2" />
                    <span>Manage Session</span>
                    <ChevronDown className={`h-4 w-4 ml-2 transition-transform duration-300 ${showSessionDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showSessionDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowSessionDropdown(false)}
                      />
                      <div className="absolute right-0 mt-3 w-56 sm:w-64 bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-700 p-2 z-50 animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-300 overflow-hidden">
                        <div className="p-3 mb-2 border-b border-slate-50 dark:border-slate-700/50">
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
                    </>
                  )}
                </div>
              )}

              {/* Actions Dropdown (Replacing separate buttons) */}
              <div className="relative">
                <button
                  onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                  className="inline-flex items-center px-4 sm:px-5 py-2.5 sm:py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs sm:text-sm font-bold rounded-xl sm:rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-lg shadow-slate-200 dark:shadow-none group"
                >
                  <MoreHorizontal className="h-4 w-4 mr-2" />
                  <span>Patient Actions</span>
                  <ChevronDown className={`h-4 w-4 ml-2 transition-transform duration-300 ${showActionsDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {showActionsDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowActionsDropdown(false)}
                    />
                    <div className="absolute right-0 mt-3 w-56 sm:w-64 bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-700 p-2 z-50 animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-300 overflow-hidden">
                      <div className="p-3 mb-2 border-b border-slate-50 dark:border-slate-700/50">
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
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 px-2 sm:px-4">
        {/* Patient Info Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-md rounded-xl shadow-sm border border-white/50 dark:border-gray-700/50 p-4 sm:p-6 lg:sticky lg:top-24">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4" style={{ fontFamily: "'Josefin Sans', system-ui, sans-serif", fontWeight: 600 }}>Patient Information</h2>
            {(patient.profilePictureUrl || patient.profilePicture) && (
              <div className="flex justify-center mb-4">
                <img
                  src={patient.profilePictureUrl || patient.profilePicture}
                  alt={`${patient.name} avatar`}
                  className="h-24 w-24 rounded-full object-cover border-4 border-blue-100 dark:border-gray-700 shadow-sm"
                  onError={(e) => {
                    console.error('❌ Failed to load profile picture:', patient.profilePictureUrl || patient.profilePicture);
                    e.target.style.display = 'none';
                  }}
                  onLoad={() => {
                    console.log('✅ Profile picture loaded successfully');
                  }}
                />
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                <User className="h-4 w-4 mr-3 text-gray-400 dark:text-gray-500" />
                <span className="font-medium text-gray-900 dark:text-gray-100">{patient.age} years old</span>
              </div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                <Calendar className="h-4 w-4 mr-3 text-gray-400 dark:text-gray-500" />
                <span className="font-medium text-gray-900 dark:text-gray-100">DOB: {patient.dateOfBirth}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-600 dark:text-gray-300">Blood Type:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">{patient.bloodType}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-600 dark:text-gray-300">Height:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">{patient.height}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-600 dark:text-gray-300">Weight:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">{patient.weight}</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Emergency Contact</h3>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {patient.emergencyContact?.name ? (
                  <>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{patient.emergencyContact.name}</p>
                    {patient.emergencyContact.relationship && <p>{patient.emergencyContact.relationship}</p>}
                    {patient.emergencyContact.phone && <p>{patient.emergencyContact.phone}</p>}
                  </>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">No emergency contact information available</p>
                )}
              </div>
            </div>

            {!isAnonymousView && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Next Appointment</h3>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {patient.nextAppointment ? (
                    <>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{patient.nextAppointment}</p>
                      <p>2:00 PM - Cardiology</p>
                    </>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">No upcoming appointments</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Tabs */}
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-md rounded-xl shadow-sm border border-white/50 dark:border-gray-700/50 mb-4 sm:mb-6">
            <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
              <nav className="flex space-x-4 sm:space-x-6 md:space-x-8 px-3 sm:px-4 md:px-6 min-w-max">
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
                    className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors duration-200 ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300'
                      }`}
                  >
                    <span className="sm:hidden">{tab.name}</span>
                    <span className="hidden sm:inline">{tab.fullName || tab.name}</span>
                    {tab.count !== null && tab.count !== undefined && (
                      <span className="ml-1.5 sm:ml-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 py-0.5 px-1.5 sm:px-2.5 rounded-full text-xs font-medium">
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
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                      <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">Recent Activity</h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300">Last visit: {patient.lastVisit || 'N/A'}</p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
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
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                      <h3 className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">Health Status</h3>
                      <p className="text-sm text-green-700 dark:text-green-300">Overall: Stable</p>
                      <p className="text-sm text-green-700 dark:text-green-300">Risk Level: Low</p>
                    </div>
                  </div>

                  {/* Allergies Section - Always show if allergies exist */}
                  {(() => {
                    const allergies = patient?.allergies;
                    const shouldShow = allergies &&
                      (typeof allergies === 'string' || typeof allergies === 'object') &&
                      String(allergies).trim() !== '';

                    // Debug log for anonymous view
                    if (isAnonymousView) {
                      console.log('👻 Allergies Render - allergies:', allergies);
                      console.log('👻 Allergies Render - shouldShow:', shouldShow);
                      console.log('👻 Allergies Render - patient exists:', !!patient);
                    }

                    return shouldShow ? (
                      <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
                        <h3 className="text-sm font-medium text-red-900 dark:text-red-100 mb-2 flex items-center">
                          <AlertCircle className="h-4 w-4 mr-2" />
                          Allergies
                        </h3>
                        <p className="text-sm text-red-700 dark:text-red-300">{String(allergies)}</p>
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
                      <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100">Medical Records</h3>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                        {recordsLoading ? 'Loading...' : `${medicalRecords.length} records available`}
                      </p>
                    </div>
                    {/* Desktop buttons */}
                    <div className="hidden sm:flex space-x-2 md:space-x-3">
                      <button
                        onClick={() => fetchMedicalRecords(patient.id)}
                        className="inline-flex items-center px-3 md:px-4 py-2 bg-gray-600 text-white text-xs md:text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        <Loader className="h-3.5 w-3.5 md:h-4 md:w-4 md:mr-2" />
                        <span className="hidden md:inline">Refresh</span>
                      </button>
                      <button
                        onClick={handleViewAllRecords}
                        className="inline-flex items-center px-3 md:px-4 py-2 bg-blue-600 text-white text-xs md:text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5 md:h-4 md:w-4 md:mr-2" />
                        <span className="hidden md:inline">View All</span>
                      </button>
                      <button
                        onClick={handleBulkDownload}
                        disabled={downloadLoading === 'bulk'}
                        className="inline-flex items-center px-3 md:px-4 py-2 bg-green-600 text-white text-xs md:text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                        className="inline-flex items-center justify-center px-2 py-2 bg-gray-600 text-white text-xs font-medium rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        <Loader className="h-3.5 w-3.5 mr-1" />
                        Refresh
                      </button>
                      <button
                        onClick={handleViewAllRecords}
                        className="inline-flex items-center justify-center px-2 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        View
                      </button>
                      <button
                        onClick={handleBulkDownload}
                        disabled={downloadLoading === 'bulk'}
                        className="inline-flex items-center justify-center px-2 py-2 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                        className="w-full px-4 py-3 pl-10 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-full doctor-focus-ring text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
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
                        className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-full doctor-focus-ring text-gray-900 dark:text-gray-100 text-sm font-medium"
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
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
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
                          className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
                        >
                          <div className="flex items-center space-x-4">
                            {getFileIcon(record.mimeType?.includes('pdf') ? 'pdf' : 'image')}
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-gray-100">{record.title}</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                {record.category} • {new Date(record.uploadedAt || record.createdAt).toLocaleDateString()} • {Math.round(record.size / 1024)}KB
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => handlePreview(record)}
                              className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200"
                              title="Preview"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDownload(record)}
                              className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200"
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
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                        {recordsSearchTerm ? 'No records match your search' : 'No medical records found'}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 mb-4">
                        {recordsSearchTerm
                          ? `No records found matching "${recordsSearchTerm}". Try a different search term.`
                          : "This patient doesn't have any medical records yet, or there might be an issue loading them."
                        }
                      </p>
                      <div className="space-x-3">
                        <button
                          onClick={() => fetchMedicalRecords(patient.id)}
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Refresh Records
                        </button>
                        <button
                          onClick={handleDocumentUpload}
                          className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
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
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl"
                      >
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">{med.name}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300">{med.dosage} • {med.frequency}</p>
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
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No medications found</h3>
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
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl"
                      >
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">{condition.condition}</h4>
                          {condition.diagnosed && (
                            <p className="text-sm text-gray-600 dark:text-gray-300">Diagnosed: {condition.diagnosed}</p>
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
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No medical history found</h3>
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
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Loading visit history...</h3>
                    </div>
                  ) : sessionHistory && sessionHistory.length > 0 ? (
                    <div className="relative border-l-2 border-blue-100 dark:border-gray-700 ml-4 pb-4">
                      {sessionHistory.map((session, index) => (
                        <div key={session.sessionId || index} className="mb-8 ml-6 relative">
                          <div className="absolute -left-[33px] top-0 h-4 w-4 rounded-full bg-blue-500 border-4 border-white dark:border-gray-800 shadow-sm" />
                          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-5 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200 border border-transparent hover:border-blue-200 dark:hover:border-blue-800">
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
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${session.status === 'ended' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                session.status === 'accepted' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                                  'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
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
                    <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                      <div className="mx-auto h-20 w-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-6">
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

      {/* End Session Modal (Imported logic from Patients.js) */}
      {
        isEndModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden border border-white/20 dark:border-slate-800 animate-in zoom-in-95 slide-in-from-bottom-8 duration-500">
              {/* Modal Header */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-white relative">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Shield className="h-32 w-32" />
                </div>

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <div className="h-14 w-14 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20">
                      <CheckCircle className="h-7 w-7 text-emerald-400" />
                    </div>
                    <button
                      onClick={() => setIsEndModalOpen(false)}
                      className="h-10 w-10 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <h3 className="text-3xl font-black mb-2 tracking-tight" style={{ fontFamily: "'Josefin Sans', system-ui, sans-serif" }}>
                    Finish Session
                  </h3>
                  <p className="text-slate-400 font-medium">Enter patient details</p>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-8 text-center space-y-6">
                <div className="mx-auto h-24 w-24 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle className="h-12 w-12 text-rose-500" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Finish Session?</h3>
                  <p className="text-slate-500 dark:text-slate-400">Are you sure you want to end the current session for <strong>{patient.name}</strong>?</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <button
                    onClick={() => setIsEndModalOpen(false)}
                    className="flex-1 px-8 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all font-['Josefin_Sans']"
                  >
                    No, Keep Open
                  </button>
                  <button
                    onClick={confirmEndSession}
                    disabled={isEnding}
                    className="flex-1 px-8 py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-bold hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all shadow-xl shadow-rose-200 dark:shadow-none flex items-center justify-center gap-2 font-['Josefin_Sans']"
                  >
                    {isEnding ? (
                      <>
                        <Loader className="h-5 w-5 animate-spin" />
                        Ending...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-5 w-5" />
                        Yes, Finish
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      <Footer />
    </div >
  );
};

export default PatientDetails;

