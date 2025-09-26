import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  getIdToken as getFirebaseIdToken
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  getIdToken: () => Promise<string>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Listen for authentication state changes
  useEffect(() => {
    // Handle demo mode when Firebase is not available
    if (!auth) {
      // Create a demo user for showcase purposes
      const demoUser: User = {
        uid: 'demo-user',
        email: 'demo@turnkeyhms.com',
        displayName: 'Demo Admin',
        role: 'admin',
      };
      setUser(demoUser);
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Convert Firebase user to our User type
        const user: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || '',
          role: 'admin', // All users are admin for now
        };
        setUser(user);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    if (!auth || !googleProvider) {
      console.warn('Firebase not available - already logged in as demo user');
      return;
    }

    setIsLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      // User state will be updated automatically via onAuthStateChanged
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    if (!auth) {
      console.warn('Firebase not available - cannot logout from demo mode');
      return;
    }

    try {
      await signOut(auth);
      // User state will be updated automatically via onAuthStateChanged
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const refreshToken = async () => {
    if (!auth) {
      console.warn('Firebase not available - demo mode token refresh');
      return;
    }

    try {
      if (auth.currentUser) {
        // Force refresh the Firebase token
        await auth.currentUser.getIdToken(true);
      } else {
        throw new Error('No authenticated user');
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      await logout();
      throw error;
    }
  };

  const getIdToken = async (): Promise<string> => {
    if (!auth) {
      console.warn('Firebase not available - returning demo token');
      return 'demo-token';
    }

    try {
      if (auth.currentUser) {
        return await getFirebaseIdToken(auth.currentUser);
      } else {
        throw new Error('No authenticated user');
      }
    } catch (error) {
      console.error('Error getting ID token:', error);
      throw error;
    }
  };

  const contextValue: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    loginWithGoogle,
    logout,
    refreshToken,
    getIdToken,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};