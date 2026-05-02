import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useStore = create(
  persist(
    (set) => ({
      user: null,
      role: 'patient',
      isAuthenticated: false,
      
      // User Actions
      setUser: (userData) => set({ 
        user: userData, 
        isAuthenticated: !!userData,
        role: userData?.role || 'patient'
      }),
      
      logout: () => set({ 
        user: null, 
        isAuthenticated: false, 
        role: 'patient' 
      }),

      // Clinical Data State
      triageHistory: [],
      addTriageResult: (result) => set((state) => ({ 
        triageHistory: [result, ...state.triageHistory] 
      })),

      // UI State
      isSidebarOpen: true,
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      
      location: 'Detecting...',
      setLocation: (loc) => set({ location: loc }),
    }),
    {
      name: 'mediai-storage', // name of the item in the storage (must be unique)
    }
  )
);
