import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('edna_token'));
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(prev => !prev);

  const authAxios = axios.create({
    baseURL: 'http://localhost:5000',
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await authAxios.get('/auth/notifications');
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  const clearNotifications = async () => {
    if (!token) return;
    try {
      await authAxios.post('/auth/notifications/read-all');
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  };

  const markNotificationRead = async (id) => {
    if (!token) return;
    try {
      const res = await authAxios.post(`/auth/notifications/${id}/read`);
      setUnreadCount(res.data.unreadCount);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const updateProfile = async (data) => {
    console.log('[AUTH] Updating profile:', data);
    try {
      const res = await authAxios.put('/auth/profile', data);
      console.log('[AUTH] Profile update success:', res.data);
      setUser(prev => ({ ...prev, ...res.data.user }));
      return { success: true };
    } catch (err) {
      console.error('[AUTH] Profile update error:', err.response?.data || err.message);
      return { success: false, error: err.response?.data?.error || err.message };
    }
  };

  useEffect(() => {
    if (token) {
      authAxios.get('/auth/me')
        .then(res => { 
          setUser(res.data); 
          setLoading(false);
          fetchNotifications();
        })
        .catch(() => { logout(); setLoading(false); });
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = (jwtToken, userData) => {
    localStorage.setItem('edna_token', jwtToken);
    setToken(jwtToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('edna_token');
    setToken(null);
    setUser(null);
    setNotifications([]);
    setUnreadCount(0);
  };

  const guestUser = {
    name: 'Guest Explorer',
    plantName: 'EnergyDNA Demo Plant',
    role: 'windplant',
    walletAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' // Standard Hardhat #0
  };

  const value = {
    user: user || guestUser,
    token,
    loading,
    login,
    logout,
    authAxios,
    isAuthenticated: !!user,
    isGuest: !user,
    isWindPlant: user ? user.role === 'windplant' : true, // Default to windplant UI for guests
    isUser: user?.role === 'user',
    notifications,
    unreadCount,
    fetchNotifications,
    clearNotifications,
    markNotificationRead,
    updateProfile,
    isDark,
    toggleTheme
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
