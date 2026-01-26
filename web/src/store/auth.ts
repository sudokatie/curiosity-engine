/**
 * Authentication Store
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getCurrentUser, login as apiLogin, logout as apiLogout, signup as apiSignup } from '../api/auth';
import type { User } from '../api/auth';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiLogin(email, password);
          set({ 
            user: response.user, 
            isAuthenticated: true, 
            isLoading: false 
          });
        } catch (error: any) {
          set({ 
            error: error.message, 
            isLoading: false 
          });
          throw error;
        }
      },

      signup: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiSignup(email, password);
          set({ 
            user: response.user, 
            isAuthenticated: true, 
            isLoading: false 
          });
        } catch (error: any) {
          set({ 
            error: error.message, 
            isLoading: false 
          });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await apiLogout();
        } catch (error) {
          // Ignore logout errors
        } finally {
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false,
            error: null,
          });
        }
      },

      checkAuth: async () => {
        set({ isLoading: true });
        try {
          const response = await getCurrentUser();
          set({ 
            user: response.user, 
            isAuthenticated: true, 
            isLoading: false 
          });
        } catch (error) {
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false 
          });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'curiosity-auth',
      partialize: (state) => ({ 
        // Only persist minimal data, actual auth check happens on load
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
