import React, { createContext, useContext, useLayoutEffect, useEffect, useState } from 'react';
import { useStore } from '../store/almacenAplicacion';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme;
    }
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return systemPrefersDark ? 'dark' : 'light';
  });

  const { clients, updateClient } = useStore();
  const currentUserId = localStorage.getItem('copiway_auth_user_id');

  useEffect(() => {
    if (currentUserId && currentUserId !== 'guest') {
      const client = clients.find(c => c.id === currentUserId);
      if (client?.preferences?.theme) {
         setTheme(client.preferences.theme as Theme);
      }
    }
  }, [currentUserId, clients.length]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.add('no-transitions');
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
    
    // Sync to firebase if auth user
    if (currentUserId && currentUserId !== 'guest') {
       const client = useStore.getState().clients.find(c => c.id === currentUserId);
       if (client && client.preferences?.theme !== theme) {
         useStore.getState().updateClient(currentUserId, {
            preferences: { ...client.preferences, theme }
         });
       }
    }
    
    // Force standard sync layout recalculation
    window.getComputedStyle(root).opacity;
    
    const timeout = setTimeout(() => {
      root.classList.remove('no-transitions');
    }, 0);
    
    return () => clearTimeout(timeout);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => {
      const nextTheme = prev === 'light' ? 'dark' : 'light';
      // Apply immediately and synchronously to the HTML tag to prevent any intermediate visual flash
      const root = document.documentElement;
      root.classList.add('no-transitions');
      
      if (nextTheme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      localStorage.setItem('theme', nextTheme);
      
      // Force repaint
      window.getComputedStyle(root).opacity;
      
      setTimeout(() => {
        root.classList.remove('no-transitions');
      }, 0);
      
      return nextTheme;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
