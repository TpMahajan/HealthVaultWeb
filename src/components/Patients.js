import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, User, Calendar, FileText, Download, Eye } from 'lucide-react';

/* ----------------------
 * Footer Component
 * --------------------*/
const Footer = () => (
  <footer className="w-full py-6 border-t border-gray-200 flex items-center justify-center mt-10">
    <img src="/AiAllyLogo.png" alt="Ai Ally Logo" className="h-6 mr-2" />
    <span className="text-sm text-gray-500">Powered by Ai Ally</span>
  </footer>
);

const Patients = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const navigate = useNavigate();

  // Mock patient data - replace with API call in production
  const patients = [
    {
      id: 'PAT001',
      name: 'Ravi Kumar',
      age: 45,
      gender: 'Male',
      lastVisit: '2024-01-15',
      status: 'active',
      records: 12,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
    },
    {
      id: 'PAT002',
      name: 'Raju Sharma',
      age: 32,
      gender: 'Female',
      lastVisit: '2024-01-10',
      status: 'active',
      records: 8,
      avatar: '/Guy1.jpg'
    },
    {
      id: 'PAT003',
      name: 'TusharM',
      age: 58,
      gender: 'Male',
      lastVisit: '2024-01-08',
      status: 'inactive',
      records: 15,
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
    },
    {
      id: 'PAT004',
      name: 'Sunita Singh',
      age: 29,
      gender: 'Female',
      lastVisit: '2024-01-12',
      status: 'active',
      records: 6,
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face'
    },
    {
      id: 'PAT005',
      name: 'Baburao Ganpatrao Apte',
      age: 67,
      gender: 'Male',
      lastVisit: '2024-01-05',
      status: 'active',
      records: 22,
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face'
    },
    {
      id: 'PAT006',
      name: 'Rohan Deshmukh',
      age: 41,
      gender: 'Female',
      lastVisit: '2024-01-03',
      status: 'inactive',
      records: 11,
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face'
    }
  ];

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || patient.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status) => {
    return status === 'active' 
      ? 'bg-green-100 text-green-800 border-green-200' 
      : 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusText = (status) => {
    return status === 'active' ? 'Active' : 'Inactive';
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col min-h-screen">
      <div className="flex-grow">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Patients</h1>
          <p className="mt-2 text-gray-600">Manage and access patient health records</p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search patients by name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>
            </div>

            {/* Filter */}
            <div className="sm:w-48">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="block w-full px-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="all">All Patients</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredPatients.length} of {patients.length} patients
          </div>
        </div>

        {/* Patients Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPatients.map((patient) => (
            <div
              key={patient.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200"
            >
              {/* Patient Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <img
                    src={patient.avatar}
                    alt={patient.name}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{patient.name}</h3>
                    <p className="text-sm text-gray-500">{patient.id}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(patient.status)}`}>
                  {getStatusText(patient.status)}
                </span>
              </div>

              {/* Patient Info */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center text-sm text-gray-600">
                  <User className="h-4 w-4 mr-2 text-gray-400" />
                  {patient.age} years • {patient.gender}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                  Last visit: {patient.lastVisit}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <FileText className="h-4 w-4 mr-2 text-gray-400" />
                  {patient.records} medical records
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                <button
                  onClick={() => navigate(`/patient/${patient.id}`)}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Records
                </button>
                <button
                  className="px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors duration-200"
                  title="Download Records"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredPatients.length === 0 && (
          <div className="text-center py-12">
            <div className="mx-auto h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <User className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No patients found</h3>
            <p className="text-gray-600">
              {searchTerm || filterStatus !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'No patients have been added yet'
              }
            </p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/scan')}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
            >
              <FileText className="h-4 w-4 mr-2" />
              Scan New Patient
            </button>
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors duration-200">
              <Download className="h-4 w-4 mr-2" />
              Export Patient List
            </button>
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors duration-200">
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
