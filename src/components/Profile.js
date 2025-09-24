import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { DOCTOR_API_BASE } from '../constants/api';
import { User, Mail, Phone, MapPin, Shield, Edit, Save, X, Stethoscope, Loader } from 'lucide-react';
import Footer from './Footer';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [doctorData, setDoctorData] = useState(null);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    avatar: '',
    specialty: '',
    license: '',
    experience: '',
    location: '',
    education: '',
    bio: '',
    certifications: [],
    languages: [],
    totalPatients: 0,
    yearsOfExperience: 0
  });

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('🔧 Profile Update - Token:', token ? 'Present' : 'Missing');
      console.log('📝 Profile data being sent:', profileData);
      console.log('🌐 API Base URL:', DOCTOR_API_BASE);
      
      const updatePayload = {
        name: profileData.name,
        email: profileData.email,
        mobile: profileData.phone,
        specialty: profileData.specialty,
        license: profileData.license,
        experience: profileData.experience,
        location: profileData.location,
        education: profileData.education,
        bio: profileData.bio,
        certifications: profileData.certifications,
        languages: profileData.languages,
        totalPatients: profileData.totalPatients,
        yearsOfExperience: profileData.yearsOfExperience,
      };
      
      console.log('📦 Update payload:', updatePayload);
      console.log('🚀 Making request to:', `${DOCTOR_API_BASE}/profile`);
      
      const response = await fetch(`${DOCTOR_API_BASE}/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
      
      const data = await response.json();
      console.log('📋 Profile update response:', data);
      
      if (data.success) {
        console.log('✅ Profile updated successfully:', data.doctor);
        setDoctorData(data.doctor);
        
        // Update the user data in AuthContext to reflect the changes
        const updatedUser = { ...user, ...data.doctor };
        updateUser(updatedUser);
        
        setIsEditing(false);
        alert('Profile updated successfully!');
      } else {
        console.error('❌ Failed to update profile:', data.message);
        alert(`Failed to update profile: ${data.message}`);
      }
    } catch (error) {
      console.error('💥 Error updating profile:', error);
      console.error('💥 Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      
      if (error.message.includes('Failed to fetch')) {
        alert('Cannot connect to server. Please make sure the backend is running.');
      } else {
        alert(`Error updating profile: ${error.message}`);
      }
    }
  };

  const handleCancel = () => {
    if (doctorData) {
      setProfileData(prev => ({
        ...prev,
        name: doctorData.name || '',
        email: doctorData.email || '',
        phone: doctorData.mobile || '',
        avatar: doctorData.avatar || '',
        specialty: doctorData.specialty || '',
        license: doctorData.license || '',
        experience: doctorData.experience || '',
        location: doctorData.location || '',
        education: doctorData.education || '',
        bio: doctorData.bio || '',
        certifications: doctorData.certifications || [],
        languages: doctorData.languages || [],
        totalPatients: doctorData.totalPatients || 0,
        yearsOfExperience: doctorData.yearsOfExperience || 0,
      }));
      setHasPhoto(!!doctorData.avatar);
    }
    setIsEditing(false);
  };

  const handleUpdatePhoto = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = handlePhotoUpload;
    input.click();
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB.');
      return;
    }

    try {
      setUploadingPhoto(true);
      console.log('📸 Starting photo upload for file:', file.name);

      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('avatar', file);

      console.log('🚀 Uploading to:', `${DOCTOR_API_BASE}/profile/avatar`);

      const response = await fetch(`${DOCTOR_API_BASE}/profile/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      console.log('📡 Upload response status:', response.status);
      const data = await response.json();
      console.log('📋 Upload response:', data);

      if (data.success) {
        console.log('✅ Photo uploaded successfully:', data.avatarUrl);
        setDoctorData(data.doctor);
        setHasPhoto(true);
        
        // Update profileData with the new avatar URL
        setProfileData(prev => ({
          ...prev,
          avatar: data.avatarUrl
        }));
        
        // Update the user data in AuthContext to reflect the new avatar
        const updatedUser = { ...user, avatar: data.avatarUrl };
        console.log('🔄 Profile - Updating user with avatar:', updatedUser);
        updateUser(updatedUser);
        
        alert('Profile photo updated successfully!');
      } else {
        console.error('❌ Failed to upload photo:', data.message);
        alert(`Failed to upload photo: ${data.message}`);
      }
    } catch (error) {
      console.error('💥 Photo upload error:', error);
      alert(`Error uploading photo: ${error.message}`);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleInputChange = (field, value) => {
    console.log(`Updating ${field}:`, value);
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Fetch doctor profile data
  useEffect(() => {
    const fetchDoctorProfile = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        console.log('🔍 Profile Fetch - Token:', token ? 'Present' : 'Missing');
        console.log('🌐 API Base URL:', DOCTOR_API_BASE);
        console.log('🚀 Making request to:', `${DOCTOR_API_BASE}/profile`);
        
        const response = await fetch(`${DOCTOR_API_BASE}/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        console.log('📡 Response status:', response.status);
        console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
        
        const data = await response.json();
        console.log('📋 API Response:', data);
        
        if (data.success) {
          console.log('Doctor data received:', data.doctor);
          setDoctorData(data.doctor);
          setProfileData(prev => ({
            ...prev,
            name: data.doctor.name || '',
            email: data.doctor.email || '',
            phone: data.doctor.mobile || '',
            avatar: data.doctor.avatar || '',
            specialty: data.doctor.specialty || '',
            license: data.doctor.license || '',
            experience: data.doctor.experience || '',
            location: data.doctor.location || '',
            education: data.doctor.education || '',
            bio: data.doctor.bio || '',
            certifications: data.doctor.certifications || [],
            languages: data.doctor.languages || [],
            totalPatients: data.doctor.totalPatients || 0,
            yearsOfExperience: data.doctor.yearsOfExperience || 0,
          }));
          
          // Set hasPhoto based on avatar
          setHasPhoto(!!data.doctor.avatar);
        } else {
          console.error('Failed to fetch profile:', data.message);
          // Fallback to user data from context
          if (user) {
            setProfileData(prev => ({
              ...prev,
              name: user.name || 'Dr. Unknown',
              email: user.email || 'unknown@example.com',
              phone: user.mobile || 'No phone number',
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        // Fallback to user data from context
        if (user) {
          setProfileData(prev => ({
            ...prev,
            name: user.name || 'Dr. Unknown',
            email: user.email || 'unknown@example.com',
            phone: user.mobile || 'No phone number',
          }));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDoctorProfile();
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-2xl flex items-center justify-center mb-6">
            <Loader className="h-8 w-8 text-blue-600 dark:text-blue-400 animate-spin" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Loading Profile</h3>
          <p className="text-gray-600 dark:text-gray-300">Please wait while we fetch your profile data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto w-full flex-grow p-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Profile</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">Manage your professional profile and information</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <div className="text-center mb-6">
                {hasPhoto && profileData.avatar ? (
                  <div className="relative">
                    <img
                      src={profileData.avatar}
                      alt={profileData.name}
                      className="mx-auto h-24 w-24 rounded-full object-cover mb-4 shadow-lg"
                      onError={(e) => {
                        console.error('❌ Failed to load avatar image:', profileData.avatar);
                        console.error('❌ Image error:', e);
                        setHasPhoto(false);
                      }}
                      onLoad={() => {
                        console.log('✅ Avatar image loaded successfully:', profileData.avatar);
                      }}
                    />
                    {uploadingPhoto && (
                      <div className="absolute inset-0 mx-auto h-24 w-24 rounded-full bg-black bg-opacity-50 flex items-center justify-center">
                        <Loader className="h-6 w-6 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <div className="mx-auto h-24 w-24 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center mb-4 shadow-lg">
                      <Stethoscope className="h-12 w-12 text-white" />
                    </div>
                    {uploadingPhoto && (
                      <div className="absolute inset-0 mx-auto h-24 w-24 rounded-full bg-black bg-opacity-50 flex items-center justify-center">
                        <Loader className="h-6 w-6 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                )}
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{profileData.name}</h2>
                <p className="text-gray-600 dark:text-gray-300">{profileData.specialty}</p>
                <button 
                  onClick={handleUpdatePhoto}
                  disabled={uploadingPhoto}
                  className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadingPhoto ? 'Uploading...' : (hasPhoto ? 'Change Photo' : 'Add Photo')}
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <Mail className="h-4 w-4 mr-3 text-gray-400 dark:text-gray-500" />
                  {profileData.email}
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <Phone className="h-4 w-4 mr-3 text-gray-400 dark:text-gray-500" />
                  {profileData.phone}
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <MapPin className="h-4 w-4 mr-3 text-gray-400 dark:text-gray-500" />
                  {profileData.location}
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <Shield className="h-4 w-4 mr-3 text-gray-400 dark:text-gray-500" />
                  License: {profileData.license}
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Quick Stats</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                    {isEditing ? (
                      <input
                        type="number"
                        value={profileData.totalPatients}
                        onChange={(e) => handleInputChange('totalPatients', parseInt(e.target.value) || 0)}
                        className="w-full text-center text-2xl font-bold text-blue-600 dark:text-blue-400 bg-transparent border-none outline-none"
                        placeholder="0"
                        min="0"
                      />
                    ) : (
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{profileData.totalPatients.toLocaleString()}</div>
                    )}
                    <div className="text-gray-600 dark:text-gray-300">Patients</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                    {isEditing ? (
                      <input
                        type="number"
                        value={profileData.yearsOfExperience}
                        onChange={(e) => handleInputChange('yearsOfExperience', parseInt(e.target.value) || 0)}
                        className="w-full text-center text-2xl font-bold text-green-600 dark:text-green-400 bg-transparent border-none outline-none"
                        placeholder="0"
                        min="0"
                      />
                    ) : (
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">{profileData.yearsOfExperience}</div>
                    )}
                    <div className="text-gray-600 dark:text-gray-300">Years</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Profile Information</h2>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
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
                      className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                {/* Personal Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Personal Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Full Name
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={profileData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="Enter your full name"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-gray-100 py-2">{profileData.name}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Email Address
                      </label>
                      {isEditing ? (
                        <input
                          type="email"
                          value={profileData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="Enter your email"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-gray-100 py-2">{profileData.email}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Phone Number
                      </label>
                      {isEditing ? (
                        <input
                          type="tel"
                          value={profileData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="Enter your phone number"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-gray-100 py-2">{profileData.phone}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Specialty
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={profileData.specialty}
                          onChange={(e) => handleInputChange('specialty', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="Enter your medical specialty"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-gray-100 py-2">{profileData.specialty}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Professional Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Professional Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        License Number
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={profileData.license}
                          onChange={(e) => handleInputChange('license', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="Enter your license number"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-gray-100 py-2">{profileData.license}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Years of Experience
                      </label>
                      {isEditing ? (
                        <input
                          type="number"
                          value={profileData.yearsOfExperience}
                          onChange={(e) => handleInputChange('yearsOfExperience', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="Enter years of experience"
                          min="0"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-gray-100 py-2">{profileData.yearsOfExperience}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Location
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={profileData.location}
                          onChange={(e) => handleInputChange('location', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="Enter your location"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-gray-100 py-2">{profileData.location}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Education
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={profileData.education}
                          onChange={(e) => handleInputChange('education', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="Enter your education"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-gray-100 py-2">{profileData.education}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Professional Bio
                  </label>
                  {isEditing ? (
                    <textarea
                      value={profileData.bio}
                      onChange={(e) => handleInputChange('bio', e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="Tell us about your professional background..."
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-gray-100 py-2">{profileData.bio}</p>
                  )}
                </div>

                {/* Certifications */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Certifications
                  </label>
                  {isEditing ? (
                    <div>
                      <input
                        type="text"
                        value={profileData.certifications ? profileData.certifications.join(', ') : ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          console.log('Certifications input value:', value);
                          const certifications = value ? value.split(',').map(cert => cert.trim()).filter(cert => cert.length > 0) : [];
                          console.log('Processed certifications:', certifications);
                          handleInputChange('certifications', certifications);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="Enter certifications separated by commas (e.g., Board Certified Cardiologist, ACLS Certified)"
                      />
                      <p className="text-sm text-gray-500 mt-1">Separate multiple certifications with commas</p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {profileData.certifications && Array.isArray(profileData.certifications) && profileData.certifications.length > 0 ? (
                        profileData.certifications.map((cert, index) => (
                          <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            {cert}
                          </span>
                        ))
                      ) : (
                        <p className="text-gray-500 py-2">No certifications added</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Languages */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Languages
                  </label>
                  {isEditing ? (
                    <div>
                      <input
                        type="text"
                        value={profileData.languages ? profileData.languages.join(', ') : ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          console.log('Languages input value:', value);
                          const languages = value ? value.split(',').map(lang => lang.trim()).filter(lang => lang.length > 0) : [];
                          console.log('Processed languages:', languages);
                          handleInputChange('languages', languages);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="Enter languages separated by commas (e.g., English, Spanish, French)"
                      />
                      <p className="text-sm text-gray-500 mt-1">Separate multiple languages with commas</p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {profileData.languages && Array.isArray(profileData.languages) && profileData.languages.length > 0 ? (
                        profileData.languages.map((lang, index) => (
                          <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                            {lang}
                          </span>
                        ))
                      ) : (
                        <p className="text-gray-500 py-2">No languages added</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Quick Stats */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Stats</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Total Patients
                      </label>
                      {isEditing ? (
                        <input
                          type="number"
                          value={profileData.totalPatients}
                          onChange={(e) => handleInputChange('totalPatients', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="Enter total number of patients"
                          min="0"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-gray-100 py-2">{profileData.totalPatients.toLocaleString()}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Years of Experience
                      </label>
                      {isEditing ? (
                        <input
                          type="number"
                          value={profileData.yearsOfExperience}
                          onChange={(e) => handleInputChange('yearsOfExperience', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="Enter years of experience"
                          min="0"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-gray-100 py-2">{profileData.yearsOfExperience}</p>
                      )}
                    </div>
                  </div>
                </div>
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
