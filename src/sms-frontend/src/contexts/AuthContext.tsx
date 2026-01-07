import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, UserDto, UserRole, LoginRequest, RegisterRequest, AuthResponse } from '../lib/api';

interface AuthContextType {
    user: UserDto | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (data: LoginRequest) => Promise<void>;
    register: (data: RegisterRequest) => Promise<void>;
    googleLogin: (idToken: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserDto | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const accessToken = localStorage.getItem('accessToken');

        if (storedUser && accessToken) {
            try {
                setUser(JSON.parse(storedUser));
            } catch {
                localStorage.removeItem('user');
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
            }
        }
        setIsLoading(false);
    }, []);

    const handleAuthResponse = (data: AuthResponse) => {
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
    };

    const login = async (data: LoginRequest) => {
        const response = await authApi.login(data);
        if (response.data.success && response.data.data) {
            handleAuthResponse(response.data.data);
        } else {
            throw new Error(response.data.message || 'Login failed');
        }
    };

    const register = async (data: RegisterRequest) => {
        const response = await authApi.register(data);
        if (response.data.success && response.data.data) {
            handleAuthResponse(response.data.data);
        } else {
            throw new Error(response.data.message || 'Registration failed');
        }
    };

    const googleLogin = async (idToken: string) => {
        const response = await authApi.googleLogin(idToken);
        if (response.data.success && response.data.data) {
            handleAuthResponse(response.data.data);
        } else {
            throw new Error(response.data.message || 'Google login failed');
        }
    };

    const logout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        setUser(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                isLoading,
                login,
                register,
                googleLogin,
                logout,
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

export function getRoleName(role: UserRole): string {
    const roleNames: Record<UserRole, string> = {
        [UserRole.Admin]: 'Administrator',
        [UserRole.Instructor]: 'Instructor',
        [UserRole.Student]: 'Student',
    };
    return roleNames[role] || 'Unknown';
}
