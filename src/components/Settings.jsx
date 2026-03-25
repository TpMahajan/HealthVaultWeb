import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Shield,
  Palette,
  Globe,
  Save,
  Moon,
  Sun,
  Monitor,
  AlertCircle,
  CheckCircle,
  X,
  Plus,
  RefreshCw,
  Activity,
  Check,
  ChevronRight,
  Layout,
  LayoutGrid,
  Lock,
  Sliders,
  ArrowLeft,
  User
} from 'lucide-react';
import { useTheme, COLOR_THEMES } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { DOCTOR_API_BASE, API_BASE } from '../constants/api';
import {
  DEFAULT_APP_TIMEZONE,
  setSelectedTimeZone,
} from '../utils/timezone';
import Footer from './Footer';

function Settings() {
  const navigate = useNavigate();
  const { 
    theme, setTheme, 
    colorTheme, setColorTheme, 
    themeStyle, setThemeStyle, 
    customColors, setCustomColors 
  } = useTheme();
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [passwordInfo, setPasswordInfo] = useState(null);
  const [statusToast, setStatusToast] = useState(null); // { type: 'active' | 'inactive', show: boolean }
  const [settings, setSettings] = useState({
    notifications: {
      newPatients: true,
      appointmentReminders: true,
      labResults: false,
      medicationUpdates: true,
      emergencyAlerts: true
    },
    privacy: {
      dataSharing: false,
      analytics: true,
      marketing: false,
      thirdParty: false
    },
    appearance: {
      theme: 'auto',
      compactMode: false,
      showAvatars: true,
      animations: true
    },
    security: {
      twoFactorAuth: false,
      sessionTimeout: 30,
      passwordExpiry: 90,
      loginNotifications: true
    },
    language: 'en',
    timezone: DEFAULT_APP_TIMEZONE,
    isActive: true
  });

  const [activeTab, setActiveTab] = useState('notifications');
  const [view, setView] = useState('overview'); // 'overview' | 'detail'
  const [hasChanges, setHasChanges] = useState(false);
  const [deviceSessions, setDeviceSessions] = useState([]);
  const [sessionLoading, setSessionLoading] = useState(false);

  // Appearance Customization State (Drafts)
  const [mixedColorA, setMixedColorA] = useState('#10B981');
  const [mixedColorB, setMixedColorB] = useState('#3B82F6');
  const [gradientIntensity, setGradientIntensity] = useState(100);

  // Local Draft States for immediate preview but deferred application
  const [draftTheme, setDraftTheme] = useState(theme);
  const [draftColorTheme, setDraftColorTheme] = useState(colorTheme);
  const [draftCustomColors, setDraftCustomColors] = useState(customColors);

  // Sync draft states when context changes (e.g. on first load)
  useEffect(() => {
    setDraftTheme(theme);
    setDraftColorTheme(colorTheme);
    setDraftCustomColors(customColors);
  }, [theme, colorTheme, customColors]);

  // Update dynamic gradient when mixed colors change (local only)
  useEffect(() => {
    if (draftColorTheme === 'custom') {
      const gradient = `linear-gradient(135deg, ${mixedColorA} 0%, ${mixedColorB} ${gradientIntensity}%)`;
      setDraftCustomColors({ primary: mixedColorA, light: mixedColorA + '15', gradient });
      setHasChanges(true);
    }
  }, [mixedColorA, mixedColorB, gradientIntensity, draftColorTheme]);

  // Sync local appearance settings from context initially
  useEffect(() => {
    setSettings(prev => ({
      ...prev,
      appearance: {
        ...prev.appearance,
        theme: theme,
      }
    }));
  }, [theme]);

  // Load security settings from backend
  const loadSecuritySettings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${DOCTOR_API_BASE}/security-settings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Silently handle 404 - endpoint may not exist
      if (response.status === 404) {
        return;
      }

      if (!response.ok) {
        // Silently fail for other errors
        return;
      }

      const data = await response.json();
      if (data.success) {
        setSettings(prev => ({
          ...prev,
          security: data.securitySettings || prev.security
        }));
        setPasswordInfo(data.passwordInfo);
      }
    } catch (err) {
      // Silently handle errors - settings will use defaults
      // Don't log expected network errors
    }
  };

  // Test backend connection (silent - no console errors)
  const testBackendConnection = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return false;

      const response = await fetch(`${DOCTOR_API_BASE}/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      return response.ok;
    } catch (err) {
      // Silently return false on error
      return false;
    }
  };

  // Load settings on component mount
  useEffect(() => {
    const loadDoctorPreferences = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const res = await fetch(`${DOCTOR_API_BASE}/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!res.ok) {
          // Silently fail if profile endpoint is not accessible
          return;
        }

        const data = await res.json();
        if (data.success && data.doctor) {
          const prefs = data.doctor.preferences || {};
          const resolvedTimezone = prefs.timezone || DEFAULT_APP_TIMEZONE;

          // Update all settings from backend preferences
          setSettings(prev => ({
            ...prev,
            language: prefs.language || prev.language,
            timezone: resolvedTimezone,
            appearance: {
              ...prev.appearance,
              theme: prefs.appearance?.theme || prefs.theme || prev.appearance.theme,
              compactMode: prefs.appearance?.compactMode !== undefined ? prefs.appearance.compactMode : prev.appearance.compactMode,
              showAvatars: prefs.appearance?.showAvatars !== undefined ? prefs.appearance.showAvatars : prev.appearance.showAvatars,
              animations: prefs.appearance?.animations !== undefined ? prefs.appearance.animations : prev.appearance.animations,
            },
            notifications: prefs.notifications ? {
              ...prev.notifications,
              ...prefs.notifications
            } : prev.notifications,
            privacy: prefs.privacy ? {
              ...prev.privacy,
              ...prefs.privacy
            } : prev.privacy,
            isActive: data.doctor.isActive !== undefined ? data.doctor.isActive : prev.isActive
          }));

          if (prefs.theme || prefs.appearance?.theme) {
            setTheme(prefs.appearance?.theme || prefs.theme);
          }
          setSelectedTimeZone(resolvedTimezone);

          try {
            localStorage.setItem('doctorPreferences', JSON.stringify({
              language: prefs.language || settings.language,
              timezone: resolvedTimezone,
              theme: prefs.appearance?.theme || prefs.theme || settings.appearance.theme,
            }));
          } catch { }
        }
      } catch (err) {
        // Silently handle errors - use cached preferences
      return;
      }
    };

    const initializeSettings = async () => {
      // Load cached preferences immediately for better UX
      try {
        const cached = JSON.parse(localStorage.getItem('doctorPreferences') || '{}');
        const cachedAll = JSON.parse(localStorage.getItem('doctorAllSettings') || '{}');

        if (cached && (cached.language || cached.timezone || cached.theme)) {
          const resolvedCachedTimezone = cached.timezone || DEFAULT_APP_TIMEZONE;
          setSettings(prev => ({
            ...prev,
            language: cached.language || prev.language,
            timezone: resolvedCachedTimezone,
            appearance: {
              ...prev.appearance,
              theme: cached.theme || prev.appearance.theme,
              ...(cachedAll.appearance || {})
            },
            notifications: cachedAll.notifications ? { ...prev.notifications, ...cachedAll.notifications } : prev.notifications,
            privacy: cachedAll.privacy ? { ...prev.privacy, ...cachedAll.privacy } : prev.privacy,
          }));
          setSelectedTimeZone(resolvedCachedTimezone);
          if (cached.theme) setTheme(cached.theme);
        }
        if (!cached?.timezone) {
          setSelectedTimeZone(DEFAULT_APP_TIMEZONE);
        }
      } catch { }

      // Try to load from backend (silently fail if unavailable)
      const isBackendAvailable = await testBackendConnection();
      if (isBackendAvailable) {
        await loadSecuritySettings();
        await loadDoctorPreferences();
      }
      // Don't show error if backend is unavailable - use cached/default settings
    };

    initializeSettings();
  }, [setTheme]);

  const handleSettingChange = (category, setting, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: value
      }
    }));
    setHasChanges(true);
  };

  const handlePreferenceChange = (setting, value) => {
    const normalizedValue =
      setting === 'timezone' ? setSelectedTimeZone(value) : value;

    setSettings(prev => ({
      ...prev,
      [setting]: normalizedValue
    }));
    setHasChanges(true);

    // Show toast notification when profile status changes
    if (setting === 'isActive') {
      setStatusToast({
        type: value ? 'active' : 'inactive',
        show: true
      });

      // Auto-hide toast after 4 seconds
      setTimeout(() => {
        setStatusToast(null);
      }, 4000);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Apply Appearance Changes to global context (deferred until now)
      setTheme(draftTheme);
      setColorTheme(draftColorTheme);
      setCustomColors(draftCustomColors);

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login first to save settings');
        setLoading(false);
        return;
      }

      // Save security settings to backend
      const response = await fetch(`${DOCTOR_API_BASE}/security-settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings.security)
      });

      if (!response.ok) {
        if (response.status !== 404) {
          const errorData = await response.json().catch(() => ({}));
          setError(errorData.message || `Server error: ${response.status}`);
          setLoading(false);
          return;
        }
      }

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPasswordInfo(data.passwordInfo);
        }
      }

      // Save Preferences (language, timezone, theme)
      const saved = await saveDoctorPreferences();

      // Always cache locally
      try {
        localStorage.setItem('doctorPreferences', JSON.stringify({
          language: settings.language,
          timezone: settings.timezone,
          theme: draftTheme,
        }));
        localStorage.setItem('doctorAllSettings', JSON.stringify({
          notifications: settings.notifications,
          privacy: settings.privacy,
          appearance: { ...settings.appearance, theme: draftTheme },
        }));
      } catch { }

      if (saved) {
        // Update global auth state
        updateUser(saved.doctor);
        setHasChanges(false);
        setSuccess('Settings updated successfully!');
        
        // Return to overview if in detail view
        if (view === 'detail') {
           setTimeout(() => setView('overview'), 1500);
        }

        // If doctor switched to inactive, end all active sessions
        if (settings.isActive === false && saved.doctor.isActive === false) {
          const endedCount = await endActiveSessions();
          if (endedCount > 0) {
            setSuccess(`Profile deactivated. ${endedCount} active session(s) have been ended.`);
          } else {
            setSuccess('Profile deactivated successfully.');
          }
        }
      } else {
        // Settings saved locally even if backend is unavailable
        setSuccess('Settings saved locally. Will sync with server when available.');
      }
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      // Keep this silent in production to avoid leaking runtime context
      // Still save locally
      try {
        localStorage.setItem('doctorPreferences', JSON.stringify({
          language: settings.language,
          timezone: settings.timezone,
          theme: draftTheme,
        }));
        localStorage.setItem('doctorAllSettings', JSON.stringify({
          notifications: settings.notifications,
          privacy: settings.privacy,
          appearance: { ...settings.appearance, theme: draftTheme },
        }));
        setSuccess('Settings saved locally.');
        setTimeout(() => setSuccess(null), 3000);
      } catch { }
    } finally {
      setLoading(false);
    }
  };

  // (moved inside useEffect)

  // End all active sessions when doctor goes inactive
  const endActiveSessions = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${API_BASE}/sessions/end-all-active`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.endedCount || 0;
      }
    } catch (error) {
      return 0;
    }
    return 0;
  };

  // Persist preferences to backend (PUT profile)
  const saveDoctorPreferences = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return false;

      const response = await fetch(`${DOCTOR_API_BASE}/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          preferences: {
            language: settings.language,
            timezone: settings.timezone,
            theme: settings.appearance.theme,
            notifications: settings.notifications,
            privacy: settings.privacy,
            appearance: settings.appearance
          },
          isActive: settings.isActive
        })
      });

      if (!response.ok) {
        // Silently fail if profile update fails
        return false;
      }
      const data = await response.json();
      return response.ok && data.success ? data : false;
    } catch (e) {
      return false;
    }
  };

  const handleThemeSelect = (nextTheme) => {
    setTheme(nextTheme);
    handleSettingChange('appearance', 'theme', nextTheme);
  };

  const tabs = [
    { 
      id: 'notifications', 
      name: 'Notifications', 
      icon: Bell, 
      desc: 'Alerts, reminders & updates',
      color: 'bg-purple-100 text-purple-600'
    },
    { 
      id: 'privacy', 
      name: 'Privacy & Data', 
      icon: Shield, 
      desc: 'Data sharing & visibility',
      color: 'bg-emerald-100 text-emerald-600'
    },
    { 
      id: 'appearance', 
      name: 'Appearance', 
      icon: Palette, 
      desc: 'Display & accessibility',
      color: 'bg-rose-100 text-rose-600'
    },
    { 
      id: 'security', 
      name: 'Security', 
      icon: Lock, 
      desc: 'Authentication & protection',
      color: 'bg-orange-100 text-orange-600'
    },
    { 
      id: 'preferences', 
      name: 'Preferences', 
      icon: Sliders, 
      desc: 'Shortcuts & workflows',
      color: 'bg-blue-100 text-blue-600'
    },
    { 
      id: 'compliance', 
      name: 'Security & Compliance', 
      icon: Shield, 
      desc: 'Security controls and standards coverage',
      color: 'bg-teal-100 text-teal-600'
    }
  ];

  // Language and timezone metadata for Preferences tab
  const languageMeta = [
    { id: 'en', label: 'English (Default)' },
    { id: 'hi', label: 'Hindi' },
    { id: 'es', label: 'Spanish' },
    { id: 'ru', label: 'Russian' },
    { id: 'ko', label: 'Korean' },
    { id: 'ja', label: 'Japanese' },
    { id: 'zh', label: 'Chinese' }
  ];

  const languageTimezones = {
    en: [
      // Placeholder; will be replaced by full list via getAllTimezones()
      { value: 'Asia/Kolkata', label: 'India Standard Time (IST)' }
    ],
    hi: [
      { value: 'Asia/Kolkata', label: 'India Standard Time (IST)' }
    ],
    es: [
      { value: 'Europe/Madrid', label: 'Central European Time (CET)' },
      { value: 'America/Mexico_City', label: 'Central Time (Mexico City)' },
      { value: 'America/Bogota', label: 'Colombia Time (COT)' }
    ],
    ru: [
      { value: 'Europe/Moscow', label: 'Moscow Time (MSK)' }
    ],
    ko: [
      { value: 'Asia/Seoul', label: 'Korea Standard Time (KST)' }
    ],
    ja: [
      { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' }
    ],
    zh: [
      { value: 'Asia/Shanghai', label: 'China Standard Time (CST)' },
      { value: 'Asia/Taipei', label: 'Taiwan Standard Time (CST)' }
    ]
  };

  // Build a comprehensive timezone list for English using Intl API
  const getAllTimezones = () => {
    try {
      // Modern browsers expose the full IANA list
      if (typeof Intl !== 'undefined' && typeof Intl.supportedValuesOf === 'function') {
        const list = Intl.supportedValuesOf('timeZone').map((tz) => ({ value: tz, label: tz }));
        // Ensure IST (Asia/Kolkata) is present and clearly labeled
        const hasIST = list.some((t) => t.value === 'Asia/Kolkata');
        if (!hasIST) {
          list.unshift({ value: 'Asia/Kolkata', label: 'India Standard Time (IST)' });
        } else {
          for (const t of list) {
            if (t.value === 'Asia/Kolkata') {
              t.label = 'India Standard Time (IST)';
              break;
            }
          }
        }
        return list;
      }
    } catch { }
    // Fallback to a broad but finite set if Intl.supportedValuesOf is not available
    const fallbackTz = [
      'UTC', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid', 'Europe/Rome', 'Europe/Moscow',
      'Africa/Cairo', 'Africa/Johannesburg', 'Africa/Nairobi',
      'Asia/Dubai', 'Asia/Jerusalem', 'Asia/Kolkata', 'Asia/Karachi', 'Asia/Dhaka', 'Asia/Bangkok', 'Asia/Jakarta',
      'Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Taipei', 'Asia/Tokyo', 'Asia/Seoul', 'Asia/Singapore',
      'Australia/Sydney', 'Australia/Perth', 'Pacific/Auckland',
      'America/St_Johns', 'America/Halifax', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu',
      'America/Mexico_City', 'America/Bogota', 'America/Lima', 'America/Sao_Paulo', 'America/Argentina/Buenos_Aires'
    ];
    // Ensure friendly label for IST
    return fallbackTz.map((tz) => ({ value: tz, label: tz === 'Asia/Kolkata' ? 'India Standard Time (IST)' : tz }));
  };

  const getTimezonesForLanguage = (lang) => {
    if (lang === 'en') return getAllTimezones();
    return languageTimezones[lang] || [];
  };

  const availableTimezones = getTimezonesForLanguage(settings.language);

  const handleLanguageChange = (lang) => {
    handlePreferenceChange('language', lang);
    const tzs = getTimezonesForLanguage(lang);
    if (tzs && tzs.length) {
      // Prefer IST for English; otherwise first available
      const ist = tzs.find((t) => t.value === 'Asia/Kolkata');
      handlePreferenceChange('timezone', lang === 'en' && ist ? ist.value : tzs[0].value);
    }
  };

  // Reflect selected language in <html lang="..."> for accessibility
  useEffect(() => {
    try {
      document.documentElement.lang = settings.language || 'en';
    } catch { }
  }, [settings.language]);

  const loadDeviceSessions = async () => {
    try {
      setSessionLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setDeviceSessions([]);
        return;
      }
      const response = await fetch(`${API_BASE}/sessions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.success) {
        setDeviceSessions(Array.isArray(data.sessions) ? data.sessions : []);
      }
    } catch {
      return;
    } finally {
      setSessionLoading(false);
    }
  };

  const logoutSessionDevice = async (sessionId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await fetch(`${API_BASE}/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        await loadDeviceSessions();
      }
    } catch {
      return;
    }
  };

  const logoutAllDevices = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await fetch(`${API_BASE}/sessions`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        await loadDeviceSessions();
      }
    } catch {
      return;
    }
  };

  useEffect(() => {
    if (activeTab === 'security' && view === 'detail') {
      loadDeviceSessions();
    }
  }, [activeTab, view]);

  return (
    <main className="min-h-screen bg-[#F5F7FB] dark:bg-[#0A0A0A] p-4 sm:p-8 pt-24">
      {statusToast?.show && (
        <div className="fixed top-20 right-6 z-50 animate-in slide-in-from-right-5 fade-in duration-500">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden min-w-[320px] max-w-md">
            <div className="flex items-start gap-3 p-4">
              <div className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center ${statusToast.type === 'active'
                  ? 'bg-emerald-100 dark:bg-emerald-900/30'
                  : 'bg-amber-100 dark:bg-amber-900/30'
                }`}>
                {statusToast.type === 'active' ? (
                  <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight mb-1">
                  {statusToast.type === 'active' ? 'Profile Activated' : 'Profile Deactivated'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  {statusToast.type === 'active'
                    ? 'Your profile is now active. You can scan QR codes and attend sessions.'
                    : 'Your profile is now inactive. You cannot scan QR codes or attend sessions.'}
                </p>
              </div>
              <button 
                onClick={() => setStatusToast(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="h-1 bg-gray-100 dark:bg-gray-700 overflow-hidden">
              <div className={`h-full animate-[shrink_4s_linear_forwards] ${statusToast.type === 'active'
                  ? 'bg-gradient-to-r from-emerald-500 to-green-500'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500'
                }`}></div>
            </div>
          </div>
        </div>
      )}

      {/* Global Success/Error Notifications */}
      {(success || error) && (
        <div className="fixed top-24 right-6 z-[100] animate-in slide-in-from-right-5 fade-in duration-500">
          <div className={`bg-white dark:bg-[#121212] rounded-2xl shadow-2xl border ${success ? 'border-emerald-100 dark:border-emerald-500/20' : 'border-red-100 dark:border-red-500/20'} overflow-hidden min-w-[340px] max-w-md`}>
            <div className="flex items-start gap-3 p-4">
              <div className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center ${success ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-red-50 dark:bg-red-500/10'}`}>
                {success ? (
                  <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  {success ? 'Settings Saved' : 'Update Failed'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  {success || error}
                </p>
              </div>
              <button 
                onClick={() => { setSuccess(null); setError(null); }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors mt-0.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="h-1 bg-slate-50 dark:bg-white/5 overflow-hidden">
              <div className={`h-full animate-[shrink_5s_linear_forwards] ${success ? 'bg-emerald-500' : 'bg-red-500'}`} />
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[1100px] mx-auto w-full px-0 py-0">
        {view === 'overview' ? (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-6">
            {/* Profile Section */}
            <div className="bg-white dark:bg-[#121212] rounded-[16px] border border-[#E5E7EB] dark:border-white/5 p-6 flex items-center gap-6 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center border-4 border-white dark:border-white/5 shadow-sm overflow-hidden flex-shrink-0">
                {user?.profileImage ? (
                  <img src={user.profileImage} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="text-2xl font-black text-primary uppercase">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight truncate">{user?.name || 'User Name'}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[11px] font-bold uppercase tracking-wider">
                    {user?.role || 'User'}
                  </span>
                  <span className="text-slate-400 font-medium text-xs hidden sm:inline">•</span>
                  <span className="text-slate-500 dark:text-slate-400 text-sm font-medium truncate">{user?.email || 'user@example.com'}</span>
                </div>
              </div>
              <button 
                onClick={() => navigate('/profile')} 
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary text-xs font-bold rounded-lg border border-primary/20 hover:bg-primary/20 transition-colors"
              >
                <User className="h-4 w-4" />
                View Profile
              </button>
            </div>

            {/* Quick Settings Section */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Dark Mode */}
              <div className="bg-white dark:bg-[#121212] rounded-[16px] border border-[#E5E7EB] dark:border-white/5 p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600 dark:text-orange-400">
                    {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                  </div>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Dark Mode</span>
                </div>
                <button 
                  onClick={() => {
                     setDraftTheme(draftTheme === 'dark' ? 'light' : 'dark');
                     setHasChanges(true);
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-500 ease-in-out ${draftTheme === 'dark' ? 'bg-primary shadow-[0_0_12px_rgba(var(--primary-rgb),0.3)]' : 'bg-slate-200 dark:bg-slate-800'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all duration-500 ease-in-out shadow-md ${draftTheme === 'dark' ? 'translate-x-6 scale-110' : 'translate-x-1'}`} />
                </button>
              </div>
              
              {/* Notifications */}
              <div className="bg-white dark:bg-[#121212] rounded-[16px] border border-[#E5E7EB] dark:border-white/5 p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <Bell className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Alerts</span>
                </div>
                <button 
                  onClick={() => handleSettingChange('notifications', 'newPatients', !settings.notifications.newPatients)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-500 ease-in-out ${settings.notifications.newPatients ? 'bg-primary shadow-[0_0_12px_rgba(var(--primary-rgb),0.3)]' : 'bg-slate-200 dark:bg-slate-800'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all duration-500 ease-in-out shadow-md ${settings.notifications.newPatients ? 'translate-x-6 scale-110' : 'translate-x-1'}`} />
                </button>
              </div>

              {/* Language */}
              <div className="bg-white dark:bg-[#121212] rounded-[16px] border border-[#E5E7EB] dark:border-white/5 p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Globe className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Locale</span>
                </div>
                <select 
                  value={settings.language}
                  onChange={(e) => handleSettingChange('language', null, e.target.value)}
                  className="bg-transparent text-xs font-bold text-primary focus:outline-none cursor-pointer"
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                </select>
              </div>
            </div>

            <div>
              <h1 className="text-[28px] font-black text-slate-900 dark:text-white tracking-tight leading-tight">Advanced Settings</h1>
              <p className="text-[#6B7280] dark:text-slate-400 font-medium text-sm mt-1">
                Configure your account preferences
              </p>
            </div>

            {/* Category Cards */}
            <div className="grid gap-[18px] w-full pb-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setView('detail');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full text-left bg-white dark:bg-[#121212] p-6 rounded-[16px] shadow-[0_8px_24px_rgba(0,0,0,0.06)] dark:shadow-none border border-[#E5E7EB] dark:border-white/5 flex items-center justify-between group hover:border-primary/30 hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)] transition-all duration-300 transform hover:-translate-y-[2px] active:scale-[0.99]"
                >
                  <div className="flex items-center gap-6">
                    <div className={`h-[48px] w-[48px] rounded-[12px] flex items-center justify-center transition-all ${tab.color}`}>
                      <tab.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight leading-none mb-1">
                        {tab.name}
                      </h3>
                      <p className="text-[13px] text-slate-500 dark:text-slate-400 font-medium tracking-tight">
                        {tab.desc}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-primary transition-all group-hover:translate-x-[4px] stroke-[3]" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-right-8 duration-500 space-y-6 pb-20">
            {/* Detail Header with Back Button */}
            <div className="flex items-center gap-5">
              <button 
                onClick={() => setView('overview')}
                className="h-10 w-10 flex items-center justify-center rounded-full bg-white dark:bg-white/5 text-slate-600 dark:text-slate-400 shadow-sm border border-slate-100 dark:border-white/10 hover:bg-primary hover:text-white hover:border-primary transition-all active:scale-90"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                  {tabs.find(t => t.id === activeTab)?.name}
                </h1>
                <p className="text-[#6B7280] dark:text-slate-400 font-medium text-[13px]">
                  {tabs.find(t => t.id === activeTab)?.desc}
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-[#121212] rounded-[16px] shadow-[0_8px_24px_rgba(0,0,0,0.06)] dark:shadow-none border border-[#E5E7EB] dark:border-white/5 overflow-hidden">
              {/* Tab Content Rendering */}
              <div className="p-6">
                {/* Notifications Tab */}
                {activeTab === 'notifications' && (
                  <div className="animate-in fade-in duration-500">
                    <div className="divide-y divide-[#F1F5F9] dark:divide-white/5">
                      {Object.entries(settings.notifications).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between py-[14px] transition-colors group">
                          <div className="flex-1 pr-8">
                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 capitalize">
                              {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                            </h4>
                            <p className="text-xs text-slate-500 font-medium mt-1">
                              {key === 'newPatients' && 'Get notified when new patients are added'}
                              {key === 'appointmentReminders' && 'Receive reminders for upcoming appointments'}
                              {key === 'labResults' && 'Notifications for new lab results'}
                              {key === 'medicationUpdates' && 'Updates about medication changes'}
                              {key === 'emergencyAlerts' && 'Critical emergency notifications'}
                            </p>
                          </div>
                          <button
                            onClick={() => handleSettingChange('notifications', key, !value)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-500 ease-in-out ${value ? 'bg-primary shadow-[0_0_12px_rgba(var(--primary-rgb),0.3)]' : 'bg-slate-200 dark:bg-slate-800'}`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all duration-500 ease-in-out shadow-md ${value ? 'translate-x-6 scale-110' : 'translate-x-1'}`} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Privacy & Data Tab */}
                {activeTab === 'privacy' && (
                  <div className="animate-in fade-in duration-500">

                    <div className="divide-y divide-[#F1F5F9] dark:divide-white/5">
                      {Object.entries(settings.privacy).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between py-[14px] transition-colors group">
                          <div className="flex-1 pr-8">
                            <h5 className="text-sm font-bold text-slate-800 dark:text-slate-200 capitalize">
                              {key === 'dataSharing' && 'Medical Research Data'}
                              {key === 'analytics' && 'Application Usage Analytics'}
                              {key === 'marketing' && 'Professional Communications'}
                              {key === 'thirdParty' && 'External Integrations'}
                            </h5>
                            <p className="text-xs text-slate-500 font-medium mt-1">
                              {key === 'dataSharing' && 'Share anonymized data for clinical research'}
                              {key === 'analytics' && 'Help us improve by sharing usage statistics'}
                              {key === 'marketing' && 'Updates about new features and medical resources'}
                              {key === 'thirdParty' && 'Allow syncing with external healthcare systems'}
                            </p>
                          </div>
                          <button
                            onClick={() => handleSettingChange('privacy', key, !value)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-500 ease-in-out ${value ? 'bg-primary shadow-[0_0_12px_rgba(var(--primary-rgb),0.3)]' : 'bg-slate-200 dark:bg-slate-800'}`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all duration-500 ease-in-out shadow-md ${value ? 'translate-x-6 scale-110' : 'translate-x-1'}`} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-primary-50 dark:bg-primary/10 rounded-2xl border border-primary/10">
                        <h4 className="text-xs font-black text-primary uppercase tracking-widest mb-2">Data Security</h4>
                        <p className="text-[11px] text-primary/80 font-medium leading-relaxed">
                          All patient records are end-to-end encrypted and stored in HIPAA-compliant isolated environments.
                        </p>
                      </div>
                      <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl border border-emerald-500/10">
                        <h4 className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-2">Compliance</h4>
                        <p className="text-[11px] text-emerald-600/80 font-medium leading-relaxed">
                          HealthVault is SOC2 Type II and HIPAA certified by leading independent auditors.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Security Tab */}
                {activeTab === 'security' && (
                  <div className="animate-in fade-in duration-500">

                    {passwordInfo && (
                      <div className={`p-4 rounded-2xl border flex items-start gap-3 ${passwordInfo.isExpired
                        ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20'
                        : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10'
                        }`}>
                        <Shield className={`h-5 w-5 mt-0.5 ${passwordInfo.isExpired ? 'text-red-600' : 'text-primary'}`} />
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Password Status</h4>
                          <p className="text-xs text-slate-500 font-medium mt-1">
                            {passwordInfo.isExpired
                              ? '\u26a0\ufe0f Your password has expired. Please update it now.'
                              : `Expires in ${passwordInfo.daysUntilExpiry} days.`}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="divide-y divide-[#F1F5F9] dark:divide-white/5">
                      {Object.entries(settings.security).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between py-[14px] transition-colors group">
                          <div>
                            <h5 className="text-sm font-bold text-slate-800 dark:text-slate-200 capitalize">
                              {key === 'twoFactorAuth' && 'Two-Factor Authentication'}
                              {key === 'sessionTimeout' && 'Auto Logout Duration'}
                              {key === 'passwordExpiry' && 'Password Expiry Cycle'}
                              {key === 'loginNotifications' && 'Login Attempt Alerts'}
                            </h5>
                            <p className="text-xs text-slate-500 font-medium mt-1">
                              {key === 'twoFactorAuth' && 'Biometric or app-based second factor'}
                              {key === 'sessionTimeout' && 'Inactivity timeout limit'}
                              {key === 'passwordExpiry' && 'Mandatory password change rotation'}
                              {key === 'loginNotifications' && 'Email alert for every new login'}
                            </p>
                          </div>
                          {key === 'sessionTimeout' || key === 'passwordExpiry' ? (
                            <select
                              value={value}
                              onChange={(e) => handleSettingChange('security', key, parseInt(e.target.value))}
                              className="px-4 py-2 bg-slate-100 dark:bg-white/5 border-none rounded-xl text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                            >
                              {key === 'sessionTimeout' ? (
                                <>
                                  <option value={15}>15 mins</option>
                                  <option value={30}>30 mins</option>
                                  <option value={60}>1 hour</option>
                                </>
                              ) : (
                                <>
                                  <option value={30}>30 days</option>
                                  <option value={90}>90 days</option>
                                  <option value={180}>180 days</option>
                                </>
                              )}
                            </select>
                          ) : (
                            <button
                              onClick={() => handleSettingChange('security', key, !value)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-500 ease-in-out ${value ? 'bg-primary shadow-[0_0_12px_rgba(var(--primary-rgb),0.3)]' : 'bg-slate-200 dark:bg-slate-800'}`}
                            >
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all duration-500 ease-in-out shadow-md ${value ? 'translate-x-6 scale-110' : 'translate-x-1'}`} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="pt-6 border-t border-slate-100 dark:border-white/5">
                      <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-slate-100 dark:border-white/5">
                        <div>
                          <h5 className="text-sm font-bold text-slate-900 dark:text-white">Profile Visibility</h5>
                          <p className="text-xs text-slate-500 font-medium mt-1">Turn off your profile to hide from search results.</p>
                        </div>
                        <button
                          onClick={() => handlePreferenceChange('isActive', !settings.isActive)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-500 ease-in-out ${settings.isActive ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]' : 'bg-slate-200 dark:bg-slate-800'}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all duration-500 ease-in-out shadow-md ${settings.isActive ? 'translate-x-6 scale-110' : 'translate-x-1'}`} />
                        </button>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 dark:border-white/5 mt-6">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-sm font-bold text-slate-900 dark:text-white">Active Devices</h5>
                        <button
                          type="button"
                          onClick={logoutAllDevices}
                          className="text-xs font-bold text-red-600 hover:text-red-700"
                        >
                          Logout All Devices
                        </button>
                      </div>
                      {sessionLoading ? (
                        <p className="text-xs text-slate-500">Loading device sessions...</p>
                      ) : (
                        <div className="space-y-2">
                          {deviceSessions.length === 0 ? (
                            <p className="text-xs text-slate-500">No active device sessions found.</p>
                          ) : deviceSessions.map((session) => (
                            <div key={session.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02]">
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                                  {session.deviceInfo || session.userAgent || 'Unknown device'}
                                </p>
                                <p className="text-[11px] text-slate-500 truncate">
                                  IP: {session.ipAddress || 'N/A'} • Last active: {session.lastActiveAt ? new Date(session.lastActiveAt).toLocaleString() : 'N/A'}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => logoutSessionDevice(session.id)}
                                className="ml-3 text-[11px] font-bold text-red-600 hover:text-red-700"
                              >
                                Logout
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Preferences Tab */}
                {activeTab === 'preferences' && (
                  <div className="animate-in fade-in duration-500">
                    <div className="divide-y divide-[#F1F5F9] dark:divide-white/5">
                      <div className="flex items-center justify-between py-[14px]">
                        <div>
                          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Language</h4>
                          <p className="text-xs text-slate-500 font-medium mt-1">System primary language</p>
                        </div>
                        <select
                          value={settings.language}
                          onChange={(e) => handleLanguageChange(e.target.value)}
                          className="px-4 py-2 bg-slate-100 dark:bg-white/5 border-none rounded-xl text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer text-right min-w-[140px]"
                        >
                          {languageMeta.map((lang) => (
                            <option key={lang.id} value={lang.id}>{lang.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center justify-between py-[14px]">
                        <div>
                          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Timezone</h4>
                          <p className="text-xs text-slate-500 font-medium mt-1">Primary business timezone</p>
                        </div>
                        <select
                          value={settings.timezone}
                          onChange={(e) => handlePreferenceChange('timezone', e.target.value)}
                          className="px-4 py-2 bg-slate-100 dark:bg-white/5 border-none rounded-xl text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer text-right min-w-[140px]"
                        >
                          {availableTimezones.map((tz) => (
                            <option key={tz.value} value={tz.value}>{tz.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'compliance' && (
                  <div className="animate-in fade-in duration-500 space-y-6">
                    <div className="p-4 rounded-2xl border bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Security Features</h4>
                      <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                        <li>JWT access + refresh token flow with rotation and revocation checks.</li>
                        <li>Role-based access control for admin and privileged API routes.</li>
                        <li>Schema validation and route throttling for auth, uploads, and AI APIs.</li>
                        <li>Strict upload controls with MIME allowlists, size limits, and magic-byte verification.</li>
                        <li>Per-user device session visibility with single-device and logout-all controls plus risk detection.</li>
                        <li>Immutable audit logging with tamper-evident hash chaining for forensic readiness.</li>
                        <li>Field-level encryption at rest for sensitive medical notes and PII fields.</li>
                        <li>User consent logging (policy/terms version + timestamp) for compliance traceability.</li>
                      </ul>
                    </div>

                    <div className="p-4 rounded-2xl border bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Compliance</h4>
                      <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                        The platform follows HIPAA-inspired safeguards (data protection, access control, audit readiness), includes admin audit logging, and implements controls aligned to OWASP Top 10 risks.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl border bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Security Monitoring</h4>
                      <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                        Failed-login anomaly detection, suspicious device/IP session alerts, severity-based escalation, and breach-flag-ready security events are continuously monitored and exposed to authorized admin roles.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl border bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Security Score</h4>
                      <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">Overall security score: <span className="font-bold text-emerald-600">7.7 / 10</span> (improved from 4.5 / 10).</p>
                    </div>

                    <div className="p-4 rounded-2xl border bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20">
                      <h4 className="text-sm font-bold text-amber-700 dark:text-amber-300">Disclaimer</h4>
                      <p className="mt-2 text-xs text-amber-700/90 dark:text-amber-200/90">
                        This system follows best practices inspired by HIPAA but is not officially certified.
                      </p>
                    </div>
                  </div>
                )}

                {/* Appearance Tab */}
                {activeTab === 'appearance' && (
                  <div className="space-y-8 animate-in fade-in duration-500">
                    {/* Mode Preference */}
                    <section>
                      <div className="pb-4">
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Display Mode</h4>
                        <p className="text-xs text-slate-500 font-medium mt-1">Select your preferred interface style.</p>
                      </div>
                      <div className="bg-slate-100/50 dark:bg-white/[0.02] p-1.5 rounded-[18px] flex gap-1 border border-slate-100 dark:border-white/5">
                        {[
                          { id: 'light', name: 'Light', icon: Sun },
                          { id: 'dark', name: 'Dark', icon: Moon },
                          { id: 'auto', name: 'System', icon: Monitor }
                        ].map((t) => (
                          <button
                            key={t.id}
                            onClick={() => {
                               setDraftTheme(t.id);
                               setHasChanges(true);
                            }}
                            className={`flex-1 flex items-center justify-center gap-2.5 py-3 rounded-[12px] font-bold text-xs transition-all ${draftTheme === t.id
                              ? 'bg-white dark:bg-white/10 text-primary shadow-sm ring-1 ring-slate-200/50 dark:ring-white/10'
                              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                              }`}
                          >
                            <t.icon className={`h-4 w-4 ${draftTheme === t.id ? 'text-primary' : ''}`} />
                            {t.name}
                          </button>
                        ))}
                      </div>
                    </section>

                    {/* Theme & Colors */}
                    <section>
                      <div className="pb-4">
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Theme Accent</h4>
                        <p className="text-xs text-slate-500 font-medium mt-1">Choose a primary color for your workspace.</p>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                          { id: 'green', name: 'Medical Green', color: '#10B981' },
                          { id: 'saffron', name: 'Saffron Soul', color: '#FFAE42' },
                          { id: 'cyan', name: 'Cyan Mist', color: '#06B6D4' },
                          { id: 'blue-purple', name: 'Royal Blue', color: '#3B82F6' },
                        ].map((t) => (
                          <button
                            key={t.id}
                            onClick={() => {
                              setDraftColorTheme(t.id);
                              setHasChanges(true);
                            }}
                            className={`group h-12 rounded-[12px] border-2 transition-all duration-300 flex items-center justify-center relative ${draftColorTheme === t.id ? 'border-primary shadow-md' : 'border-slate-100 dark:border-white/5 hover:border-slate-200'}`}
                            style={{ backgroundColor: t.color }}
                            title={t.name}
                          >
                            {draftColorTheme === t.id && (
                              <div className="bg-white rounded-full p-1 shadow-sm animate-in zoom-in duration-300">
                                 <Check className="text-primary h-2.5 w-2.5 stroke-[4]" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>


                      {/* Mixed Theme Creator */}
                      <div className="mt-8 border-t border-slate-100 dark:border-white/5 pt-8">
                        <div className="pb-4">
                          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Mixed Theme Creator</h4>
                          <p className="text-xs text-slate-500 font-medium mt-1">Design a unique dual-tone workspace gradient.</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-end">
                           <div className="space-y-4">
                              <div className="flex gap-4">
                                 <div className="flex-1 space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Color A</label>
                                    <div className="relative group">
                                       <button 
                                          onClick={() => document.getElementById('mixed-a').click()}
                                          className="w-full h-12 rounded-xl border border-slate-200 dark:border-white/10 flex items-center justify-between px-4 bg-white dark:bg-white/5 transition-all hover:border-primary"
                                       >
                                          <div className="flex items-center gap-3">
                                             <div className="h-5 w-5 rounded-md shadow-sm border border-black/5" style={{ backgroundColor: mixedColorA }} />
                                             <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{mixedColorA}</span>
                                          </div>
                                          <Plus className="h-3.5 w-3.5 text-slate-400" />
                                       </button>
                                       <input id="mixed-a" type="color" value={mixedColorA} className="absolute inset-0 opacity-0 w-0 h-0" onChange={(e) => {setMixedColorA(e.target.value); setDraftColorTheme('custom'); setHasChanges(true);}} />
                                    </div>
                                 </div>
                                 <div className="flex-1 space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Color B</label>
                                    <div className="relative group">
                                       <button 
                                          onClick={() => document.getElementById('mixed-b').click()}
                                          className="w-full h-12 rounded-xl border border-slate-200 dark:border-white/10 flex items-center justify-between px-4 bg-white dark:bg-white/5 transition-all hover:border-primary"
                                       >
                                          <div className="flex items-center gap-3">
                                             <div className="h-5 w-5 rounded-md shadow-sm border border-black/5" style={{ backgroundColor: mixedColorB }} />
                                             <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{mixedColorB}</span>
                                          </div>
                                          <Plus className="h-3.5 w-3.5 text-slate-400" />
                                       </button>
                                       <input id="mixed-b" type="color" value={mixedColorB} className="absolute inset-0 opacity-0 w-0 h-0" onChange={(e) => {setMixedColorB(e.target.value); setDraftColorTheme('custom'); setHasChanges(true);}} />
                                    </div>
                                 </div>
                              </div>
                              <div className="space-y-3 pt-2">
                                 <div className="flex justify-between items-center px-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gradient Intensity</label>
                                    <span className="text-[11px] font-black text-primary">{gradientIntensity}%</span>
                                 </div>
                                 <input 
                                    type="range" 
                                    min="0" 
                                    max="100" 
                                    value={gradientIntensity} 
                                    onChange={(e) => {setGradientIntensity(parseInt(e.target.value)); setDraftColorTheme('custom'); setHasChanges(true);}}
                                    className="w-full h-1.5 bg-slate-100 dark:bg-white/5 rounded-full appearance-none cursor-pointer accent-primary" 
                                 />
                              </div>
                           </div>
                           <div className="h-[120px] rounded-[20px] border border-slate-100 dark:border-white/10 p-1 bg-white dark:bg-white/5 shadow-inner">
                              <div className="h-full w-full rounded-[16px] shadow-lg flex items-center justify-center relative overflow-hidden" 
                                   style={{ background: `linear-gradient(135deg, ${mixedColorA} 0%, ${mixedColorB} ${gradientIntensity}%)` }}>
                                 <span className="text-white text-[10px] font-black uppercase tracking-[0.3em] drop-shadow-md z-10">Gradient Live Preview</span>
                                 <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-40" />
                              </div>
                           </div>
                        </div>
                      </div>

                      <div className="mt-8 flex items-center justify-between border-t border-slate-100 dark:border-white/5 pt-8">
                        <div className="relative">
                          <button 
                            onClick={() => document.getElementById('custom-color-picker').click()}
                            className="flex items-center gap-2.5 px-6 py-3 rounded-[12px] border-2 border-dashed border-slate-200 dark:border-white/10 text-slate-500 hover:border-primary hover:text-primary transition-all font-bold text-[11px] uppercase tracking-widest bg-slate-50/50 dark:bg-white/[0.02]"
                          >
                            <Plus className="h-4 w-4" />
                            Add Custom Color
                          </button>
                          <input 
                            id="custom-color-picker"
                            type="color"
                            className="absolute inset-0 opacity-0 w-0 h-0"
                            onChange={(e) => {
                              const col = e.target.value;
                              setCustomColors({ primary: col, light: col + '15', gradient: col });
                              setColorTheme('custom');
                            }}
                          />
                        </div>

                        <button
                          onClick={() => {
                            setColorTheme('default');
                            setTheme('auto');
                          }}
                          className="text-[11px] font-black text-slate-400 hover:text-primary uppercase tracking-widest transition-colors px-2 py-1"
                        >
                          Reset Theme
                        </button>
                      </div>
                    </section>


                    {/* Theme Preview */}
                    <section className="bg-slate-50/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-[20px] p-6 lg:p-8 shadow-inner overflow-hidden relative">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">System Identity Preview</h4>
                       
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                          {/* Elements Preview */}
                          <div className="space-y-8">
                             <div className="space-y-4">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Primary Interaction</p>
                                <div className="flex flex-wrap gap-4 items-center">
                                   <button className="h-10 px-8 bg-primary text-white text-[11px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform">Primary Action</button>
                                   <button 
                                      onClick={() => setSuccess('Secondary preview triggered!')}
                                      className="h-10 px-6 bg-primary-50 dark:bg-primary/20 text-primary text-[11px] font-black uppercase tracking-widest rounded-xl border border-primary/20 transition-all hover:bg-primary/30"
                                   >
                                      Secondary
                                   </button>
                                </div>
                             </div>

                             <div className="space-y-4">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Link Highlights</p>
                                <div className="flex gap-6">
                                   <span className="text-xs font-bold text-primary underline underline-offset-4 decoration-2 cursor-pointer">Active link item</span>
                                   <span className="text-xs font-bold text-slate-400 hover:text-primary transition-colors cursor-pointer">Ghost highlight</span>
                                </div>
                             </div>
                          </div>

                          {/* Navigation Preview */}
                          <div className="space-y-8">
                             <div className="space-y-4">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Sidebar Focus State</p>
                                <div className="w-full bg-white dark:bg-white/5 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 p-1.5">
                                   <div className="bg-primary/10 dark:bg-primary/20 border-l-4 border-primary px-4 py-3 rounded-lg flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                         <Activity className="h-4 w-4 text-primary" />
                                         <span className="text-xs font-black text-primary uppercase tracking-widest">Active Dashboard</span>
                                      </div>
                                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                                   </div>
                                </div>
                             </div>
                             
                             <div className="space-y-4">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Control Accents</p>
                                <div className="flex items-center gap-6">
                                   <div className="h-6 w-11 bg-primary rounded-full p-1 flex items-center justify-end shadow-inner">
                                      <div className="h-4 w-4 bg-white rounded-full shadow-sm" />
                                   </div>
                                   <div className="flex items-center gap-2">
                                      {[1,2,3].map(i => (
                                         <div key={i} className={`h-2.5 w-2.5 rounded-full ${i === 1 ? 'bg-primary shadow-sm shadow-primary/50' : 'bg-slate-200 dark:bg-slate-700'}`} />
                                      ))}
                                   </div>
                                </div>
                             </div>
                          </div>
                       </div>

                       {/* Subtle Background Pattern */}
                       <div className="absolute top-0 right-0 p-8 opacity-[0.03] select-none pointer-events-none">
                          <Layout className="h-32 w-32" />
                       </div>
                    </section>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

        {/* Action Footer Always Visible at bottom */}
        <div className="mt-8 mb-12 flex justify-end">
          <button
            onClick={handleSave}
            disabled={loading}
            className={`inline-flex items-center gap-2.5 px-8 py-4 text-xs font-black uppercase tracking-widest rounded-[16px] shadow-xl transition-all duration-300 transform group ${
              hasChanges 
                ? 'bg-slate-900 dark:bg-white text-white dark:text-black hover:translate-y-[-4px] hover:shadow-2xl active:translate-y-0 ring-4 ring-primary/10' 
                : 'bg-slate-100 dark:bg-white/5 text-slate-400 cursor-not-allowed border border-slate-200 dark:border-white/5'
            }`}
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className={`h-4 w-4 ${hasChanges ? 'animate-pulse' : ''}`} />}
            {hasChanges ? 'Save Changes Now' : 'Settings Up to Date'}
          </button>
        </div>
      </div>
    </main>
  );
}

export default Settings;
