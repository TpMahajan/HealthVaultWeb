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
  Plus
} from 'lucide-react';
import { API_BASE } from '../constants/api';
import { useAuth } from '../context/AuthContext';
import Footer from './Footer';
import MedicalRecordsModal from './MedicalRecordsModal';
import DocumentUploadModal from './DocumentUploadModal';
import AppointmentModal from './AppointmentModal';
import { generatePatientSummaryPDF } from '../utils/pdfGenerator';

const PatientDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { anonAuth } = useAuth();
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

        const isDoctor = storedToken && storedRole === "doctor";
        const isPatient = storedToken && storedRole === "patient";
        const isAnonymous = !storedToken && urlToken;

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
          apiUrl = `${API_BASE}/users/${id}?token=${encodeURIComponent(urlToken)}`;
          // No Authorization header for anonymous
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
            const patientData = {
              id: user._id || user.id,
              name: user.name || 'Unknown',
              age: user.age || null,
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
              medicalHistory: user.medicalHistory || [],
              medications: user.medications || [],
              medicalRecords: user.medicalRecords || [],
              profilePicture: user.profilePicture || null
            };
            
            console.log('✅ PatientDetails - Processed patient data:', patientData);
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

      const isDoctor = storedToken && storedRole === "doctor";
      const isPatient = storedToken && storedRole === "patient";
      const isAnonymous = !storedToken && urlToken;

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
        // Anonymous: allowlisted records endpoint with query token, no Authorization header
        endpoint = `${API_BASE}/users/${patientId}/records?token=${encodeURIComponent(urlToken)}`;
        // No Authorization header for anonymous
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

  // Fetch medical records when patient data is loaded
  useEffect(() => {
    if (patient && patient.id) {
      fetchMedicalRecords(patient.id);
    }
    // Avoid duplicate fetches when route re-renders quickly
    // by not depending on isCachedData changes here
  }, [patient]);

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
      } catch {}
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
      } catch {}
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
            try { document.body.removeChild(loadingMessage); } catch {}
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

  // Filter medical records based on search term
  const filteredMedicalRecords = medicalRecords.filter(record => {
    if (!recordsSearchTerm) return true;
    
    const searchLower = recordsSearchTerm.toLowerCase();
    return (
      record.title?.toLowerCase().includes(searchLower) ||
      record.category?.toLowerCase().includes(searchLower) ||
      new Date(record.uploadedAt || record.createdAt).toLocaleDateString().toLowerCase().includes(searchLower)
    );
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
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Loading Patient Details</h3>
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
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Error Loading Patient</h3>
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
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Patient Not Found</h3>
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
    <div className="max-w-7xl mx-auto bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-4 sm:mb-6 md:mb-8 p-3 sm:p-4">
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
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 truncate">{patient.name}</h1>
              <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-300 truncate">Patient ID: {patient.id}</p>
            </div>
            {/* Desktop: All buttons in a row */}
            <div className="hidden sm:flex space-x-2 md:space-x-3 flex-shrink-0">
              {!isAnonymousView && (
                <button 
                  onClick={handleDocumentUpload}
                  className="inline-flex items-center px-3 md:px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs md:text-sm font-medium rounded-lg md:rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200">
                  <Upload className="h-3.5 w-3.5 md:h-4 md:w-4 md:mr-2" />
                  <span className="hidden md:inline">Upload</span>
                </button>
              )}
              {!isAnonymousView && (
                <button 
                  onClick={handleScheduleAppointment}
                  className="inline-flex items-center px-3 md:px-4 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white text-xs md:text-sm font-medium rounded-lg md:rounded-xl hover:from-green-700 hover:to-teal-700 transition-all duration-200">
                  <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4 md:mr-2" />
                  <span className="hidden md:inline">Appointment</span>
                </button>
              )}
              <button 
                onClick={handleDownloadSummary}
                disabled={downloadLoading === 'summary'}
                className="inline-flex items-center px-3 md:px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white text-xs md:text-sm font-medium rounded-lg md:rounded-xl hover:from-orange-700 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200">
                {downloadLoading === 'summary' ? (
                  <Loader className="h-3.5 w-3.5 md:h-4 md:w-4 md:mr-2 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5 md:h-4 md:w-4 md:mr-2" />
                )}
                <span className="hidden md:inline">Summary</span>
              </button>
            </div>
          </div>
          {/* Mobile: Stacked buttons */}
          <div className="grid grid-cols-2 gap-2 sm:hidden">
            {!isAnonymousView && (
              <button 
                onClick={handleDocumentUpload}
                className="inline-flex items-center justify-center px-3 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200">
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Upload
              </button>
            )}
            {!isAnonymousView && (
              <button 
                onClick={handleScheduleAppointment}
                className="inline-flex items-center justify-center px-3 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white text-xs font-medium rounded-lg hover:from-green-700 hover:to-teal-700 transition-all duration-200">
                <Calendar className="h-3.5 w-3.5 mr-1.5" />
                Appointment
              </button>
            )}
            <button 
              onClick={handleDownloadSummary}
              disabled={downloadLoading === 'summary'}
              className={`inline-flex items-center justify-center px-3 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white text-xs font-medium rounded-lg hover:from-orange-700 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ${!isAnonymousView ? '' : 'col-span-2'}`}>
              {downloadLoading === 'summary' ? (
                <Loader className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5 mr-1.5" />
              )}
              Summary
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 px-3 sm:px-4">
        {/* Patient Info Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 sm:p-6 lg:sticky lg:top-24">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">Patient Information</h2>
            
            <div className="space-y-4">
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                <User className="h-4 w-4 mr-3 text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500" />
                <span className="font-medium text-gray-900 dark:text-gray-100 dark:text-gray-100">{patient.age} years old</span>
              </div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                <Calendar className="h-4 w-4 mr-3 text-gray-400 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500" />
                <span className="font-medium text-gray-900 dark:text-gray-100 dark:text-gray-100">DOB: {patient.dateOfBirth}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-600 dark:text-gray-300">Blood Type:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-gray-100 dark:text-gray-100">{patient.bloodType}</span>
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
              <div className="text-sm text-gray-600">
                <p className="font-medium text-gray-900 dark:text-gray-100">{patient.emergencyContact.name}</p>
                <p>{patient.emergencyContact.relationship}</p>
                <p>{patient.emergencyContact.phone}</p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Next Appointment</h3>
              <div className="text-sm text-gray-600">
                <p className="font-medium text-gray-900 dark:text-gray-100">{patient.nextAppointment}</p>
                <p>2:00 PM - Cardiology</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Tabs */}
          <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-4 sm:mb-6">
            <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
              <nav className="flex space-x-4 sm:space-x-6 md:space-x-8 px-3 sm:px-4 md:px-6 min-w-max">
                {[
                  { id: 'overview', name: 'Overview', count: null },
                  { id: 'records', name: 'Records', fullName: 'Medical Records', count: medicalRecords.length },
                  { id: 'medications', name: 'Meds', fullName: 'Medications', count: patient.medications.length },
                  { id: 'history', name: 'History', fullName: 'Medical History', count: patient.medicalHistory.length }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors duration-200 ${
                      activeTab === tab.id
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
                    <div className="bg-blue-50 rounded-xl p-4">
                      <h3 className="text-sm font-medium text-blue-900 mb-2">Recent Activity</h3>
                      <p className="text-sm text-blue-700">Last visit: {patient.lastVisit}</p>
                      <p className="text-sm text-blue-700">
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
                    <div className="bg-green-50 rounded-xl p-4">
                      <h3 className="text-sm font-medium text-green-900 mb-2">Health Status</h3>
                      <p className="text-sm text-green-700">Overall: Stable</p>
                      <p className="text-sm text-green-700">Risk Level: Low</p>
                    </div>
                  </div>
                  
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

                  {/* Search Bar */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search records by title, category, or date..."
                      value={recordsSearchTerm}
                      onChange={(e) => setRecordsSearchTerm(e.target.value)}
                      className="w-full px-4 py-3 pl-10 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
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
                            <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(record.status || 'pending')}`}>
                              <span className="flex items-center space-x-1">
                                {getStatusIcon(record.status || 'pending')}
                                <span>{record.status || 'pending'}</span>
                              </span>
                            </span>
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
                  {patient.medications.map((med, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                    >
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-gray-100">{med.name}</h4>
                        <p className="text-sm text-gray-600">{med.dosage} • {med.frequency}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">Prescribed: {med.prescribed}</p>
                      </div>
                      <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor('active')}`}>
                        Active
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Medical History Tab */}
              {activeTab === 'history' && (
                <div className="space-y-4">
                  {patient.medicalHistory.map((condition, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                    >
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-gray-100">{condition.condition}</h4>
                        <p className="text-sm text-gray-600">Diagnosed: {condition.diagnosed}</p>
                      </div>
                      <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(condition.status.toLowerCase())}`}>
                        {condition.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />

      {/* Medical Records Modal */}
      {patient && (
        <MedicalRecordsModal
          isOpen={showRecordsModal}
          onClose={handleCloseRecordsModal}
          patient={patient}
          records={medicalRecords || []}
        />
      )}

      {/* Document Upload Modal */}
      {patient && (
        <DocumentUploadModal
          isOpen={showDocumentUpload}
          onClose={handleCloseDocumentUpload}
          patient={patient}
          onUploadSuccess={handleDocumentUploadSuccess}
        />
      )}

      {/* Appointment Modal */}
      {patient && (
        <AppointmentModal
          isOpen={showAppointmentModal}
          onClose={handleCloseAppointmentModal}
          patient={patient}
          onAppointmentCreated={handleAppointmentCreated}
        />
      )}
    </div>
  );
};

export default PatientDetails;

