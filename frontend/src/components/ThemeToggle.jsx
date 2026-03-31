import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useAuth } from '../AuthContext';

export function ThemeToggle() {
  const { isDark, toggleTheme } = useAuth();

  return (
    <button 
      onClick={toggleTheme} 
      className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors focus:outline-none"
      aria-label="Toggle Dark Mode"
    >
      {isDark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
