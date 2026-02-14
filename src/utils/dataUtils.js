/**
 * Shared Data Utilities for Planbeau
 * Reusable functions for data manipulation, sorting, filtering
 */

// ============================================================
// SORTING UTILITIES
// ============================================================

/**
 * Generic sort function for arrays of objects
 * @param {Array} data - Array to sort
 * @param {string} key - Key to sort by
 * @param {string} direction - 'asc' or 'desc'
 * @returns {Array} Sorted array
 */
export function sortBy(data, key, direction = 'desc') {
  if (!Array.isArray(data)) return [];
  
  return [...data].sort((a, b) => {
    let aVal = a[key];
    let bVal = b[key];
    
    // Handle null/undefined
    if (aVal == null) return direction === 'asc' ? -1 : 1;
    if (bVal == null) return direction === 'asc' ? 1 : -1;
    
    // Handle dates
    if (aVal instanceof Date || (typeof aVal === 'string' && !isNaN(Date.parse(aVal)))) {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    }
    
    // Handle strings
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return direction === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }
    
    // Handle numbers
    return direction === 'asc' ? aVal - bVal : bVal - aVal;
  });
}

/**
 * Sort by multiple keys
 * @param {Array} data - Array to sort
 * @param {Array} sortConfig - Array of { key, direction } objects
 * @returns {Array} Sorted array
 */
export function sortByMultiple(data, sortConfig) {
  if (!Array.isArray(data) || !Array.isArray(sortConfig)) return data;
  
  return [...data].sort((a, b) => {
    for (const { key, direction = 'asc' } of sortConfig) {
      let aVal = a[key];
      let bVal = b[key];
      
      if (aVal == null && bVal == null) continue;
      if (aVal == null) return direction === 'asc' ? -1 : 1;
      if (bVal == null) return direction === 'asc' ? 1 : -1;
      
      if (typeof aVal === 'string') {
        const comparison = aVal.localeCompare(bVal);
        if (comparison !== 0) {
          return direction === 'asc' ? comparison : -comparison;
        }
      } else {
        if (aVal !== bVal) {
          return direction === 'asc' ? aVal - bVal : bVal - aVal;
        }
      }
    }
    return 0;
  });
}

// ============================================================
// FILTERING UTILITIES
// ============================================================

/**
 * Filter array by search term across multiple fields
 * @param {Array} data - Array to filter
 * @param {string} searchTerm - Search term
 * @param {Array} fields - Fields to search in
 * @returns {Array} Filtered array
 */
export function filterBySearch(data, searchTerm, fields) {
  if (!Array.isArray(data) || !searchTerm) return data;
  
  const term = searchTerm.toLowerCase().trim();
  if (!term) return data;
  
  return data.filter(item => {
    return fields.some(field => {
      const value = getNestedValue(item, field);
      if (value == null) return false;
      return String(value).toLowerCase().includes(term);
    });
  });
}

/**
 * Filter array by exact field value
 * @param {Array} data - Array to filter
 * @param {string} field - Field to filter by
 * @param {any} value - Value to match
 * @returns {Array} Filtered array
 */
export function filterByValue(data, field, value) {
  if (!Array.isArray(data)) return [];
  if (value === 'all' || value === '' || value == null) return data;
  
  return data.filter(item => {
    const itemValue = getNestedValue(item, field);
    return itemValue === value || String(itemValue).toLowerCase() === String(value).toLowerCase();
  });
}

/**
 * Filter array by multiple conditions
 * @param {Array} data - Array to filter
 * @param {Object} filters - Object of field: value pairs
 * @returns {Array} Filtered array
 */
export function filterByMultiple(data, filters) {
  if (!Array.isArray(data) || !filters) return data;
  
  return data.filter(item => {
    return Object.entries(filters).every(([field, value]) => {
      if (value === 'all' || value === '' || value == null) return true;
      const itemValue = getNestedValue(item, field);
      return itemValue === value || String(itemValue).toLowerCase() === String(value).toLowerCase();
    });
  });
}

/**
 * Filter array by date range
 * @param {Array} data - Array to filter
 * @param {string} dateField - Field containing date
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {Array} Filtered array
 */
