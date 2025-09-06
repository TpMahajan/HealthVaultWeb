import React, { useState, useEffect } from 'react';
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
  FileText as FileTextIcon
} from 'lucide-react';

/* ----------------------
 * Footer Component
 * --------------------*/
const Footer = () => (
  <footer className="w-full py-6 border-t border-gray-200 flex items-center justify-center mt-12">
    <img src="/AiAllyLogo.png" alt="Ai Ally Logo" className="h-6 mr-2" />
    <span className="text-sm text-gray-500">Powered by Ai Ally</span>
  </footer>
);

const PatientDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  // Mock patient data - replace with API call in production
  const mockPatient = {
    id: 'PAT001',
    name: 'Raju Sharma',
    age: 45,
    gender: 'Male',
    dateOfBirth: '1979-03-15',
    bloodType: 'O+',
    height: '175 cm',
    weight: '78 kg',
    lastVisit: '2024-01-15',
    nextAppointment: '2024-02-15',
    emergencyContact: {
      name: 'Raju Sharma',
      relationship: 'Spouse',
      phone: '+91 (555) 123-4567'
    },
    medicalHistory: [
      { condition: 'Hypertension', diagnosed: '2020-01-15', status: 'Active' },
      { condition: 'Type 2 Diabetes', diagnosed: '2018-06-20', status: 'Controlled' },
      { condition: 'Asthma', diagnosed: '2015-03-10', status: 'Inactive' }
    ],
    medications: [
      { name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily', prescribed: '2020-01-15' },
      { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily', prescribed: '2018-06-20' },
      { name: 'Atorvastatin', dosage: '20mg', frequency: 'Once daily', prescribed: '2021-03-12' }
    ],
    medicalRecords: [
      {
        id: 'REC001',
        type: 'Lab Report',
        title: 'Blood Work Results',
        date: '2024-01-15',
        status: 'reviewed',
        fileType: 'pdf',
        size: '2.4 MB'
      },
      {
        id: 'REC002',
        type: 'Imaging',
        title: 'Chest X-Ray',
        date: '2024-01-10',
        status: 'pending',
        fileType: 'image',
        size: '5.1 MB'
      },
      {
        id: 'REC003',
        type: 'Prescription',
        title: 'Medication Refill',
        date: '2024-01-08',
        status: 'reviewed',
        fileType: 'pdf',
        size: '1.2 MB'
      },
      {
        id: 'REC004',
        type: 'Lab Report',
        title: 'Cholesterol Panel',
        date: '2023-12-20',
        status: 'reviewed',
        fileType: 'pdf',
        size: '1.8 MB'
      },
      {
        id: 'REC005',
        type: 'Imaging',
        title: 'Echocardiogram',
        date: '2023-12-15',
        status: 'reviewed',
        fileType: 'image',
        size: '8.7 MB'
      }
    ]
  };

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setPatient(mockPatient);
      setLoading(false);
    }, 1000);
  }, [id]);

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
        return <FileTextIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Patient not found</h3>
        <p className="text-gray-600">The patient you're looking for doesn't exist.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/patients')}
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors duration-200"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Patients
        </button>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{patient.name}</h1>
            <p className="mt-2 text-gray-600">Patient ID: {patient.id}</p>
          </div>
          <div className="flex space-x-3">
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors duration-200">
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
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Patient Information</h2>
            
            <div className="space-y-4">
              <div className="flex items-center text-sm text-gray-600">
                <User className="h-4 w-4 mr-3 text-gray-400" />
                <span className="font-medium text-gray-900">{patient.age} years old</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="h-4 w-4 mr-3 text-gray-400" />
                <span className="font-medium text-gray-900">DOB: {patient.dateOfBirth}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-600">Blood Type:</span>
                <span className="ml-2 font-medium text-gray-900">{patient.bloodType}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-600">Height:</span>
                <span className="ml-2 font-medium text-gray-900">{patient.height}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-600">Weight:</span>
                <span className="ml-2 font-medium text-gray-900">{patient.weight}</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Emergency Contact</h3>
              <div className="text-sm text-gray-600">
                <p className="font-medium text-gray-900">{patient.emergencyContact.name}</p>
                <p>{patient.emergencyContact.relationship}</p>
                <p>{patient.emergencyContact.phone}</p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Next Appointment</h3>
              <div className="text-sm text-gray-600">
                <p className="font-medium text-gray-900">{patient.nextAppointment}</p>
                <p>2:00 PM - Cardiology</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Tabs */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6">
            <div className="border-b border-gray-200">
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
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.name}
                    {tab.count && (
                      <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs font-medium">
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
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
                    <div className="flex flex-wrap gap-3">
                      <button className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200">
                        <FileText className="h-4 w-4 mr-2" />
                        Add New Record
                      </button>
                      <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors duration-200">
                        <Calendar className="h-4 w-4 mr-2" />
                        Schedule Appointment
                      </button>
                      <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors duration-200">
                        <Download className="h-4 w-4 mr-2" />
                        Download Summary
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Medical Records Tab */}
              {activeTab === 'records' && (
                <div className="space-y-4">
                  {patient.medicalRecords.map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200"
                    >
                      <div className="flex items-center space-x-4">
                        {getFileIcon(record.fileType)}
                        <div>
                          <h4 className="font-medium text-gray-900">{record.title}</h4>
                          <p className="text-sm text-gray-600">{record.type} • {record.date} • {record.size}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(record.status)}`}>
                          {record.status}
                        </span>
                        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors duration-200">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors duration-200">
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
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
                        <h4 className="font-medium text-gray-900">{med.name}</h4>
                        <p className="text-sm text-gray-600">{med.dosage} • {med.frequency}</p>
                        <p className="text-xs text-gray-500">Prescribed: {med.prescribed}</p>
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
                        <h4 className="font-medium text-gray-900">{condition.condition}</h4>
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
    </div>
  );
};

export default PatientDetails;
