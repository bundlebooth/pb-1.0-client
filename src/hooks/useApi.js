/**
 * Shared API Hooks for Planbeau
 * Reusable hooks for common data fetching patterns
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';

/**
 * useApiData - Generic hook for fetching data from API
 * Handles loading, error states, and automatic refetching
 * 
 * @param {string} endpoint - API endpoint to fetch from
 * @param {Object} options - Configuration options
 * @returns {Object} { data, loading, error, refetch, setData }
 */
export function useApiData(endpoint, options = {}) {
  const {
    initialData = null,
    enabled = true,
    dependencies = [],
    transform = (data) => data,
    onSuccess,
    onError
  } = options;

  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    if (!endpoint || !enabled) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await apiGet(endpoint);
      
      if (!mountedRef.current) return;
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const result = await response.json();
      const transformedData = transform(result);
      
      setData(transformedData);
      onSuccess?.(transformedData);
    } catch (err) {
      if (!mountedRef.current) return;
      console.error(`Error fetching ${endpoint}:`, err);
      setError(err.message);
      onError?.(err);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [endpoint, enabled, transform, onSuccess, onError]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => { mountedRef.current = false; };
  }, [fetchData, ...dependencies]);

  return { data, loading, error, refetch: fetchData, setData };
}

/**
 * useApiMutation - Hook for POST/PUT/DELETE operations
 * 
 * @param {string} method - HTTP method ('post', 'put', 'delete')
 * @returns {Object} { mutate, loading, error, data }
 */
export function useApiMutation(method = 'post') {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const apiMethod = {
    post: apiPost,
    put: apiPut,
    delete: apiDelete
  }[method] || apiPost;

  const mutate = useCallback(async (endpoint, body, options = {}) => {
    const { onSuccess, onError } = options;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiMethod(endpoint, body);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API error: ${response.status}`);
      }
      
      const result = await response.json().catch(() => ({}));
      setData(result);
      onSuccess?.(result);
      return { success: true, data: result };
    } catch (err) {
      console.error(`Error in ${method} ${endpoint}:`, err);
      setError(err.message);
      onError?.(err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [apiMethod, method]);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  return { mutate, loading, error, data, reset };
}

/**
 * useVendorProfile - Hook to get vendor profile ID for current user
 * Common pattern used across many vendor components
 */
export function useVendorProfile() {
  const [vendorProfileId, setVendorProfileId] = useState(null);
  const [vendorProfile, setVendorProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchVendorProfile = useCallback(async (userId) => {
    if (!userId) {
      setLoading(false);
      return null;
    }

    try {
      setLoading(true);
      const response = await apiGet(`/vendors/profile?userId=${userId}`);
      
      if (response.ok) {
        const data = await response.json();
        setVendorProfileId(data.vendorProfileId);
        setVendorProfile(data);
        return data.vendorProfileId;
      } else {
        setError('Failed to fetch vendor profile');
        return null;
      }
    } catch (err) {
      console.error('Error fetching vendor profile:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { 
    vendorProfileId, 
    vendorProfile, 
    loading, 
    error, 
    fetchVendorProfile,
    setVendorProfileId 
  };
}

/**
 * usePagination - Hook for paginated data
 */
export function usePagination(initialPage = 1, initialLimit = 10) {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const [total, setTotal] = useState(0);

  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  const nextPage = useCallback(() => {
    if (hasNextPage) setPage(p => p + 1);
  }, [hasNextPage]);

  const prevPage = useCallback(() => {
    if (hasPrevPage) setPage(p => p - 1);
  }, [hasPrevPage]);

  const goToPage = useCallback((newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  }, [totalPages]);

  const reset = useCallback(() => {
    setPage(initialPage);
  }, [initialPage]);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage,
    hasPrevPage,
    setPage,
    setLimit,
    setTotal,
    nextPage,
    prevPage,
    goToPage,
    reset,
    offset: (page - 1) * limit
  };
}

/**
 * useDebounce - Debounce a value
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * useLocalStorage - Persist state to localStorage
 */
export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}

/**
 * useClickOutside - Detect clicks outside an element
 */
export function useClickOutside(ref, callback) {
  useEffect(() => {
    const handleClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        callback();
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [ref, callback]);
}

/**
 * useToggle - Simple boolean toggle
 */
export function useToggle(initialValue = false) {
  const [value, setValue] = useState(initialValue);
  
  const toggle = useCallback(() => setValue(v => !v), []);
  const setTrue = useCallback(() => setValue(true), []);
  const setFalse = useCallback(() => setValue(false), []);
  
  return [value, toggle, { setTrue, setFalse, setValue }];
}

/**
 * useAsync - Run async function with loading/error states
 */
export function useAsync() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const execute = useCallback(async (asyncFn) => {
    try {
      setLoading(true);
      setError(null);
      const result = await asyncFn();
      setData(result);
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  return { execute, loading, error, data, setData };
}
