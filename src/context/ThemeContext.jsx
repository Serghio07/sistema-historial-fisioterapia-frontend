import { createContext, useContext, useLayoutEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);

const preferredTheme = () => {
  const saved = localStorage.getItem('physio-theme');
  if (saved === 'dark' || saved === 'light') return saved;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(preferredTheme);

  useLayoutEffect(() => {
    const darkMode = theme === 'dark';
    document.documentElement.classList.toggle('dark', darkMode);
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('physio-theme', theme);
  }, [theme]);

  const value = useMemo(() => ({
    theme,
    darkMode: theme === 'dark',
    toggleTheme: () => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
