import React, { createContext, useContext, useState, useEffect } from 'react';
import { clearApiCache } from '../services/apiCache';

const ThemeAndRefreshContext = createContext(null);

export const ThemeAndRefreshProvider = ({ children }) => {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [privacyMode, setPrivacyMode] = useState(localStorage.getItem('privacyMode') === 'true');

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (privacyMode) {
      root.classList.add('privacy-active');
    } else {
      root.classList.remove('privacy-active');
    }
    localStorage.setItem('privacyMode', privacyMode ? 'true' : 'false');
  }, [privacyMode]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const togglePrivacyMode = () => {
    setPrivacyMode(prev => !prev);
  };

  const invalidateCache = () => {
    clearApiCache();
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <ThemeAndRefreshContext.Provider value={{ theme, toggleTheme, refreshTrigger, invalidateCache, privacyMode, togglePrivacyMode }}>
      {children}
    </ThemeAndRefreshContext.Provider>
  );
};

export const useThemeAndRefresh = () => useContext(ThemeAndRefreshContext);
