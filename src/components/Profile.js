import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Phone, MapPin, Shield, Edit, Save, X } from 'lucide-react';

// Footer Component
const Footer = () => (
  <footer className="w-full py-6 border-t border-gray-200 flex items-center justify-center mt-12">
    <img src="/AiAllyLogo.png" alt="Ai Ally Logo" className="h-6 mr-2" />
    <span className="text-sm text-gray-500">Powered by Ai Ally</span>
  </footer>
);

const Profile = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || 'Dr. Sarah Johnson',
    email: user?.email || 'sarah.johnson@medivault.com',
    phone: '+1 (555) 987-6543',
    specialty: user?.specialty || 'Cardiology',
    license: 'MD123456',
    experience: '15 years',
    location: 'New York, NY',
    education: 'Harvard Medical School',
    graduationYear: '2009',
    certifications: ['Board Certified Cardiologist', 'ACLS Certified', 'BLS Certified'],
    languages: ['English', 'Spanish'],
    bio: 'Experienced cardiologist with over 15 years of practice specializing in interventional cardiology and preventive care.'
  });

  const handleSave = () => {
    // In real app, make API call to update profile
    setIsEditing(false);
  };

  const handleCancel = () => {
    setProfileData({
      name: user?.name || 'Dr. Sarah Johnson',
      email: user?.email || 'sarah.johnson@medivault.com',
      phone: '+1 (555) 987-6543',
      specialty: user?.specialty || 'Cardiology',
      license: 'MD123456',
      experience: '15 years',
      location: 'New York, NY',
      education: 'Harvard Medical School',
      graduationYear: '2009',
      certifications: ['Board Certified Cardiologist', 'ACLS Certified', 'BLS Certified'],
      languages: ['English', 'Spanish'],
      bio: 'Experienced cardiologist with over 15 years of practice specializing in interventional cardiology and preventive care.'
    });
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between">
      <div className="max-w-4xl mx-auto w-full flex-grow p-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <p className="mt-2 text-gray-600">Manage your professional profile and information</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="text-center mb-6">
                <img
                  src={user?.avatar || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face'}
                  alt={profileData.name}
                  className="mx-auto h-24 w-24 rounded-full object-cover mb-4"
                />
                <h2 className="text-xl font-semibold text-gray-900">{profileData.name}</h2>
                <p className="text-gray-600">{profileData.specialty}</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Mail className="h-4 w-4 mr-3 text-gray-400" />
                  {profileData.email}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="h-4 w-4 mr-3 text-gray-400" />
                  {profileData.phone}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="h-4 w-4 mr-3 text-gray-400" />
                  {profileData.location}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Shield className="h-4 w-4 mr-3 text-gray-400" />
                  License: {profileData.license}
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Stats</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center p-3 bg-blue-50 rounded-xl">
                    <div className="text-2xl font-bold text-blue-600">1,247</div>
                    <div className="text-gray-600">Patients</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-xl">
                    <div className="text-2xl font-bold text-green-600">15</div>
                    <div className="text-gray-600">Years</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Profile Information</h2>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors duration-200"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </button>
                ) : (
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSave}
                      className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </button>
                    <button
                      onClick={handleCancel}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors duration-200"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                {/* Personal Info, Professional Info, Bio, Certifications, Languages */}
                {/* ... (your full existing detail sections remain unchanged) ... */}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Profile;
