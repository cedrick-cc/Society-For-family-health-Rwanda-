import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiRequest } from '@/services/api';

export type UserRole = 
  | 'admin' 
  | 'coordinator' 
  | 'field_manager' 
  | 'analyst' 
  | 'volunteer';

const KNOWN_ROLES: UserRole[] = ['admin', 'coordinator', 'field_manager', 'analyst', 'volunteer'];

/** Maps API / DB role strings to a known frontend role (avoids invalid values and `String(null)` → `"null"`). */
export function normalizeUserRole(role: unknown): UserRole {
  if (role == null) return 'volunteer';
  const key = String(role).trim().toLowerCase().replace(/\s+/g, '_');
  if (!key) return 'volunteer';
  return (KNOWN_ROLES.includes(key as UserRole) ? key : 'volunteer') as UserRole;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  /** Relative path from API origin, e.g. /uploads/profile-images/... */
  profileImage?: string | null;
  department?: string;
  mustChangePassword?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string; mustChangePassword?: boolean }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  updateUser: (updatedUser: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const roleLabels: Record<UserRole, string> = {
  admin: 'System Administrator',
  coordinator: 'Program Coordinator',
  field_manager: 'Field Manager',
  analyst: 'Data Analyst',
  volunteer: 'Volunteer / Field Staff',
};

export const roleColors: Record<UserRole, string> = {
  admin: 'bg-red-100 text-red-700 border-red-200',
  coordinator: 'bg-blue-100 text-blue-700 border-blue-200',
  field_manager: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  analyst: 'bg-purple-100 text-purple-700 border-purple-200',
  volunteer: 'bg-orange-100 text-orange-700 border-orange-200',
};

const getStoredUser = (): User | null => {
  const token = localStorage.getItem('token');
  const savedUser = localStorage.getItem('user');

  if (!token || !savedUser) {
    return null;
  }

  try {
    return JSON.parse(savedUser) as User;
  } catch {
    localStorage.removeItem('user');
    return null;
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(getStoredUser);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Keep auth state in sync if localStorage changes (e.g. another tab).
    setUser(getStoredUser());
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const hydrateProfile = async () => {
      try {
        const profile = await apiRequest('/profile/me');
        const stored = getStoredUser();
        const base: User | null = stored;
        if (!base) return;

        const merged: User = {
          ...base,
          name: profile.name,
          email: profile.email,
          department: profile.department || '',
          profileImage: profile.profileImage || undefined,
          role: normalizeUserRole(profile.role),
          mustChangePassword: Boolean(profile.mustChangePassword),
        };
        localStorage.setItem('user', JSON.stringify(merged));
        setUser(merged);
      } catch {
        // Offline or session invalid; leave stored user as-is
      }
    };

    hydrateProfile();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string; mustChangePassword?: boolean }> => {
    setIsLoading(true);

    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      const normalizedUser: User = {
        ...data.user,
        role: normalizeUserRole(data.user?.role),
        profileImage: data.user.profileImage || undefined,
        mustChangePassword: Boolean(data.mustChangePassword),
      };

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      setUser(normalizedUser);

      return { success: true, mustChangePassword: Boolean(data.mustChangePassword) };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed.';
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    setIsLoading(true);

    try {
      const data = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });

      return { success: true, message: data.message || 'Registration submitted. Await admin approval.' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed.';
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        register,
        updateUser,
        logout,
        isLoading,
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
