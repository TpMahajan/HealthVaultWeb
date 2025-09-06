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

// Footer Component
const Footer = () => (
  <footer className="w-full py-6 border-t border-gray-200 dark:border-gray-800 flex items-center justify-center mt-12">
    <img src="/AiAllyLogo.png" alt="Ai Ally Logo" className="h-6 mr-2" />
    <span className="text-sm text-gray-500 dark:text-gray-400">Powered by Ai Ally</span>
  </footer>
);

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
    <div className="min-h-screen flex flex-col justify-between">
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
