/**
 * Main application store using Zustand
 * Manages global application state
 */

import { create } from "zustand";
import type { User, Company, DatabaseConfig } from "@shared/types";

interface AppState {
  // Current user and company
  currentUser: User | null;
  currentCompany: Company | null;
  databaseConfig: DatabaseConfig | null;

  // UI state
  isLoading: boolean;
  error: string | null;

  // Actions
  setCurrentUser: (user: User | null) => void;
  setCurrentCompany: (company: Company | null) => void;
  setDatabaseConfig: (config: DatabaseConfig | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  currentUser: null,
  currentCompany: null,
  databaseConfig: null,
  isLoading: false,
  error: null,

  // Actions
  setCurrentUser: (user) => set({ currentUser: user }),
  setCurrentCompany: (company) => set({ currentCompany: company }),
  setDatabaseConfig: (config) => {
    set({ databaseConfig: config });
    // Persist to localStorage
    if (config) {
      localStorage.setItem("omniledger_db_config", JSON.stringify(config));
    } else {
      localStorage.removeItem("omniledger_db_config");
    }
  },
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
}));

