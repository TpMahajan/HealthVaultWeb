import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Phone, MapPin, Shield, Edit, Save, X, Stethoscope, Loader, Activity, Award, CheckCircle, Trash2, AlertCircle } from 'lucide-react';
import { createPortal } from 'react-dom';
import { DOCTOR_API_BASE, API_BASE } from '../constants/api';
import { useDoctorToast } from '../context/DoctorToastContext';
import Footer from './Footer';

const Profile = () => {
  const YEARS_STORAGE_KEY = 'yearsOfExperience';
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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
  const [yearsOfExperience, setYearsOfExperience] = useState(0);
  // Separate state for raw input values to allow typing commas freely
  const [certificationsInput, setCertificationsInput] = useState('');
  const [languagesInput, setLanguagesInput] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const { showDoctorToast } = useDoctorToast();

  // Custom toast helper
  const showToast = (message, type = 'success', title = '') => {
    const defaultTitles = {
      success: 'Update Success',
      error: 'System Alert',
      warning: 'Attention Required',
      info: 'Information',
    };
    showDoctorToast({
      message,
      type,
      title: title || defaultTitles[type] || defaultTitles.info,
      duration: 2500,
    });
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

  const getYearsFromExperience = (experienceValue, fallbackValue = 0) => {
    const fallbackYears = Number.isFinite(Number(fallbackValue)) ? Number(fallbackValue) : 0;
    if (typeof experienceValue !== 'string') return fallbackYears;
    const match = experienceValue.match(/(\d+)/);
    return match ? Number(match[1]) : fallbackYears;
  };

  const sanitizeYearsOfExperience = (value) => {
    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue)) return 0;
    return Math.min(50, Math.max(0, Math.trunc(parsedValue)));
  };

  const completionPercentage = calculateCompletion();

  const handleSave = (e) => {
    if (e && e.preventDefault) e.preventDefault();

    // Validate required fields
    if (!profileData.name?.trim()) {
      showToast('Full name is required.', 'error');
      return;
    }
    if (!profileData.email?.trim()) {
      showToast('Email address is required.', 'error');
      return;
    }
    setIsSaving(true);

    // Process certifications and languages from raw input strings
    const certifications = certificationsInput.trim()
      ? certificationsInput.split(',').map(cert => cert.trim()).filter(cert => cert.length > 0)
      : [];
    const languages = languagesInput.trim()
      ? languagesInput.split(',').map(lang => lang.trim()).filter(lang => lang.length > 0)
      : [];
    const nextYearsOfExperience = sanitizeYearsOfExperience(yearsOfExperience);

    localStorage.setItem(YEARS_STORAGE_KEY, String(nextYearsOfExperience));
    setYearsOfExperience(nextYearsOfExperience);
    setProfileData(prev => ({
      ...prev,
      name: prev.name.trim(),
      email: prev.email.trim(),
      certifications,
      languages,
      yearsOfExperience: nextYearsOfExperience,
    }));
    setDoctorData(prev => ({
      ...(prev || {}),
      name: profileData.name.trim(),
      email: profileData.email.trim(),
      mobile: profileData.phone,
      specialty: profileData.specialty,
      license: profileData.license,
      experience: profileData.experience,
      location: profileData.location,
      education: profileData.education,
      bio: profileData.bio,
      certifications,
      languages,
      totalPatients: profileData.totalPatients,
      yearsOfExperience: nextYearsOfExperience,
      totalSessions: profileData.totalSessions,
      avatar: profileData.avatar,
    }));
    updateUser({
      ...user,
      name: profileData.name.trim(),
      email: profileData.email.trim(),
      mobile: profileData.phone,
      specialty: profileData.specialty,
      license: profileData.license,
      experience: profileData.experience,
      location: profileData.location,
      education: profileData.education,
      bio: profileData.bio,
      certifications,
      languages,
      yearsOfExperience: nextYearsOfExperience,
      avatar: profileData.avatar,
    });
    setIsEditing(false);
    setIsSaving(false);
    showToast('Profile updated successfully!', 'success');
    return;

  };

  const handleCancel = () => {
    if (doctorData) {
      const savedYears = localStorage.getItem(YEARS_STORAGE_KEY);
      const nextYearsOfExperience = savedYears !== null
        ? sanitizeYearsOfExperience(savedYears)
        : getYearsFromExperience(doctorData.experience, doctorData.yearsOfExperience || 0);
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
        yearsOfExperience: nextYearsOfExperience,
      }));
      setYearsOfExperience(nextYearsOfExperience);
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

  // Only updates local component state — NO API call on change
  const handleInputChange = (field, value) => {
    setProfileData(prev => {
      if (field === 'experience') {
        const nextYearsOfExperience = sanitizeYearsOfExperience(
          getYearsFromExperience(value, prev.yearsOfExperience)
        );
        setYearsOfExperience(nextYearsOfExperience);
        return {
          ...prev,
          experience: value,
          yearsOfExperience: nextYearsOfExperience,
        };
      }

      return {
        ...prev,
        [field]: value
      };
    });
  };

  const handleYearsOfExperienceChange = (value) => {
    const nextYearsOfExperience = value === ''
      ? 0
      : sanitizeYearsOfExperience(value);
    setYearsOfExperience(nextYearsOfExperience);
    setProfileData(prev => ({
      ...prev,
      yearsOfExperience: nextYearsOfExperience,
    }));
  };

  // Fetch doctor profile data
  useEffect(() => {
    let isMounted = true;
    const savedYears = localStorage.getItem(YEARS_STORAGE_KEY);
    if (savedYears !== null) {
      const normalizedYears = sanitizeYearsOfExperience(savedYears);
      setYearsOfExperience(normalizedYears);
      setProfileData(prev => ({
        ...prev,
        yearsOfExperience: normalizedYears,
      }));
    }

    const syncQuickPerformanceStats = async (token = null, fallbackYears = null) => {
      const authToken = token || localStorage.getItem('token');
      if (!authToken || !isMounted) return;

      try {
        const [patientsResult, sessionsResult] = await Promise.allSettled([
          fetch(`${DOCTOR_API_BASE}/patients`, {
            headers: { 'Authorization': `Bearer ${authToken}` },
          }),
          fetch(`${API_BASE}/sessions/all-sessions`, {
            headers: { 'Authorization': `Bearer ${authToken}` },
          }),
        ]);

        if (!isMounted) return;

        const nextStats = {};

        if (patientsResult.status === 'fulfilled' && patientsResult.value.ok) {
          const patientsData = await patientsResult.value.json();
          const patientCount = Number.isFinite(Number(patientsData?.count))
            ? Number(patientsData.count)
            : (Array.isArray(patientsData?.patients) ? patientsData.patients.length : null);

          if (patientCount !== null) {
            nextStats.totalPatients = patientCount;
          }
        }

        if (sessionsResult.status === 'fulfilled' && sessionsResult.value.ok) {
          const sessionsData = await sessionsResult.value.json();
          const sessionCount = Number.isFinite(Number(sessionsData?.count))
            ? Number(sessionsData.count)
            : (Array.isArray(sessionsData?.sessions) ? sessionsData.sessions.length : null);

          if (sessionCount !== null) {
            nextStats.totalSessions = sessionCount;
          }
        }

        if (Number.isFinite(Number(fallbackYears))) {
          nextStats.yearsOfExperience = Number(fallbackYears);
        }

        if (Object.keys(nextStats).length > 0) {
          setProfileData(prev => {
            const refreshedYears = getYearsFromExperience(
              prev.experience,
              nextStats.yearsOfExperience ?? prev.yearsOfExperience
            );
            setYearsOfExperience(sanitizeYearsOfExperience(refreshedYears));
            return {
              ...prev,
              ...nextStats,
              yearsOfExperience: refreshedYears,
            };
          });
        }
      } catch (statsError) {
        console.error('Failed to refresh quick performance stats:', statsError);
      }
    };

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
          const yearsFromProfile = getYearsFromExperience(
            data.doctor.experience,
            data.doctor.yearsOfExperience || 0
          );
          const yearsOfExperience = savedYears !== null
            ? sanitizeYearsOfExperience(savedYears)
            : sanitizeYearsOfExperience(yearsFromProfile);
          setYearsOfExperience(yearsOfExperience);
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
            totalPatients: Number.isFinite(Number(data.doctor.totalPatients)) ? Number(data.doctor.totalPatients) : 0,
            yearsOfExperience,
            totalSessions: Number.isFinite(Number(data.doctor.totalSessions)) ? Number(data.doctor.totalSessions) : 0,
          }));

          await syncQuickPerformanceStats(token, yearsOfExperience);

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
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDoctorProfile();

    const statsInterval = setInterval(() => {
      syncQuickPerformanceStats();
    }, 30000);

    const handleVisibilityOrFocus = () => {
      if (!document.hidden) {
        syncQuickPerformanceStats();
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    // Fade in animation
    const timer = setTimeout(() => setIsVisible(true), 100);
    const scrollBarStyle = (
    <style>{`
      .custom-scrollbar::-webkit-scrollbar { width: 5px; }
      .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
      .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.1); }
      .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
    `}</style>
  );

    return () => {
      isMounted = false;
      clearTimeout(timer);
      clearInterval(statsInterval);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-transparent">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary/10 dark:bg-white/5 rounded-2xl flex items-center justify-center mb-6">
            <Loader className="h-8 w-8 text-primary dark:text-primary animate-spin" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Loading Profile</h3>
          <p className="text-gray-600 dark:text-gray-400">Please wait while we fetch your profile data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-full min-h-[calc(100vh-100px)] overflow-visible transition-all duration-1000 ease-out transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-auto flex flex-col box-border">
        <div className="w-full min-w-0 flex flex-col lg:flex-row gap-6 lg:gap-8 h-auto pb-8">
          {/* Profile Card (Left Side - 30%) */}
          <div className="w-full max-w-full lg:w-[320px] shrink-0 h-fit">
            <div className="w-full max-w-full box-border overflow-hidden bg-white dark:bg-white/5 dark:backdrop-blur-md rounded-2xl shadow-sm dark:shadow-2xl border border-gray-100 dark:border-white/10 hover:border-primary/20 dark:hover:border-white/20 p-6 sm:p-8 lg:sticky lg:top-28 transition-all duration-300 break-words">
              <div className="flex flex-col items-center text-center">
                {/* Large circular profile image with soft gradient border */}
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-primary/20 rounded-full animate-pulse blur-[2px] opacity-20"></div>
                  <div className="relative p-1.5 bg-primary dark:bg-primary/80 rounded-full shadow-lg">
                    {hasPhoto && profileData.avatar ? (
                      <div className="relative overflow-hidden rounded-full h-36 w-36 ring-4 ring-white dark:ring-[#121212]">
                        <img
                          src={profileData.avatar}
                          alt={profileData.name}
                          className="h-full w-full max-w-full object-cover"
                          onError={() => setHasPhoto(false)}
                        />
                      </div>
                    ) : (
                      <div className="h-36 w-36 rounded-full bg-white dark:bg-[#121212] flex items-center justify-center ring-4 ring-white dark:ring-[#1a1a1a] shadow-inner">
                        <Stethoscope className="h-16 w-16 text-primary dark:text-primary" />
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
                    className="absolute bottom-1 right-1 h-7 w-7 bg-white dark:bg-white/10 dark:backdrop-blur-md rounded-full shadow-md flex items-center justify-center text-gray-400 hover:text-primary dark:hover:text-primary transition-all hover:scale-110 active:scale-95 border border-gray-100 dark:border-white/10"
                  >
                    <span className="text-base font-bold leading-none">+</span>
                  </button>

                  {/* Delete Photo Button - Bottom Left */}
                  {hasPhoto && (
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      disabled={uploadingPhoto}
                      className="absolute bottom-1 left-1 h-7 w-7 bg-white dark:bg-white/10 dark:backdrop-blur-md rounded-full shadow-md flex items-center justify-center text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-400/20 transition-all hover:scale-105 active:scale-95 border border-gray-100 dark:border-white/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Name and Specialty */}
                <div className="mb-4">
                  <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary border border-primary/20 dark:border-primary/30 mb-2">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active Doctor
                  </div>
                  <h2 className="w-full max-w-full text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-tight mb-1 break-words">{profileData.name}</h2>
                  <p className="w-full max-w-full text-primary dark:text-primary font-bold text-sm uppercase tracking-wider break-words">{profileData.specialty}</p>
                </div>

                {/* Upper Profile Strength with Effects */}
                <div className="w-full mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Profile Strength</span>
                    <span className="text-[10px] font-black text-primary dark:text-primary bg-primary/5 dark:bg-white/5 px-2 py-0.5 rounded-full border border-primary/10 dark:border-white/10 shadow-sm animate-bounce">{completionPercentage}%</span>
                  </div>
                  <div className="relative h-2 w-full bg-gray-100 dark:bg-white/10 rounded-full border border-gray-50 dark:border-white/5 overflow-hidden shadow-inner">
                    {/* Glowing Progress Bar */}
                    <div
                      className="absolute top-0 left-0 h-full bg-primary transition-all duration-1000 ease-out rounded-full shadow-[0_0_12px_var(--primary-color)]"
                      style={{ width: `${completionPercentage}%` }}
                    >
                      {/* Shimmer Effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-20deg] animate-[shimmer_2s_infinite] w-1/2"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Info (Compact) */}
              <div className="grid grid-cols-1 gap-3 py-6 mt-6 border-y border-gray-100 dark:border-white/5">
                <div className="flex items-center min-w-0 text-gray-500 dark:text-gray-400 group">
                  <div className="h-8 w-8 rounded-lg bg-slate-50 dark:bg-white/5 flex items-center justify-center mr-3 group-hover:bg-primary/10 dark:group-hover:bg-primary/20 transition-colors">
                    <Mail className="h-4 w-4 text-slate-400 dark:text-gray-500 group-hover:text-primary dark:group-hover:text-primary" />
                  </div>
                  <span className="min-w-0 flex-1 text-xs font-medium truncate">{profileData.email}</span>
                </div>
                <div className="flex items-center min-w-0 text-gray-500 dark:text-gray-400 group">
                  <div className="h-8 w-8 rounded-lg bg-slate-50 dark:bg-white/5 flex items-center justify-center mr-3 group-hover:bg-primary/10 dark:group-hover:bg-primary/20 transition-colors">
                    <Phone className="h-4 w-4 text-slate-400 dark:text-gray-500 group-hover:text-primary dark:group-hover:text-primary" />
                  </div>
                  <span className="min-w-0 flex-1 text-xs font-medium break-words">{profileData.phone}</span>
                </div>
                <div className="flex items-center min-w-0 text-gray-500 dark:text-gray-400 group">
                  <div className="h-8 w-8 rounded-lg bg-slate-50 dark:bg-white/5 flex items-center justify-center mr-3 group-hover:bg-primary/10 dark:group-hover:bg-primary/20 transition-colors">
                    <MapPin className="h-4 w-4 text-slate-400 dark:text-gray-500 group-hover:text-primary dark:group-hover:text-primary" />
                  </div>
                  <span className="min-w-0 flex-1 text-xs font-medium break-words">{profileData.location || 'Location Not Set'}</span>
                </div>
              </div>

              {/* Improved Quick Stats */}
              <div className="mt-8">
                <div className="flex items-center justify-between mb-3 text-gray-400 dark:text-gray-500">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Quick Performance</h3>
                  <Award className="h-4 w-4" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 hover:shadow-lg hover:bg-white dark:hover:bg-white/10 transition-all duration-300 cursor-default group">
                    <div className="text-xl font-black text-gray-900 dark:text-white group-hover:scale-110 transition-transform">{profileData.totalPatients}</div>
                    <div className="text-[9px] font-black text-gray-500 dark:text-gray-500 uppercase tracking-tighter">Patients</div>
                  </div>
                  <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 hover:shadow-lg hover:bg-white dark:hover:bg-white/10 transition-all duration-300 cursor-default group">
                    <div className="text-xl font-black text-gray-900 dark:text-white group-hover:scale-110 transition-transform">{yearsOfExperience}</div>
                    <div className="text-[9px] font-black text-gray-500 dark:text-gray-500 uppercase tracking-tighter">Years</div>
                  </div>
                  <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 hover:shadow-lg hover:bg-white dark:hover:bg-white/10 transition-all duration-300 cursor-default group">
                    <div className="text-xl font-black text-gray-900 dark:text-white group-hover:scale-110 transition-transform">{profileData.totalSessions}</div>
                    <div className="text-[9px] font-black text-gray-500 dark:text-gray-500 uppercase tracking-tighter">Sessions</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0 w-full max-w-full box-border space-y-6 overflow-visible overflow-x-hidden pr-0 lg:pr-4 custom-scrollbar scroll-smooth pb-10 break-words">
            {/* Header Card */}
            <div className="bg-white dark:bg-white/5 dark:backdrop-blur-md rounded-2xl shadow-sm dark:shadow-lg border border-gray-100 dark:border-white/10 hover:border-primary/20 dark:hover:border-white/20 p-6 sm:p-8 transition-all duration-300">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
                <div className="flex items-center space-x-4 min-w-0 w-full sm:w-auto">
                  <div className="h-12 w-12 rounded-xl bg-primary/5 dark:bg-white/5 flex items-center justify-center border border-primary/10 dark:border-white/10">
                    <Shield className="h-6 w-6 text-primary dark:text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl font-black text-gray-900 dark:text-white leading-tight">Profile Settings</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider mt-0.5 break-words">Manage your clinical practice identity</p>
                  </div>
                </div>
                {!isEditing ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(true);
                        setCertificationsInput(Array.isArray(profileData.certifications) ? profileData.certifications.join(', ') : '');
                        setLanguagesInput(Array.isArray(profileData.languages) ? profileData.languages.join(', ') : '');
                      }}
                      className="relative z-10 w-full sm:w-auto inline-flex items-center px-6 py-3 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all duration-200 shadow-lg shadow-primary/20 active:scale-95 justify-center"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile Details
                    </button>
                ) : (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto sm:ml-auto">
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={isSaving}
                      className="relative z-10 w-full sm:w-auto px-6 py-3 border-2 border-gray-100 dark:border-white/10 text-gray-600 dark:text-gray-300 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors duration-200 active:scale-95 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={isSaving}
                      className="relative z-10 w-full sm:w-auto inline-flex items-center px-6 py-3 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all duration-200 shadow-lg shadow-primary/20 active:scale-95 justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isSaving ? <Loader className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="w-full max-w-full space-y-6 break-words">
              {/* 1. Personal Information */}
              <section className="bg-white dark:bg-white/5 dark:backdrop-blur-md rounded-2xl shadow-sm dark:shadow-lg border border-gray-100 dark:border-white/10 hover:border-primary/20 dark:hover:border-white/20 overflow-hidden transition-all duration-300">
                <div className="p-6 border-b border-gray-50 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-primary dark:text-primary" />
                    <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Personal Information</h3>
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Full Name</label>
                    <div className="md:col-span-2">
                      {isEditing ? (
                        <input
                          type="text"
                          value={profileData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary dark:focus:border-primary transition-all text-sm font-medium text-gray-900 dark:text-white"
                        />
                      ) : (
                        <div className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-100/50 dark:border-white/5 rounded-xl text-sm font-bold text-slate-900 dark:text-white shadow-sm">
                          {profileData.name || 'Not provided'}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center border-t border-gray-50 dark:border-white/5 pt-6">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Email Address</label>
                    <div className="md:col-span-2">
                      {isEditing ? (
                        <input
                          type="email"
                          value={profileData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary dark:focus:border-primary transition-all text-sm font-medium text-gray-900 dark:text-white"
                        />
                      ) : (
                        <div className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-100/50 dark:border-white/5 rounded-xl text-sm font-bold text-slate-700 dark:text-gray-300 shadow-sm">
                          {profileData.email || 'Not provided'}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center border-t border-gray-50 dark:border-white/5 pt-6">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Phone Contact</label>
                    <div className="md:col-span-2">
                      {isEditing ? (
                        <input
                          type="tel"
                          value={profileData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary dark:focus:border-primary transition-all text-sm font-medium text-gray-900 dark:text-white"
                        />
                      ) : (
                        <div className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-100/50 dark:border-white/5 rounded-xl text-sm font-bold text-slate-800 dark:text-white shadow-sm">
                          {profileData.phone || 'Not provided'}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center border-t border-gray-50 dark:border-white/5 pt-6">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Specialty</label>
                    <div className="md:col-span-2">
                      {isEditing ? (
                        <input
                          type="text"
                          value={profileData.specialty}
                          onChange={(e) => handleInputChange('specialty', e.target.value)}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary dark:focus:border-primary transition-all text-sm font-medium text-gray-900 dark:text-white"
                        />
                      ) : (
                        <div className="w-full px-4 py-2.5 bg-primary/5 dark:bg-primary/10 border border-primary/20 dark:border-primary/30 rounded-xl text-sm font-bold text-primary dark:text-primary shadow-sm">
                          {profileData.specialty || 'General Practitioner'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* 2. Professional Information */}
              <section className="bg-white dark:bg-white/5 dark:backdrop-blur-md rounded-2xl shadow-sm dark:shadow-lg border border-gray-100 dark:border-white/10 hover:border-primary/20 dark:hover:border-white/20 overflow-hidden transition-all duration-300">
                <div className="p-6 border-b border-gray-50 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Stethoscope className="h-5 w-5 text-primary dark:text-primary" />
                    <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Professional Information</h3>
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">License Identifier</label>
                    <div className="md:col-span-2">
                      {isEditing ? (
                        <input
                          type="text"
                          value={profileData.license}
                          onChange={(e) => handleInputChange('license', e.target.value)}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary dark:focus:border-primary transition-all text-sm font-medium text-gray-900 dark:text-white"
                        />
                      ) : (
                        <div className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-100/50 dark:border-white/5 rounded-xl text-sm font-bold text-slate-800 dark:text-white shadow-sm">
                          {profileData.license || 'Not specified'}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center border-t border-gray-50 dark:border-white/5 pt-6">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Years of Experience</label>
                    <div className="md:col-span-2">
                      {isEditing ? (
                        <input
                          type="number"
                          min={0}
                          max={50}
                          value={yearsOfExperience}
                          onChange={(e) => handleYearsOfExperienceChange(e.target.value)}
                          placeholder="Enter years (e.g., 5)"
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary dark:focus:border-primary transition-all text-sm font-medium text-gray-900 dark:text-white"
                        />
                      ) : (
                        <div className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-100/50 dark:border-white/5 rounded-xl text-sm font-bold text-slate-700 dark:text-gray-200 shadow-sm">
                          {yearsOfExperience} Years
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center border-t border-gray-50 dark:border-white/5 pt-6">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Education</label>
                    <div className="md:col-span-2">
                      {isEditing ? (
                        <input
                          type="text"
                          value={profileData.education}
                          onChange={(e) => handleInputChange('education', e.target.value)}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary dark:focus:border-primary transition-all text-sm font-medium text-gray-900 dark:text-white"
                        />
                      ) : (
                        <div className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-100/50 dark:border-white/5 rounded-xl text-sm font-bold text-slate-700 dark:text-gray-200 shadow-sm">
                          {profileData.education || 'Not specified'}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center border-t border-gray-50 dark:border-white/5 pt-6">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Work Location</label>
                    <div className="md:col-span-2">
                      {isEditing ? (
                        <input
                          type="text"
                          value={profileData.location}
                          onChange={(e) => handleInputChange('location', e.target.value)}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary dark:focus:border-primary transition-all text-sm font-medium text-gray-900 dark:text-white"
                        />
                      ) : (
                        <div className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-100/50 dark:border-white/5 rounded-xl text-sm font-bold text-slate-700 dark:text-gray-300 shadow-sm">
                          {profileData.location || 'Not specified'}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start border-t border-gray-50 dark:border-white/5 pt-6">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] pt-3">Professional Bio</label>
                    <div className="md:col-span-2">
                      {isEditing ? (
                        <textarea
                          value={profileData.bio}
                          onChange={(e) => handleInputChange('bio', e.target.value)}
                          rows={4}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary dark:focus:border-primary transition-all text-sm font-medium text-gray-900 dark:text-white resize-none shadow-inner"
                        />
                      ) : (
                        <div className="w-full px-4 py-4 bg-gray-50 dark:bg-white/5 border border-gray-100/50 dark:border-white/5 rounded-2xl text-sm leading-relaxed text-slate-800 dark:text-white font-bold shadow-sm min-h-[100px]">
                          {profileData.bio || 'Detailed professional background not provided.'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* 3. Certifications */}
              <section className="bg-white dark:bg-white/5 dark:backdrop-blur-md rounded-2xl shadow-sm dark:shadow-lg border border-gray-100 dark:border-white/10 hover:border-primary/20 overflow-hidden transition-all duration-300">
                <div className="p-6 border-b border-gray-50 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Award className="h-5 w-5 text-primary dark:text-primary" />
                    <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Certifications</h3>
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
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:border-primary text-sm font-medium text-gray-900 dark:text-white"
                        placeholder="Board Certified Cardiologist, ACLS, etc. (Separate with commas)"
                      />
                      <div className="flex flex-wrap gap-2">
                        {certificationsInput.split(',').map((cert, i) => cert.trim() && (
                          <span key={i} className="px-3 py-1 bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary text-[10px] font-black uppercase rounded-lg border border-primary/20 dark:border-primary/30">{cert.trim()}</span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      {profileData.certifications?.length > 0 ? (
                        profileData.certifications.map((cert, i) => (
                          <div key={i} className="flex items-center space-x-2 px-4 py-2 bg-primary/10 dark:bg-white/5 text-primary dark:text-gray-300 text-xs font-bold rounded-xl border border-primary/20 dark:border-white/10 shadow-sm transition-transform hover:scale-105">
                            <CheckCircle className="h-3 w-3 text-primary dark:text-primary" />
                            <span>{cert}</span>
                          </div>
                        ))
                      ) : (
                        <div className="w-full py-8 border-2 border-dashed border-gray-100 dark:border-white/5 rounded-2xl flex flex-col items-center justify-center text-gray-300 dark:text-gray-500">
                          <Award className="h-8 w-8 mb-2 opacity-20" />
                          <p className="text-xs font-bold uppercase tracking-widest">No Certifications Recorded</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </section>

              {/* 4. Languages */}
              <section className="bg-white dark:bg-white/5 dark:backdrop-blur-md rounded-2xl shadow-sm dark:shadow-lg border border-gray-100 dark:border-white/10 hover:border-primary/20 overflow-hidden transition-all duration-300">
                <div className="p-6 border-b border-gray-50 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Activity className="h-5 w-5 text-primary dark:text-primary" />
                    <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Languages Spoken</h3>
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
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:border-primary text-sm font-medium text-gray-900 dark:text-white"
                        placeholder="English, Spanish, etc. (Separate with commas)"
                      />
                      <div className="flex flex-wrap gap-2">
                        {languagesInput.split(',').map((lang, i) => lang.trim() && (
                          <span key={i} className="px-3 py-1 bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary text-[10px] font-black uppercase rounded-lg border border-primary/20 dark:border-primary/30">{lang.trim()}</span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      {profileData.languages?.length > 0 ? (
                        profileData.languages.map((lang, i) => (
                          <div key={i} className="px-4 py-2 bg-primary/10 dark:bg-white/5 text-primary dark:text-gray-300 text-xs font-bold rounded-xl border border-primary/20 dark:border-white/10 shadow-sm transition-transform hover:scale-105">
                            {lang}
                          </div>
                        ))
                      ) : (
                        <div className="w-full py-8 border-2 border-dashed border-gray-100 dark:border-white/5 rounded-2xl flex flex-col items-center justify-center text-gray-300 dark:text-gray-500">
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

      {/* Delete Photo Confirmation Modal */}
      {showDeleteModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setShowDeleteModal(false)}
          />

          {/* Modal */}
          <div className="relative bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-xl dark:shadow-2xl border border-transparent dark:border-white/10 max-w-md w-full p-5 sm:p-8 animate-in zoom-in-95 duration-200">
            {/* Warning Icon */}
            <div className="flex justify-center mb-6">
              <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center border border-red-200 dark:border-red-500/20">
                <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-500" />
              </div>
            </div>

            {/* Title */}
            <h3 className="text-2xl font-black text-gray-900 dark:text-white text-center mb-2 tracking-tight">
              Remove Profile Photo?
            </h3>

            {/* Description */}
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-8 leading-relaxed font-medium">
              Are you sure you want to delete your profile photo? This action cannot be undone.
            </p>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-6 py-3 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-black uppercase tracking-widest text-xs rounded-xl transition-all duration-200 border border-gray-200 dark:border-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePhoto}
                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-xs rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
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
