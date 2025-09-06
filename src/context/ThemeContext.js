import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext({
  theme: 'auto', // 'light' | 'dark' | 'auto'
  setTheme: () => {},
});

const getSystemPrefersDark = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('theme') || 'auto';
    } catch {
      return 'auto';
    }
  });

  // Apply theme to <html>
  useEffect(() => {
    const root = document.documentElement;
    const isDark = theme === 'dark' || (theme === 'auto' && getSystemPrefersDark());
    root.classList.toggle('dark', isDark);

    try {
      localStorage.setItem('theme', theme);
    } catch {
      // ignore if storage not available
    }
  }, [theme]);

  // React to system theme changes in "auto" mode
  useEffect(() => {
    if (theme !== 'auto') return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const root = document.documentElement;
      root.classList.toggle('dark', media.matches);
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
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme }), [theme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
