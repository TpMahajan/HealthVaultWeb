import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, User, Calendar, FileText, Download, Eye, Loader, AlertCircle } from 'lucide-react';
import Footer from './Footer';

const Patients = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Fetch patients from API
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        // Fetch from both sources: seeded patients and HealthVault users
        const [patientsResponse, healthvaultUsersResponse] = await Promise.all([
          fetch('http://localhost:5000/api/patients', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }),
          fetch('http://localhost:5000/api/patients/healthvault-users', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })
        ]);

        const [patientsData, healthvaultUsersData] = await Promise.all([
          patientsResponse.json(),
          healthvaultUsersResponse.json()
        ]);
        
        // Combine both datasets
        const allPatients = [
          ...(patientsData.success ? patientsData.patients : []),
          ...(healthvaultUsersData.success ? healthvaultUsersData.patients : [])
        ];

        console.log('Fetched data:', {
          patients: patientsData.success ? patientsData.patients.length : 0,
          healthvaultUsers: healthvaultUsersData.success ? healthvaultUsersData.patients.length : 0,
          total: allPatients.length
        });

        if (allPatients.length > 0) {
          setPatients(allPatients);
        } else {
          setError('No patients found in the system. Please check if there are users in the HealthVault database.');
        }
      } catch (err) {
        setError('Failed to fetch patients. Please try again.');
        console.error('Error fetching patients:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.patientId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || (patient.medicalHistory && patient.medicalHistory.length > 0 ? 'active' : 'inactive') === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // Calculate patient age from date of birth
  const calculateAge = (dateOfBirth) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Get patient status based on medical history
  const getPatientStatus = (patient) => {
    return patient.medicalHistory && patient.medicalHistory.length > 0 ? 'active' : 'inactive';
  };

  const getStatusColor = (status) => {
    return status === 'active' 
      ? 'bg-green-100 text-green-800 border-green-200' 
      : 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusText = (status) => {
    return status === 'active' ? 'Active' : 'Inactive';
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
            <p className="text-gray-600 dark:text-gray-300">Please wait while we fetch patient data...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-7xl mx-auto flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-gradient-to-r from-red-100 to-pink-100 dark:from-red-900/30 dark:to-pink-900/30 rounded-2xl flex items-center justify-center mb-6">
              <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Error Loading Patients</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
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
      <div className="flex-grow">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Patients</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">Manage and access patient health records</p>
          
          {/* Statistics */}
          <div className="mt-4 flex flex-wrap gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-lg">
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Total: {patients.length} patients
              </span>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-lg">
              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                HealthVault Users: {patients.filter(p => p.isUser && p.source === 'healthvault').length}
              </span>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 px-4 py-2 rounded-lg">
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                Seeded Patients: {patients.filter(p => !p.isUser).length}
              </span>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  type="text"
                  placeholder="Search patients by name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            </div>

            {/* Filter */}
            <div className="sm:w-48">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="all">All Patients</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
            Showing {filteredPatients.length} of {patients.length} patients
          </div>
        </div>

        {/* Patients Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPatients.map((patient) => {
            const age = calculateAge(patient.dateOfBirth);
            const status = getPatientStatus(patient);
            const medicalRecordsCount = patient.medicalHistory ? patient.medicalHistory.length : 0;
            
            return (
              <div
                key={patient.patientId}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-md transition-shadow duration-200"
              >
                {/* Patient Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center text-white font-semibold text-lg ${
                      patient.isUser && patient.source === 'healthvault'
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                        : 'bg-gradient-to-r from-blue-500 to-purple-500'
                    }`}>
                      {patient.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{patient.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{patient.patientId}</p>
                      {patient.isUser && patient.source === 'healthvault' && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                          HealthVault User
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(status)}`}>
                    {getStatusText(status)}
                  </span>
                </div>

                {/* Patient Info */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                    <User className="h-4 w-4 mr-2 text-gray-400 dark:text-gray-500" />
                    {age} years • {patient.gender}
                  </div>
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                    <Calendar className="h-4 w-4 mr-2 text-gray-400 dark:text-gray-500" />
                    DOB: {new Date(patient.dateOfBirth).toLocaleDateString()}
                  </div>
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                    <FileText className="h-4 w-4 mr-2 text-gray-400 dark:text-gray-500" />
                    {medicalRecordsCount} medical records
                  </div>
                  {patient.bloodType && patient.bloodType !== 'Unknown' && (
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                      <div className="h-4 w-4 mr-2 text-gray-400 dark:text-gray-500 flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      </div>
                      Blood Type: {patient.bloodType}
                    </div>
                  )}
                  {patient.email && (
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                      <div className="h-4 w-4 mr-2 text-gray-400 dark:text-gray-500 flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      </div>
                      {patient.email}
                    </div>
                  )}
                  {patient.mobile && patient.mobile !== 'N/A' && (
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                      <div className="h-4 w-4 mr-2 text-gray-400 dark:text-gray-500 flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      </div>
                      {patient.mobile}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => navigate(`/patient/${patient.patientId}`)}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Records
                  </button>
                  <button
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                    title="Download Records"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredPatients.length === 0 && (
          <div className="text-center py-12">
            <div className="mx-auto h-16 w-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <User className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No patients found</h3>
            <p className="text-gray-600 dark:text-gray-300">
              {searchTerm || filterStatus !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'No patients have been added yet'
              }
            </p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/scan')}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
            >
              <FileText className="h-4 w-4 mr-2" />
              Scan New Patient
            </button>
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
              <Download className="h-4 w-4 mr-2" />
              Export Patient List
            </button>
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
              <Filter className="h-4 w-4 mr-2" />
              Advanced Filters
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Patients;
