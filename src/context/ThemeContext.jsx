import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

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

const THEME_TRANSITION_CLASS = 'theme-transitioning';
const THEME_TRANSITION_MS = 80;

const normalizeColor = (value, fallback) => {
  const color = String(value || '').trim();
  return color || fallback;
};

const toRgbChannels = (color, fallback = '16 185 129') => {
  const normalized = String(color || '').trim();
  if (!normalized) return fallback;

  const hex = normalized.startsWith('#') ? normalized.slice(1) : normalized;
  if (/^[\da-fA-F]{3}$/.test(hex)) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    return `${r} ${g} ${b}`;
  }
  if (/^[\da-fA-F]{6}$/.test(hex)) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `${r} ${g} ${b}`;
  }

  const rgbMatch = normalized.match(/rgba?\(([^)]+)\)/i);
  if (rgbMatch?.[1]) {
    const channels = rgbMatch[1]
      .split(',')
      .map((part) => part.trim())
      .slice(0, 3)
      .map((part) => Number.parseInt(part, 10))
      .filter((value) => Number.isFinite(value));
    if (channels.length === 3) {
      return `${channels[0]} ${channels[1]} ${channels[2]}`;
    }
  }

  return fallback;
};

const buildPrimaryGradient = (primary, secondary) => {
  const first = normalizeColor(primary, '#10B981');
  const second = normalizeColor(secondary, first);
  if (first.toLowerCase() === second.toLowerCase()) return first;
  return `linear-gradient(135deg, ${first} 0%, ${second} 100%)`;
};

// Theme color definitions
export const COLOR_THEMES = {
  saffron: {
    primary: '#FFAE42',
    secondary: '#F97316',
    light: '#FFF8F0',
    gradient: 'linear-gradient(135deg, #FFAE42 0%, #F97316 100%)',
  },
  purple: {
    primary: '#9333EA',
    secondary: '#7E22CE',
    light: '#F5F3FF',
    gradient: 'linear-gradient(135deg, #9333EA 0%, #7E22CE 100%)',
  },
  green: {
    primary: '#10B981',
    secondary: '#059669',
    light: '#ECFDF5',
    gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
  },
  cyan: {
    primary: '#06B6D4',
    secondary: '#0891B2',
    light: '#ECFEFF',
    gradient: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
  },
  'blue-purple': {
    primary: '#3B82F6',
    secondary: '#8B5CF6',
    light: '#EFF6FF',
    gradient: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
  },
  'green-teal': {
    primary: '#10B981',
    secondary: '#14B8A6',
    light: '#F0FDF4',
    gradient: 'linear-gradient(135deg, #10B981 0%, #14B8A6 100%)',
  },
  'orange-red': {
    primary: '#F97316',
    secondary: '#EF4444',
    light: '#FFF7ED',
    gradient: 'linear-gradient(135deg, #F97316 0%, #EF4444 100%)',
  },
  'indigo-blue': {
    primary: '#4F46E5',
    secondary: '#3B82F6',
    light: '#EEF2FF',
    gradient: 'linear-gradient(135deg, #4F46E5 0%, #3B82F6 100%)',
  },
  'sunset-wave': {
    primary: '#FF4D4D',
    secondary: '#F97316',
    light: '#FFF5F5',
    gradient: 'linear-gradient(135deg, #FF4D4D 0%, #F97316 100%)',
  },
  'midnight-neon': {
    primary: '#8B5CF6',
    secondary: '#3B82F6',
    light: '#F5F3FF',
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%)',
  }
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
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
  const themeTransitionTimeoutRef = useRef(null);

  const isDark = theme === 'dark';
  const startThemeTransition = useCallback(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.classList.add(THEME_TRANSITION_CLASS);
    if (themeTransitionTimeoutRef.current) {
      window.clearTimeout(themeTransitionTimeoutRef.current);
    }
    themeTransitionTimeoutRef.current = window.setTimeout(() => {
      root.classList.remove(THEME_TRANSITION_CLASS);
      themeTransitionTimeoutRef.current = null;
    }, THEME_TRANSITION_MS);
  }, []);

  const setTheme = useCallback((nextThemeOrUpdater) => {
    setThemeState((prevTheme) => {
      const candidateTheme =
        typeof nextThemeOrUpdater === 'function'
          ? nextThemeOrUpdater(prevTheme)
          : nextThemeOrUpdater;
      const resolvedTheme =
        candidateTheme === 'light' || candidateTheme === 'dark'
          ? candidateTheme
          : prevTheme;

      if (resolvedTheme !== prevTheme) {
        startThemeTransition();
      }

      return resolvedTheme;
    });
  }, [startThemeTransition]);

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
      const primary = '#10B981';
      const secondary = '#059669';
      root.style.setProperty('--primary-color', primary);
      root.style.setProperty('--secondary-color', secondary);
      root.style.setProperty('--primary-light', '#ECFDF5');
      root.style.setProperty('--primary-gradient', buildPrimaryGradient(primary, secondary));
      root.style.setProperty('--primary-rgb', toRgbChannels(primary));
      root.style.setProperty('--secondary-rgb', toRgbChannels(secondary, toRgbChannels(primary)));
    } else if (colorTheme === 'custom' && customColors.primary) {
      const primary = normalizeColor(customColors.primary, '#10B981');
      const secondary = normalizeColor(customColors.secondary, primary);
      root.style.setProperty('--primary-color', primary);
      root.style.setProperty('--secondary-color', secondary);
      root.style.setProperty('--primary-light', customColors.light || `${primary}15`);
      root.style.setProperty('--primary-gradient', customColors.gradient || buildPrimaryGradient(primary, secondary));
      root.style.setProperty('--primary-rgb', toRgbChannels(primary));
      root.style.setProperty('--secondary-rgb', toRgbChannels(secondary, toRgbChannels(primary)));
    } else {
      const config = COLOR_THEMES[colorTheme];
      if (config) {
        const primary = normalizeColor(config.primary, '#10B981');
        const secondary = normalizeColor(config.secondary, primary);
        root.style.setProperty('--primary-color', primary);
        root.style.setProperty('--secondary-color', secondary);
        root.style.setProperty('--primary-light', config.light);
        root.style.setProperty('--primary-gradient', config.gradient || buildPrimaryGradient(primary, secondary));
        root.style.setProperty('--primary-rgb', toRgbChannels(primary));
        root.style.setProperty('--secondary-rgb', toRgbChannels(secondary, toRgbChannels(primary)));
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
  }, [setTheme]);

  useEffect(() => {
    return () => {
      if (themeTransitionTimeoutRef.current) {
        window.clearTimeout(themeTransitionTimeoutRef.current);
      }
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove(THEME_TRANSITION_CLASS);
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
  }), [theme, setTheme, toggleTheme, isDark, colorTheme, themeStyle, customColors]);

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
