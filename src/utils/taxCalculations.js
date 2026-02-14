/**
 * Tax Calculation Utilities
 * Shared logic for province detection and tax calculation across the application
 */

// Province tax rates for Canada
export const PROVINCE_TAX_RATES = {
  'Ontario': { rate: 13, type: 'HST', label: 'HST 13%' },
  'Quebec': { rate: 14.975, type: 'GST+QST', label: 'GST+QST 14.975%' },
  'British Columbia': { rate: 12, type: 'GST+PST', label: 'GST+PST 12%' },
  'Alberta': { rate: 5, type: 'GST', label: 'GST 5%' },
  'Manitoba': { rate: 12, type: 'GST+PST', label: 'GST+PST 12%' },
  'Saskatchewan': { rate: 11, type: 'GST+PST', label: 'GST+PST 11%' },
  'Nova Scotia': { rate: 15, type: 'HST', label: 'HST 15%' },
  'New Brunswick': { rate: 15, type: 'HST', label: 'HST 15%' },
  'Newfoundland and Labrador': { rate: 15, type: 'HST', label: 'HST 15%' },
  'Prince Edward Island': { rate: 15, type: 'HST', label: 'HST 15%' },
  'Northwest Territories': { rate: 5, type: 'GST', label: 'GST 5%' },
  'Yukon': { rate: 5, type: 'GST', label: 'GST 5%' },
  'Nunavut': { rate: 5, type: 'GST', label: 'GST 5%' }
};

// Province abbreviation mapping
export const PROVINCE_ABBREVIATIONS = {
  'AB': 'Alberta',
  'BC': 'British Columbia',
  'MB': 'Manitoba',
  'NB': 'New Brunswick',
  'NL': 'Newfoundland and Labrador',
  'NT': 'Northwest Territories',
  'NS': 'Nova Scotia',
  'NU': 'Nunavut',
  'ON': 'Ontario',
  'PE': 'Prince Edward Island',
  'QC': 'Quebec',
  'SK': 'Saskatchewan',
  'YT': 'Yukon'
};

// Major Canadian cities mapped to their provinces
export const CITY_TO_PROVINCE = {
  'TORONTO': 'Ontario', 'OTTAWA': 'Ontario', 'MISSISSAUGA': 'Ontario', 'BRAMPTON': 'Ontario', 'HAMILTON': 'Ontario',
  'LONDON': 'Ontario', 'MARKHAM': 'Ontario', 'VAUGHAN': 'Ontario', 'KITCHENER': 'Ontario', 'WINDSOR': 'Ontario',
  'SCARBOROUGH': 'Ontario', 'NORTH YORK': 'Ontario', 'ETOBICOKE': 'Ontario', 'OAKVILLE': 'Ontario', 'BURLINGTON': 'Ontario',
  'MONTREAL': 'Quebec', 'QUEBEC CITY': 'Quebec', 'LAVAL': 'Quebec', 'GATINEAU': 'Quebec', 'LONGUEUIL': 'Quebec',
  'VANCOUVER': 'British Columbia', 'SURREY': 'British Columbia', 'BURNABY': 'British Columbia', 'RICHMOND': 'British Columbia',
  'VICTORIA': 'British Columbia', 'KELOWNA': 'British Columbia', 'WEST VANCOUVER': 'British Columbia', 'COQUITLAM': 'British Columbia',
  'CALGARY': 'Alberta', 'EDMONTON': 'Alberta', 'RED DEER': 'Alberta', 'LETHBRIDGE': 'Alberta', 'BANFF': 'Alberta',
  'WINNIPEG': 'Manitoba', 'BRANDON': 'Manitoba',
  'SASKATOON': 'Saskatchewan', 'REGINA': 'Saskatchewan',
  'HALIFAX': 'Nova Scotia', 'DARTMOUTH': 'Nova Scotia',
  'SAINT JOHN': 'New Brunswick', 'MONCTON': 'New Brunswick', 'FREDERICTON': 'New Brunswick',
  'ST. JOHN\'S': 'Newfoundland and Labrador', 'CORNER BROOK': 'Newfoundland and Labrador',
  'CHARLOTTETOWN': 'Prince Edward Island',
  'YELLOWKNIFE': 'Northwest Territories',
  'WHITEHORSE': 'Yukon',
  'IQALUIT': 'Nunavut'
};

/**
 * Extract province from a location string
 * @param {string} location - Location string (e.g., "Edmonton, AB, Canada" or "Toronto")
 * @returns {string} Province name or 'Ontario' as default
 */
export function getProvinceFromLocation(location) {
  if (!location) return 'Ontario';
  
  const locationUpper = location.toUpperCase();
  
  // Check city names first (most specific)
  for (const [city, province] of Object.entries(CITY_TO_PROVINCE)) {
    if (locationUpper.includes(city)) {
      return province;
    }
  }
  
  // Check for province abbreviations with word boundaries
  for (const [abbr, fullName] of Object.entries(PROVINCE_ABBREVIATIONS)) {
    const abbrRegex = new RegExp(`\\b${abbr}\\b`);
    if (abbrRegex.test(locationUpper)) {
      return fullName;
    }
  }
  
  // Check for full province names
  for (const fullName of Object.values(PROVINCE_ABBREVIATIONS)) {
    if (locationUpper.includes(fullName.toUpperCase())) {
      return fullName;
    }
  }
  
  return 'Ontario'; // Default
}

/**
 * Get tax info for a province
 * @param {string} province - Province name
 * @returns {object} Tax info with rate, type, and label
 */
export function getTaxInfoForProvince(province) {
  if (!province) return PROVINCE_TAX_RATES['Ontario'];
  const normalized = province.trim();
  return PROVINCE_TAX_RATES[normalized] || PROVINCE_TAX_RATES['Ontario'];
}

/**
 * Calculate all fees and totals for a booking
 * @param {number} subtotal - Base amount (services + packages)
 * @param {string} eventLocation - Event location string
 * @param {object} commissionSettings - Settings with platformFeePercent, stripeFeePercent, stripeFeeFixed
 * @returns {object} Calculated fees and totals
 */
export function calculateBookingFees(subtotal, eventLocation, commissionSettings = {}) {
  const platformFeePercent = (commissionSettings.platformFeePercent || 5) / 100;
  const stripeFeePercent = (commissionSettings.stripeFeePercent || 2.9) / 100;
  const stripeFeeFixed = commissionSettings.stripeFeeFixed || 0.30;
  
  // Get province and tax info from event location
  const province = getProvinceFromLocation(eventLocation);
  const taxInfo = getTaxInfoForProvince(province);
  const taxPercent = taxInfo.rate / 100;
  
  // Calculate fees
  const platformFee = subtotal * platformFeePercent;
  const taxableAmount = subtotal + platformFee;
  const tax = taxableAmount * taxPercent;
  const stripeFee = (subtotal * stripeFeePercent) + stripeFeeFixed;
  const total = subtotal + platformFee + tax + stripeFee;
  
  return {
    subtotal,
    platformFee,
    platformFeePercent: commissionSettings.platformFeePercent || 5,
    tax,
    taxInfo,
    taxPercent: taxInfo.rate,
    province,
    stripeFee,
    stripeFeePercent: commissionSettings.stripeFeePercent || 2.9,
    stripeFeeFixed,
    total
  };
}

/**
 * Format currency value
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD'
  }).format(amount);
}
