import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import { apiGet, apiPost, apiDelete } from '../utils/api';
import { PageLayout } from '../components/PageWrapper';
import Header from '../components/Header';
import CategoriesNav from '../components/CategoryPills';
import VendorGrid from '../components/VendorGrid';
import VendorSection from '../components/VendorSection';
import VendorSectionSkeleton from '../components/VendorSectionSkeleton';
import MapView from '../components/MapView';
import ProfileModal from '../components/ProfileModal';
import FilterModal from '../components/FilterModal';
import SetupIncompleteBanner from '../components/SetupIncompleteBanner';
import MessagingWidget from '../components/MessagingWidget';
import AnnouncementDisplay from '../components/AnnouncementDisplay';
import Footer from '../components/Footer';
import MobileBottomNav from '../components/MobileBottomNav';
import { showBanner } from '../utils/helpers';
import { EditButton } from '../components/common/UIComponents';
import LocationSearchModal from '../components/LocationSearchModal';
import { normalizeLocation, getIPGeolocationServices } from '../utils/locationUtils';
import { useLocalization } from '../context/LocalizationContext';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed';
import { encodeVendorId } from '../utils/hashIds';

function IndexPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { formatDistance } = useLocalization();
  const { recentlyViewed, addToRecentlyViewed } = useRecentlyViewed();
  
  const [vendors, setVendors] = useState([]);
  const [filteredVendors, setFilteredVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  // Initialize category from URL params
  const [currentCategory, setCurrentCategory] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('category') || 'all';
  });
  const [favorites, setFavorites] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mapActive, setMapActive] = useState(true); // Map open by default
  const [currentPage, setCurrentPage] = useState(1);
  const [serverPageNumber, setServerPageNumber] = useState(1);
  const [serverTotalCount, setServerTotalCount] = useState(0);
  const [userLocation, setUserLocation] = useState(null);
  const [selectedVendorId, setSelectedVendorId] = useState(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sortBy, setSortBy] = useState('recommended');
  const [mobileMapOpen, setMobileMapOpen] = useState(false); // Mobile fullscreen map
  const [locationModalOpen, setLocationModalOpen] = useState(false); // Location search modal
  const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 768);
  
  // Progressive radius expansion state for "Load More Vendors"
  const [currentRadiusLevel, setCurrentRadiusLevel] = useState(0); // 0 = initial (50mi), 1 = 100mi, 2 = 200mi, etc.
  const [citySections, setCitySections] = useState([]); // Vendors grouped by city from expanded searches
  const [loadingExpansion, setLoadingExpansion] = useState(false);

  // Track mobile view for conditional rendering
  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Prevent background scrolling when mobile map overlay is open
  useEffect(() => {
    if (mobileMapOpen) {
      document.body.classList.add('modal-open');
      // Notify MobileBottomNav that map is open
      window.dispatchEvent(new CustomEvent('mobileMapOpened'));
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [mobileMapOpen]);

  // Listen for closeMobileMap event from MobileBottomNav
  useEffect(() => {
    const handleCloseMobileMap = () => {
      setMobileMapOpen(false);
    };
    window.addEventListener('closeMobileMap', handleCloseMobileMap);
    return () => window.removeEventListener('closeMobileMap', handleCloseMobileMap);
  }, []);
  
  // Vendor discovery sections state
  const [discoverySections, setDiscoverySections] = useState([]);
  const [loadingDiscovery, setLoadingDiscovery] = useState(true);
  
  // Filter lookup data for name-to-ID mapping
  const [filterLookups, setFilterLookups] = useState({
    eventTypes: [],
    cultures: [],
    subcategories: [],
    features: []
  });
  
  // Track initial mount to prevent duplicate loads
  const isInitialMount = useRef(true);
  const hasLoadedOnce = useRef(false);
  const isLoadingRef = useRef(false); // Prevent concurrent API calls
  const hasAppliedInitialFilters = useRef(false); // Prevent map from overwriting initial filtered results
  
  const vendorsPerPage = 12;
  const serverPageSize = 200;

  // Category metadata for category-based carousels - IDs match DB directly
  const categoryMeta = useMemo(() => ({
    'venue': { label: 'Venues', icon: 'fa-building', color: '#a855f7' },
    'photo': { label: 'Photographers', icon: 'fa-camera', color: '#06b6d4' },
    'video': { label: 'Videographers', icon: 'fa-video', color: '#0891b2' },
    'music': { label: 'Musicians', icon: 'fa-music', color: '#10b981' },
    'dj': { label: 'DJs', icon: 'fa-headphones', color: '#059669' },
    'catering': { label: 'Caterers', icon: 'fa-utensils', color: '#f59e0b' },
    'entertainment': { label: 'Entertainment', icon: 'fa-theater-masks', color: '#ef4444' },
    'experiences': { label: 'Experiences', icon: 'fa-star', color: '#f97316' },
    'decorations': { label: 'Decorators', icon: 'fa-palette', color: '#ec4899' },
    'beauty': { label: 'Beauty & Makeup', icon: 'fa-cut', color: '#be185d' },
    'cake': { label: 'Cakes & Desserts', icon: 'fa-birthday-cake', color: '#a855f7' },
    'transportation': { label: 'Transportation', icon: 'fa-car', color: '#3b82f6' },
    'planners': { label: 'Event Planners', icon: 'fa-clipboard-list', color: '#64748b' },
    'fashion': { label: 'Fashion & Attire', icon: 'fa-tshirt', color: '#7c3aed' },
    'stationery': { label: 'Stationery & Invitations', icon: 'fa-envelope', color: '#8b5cf6' }
  }), []);

  // Group vendors by category for category-based carousels
  const categorySections = useMemo(() => {
    if (!vendors || vendors.length === 0) return [];
    
    // Group vendors by their category
    const grouped = {};
    vendors.forEach(vendor => {
      const cat = (vendor.category || vendor.type || 'other').toLowerCase();
      if (!grouped[cat]) {
        grouped[cat] = [];
      }
      grouped[cat].push(vendor);
    });
    
    // Convert to array of sections, sorted by vendor count (most vendors first)
    // Only include categories with at least 1 vendor
    const sections = Object.entries(grouped)
      .filter(([cat, vendorList]) => vendorList.length > 0 && categoryMeta[cat])
      .map(([cat, vendorList]) => ({
        id: `category-${cat}`,
        category: cat,
        title: categoryMeta[cat]?.label || cat.charAt(0).toUpperCase() + cat.slice(1),
        icon: categoryMeta[cat]?.icon || 'fa-store',
        color: categoryMeta[cat]?.color || '#6366f1',
        vendors: vendorList.slice(0, 12) // Limit to 12 per category carousel
      }))
      .sort((a, b) => b.vendors.length - a.vendors.length);
    
    return sections;
  }, [vendors, categoryMeta]);

  // Filters state - location and vendor attributes (initialize from URL)
  const [filters, setFilters] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    
    // Also check for eventDate param (from search bar) and map to availabilityDate
    const eventDate = params.get('eventDate') || params.get('availabilityDate') || '';
    const startTime = params.get('startTime') || '';
    const endTime = params.get('endTime') || '';
    
    // Store in sessionStorage if date params exist in URL (for VendorCard to read)
    if (eventDate) {
      sessionStorage.setItem('searchDateParams', JSON.stringify({
        date: eventDate,
        endDate: eventDate,
        startTime: startTime,
        endTime: endTime
      }));
    }
    
    // Normalize location to "City, Province" format (remove country if present)
    const rawLocation = params.get('location') || '';
    
    return {
      location: normalizeLocation(rawLocation),
      eventTypes: params.get('eventTypes') ? params.get('eventTypes').split(',').map(id => parseInt(id)).filter(id => !isNaN(id)) : [],
      cultures: params.get('cultures') ? params.get('cultures').split(',').map(id => parseInt(id)).filter(id => !isNaN(id)) : [],
      subcategories: params.get('subcategories') ? params.get('subcategories').split(',').map(id => parseInt(id)).filter(id => !isNaN(id)) : [],
      features: params.get('features') ? params.get('features').split(',').map(id => parseInt(id)).filter(id => !isNaN(id)) : [],
      experienceRange: params.get('experienceRange') || '',
      serviceLocation: params.get('serviceLocation') || '',
      minPrice: params.get('minPrice') ? parseInt(params.get('minPrice')) : null,
      maxPrice: params.get('maxPrice') ? parseInt(params.get('maxPrice')) : null,
      instantBookingOnly: params.get('instantBookingOnly') === 'true',
      minRating: params.get('minRating') || '',
      // NEW: Enhanced filter parameters
      minReviewCount: params.get('minReviewCount') || '',
      freshListingsDays: params.get('freshListingsDays') || '',
      hasGoogleReviews: params.get('hasGoogleReviews') === 'true',
      availabilityDate: eventDate,
      availabilityDayOfWeek: params.get('availabilityDayOfWeek') || '',
      eventDate: eventDate,
      startTime: startTime,
      endTime: endTime
    };
  });
  
  // Sync filters to URL when they change - use names for readability
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    
    // Helper to convert IDs to names for URL display
    const getEventTypeNames = (ids) => {
      return ids.map(id => {
        const et = filterLookups.eventTypes.find(e => e.EventTypeID === id);
        return et ? et.EventTypeName : id;
      }).join(',');
    };
    const getCultureNames = (ids) => {
      return ids.map(id => {
        const c = filterLookups.cultures.find(c => c.CultureID === id);
        return c ? c.CultureName : id;
      }).join(',');
    };
    const getSubcategoryNames = (ids) => {
      return ids.map(id => {
        const s = filterLookups.subcategories.find(s => s.SubcategoryID === id);
        return s ? s.SubcategoryName : id;
      }).join(',');
    };
    const getFeatureNames = (ids) => {
      return ids.map(id => {
        const f = filterLookups.features.find(f => f.id === id);
        return f ? f.name : id;
      }).join(',');
    };
    
    // Update URL params based on filters - use names if lookups are loaded
    if (filters.eventTypes && filters.eventTypes.length > 0) {
      const value = filterLookups.eventTypes.length > 0 ? getEventTypeNames(filters.eventTypes) : filters.eventTypes.join(',');
      params.set('eventTypes', value);
    } else {
      params.delete('eventTypes');
    }
    if (filters.cultures && filters.cultures.length > 0) {
      const value = filterLookups.cultures.length > 0 ? getCultureNames(filters.cultures) : filters.cultures.join(',');
      params.set('cultures', value);
    } else {
      params.delete('cultures');
    }
    if (filters.subcategories && filters.subcategories.length > 0) {
      const value = filterLookups.subcategories.length > 0 ? getSubcategoryNames(filters.subcategories) : filters.subcategories.join(',');
      params.set('subcategories', value);
    } else {
      params.delete('subcategories');
    }
    if (filters.features && filters.features.length > 0) {
      const value = filterLookups.features.length > 0 ? getFeatureNames(filters.features) : filters.features.join(',');
      params.set('features', value);
    } else {
      params.delete('features');
    }
    if (filters.experienceRange) {
      params.set('experienceRange', filters.experienceRange);
    } else {
      params.delete('experienceRange');
    }
    if (filters.serviceLocation) {
      params.set('serviceLocation', filters.serviceLocation);
    } else {
      params.delete('serviceLocation');
    }
    if (filters.minPrice) {
      params.set('minPrice', String(filters.minPrice));
    } else {
      params.delete('minPrice');
    }
    if (filters.maxPrice && filters.maxPrice < 5000) {
      params.set('maxPrice', String(filters.maxPrice));
    } else {
      params.delete('maxPrice');
    }
    if (filters.instantBookingOnly) {
      params.set('instantBookingOnly', 'true');
    } else {
      params.delete('instantBookingOnly');
    }
    if (filters.minRating) {
      params.set('minRating', filters.minRating);
    } else {
      params.delete('minRating');
    }
    // NEW: Enhanced filter parameters
    if (filters.minReviewCount) {
      params.set('minReviewCount', filters.minReviewCount);
    } else {
      params.delete('minReviewCount');
    }
    if (filters.freshListingsDays) {
      params.set('freshListingsDays', filters.freshListingsDays);
    } else {
      params.delete('freshListingsDays');
    }
    if (filters.hasGoogleReviews) {
      params.set('hasGoogleReviews', 'true');
    } else {
      params.delete('hasGoogleReviews');
    }
    // Remove legacy availabilityDate - we now use eventDate from search bar
    params.delete('availabilityDate');
    if (filters.availabilityDayOfWeek) {
      params.set('availabilityDayOfWeek', filters.availabilityDayOfWeek);
    } else {
      params.delete('availabilityDayOfWeek');
    }
    // Search bar filters
    if (filters.location) {
      params.set('location', filters.location);
    } else {
      params.delete('location');
    }
    // Only add eventDate if user selected a specific date (not "Anytime")
    if (filters.eventDate) {
      params.set('eventDate', filters.eventDate);
      // Only add times if eventDate is set
      if (filters.startTime) {
        params.set('startTime', filters.startTime);
      } else {
        params.delete('startTime');
      }
      if (filters.endTime) {
        params.set('endTime', filters.endTime);
      } else {
        params.delete('endTime');
      }
      // Add timezone if set
      if (filters.timezone) {
        params.set('timezone', filters.timezone);
      } else {
        params.delete('timezone');
      }
    } else {
      params.delete('eventDate');
      params.delete('startTime');
      params.delete('endTime');
      params.delete('timezone');
    }
    
    // Update URL without triggering navigation
    const newUrl = params.toString() ? `${location.pathname}?${params.toString()}` : location.pathname;
    window.history.replaceState({}, '', newUrl);
  }, [filters, filterLookups, location.pathname, location.search]);

  const loadFavorites = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const response = await apiGet(`/favorites/user/${currentUser.id}`);
      if (response.ok) {
        const data = await response.json();
        setFavorites(data.favorites || []);
      }
    } catch (error) {
      console.error('Failed to load favorites:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  // Load filter lookups for name-to-ID mapping
  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const [eventTypesRes, culturesRes, subcategoriesRes, featuresRes] = await Promise.all([
          fetch(`${API_BASE_URL}/vendors/lookup/event-types`),
          fetch(`${API_BASE_URL}/vendors/lookup/cultures`),
          fetch(`${API_BASE_URL}/vendors/lookup/subcategories`),
          fetch(`${API_BASE_URL}/vendors/features/all-grouped`)
        ]);
        
        const lookups = { eventTypes: [], cultures: [], subcategories: [], features: [] };
        
        if (eventTypesRes.ok) {
          const data = await eventTypesRes.json();
          lookups.eventTypes = data.eventTypes || [];
        }
        if (culturesRes.ok) {
          const data = await culturesRes.json();
          lookups.cultures = data.cultures || [];
        }
        if (subcategoriesRes.ok) {
          const data = await subcategoriesRes.json();
          lookups.subcategories = data.subcategories || [];
        }
        if (featuresRes.ok) {
          const data = await featuresRes.json();
          // Flatten features from categories and deduplicate by name
          const featureMap = new Map();
          (data.categories || []).forEach(cat => {
            (cat.features || []).forEach(f => {
              const name = f.FeatureName || f.featureName;
              const id = f.FeatureID || f.featureId;
              if (!featureMap.has(name)) {
                featureMap.set(name, { id, name });
              }
            });
          });
          lookups.features = Array.from(featureMap.values());
        }
        
        setFilterLookups(lookups);
      } catch (error) {
        console.error('Error fetching filter lookups:', error);
      }
    };
    
    fetchLookups();
  }, []);

  // Location session duration in hours (default 24 hours, can be configured via admin)
  const LOCATION_SESSION_HOURS = parseInt(localStorage.getItem('planbeau_location_session_hours') || '24', 10);
  
  // Helper to get saved location with expiration check
  const getSavedLocation = useCallback(() => {
    const savedData = localStorage.getItem('userSelectedLocation');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        // Check if location has expired
        if (parsed.expiresAt && new Date(parsed.expiresAt) > new Date()) {
          return parsed;
        } else {
          // Expired, remove it
          localStorage.removeItem('userSelectedLocation');
        }
      } catch { /* ignore */ }
    }
    return null;
  }, []);
  
  // Helper to save location with expiration
  const saveUserLocation = useCallback((locationData) => {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + LOCATION_SESSION_HOURS);
    const dataToSave = {
      ...locationData,
      expiresAt: expiresAt.toISOString(),
      savedAt: new Date().toISOString()
    };
    localStorage.setItem('userSelectedLocation', JSON.stringify(dataToSave));
  }, [LOCATION_SESSION_HOURS]);
  
  // State for detected city name from IP geolocation
  // Check localStorage first for user-entered location
  const [detectedCity, setDetectedCity] = useState(() => {
    const savedLocation = localStorage.getItem('userSelectedLocation');
    if (savedLocation) {
      try {
        const parsed = JSON.parse(savedLocation);
        // Check expiration
        if (parsed.expiresAt && new Date(parsed.expiresAt) > new Date()) {
          // Normalize to "City, Province" format (remove country if present)
          const rawCity = parsed.city || '';
          return normalizeLocation(rawCity);
        }
      } catch { return ''; }
    }
    return '';
  });
  
  // Initialize userLocation from localStorage if available and not expired
  useEffect(() => {
    const savedLocation = getSavedLocation();
    if (savedLocation && savedLocation.lat && savedLocation.lng) {
      setUserLocation(savedLocation);
      // Normalize location to "City, Province" format
      const normalizedCity = normalizeLocation(savedLocation.city || '');
      setFilters(prev => ({ ...prev, location: normalizedCity }));
      setDetectedCity(normalizedCity.split(',')[0].trim());
    }
  }, [getSavedLocation]);
  
  // Auto-detect user's city using IP geolocation (no permission required)
  // Using IP-based services first (no permission needed), then browser geolocation for accuracy
  const detectCityFromIP = useCallback(async () => {
    // Skip IP lookup if user has already selected a location this session (and it hasn't expired)
    const savedLocation = getSavedLocation();
    if (savedLocation) {
      return; // User-selected location takes priority
    }
    // Use centralized IP geolocation services
    const geoServices = getIPGeolocationServices(API_BASE_URL);

    for (const service of geoServices) {
      try {
        const response = await fetch(service.url);
        if (response.ok) {
          const data = await response.json();
          const parsed = service.parse(data);
          if (parsed && parsed.lat && parsed.lng) {
            setDetectedCity(parsed.city);
            setUserLocation({
              lat: parsed.lat,
              lng: parsed.lng,
              city: parsed.formattedLocation
            });
            setFilters(prev => ({ ...prev, location: parsed.formattedLocation }));
            return; // Success, exit loop
          }
        }
      } catch (error) {
        continue;
      }
    }
  }, []);

  const tryGetUserLocation = useCallback(() => {
    // First try IP-based geolocation (no permission needed)
    detectCityFromIP();
    
    // Then try browser geolocation for more accuracy (requires permission)
    if (navigator.geolocation && !userLocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation(prev => ({
            ...prev,
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }));
        },
        () => {}
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detectCityFromIP]);

  // Discovery sections are now loaded from the same /vendors endpoint
  // No separate API call needed - they come from the unified query
  const loadDiscoverySections = useCallback(async (overrideFilters = null) => {
    // This function is now a no-op - discovery sections are loaded with vendors
    // Keeping for backwards compatibility with any code that calls it directly
  }, []);

  // Handler for map bounds change - search as user drags map
  const handleMapBoundsChange = useCallback(async (boundsData) => {
    // Skip if we haven't applied initial filters yet - let loadVendors handle the first load
    if (!hasAppliedInitialFilters.current) {
      console.log('[handleMapBoundsChange] Skipping - initial filters not yet applied');
      return;
    }
    
    // Calculate radius based on map bounds (approximate)
    // ~69 miles per degree latitude - use the full visible area
    const latDiff = Math.abs(boundsData.bounds.north - boundsData.bounds.south);
    const calculatedRadius = Math.round(latDiff * 69 / 2);
    
    // For very zoomed out views (country/continent level), use a very large radius
    // Canada is ~3000 miles wide, so we need to support large radii
    // Zoom level ~4-5 = country view, ~6-7 = province view, ~10+ = city view
    const isCountryView = boundsData.zoom <= 5;
    const isProvinceView = boundsData.zoom <= 7 && boundsData.zoom > 5;
    
    let radiusMiles;
    let pageSize;
    
    if (isCountryView) {
      // Country-wide view - fetch all vendors nationwide
      radiusMiles = 3000; // Cover entire country
      pageSize = 500; // Get lots of vendors
    } else if (isProvinceView) {
      // Province/state view
      radiusMiles = Math.min(1000, Math.max(200, calculatedRadius));
      pageSize = 300;
    } else {
      // City/local view
      radiusMiles = Math.min(200, Math.max(10, calculatedRadius));
      pageSize = radiusMiles > 50 ? 150 : 100;
    }
    
    // Show loading state while fetching
    setLoading(true);
    setLoadingDiscovery(true);
    
    // Fetch vendors within the map bounds using coordinates directly
    try {
      const qp = new URLSearchParams();
      qp.set('latitude', String(boundsData.center.lat));
      qp.set('longitude', String(boundsData.center.lng));
      qp.set('radiusMiles', String(radiusMiles));
      qp.set('pageSize', String(pageSize));
      qp.set('includeDiscoverySections', 'true'); // Include discovery sections
      
      if (currentCategory && currentCategory !== 'all') {
        qp.set('category', currentCategory);
      }
      
      // Include active filters from FilterModal
      if (filters.eventTypes && filters.eventTypes.length > 0) {
        qp.set('eventTypes', filters.eventTypes.join(','));
      }
      if (filters.cultures && filters.cultures.length > 0) {
        qp.set('cultures', filters.cultures.join(','));
      }
      if (filters.subcategories && filters.subcategories.length > 0) {
        qp.set('subcategoryIds', filters.subcategories.join(','));
      }
      if (filters.features && filters.features.length > 0) {
        qp.set('featureIds', filters.features.join(','));
      }
      if (filters.experienceRange) {
        qp.set('experienceRange', filters.experienceRange);
      }
      if (filters.serviceLocation) {
        qp.set('serviceLocation', filters.serviceLocation);
      }
      if (filters.instantBookingOnly) {
        qp.set('instantBookingOnly', 'true');
      }
      if (filters.minPrice) {
        qp.set('minPrice', String(filters.minPrice));
      }
      if (filters.maxPrice && filters.maxPrice < 5000) {
        qp.set('maxPrice', String(filters.maxPrice));
      }
      if (filters.minRating) {
        qp.set('minRating', String(filters.minRating));
      }
      // NEW: Enhanced filter parameters for map bounds
      if (filters.minReviewCount) {
        qp.set('minReviewCount', filters.minReviewCount);
      }
      if (filters.freshListingsDays) {
        qp.set('freshListingsDays', filters.freshListingsDays);
      }
      if (filters.hasGoogleReviews) {
        qp.set('hasGoogleReviews', 'true');
      }
      if (filters.availabilityDate) {
        qp.set('availabilityDate', filters.availabilityDate);
      }
      if (filters.availabilityDayOfWeek) {
        qp.set('availabilityDayOfWeek', filters.availabilityDayOfWeek);
      }
      
      const searchUrl = `${API_BASE_URL}/vendors?${qp.toString()}`;
      
      const vendorResponse = await fetch(searchUrl);
      if (vendorResponse.ok) {
        const data = await vendorResponse.json();
        const newVendors = data.vendors || data.data || data || [];
        
        // Try to get city from first vendor's location
        let mapCity = 'this area';
        if (newVendors.length > 0) {
          const firstVendor = newVendors[0];
          mapCity = firstVendor.City || firstVendor.city || firstVendor.Location || 'this area';
        }
        
        // Update detected city and user location
        setDetectedCity(mapCity);
        setUserLocation({
          lat: boundsData.center.lat,
          lng: boundsData.center.lng,
          city: mapCity
        });
        
        // Clear the search bar location filter so it doesn't show fixed city
        setFilters(prev => ({ ...prev, location: '' }));
        
        // Always update vendors, even if empty (to show "no vendors" message)
        setVendors(newVendors);
        setFilteredVendors(newVendors);
        
        // Update the vendor count display
        setServerTotalCount(data.totalCount || newVendors.length);
        
        // Update discovery sections if available in response
        if (data.discoverySections && Array.isArray(data.discoverySections)) {
          setDiscoverySections(data.discoverySections);
        } else if (newVendors.length > 0) {
          // Create basic discovery sections from the vendors
          const sections = [
            {
              id: 'nearby',
              title: `Vendors Near ${mapCity}`,
              type: 'nearby',
              vendors: newVendors.slice(0, 8)
            }
          ];
          setDiscoverySections(sections);
        }
      } else {
        console.error('🗺️ API error:', vendorResponse.status, vendorResponse.statusText);
      }
    } catch (fetchError) {
      console.error('Error fetching vendors for map bounds:', fetchError);
    } finally {
      setLoading(false);
      setLoadingDiscovery(false);
    }
  }, [currentCategory, filters.eventTypes, filters.cultures, filters.experienceRange, filters.serviceLocation, filters.instantBookingOnly, filters.minPrice, filters.maxPrice, filters.minRating, filters.minReviewCount, filters.freshListingsDays, filters.hasGoogleReviews, filters.availabilityDate, filters.availabilityDayOfWeek]);

  // EXACT match to original applyClientSideFilters (line 26091-26120)
  const applyClientSideFiltersInternal = useCallback((vendorsToFilter) => {
    console.log('[applyClientSideFiltersInternal] Input vendors:', vendorsToFilter.length, 'currentCategory:', currentCategory, 'filters.location:', filters.location);
    const filtered = vendorsToFilter.filter(vendor => {
      // Category filter - check both category and type fields
      if (currentCategory !== 'all') {
        const vendorCategory = vendor.category || vendor.type || '';
        if (vendorCategory !== currentCategory) {
          return false;
        }
      }
      
      // Location filter - ALWAYS apply city filter when location is set
      // Extract just the city name (first part before comma) for matching
      if (filters.location) {
        const cityOnly = filters.location.split(',')[0].trim().toLowerCase();
        // Check both lowercase and uppercase property names (API returns lowercase, some code uses uppercase)
        const vendorCity = (vendor.city || vendor.City || '').toLowerCase();
        if (!vendorCity.includes(cityOnly)) {
          return false;
        }
      }
      
      return true;
    });
    
    console.log('[applyClientSideFiltersInternal] Output filtered vendors:', filtered.length);
    setFilteredVendors(filtered);
    setCurrentPage(1); // Reset to first page (line 26112)
  }, [currentCategory, filters.location, userLocation]);

  const loadVendors = useCallback(async (append = false) => {
    // Prevent concurrent API calls
    if (isLoadingRef.current) return;
    
    isLoadingRef.current = true;
    
    try {
      if (!append) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      const hasCategoryQuery = currentCategory && currentCategory !== 'all';
      const nextPage = append ? serverPageNumber + 1 : 1;
      const hasUserLocation = userLocation?.lat && userLocation?.lng;
      
      let url = '';
      
      // Helper to add attribute filters to query params
      const addAttributeFilters = (qp) => {
        if (filters.minPrice) qp.set('minPrice', filters.minPrice);
        if (filters.maxPrice && filters.maxPrice < 10000) qp.set('maxPrice', filters.maxPrice);
        if (filters.minRating) qp.set('minRating', filters.minRating);
        if (filters.instantBookingOnly) qp.set('instantBookingOnly', 'true');
        if (filters.eventTypes && filters.eventTypes.length > 0) {
          qp.set('eventTypes', filters.eventTypes.join(','));
        }
        if (filters.cultures && filters.cultures.length > 0) {
          qp.set('cultures', filters.cultures.join(','));
        }
        if (filters.subcategories && filters.subcategories.length > 0) {
          qp.set('subcategoryIds', filters.subcategories.join(','));
        }
        if (filters.features && filters.features.length > 0) {
          qp.set('featureIds', filters.features.join(','));
        }
        if (filters.experienceRange) qp.set('experienceRange', filters.experienceRange);
        if (filters.serviceLocation) qp.set('serviceLocation', filters.serviceLocation);
        // NEW: Enhanced filter parameters
        if (filters.minReviewCount) qp.set('minReviewCount', filters.minReviewCount);
        if (filters.freshListingsDays) qp.set('freshListingsDays', filters.freshListingsDays);
        if (filters.hasGoogleReviews) qp.set('hasGoogleReviews', 'true');
        if (filters.availabilityDate) qp.set('availabilityDate', filters.availabilityDate);
        if (filters.availabilityDayOfWeek) qp.set('availabilityDayOfWeek', filters.availabilityDayOfWeek);
      };

      if (hasCategoryQuery) {
        // Use /vendors/search-by-categories for category queries
        const qp = new URLSearchParams();
        qp.set('category', currentCategory);
        qp.set('pageNumber', String(nextPage));
        qp.set('pageSize', String(serverPageSize));
        
        // Add city filter if location is set - extract just the city name (first part before comma)
        if (filters.location) {
          const cityOnly = filters.location.split(',')[0].trim();
          qp.set('city', cityOnly);
        }
        
        // Add location coordinates if available
        if (hasUserLocation) {
          qp.set('latitude', String(userLocation.lat));
          qp.set('longitude', String(userLocation.lng));
          qp.set('radiusMiles', '50');
        }
        
        // Add attribute filters from FilterModal
        addAttributeFilters(qp);
        
        qp.set('includeDiscoverySections', 'true');
        qp.set('pageSize', '200');
        
        url = `${API_BASE_URL}/vendors/search-by-categories?${qp.toString()}`;
      } else {
        // Use regular /vendors endpoint
        const qp = new URLSearchParams();
        qp.set('pageNumber', String(nextPage));
        qp.set('pageSize', String(serverPageSize));
        
        // Add city filter if location is set - extract just the city name (first part before comma)
        if (filters.location) {
          const cityOnly = filters.location.split(',')[0].trim();
          qp.set('city', cityOnly);
        }
        
        // Add location coordinates if available
        if (hasUserLocation) {
          qp.set('latitude', String(userLocation.lat));
          qp.set('longitude', String(userLocation.lng));
          qp.set('radiusMiles', '50');
        }
        
        // Add attribute filters from FilterModal
        addAttributeFilters(qp);
        
        qp.set('includeDiscoverySections', 'true');
        qp.set('pageSize', '200');
        
        url = `${API_BASE_URL}/vendors?${qp.toString()}`;
      }
      
      console.log('[loadVendors] Fetching URL:', url);
      const response = await fetch(url);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', errorText);
        throw new Error('Failed to fetch vendors');
      }
      const data = await response.json();
      console.log('[loadVendors] API Response:', { vendorCount: data.vendors?.length, totalCount: data.totalCount });
      
      // Handle response EXACTLY like original (line 26238-26258)
      let newVendors = [];
      let totalCount = 0;
      
      if (hasCategoryQuery && Array.isArray(data.sections)) {
        // Response from /vendors/search-by-categories has sections
        newVendors = data.sections.flatMap(s => s?.vendors || []);
        
        // Deduplicate vendors by profile ID or id (EXACT match to line 26242-26250)
        const seen = new Set();
        const unique = [];
        for (const v of newVendors) {
          const k = v.vendorProfileId || v.VendorProfileID || v.id;
          if (k == null) { unique.push(v); continue; }
          if (!seen.has(k)) { seen.add(k); unique.push(v); }
        }
        newVendors = unique;
        
        // Sum section totals when available (line 26252-26254)
        try {
          totalCount = data.sections.reduce((acc, s) => acc + (s?.totalCount || (s?.vendors?.length || 0)), 0);
        } catch { 
          totalCount = newVendors.length; 
        }
        
        // Handle discovery sections from category search (filtered by category)
        // ALSO filter discovery section vendors by city
        if (data.discoverySections && Array.isArray(data.discoverySections)) {
          // Filter each section's vendors by city if location is set - extract just city name
          const cityFilter = filters.location ? filters.location.split(',')[0].trim().toLowerCase() : null;
          const filteredSections = data.discoverySections.map(section => ({
            ...section,
            vendors: cityFilter 
              ? section.vendors.filter(v => {
                  const vendorCity = (v.city || v.City || '').toLowerCase();
                  return vendorCity.includes(cityFilter);
                })
              : section.vendors
          })).filter(section => section.vendors.length > 0);
          setDiscoverySections(filteredSections);
          setLoadingDiscovery(false);
        }
      } else {
        // Regular /vendors response (line 26256-26258)
        newVendors = data.vendors || [];
        totalCount = data.totalCount || newVendors.length;
        
        // Handle discovery sections from unified endpoint
        // ALSO filter discovery section vendors by city
        if (data.discoverySections && Array.isArray(data.discoverySections)) {
          // Filter each section's vendors by city if location is set - extract just city name
          const cityFilter = filters.location ? filters.location.split(',')[0].trim().toLowerCase() : null;
          const filteredSections = data.discoverySections.map(section => ({
            ...section,
            vendors: cityFilter 
              ? section.vendors.filter(v => {
                  const vendorCity = (v.city || v.City || '').toLowerCase();
                  return vendorCity.includes(cityFilter);
                })
              : section.vendors
          })).filter(section => section.vendors.length > 0);
          setDiscoverySections(filteredSections);
          setLoadingDiscovery(false);
        }
      }
      // Always set loadingDiscovery to false after processing response
      setLoadingDiscovery(false);
      
      // EXACT match to original (line 26284-26300)
      let updatedVendors;
      if (append) {
        // Merge with existing and dedupe using Map (line 26285-26292)
        const merged = [...vendors, ...newVendors];
        const byId = new Map();
        for (const v of merged) {
          const key = v.vendorProfileId || v.VendorProfileID || v.id;
          byId.set(String(key || Math.random()), v);
        }
        updatedVendors = Array.from(byId.values());
        setVendors(updatedVendors);
        setServerPageNumber(nextPage);
      } else {
        updatedVendors = newVendors;
        setVendors(newVendors);
        setServerPageNumber(1);
      }
      setServerTotalCount(totalCount);
      
      // Apply client-side filters
      console.log('[loadVendors] Before client-side filter - updatedVendors:', updatedVendors.length);
      applyClientSideFiltersInternal(updatedVendors);
      console.log('[loadVendors] After client-side filter - filteredVendors will be set');
      
      // Mark that initial filters have been applied - now map can take over
      hasAppliedInitialFilters.current = true;
    } catch (error) {
      // Don't show error banner for aborted requests (happens during navigation/refresh)
      if (error.name === 'AbortError' || error.message?.includes('aborted')) {
        console.log('[loadVendors] Request aborted (likely page navigation)');
        return;
      }
      console.error('❌ Error loading vendors:', error);
      showBanner('Failed to load vendors', 'error');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      isLoadingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCategory, filters.location, filters.instantBookingOnly, filters.eventTypes, filters.cultures, filters.experienceRange, filters.serviceLocation, filters.minPrice, filters.maxPrice, filters.minRating, filters.minReviewCount, filters.freshListingsDays, filters.hasGoogleReviews, filters.availabilityDate, filters.availabilityDayOfWeek, userLocation, serverPageNumber]);

  // Radius levels for progressive expansion (in miles)
  const RADIUS_LEVELS = useMemo(() => [50, 100, 200, 400, 800], []);
  
  // Default location for expand search when user location is not available (Toronto, Canada)
  const DEFAULT_EXPAND_LOCATION = useMemo(() => ({ lat: 43.6532, lng: -79.3832 }), []);
  
  // Handle "Load More Vendors" - expands map radius and fetches vendors from surrounding cities
  // Works with or without user location permission
  const handleLoadMoreVendors = useCallback(async () => {
    // Use user location if available, otherwise use default location
    const searchLocation = (userLocation?.lat && userLocation?.lng) 
      ? userLocation 
      : DEFAULT_EXPAND_LOCATION;
    
    const nextLevel = currentRadiusLevel + 1;
    if (nextLevel >= RADIUS_LEVELS.length) {
      showBanner('Maximum search area reached', 'info');
      return;
    }
    
    setLoadingExpansion(true);
    
    try {
      const newRadius = RADIUS_LEVELS[nextLevel];
      const prevRadius = RADIUS_LEVELS[currentRadiusLevel];
      
      // Calculate zoom level based on radius (approximate)
      // 50mi ~ zoom 10, 100mi ~ zoom 9, 200mi ~ zoom 8, 400mi ~ zoom 7, 800mi ~ zoom 6
      const zoomLevels = [10, 9, 8, 7, 6];
      const newZoom = zoomLevels[nextLevel] || 6;
      
      // Trigger map zoom out via custom event
      window.dispatchEvent(new CustomEvent('expandMapRadius', { 
        detail: { 
          zoom: newZoom,
          center: { lat: searchLocation.lat, lng: searchLocation.lng }
        }
      }));
      
      // Fetch vendors in the expanded radius (excluding already loaded ones)
      const qp = new URLSearchParams();
      qp.set('latitude', String(searchLocation.lat));
      qp.set('longitude', String(searchLocation.lng));
      qp.set('radiusMiles', String(newRadius));
      qp.set('minRadiusMiles', String(prevRadius)); // Exclude inner radius already loaded
      qp.set('pageSize', '300');
      qp.set('includeDiscoverySections', 'false');
      qp.set('groupByCity', 'true'); // Request city-grouped response
      
      if (currentCategory && currentCategory !== 'all') {
        qp.set('category', currentCategory);
      }
      
      // Include active filters
      if (filters.eventTypes?.length > 0) qp.set('eventTypes', filters.eventTypes.join(','));
      if (filters.cultures?.length > 0) qp.set('cultures', filters.cultures.join(','));
      if (filters.experienceRange) qp.set('experienceRange', filters.experienceRange);
      if (filters.instantBookingOnly) qp.set('instantBookingOnly', 'true');
      if (filters.minPrice) qp.set('minPrice', String(filters.minPrice));
      if (filters.maxPrice && filters.maxPrice < 5000) qp.set('maxPrice', String(filters.maxPrice));
      if (filters.minRating) qp.set('minRating', String(filters.minRating));
      
      const response = await fetch(`${API_BASE_URL}/vendors?${qp.toString()}`);
      
      if (response.ok) {
        const data = await response.json();
        const newVendors = data.vendors || [];
        
        // Group vendors by city
        const vendorsByCity = {};
        newVendors.forEach(vendor => {
          const city = vendor.City || vendor.city || 'Other';
          if (!vendorsByCity[city]) {
            vendorsByCity[city] = [];
          }
          vendorsByCity[city].push(vendor);
        });
        
        // Convert to city sections array, sorted by vendor count
        // Merge with existing city sections instead of creating duplicates
        setCitySections(prev => {
          const cityMap = new Map();
          
          // Add existing city sections to map
          prev.forEach(section => {
            cityMap.set(section.city, {
              ...section,
              allVendors: [...section.vendors] // Keep track of all vendors
            });
          });
          
          // Merge new vendors into existing cities or create new sections
          Object.entries(vendorsByCity).forEach(([city, cityVendors]) => {
            if (cityVendors.length === 0) return;
            
            if (cityMap.has(city)) {
              // Merge with existing city section
              const existing = cityMap.get(city);
              const existingIds = new Set(existing.allVendors.map(v => 
                String(v.vendorProfileId || v.VendorProfileID || v.id)
              ));
              
              // Add only new vendors (not already in this city section)
              const newUniqueVendors = cityVendors.filter(v => {
                const id = String(v.vendorProfileId || v.VendorProfileID || v.id);
                return !existingIds.has(id);
              });
              
              existing.allVendors = [...existing.allVendors, ...newUniqueVendors];
              existing.vendors = existing.allVendors.slice(0, 12);
              existing.totalCount = existing.allVendors.length;
            } else {
              // Create new city section
              cityMap.set(city, {
                id: `city-${city.toLowerCase().replace(/\s+/g, '-')}`,
                title: `Vendors in ${city}`,
                city: city,
                vendors: cityVendors.slice(0, 12),
                allVendors: cityVendors,
                totalCount: cityVendors.length,
                radiusLevel: nextLevel
              });
            }
          });
          
          // Convert back to array and sort by vendor count
          return Array.from(cityMap.values())
            .sort((a, b) => b.totalCount - a.totalCount);
        });
        
        const newCityNames = Object.keys(vendorsByCity).filter(city => vendorsByCity[city].length > 0);
        
        // Also add new vendors to the main vendors list
        setVendors(prev => {
          const merged = [...prev, ...newVendors];
          // Deduplicate by vendor ID
          const byId = new Map();
          for (const v of merged) {
            const key = v.vendorProfileId || v.VendorProfileID || v.id;
            byId.set(String(key || Math.random()), v);
          }
          return Array.from(byId.values());
        });
        
        // Update filtered vendors too
        setFilteredVendors(prev => {
          const merged = [...prev, ...newVendors];
          const byId = new Map();
          for (const v of merged) {
            const key = v.vendorProfileId || v.VendorProfileID || v.id;
            byId.set(String(key || Math.random()), v);
          }
          return Array.from(byId.values());
        });
        
        // Update total count
        setServerTotalCount(prev => prev + newVendors.length);
        
        // Move to next radius level
        setCurrentRadiusLevel(nextLevel);
        
        if (newCityNames.length > 0) {
          const displayCities = newCityNames.slice(0, 3).join(', ');
          showBanner(`Found ${newVendors.length} more vendors in ${displayCities}${newCityNames.length > 3 ? ' and more' : ''}`, 'success');
        } else {
          showBanner('No additional vendors found in expanded area', 'info');
        }
      }
    } catch (error) {
      console.error('Error expanding search radius:', error);
      showBanner('Failed to load more vendors', 'error');
    } finally {
      setLoadingExpansion(false);
    }
  }, [userLocation, currentRadiusLevel, RADIUS_LEVELS, currentCategory, filters, showBanner, DEFAULT_EXPAND_LOCATION]);

  // Check if we can load more vendors (haven't reached max radius)
  // Now works without location permission - always show if not at max radius
  const canLoadMoreVendors = useMemo(() => {
    return currentRadiusLevel < RADIUS_LEVELS.length - 1;
  }, [currentRadiusLevel, RADIUS_LEVELS]);

  const initializePage = useCallback(async () => {
    if (hasLoadedOnce.current) {
      return; // Prevent duplicate initialization
    }
    hasLoadedOnce.current = true;
    
    tryGetUserLocation();
    if (currentUser) {
      loadFavorites();
    }
    await loadDiscoverySections();
    await loadVendors();
  }, [loadDiscoverySections, loadVendors, tryGetUserLocation, loadFavorites, currentUser, currentCategory]);

  // Note: Filter reload is handled by the useEffect below that watches specific filter properties
  // This ref is kept for tracking purposes only
  const filtersRef = useRef(filters);

  // Initialize page on mount - URL params are already loaded in useState initializers
  useEffect(() => {
    initializePage();
    
    // Set map-active class on initial load since map starts as true
    document.body.classList.add('map-active');
    const appContainer = document.getElementById('app-container');
    if (appContainer) appContainer.classList.add('map-active');
    
    // Mark initial mount as complete after first render
    const timer = setTimeout(() => {
      isInitialMount.current = false;
    }, 100);
    
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload favorites when user logs in/out
  useEffect(() => {
    if (currentUser?.id) {
      loadFavorites();
    } else {
      setFavorites([]);
    }
  }, [currentUser?.id, loadFavorites]);

  // Respond to URL parameter changes (e.g., when navigating from landing page)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlCategory = params.get('category') || 'all';
    const rawUrlLocation = params.get('location') || '';
    // Normalize location to "City, Province" format (remove country if present)
    const urlLocation = normalizeLocation(rawUrlLocation);
    const openMap = params.get('openMap') === 'true';
    
    // Handle openMap parameter from MobileBottomNav
    if (openMap) {
      setMobileMapOpen(true);
      // Remove the openMap param from URL to prevent re-triggering
      const newParams = new URLSearchParams(location.search);
      newParams.delete('openMap');
      const newUrl = newParams.toString() ? `${location.pathname}?${newParams.toString()}` : location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
    
    // If URL has old format with country, update it to normalized format
    if (rawUrlLocation && rawUrlLocation !== urlLocation) {
      const newParams = new URLSearchParams(location.search);
      newParams.set('location', urlLocation);
      const newUrl = `${location.pathname}?${newParams.toString()}`;
      window.history.replaceState({}, '', newUrl);
    }
    
    // Check if URL params differ from current state
    const categoryChanged = urlCategory !== currentCategory;
    const locationChanged = urlLocation !== filters.location;
    
    if (categoryChanged || locationChanged) {
      if (categoryChanged) {
        setCurrentCategory(urlCategory);
      }
      if (locationChanged) {
        setFilters(prev => ({ ...prev, location: urlLocation }));
      }
      
      // Reset loading state and reload vendors
      setLoading(true);
      setLoadingDiscovery(true);
      hasLoadedOnce.current = false; // Allow re-initialization
      isLoadingRef.current = false; // Reset loading ref
      
      // Reload vendors with new params
      setTimeout(() => {
        loadVendors();
      }, 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // Listen for dashboard open events from ProfileModal
  useEffect(() => {
    const handleOpenDashboard = (event) => {
      setProfileModalOpen(false);
      const section = event.detail?.section || 'dashboard';
      navigate(`/dashboard?section=${section}`);
    };
    
    window.addEventListener('openDashboard', handleOpenDashboard);
    return () => window.removeEventListener('openDashboard', handleOpenDashboard);
  }, [navigate]);

  useEffect(() => {
    // Skip on initial mount - initializePage handles the first load
    if (isInitialMount.current) {
      return;
    }
    
    if (currentCategory) {
      setLoading(true); // Show loading state when category changes
      setLoadingDiscovery(true); // Also show loading for discovery sections
      setServerPageNumber(1);
      // Reset expanded radius state when category changes
      setCurrentRadiusLevel(0);
      setCitySections([]);
      loadVendors();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCategory]);

  // Track if we're in the middle of an enhanced search to prevent useEffect from overwriting results
  const isEnhancedSearchRef = useRef(false);
  
  useEffect(() => {
    // Skip on initial mount - loadVendors already applies filters
    if (isInitialMount.current) {
      return;
    }
    
    // Skip if we just did an enhanced search - it already set filteredVendors directly
    // Keep the flag true until all state updates have settled
    if (isEnhancedSearchRef.current) {
      return;
    }
    
    if (vendors.length > 0) {
      applyClientSideFiltersInternal(vendors);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendors, filters, userLocation]);

  // Discovery sections are now loaded with vendors - this useEffect is kept for logging only
  useEffect(() => {
  }, [currentCategory, filters.location]);

  const handleCategoryChange = useCallback((category) => {
    setCurrentCategory(category);
    setCurrentPage(1);
    
    // Update URL with category parameter
    const params = new URLSearchParams(window.location.search);
    if (category && category !== 'all') {
      params.set('category', category);
    } else {
      params.delete('category');
    }
    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.pushState({}, '', newUrl);
  }, []);

  const handleSortChange = useCallback((e) => {
    const newSortBy = e.target.value;
    setSortBy(newSortBy);
    
    // Apply sorting to current vendors
    const sorted = [...filteredVendors];
    
    switch (newSortBy) {
      case 'price-low':
        sorted.sort((a, b) => {
          const priceA = a.PriceLevel || a.priceLevel || 0;
          const priceB = b.PriceLevel || b.priceLevel || 0;
          return priceA - priceB;
        });
        break;
      case 'price-high':
        sorted.sort((a, b) => {
          const priceA = a.PriceLevel || a.priceLevel || 0;
          const priceB = b.PriceLevel || b.priceLevel || 0;
          return priceB - priceA;
        });
        break;
      case 'rating':
        sorted.sort((a, b) => {
          const ratingA = a.AverageRating || a.averageRating || 0;
          const ratingB = b.AverageRating || b.averageRating || 0;
          return ratingB - ratingA;
        });
        break;
      case 'nearest':
        if (userLocation) {
          sorted.sort((a, b) => {
            const distA = a.Distance || a.distance || 999999;
            const distB = b.Distance || b.distance || 999999;
            return distA - distB;
          });
        }
        break;
      default:
        // 'recommended' - keep original order
        break;
    }
    
    setFilteredVendors(sorted);
  }, [filteredVendors, userLocation]);

  const handleFilterChange = useCallback((newFilters) => {
    // Handle all filter changes from FilterModal
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
    setServerPageNumber(1);
    // Reset expanded radius state when filters change (especially location)
    if (newFilters.location !== undefined) {
      setCurrentRadiusLevel(0);
      setCitySections([]);
    }
  }, []);

  // Reload vendors when attribute filters change (from FilterModal)
  const prevFiltersRef = useRef(filters);
  useEffect(() => {
    // Skip on initial mount
    if (!hasLoadedOnce.current) return;
    
    // Check if any attribute filter changed (not just location)
    const prev = prevFiltersRef.current;
    const attributeChanged = 
      prev.instantBookingOnly !== filters.instantBookingOnly ||
      prev.minRating !== filters.minRating ||
      prev.experienceRange !== filters.experienceRange ||
      prev.serviceLocation !== filters.serviceLocation ||
      prev.minPrice !== filters.minPrice ||
      prev.maxPrice !== filters.maxPrice ||
      JSON.stringify(prev.eventTypes) !== JSON.stringify(filters.eventTypes) ||
      JSON.stringify(prev.cultures) !== JSON.stringify(filters.cultures) ||
      JSON.stringify(prev.subcategories) !== JSON.stringify(filters.subcategories) ||
      JSON.stringify(prev.features) !== JSON.stringify(filters.features) ||
      // NEW: Enhanced filter change detection
      prev.minReviewCount !== filters.minReviewCount ||
      prev.freshListingsDays !== filters.freshListingsDays ||
      prev.hasGoogleReviews !== filters.hasGoogleReviews ||
      prev.availabilityDate !== filters.availabilityDate ||
      prev.availabilityDayOfWeek !== filters.availabilityDayOfWeek;
    
    prevFiltersRef.current = filters;
    
    if (attributeChanged) {
      console.log('[useEffect] Attribute filters changed, reloading vendors...');
      setLoading(true);
      loadVendors();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.instantBookingOnly, filters.eventTypes, filters.cultures, filters.subcategories, filters.features, filters.experienceRange, filters.serviceLocation, filters.minPrice, filters.maxPrice, filters.minRating, filters.minReviewCount, filters.freshListingsDays, filters.hasGoogleReviews, filters.availabilityDate, filters.availabilityDayOfWeek]);

  // Count active filters for badge display
  const activeFilterCount = useMemo(() => {
    return [
      filters.minPrice > 0 || (filters.maxPrice && filters.maxPrice < 10000),
      filters.minRating,
      filters.instantBookingOnly,
      filters.eventTypes?.length > 0,
      filters.cultures?.length > 0,
      filters.subcategories?.length > 0,
      filters.features?.length > 0,
      filters.experienceRange,
      filters.serviceLocation,
      // NEW: Enhanced filter counts
      filters.minReviewCount,
      filters.freshListingsDays,
      filters.hasGoogleReviews,
      filters.availabilityDate,
      filters.availabilityDayOfWeek
    ].filter(Boolean).length;
  }, [filters]);

  const handleToggleFavorite = useCallback(async (vendorId) => {
    if (!currentUser) {
      setProfileModalOpen(true);
      return;
    }
    try {
      const response = await apiPost('/favorites/toggle', { userId: currentUser.id, vendorProfileId: vendorId });
      if (!response.ok) throw new Error('Failed to toggle favorite');
      const result = await response.json();
      const isFavorite = result.IsFavorite;
      if (isFavorite) {
        setFavorites(prev => [...prev, vendorId]);
        showBanner('Vendor saved to your favorites', 'favorite', 'Added to Favorites!');
      } else {
        setFavorites(prev => prev.filter(id => id !== vendorId));
        showBanner('Vendor removed from favorites', 'favorite', 'Removed from Favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      showBanner('Failed to update favorites', 'error');
    }
  }, [currentUser]);

  const handleViewVendor = useCallback((vendorId) => {
    // Find the vendor data to add to recently viewed
    // Search across all vendor sources: filteredVendors, discoverySections, categorySections, citySections
    let vendor = filteredVendors.find(v => 
      String(v.vendorProfileId || v.VendorProfileID || v.id) === String(vendorId)
    );
    
    // Search in discovery sections if not found
    if (!vendor) {
      for (const section of discoverySections) {
        vendor = section.vendors?.find(v => 
          String(v.vendorProfileId || v.VendorProfileID || v.id) === String(vendorId)
        );
        if (vendor) break;
      }
    }
    
    // Search in category sections if not found
    if (!vendor) {
      for (const section of categorySections) {
        vendor = section.vendors?.find(v => 
          String(v.vendorProfileId || v.VendorProfileID || v.id) === String(vendorId)
        );
        if (vendor) break;
      }
    }
    
    // Search in city sections if not found
    if (!vendor) {
      for (const section of citySections) {
        vendor = section.vendors?.find(v => 
          String(v.vendorProfileId || v.VendorProfileID || v.id) === String(vendorId)
        );
        if (vendor) break;
      }
    }
    
    if (vendor) {
      addToRecentlyViewed(vendor);
    }
    
    // Build URL with search params if available
    const vendorUrl = `/vendor/${encodeVendorId(vendorId)}`;
    const urlParams = new URLSearchParams();
    if (filters.eventDate) {
      urlParams.set('eventDate', filters.eventDate);
    }
    if (filters.startTime) {
      urlParams.set('startTime', filters.startTime);
    }
    if (filters.endTime) {
      urlParams.set('endTime', filters.endTime);
    }
    const queryString = urlParams.toString();
    navigate(queryString ? `${vendorUrl}?${queryString}` : vendorUrl);
  }, [navigate, filteredVendors, discoverySections, categorySections, citySections, addToRecentlyViewed, filters.eventDate, filters.startTime, filters.endTime]);

  const handleHighlightVendor = useCallback((vendorId, highlight) => {
    if (window.highlightMapMarker) {
      window.highlightMapMarker(vendorId, highlight);
    }
  }, []);

  const handleVendorSelectFromMap = useCallback((vendorId) => {
    setSelectedVendorId(vendorId);
    const card = document.querySelector(`[data-vendor-id="${vendorId}"]`);
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const handleToggleFilters = useCallback(() => {
    setSidebarCollapsed(!sidebarCollapsed);
  }, [sidebarCollapsed]);

  const handleToggleMap = useCallback(() => {
    setMapActive(!mapActive);
    document.body.classList.toggle('map-active');
    const appContainer = document.getElementById('app-container');
    if (appContainer) {
      appContainer.classList.toggle('map-active');
    }
    // Use requestAnimationFrame to ensure DOM has updated before triggering resize
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'));
    });
  }, [mapActive]);

  const handleEnhancedSearch = useCallback(async (searchParams) => {
    // Mark that we're doing an enhanced search so useEffect doesn't overwrite our results
    isEnhancedSearchRef.current = true;
    
    try {
      const cityName = searchParams.location ? searchParams.location.split(',')[0].trim() : '';
      
      // Update userLocation if coordinates are provided (from LocationSearchModal)
      // This will cause the MapView to center on the new location
      if (searchParams.userLocation && searchParams.userLocation.latitude && searchParams.userLocation.longitude) {
        setUserLocation({
          lat: searchParams.userLocation.latitude,
          lng: searchParams.userLocation.longitude,
          city: searchParams.userLocation.city || cityName
        });
        setDetectedCity(cityName);
      }
      
      // Calculate day of week if date is provided
      let dayOfWeek = null;
      if (searchParams.date) {
        const date = new Date(searchParams.date);
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        dayOfWeek = days[date.getDay()];
      }
      
      // Update filters SYNCHRONOUSLY
      const newFilters = {
        ...filters,
        location: cityName || filters.location,
        eventDate: searchParams.date || null,
        endDate: searchParams.endDate || null,
        dayOfWeek: dayOfWeek || null,
        startTime: searchParams.startTime || null,
        endTime: searchParams.endTime || null,
        timezone: searchParams.timezone || null
      };
      
      // Store search date params in sessionStorage for passing to vendor profile/booking pages
      if (searchParams.date) {
        sessionStorage.setItem('searchDateParams', JSON.stringify({
          date: searchParams.date,
          endDate: searchParams.endDate || searchParams.date,
          startTime: searchParams.startTime || '',
          endTime: searchParams.endTime || '',
          timezone: searchParams.timezone || ''
        }));
      } else {
        sessionStorage.removeItem('searchDateParams');
      }
      
      // URL will be updated by the useEffect that syncs filters to URL
      setFilters(newFilters);
      setServerPageNumber(1);
      setLoading(true);
      
      // Reload immediately with new filters
      try {
        // Build query params
        const params = new URLSearchParams();
        params.set('page', '1');
        params.set('limit', '20');
        
        if (newFilters.location) {
          const cityOnly = newFilters.location.split(',')[0].trim();
          params.set('city', cityOnly);
        }
        if (newFilters.eventDate) params.set('eventDate', newFilters.eventDate);
        if (newFilters.dayOfWeek) params.set('dayOfWeek', newFilters.dayOfWeek);
        if (newFilters.startTime) params.set('startTime', newFilters.startTime);
        if (newFilters.endTime) params.set('endTime', newFilters.endTime);
        if (currentCategory && currentCategory !== 'all') params.set('category', currentCategory);
        
        const url = `${API_BASE_URL}/vendors?${params.toString()}`;
        
        // Fetch vendors
        const vendorsResponse = await fetch(url);
        const vendorsData = await vendorsResponse.json();
        
        if (vendorsData.success && vendorsData.vendors) {
          setVendors(vendorsData.vendors);
          setFilteredVendors(vendorsData.vendors);
          setServerTotalCount(vendorsData.totalCount || 0);
          
          // Update discovery sections with filtered vendors
          if (vendorsData.vendors.length > 0) {
            const filteredSections = [
              {
                id: 'trending',
                title: 'Trending Vendors',
                description: 'Popular vendors based on page views and engagement',
                vendors: vendorsData.vendors.slice(0, 10),
                showViewCount: true
              },
              {
                id: 'top-rated',
                title: 'Top Rated Vendors',
                description: 'Highest rated by customers',
                vendors: [...vendorsData.vendors].sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0)).slice(0, 10),
                showAnalyticsBadge: true,
                analyticsBadgeType: 'rating'
              }
            ];
            setDiscoverySections(filteredSections);
          } else {
            setDiscoverySections([]);
          }
          
          if (vendorsData.vendors.length === 0) {
            showBanner(`No vendors found in ${cityName} for the selected criteria`, 'info');
          } else {
            showBanner(`Found ${vendorsData.vendors.length} vendor${vendorsData.vendors.length !== 1 ? 's' : ''}`, 'success');
          }
          
          // Reset the enhanced search flag after React has processed all state updates
          setTimeout(() => {
            isEnhancedSearchRef.current = false;
          }, 100);
        }
        
        // Load discovery sections with the NEW filters (not stale state)
        await loadDiscoverySections(newFilters);
        
      } catch (error) {
        // Don't show error banner for aborted requests (happens during navigation/refresh)
        if (error.name === 'AbortError' || error.message?.includes('aborted')) {
          console.log('[handleEnhancedSearch] Request aborted (likely page navigation)');
          return;
        }
        console.error('Error loading vendors:', error);
        showBanner('Failed to load vendors', 'error');
      } finally {
        setLoading(false);
      }

    } catch (error) {
      // Don't show error banner for aborted requests (happens during navigation/refresh)
      if (error.name === 'AbortError' || error.message?.includes('aborted')) {
        console.log('[handleEnhancedSearch] Request aborted (likely page navigation)');
        return;
      }
      console.error('Enhanced search error:', error);
      showBanner('Search failed. Please try again.', 'error');
      setLoading(false);
      isEnhancedSearchRef.current = false;
    }
  }, [filters, currentCategory, loadDiscoverySections, showBanner]);

  // Show ALL vendors from filteredVendors (no client-side pagination, matches original)
  const currentVendors = filteredVendors;
  const hasMore = vendors.length < serverTotalCount;
  const showLoadMore = hasMore && !loading && filteredVendors.length > 0;
  
  return (
    <PageLayout variant="fullWidth" pageClassName="index-page">
      {/* Announcement Banners, Popups, and Toasts */}
      <AnnouncementDisplay />
      
      <Header 
        onSearch={handleEnhancedSearch} 
        onProfileClick={() => {
          if (currentUser) {
            navigate('/dashboard');
          } else {
            setProfileModalOpen(true);
          }
        }} 
        onWishlistClick={() => {
          if (currentUser) {
            navigate('/dashboard?section=favorites');
          } else {
            setProfileModalOpen(true);
          }
        }} 
        onChatClick={() => {
          if (currentUser) {
            const section = currentUser.isVendor ? 'vendor-messages' : 'messages';
            navigate(`/dashboard?section=${section}`);
          } else {
            setProfileModalOpen(true);
          }
        }} 
        onNotificationsClick={() => {}} 
      />
      <ProfileModal isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} />
      
      {/* Filter Modal */}
      <FilterModal
        isOpen={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        filters={filters}
        onFilterChange={handleFilterChange}
        vendorCount={serverTotalCount}
        category={currentCategory}
        city={filters.location || detectedCity}
        userLocation={userLocation}
      />
      
      <LocationSearchModal
        isOpen={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        onApply={(locationData) => {
          setLocationModalOpen(false);
          if (locationData.location) {
            // Update filters with new location
            handleFilterChange({ location: locationData.location });
            setDetectedCity(locationData.location.split(',')[0].trim());
            // Update user location coordinates if provided
            if (locationData.coordinates) {
              const newLocation = {
                lat: locationData.coordinates.lat,
                lng: locationData.coordinates.lng,
                city: locationData.location
              };
              setUserLocation(newLocation);
              // Save to localStorage with expiration so it persists during session
              saveUserLocation(newLocation);
            }
          }
        }}
        onUseCurrentLocation={() => {
          // Clear localStorage to allow IP lookup again
          localStorage.removeItem('userSelectedLocation');
          setLocationModalOpen(false);
          // Re-detect location from IP
          detectCityFromIP();
        }}
        initialLocation={normalizeLocation(detectedCity || filters.location || '')}
        initialRadius={filters.radius || 50}
      />
      {/* Category Navigation - pill style buttons with page-wrapper for alignment */}
      <div style={{ width: '100%', backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '12px 0' }}>
        <div className="page-wrapper">
          <CategoriesNav 
            activeCategory={currentCategory} 
            onCategoryChange={handleCategoryChange} 
            loading={loading} 
          />
        </div>
      </div>
      
      {/* Mobile Filter Buttons - BEFORE discovery sections */}
      {isMobileView && !loading && (
        <div className="mobile-filter-bar" style={{ 
          width: '100%', 
          padding: '10px 16px', 
          display: 'flex', 
          gap: '10px',
          backgroundColor: 'white'
        }}>
          {/* Filters Button */}
          <button
            onClick={() => setFilterModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 14px',
              border: activeFilterCount > 0 ? '2px solid #5086E8' : '1px solid #ddd',
              borderRadius: '8px',
              background: activeFilterCount > 0 ? '#eff6ff' : 'white',
              color: activeFilterCount > 0 ? '#5086E8' : '#222',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            <i className="fas fa-sliders-h" style={{ fontSize: '14px' }}></i>
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span style={{
                background: '#5086E8',
                color: 'white',
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 6px',
                borderRadius: '10px',
                minWidth: '18px',
                textAlign: 'center'
              }}>
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      )}
      
      {/* Setup Banner - MOBILE ONLY (before vendor sections) */}
      {isMobileView && currentUser?.isVendor && currentUser?.vendorProfileId && (
        <div style={{ padding: '12px 16px 0 16px' }}>
          <SetupIncompleteBanner 
            onContinueSetup={() => navigate('/dashboard?section=vendor-business-profile')}
          />
        </div>
      )}
      
      {/* Recently Viewed Carousel - MOBILE (at top of discoveries) */}
      {isMobileView && !loadingDiscovery && recentlyViewed.length > 0 && (
        <div className="vendor-recently-viewed-section-mobile" style={{ width: '100%', padding: 0, margin: 0 }}>
          <VendorSection
            title="Recently Viewed"
            description="Continue where you left off"
            vendors={recentlyViewed.slice(0, 12)}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            onViewVendor={handleViewVendor}
            onHighlightVendor={handleHighlightVendor}
            icon="fa-clock-rotate-left"
            sectionType="recently-viewed"
            cityFilter={detectedCity || filters.location}
            categoryFilter={currentCategory}
          />
        </div>
      )}
      
      {/* Vendor Discovery Sections - MOBILE ONLY (outside page-wrapper for full-width) */}
      {isMobileView && (filteredVendors.length > 0 || loading) && (
      <div className="vendor-discovery-sections-mobile" style={{ width: '100%', padding: 0, margin: 0 }}>
        {loadingDiscovery ? (
          <>
            <VendorSectionSkeleton />
            <VendorSectionSkeleton />
          </>
        ) : (
          discoverySections.length > 0 && discoverySections.map((section, index) => (
            <React.Fragment key={`mobile-${section.id}`}>
              <VendorSection
                title={section.title}
                description={section.description}
                vendors={section.vendors}
                favorites={favorites}
                onToggleFavorite={handleToggleFavorite}
                onViewVendor={handleViewVendor}
                onHighlightVendor={handleHighlightVendor}
                showViewCount={section.showViewCount || false}
                showResponseTime={section.showResponseTime || false}
                showAnalyticsBadge={section.showAnalyticsBadge || false}
                analyticsBadgeType={section.analyticsBadgeType || null}
                sectionType={section.type || section.id}
                cityFilter={detectedCity || filters.location}
                categoryFilter={currentCategory}
              />
            </React.Fragment>
          ))
        )}
        
{/* Category-based carousels - MOBILE */}
        {!loadingDiscovery && categorySections.length > 0 && currentCategory === 'all' && (
          <>
            {categorySections.map((section) => (
              <React.Fragment key={`mobile-${section.id}`}>
                <VendorSection
                  title={section.title}
                  description=""
                  vendors={section.vendors}
                  favorites={favorites}
                  onToggleFavorite={handleToggleFavorite}
                  onViewVendor={handleViewVendor}
                  onHighlightVendor={handleHighlightVendor}
                  icon={section.icon}
                  sectionType={section.category}
                  cityFilter={detectedCity || filters.location}
                  categoryFilter={section.category}
                />
              </React.Fragment>
            ))}
          </>  
        )}
        
        {/* "Explore All" Carousel - MOBILE */}
        {!loadingDiscovery && currentVendors.length > 0 && (
          <>
            <VendorSection
              title="Explore All Vendors"
              description={`${serverTotalCount} vendors available`}
              vendors={currentVendors.slice(0, 12)}
              favorites={favorites}
              onToggleFavorite={handleToggleFavorite}
              onViewVendor={handleViewVendor}
              onHighlightVendor={handleHighlightVendor}
              icon="fa-store"
              sectionType="all"
              cityFilter={detectedCity || filters.location}
              categoryFilter={currentCategory}
            />
          </>
        )}
        
        {/* City-based carousels from expanded radius searches - MOBILE */}
        {citySections.length > 0 && (
          <div className="vendor-city-sections-mobile" style={{ marginTop: '16px', padding: '0 16px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              marginBottom: '12px',
              paddingBottom: '8px',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <i className="fas fa-map-marker-alt" style={{ color: '#5086E8', fontSize: '14px' }}></i>
              <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500 }}>
                Expanded to {formatDistance(RADIUS_LEVELS[currentRadiusLevel], { decimals: 0 })}
              </span>
            </div>
          </div>
        )}
        {citySections.map((section) => (
          <React.Fragment key={`mobile-${section.id}`}>
            <VendorSection
              title={section.title}
              description={section.totalCount > 12 ? `${section.totalCount} vendors` : ''}
              vendors={section.vendors}
              favorites={favorites}
              onToggleFavorite={handleToggleFavorite}
              onViewVendor={handleViewVendor}
              onHighlightVendor={handleHighlightVendor}
              icon="fa-city"
              sectionType={`city-${section.city}`}
              cityFilter={section.city}
              categoryFilter={currentCategory}
            />
          </React.Fragment>
        ))}
        
        {/* Load More Vendors Button - MOBILE */}
        {!loading && !loadingDiscovery && canLoadMoreVendors && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            padding: '24px 16px',
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '20px 24px',
              backgroundColor: '#f8fafc',
              borderRadius: '16px',
              border: '1px solid #e5e7eb',
              width: '100%'
            }}>
              <h3 style={{ 
                margin: '0 0 6px 0', 
                fontSize: '16px', 
                fontWeight: 600, 
                color: '#1f2937' 
              }}>
                Looking for more options?
              </h3>
              <p style={{ 
                margin: '0 0 16px 0', 
                fontSize: '13px', 
                color: '#6b7280',
                textAlign: 'center'
              }}>
                Expand your search to discover vendors nearby
              </p>
              
              {loadingExpansion ? (
                <div 
                  className="spinner spinner-blue" 
                  style={{ width: '44px', height: '44px' }}
                ></div>
              ) : (
                <button
                  onClick={handleLoadMoreVendors}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 20px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'white',
                    backgroundColor: '#5086E8',
                    border: 'none',
                    borderRadius: '25px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(80, 134, 232, 0.3)'
                  }}
                >
                  <i className="fas fa-search"></i>
                  <span>Load More Vendors</span>
                  <i className="fas fa-chevron-down" style={{ fontSize: '11px' }}></i>
                </button>
              )}
              
              <p style={{ 
                margin: '12px 0 0 0', 
                fontSize: '11px', 
                color: '#9ca3af',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <i className="fas fa-info-circle"></i>
                Map will zoom out to show more areas
              </p>
            </div>
          </div>
        )}
        
        {/* Max radius reached - MOBILE */}
        {!loading && !loadingDiscovery && !canLoadMoreVendors && citySections.length > 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: '16px',
            color: '#6b7280',
            fontSize: '13px'
          }}>
            <i className="fas fa-check-circle" style={{ color: '#10b981', marginRight: '6px' }}></i>
            All vendors within {formatDistance(RADIUS_LEVELS[RADIUS_LEVELS.length - 1], { decimals: 0 })} loaded
          </div>
        )}
      </div>
      )}
      
      {/* No vendors message - MOBILE */}
      {isMobileView && !loading && !loadingDiscovery && filteredVendors.length === 0 && (
        <div style={{ 
          padding: '60px 24px', 
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <i className="fas fa-store-slash" style={{ fontSize: '48px', color: '#9ca3af', marginBottom: '16px' }}></i>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600, color: '#374151' }}>No vendors to display</h3>
          <p style={{ margin: 0, fontSize: '14px', color: '#6b7280', maxWidth: '280px' }}>Try adjusting your filters or search in a different location</p>
        </div>
      )}
      
      <div className="page-wrapper" style={{ paddingTop: 0, paddingBottom: 0 }}>
      <div className={`app-container sidebar-collapsed ${mapActive ? 'map-active' : ''}`} id="app-container" style={{ display: 'flex', flexDirection: 'column', width: '100%', overflow: 'visible' }}>
        <div className="content-wrapper" style={{ display: 'flex', width: '100%', flex: 1, overflow: 'visible' }}>
          <main className="main-content index-main-content" style={{ width: mapActive ? '65%' : '100%', overflowY: 'auto', overflowX: 'visible', transition: 'width 0.3s ease', padding: '2rem 1.5rem 2rem 0' }}>
          {/* Only show setup banner for users who are vendors with a vendor profile - DESKTOP ONLY */}
          {!isMobileView && currentUser?.isVendor && currentUser?.vendorProfileId && (
            <>
              <SetupIncompleteBanner 
                onContinueSetup={() => navigate('/dashboard?section=vendor-business-profile')}
              />
            </>
          )}
          <div className="content-header">
            <div>
              <h1 className="results-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {loading ? (
                  <div className="skeleton" style={{ height: '32px', width: '280px', borderRadius: '8px' }}></div>
                ) : (
                  <>
                    <span>Vendors {detectedCity || filters.location ? 'Near ' + (detectedCity || filters.location) : 'Near You'}</span>
                    <EditButton
                      onClick={() => setLocationModalOpen(true)}
                      title="Change location"
                    />
                  </>
                )}
              </h1>
              <p className="results-count">{loading ? <span className="skeleton" style={{ display: 'inline-block', height: '16px', width: '150px', borderRadius: '6px', marginTop: '8px' }}></span> : `${serverTotalCount} vendors available`}</p>
            </div>
            <div className="view-controls">
              {!loading && (
                <>
                  {/* Filters Button - Desktop */}
                  <button
                    onClick={() => setFilterModalOpen(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 1rem',
                      border: activeFilterCount > 0 ? '2px solid #5086E8' : '1px solid var(--border)',
                      borderRadius: '8px',
                      background: activeFilterCount > 0 ? '#eff6ff' : 'white',
                      color: activeFilterCount > 0 ? '#5086E8' : 'var(--text)',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <i className="fas fa-sliders-h" style={{ fontSize: '0.875rem' }}></i>
                    <span>Filters</span>
                    {activeFilterCount > 0 && (
                      <span style={{
                        background: '#5086E8',
                        color: 'white',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '10px',
                        minWidth: '20px',
                        textAlign: 'center'
                      }}>
                        {activeFilterCount}
                      </span>
                    )}
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text)' }}>{mapActive ? 'Hide map' : 'Show map'}</span>
                    <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={mapActive} 
                        onChange={handleToggleMap}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: mapActive ? '#3b82f6' : '#E5E7EB',
                        borderRadius: '24px',
                        transition: 'background-color 0.3s',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '2px'
                      }}>
                        <span style={{
                          position: 'absolute',
                          height: '20px',
                          width: '20px',
                          left: mapActive ? '22px' : '2px',
                          backgroundColor: 'white',
                          borderRadius: '50%',
                          transition: 'left 0.3s',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}>
                        </span>
                      </span>
                    </label>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="map-overlay"></div>
          
          {/* Recently Viewed Carousel - DESKTOP (at top of discoveries) */}
          {!isMobileView && !loadingDiscovery && recentlyViewed.length > 0 && (
            <div className="vendor-recently-viewed-section" style={{ marginBottom: '16px' }}>
              <VendorSection
                title="Recently Viewed"
                description="Continue where you left off"
                vendors={recentlyViewed.slice(0, 12)}
                favorites={favorites}
                onToggleFavorite={handleToggleFavorite}
                onViewVendor={handleViewVendor}
                onHighlightVendor={handleHighlightVendor}
                icon="fa-clock-rotate-left"
                sectionType="recently-viewed"
                cityFilter={detectedCity || filters.location}
                categoryFilter={currentCategory}
              />
            </div>
          )}
          
          {/* Vendor Discovery Sections - DESKTOP ONLY (inside page-wrapper) */}
          {!isMobileView && (filteredVendors.length > 0 || loading) && (
          <div className="vendor-discovery-sections">
            {loadingDiscovery ? (
              <>
                <VendorSectionSkeleton />
                <VendorSectionSkeleton />
                <VendorSectionSkeleton />
              </>
            ) : (
              discoverySections.length > 0 && discoverySections.map((section, index) => (
                <React.Fragment key={section.id}>
                  <VendorSection
                    title={section.title}
                    description={section.description}
                    vendors={section.vendors}
                    favorites={favorites}
                    onToggleFavorite={handleToggleFavorite}
                    onViewVendor={handleViewVendor}
                    onHighlightVendor={handleHighlightVendor}
                    showViewCount={section.showViewCount || false}
                    showResponseTime={section.showResponseTime || false}
                    showAnalyticsBadge={section.showAnalyticsBadge || false}
                    analyticsBadgeType={section.analyticsBadgeType || null}
                    sectionType={section.type || section.id}
                    cityFilter={detectedCity || filters.location}
                    categoryFilter={currentCategory}
                  />
                </React.Fragment>
              ))
            )}
          </div>
          )}
          
          {/* No vendors message - DESKTOP */}
          {!isMobileView && !loading && !loadingDiscovery && filteredVendors.length === 0 && (
            <div style={{ 
              padding: '80px 24px', 
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i className="fas fa-store-slash" style={{ fontSize: '56px', color: '#9ca3af', marginBottom: '20px' }}></i>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '22px', fontWeight: 600, color: '#374151' }}>No vendors to display</h3>
              <p style={{ margin: 0, fontSize: '15px', color: '#6b7280', maxWidth: '360px' }}>Try adjusting your filters or search in a different location</p>
            </div>
          )}
          
          {/* Category-based carousels - DESKTOP */}
          {!isMobileView && !loadingDiscovery && categorySections.length > 0 && currentCategory === 'all' && (
            <div className="vendor-category-sections" style={{ marginTop: (discoverySections.length > 0 || recentlyViewed.length > 0) ? '16px' : '0' }}>
              {categorySections.map((section) => (
                <React.Fragment key={`desktop-${section.id}`}>
                  <VendorSection
                    title={section.title}
                    description=""
                    vendors={section.vendors}
                    favorites={favorites}
                    onToggleFavorite={handleToggleFavorite}
                    onViewVendor={handleViewVendor}
                    onHighlightVendor={handleHighlightVendor}
                    icon={section.icon}
                    sectionType={section.category}
                    cityFilter={detectedCity || filters.location}
                    categoryFilter={section.category}
                  />
                </React.Fragment>
              ))}
            </div>
          )}
          
          {/* "Explore All" Carousel - shows a sample of all vendors */}
          {!isMobileView && !loadingDiscovery && currentVendors.length > 0 && (
            <div className="vendor-all-section" style={{ marginTop: '16px' }}>
              <VendorSection
                title="Explore All Vendors"
                description={`${serverTotalCount} vendors available ${detectedCity || filters.location ? `near ${detectedCity || filters.location}` : 'near you'}`}
                vendors={currentVendors.slice(0, 12)}
                favorites={favorites}
                onToggleFavorite={handleToggleFavorite}
                onViewVendor={handleViewVendor}
                onHighlightVendor={handleHighlightVendor}
                icon="fa-store"
                sectionType="all"
                cityFilter={detectedCity || filters.location}
                categoryFilter={currentCategory}
              />
            </div>
          )}
          
          {/* City-based carousels from expanded radius searches - DESKTOP */}
          {!isMobileView && citySections.length > 0 && (
            <div className="vendor-city-sections" style={{ marginTop: '24px' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                marginBottom: '16px',
                paddingBottom: '12px',
                borderBottom: '1px solid #e5e7eb'
              }}>
                <i className="fas fa-map-marker-alt" style={{ color: '#5086E8' }}></i>
                <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: 500 }}>
                  Expanded search area ({formatDistance(RADIUS_LEVELS[currentRadiusLevel], { decimals: 0 })})
                </span>
              </div>
              {citySections.map((section) => (
                <React.Fragment key={section.id}>
                  <VendorSection
                    title={section.title}
                    description={section.totalCount > 12 ? `${section.totalCount} vendors available` : ''}
                    vendors={section.vendors}
                    favorites={favorites}
                    onToggleFavorite={handleToggleFavorite}
                    onViewVendor={handleViewVendor}
                    onHighlightVendor={handleHighlightVendor}
                    icon="fa-city"
                    sectionType={`city-${section.city}`}
                    cityFilter={section.city}
                    categoryFilter={currentCategory}
                  />
                </React.Fragment>
              ))}
            </div>
          )}
          
          {/* Load More Vendors Button - DESKTOP */}
          {!isMobileView && !loading && !loadingDiscovery && canLoadMoreVendors && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              padding: '32px 0',
              marginTop: '16px'
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '28px 40px',
                backgroundColor: '#f8fafc',
                borderRadius: '16px',
                border: '1px solid #e5e7eb',
                maxWidth: '500px',
                width: '100%'
              }}>
                <h3 style={{ 
                  margin: '0 0 8px 0', 
                  fontSize: '18px', 
                  fontWeight: 600, 
                  color: '#1f2937' 
                }}>
                  Looking for more options?
                </h3>
                <p style={{ 
                  margin: '0 0 20px 0', 
                  fontSize: '14px', 
                  color: '#6b7280',
                  textAlign: 'center'
                }}>
                  Expand your search to discover vendors in Surrounding Area
                </p>
                
                {loadingExpansion ? (
                  <div 
                    className="spinner spinner-blue" 
                    style={{ width: '48px', height: '48px' }}
                  ></div>
                ) : (
                  <button
                    onClick={handleLoadMoreVendors}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px 24px',
                      fontSize: '15px',
                      fontWeight: 600,
                      color: 'white',
                      backgroundColor: '#5086E8',
                      border: 'none',
                      borderRadius: '25px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 4px 12px rgba(80, 134, 232, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#4070D0';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(80, 134, 232, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#5086E8';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(80, 134, 232, 0.3)';
                    }}
                  >
                    <i className="fas fa-search"></i>
                    <span>Load More Vendors</span>
                    <i className="fas fa-chevron-down" style={{ fontSize: '12px', marginLeft: '4px' }}></i>
                  </button>
                )}
                
                <p style={{ 
                  margin: '16px 0 0 0', 
                  fontSize: '12px', 
                  color: '#9ca3af',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <i className="fas fa-info-circle"></i>
                  Map will zoom out to show more areas
                </p>
              </div>
            </div>
          )}
          
          {/* Max radius reached message - DESKTOP */}
          {!isMobileView && !loading && !loadingDiscovery && !canLoadMoreVendors && citySections.length > 0 && (
            <div style={{ 
              textAlign: 'center', 
              padding: '24px',
              color: '#6b7280',
              fontSize: '14px'
            }}>
              <i className="fas fa-check-circle" style={{ color: '#10b981', marginRight: '8px' }}></i>
              You've explored all vendors within {formatDistance(RADIUS_LEVELS[RADIUS_LEVELS.length - 1], { decimals: 0 })}
            </div>
          )}
          </main>
          <aside className="map-sidebar" style={{ 
            display: mapActive ? 'block' : 'none',
            width: mapActive ? '35%' : '0',
            height: 'calc(100vh - 64px)',
            position: 'sticky',
            top: '64px',
            borderLeft: 'none',
            transition: 'width 0.3s ease',
            overflow: 'hidden',
            alignSelf: 'flex-start',
            background: 'transparent'
          }}>
          <div className="map-sidebar-content">
            <MapView 
              vendors={filteredVendors} 
              onVendorSelect={handleVendorSelectFromMap} 
              selectedVendorId={selectedVendorId}
              loading={loading}
              userLocation={userLocation}
              onMapBoundsChange={handleMapBoundsChange}
            />
          </div>
          </aside>
        </div>
      </div>
      </div>
      
      {/* Mobile Map Button - Floating - Only show on Explore page when no modals/map are open */}
      {!profileModalOpen && !mobileMapOpen && (
        <button 
          className="mobile-map-button"
          onClick={() => setMobileMapOpen(true)}
        >
          <i className="fas fa-map"></i>
          <span>Show map</span>
        </button>
      )}
      
      {/* Mobile Fullscreen Map Overlay */}
      <div className={`mobile-map-overlay ${mobileMapOpen ? 'active' : ''}`}>
        <Header 
          onSearch={() => {}} 
          onProfileClick={() => currentUser ? navigate('/dashboard') : setProfileModalOpen(true)} 
          onWishlistClick={() => {
            if (currentUser) {
              navigate('/dashboard?section=favorites');
            } else {
              setProfileModalOpen(true);
            }
          }} 
          onChatClick={() => {
            if (currentUser) {
              const section = currentUser.isVendor ? 'vendor-messages' : 'messages';
              navigate(`/dashboard?section=${section}`);
            } else {
              setProfileModalOpen(true);
            }
          }} 
          onNotificationsClick={() => {}} 
        />
        <button 
          className="modal-close-btn"
          onClick={() => setMobileMapOpen(false)}
          aria-label="Close map"
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            zIndex: 1001
          }}
        >
          ×
        </button>
        <div className="map-content">
          <MapView 
            vendors={filteredVendors} 
            onVendorSelect={(vendor) => {
              setMobileMapOpen(false);
              handleVendorSelectFromMap(vendor);
            }} 
            selectedVendorId={selectedVendorId}
            loading={loading}
            userLocation={userLocation}
            onMapBoundsChange={handleMapBoundsChange}
          />
        </div>
      </div>
      
      <Footer />
      <MessagingWidget />
      <MobileBottomNav 
        onOpenDashboard={(section) => {
          const sectionMap = {
            'messages': currentUser?.isVendor ? 'vendor-messages' : 'messages',
            'dashboard': 'dashboard'
          };
          const targetSection = section ? (sectionMap[section] || section) : 'dashboard';
          navigate(`/dashboard?section=${targetSection}`);
        }}
        onCloseDashboard={() => {}}
        onOpenProfile={() => setProfileModalOpen(true)}
        onOpenMap={() => setMobileMapOpen(true)}
        onOpenMessages={() => {
          // Dispatch event to open messaging widget
          window.dispatchEvent(new CustomEvent('openMessagingWidget', { detail: {} }));
        }}
      />
    </PageLayout>
  );
}

export default IndexPage;
