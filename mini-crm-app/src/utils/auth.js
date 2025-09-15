import React from 'react';

export const AUTH_TOKEN_KEY = 'authToken';
export const USER_DATA_KEY = 'userData';

// Get auth token from localStorage
export const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }
  return null;
};

// Get user data from localStorage
export const getUserData = () => {
  if (typeof window !== 'undefined') {
    const userData = localStorage.getItem(USER_DATA_KEY);
    try {
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  }
  return null;
};

// Check if user is authenticated
export const isAuthenticated = () => {
  const token = getAuthToken();
  const userData = getUserData();
  return !!(token && userData);
};

// Logout user
export const logout = async () => {
  try {
    const token = getAuthToken();
    
    if (token) {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      await fetch(`${backendUrl}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    }
  } catch (error) {
    console.error('Error during backend logout:', error);
  } finally {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(USER_DATA_KEY);
    }
  }
};

// Make authenticated API request
export const authFetch = async (url, options = {}) => {
  const token = getAuthToken();
  
  if (!token) {
    if (typeof window !== 'undefined') {
      await logout();
      window.location.href = '/login';
    }
    throw new Error('No authentication token found');
  }

  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  };

  const mergedOptions = {
    ...options,
    headers: defaultOptions.headers,
  };

  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
  const fullUrl = url.startsWith('http') ? url : `${backendUrl}${url}`;

  const response = await fetch(fullUrl, mergedOptions);

  if (response.status === 401) {
    await logout();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Authentication failed: Token is invalid or expired.');
  }

  return response;
};

// React hook for authentication status
export const useAuth = () => {
  const [user, setUser] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const userData = getUserData();
    if (userData) {
      setUser(userData);
    }
    setIsLoading(false);
  }, []);

  const login = (token, userData) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
      setUser(userData);
    }
  };

  const logoutUser = async () => {
    await logout();
    setUser(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout: logoutUser
  };
};