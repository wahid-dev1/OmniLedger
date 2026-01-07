/**
 * Connection Profiles Utility
 * Manages multiple saved database connection configurations
 */

import type { ConnectionProfile, DatabaseConfig } from '@shared/types';

const PROFILES_STORAGE_KEY = 'omniledger_connection_profiles';
const ACTIVE_PROFILE_KEY = 'omniledger_active_profile';

/**
 * Get all saved connection profiles
 */
export function getConnectionProfiles(): ConnectionProfile[] {
  try {
    const stored = localStorage.getItem(PROFILES_STORAGE_KEY);
    if (!stored) return [];
    
    const profiles = JSON.parse(stored) as ConnectionProfile[];
    // Convert date strings back to Date objects
    return profiles.map(profile => ({
      ...profile,
      createdAt: new Date(profile.createdAt),
      lastUsed: new Date(profile.lastUsed),
    }));
  } catch (error) {
    console.error('Error loading connection profiles:', error);
    return [];
  }
}

/**
 * Save a connection profile
 */
export function saveConnectionProfile(profile: Omit<ConnectionProfile, 'id' | 'createdAt' | 'lastUsed'>): ConnectionProfile {
  const profiles = getConnectionProfiles();
  const newProfile: ConnectionProfile = {
    ...profile,
    id: `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date(),
    lastUsed: new Date(),
  };
  
  profiles.push(newProfile);
  localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
  
  return newProfile;
}

/**
 * Update an existing connection profile
 */
export function updateConnectionProfile(profileId: string, updates: Partial<ConnectionProfile>): ConnectionProfile | null {
  const profiles = getConnectionProfiles();
  const index = profiles.findIndex(p => p.id === profileId);
  
  if (index === -1) return null;
  
  const updatedProfile: ConnectionProfile = {
    ...profiles[index],
    ...updates,
    lastUsed: new Date(), // Update last used timestamp
  };
  
  profiles[index] = updatedProfile;
  localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
  
  return updatedProfile;
}

/**
 * Delete a connection profile
 */
export function deleteConnectionProfile(profileId: string): boolean {
  const profiles = getConnectionProfiles();
  const filtered = profiles.filter(p => p.id !== profileId);
  
  if (filtered.length === profiles.length) return false; // Profile not found
  
  localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(filtered));
  
  // If deleted profile was active, clear active profile
  const activeProfileId = getActiveProfileId();
  if (activeProfileId === profileId) {
    clearActiveProfile();
  }
  
  return true;
}

/**
 * Get active profile ID
 */
export function getActiveProfileId(): string | null {
  return localStorage.getItem(ACTIVE_PROFILE_KEY);
}

/**
 * Set active profile
 */
export function setActiveProfile(profileId: string): void {
  localStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
  
  // Update last used timestamp
  const profiles = getConnectionProfiles();
  const profile = profiles.find(p => p.id === profileId);
  if (profile) {
    updateConnectionProfile(profileId, { lastUsed: new Date() });
  }
}

/**
 * Get active profile
 */
export function getActiveProfile(): ConnectionProfile | null {
  const activeId = getActiveProfileId();
  if (!activeId) return null;
  
  const profiles = getConnectionProfiles();
  return profiles.find(p => p.id === activeId) || null;
}

/**
 * Clear active profile
 */
export function clearActiveProfile(): void {
  localStorage.removeItem(ACTIVE_PROFILE_KEY);
}

/**
 * Get profile by ID
 */
export function getProfileById(profileId: string): ConnectionProfile | null {
  const profiles = getConnectionProfiles();
  return profiles.find(p => p.id === profileId) || null;
}

/**
 * Set default profile
 */
export function setDefaultProfile(profileId: string): void {
  const profiles = getConnectionProfiles();
  const updated = profiles.map(p => ({
    ...p,
    isDefault: p.id === profileId,
  }));
  
  localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(updated));
}

/**
 * Get default profile
 */
export function getDefaultProfile(): ConnectionProfile | null {
  const profiles = getConnectionProfiles();
  return profiles.find(p => p.isDefault) || profiles[0] || null;
}

/**
 * Convert DatabaseConfig to ConnectionProfile (for backward compatibility)
 */
export function configToProfile(config: DatabaseConfig, name: string): Omit<ConnectionProfile, 'id' | 'createdAt' | 'lastUsed'> {
  return {
    name,
    config,
    isDefault: false,
  };
}

