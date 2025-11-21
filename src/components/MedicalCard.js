import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  User, 
  Mail, 
  Phone, 
  Pill, 
  AlertTriangle, 
  Heart,
  Loader,
  Calendar,
  Droplet,
  Maximize2,
  Scale,
  Shield,
  Stethoscope
} from 'lucide-react';
import { API_BASE } from '../constants/api';

const MedicalCard = () => {
  const { userId } = useParams();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        setLoading(true);
        setError(null);

        const apiUrl = `${API_BASE}/users/${userId}/medical-card`;
        const response = await fetch(apiUrl, {
          headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.message || 'Failed to load medical card');
          setLoading(false);
          return;
        }

        const user = data.data?.user || data.data;
        if (user) {
          setPatient(user);
        } else {
          setError('Patient data not found');
        }
      } catch (err) {
        console.error('Error fetching medical card:', err);
        setError(`Failed to load medical card: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchPatientData();
    } else {
      setError('Invalid patient ID');
      setLoading(false);
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300 font-medium">Loading medical card...</p>
        </div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Error</h2>
          <p className="text-gray-600 dark:text-gray-300">{error || 'Medical card not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-6 px-4 sm:py-8 sm:px-6">
      <div className="max-w-5xl mx-auto">
        {/* Medical Card - Enhanced Design */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden mb-6">
          {/* Header with Enhanced Gradient */}
          <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 sm:p-10 text-white overflow-hidden">
            {/* Decorative Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -mr-32 -mt-32"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full -ml-24 -mb-24"></div>
            </div>
            
            <div className="relative z-10">
              {/* Medical Icon */}
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
                  <Stethoscope className="w-12 h-12 text-white" />
                </div>
              </div>
              
              <h1 className="text-3xl sm:text-4xl font-bold mb-3 text-center">
                {patient.name || 'N/A'}
              </h1>
              <div className="flex items-center justify-center gap-2 text-white/90">
                <Mail className="w-5 h-5" />
                <span className="text-base sm:text-lg">{patient.email || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Card Content */}
          <div className="p-6 sm:p-8">
            <div className="flex flex-col md:grid md:grid-cols-2 gap-6">
              {/* Emergency Contact - Show first on mobile */}
              {patient.emergencyContact && (patient.emergencyContact.name || patient.emergencyContact.phone) && (
                <div className="space-y-4 order-first md:order-none">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                      <Shield className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      Emergency Contact
                    </h2>
                  </div>
                  <div className="p-5 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl border-2 border-orange-300 dark:border-orange-700 shadow-lg">
                    {patient.emergencyContact.name && (
                      <p className="font-bold text-xl text-gray-900 dark:text-white mb-2">
                        {patient.emergencyContact.name}
                      </p>
                    )}
                    {patient.emergencyContact.relationship && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                        {patient.emergencyContact.relationship}
                      </p>
                    )}
                    {patient.emergencyContact.phone && (
                      <div className="flex items-center gap-3 mt-4">
                        <div className="p-2 bg-orange-200 dark:bg-orange-800 rounded-lg">
                          <Phone className="w-5 h-5 text-orange-700 dark:text-orange-300" />
                        </div>
                        <a 
                          href={`tel:${patient.emergencyContact.phone}`} 
                          className="text-lg font-bold text-orange-700 dark:text-orange-300 hover:text-orange-800 dark:hover:text-orange-200 hover:underline transition-colors"
                        >
                          {patient.emergencyContact.phone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Personal Information */}
              <div className="space-y-4 order-2 md:order-none">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                    <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Personal Information
                  </h2>
                </div>
                
                <div className="space-y-3">
                  {patient.dateOfBirth && (
                    <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                          Date of Birth
                        </p>
                        <p className="font-bold text-gray-900 dark:text-white text-base">
                          {patient.dateOfBirth}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {patient.age && (
                    <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                          Age
                        </p>
                        <p className="font-bold text-gray-900 dark:text-white text-base">
                          {patient.age} years
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {patient.gender && (
                    <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
                        <User className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                          Gender
                        </p>
                        <p className="font-bold text-gray-900 dark:text-white text-base">
                          {patient.gender}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {patient.bloodType && (
                    <div className="flex items-center gap-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                      <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg">
                        <Droplet className="w-5 h-5 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide mb-1">
                          Blood Type
                        </p>
                        <p className="font-bold text-red-700 dark:text-red-300 text-lg">
                          {patient.bloodType}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {patient.height && (
                    <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                        <Maximize2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                          Height
                        </p>
                        <p className="font-bold text-gray-900 dark:text-white text-base">
                          {patient.height}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {patient.weight && (
                    <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                        <Scale className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                          Weight
                        </p>
                        <p className="font-bold text-gray-900 dark:text-white text-base">
                          {patient.weight}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {patient.mobile && (
                    <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <Phone className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                          Mobile
                        </p>
                        <a 
                          href={`tel:${patient.mobile}`}
                          className="font-bold text-gray-900 dark:text-white text-base hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          {patient.mobile}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Medical Information */}
              <div className="space-y-4 order-3 md:order-none md:col-span-2">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-xl">
                    <Heart className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Medical Information
                  </h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Medications */}
                  {patient.medications && patient.medications.length > 0 && (
                    <div className="md:col-span-1">
                      <div className="flex items-center gap-2 mb-3">
                        <Pill className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <h3 className="font-bold text-gray-900 dark:text-white">Medications</h3>
                      </div>
                      <div className="space-y-3">
                        {patient.medications.map((med, index) => (
                          <div 
                            key={index} 
                            className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 hover:shadow-md transition-shadow"
                          >
                            <p className="font-bold text-gray-900 dark:text-white mb-2">
                              {med.name || 'N/A'}
                            </p>
                            {med.dosage && (
                              <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                                <span className="font-semibold">Dosage:</span> {med.dosage}
                              </p>
                            )}
                            {med.frequency && (
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                <span className="font-semibold">Frequency:</span> {med.frequency}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Allergies */}
                  {patient.allergies && (
                    <div className="md:col-span-1">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                        <h3 className="font-bold text-gray-900 dark:text-white">Allergies</h3>
                      </div>
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border-2 border-red-200 dark:border-red-800 hover:shadow-md transition-shadow">
                        <p className="text-gray-900 dark:text-white font-medium">
                          {patient.allergies || 'None reported'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note - Enhanced */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full shadow-lg">
            <Shield className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              This medical card is for emergency use only. Please keep it updated.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedicalCard;
