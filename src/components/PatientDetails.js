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
import Footer from './Footer';
import MedicalRecordsModal from './MedicalRecordsModal';
import DocumentUploadModal from './DocumentUploadModal';
import AppointmentModal from './AppointmentModal';
import { generatePatientSummaryPDF } from '../utils/pdfGenerator';

const PatientDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [patient, setPatient] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRecordsModal, setShowRecordsModal] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(null);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [isCachedData, setIsCachedData] = useState(false);

  // Fetch patient data from API
  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get patient token from URL parameters
        const patientToken = searchParams.get('token');
        console.log('🔍 PatientDetails - Fetching patient data for ID:', id);
        console.log('🔍 PatientDetails - Using token:', patientToken ? 'Present' : 'Not found');
        
        if (!patientToken) {
          // Try to get patient data from cached patients
          console.log('🔍 PatientDetails - No token, checking cached patients');
          const cachedPatients = JSON.parse(localStorage.getItem('patients') || '[]');
          const cachedPatient = cachedPatients.find(p => p.id === id);
          
          if (cachedPatient) {
            console.log('✅ PatientDetails - Found cached patient:', cachedPatient);
            // Transform cached patient data to patient format
            const patientData = {
              id: cachedPatient.id,
              name: cachedPatient.name,
              email: cachedPatient.email,
              mobile: cachedPatient.mobile,
              age: null,
              gender: null,
              dateOfBirth: null,
              bloodType: null,
              height: null,
              weight: null,
              lastVisit: null,
              nextAppointment: null,
              emergencyContact: {
                name: null,
                relationship: null,
                phone: null
              },
              medicalHistory: [],
              medications: [],
              medicalRecords: [],
              profilePicture: null
            };
            setPatient(patientData);
            setIsCachedData(true);
            setLoading(false);
            return;
          } else {
            setError('No patient token provided and patient not found in cache. Please scan QR code again.');
            setLoading(false);
            return;
          }
        }

        // Fetch patient data using the /auth/me endpoint
        const response = await fetch(`${API_BASE}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${patientToken}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('📡 PatientDetails - Response status:', response.status);
        
        const data = await response.json();
        console.log('📋 PatientDetails - Patient data response:', data);

        if (response.status === 401) {
          if (data.message === "User not found") {
            setError("Patient not found in database");
          } else if (data.message === "Invalid token.") {
            setError("Invalid patient token");
          } else if (data.message === "Token expired.") {
            setError("Patient token has expired");
          } else {
            setError(`Authentication failed: ${data.message}`);
          }
          return;
        }

        if (response.status === 403) {
          setError("Patient account is deactivated");
          return;
        }

        if (data.success && data.data && data.data.user) {
          const user = data.data.user;
          
          // Transform user data to patient format
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
          
          console.log('✅ PatientDetails - Patient data loaded:', patientData);
          setPatient(patientData);
          setIsCachedData(false);
        } else {
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
  }, [id, searchParams]);

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
    setDownloadLoading('bulk');
    
    try {
      // Simulate bulk download process
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Create a zip-like download simulation
      const blob = new Blob(['Mock zip file content'], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${patient.name}_Medical_Records.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (error) {
      console.error('Bulk download failed:', error);
    } finally {
      setDownloadLoading(null);
    }
  };

  // New handler functions for document upload and appointment scheduling
  const handleDocumentUpload = () => {
    setShowDocumentUpload(true);
  };

  const handleCloseDocumentUpload = () => {
    setShowDocumentUpload(false);
  };

  const handleDocumentUploadSuccess = (newDocument) => {
    setDocuments(prev => [newDocument, ...prev]);
    console.log('Document uploaded successfully:', newDocument);
  };

  const handleScheduleAppointment = () => {
    setShowAppointmentModal(true);
  };

  const handleCloseAppointmentModal = () => {
    setShowAppointmentModal(false);
  };

  const handleAppointmentCreated = (newAppointment) => {
    setAppointments(prev => [newAppointment, ...prev]);
    console.log('Appointment created successfully:', newAppointment);
  };

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
      <div className="mb-8 p-4">
        <button
          onClick={() => navigate('/patients')}
          className="inline-flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:text-gray-100 mb-4 transition-colors duration-200"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
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
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 dark:text-gray-100">{patient.name}</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">Patient ID: {patient.id}</p>
          </div>
          <div className="flex space-x-3">
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
              <Download className="h-4 w-4 mr-2" />
              Export Records
            </button>
            <button className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200">
              <FileText className="h-4 w-4 mr-2" />
              Add Record
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Patient Info Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 sticky top-24">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 dark:text-gray-100 mb-4">Patient Information</h2>
            
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
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="flex space-x-8 px-6">
                {[
                  { id: 'overview', name: 'Overview', count: null },
                  { id: 'records', name: 'Medical Records', count: patient.medicalRecords.length },
                  { id: 'medications', name: 'Medications', count: patient.medications.length },
                  { id: 'history', name: 'Medical History', count: patient.medicalHistory.length }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.name}
                    {tab.count && (
                      <span className="ml-2 bg-gray-100 text-gray-900 dark:text-gray-100 py-0.5 px-2.5 rounded-full text-xs font-medium">
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-blue-50 rounded-xl p-4">
                      <h3 className="text-sm font-medium text-blue-900 mb-2">Recent Activity</h3>
                      <p className="text-sm text-blue-700">Last visit: {patient.lastVisit}</p>
                      <p className="text-sm text-blue-700">Records added: 3 this month</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-4">
                      <h3 className="text-sm font-medium text-green-900 mb-2">Health Status</h3>
                      <p className="text-sm text-green-700">Overall: Stable</p>
                      <p className="text-sm text-green-700">Risk Level: Low</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Quick Actions</h3>
                    <div className="flex flex-wrap gap-3">
                      <button 
                        onClick={handleDocumentUpload}
                        className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Document
                      </button>
                      <button 
                        onClick={handleScheduleAppointment}
                        className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white text-sm font-medium rounded-xl hover:from-green-700 hover:to-teal-700 transition-all duration-200"
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Schedule Appointment
                      </button>
                      <button 
                        onClick={handleDownloadSummary}
                        disabled={downloadLoading === 'summary'}
                        className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white text-sm font-medium rounded-xl hover:from-orange-700 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        {downloadLoading === 'summary' ? (
                          <Loader className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        Download Summary
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Medical Records Tab */}
              {activeTab === 'records' && (
                <div className="space-y-6">
                  {/* Records Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Medical Records</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {patient.medicalRecords.length} records available
                      </p>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={handleViewAllRecords}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View All
                      </button>
                      <button
                        onClick={handleBulkDownload}
                        disabled={downloadLoading === 'bulk'}
                        className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {downloadLoading === 'bulk' ? (
                          <Loader className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        Download All
                      </button>
                    </div>
                  </div>

                  {/* Records List */}
                  <div className="space-y-3">
                    {patient.medicalRecords.map((record) => (
                      <div
                        key={record.id}
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
                      >
                        <div className="flex items-center space-x-4">
                          {getFileIcon(record.fileType)}
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-gray-100">{record.title}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              {record.type} • {new Date(record.date).toLocaleDateString()} • {record.size}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(record.status)}`}>
                            <span className="flex items-center space-x-1">
                              {getStatusIcon(record.status)}
                              <span>{record.status}</span>
                            </span>
                          </span>
                          <button 
                            onClick={() => handleViewAllRecords()}
                            className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200"
                            title="Preview"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleDownloadRecord(record)}
                            disabled={downloadLoading === record.id}
                            className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors duration-200"
                            title="Download"
                          >
                            {downloadLoading === record.id ? (
                              <Loader className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Empty State */}
                  {patient.medicalRecords.length === 0 && (
                    <div className="text-center py-12">
                      <FileText className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                        No medical records found
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 mb-4">
                        This patient doesn't have any medical records yet.
                      </p>
                      <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                        <FileText className="h-4 w-4 mr-2" />
                        Add First Record
                      </button>
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
          records={patient.medicalRecords || []}
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
