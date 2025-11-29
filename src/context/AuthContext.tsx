import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

const API_BASE = '';

interface User {
  id: string;
  email: string;
}

interface Session {
  access_token: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  emailVerified: boolean;
  signup: (email: string, password: string, fullName?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  sendVerificationCode: (email: string) => Promise<void>;
  verifyEmailCode: (email: string, code: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);

  const checkEmailVerified = useCallback(async (email: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/check-email-verified/${encodeURIComponent(email)}`);
      const data = await response.json();
      setEmailVerified(data.verified === true);
      return data.verified === true;
    } catch {
      return false;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE}/api/auth/user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        localStorage.removeItem('auth_token');
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      const userData = await response.json();
      setUser(userData);
      setSession({ access_token: token });
      await checkEmailVerified(userData.email);
      setError(null);
    } catch (err) {
      localStorage.removeItem('auth_token');
      setSession(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [checkEmailVerified]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const sendVerificationCode = async (email: string) => {
    const response = await fetch(`${API_BASE}/api/send-verification-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to send verification code');
    }
  };

  const verifyEmailCode = async (email: string, code: string) => {
    const response = await fetch(`${API_BASE}/api/verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to verify code');
    }
    
    if (data.valid === true) {
      setEmailVerified(true);
    }
    
    return data.valid === true;
  };

  const signup = async (email: string, password: string, fullName?: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }
      
      localStorage.setItem('auth_token', data.token);
      setUser(data.user);
      setSession({ access_token: data.token });
      
      await sendVerificationCode(email);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      localStorage.setItem('auth_token', data.token);
      setSession({ access_token: data.token });
      setUser(data.user);
      await checkEmailVerified(email);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      localStorage.removeItem('auth_token');
      setSession(null);
      setUser(null);
      setEmailVerified(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        error,
        isAuthenticated: !!user,
        emailVerified,
        signup,
        login,
        logout,
        refreshUser,
        sendVerificationCode,
        verifyEmailCode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
