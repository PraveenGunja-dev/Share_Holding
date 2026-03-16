import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type UserRole = 'admin' | 'user' | 'guest';

interface AuthUser {
    username: string;
    role: UserRole;
}

interface AuthContextType {
    user: AuthUser | null;
    isAdmin: boolean;
    isLoggedIn: boolean;
    login: (username: string, password: string) => { success: boolean; error?: string };
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hardcoded credentials — admin only gets edit access
const CREDENTIALS: Record<string, { password: string; role: UserRole }> = {
    admin: { password: 'admin123', role: 'admin' },
    user: { password: 'user123', role: 'user' },
};

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(() => {
        const saved = localStorage.getItem('auth_user');
        return saved ? JSON.parse(saved) : null;
    });

    const login = useCallback((username: string, password: string) => {
        const cred = CREDENTIALS[username.toLowerCase()];
        if (!cred) {
            return { success: false, error: 'Invalid username' };
        }
        if (cred.password !== password) {
            return { success: false, error: 'Invalid password' };
        }
        const authUser: AuthUser = { username: username.toLowerCase(), role: cred.role };
        setUser(authUser);
        localStorage.setItem('auth_user', JSON.stringify(authUser));
        return { success: true };
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        localStorage.removeItem('auth_user');
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                isAdmin: user?.role === 'admin',
                isLoggedIn: !!user,
                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