export function filterByDateRange(data, dateField, startDate, endDate) {
  if (!Array.isArray(data)) return [];
  
  const start = startDate ? new Date(startDate).getTime() : null;
  const end = endDate ? new Date(endDate).getTime() : null;
  
  return data.filter(item => {
    const itemDate = new Date(item[dateField]).getTime();
    if (isNaN(itemDate)) return false;
    if (start && itemDate < start) return false;
    if (end && itemDate > end) return false;
    return true;
  });
}

// ============================================================
// GROUPING UTILITIES
// ============================================================

/**
 * Group array by a field
 * @param {Array} data - Array to group
 * @param {string} field - Field to group by
 * @returns {Object} Grouped object
 */
export function groupBy(data, field) {
  if (!Array.isArray(data)) return {};
  
  return data.reduce((groups, item) => {
    const key = getNestedValue(item, field) || 'Unknown';
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
    return groups;
  }, {});
}

/**
 * Count items by a field
 * @param {Array} data - Array to count
 * @param {string} field - Field to count by
 * @returns {Object} Count object
 */
export function countBy(data, field) {
  if (!Array.isArray(data)) return {};
  
  return data.reduce((counts, item) => {
    const key = getNestedValue(item, field) || 'Unknown';
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

// ============================================================
// PAGINATION UTILITIES
// ============================================================

/**
 * Paginate array
 * @param {Array} data - Array to paginate
 * @param {number} page - Current page (1-indexed)
 * @param {number} limit - Items per page
 * @returns {Object} { items, total, totalPages, page, limit }
 */
export function paginate(data, page = 1, limit = 10) {
  if (!Array.isArray(data)) return { items: [], total: 0, totalPages: 0, page, limit };
  
  const total = data.length;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  const items = data.slice(offset, offset + limit);
  
  return { items, total, totalPages, page, limit };
}

// ============================================================
// TRANSFORMATION UTILITIES
// ============================================================

/**
 * Get nested value from object using dot notation
 * @param {Object} obj - Object to get value from
 * @param {string} path - Path to value (e.g., 'user.name')
 * @returns {any} Value at path
 */
export function getNestedValue(obj, path) {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Set nested value in object using dot notation
 * @param {Object} obj - Object to set value in
 * @param {string} path - Path to value
 * @param {any} value - Value to set
 * @returns {Object} New object with value set
 */
export function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  const result = { ...obj };
  let current = result;
  
  for (let i = 0; i < keys.length - 1; i++) {
    current[keys[i]] = { ...current[keys[i]] };
    current = current[keys[i]];
  }
  
  current[keys[keys.length - 1]] = value;
  return result;
}

/**
 * Pick specific keys from object
 * @param {Object} obj - Source object
 * @param {Array} keys - Keys to pick
 * @returns {Object} New object with only picked keys
 */
export function pick(obj, keys) {
  if (!obj || !Array.isArray(keys)) return {};
  return keys.reduce((result, key) => {
    if (key in obj) result[key] = obj[key];
    return result;
  }, {});
}

/**
 * Omit specific keys from object
 * @param {Object} obj - Source object
 * @param {Array} keys - Keys to omit
 * @returns {Object} New object without omitted keys
 */
export function omit(obj, keys) {
  if (!obj) return {};
  const keysSet = new Set(keys);
  return Object.fromEntries(
    Object.entries(obj).filter(([key]) => !keysSet.has(key))
  );
}

/**
 * Normalize array of objects to object keyed by ID
 * @param {Array} data - Array to normalize
 * @param {string} idField - Field to use as key
 * @returns {Object} Normalized object
 */
export function normalize(data, idField = 'id') {
  if (!Array.isArray(data)) return {};
  return data.reduce((result, item) => {
    result[item[idField]] = item;
    return result;
  }, {});
}

/**
 * Denormalize object back to array
 * @param {Object} data - Normalized object
 * @returns {Array} Array of values
 */
export function denormalize(data) {
  if (!data || typeof data !== 'object') return [];
  return Object.values(data);
}

// ============================================================
// COMPARISON UTILITIES
// ============================================================

/**
 * Deep equality check
 * @param {any} a - First value
 * @param {any} b - Second value
 * @returns {boolean} Whether values are deeply equal
 */
export function deepEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }
  
  if (typeof a === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every(key => deepEqual(a[key], b[key]));
  }
  
  return false;
}

/**
 * Get differences between two objects
 * @param {Object} original - Original object
 * @param {Object} updated - Updated object
 * @returns {Object} Object containing only changed fields
 */
export function getDiff(original, updated) {
  if (!original || !updated) return updated || {};
  
  const diff = {};
  const allKeys = new Set([...Object.keys(original), ...Object.keys(updated)]);
  
  for (const key of allKeys) {
    if (!deepEqual(original[key], updated[key])) {
      diff[key] = updated[key];
    }
  }
  
  return diff;
}

// ============================================================
// ARRAY UTILITIES
// ============================================================

/**
 * Remove duplicates from array
 * @param {Array} data - Array with potential duplicates
 * @param {string} key - Key to check for uniqueness (optional)
 * @returns {Array} Array without duplicates
 */
export function unique(data, key) {
  if (!Array.isArray(data)) return [];
  
  if (key) {
    const seen = new Set();
    return data.filter(item => {
      const value = item[key];
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  }
  
  return [...new Set(data)];
}

/**
 * Chunk array into smaller arrays
 * @param {Array} data - Array to chunk
 * @param {number} size - Chunk size
 * @returns {Array} Array of chunks
 */
export function chunk(data, size) {
  if (!Array.isArray(data) || size < 1) return [];
  
  const chunks = [];
  for (let i = 0; i < data.length; i += size) {
    chunks.push(data.slice(i, i + size));
  }
  return chunks;
}

/**
 * Flatten nested array
 * @param {Array} data - Nested array
 * @param {number} depth - Depth to flatten (default: 1)
 * @returns {Array} Flattened array
 */
export function flatten(data, depth = 1) {
  if (!Array.isArray(data)) return [];
  return data.flat(depth);
}

/**
 * Move item in array from one index to another
 * @param {Array} data - Array to modify
 * @param {number} from - Source index
 * @param {number} to - Destination index
 * @returns {Array} New array with item moved
 */
export function moveItem(data, from, to) {
  if (!Array.isArray(data)) return [];
  const result = [...data];
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
}

// ============================================================
// STRING UTILITIES
// ============================================================

/**
 * Truncate string with ellipsis
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated string
 */
export function truncate(str, maxLength) {
  if (!str || str.length <= maxLength) return str || '';
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Capitalize first letter
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert to title case
 * @param {string} str - String to convert
 * @returns {string} Title case string
 */
export function titleCase(str) {
  if (!str) return '';
  return str.replace(/\b\w/g, char => char.toUpperCase());
}

/**
 * Convert snake_case or kebab-case to Title Case
 * @param {string} str - String to convert
 * @returns {string} Title case string
 */
export function formatLabel(str) {
  if (!str) return '';
  return str
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

/**
 * Generate slug from string
 * @param {string} str - String to convert
 * @returns {string} URL-friendly slug
 */
export function slugify(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ============================================================
// NUMBER UTILITIES
// ============================================================

/**
 * Clamp number between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Calculate percentage
 * @param {number} value - Current value
 * @param {number} total - Total value
 * @param {number} decimals - Decimal places
 * @returns {number} Percentage
 */
export function percentage(value, total, decimals = 0) {
  if (!total) return 0;
  const pct = (value / total) * 100;
  return decimals ? Number(pct.toFixed(decimals)) : Math.round(pct);
}

/**
 * Sum array of numbers or objects
 * @param {Array} data - Array to sum
 * @param {string} key - Key to sum (for objects)
 * @returns {number} Sum
 */
export function sum(data, key) {
  if (!Array.isArray(data)) return 0;
  return data.reduce((total, item) => {
    const value = key ? Number(item[key]) : Number(item);
    return total + (isNaN(value) ? 0 : value);
  }, 0);
}

/**
 * Calculate average
 * @param {Array} data - Array to average
 * @param {string} key - Key to average (for objects)
 * @returns {number} Average
 */
export function average(data, key) {
  if (!Array.isArray(data) || data.length === 0) return 0;
  return sum(data, key) / data.length;
}
