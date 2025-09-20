import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, User, Calendar, FileText, Download, Eye, Loader, AlertCircle, Clock, Mail, Phone, ArrowRight } from 'lucide-react';
import Footer from './Footer';

const Patients = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Load cached patients from localStorage
  useEffect(() => {
    const loadCachedPatients = () => {
      try {
        setLoading(true);
        console.log('🔍 Patients - Loading cached patients from localStorage');
        
        const cached = localStorage.getItem('patients');
        if (!cached) {
          console.log('📭 No cached patients found');
          setPatients([]);
          setError(null);
          setLoading(false);
          return;
        }
        
        const allPatients = JSON.parse(cached);
        console.log('📋 All cached patients:', allPatients);
        
        // Filter out expired patients
        const validPatients = allPatients.filter(patient => {
          const isValid = patient.expiresAt > Date.now();
          if (!isValid) {
            console.log(`⏰ Patient ${patient.name} expired at ${new Date(patient.expiresAt).toLocaleString()}`);
          }
          return isValid;
        });
        
        console.log(`✅ Found ${validPatients.length} valid patients (${allPatients.length - validPatients.length} expired)`);
        
        // Update localStorage with only valid patients
        if (validPatients.length !== allPatients.length) {
          localStorage.setItem('patients', JSON.stringify(validPatients));
          console.log(`🧹 Cleaned up ${allPatients.length - validPatients.length} expired patients`);
        }
        
        setPatients(validPatients);
        setError(null);
      } catch (error) {
        console.error('❌ Error loading cached patients:', error);
        setError('Failed to load cached patients');
        setPatients([]);
      } finally {
        setLoading(false);
      }
    };

    loadCachedPatients();
  }, []);

  // Helper function to format expiry date
  const formatExpiryDate = (expiresAt) => {
    const date = new Date(expiresAt);
    const now = new Date();
    const diffMs = expiresAt - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return 'Expired';
    if (diffDays === 1) return 'Expires tomorrow';
    if (diffDays <= 7) return `Expires in ${diffDays} days`;
    return `Expires ${date.toLocaleDateString()}`;
  };

  // Filter patients based on search term
  const filteredPatients = patients.filter(patient => {
    const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (patient.mobile && patient.mobile.includes(searchTerm));
    return matchesSearch;
  });

  // Handle viewing patient details
  const handleViewDetails = (patient) => {
    console.log('🔍 Patients - Viewing details for patient:', patient);
    
    // For cached patients, we need to generate a token or use a different approach
    // Since we only have cached data, we'll navigate with the patient ID
    // The PatientDetails page will need to handle this case
    navigate(`/patient-details/${patient.id}`);
  };

  // Loading state
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-2xl flex items-center justify-center mb-6">
              <Loader className="h-8 w-8 text-blue-600 dark:text-blue-400 animate-spin" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Loading Patients</h3>
            <p className="text-gray-600 dark:text-gray-300">Please wait while we load cached patient data...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Error state (only show if no patients are loaded)
  if (error && patients.length === 0) {
    return (
      <div className="max-w-7xl mx-auto flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-gradient-to-r from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 rounded-2xl flex items-center justify-center mb-6">
              <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Error Loading Patients</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex-grow p-4 sm:p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Patients</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            View cached patients from QR code scans (7-day expiry)
          </p>
        </div>

        {/* Search and Stats */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search patients by name, email, or mobile..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
              </div>
            </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Patients</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{patients.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Clock className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Valid Cache</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{filteredPatients.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Calendar className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Cache Duration</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">7 Days</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Patients List */}
        {filteredPatients.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-16 w-16 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-2xl flex items-center justify-center mb-6">
              <User className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {patients.length === 0 ? 'No Cached Patients' : 'No Matching Patients'}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {patients.length === 0 
                ? 'Scan patient QR codes to cache their data for 7 days'
                : 'Try adjusting your search terms'
              }
            </p>
            {patients.length === 0 && (
              <button
                onClick={() => navigate('/scan')}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to QR Scanner
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPatients.map((patient) => (
              <div key={patient.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{patient.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Patient ID: {patient.id}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center text-gray-600 dark:text-gray-300">
                    <Mail className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="text-sm">{patient.email}</span>
                  </div>
                  {patient.mobile && (
                    <div className="flex items-center text-gray-600 dark:text-gray-300">
                      <Phone className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="text-sm">{patient.mobile}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Cache Status</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      patient.expiresAt > Date.now() + (24 * 60 * 60 * 1000) // More than 1 day left
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>
                      {formatExpiryDate(patient.expiresAt)}
                    </span>
                  </div>
                  <button
                    onClick={() => handleViewDetails(patient)}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium py-2 px-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Banner */}
        {patients.length > 0 && (
          <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Patient Data Caching
                </h3>
                <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                  <p>
                    Patient data is automatically cached for 7 days when you scan their QR code. 
                    Expired patients are automatically removed from the cache.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Patients;