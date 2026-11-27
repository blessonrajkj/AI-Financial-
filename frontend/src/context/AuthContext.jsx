import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../services/api';

const AuthContext = createContext(null);

// Configure backend API endpoint base url
// Configure default sensible timeout (10 seconds) to avoid indefinite hangs
axios.defaults.timeout = 10000;

// Synchronously configure Authorization header on module load if token exists
const initialToken = localStorage.getItem('token');
if (initialToken) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${initialToken}`;
}

// Global request interceptor to guarantee token presence on every request
axios.interceptors.request.use(
  (config) => {
    const activeToken = localStorage.getItem('token');
    if (activeToken && !config.headers['Authorization']) {
      config.headers['Authorization'] = `Bearer ${activeToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Configure global axios state when token changes
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
      fetchUserProfile();
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
      setUser(null);
      setLoading(false);
    }
  }, [token]);

  // Auto-logout Session inactivity guard (Fintech compliance standard)
  useEffect(() => {
    if (!token) return;

    let inactivityTimeout;

    const resetTimer = () => {
      clearTimeout(inactivityTimeout);
      inactivityTimeout = setTimeout(() => {
        console.warn("Session expired due to inactivity");
        logout();
        alert("Session expired due to inactivity. Please log in again to protect your account.");
      }, 15 * 60 * 1000); // 15 minutes
    };

    const events = ['mousemove', 'keydown', 'mousedown', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetTimer));

    resetTimer();

    return () => {
      clearTimeout(inactivityTimeout);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [token]);

  const fetchUserProfile = async () => {
    try {
      const res = await axios.get(`${API_URL}/auth/me`);
      setUser(res.data);
    } catch (err) {
      if (err.response && err.response.status === 401) {
        console.error("Session verification failed, logging out", err);
        logout();
      } else {
        console.warn("Could not fetch user profile (network/rate limit/server error); keeping session", err);
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const params = new URLSearchParams();
    params.append('username', email);
    params.append('password', password);

    const res = await axios.post(`${API_URL}/auth/login`, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    setToken(res.data.access_token);
    return res.data;
  };

  const register = async (email, password, fullName) => {
    const res = await axios.post(`${API_URL}/auth/register`, {
      email,
      password,
      full_name: fullName,
      role: 'user'
    });
    return res.data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };

  const updateProfile = async (fullName, email, password) => {
    const payload = { full_name: fullName, email };
    if (password) {
      payload.password = password;
    }
    const res = await axios.put(`${API_URL}/auth/me`, payload);
    setUser(res.data);
    return res.data;
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateProfile, refreshUser: fetchUserProfile, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);