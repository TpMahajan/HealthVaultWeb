import React, { useState, useEffect } from 'react';
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
  CheckCircle
} from 'lucide-react';
import { useTheme } from "../context/ThemeContext";
import Footer from './Footer';

function Settings() {
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [passwordInfo, setPasswordInfo] = useState(null);
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
    timezone: 'America/New_York'
  });

  const [activeTab, setActiveTab] = useState('notifications');

  useEffect(() => {
    setSettings(prev => ({
      ...prev,
      appearance: {
        ...prev.appearance,
        theme,
      }
    }));
  }, [theme, setTheme]);

  // Load security settings from backend
  const loadSecuritySettings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Try hosted backend first, then fallback to localhost
      const baseUrls = [
        'https://healthvault-backend-c6xl.onrender.com',
        'http://localhost:5000'
      ];
      
      let response;
      
      for (const baseUrl of baseUrls) {
        try {
          response = await fetch(`${baseUrl}/api/doctors/security-settings`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          // If we get a response, break the loop
          if (response) break;
        } catch (err) {
          console.log(`Failed to connect to ${baseUrl}:`, err.message);
          continue;
        }
      }

      if (!response) {
        console.error('Unable to connect to any backend server');
        return;
      }

      const data = await response.json();
      if (data.success) {
        setSettings(prev => ({
          ...prev,
          security: data.securitySettings
        }));
        setPasswordInfo(data.passwordInfo);
      } else {
        console.error('Failed to load security settings:', data.message);
      }
    } catch (err) {
      console.error('Failed to load security settings:', err);
    }
  };

  // Test backend connection
  const testBackendConnection = async () => {
    const baseUrls = [
      'https://healthvault-backend-c6xl.onrender.com',
      'http://localhost:5000'
    ];
    
    for (const baseUrl of baseUrls) {
      try {
        const response = await fetch(`${baseUrl}/api/doctors/profile`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          console.log(`✅ Backend connected: ${baseUrl}`);
          return baseUrl;
        }
      } catch (err) {
        console.log(`❌ Backend failed: ${baseUrl} - ${err.message}`);
      }
    }
    
    console.log('❌ No backend servers are accessible');
    return null;
  };

  // Load settings on component mount
  useEffect(() => {
    const loadDoctorPreferences = async (baseUrl) => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch(`${baseUrl}/api/doctors/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        const data = await res.json();
        if (res.ok && data.success && data.doctor) {
          const prefs = data.doctor.preferences || {};
          setSettings(prev => ({
            ...prev,
            language: prefs.language || prev.language,
            timezone: prefs.timezone || prev.timezone,
            appearance: { ...prev.appearance, theme: prefs.theme || prev.appearance.theme }
          }));
          if (prefs.theme) setTheme(prefs.theme);
          try {
            localStorage.setItem('doctorPreferences', JSON.stringify({
              language: prefs.language || settings.language,
              timezone: prefs.timezone || settings.timezone,
              theme: prefs.theme || settings.appearance.theme,
            }));
          } catch {}
        }
      } catch {}
    };

    const initializeSettings = async () => {
      // Load cached preferences immediately for better UX
      try {
        const cached = JSON.parse(localStorage.getItem('doctorPreferences') || '{}');
        if (cached && (cached.language || cached.timezone || cached.theme)) {
          setSettings(prev => ({
            ...prev,
            language: cached.language || prev.language,
            timezone: cached.timezone || prev.timezone,
            appearance: { ...prev.appearance, theme: cached.theme || prev.appearance.theme }
          }));
          if (cached.theme) setTheme(cached.theme);
        }
      } catch {}

      const workingBackend = await testBackendConnection();
      if (workingBackend) {
        await loadSecuritySettings();
        await loadDoctorPreferences(workingBackend);
      } else {
        setError('Unable to connect to backend server. Please ensure the server is running.');
      }
    };
    
    initializeSettings();
  }, [setTheme, settings.language, settings.timezone, settings.appearance.theme]);

  const handleSettingChange = (category, setting, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: value
      }
    }));
  };

  const handlePreferenceChange = (setting, value) => {
    setSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login first to save settings');
        return;
      }

      // Try hosted backend first, then fallback to localhost
      const baseUrls = [
        'https://healthvault-backend-c6xl.onrender.com',
        'http://localhost:5000'
      ];
      
      let response;
      let lastError;
      
      for (const baseUrl of baseUrls) {
        try {
          response = await fetch(`${baseUrl}/api/doctors/security-settings`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings.security)
          });
          
          // If we get a response (even if error), break the loop
          break;
        } catch (err) {
          lastError = err;
          console.log(`Failed to connect to ${baseUrl}:`, err.message);
          continue;
        }
      }
      
      if (!response) {
        throw lastError || new Error('Unable to connect to backend server');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || `Server error: ${response.status} ${response.statusText}`);
        return;
      }

      const data = await response.json();
      if (data.success) {
        setSuccess('Security settings saved successfully!');
        setPasswordInfo(data.passwordInfo);
      } else {
        setError(data.message || 'Failed to save security settings');
      }

      // Save Preferences (language, timezone, theme)
      const saved = await saveDoctorPreferences();
      if (saved) {
        // also cache locally to survive offline
        try {
          localStorage.setItem('doctorPreferences', JSON.stringify({
            language: settings.language,
            timezone: settings.timezone,
            theme: settings.appearance.theme,
          }));
        } catch {}
        setSuccess('Settings saved successfully!');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      console.error('Save settings error:', err);
      setError('Unable to save settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // (moved inside useEffect)

  // Persist preferences to backend (PUT profile)
  const saveDoctorPreferences = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return false;
      const baseUrls = [
        'https://healthvault-backend-c6xl.onrender.com',
        'http://localhost:5000'
      ];
      let response;
      for (const base of baseUrls) {
        try {
          response = await fetch(`${base}/api/doctors/profile`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              preferences: {
                language: settings.language,
                timezone: settings.timezone,
                theme: settings.appearance.theme
              }
            })
          });
          if (response) break;
        } catch (e) {
          continue;
        }
      }
      if (!response) return false;
      const data = await response.json();
      return response.ok && data.success;
    } catch (e) {
      return false;
    }
  };

  const handleThemeSelect = (nextTheme) => {
    setTheme(nextTheme);
    handleSettingChange('appearance', 'theme', nextTheme);
  };

  const tabs = [
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'privacy', name: 'Privacy & Data', icon: Shield },
    { id: 'appearance', name: 'Appearance', icon: Palette },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'preferences', name: 'Preferences', icon: Globe }
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
      { value: 'UTC', label: 'UTC' }
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
    } catch {}
    // Fallback to a broad but finite set if Intl.supportedValuesOf is not available
    const fallbackTz = [
      'UTC','Europe/London','Europe/Paris','Europe/Berlin','Europe/Madrid','Europe/Rome','Europe/Moscow',
      'Africa/Cairo','Africa/Johannesburg','Africa/Nairobi',
      'Asia/Dubai','Asia/Jerusalem','Asia/Kolkata','Asia/Karachi','Asia/Dhaka','Asia/Bangkok','Asia/Jakarta',
      'Asia/Shanghai','Asia/Hong_Kong','Asia/Taipei','Asia/Tokyo','Asia/Seoul','Asia/Singapore',
      'Australia/Sydney','Australia/Perth','Pacific/Auckland',
      'America/St_Johns','America/Halifax','America/New_York','America/Chicago','America/Denver','America/Los_Angeles','America/Anchorage','Pacific/Honolulu',
      'America/Mexico_City','America/Bogota','America/Lima','America/Sao_Paulo','America/Argentina/Buenos_Aires'
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
    } catch {}
  }, [settings.language]);

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto w-full flex-grow px-4 pt-3 pb-6">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Customize your application preferences and account settings
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-800">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 flex items-center ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-700'
                  }`}
                >
                  <tab.icon className="h-4 w-4 mr-2" />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Notification Preferences</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                  Choose which notifications you'd like to receive
                </p>
                <div className="space-y-4">
                  {Object.entries(settings.notifications).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {key === 'newPatients' && 'Get notified when new patients are added'}
                          {key === 'appointmentReminders' && 'Receive reminders for upcoming appointments'}
                          {key === 'labResults' && 'Notifications for new lab results'}
                          {key === 'medicationUpdates' && 'Updates about medication changes'}
                          {key === 'emergencyAlerts' && 'Critical emergency notifications'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleSettingChange('notifications', key, !value)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                          value ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                            value ? 'translate-x-6' : 'translate-x-1'
                          }`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Privacy & Data Tab */}
            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Privacy & Data Protection</h3>
                
                {/* Privacy Controls */}
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">Data Sharing Controls</h4>
                  {Object.entries(settings.privacy).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <div>
                        <h5 className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                          {key === 'dataSharing' && 'Share anonymized data for research'}
                          {key === 'analytics' && 'Allow usage analytics'}
                          {key === 'marketing' && 'Receive marketing communications'}
                          {key === 'thirdParty' && 'Share data with third-party services'}
                        </h5>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {key === 'dataSharing' && 'Help improve healthcare by sharing anonymized patient data for medical research'}
                          {key === 'analytics' && 'Help us improve the application by sharing usage statistics'}
                          {key === 'marketing' && 'Receive updates about new features and healthcare resources'}
                          {key === 'thirdParty' && 'Allow integration with external healthcare platforms and services'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleSettingChange('privacy', key, !value)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                          value ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                            value ? 'translate-x-6' : 'translate-x-1'
                          }`} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Privacy Policy Information */}
                <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
                  <h4 className="text-md font-medium text-blue-900 dark:text-blue-100 mb-3">Privacy Policy Summary</h4>
                  <div className="space-y-3 text-sm text-blue-800 dark:text-blue-200">
                    <div>
                      <strong>Data Collection:</strong> We collect only necessary medical and administrative data required for patient care and system functionality.
                    </div>
                    <div>
                      <strong>Data Storage:</strong> All patient data is encrypted and stored securely in HIPAA-compliant servers with regular security audits.
                    </div>
                    <div>
                      <strong>Data Access:</strong> Only authorized medical professionals with proper credentials can access patient information.
                    </div>
                    <div>
                      <strong>Data Retention:</strong> Medical records are retained according to legal requirements and can be exported or deleted upon request.
                    </div>
                    <div>
                      <strong>Third-Party Sharing:</strong> Patient data is never sold or shared with third parties without explicit consent.
                    </div>
                  </div>
                </div>

                {/* Data Rights */}
                <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/30 rounded-xl border border-green-200 dark:border-green-800">
                  <h4 className="text-md font-medium text-green-900 dark:text-green-100 mb-3">Your Data Rights</h4>
                  <div className="space-y-2 text-sm text-green-800 dark:text-green-200">
                    <div>• <strong>Access:</strong> Request a copy of all your data</div>
                    <div>• <strong>Correction:</strong> Update or correct inaccurate information</div>
                    <div>• <strong>Deletion:</strong> Request deletion of your data (subject to legal requirements)</div>
                    <div>• <strong>Portability:</strong> Export your data in a standard format</div>
                    <div>• <strong>Restriction:</strong> Limit how your data is processed</div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-2">Privacy Questions?</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Contact our Data Protection Officer at: <strong>privacy@healthvault.com</strong>
                  </p>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Security Settings</h3>
                
                {/* Password Status */}
                {passwordInfo && (
                  <div className={`p-4 rounded-xl border ${
                    passwordInfo.isExpired 
                      ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' 
                      : passwordInfo.daysUntilExpiry <= 7 
                        ? 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800'
                        : 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
                  }`}>
                    <div className="flex items-center mb-2">
                      {passwordInfo.isExpired ? (
                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
                      )}
                      <h4 className={`text-md font-medium ${
                        passwordInfo.isExpired 
                          ? 'text-red-900 dark:text-red-100' 
                          : passwordInfo.daysUntilExpiry <= 7 
                            ? 'text-yellow-900 dark:text-yellow-100'
                            : 'text-green-900 dark:text-green-100'
                      }`}>
                        Password Status
                      </h4>
                    </div>
                    <div className={`text-sm ${
                      passwordInfo.isExpired 
                        ? 'text-red-800 dark:text-red-200' 
                        : passwordInfo.daysUntilExpiry <= 7 
                          ? 'text-yellow-800 dark:text-yellow-200'
                          : 'text-green-800 dark:text-green-200'
                    }`}>
                      {passwordInfo.isExpired ? (
                        <div>
                          <strong>⚠️ Password Expired!</strong> Please change your password immediately.
                        </div>
                      ) : passwordInfo.daysUntilExpiry <= 7 ? (
                        <div>
                          <strong>⚠️ Password expires in {passwordInfo.daysUntilExpiry} days.</strong> Consider changing it soon.
                        </div>
                      ) : (
                        <div>
                          <strong>✅ Password expires in {passwordInfo.daysUntilExpiry} days.</strong>
                        </div>
                      )}
                      <div className="mt-1">
                        Last changed: {new Date(passwordInfo.lastChanged).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Security Controls */}
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">Security Preferences</h4>
                  {Object.entries(settings.security).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <div>
                        <h5 className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                          {key === 'twoFactorAuth' && 'Two-Factor Authentication'}
                          {key === 'sessionTimeout' && 'Session Timeout'}
                          {key === 'passwordExpiry' && 'Password Expiry'}
                          {key === 'loginNotifications' && 'Login Notifications'}
                        </h5>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {key === 'twoFactorAuth' && 'Add an extra layer of security with 2FA'}
                          {key === 'sessionTimeout' && `${value} minutes of inactivity before automatic logout`}
                          {key === 'passwordExpiry' && `Password expires every ${value} days`}
                          {key === 'loginNotifications' && 'Get notified of new login attempts'}
                        </p>
                      </div>
                      {key === 'sessionTimeout' || key === 'passwordExpiry' ? (
                        <select
                          value={value}
                          onChange={(e) => handleSettingChange('security', key, parseInt(e.target.value))}
                          className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                        >
                          {key === 'sessionTimeout' ? (
                            <>
                              <option value={15}>15 minutes</option>
                              <option value={30}>30 minutes</option>
                              <option value={60}>1 hour</option>
                              <option value={120}>2 hours</option>
                            </>
                          ) : (
                            <>
                              <option value={30}>30 days</option>
                              <option value={60}>60 days</option>
                              <option value={90}>90 days</option>
                              <option value={180}>180 days</option>
                            </>
                          )}
                        </select>
                      ) : (
                        <button
                          onClick={() => handleSettingChange('security', key, !value)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                            value ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                              value ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Security Information */}
                <div className="mt-8 p-4 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-800">
                  <h4 className="text-md font-medium text-red-900 dark:text-red-100 mb-3">Security Measures</h4>
                  <div className="space-y-3 text-sm text-red-800 dark:text-red-200">
                    <div>
                      <strong>Encryption:</strong> All data is encrypted in transit (TLS 1.3) and at rest (AES-256).
                    </div>
                    <div>
                      <strong>Access Control:</strong> Role-based access with multi-factor authentication for sensitive operations.
                    </div>
                    <div>
                      <strong>Audit Logging:</strong> All system access and data modifications are logged and monitored.
                    </div>
                    <div>
                      <strong>Regular Updates:</strong> Security patches are applied immediately, and systems are regularly updated.
                    </div>
                    <div>
                      <strong>Backup & Recovery:</strong> Daily encrypted backups with tested disaster recovery procedures.
                    </div>
                  </div>
                </div>

                {/* Compliance Information */}
                <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-800">
                  <h4 className="text-md font-medium text-purple-900 dark:text-purple-100 mb-3">Compliance & Certifications</h4>
                  <div className="space-y-2 text-sm text-purple-800 dark:text-purple-200">
                    <div>• <strong>HIPAA Compliant:</strong> Meets all Health Insurance Portability and Accountability Act requirements</div>
                    <div>• <strong>SOC 2 Type II:</strong> Certified for security, availability, and confidentiality</div>
                    <div>• <strong>ISO 27001:</strong> Information security management system certified</div>
                    <div>• <strong>GDPR Compliant:</strong> European General Data Protection Regulation compliant</div>
                    <div>• <strong>Regular Audits:</strong> Third-party security audits conducted quarterly</div>
                  </div>
                </div>

                {/* Security Tips */}
                <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-950/30 rounded-xl border border-yellow-200 dark:border-yellow-800">
                  <h4 className="text-md font-medium text-yellow-900 dark:text-yellow-100 mb-3">Security Best Practices</h4>
                  <div className="space-y-2 text-sm text-yellow-800 dark:text-yellow-200">
                    <div>• Use strong, unique passwords and enable 2FA</div>
                    <div>• Log out when finished, especially on shared computers</div>
                    <div>• Report suspicious activity immediately</div>
                    <div>• Keep your devices updated with latest security patches</div>
                    <div>• Never share your login credentials with others</div>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-2">Security Incident?</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Report security concerns immediately: <strong>security@healthvault.com</strong>
                  </p>
                </div>
              </div>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Preferences</h3>

                {/* Language & Timezone (dynamic) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Language
                    </label>
                    <select
                      value={settings.language}
                      onChange={(e) => handleLanguageChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      {languageMeta.map((lang) => (
                        <option key={lang.id} value={lang.id}>{lang.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Timezone
                    </label>
                    <select
                      value={settings.timezone}
                      onChange={(e) => handlePreferenceChange('timezone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      {availableTimezones.map((tz) => (
                        <option key={tz.value} value={tz.value}>{tz.label}</option>
                      ))}
                    </select>
                    {availableTimezones.length === 0 && (
                      <p className="text-xs text-gray-500 mt-1">No timezones available for the selected language.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Appearance Settings</h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'light', name: 'Light', icon: Sun, active: settings.appearance.theme === 'light' },
                    { id: 'dark', name: 'Dark', icon: Moon, active: settings.appearance.theme === 'dark' },
                    { id: 'auto', name: 'Auto', icon: Monitor, active: settings.appearance.theme === 'auto' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleThemeSelect(t.id)}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                        t.active
                          ? 'border-blue-500 bg-blue-50 dark:border-blue-500/70 dark:bg-blue-950/30'
                          : 'border-gray-200 hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700'
                      }`}
                    >
                      <t.icon
                        className={`h-6 w-6 mx-auto mb-2 ${t.active ? 'text-blue-600' : 'text-gray-400 dark:text-gray-500'}`} />
                      <span
                        className={`text-sm font-medium ${t.active ? 'text-blue-600' : 'text-gray-700 dark:text-gray-200'}`}
                      >
                        {t.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 rounded-b-2xl">
            {/* Error/Success Messages */}
            {(error || success) && (
              <div className="mb-4">
                {error && (
                  <div className="flex items-center p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
                    <span className="text-red-800 dark:text-red-200 text-sm">{error}</span>
                  </div>
                )}
                {success && (
                  <div className="flex items-center p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
                    <span className="text-green-800 dark:text-green-200 text-sm">{success}</span>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={loading}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default Settings;
