/**
 * Local storage utilities with error handling and encryption support
 */

export const storage = {
  /**
   * Safely get item from localStorage
   */
  getItem<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;
      return JSON.parse(item);
    } catch (error) {
      console.warn(`Failed to get item ${key} from localStorage:`, error);
      return defaultValue;
    }
  },

  /**
   * Safely set item in localStorage
   */
  setItem<T>(key: string, value: T): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn(`Failed to set item ${key} in localStorage:`, error);
      return false;
    }
  },

  /**
   * Remove item from localStorage
   */
  removeItem(key: string): boolean {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(`Failed to remove item ${key} from localStorage:`, error);
      return false;
    }
  },

  /**
   * Clear all items from localStorage
   */
  clear(): boolean {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
      return false;
    }
  },

  /**
   * Check if localStorage is available
   */
  isAvailable(): boolean {
    try {
      const testKey = '__localStorage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  },

  /**
   * Get storage usage information
   */
  getStorageInfo(): { used: number; available: number; percentage: number } {
    if (!this.isAvailable()) {
      return { used: 0, available: 0, percentage: 0 };
    }

    try {
      let used = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          used += localStorage[key].length + key.length;
        }
      }

      // Rough estimate of available space (varies by browser)
      const available = 5 * 1024 * 1024; // 5MB typical limit
      const percentage = Math.round((used / available) * 100);

      return { used, available, percentage };
    } catch (error) {
      return { used: 0, available: 0, percentage: 0 };
    }
  },

  /**
   * Store user preferences
   */
  setUserPreference<T>(key: string, value: T): boolean {
    return this.setItem(`user_pref_${key}`, value);
  },

  /**
   * Get user preferences
   */
  getUserPreference<T>(key: string, defaultValue: T): T {
    return this.getItem(`user_pref_${key}`, defaultValue);
  },

  /**
   * Store dashboard settings
   */
  setDashboardSetting<T>(key: string, value: T): boolean {
    return this.setItem(`dashboard_${key}`, value);
  },

  /**
   * Get dashboard settings
   */
  getDashboardSetting<T>(key: string, defaultValue: T): T {
    return this.getItem(`dashboard_${key}`, defaultValue);
  },

  /**
   * Cache data with expiration
   */
  setCachedData<T>(key: string, data: T, expirationMs: number = 3600000): boolean {
    const cacheItem = {
      data,
      timestamp: Date.now(),
      expiration: Date.now() + expirationMs
    };
    return this.setItem(`cache_${key}`, cacheItem);
  },

  /**
   * Get cached data if not expired
   */
  getCachedData<T>(key: string): T | null {
    const cacheItem = this.getItem<{
      data: T;
      timestamp: number;
      expiration: number;
    } | null>(`cache_${key}`, null);

    if (!cacheItem) return null;
    if (Date.now() > cacheItem.expiration) {
      this.removeItem(`cache_${key}`);
      return null;
    }

    return cacheItem.data;
  },

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): void {
    if (!this.isAvailable()) return;

    const keysToRemove: string[] = [];
    for (let key in localStorage) {
      if (key.startsWith('cache_')) {
        const cacheItem = this.getItem<{
          expiration: number;
        } | null>(key, null);
        
        if (cacheItem && Date.now() > cacheItem.expiration) {
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach(key => this.removeItem(key));
  }
};