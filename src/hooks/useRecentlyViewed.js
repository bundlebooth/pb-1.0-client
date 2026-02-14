import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'planbeau_recently_viewed';
const MAX_ITEMS = 20; // Maximum number of recently viewed vendors to store

/**
 * Custom hook to manage recently viewed vendors
 * Stores vendor data in localStorage for persistence across sessions
 */
export function useRecentlyViewed() {
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Filter out expired items (older than 30 days)
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        const filtered = parsed.filter(item => item.viewedAt > thirtyDaysAgo);
        setRecentlyViewed(filtered);
        
        // Update storage if items were filtered out
        if (filtered.length !== parsed.length) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        }
      }
    } catch (error) {
      console.error('Error loading recently viewed:', error);
      setRecentlyViewed([]);
    }
  }, []);

  // Add a vendor to recently viewed
  const addToRecentlyViewed = useCallback((vendor) => {
    if (!vendor) return;
    
    const vendorId = vendor.vendorProfileId || vendor.VendorProfileID || vendor.id;
    if (!vendorId) return;

    setRecentlyViewed(prev => {
      // Remove existing entry for this vendor (if any)
      const filtered = prev.filter(item => {
        const itemId = item.vendorProfileId || item.VendorProfileID || item.id;
        return String(itemId) !== String(vendorId);
      });

      // Create new entry with timestamp
      const newEntry = {
        ...vendor,
        vendorProfileId: vendorId,
        viewedAt: Date.now()
      };

      // Add to beginning and limit to MAX_ITEMS
      const updated = [newEntry, ...filtered].slice(0, MAX_ITEMS);

      // Persist to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error('Error saving recently viewed:', error);
      }

      return updated;
    });
  }, []);

  // Clear all recently viewed
  const clearRecentlyViewed = useCallback(() => {
    setRecentlyViewed([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing recently viewed:', error);
    }
  }, []);

  // Remove a specific vendor from recently viewed
  const removeFromRecentlyViewed = useCallback((vendorId) => {
    setRecentlyViewed(prev => {
      const filtered = prev.filter(item => {
        const itemId = item.vendorProfileId || item.VendorProfileID || item.id;
        return String(itemId) !== String(vendorId);
      });

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      } catch (error) {
        console.error('Error updating recently viewed:', error);
      }

      return filtered;
    });
  }, []);

  return {
    recentlyViewed,
    addToRecentlyViewed,
    clearRecentlyViewed,
    removeFromRecentlyViewed
  };
}

export default useRecentlyViewed;
