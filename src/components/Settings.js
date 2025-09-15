import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Shield, 
  Palette, 
  Globe, 
  Save, 
  Moon,
  Sun,
  Monitor
} from 'lucide-react';
import { useTheme } from "../context/ThemeContext";
import Footer from './Footer';

function Settings() {
  const { theme, setTheme } = useTheme();
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
  }, [theme]);

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

  const handleSave = () => {
    console.log('Settings saved:', settings);
    alert("✅ Settings saved successfully!");
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

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto w-full flex-grow p-4">
        {/* Header */}
        <div className="mb-8">
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
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">General Preferences</h3>
                
                {/* Language Settings */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Language
                    </label>
                    <select
                      value={settings.language}
                      onChange={(e) => handlePreferenceChange('language', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="en">English</option>
                      <option value="es">Español</option>
                      <option value="fr">Français</option>
                      <option value="de">Deutsch</option>
                      <option value="it">Italiano</option>
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
                      <option value="America/New_York">Eastern Time (ET)</option>
                      <option value="America/Chicago">Central Time (CT)</option>
                      <option value="America/Denver">Mountain Time (MT)</option>
                      <option value="America/Los_Angeles">Pacific Time (PT)</option>
                      <option value="Europe/London">Greenwich Mean Time (GMT)</option>
                      <option value="Europe/Paris">Central European Time (CET)</option>
                      <option value="Asia/Tokyo">Japan Standard Time (JST)</option>
                    </select>
                  </div>
                </div>

                {/* Additional Preferences */}
                <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
                  <h4 className="text-md font-medium text-blue-900 dark:text-blue-100 mb-3">System Preferences</h4>
                  <div className="space-y-3 text-sm text-blue-800 dark:text-blue-200">
                    <div>
                      <strong>Auto-save:</strong> Changes are automatically saved every 30 seconds
                    </div>
                    <div>
                      <strong>Offline Mode:</strong> Continue working when internet connection is unstable
                    </div>
                    <div>
                      <strong>Keyboard Shortcuts:</strong> Use Ctrl+K to open command palette
                    </div>
                    <div>
                      <strong>Accessibility:</strong> High contrast mode and screen reader support available
                    </div>
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
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
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
