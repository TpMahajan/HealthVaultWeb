import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Phone, MapPin, Shield, Edit, Save, X, Stethoscope, Loader, Activity, Award, CheckCircle, AlertTriangle, Trash2, AlertCircle } from 'lucide-react';
import { DOCTOR_API_BASE, API_BASE } from '../constants/api';
import Footer from './Footer';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
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
    yearsOfExperience: 0,
    totalSessions: 0
  });
  // Separate state for raw input values to allow typing commas freely
  const [certificationsInput, setCertificationsInput] = useState('');
  const [languagesInput, setLanguagesInput] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success', title: '' });

  // Custom toast helper
  const showToast = (message, type = 'success', title = '') => {
    const defaultTitles = {
      success: 'Update Success',
      error: 'System Alert',
      warning: 'Attention Required'
    };
    setToast({ show: true, message, type, title: title || defaultTitles[type] });
    setTimeout(() => setToast({ show: false, message: '', type: 'success', title: '' }), 2500);
  };

  // Calculate completion percentage
  const calculateCompletion = () => {
    const fields = [
      profileData.name,
      profileData.email,
      profileData.phone,
      profileData.specialty,
      profileData.license,
      profileData.location,
      profileData.education,
      profileData.bio,
      profileData.avatar,
      profileData.certifications?.length > 0,
      profileData.languages?.length > 0
    ];
    const completed = fields.filter(f => f && (typeof f === 'string' ? f.trim() !== '' : !!f)).length;
    return Math.round((completed / fields.length) * 100);
  };

  const completionPercentage = calculateCompletion();

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');

      // Process certifications and languages from input strings before saving
      const certifications = certificationsInput.trim()
        ? certificationsInput.split(',').map(cert => cert.trim()).filter(cert => cert.length > 0)
        : [];
      const languages = languagesInput.trim()
        ? languagesInput.split(',').map(lang => lang.trim()).filter(lang => lang.length > 0)
        : [];

      console.log('🔧 Profile Update - Token:', token ? 'Present' : 'Missing');
      console.log('📝 Profile data being sent:', profileData);
      console.log('🌐 API Base URL:', DOCTOR_API_BASE);
      console.log('📋 Processed certifications:', certifications);
      console.log('📋 Processed languages:', languages);

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
        certifications: certifications,
        languages: languages,
        totalPatients: profileData.totalPatients,
        yearsOfExperience: profileData.yearsOfExperience,
      };

      // Check if any significant changes were made
      const hasChanges = (
        updatePayload.name !== (doctorData.name || '') ||
        updatePayload.email !== (doctorData.email || '') ||
        updatePayload.mobile !== (doctorData.mobile || '') ||
        updatePayload.specialty !== (doctorData.specialty || '') ||
        updatePayload.license !== (doctorData.license || '') ||
        updatePayload.location !== (doctorData.location || '') ||
        updatePayload.education !== (doctorData.education || '') ||
        updatePayload.bio !== (doctorData.bio || '') ||
        updatePayload.yearsOfExperience !== (doctorData.yearsOfExperience || 0) ||
        JSON.stringify(updatePayload.certifications) !== JSON.stringify(profileData.certifications) ||
        JSON.stringify(updatePayload.languages) !== JSON.stringify(profileData.languages)
      );

      if (!hasChanges) {
        setIsEditing(false);
        showToast('No changes detected in profile.', 'warning');
        return;
      }

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

      const data = await response.json();
      if (data.success) {
        setDoctorData(data.doctor);
        setProfileData(prev => ({ ...prev, certifications, languages }));
        updateUser({ ...user, ...data.doctor });
        setIsEditing(false);
        showToast('Profile updated successfully!', 'success');
      } else {
        showToast(`Update failed: ${data.message}`, 'error');
      }
    } catch (error) {
      console.error('💥 Error updating profile:', error);
      if (error.message.includes('Failed to fetch')) {
        showToast('Server connection failed. Is the backend running?', 'error');
      } else {
        showToast(`Error: ${error.message}`, 'error');
      }
    }
  };

  const handleCancel = () => {
    if (doctorData) {
      const certs = Array.isArray(doctorData.certifications)
        ? doctorData.certifications
        : (typeof doctorData.certifications === 'string' && doctorData.certifications.trim()
          ? doctorData.certifications.split(',').map(c => c.trim()).filter(c => c.length > 0)
          : []);
      const langs = Array.isArray(doctorData.languages)
        ? doctorData.languages
        : (typeof doctorData.languages === 'string' && doctorData.languages.trim()
          ? doctorData.languages.split(',').map(l => l.trim()).filter(l => l.length > 0)
          : []);

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
        certifications: certs,
        languages: langs,
        totalPatients: doctorData.totalPatients || 0,
        yearsOfExperience: doctorData.yearsOfExperience || 0,
      }));
      setCertificationsInput(Array.isArray(certs) ? certs.join(', ') : '');
      setLanguagesInput(Array.isArray(langs) ? langs.join(', ') : '');
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
      showToast('Please select a valid image file.', 'error');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size must be under 5MB.', 'error');
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
      const contentType = response.headers.get('content-type') || '';
      const raw = await response.text();
      let data;
      try {
        data = contentType.includes('application/json') ? JSON.parse(raw) : { success: false, message: raw };
      } catch (e) {
        console.warn('⚠️ Non-JSON response for avatar upload:', raw);
        data = { success: false, message: raw };
      }
      console.log('📋 Upload response:', data);

      if (data.success) {
        console.log('✅ Photo uploaded successfully:', data.avatarUrl);
        setDoctorData(data.doctor);
        setHasPhoto(true);

        // The backend stores S3 key in doctor.avatar; frontend uses avatarUrl for display
        setProfileData(prev => ({
          ...prev,
          avatar: data.avatarUrl
        }));

        // Update the user data in AuthContext to reflect the display URL
        const updatedUser = { ...user, avatar: data.avatarUrl };
        console.log('🔄 Profile - Updating user with avatar:', updatedUser);
        updateUser(updatedUser);

        showToast('Profile photo updated successfully!', 'success');
      } else {
        console.error('❌ Failed to upload photo:', data.message);
        showToast(`Photo upload failed: ${data.message}`, 'error');
      }
    } catch (error) {
      console.error('💥 Photo upload error:', error);
      showToast(`Error: ${error.message}`, 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async () => {
    setShowDeleteModal(false);

    try {
      setUploadingPhoto(true);
      const token = localStorage.getItem('token');

      const response = await fetch(`${DOCTOR_API_BASE}/profile/avatar`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setDoctorData(data.doctor);
        setHasPhoto(false);
        setProfileData(prev => ({
          ...prev,
          avatar: ''
        }));

        // Update AuthContext
        updateUser({ ...user, avatar: null });

        showToast('Profile photo removed.', 'success');
      } else {
        showToast(`Failed to remove photo: ${data.message}`, 'error');
      }
    } catch (error) {
      console.error('💥 Error deleting photo:', error);
      showToast('Error removing photo.', 'error');
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
          const displayAvatar = data.doctor.avatarUrl || data.doctor.avatar || '';
          setProfileData(prev => ({
            ...prev,
            name: data.doctor.name || '',
            email: data.doctor.email || '',
            phone: data.doctor.mobile || '',
            avatar: displayAvatar,
            specialty: data.doctor.specialty || '',
            license: data.doctor.license || '',
            experience: data.doctor.experience || '',
            location: data.doctor.location || '',
            education: data.doctor.education || '',
            bio: data.doctor.bio || '',
            certifications: Array.isArray(data.doctor.certifications)
              ? data.doctor.certifications
              : (typeof data.doctor.certifications === 'string' && data.doctor.certifications.trim()
                ? data.doctor.certifications.split(',').map(c => c.trim()).filter(c => c.length > 0)
                : []),
            languages: Array.isArray(data.doctor.languages)
              ? data.doctor.languages
              : (typeof data.doctor.languages === 'string' && data.doctor.languages.trim()
                ? data.doctor.languages.split(',').map(l => l.trim()).filter(l => l.length > 0)
                : []),
            totalPatients: data.doctor.totalPatients || 0,
            yearsOfExperience: data.doctor.yearsOfExperience || 0,
            totalSessions: data.doctor.totalSessions || 0,
          }));

          // Fetch real session count if not provided
          if (!data.doctor.totalSessions) {
            try {
              const sessionsRes = await fetch(`${API_BASE}/sessions/all-sessions`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              const sessionsData = await sessionsRes.json();
              if (sessionsData.sessions) {
                setProfileData(prev => ({ ...prev, totalSessions: sessionsData.sessions.length }));
              }
            } catch (err) {
              console.error('Failed to fetch session stats:', err);
            }
          }

          // Set hasPhoto based on avatar
          setHasPhoto(!!displayAvatar);

          // Initialize input states for certifications and languages
          const certs = Array.isArray(data.doctor.certifications)
            ? data.doctor.certifications
            : (typeof data.doctor.certifications === 'string' && data.doctor.certifications.trim()
              ? data.doctor.certifications.split(',').map(c => c.trim()).filter(c => c.length > 0)
              : []);
          const langs = Array.isArray(data.doctor.languages)
            ? data.doctor.languages
            : (typeof data.doctor.languages === 'string' && data.doctor.languages.trim()
              ? data.doctor.languages.split(',').map(l => l.trim()).filter(l => l.length > 0)
              : []);
          setCertificationsInput(Array.isArray(certs) ? certs.join(', ') : '');
          setLanguagesInput(Array.isArray(langs) ? langs.join(', ') : '');
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
    // Fade in animation
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary-50 dark:bg-primary/20 rounded-2xl flex items-center justify-center mb-6">
            <Loader className="h-8 w-8 text-primary dark:text-primary animate-spin" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Loading Profile</h3>
          <p className="text-gray-600 dark:text-gray-300">Please wait while we fetch your profile data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#F8FAFC] py-4 sm:py-8 transition-all duration-1000 ease-out transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          {/* Profile Card (Left Side - 30%) */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm hover:shadow-md border border-gray-100 hover:border-primary/20 p-6 sm:p-8 lg:sticky lg:top-24 transition-all duration-300">
              <div className="flex flex-col items-center text-center">
                {/* Large circular profile image with soft gradient border */}
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-primary/20 rounded-full animate-pulse blur-[2px] opacity-20"></div>
                  <div className="relative p-1.5 bg-primary rounded-full shadow-lg">
                    {hasPhoto && profileData.avatar ? (
                      <div className="relative overflow-hidden rounded-full h-36 w-36 ring-4 ring-white">
                        <img
                          src={profileData.avatar}
                          alt={profileData.name}
                          className="h-full w-full object-cover"
                          onError={() => setHasPhoto(false)}
                        />
                      </div>
                    ) : (
                      <div className="h-36 w-36 rounded-full bg-white flex items-center justify-center ring-4 ring-white">
                        <Stethoscope className="h-16 w-16 text-primary" />
                      </div>
                    )}
                    {uploadingPhoto && (
                      <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                        <Loader className="h-6 w-6 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  {/* Edit Photo Button - Bottom Right */}
                  <button
                    onClick={handleUpdatePhoto}
                    disabled={uploadingPhoto}
                    className="absolute bottom-1 right-1 h-7 w-7 bg-white rounded-full shadow-md flex items-center justify-center text-gray-500 hover:text-primary transition-all hover:scale-110 active:scale-95 border border-gray-100"
                  >
                    <Activity className="h-4 w-4" />
                  </button>

                  {/* Delete Photo Button - Bottom Left */}
                  {hasPhoto && (
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      disabled={uploadingPhoto}
                      className="absolute bottom-1 left-1 h-7 w-7 bg-white rounded-full shadow-md flex items-center justify-center text-red-600 hover:bg-red-50 transition-all hover:scale-105 active:scale-95 border border-gray-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Name and Specialty */}
                <div className="mb-4">
                  <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100 mb-2">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active Doctor
                  </div>
                  <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-tight mb-1">{profileData.name}</h2>
                  <p className="text-primary font-bold text-sm uppercase tracking-wider mb-4">{profileData.specialty}</p>


                </div>

                {/* Upper Profile Strength with Effects */}
                <div className="w-full mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Profile Strength</span>
                    <span className="text-[10px] font-black text-primary bg-primary-50 px-2 py-0.5 rounded-full border border-primary/10 shadow-sm animate-bounce">{completionPercentage}%</span>
                  </div>
                  <div className="relative h-2 w-full bg-gray-50 rounded-full border border-gray-100 overflow-hidden shadow-inner">
                    {/* Glowing Progress Bar */}
                    <div
                      className="absolute top-0 left-0 h-full bg-primary transition-all duration-1000 ease-out rounded-full shadow-[0_0_12px_rgba(var(--primary-rgb),0.4)]"
                      style={{ width: `${completionPercentage}%` }}
                    >
                      {/* Shimmer Effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-20deg] animate-[shimmer_2s_infinite] w-1/2"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Info (Compact) */}
              <div className="grid grid-cols-1 gap-3 py-6 mt-6 border-y border-gray-50">
                <div className="flex items-center text-gray-500 group">
                  <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center mr-3 group-hover:bg-primary-50 transition-colors">
                    <Mail className="h-4 w-4 text-slate-400 group-hover:text-primary" />
                  </div>
                  <span className="text-xs font-medium truncate">{profileData.email}</span>
                </div>
                <div className="flex items-center text-gray-500 group">
                  <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center mr-3 group-hover:bg-primary-50 transition-colors">
                    <Phone className="h-4 w-4 text-slate-400 group-hover:text-primary" />
                  </div>
                  <span className="text-xs font-medium">{profileData.phone}</span>
                </div>
                <div className="flex items-center text-gray-500 group">
                  <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center mr-3 group-hover:bg-primary-50 transition-colors">
                    <MapPin className="h-4 w-4 text-slate-400 group-hover:text-primary" />
                  </div>
                  <span className="text-xs font-medium">{profileData.location || 'Location Not Set'}</span>
                </div>
              </div>

              {/* Improved Quick Stats */}
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Quick Performance</h3>
                  <Award className="h-3 w-3 text-amber-500" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-primary-50 border border-primary/10 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 transition-all duration-300 cursor-default group">
                    <div className="text-xl font-black text-primary group-hover:scale-110 transition-transform">{profileData.totalPatients}</div>
                    <div className="text-[9px] font-black text-primary/60 uppercase tracking-tighter">Patients</div>
                  </div>
                  <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-primary-50 border border-primary/10 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 transition-all duration-300 cursor-default group">
                    <div className="text-xl font-black text-primary group-hover:scale-110 transition-transform">{profileData.yearsOfExperience}</div>
                    <div className="text-[9px] font-black text-primary/60 uppercase tracking-tighter">Years</div>
                  </div>
                  <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-primary-50 border border-primary/10 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 transition-all duration-300 cursor-default group">
                    <div className="text-xl font-black text-primary group-hover:scale-110 transition-transform">{profileData.totalSessions}</div>
                    <div className="text-[9px] font-black text-primary/60 uppercase tracking-tighter">Sessions</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            {/* Header Card */}
            <div className="bg-white rounded-2xl shadow-sm hover:shadow-md border border-gray-100 hover:border-primary/20 p-6 transition-all duration-300">
              <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 rounded-xl bg-primary-50 flex items-center justify-center border border-primary/10">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-gray-900 leading-tight">Profile Settings</h2>
                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mt-0.5">Manage your clinical practice identity</p>
                  </div>
                </div>
                {!isEditing ? (
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setCertificationsInput(Array.isArray(profileData.certifications) ? profileData.certifications.join(', ') : '');
                      setLanguagesInput(Array.isArray(profileData.languages) ? profileData.languages.join(', ') : '');
                    }}
                    className="w-full sm:w-auto inline-flex items-center px-6 py-3 bg-gray-900 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-gray-800 transition-all duration-200 shadow-md shadow-gray-200 active:scale-95 justify-center"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile Details
                  </button>
                ) : (
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
                    <button
                      onClick={handleCancel}
                      className="w-full sm:w-auto px-6 py-3 border-2 border-gray-100 text-gray-600 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-gray-50 transition-colors duration-200 active:scale-95"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      className="w-full sm:w-auto inline-flex items-center px-6 py-3 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all duration-200 shadow-lg shadow-primary/20 active:scale-95 justify-center"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              {/* 1. Personal Information */}
              <section className="bg-white rounded-2xl shadow-sm hover:shadow-md border border-gray-100 hover:border-primary/20 overflow-hidden transition-all duration-300">
                <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-primary" />
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Personal Information</h3>
                  </div>
                </div>
                <div className="p-6 divide-y divide-gray-50">
                  <div className="py-4 first:pt-0 last:pb-0">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center">Full Name</label>
                      <div className="md:col-span-2">
                        {isEditing ? (
                          <input
                            type="text"
                            value={profileData.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium"
                          />
                        ) : (
                          <p className="text-sm font-bold text-gray-900">{profileData.name || '—'}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="py-4 first:pt-0 last:pb-0">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center">Email Address</label>
                      <div className="md:col-span-2">
                        {isEditing ? (
                          <input
                            type="email"
                            value={profileData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium"
                          />
                        ) : (
                          <p className="text-sm font-bold text-gray-700">{profileData.email || '—'}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="py-4 first:pt-0 last:pb-0">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center">Phone Contact</label>
                      <div className="md:col-span-2">
                        {isEditing ? (
                          <input
                            type="tel"
                            value={profileData.phone}
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium"
                          />
                        ) : (
                          <p className="text-sm font-bold text-gray-900">{profileData.phone || '—'}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="py-4 first:pt-0 last:pb-0">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center">Specialty</label>
                      <div className="md:col-span-2">
                        {isEditing ? (
                          <input
                            type="text"
                            value={profileData.specialty}
                            onChange={(e) => handleInputChange('specialty', e.target.value)}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium"
                          />
                        ) : (
                          <p className="text-sm font-bold text-primary">{profileData.specialty || '—'}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* 2. Professional Information */}
              <section className="bg-white rounded-2xl shadow-sm hover:shadow-md border border-gray-100 hover:border-primary/20 overflow-hidden transition-all duration-300">
                <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Stethoscope className="h-5 w-5 text-primary" />
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Professional Information</h3>
                  </div>
                </div>
                <div className="p-6 divide-y divide-gray-50">
                  <div className="py-4 first:pt-0 last:pb-0">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center">License Identifier</label>
                      <div className="md:col-span-2">
                        {isEditing ? (
                          <input
                            type="text"
                            value={profileData.license}
                            onChange={(e) => handleInputChange('license', e.target.value)}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
                          />
                        ) : (
                          <code className="text-xs font-black bg-slate-50 px-2 py-1 rounded-md text-slate-700">{profileData.license || 'N/A'}</code>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="py-4 first:pt-0 last:pb-0">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center">Education</label>
                      <div className="md:col-span-2">
                        {isEditing ? (
                          <input
                            type="text"
                            value={profileData.education}
                            onChange={(e) => handleInputChange('education', e.target.value)}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
                          />
                        ) : (
                          <p className="text-sm font-bold text-gray-800">{profileData.education || '—'}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="py-4 first:pt-0 last:pb-0">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center">Work Location</label>
                      <div className="md:col-span-2">
                        {isEditing ? (
                          <input
                            type="text"
                            value={profileData.location}
                            onChange={(e) => handleInputChange('location', e.target.value)}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
                          />
                        ) : (
                          <p className="text-sm font-bold text-gray-700">{profileData.location || '—'}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="py-4 first:pt-0 last:pb-0">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pt-1">Professional Bio</label>
                      <div className="md:col-span-2">
                        {isEditing ? (
                          <textarea
                            value={profileData.bio}
                            onChange={(e) => handleInputChange('bio', e.target.value)}
                            rows={4}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium resize-none shadow-inner"
                          />
                        ) : (
                          <p className="text-sm leading-relaxed text-gray-600 italic font-medium">{profileData.bio || 'Detailed professional background not provided.'}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* 3. Certifications */}
              <section className="bg-white rounded-2xl shadow-sm hover:shadow-md border border-gray-100 hover:border-amber-100 overflow-hidden transition-all duration-300">
                <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Award className="h-5 w-5 text-amber-500" />
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Certifications</h3>
                  </div>
                </div>
                <div className="p-6">
                  {isEditing ? (
                    <div className="space-y-4">
                      <input
                        type="text"
                        value={certificationsInput}
                        onChange={(e) => setCertificationsInput(e.target.value)}
                        onBlur={(e) => {
                          const value = e.target.value.trim();
                          handleInputChange('certifications', value ? value.split(',').map(c => c.trim()).filter(c => c.length > 0) : []);
                        }}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-sm font-medium"
                        placeholder="Board Certified Cardiologist, ACLS, etc. (Separate with commas)"
                      />
                      <div className="flex flex-wrap gap-2">
                        {certificationsInput.split(',').map((cert, i) => cert.trim() && (
                          <span key={i} className="px-3 py-1 bg-amber-50 text-amber-700 text-[10px] font-black uppercase rounded-lg border border-amber-100">{cert.trim()}</span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      {profileData.certifications?.length > 0 ? (
                        profileData.certifications.map((cert, i) => (
                          <div key={i} className="flex items-center space-x-2 px-4 py-2 bg-amber-50/50 text-amber-900 text-xs font-bold rounded-xl border border-amber-100 shadow-sm transition-transform hover:scale-105">
                            <CheckCircle className="h-3 w-3 text-amber-500" />
                            <span>{cert}</span>
                          </div>
                        ))
                      ) : (
                        <div className="w-full py-8 border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center text-gray-300">
                          <Award className="h-8 w-8 mb-2 opacity-20" />
                          <p className="text-xs font-bold uppercase tracking-widest">No Certifications Recorded</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </section>

              {/* 4. Languages */}
              <section className="bg-white rounded-2xl shadow-sm hover:shadow-md border border-gray-100 hover:border-emerald-100 overflow-hidden transition-all duration-300">
                <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Activity className="h-5 w-5 text-emerald-500" />
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Languages Spoken</h3>
                  </div>
                </div>
                <div className="p-6">
                  {isEditing ? (
                    <div className="space-y-4">
                      <input
                        type="text"
                        value={languagesInput}
                        onChange={(e) => setLanguagesInput(e.target.value)}
                        onBlur={(e) => {
                          const value = e.target.value.trim();
                          handleInputChange('languages', value ? value.split(',').map(l => l.trim()).filter(l => l.length > 0) : []);
                        }}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-medium"
                        placeholder="English, Spanish, etc. (Separate with commas)"
                      />
                      <div className="flex flex-wrap gap-2">
                        {languagesInput.split(',').map((lang, i) => lang.trim() && (
                          <span key={i} className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase rounded-lg border border-emerald-100">{lang.trim()}</span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      {profileData.languages?.length > 0 ? (
                        profileData.languages.map((lang, i) => (
                          <div key={i} className="px-4 py-2 bg-emerald-50/50 text-emerald-900 text-xs font-bold rounded-xl border border-emerald-100 shadow-sm transition-transform hover:scale-105">
                            {lang}
                          </div>
                        ))
                      ) : (
                        <div className="w-full py-8 border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center text-gray-300">
                          <Activity className="h-8 w-8 mb-2 opacity-20" />
                          <p className="text-xs font-bold uppercase tracking-widest">Language Proficiency Not Set</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>

      {/* Minimal Top-Right Toast System (Portaled to Body) */}
      {toast.show && createPortal(
        <>
          <style>
            {`
              @keyframes toast-progress {
                from { width: 100%; }
                to { width: 0%; }
              }
              .toast-progress-bar-minimal {
                animation: toast-progress 2500ms linear forwards;
              }
            `}
          </style>
          <div className="fixed top-[12px] right-[32px] z-[9999] animate-in fade-in slide-in-from-right-4 duration-300">
            <div className={`relative flex flex-col w-[260px] bg-white/90 backdrop-blur-md rounded-xl shadow-lg border-l-[3px] overflow-hidden transition-all ${toast.type === 'success' ? 'border-emerald-500' :
              toast.type === 'error' ? 'border-rose-500' :
                'border-amber-500'
              }`}>
              <div className="flex items-center px-3.5 py-2.5 space-x-3">
                {/* Status Icon */}
                <div className="shrink-0">
                  {toast.type === 'success' && <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />}
                  {toast.type === 'error' && <X className="h-3.5 w-3.5 text-rose-600" />}
                  {toast.type === 'warning' && <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />}
                </div>

                {/* Message */}
                <p className="flex-1 text-[12px] font-bold text-gray-800 leading-none truncate">
                  {toast.message}
                </p>

                {/* Close */}
                <button
                  onClick={() => setToast({ ...toast, show: false })}
                  className="p-1 hover:bg-black/5 rounded-md text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>

              {/* Thin Bottom Progress Line */}
              <div className="h-[2px] w-full bg-black/5">
                <div className={`h-full toast-progress-bar-minimal ${toast.type === 'success' ? 'bg-emerald-500' :
                  toast.type === 'error' ? 'bg-rose-500' :
                    'bg-amber-500'
                  }`} />
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Delete Photo Confirmation Modal */}
      {showDeleteModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setShowDeleteModal(false)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            {/* Warning Icon */}
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
              Remove Profile Photo?
            </h3>

            {/* Description */}
            <p className="text-sm text-gray-600 text-center mb-6">
              Are you sure you want to delete your profile photo? This action cannot be undone.
            </p>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePhoto}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Profile;
