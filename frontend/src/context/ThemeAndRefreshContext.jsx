import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeAndRefreshContext = createContext(null);

export const ThemeAndRefreshProvider = ({ children }) => {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const invalidateCache = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <ThemeAndRefreshContext.Provider value={{ theme, toggleTheme, refreshTrigger, invalidateCache }}>
      {children}
    </ThemeAndRefreshContext.Provider>
  );
};

export const useThemeAndRefresh = () => useContext(ThemeAndRefreshContext);
