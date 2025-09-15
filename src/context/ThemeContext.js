import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext({
  theme: 'light', // 'light' | 'dark'
  setTheme: () => {},
  toggleTheme: () => {},
  isDark: false,
});

const getSystemPrefersDark = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    try {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme && ['light', 'dark'].includes(savedTheme)) {
        return savedTheme;
      }
      // Default to system preference
      return getSystemPrefersDark() ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  const isDark = theme === 'dark';

  // Apply theme to <html>
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', isDark);

    try {
      localStorage.setItem('theme', theme);
    } catch {
      // ignore if storage not available
    }
  }, [theme, isDark]);

  // React to system theme changes
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      // Only update if no explicit theme is set
      const savedTheme = localStorage.getItem('theme');
      if (!savedTheme) {
        setTheme(media.matches ? 'dark' : 'light');
      }
    };

    if (media.addEventListener) {
      media.addEventListener('change', handler);
    } else {
      media.addListener(handler); // fallback for Safari
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
    isDark 
  }), [theme, isDark]);

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
