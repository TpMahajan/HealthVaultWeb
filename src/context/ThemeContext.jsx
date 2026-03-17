import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext({
  theme: 'light', // 'light' | 'dark'
  setTheme: () => {},
  toggleTheme: () => {},
  isDark: false,
  colorTheme: 'indigo',
  setColorTheme: () => {},
  themeStyle: 'web',
  setThemeStyle: () => {},
  customColors: {},
  setCustomColors: () => {},
});

const getSystemPrefersDark = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
};

// Theme color definitions
export const COLOR_THEMES = {
  saffron: {
    primary: '#FFAE42',
    light: '#FFF8F0',
    gradient: 'linear-gradient(135deg, #FFAE42 0%, #F97316 100%)',
  },
  purple: {
    primary: '#9333EA',
    light: '#F5F3FF',
    gradient: 'linear-gradient(135deg, #9333EA 0%, #7E22CE 100%)',
  },
  green: {
    primary: '#10B981',
    light: '#ECFDF5',
    gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
  },
  cyan: {
    primary: '#06B6D4',
    light: '#ECFEFF',
    gradient: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
  },
  'blue-purple': {
    primary: '#3B82F6',
    light: '#EFF6FF',
    gradient: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
  },
  'green-teal': {
    primary: '#10B981',
    light: '#F0FDF4',
    gradient: 'linear-gradient(135deg, #10B981 0%, #14B8A6 100%)',
  },
  'orange-red': {
    primary: '#F97316',
    light: '#FFF7ED',
    gradient: 'linear-gradient(135deg, #F97316 0%, #EF4444 100%)',
  },
  'indigo-blue': {
    primary: '#4F46E5',
    light: '#EEF2FF',
    gradient: 'linear-gradient(135deg, #4F46E5 0%, #3B82F6 100%)',
  },
  'sunset-wave': {
    primary: '#FF4D4D',
    light: '#FFF5F5',
    gradient: 'linear-gradient(135deg, #FF4D4D 0%, #F97316 100%)',
  },
  'midnight-neon': {
    primary: '#8B5CF6',
    light: '#F5F3FF',
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%)',
  }
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    try {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme && ['light', 'dark'].includes(savedTheme)) {
        return savedTheme;
      }
      return getSystemPrefersDark() ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  const [colorTheme, setColorTheme] = useState(() => {
    try {
      return localStorage.getItem('medicalvault-theme') || 'default';
    } catch {
      return 'default';
    }
  });

  const [themeStyle, setThemeStyle] = useState(() => {
    try {
      return localStorage.getItem('medicalvault-style') || 'web';
    } catch {
      return 'web';
    }
  });

  const [customColors, setCustomColors] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('medicalvault-custom-colors')) || {};
    } catch {
      return {};
    }
  });

  const isDark = theme === 'dark';

  // Apply theme to <html> and CSS variables
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', isDark);

    try {
      localStorage.setItem('theme', theme);
    } catch { }

    // Apply Color Theme
    if (colorTheme === 'default') {
      // Default Medical Vault colors
      root.style.setProperty('--primary-color', '#10B981');
      root.style.setProperty('--primary-light', '#ECFDF5');
      root.style.setProperty('--primary-gradient', 'linear-gradient(135deg, #10B981 0%, #059669 100%)');
    } else if (colorTheme === 'custom' && customColors.primary) {
      root.style.setProperty('--primary-color', customColors.primary);
      root.style.setProperty('--primary-light', customColors.light || `${customColors.primary}15`);
      root.style.setProperty('--primary-gradient', customColors.gradient || customColors.primary);
    } else {
      const config = COLOR_THEMES[colorTheme];
      if (config) {
        root.style.setProperty('--primary-color', config.primary);
        root.style.setProperty('--primary-light', config.light);
        root.style.setProperty('--primary-gradient', config.gradient);
      }
    }

    try {
      localStorage.setItem('medicalvault-theme', colorTheme);
      localStorage.setItem('medicalvault-style', themeStyle);
      localStorage.setItem('medicalvault-custom-colors', JSON.stringify(customColors));
    } catch { }
  }, [theme, isDark, colorTheme, themeStyle, customColors]);

  // React to system theme changes
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const savedTheme = localStorage.getItem('theme');
      if (!savedTheme) {
        setTheme(media.matches ? 'dark' : 'light');
      }
    };

    if (media.addEventListener) {
      media.addEventListener('change', handler);
    } else {
      media.addListener(handler);
    }

    return () => {
      if (media.removeEventListener) {
        media.removeEventListener('change', handler);
      } else {
        media.removeListener(handler);
      }
    };
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const value = useMemo(() => ({ 
    theme, 
    setTheme, 
    toggleTheme, 
    isDark,
    colorTheme,
    setColorTheme,
    themeStyle,
    setThemeStyle,
    customColors,
    setCustomColors
  }), [theme, isDark, colorTheme, themeStyle, customColors]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
