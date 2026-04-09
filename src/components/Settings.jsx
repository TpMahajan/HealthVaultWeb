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

const normalizeThemeMode = (themeValue) => (themeValue === 'dark' ? 'dark' : 'light');

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
      theme: 'light',
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
  const [draftTheme, setDraftTheme] = useState(normalizeThemeMode(theme));
  const [draftColorTheme, setDraftColorTheme] = useState(colorTheme);
  const [draftCustomColors, setDraftCustomColors] = useState(customColors);

  // Sync draft states when context changes (e.g. on first load)
  useEffect(() => {
    setDraftTheme(normalizeThemeMode(theme));
    setDraftColorTheme(colorTheme);
    setDraftCustomColors(customColors);
  }, [theme, colorTheme, customColors]);

  // Ensure Settings dark mode toggle always reflects persisted theme.
  // If no saved theme, default to light mode.
  useEffect(() => {
    let resolvedTheme = 'light';
    try {
      const savedTheme = localStorage.getItem('theme');
      resolvedTheme = normalizeThemeMode(savedTheme);
      if (!savedTheme) {
        localStorage.setItem('theme', 'light');
      }
    } catch {
      resolvedTheme = 'light';
    }

    try {
      document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
    } catch { }

    setTheme(resolvedTheme);
    setDraftTheme(resolvedTheme);
    setSettings((prev) => ({
      ...prev,
      appearance: {
        ...prev.appearance,
        theme: resolvedTheme,
      },
    }));
  }, [setTheme]);

  // Update dynamic gradient when mixed colors change (local only)
  useEffect(() => {
    if (draftColorTheme === 'custom') {
      const gradient = `linear-gradient(135deg, ${mixedColorA} 0%, ${mixedColorB} ${gradientIntensity}%)`;
      setDraftCustomColors({ primary: mixedColorA, secondary: mixedColorB, light: mixedColorA + '15', gradient });
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
              theme: normalizeThemeMode(prefs.appearance?.theme || prefs.theme || prev.appearance.theme),
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

          // Removed arbitrary global setTheme call from backend sync to prevent
          // overwriting the active session theme.
          setSelectedTimeZone(resolvedTimezone);

          try {
            localStorage.setItem('doctorPreferences', JSON.stringify({
              language: prefs.language || settings.language,
              timezone: resolvedTimezone,
              theme: normalizeThemeMode(prefs.appearance?.theme || prefs.theme || settings.appearance.theme),
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
              theme: normalizeThemeMode(cached.theme || prev.appearance.theme),
              ...(cachedAll.appearance || {})
            },
            notifications: cachedAll.notifications ? { ...prev.notifications, ...cachedAll.notifications } : prev.notifications,
            privacy: cachedAll.privacy ? { ...prev.privacy, ...cachedAll.privacy } : prev.privacy,
          }));
          setSelectedTimeZone(resolvedCachedTimezone);
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
    const resolvedTheme = normalizeThemeMode(nextTheme);
    setTheme(resolvedTheme);
    setDraftTheme(resolvedTheme);
    handleSettingChange('appearance', 'theme', resolvedTheme);

    try {
      localStorage.setItem('theme', resolvedTheme);
    } catch { }

    try {
      document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
    } catch { }
  };

  const tabs = [
    {
      id: 'notifications',
      name: 'Notifications',
      icon: Bell,
      desc: 'Alerts, reminders & updates',
      color: 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400'
    },
    {
      id: 'privacy',
      name: 'Privacy & Data',
      icon: Shield,
      desc: 'Data sharing & visibility',
      color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
    },
    {
      id: 'appearance',
      name: 'Appearance',
      icon: Palette,
      desc: 'Display & accessibility',
      color: 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'
    },
    {
      id: 'security',
      name: 'Security',
      icon: Lock,
      desc: 'Authentication & protection',
      color: 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400'
    },
    {
      id: 'preferences',
      name: 'Preferences',
      icon: Sliders,
      desc: 'Shortcuts & workflows',
      color: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
    },
    {
      id: 'compliance',
      name: 'Security & Compliance',
      icon: CheckCircle,
      desc: 'Security controls and standards coverage',
      color: 'bg-teal-100 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400'
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
    <main className="min-h-screen bg-transparent relative">
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

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 pt-24 relative z-10">
        {view === 'overview' ? (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-6">
            {/* Profile Section */}
            <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-6">
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
            </div>
              <button
                onClick={() => navigate('/profile')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/70 dark:bg-white/5 text-slate-900 dark:text-white text-xs font-bold rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 transition-all shadow-sm"
              >
                <User className="h-4 w-4" />
                View Profile
              </button>
            </div>

            {/* Quick Settings Section */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6">
              {/* Dark Mode */}
              <div className="bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 p-4 flex items-center justify-between shadow-sm transition-all hover:bg-slate-100 dark:hover:bg-white/10">
                <div className="flex items-center gap-4">
                  <div className="h-9 w-9 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500 dark:text-orange-400">
                    {draftTheme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                  </div>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">Dark Mode</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-black uppercase tracking-tighter ${draftTheme === 'dark' ? 'text-emerald-500' : 'text-slate-400'}`}>
                    {draftTheme === 'dark' ? 'ON' : 'OFF'}
                  </span>
                  <button
                    onClick={() => {
                      handleThemeSelect(draftTheme === 'dark' ? 'light' : 'dark');
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-500 ease-in-out ${draftTheme === 'dark' ? 'bg-primary shadow-primary/30' : 'bg-slate-200 dark:bg-slate-800'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all duration-500 ease-in-out shadow-md ${draftTheme === 'dark' ? 'translate-x-6 scale-110' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>

              {/* Notifications */}
              <div className="bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 p-4 flex items-center justify-between shadow-sm transition-all hover:bg-slate-100 dark:hover:bg-white/10">
                <div className="flex items-center gap-4">
                  <div className="h-9 w-9 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500 dark:text-purple-400">
                    <Bell className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">Alerts</span>
                </div>
                <button
                  onClick={() => handleSettingChange('notifications', 'newPatients', !settings.notifications.newPatients)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-500 ease-in-out ${settings.notifications.newPatients ? 'bg-primary shadow-primary/30' : 'bg-slate-200 dark:bg-slate-800'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all duration-500 ease-in-out shadow-md ${settings.notifications.newPatients ? 'translate-x-6 scale-110' : 'translate-x-1'}`} />
                </button>
              </div>

              {/* Language */}
              <div className="bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 p-4 flex items-center justify-between shadow-sm transition-all hover:bg-slate-100 dark:hover:bg-white/10">
                <div className="flex items-center gap-4">
                  <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 dark:text-blue-400">
                    <Globe className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">Locale</span>
                </div>
                <select
                  value={settings.language}
                  onChange={(e) => handleSettingChange('language', null, e.target.value)}
                  className="bg-transparent text-xs font-bold text-primary focus:outline-none cursor-pointer"
                >
                  <option value="en" className="dark:bg-[#1a1a1a]">English</option>
                  <option value="es" className="dark:bg-[#1a1a1a]">Español</option>
                  <option value="fr" className="dark:bg-[#1a1a1a]">Français</option>
                </select>
              </div>
            </div>

            <div className="mt-10 mb-2">
              <h1 className="text-slate-900 dark:text-white font-black text-2xl tracking-tight leading-tight">Advanced Settings</h1>
              <p className="text-slate-500 dark:text-gray-400 mt-1 font-bold text-xs uppercase tracking-widest pl-0.5">
                Configure your account preferences
              </p>
            </div>

            {/* Category Cards */}
            <div className="grid gap-4 mt-6 w-full pb-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setView('detail');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full text-left bg-white dark:bg-white/5 p-5 rounded-2xl border border-slate-200 dark:border-white/10 flex items-center justify-between group hover:bg-slate-100 dark:hover:bg-white/10 hover:border-slate-300 dark:hover:border-white/20 transition-all duration-300 transform hover:-translate-y-[2px] active:scale-[0.99] shadow-sm"
                >
                  <div className="flex items-center gap-5">
                    <div className={`h-12 w-12 rounded-xl ${tab.color.split(' ').filter(c => c.includes('/') || c.includes('bg-')).join(' ')} flex items-center justify-center p-3.5 transition-all group-hover:scale-110 shadow-sm`}>
                      <tab.icon className={`h-full w-full ${tab.color.split(' ').filter(c => c.includes('text-')).join(' ')}`} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1.5">
                        {tab.name}
                      </h3>
                      <p className="text-[13px] text-slate-500 dark:text-gray-400 font-bold tracking-tight">
                        {tab.desc}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-primary transition-all group-hover:translate-x-[4px] stroke-[4]" />
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
                className="h-11 w-11 flex items-center justify-center rounded-2xl bg-white/70 dark:bg-white/5 text-slate-900 dark:text-white shadow-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 transition-all active:scale-90"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                  {tabs.find(t => t.id === activeTab)?.name}
                </h1>
                <p className="text-slate-500 dark:text-gray-400 font-bold text-xs uppercase tracking-widest mt-1.5 pl-0.5">
                  {tabs.find(t => t.id === activeTab)?.desc}
                </p>
              </div>
            </div>

            <div className="bg-transparent space-y-4">
              {/* Tab Content Rendering */}
              <div className="w-full">
                {/* Notifications Tab */}
                {activeTab === 'notifications' && (
                  <div className="animate-in fade-in duration-500 space-y-4">
                    <div className="space-y-4">
                      {Object.entries(settings.notifications).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between p-5 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm transition-all hover:bg-slate-100 dark:hover:bg-white/10">
                          <div className="flex-1 pr-8">
                            <h4 className="text-sm font-black text-slate-900 dark:text-white capitalize">
                              {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-gray-400 font-bold mt-1">
                              {key === 'newPatients' && 'Get notified when new patients are added'}
                              {key === 'appointmentReminders' && 'Receive reminders for upcoming appointments'}
                              {key === 'labResults' && 'Notifications for new lab results'}
                              {key === 'medicationUpdates' && 'Updates about medication changes'}
                              {key === 'emergencyAlerts' && 'Critical emergency notifications'}
                            </p>
                          </div>
                          <button
                            onClick={() => handleSettingChange('notifications', key, !value)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-500 ease-in-out ${value ? 'bg-primary shadow-primary/30' : 'bg-slate-200 dark:bg-slate-800'}`}
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
                  <div className="animate-in fade-in duration-500 space-y-4">
                    <div className="space-y-4">
                      {Object.entries(settings.privacy).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between p-5 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm transition-all hover:bg-slate-100 dark:hover:bg-white/10">
                          <div className="flex-1 pr-8">
                            <h5 className="text-sm font-black text-slate-900 dark:text-white capitalize">
                              {key === 'dataSharing' && 'Medical Research Data'}
                              {key === 'analytics' && 'Application Usage Analytics'}
                              {key === 'marketing' && 'Professional Communications'}
                              {key === 'thirdParty' && 'External Integrations'}
                            </h5>
                            <p className="text-xs text-slate-500 dark:text-gray-400 font-bold mt-1">
                              {key === 'dataSharing' && 'Share anonymized data for clinical research'}
                              {key === 'analytics' && 'Help us improve by sharing usage statistics'}
                              {key === 'marketing' && 'Updates about new features and medical resources'}
                              {key === 'thirdParty' && 'Allow syncing with external healthcare systems'}
                            </p>
                          </div>
                          <button
                            onClick={() => handleSettingChange('privacy', key, !value)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-500 ease-in-out ${value ? 'bg-primary shadow-primary/30' : 'bg-slate-200 dark:bg-slate-800'}`}
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
                  <div className="animate-in fade-in duration-500 space-y-4">
                    <div className="space-y-4">
                      {passwordInfo && (
                        <div className={`p-5 rounded-2xl border flex items-start gap-3 shadow-sm ${passwordInfo.isExpired
                          ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20'
                          : 'bg-white/70 dark:bg-white/5 border-slate-200 dark:border-white/10'
                          }`}>
                          <Shield className={`h-5 w-5 mt-0.5 ${passwordInfo.isExpired ? 'text-red-500 dark:text-red-400' : 'text-primary'}`} />
                          <div>
                            <h4 className="text-sm font-black text-slate-900 dark:text-white">Password Status</h4>
                            <p className="text-xs text-slate-500 dark:text-gray-400 font-bold mt-1">
                              {passwordInfo.isExpired
                                ? '⚠️ Your password has expired. Please update it now.'
                                : `Expires in ${passwordInfo.daysUntilExpiry} days.`}
                            </p>
                          </div>
                        </div>
                      )}

                      {Object.entries(settings.security).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between p-5 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm transition-all hover:bg-slate-100 dark:hover:bg-white/10">
                          <div>
                            <h5 className="text-sm font-black text-slate-900 dark:text-white capitalize">
                              {key === 'twoFactorAuth' && 'Two-Factor Authentication'}
                              {key === 'sessionTimeout' && 'Auto Logout Duration'}
                              {key === 'passwordExpiry' && 'Password Expiry Cycle'}
                              {key === 'loginNotifications' && 'Login Attempt Alerts'}
                            </h5>
                            <p className="text-xs text-slate-500 dark:text-gray-400 font-bold mt-1">
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
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-500 ease-in-out ${value ? 'bg-primary shadow-primary/30' : 'bg-slate-200 dark:bg-slate-800'}`}
                            >
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all duration-500 ease-in-out shadow-md ${value ? 'translate-x-6 scale-110' : 'translate-x-1'}`} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between p-5 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                        <div>
                          <h5 className="text-sm font-black text-slate-900 dark:text-white">Profile Visibility</h5>
                          <p className="text-xs text-slate-500 dark:text-gray-400 font-bold mt-1">Turn off your profile to hide from search results.</p>
                        </div>
                        <button
                          onClick={() => handlePreferenceChange('isActive', !settings.isActive)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-500 ease-in-out ${settings.isActive ? 'bg-primary shadow-primary/30' : 'bg-slate-200 dark:bg-slate-800'}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all duration-500 ease-in-out shadow-md ${settings.isActive ? 'translate-x-6 scale-110' : 'translate-x-1'}`} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-8">
                      <div className="flex items-center justify-between mb-4 px-1">
                        <h5 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest text-[11px]">Active Devices</h5>
                        <button
                          type="button"
                          onClick={logoutAllDevices}
                          className="text-[11px] font-black text-red-600 hover:text-red-700 uppercase tracking-widest"
                        >
                          Logout All Devices
                        </button>
                      </div>
                      {sessionLoading ? (
                        <p className="text-xs text-slate-500 font-bold p-4">Loading device sessions...</p>
                      ) : (
                        <div className="space-y-3">
                          {deviceSessions.length === 0 ? (
                            <p className="text-xs text-slate-500 font-bold p-4">No active device sessions found.</p>
                          ) : deviceSessions.map((session) => (
                            <div key={session.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/[0.02] shadow-sm">
                              <div className="min-w-0">
                                <p className="text-xs font-black text-slate-800 dark:text-slate-200 truncate pr-4">
                                  {session.deviceInfo || session.userAgent || 'Unknown device'}
                                </p>
                                <p className="text-[10px] text-slate-500 font-bold truncate mt-0.5">
                                  IP: {session.ipAddress || 'N/A'} • Last active: {session.lastActiveAt ? new Date(session.lastActiveAt).toLocaleString() : 'N/A'}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => logoutSessionDevice(session.id)}
                                className="px-3 py-1.5 bg-red-50 dark:bg-red-500/10 text-[10px] font-black text-red-600 uppercase tracking-widest rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-all"
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
                  <div className="animate-in fade-in duration-500 space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-5 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm transition-all hover:bg-slate-100 dark:hover:bg-white/10">
                        <div>
                          <h4 className="text-sm font-black text-slate-900 dark:text-white">Language</h4>
                          <p className="text-xs text-slate-500 dark:text-gray-400 font-bold mt-1">System primary language</p>
                        </div>
                        <select
                          value={settings.language}
                          onChange={(e) => handleLanguageChange(e.target.value)}
                          className="px-4 py-2 bg-slate-100 dark:bg-white/5 border-none rounded-xl text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer text-right min-w-[140px]"
                        >
                          {languageMeta.map((lang) => (
                            <option key={lang.id} value={lang.id} className="dark:bg-[#1a1a1a]">{lang.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center justify-between p-5 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm transition-all hover:bg-slate-100 dark:hover:bg-white/10">
                        <div>
                          <h4 className="text-sm font-black text-slate-900 dark:text-white">Timezone</h4>
                          <p className="text-xs text-slate-500 dark:text-gray-400 font-bold mt-1">Primary business timezone</p>
                        </div>
                        <select
                          value={settings.timezone}
                          onChange={(e) => handlePreferenceChange('timezone', e.target.value)}
                          className="px-4 py-2 bg-slate-100 dark:bg-white/5 border-none rounded-xl text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer text-right min-w-[140px]"
                        >
                          {availableTimezones.map((tz) => (
                            <option key={tz.value} value={tz.value} className="dark:bg-[#1a1a1a]">{tz.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'compliance' && (
                  <div className="animate-in fade-in duration-500 space-y-4">
                    <div className="p-5 rounded-2xl border bg-white/70 dark:bg-white/5 border-slate-200 dark:border-white/10 shadow-lg transition-all hover:bg-slate-100 dark:hover:bg-white/10">
                      <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest text-[11px] mb-3">Security Features</h4>
                      <ul className="mt-2 space-y-3 text-xs text-slate-500 dark:text-gray-400">
                        <li className="flex items-start gap-3">
                          <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                          <span className="font-bold">JWT access + refresh token flow with rotation and revocation checks.</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                          <span className="font-bold">Role-based access control for admin and privileged API routes.</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                          <span className="font-bold">Schema validation and route throttling for auth, uploads, and AI APIs.</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                          <span className="font-bold">Field-level encryption at rest for sensitive medical notes and PII fields.</span>
                        </li>
                      </ul>
                    </div>

                    <div className="p-5 rounded-2xl border bg-white/70 dark:bg-white/5 border-slate-200 dark:border-white/10 shadow-lg">
                      <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest text-[11px] mb-2">Compliance Standards</h4>
                      <p className="mt-2 text-xs text-slate-500 dark:text-gray-400 font-bold leading-relaxed">
                        The platform follows HIPAA-inspired safeguards (data protection, access control, audit readiness), includes admin audit logging, and implements controls aligned to OWASP Top 10 risks.
                      </p>
                    </div>

                    <div className="p-5 rounded-2xl border bg-white/70 dark:bg-white/5 border-slate-200 dark:border-white/10 shadow-lg">
                      <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest text-[11px] mb-4">Final Security Score</h4>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 h-3 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden shadow-inner">
                          <div className="h-full bg-primary w-[77%]" />
                        </div>
                        <span className="text-[13px] font-black text-primary">7.7 / 10</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl border bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20">
                      <h4 className="text-xs font-black text-amber-800 dark:text-amber-300 uppercase tracking-widest mb-1.5">Legal Disclaimer</h4>
                      <p className="text-[11px] text-amber-700/90 dark:text-amber-200/90 font-bold leading-relaxed">
                        This system follows best practices inspired by HIPAA but is not officially certified. All medical data is handled with maximum privacy precautions.
                      </p>
                    </div>
                  </div>
                )}

                {/* Appearance Tab */}
                {activeTab === 'appearance' && (
                  <div className="space-y-8 animate-in fade-in duration-500">
                    {/* Mode Preference */}
                    <section>
                      <div className="pb-4 px-1">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest text-[11px]">Display Mode</h4>
                        <p className="text-xs text-slate-500 dark:text-gray-400 font-bold mt-1">Select your preferred interface style.</p>
                      </div>
                      <div className="bg-white dark:bg-white/5 p-2 rounded-2xl flex gap-1 border border-slate-200 dark:border-white/10 shadow-sm">
                        {[
                          { id: 'light', name: 'Light', icon: Sun },
                          { id: 'dark', name: 'Dark', icon: Moon },
                          { id: 'auto', name: 'System', icon: Monitor }
                        ].map((t) => (
                          <button
                            key={t.id}
                            onClick={() => {
                              if (t.id === 'auto') {
                                const systemPrefersDark =
                                  typeof window !== 'undefined' &&
                                  typeof window.matchMedia === 'function' &&
                                  window.matchMedia('(prefers-color-scheme: dark)').matches;
                                handleThemeSelect(systemPrefersDark ? 'dark' : 'light');
                              } else {
                                handleThemeSelect(t.id);
                              }
                            }}
                            className={`flex-1 flex items-center justify-center gap-2.5 py-4 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all ${draftTheme === t.id
                              ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]'
                              : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                              }`}
                          >
                            <t.icon className="h-4 w-4" />
                            {t.name}
                          </button>
                        ))}
                      </div>
                    </section>

                    {/* Theme & Colors */}
                    <section>
                      <div className="pb-4 px-1">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest text-[11px]">Theme Accent</h4>
                        <p className="text-xs text-slate-500 dark:text-gray-400 font-bold mt-1">Choose a primary color for your workspace.</p>
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
                            className={`group h-14 rounded-2xl border-4 transition-all duration-300 flex items-center justify-center relative shadow-lg ${draftColorTheme === t.id ? 'border-primary scale-[1.05] ring-4 ring-primary/20' : 'border-white/10 dark:border-white/5 hover:border-white/30 hover:scale-[1.02]'}`}
                            style={{ backgroundColor: t.color }}
                            title={t.name}
                          >
                            {draftColorTheme === t.id && (
                              <div className="bg-white rounded-full p-1.5 shadow-2xl animate-in zoom-in duration-300">
                                <Check className="text-primary h-3.5 w-3.5 stroke-[4]" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>

                      {/* Mixed Theme Creator */}
                      <div className="mt-8 border-t border-slate-200 dark:border-white/10 pt-8">
                        <div className="pb-4 px-1">
                          <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest text-[11px]">Mixed Theme Creator</h4>
                          <p className="text-xs text-slate-500 dark:text-gray-400 font-bold mt-1">Design a unique dual-tone workspace gradient.</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-center bg-white dark:bg-white/5 p-6 rounded-[2rem] border border-slate-200 dark:border-white/10 shadow-sm">
                          <div className="space-y-6">
                            <div className="flex gap-4">
                              <div className="flex-1 space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Primary Color</label>
                                <div className="relative group">
                                  <button
                                    onClick={() => document.getElementById('mixed-a').click()}
                                    className="w-full h-12 rounded-xl border border-slate-200 dark:border-white/10 flex items-center justify-between px-4 bg-white/50 dark:bg-white/5 transition-all hover:border-primary"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="h-6 w-6 rounded-lg shadow-sm border border-white/20" style={{ backgroundColor: mixedColorA }} />
                                      <span className="text-[11px] font-black text-slate-700 dark:text-gray-300 uppercase tracking-wider">{mixedColorA}</span>
                                    </div>
                                    <Plus className="h-4 w-4 text-slate-400" />
                                  </button>
                                  <input id="mixed-a" type="color" value={mixedColorA} className="absolute inset-0 opacity-0 w-0 h-0" onChange={(e) => { setMixedColorA(e.target.value); setDraftColorTheme('custom'); setHasChanges(true); }} />
                                </div>
                              </div>
                              <div className="flex-1 space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Secondary Color</label>
                                <div className="relative group">
                                  <button
                                    onClick={() => document.getElementById('mixed-b').click()}
                                    className="w-full h-12 rounded-xl border border-slate-200 dark:border-white/10 flex items-center justify-between px-4 bg-white/50 dark:bg-white/5 transition-all hover:border-primary"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="h-6 w-6 rounded-lg shadow-sm border border-white/20" style={{ backgroundColor: mixedColorB }} />
                                      <span className="text-[11px] font-black text-slate-700 dark:text-gray-300 uppercase tracking-wider">{mixedColorB}</span>
                                    </div>
                                    <Plus className="h-4 w-4 text-slate-400" />
                                  </button>
                                  <input id="mixed-b" type="color" value={mixedColorB} className="absolute inset-0 opacity-0 w-0 h-0" onChange={(e) => { setMixedColorB(e.target.value); setDraftColorTheme('custom'); setHasChanges(true); }} />
                                </div>
                              </div>
                            </div>
                            <div className="space-y-4 pt-2">
                              <div className="flex justify-between items-center px-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Gradient Sharpness</label>
                                <span className="text-[12px] font-black text-primary">{gradientIntensity}%</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={gradientIntensity}
                                onChange={(e) => { setGradientIntensity(parseInt(e.target.value)); setDraftColorTheme('custom'); setHasChanges(true); }}
                                className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-full appearance-none cursor-pointer accent-primary"
                              />
                            </div>
                          </div>
                          <div className="h-[160px] rounded-[1.5rem] border border-slate-200 dark:border-white/10 p-2 bg-slate-100/50 dark:bg-black/20 shadow-inner">
                            <div className="h-full w-full rounded-[1.2rem] shadow-2xl flex items-center justify-center relative overflow-hidden"
                              style={{ background: `linear-gradient(135deg, ${mixedColorA} 0%, ${mixedColorB} ${gradientIntensity}%)` }}>
                              <div className="absolute inset-0 bg-white/10 dark:bg-black/10 backdrop-blur-[1px]" />
                              <span className="text-white text-[10px] font-black uppercase tracking-[0.4em] drop-shadow-2xl z-10 text-center px-4">Workspace Preview</span>
                              <div className="absolute bottom-4 right-4 h-8 w-8 rounded-full bg-white/20 blur-xl animate-pulse" />
                              <div className="absolute top-4 left-4 h-6 w-6 rounded-full bg-black/20 blur-xl animate-pulse delay-700" />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-8 flex items-center justify-between border-t border-slate-200 dark:border-white/10 pt-8 pl-1">
                        <div className="relative">
                          <button
                            onClick={() => document.getElementById('custom-color-picker').click()}
                            className="flex items-center gap-2.5 px-6 py-3 rounded-2xl border-2 border-dashed border-slate-300 dark:border-white/10 text-slate-500 hover:border-primary hover:text-primary transition-all font-black text-[11px] uppercase tracking-widest bg-white/50 dark:bg-white/5"
                          >
                            <Plus className="h-4 w-4" />
                            Define Custom Color
                          </button>
                          <input
                            id="custom-color-picker"
                            type="color"
                            className="absolute inset-0 opacity-0 w-0 h-0"
                            onChange={(e) => {
                              const col = e.target.value;
                              setCustomColors({ primary: col, secondary: col, light: col + '15', gradient: col });
                              setDraftColorTheme('custom');
                              setHasChanges(true);
                            }}
                          />
                        </div>

                        <button
                          onClick={() => {
                            setDraftColorTheme('default');
                            handleThemeSelect('light');
                            setHasChanges(true);
                          }}
                          className="text-[11px] font-black text-slate-400 hover:text-primary uppercase tracking-widest transition-colors px-4 py-2 border border-slate-200 dark:border-white/10 rounded-xl"
                        >
                          Restore Defaults
                        </button>
                      </div>
                    </section>

                    {/* Theme Preview */}
                    <section className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[20px] p-6 lg:p-8 shadow-sm overflow-hidden relative">
                      <h4 className="text-[10px] font-black text-slate-500 dark:text-gray-400 uppercase tracking-[0.2em] mb-8">System Identity Preview</h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                        {/* Elements Preview */}
                        <div className="space-y-8">
                          <div className="space-y-4">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Primary Interaction</p>
                            <div className="flex flex-wrap gap-4 items-center">
                              <button className="h-10 px-8 text-white text-[11px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform" style={{ background: "var(--primary-gradient)" }}>Primary Action</button>
                              <button
                                onClick={() => setSuccess('Secondary preview triggered!')}
                                className="h-10 px-6 bg-secondary text-white text-[11px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-secondary/20 transition-all hover:bg-secondary/90 hover:scale-[1.02]"
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
                              <div className="px-4 py-3 rounded-lg flex items-center justify-between" style={{ background: "var(--primary-gradient)", opacity: 0.2 }}>

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
                                {[1, 2, 3].map(i => (
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
        <div className="mt-12 mb-12 flex justify-end">
          <button
            onClick={handleSave}
            disabled={loading}
            className={`inline-flex items-center gap-3 px-8 py-4 text-[11px] font-black uppercase tracking-widest rounded-[20px] shadow-2xl transition-all duration-300 transform group ${hasChanges
                ? 'bg-slate-900 dark:bg-white text-white dark:text-black hover:translate-y-[-4px] hover:shadow-primary/30 active:translate-y-0 ring-4 ring-primary/20'
                : 'bg-slate-100 dark:bg-white/5 text-slate-400 cursor-not-allowed border border-slate-200 dark:border-white/10'
              }`}
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className={`h-4 w-4 ${hasChanges ? 'animate-pulse' : ''}`} />}
            {hasChanges ? 'Deploy Settings' : 'Configuration Sync'}
          </button>
        </div>
      </div>
    </main>
  );
}

export default Settings;
