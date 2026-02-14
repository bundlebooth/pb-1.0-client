import React, { useState, useEffect, useRef, useCallback } from 'react';
import UniversalModal from './UniversalModal';
import { API_BASE_URL } from '../config';

// Extract just the city name from "City, Province" format for API filtering
const extractCityName = (location) => {
  if (!location) return null;
  return location.split(',')[0].trim() || null;
};

// Number of items to show before "Show more"
const INITIAL_VISIBLE_COUNT = 10;

// Experience range options
const EXPERIENCE_RANGES = [
  { key: '0-1', label: 'Less than 1 year' },
  { key: '1-2', label: '1-2 years' },
  { key: '2-5', label: '2-5 years' },
  { key: '5-10', label: '5-10 years' },
  { key: '10-15', label: '10-15 years' },
  { key: '15+', label: '15+ years' }
];

// Service location options
const SERVICE_LOCATIONS = [
  { key: 'Local', label: 'Local (within city)' },
  { key: 'Regional', label: 'Regional (within province)' },
  { key: 'National', label: 'National (across Canada)' },
  { key: 'International', label: 'International' }
];

// Tag Button Component for filter options - matches SelectableTile style exactly
const CheckboxTile = ({ label, checked, onChange }) => (
  <button
    type="button"
    onClick={onChange}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.375rem',
      padding: '0.5rem 0.75rem',
      borderRadius: '6px',
      border: '1px solid #e5e7eb',
      background: checked ? '#f3f4f6' : 'white',
      color: '#374151',
      fontSize: '0.875rem',
      fontWeight: 400,
      cursor: 'pointer',
      transition: 'all 0.15s ease',
      whiteSpace: 'nowrap'
    }}
  >
    {label}
    {checked && (
      <span style={{ 
        fontSize: '0.875rem', 
        color: '#9ca3af',
        marginLeft: '0.125rem'
      }}>×</span>
    )}
  </button>
);

// Blue Toggle Switch Component
const ToggleSwitch = ({ checked, onChange, label, description }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontWeight: 500, color: '#111827', marginBottom: '0.25rem' }}>{label}</div>
      {description && <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{description}</div>}
    </div>
    <button
      type="button"
      onClick={onChange}
      className="filter-toggle-switch"
      style={{
        backgroundColor: checked ? '#4F86E8' : '#d1d5db'
      }}
    >
      <div 
        className="filter-toggle-knob"
        style={{
          left: checked ? '24px' : '2px'
        }}
      />
    </button>
  </div>
);

// Rating Button with Blue Stars
const RatingTile = ({ label, rating, checked, onChange }) => (
  <button
    type="button"
    onClick={onChange}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.375rem',
      padding: '0.5rem 0.75rem',
      borderRadius: '6px',
      border: checked ? '1px solid #4F86E8' : '1px solid #e5e7eb',
      background: checked ? '#EBF2FF' : 'white',
      color: '#374151',
      fontSize: '0.875rem',
      fontWeight: 400,
      cursor: 'pointer',
      transition: 'all 0.15s ease',
      whiteSpace: 'nowrap'
    }}
  >
    {rating ? (
      <>
        {rating}+ <span style={{ color: '#4F86E8' }}>★</span>
      </>
    ) : label}
    {checked && (
      <span style={{ 
        fontSize: '0.875rem', 
        color: '#9ca3af',
        marginLeft: '0.125rem'
      }}>×</span>
    )}
  </button>
);

// Features Section Component with single "Show all" for entire section
const FeaturesSection = ({ features, selectedFeatures, setSelectedFeatures }) => {
  const [expanded, setExpanded] = useState(false);
  
  if (!features || features.length === 0) return null;
  
  // Count total features across all categories
  const totalFeatures = features.reduce((sum, cat) => sum + cat.features.length, 0);
  const INITIAL_CATEGORIES = 2; // Show first 2 categories initially
  
  const visibleCategories = expanded ? features : features.slice(0, INITIAL_CATEGORIES);
  const hiddenCategories = features.length - INITIAL_CATEGORIES;
  const hasMore = features.length > INITIAL_CATEGORIES;

  return (
    <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '1.5rem' }}>
      <h3 style={{ 
        fontSize: '1.1rem', 
        fontWeight: 700, 
        margin: '0 0 0.75rem 0',
        color: '#111827'
      }}>
        Features & Amenities
      </h3>
      {visibleCategories.map((category) => (
        <div key={category.categoryName} style={{ marginBottom: '1rem' }}>
          <h4 style={{ 
            fontSize: '0.85rem', 
            fontWeight: 500, 
            margin: '0 0 0.5rem 0',
            color: '#6b7280'
          }}>
            {category.categoryName}
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {category.features.map((feature) => (
              <CheckboxTile
                key={feature.id}
                label={feature.name}
                checked={selectedFeatures.includes(feature.id)}
                onChange={() => {
                  setSelectedFeatures(prev => 
                    prev.includes(feature.id) 
                      ? prev.filter(x => x !== feature.id) 
                      : [...prev, feature.id]
                  );
                }}
              />
            ))}
          </div>
        </div>
      ))}
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: 'none',
            border: 'none',
            color: '#5086E8',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
            padding: '0.25rem 0 0 0',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}
        >
          {expanded ? 'Show less' : `Show all (${hiddenCategories} more categories)`}
        </button>
      )}
    </div>
  );
};

// Expandable Section Component with "Show all" button
const ExpandableCheckboxSection = ({ 
  title, 
  items, 
  selectedIds, 
  onToggle, 
  getId, 
  getName,
  initialCount = INITIAL_VISIBLE_COUNT 
}) => {
  const [expanded, setExpanded] = useState(false);
  const visibleItems = expanded ? items : items.slice(0, initialCount);
  const hasMore = items.length > initialCount;
  const hiddenCount = items.length - initialCount;

  return (
    <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '1.5rem' }}>
      <h3 style={{ 
        fontSize: '1.1rem', 
        fontWeight: 700, 
        margin: '0 0 0.75rem 0',
        color: '#111827'
      }}>
        {title}
      </h3>
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: '0.5rem'
      }}>
        {visibleItems.map((item) => {
          const id = getId(item);
          const name = getName(item);
          const isChecked = selectedIds.includes(id);
          return (
            <CheckboxTile
              key={id}
              label={name}
              checked={isChecked}
              onChange={() => onToggle(id)}
            />
          );
        })}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: 'none',
            border: 'none',
            color: '#5086E8',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
            padding: '0.5rem 0 0 0',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}
        >
          {expanded ? 'Show less' : `Show all (${hiddenCount})`}
          <span style={{ fontSize: '0.75rem' }}>{expanded ? '▲' : '▼'}</span>
        </button>
      )}
    </div>
  );
};

function FilterModal({ isOpen, onClose, filters, onFilterChange, userLocation, onApply, vendorCount = 0, category, city }) {
  // Filter state
  const [priceRange, setPriceRange] = useState([filters.minPrice || 0, filters.maxPrice || 10000]);
  const [minRating, setMinRating] = useState(filters.minRating || '');
  const [instantBookingOnly, setInstantBookingOnly] = useState(filters.instantBookingOnly || false);
  const [selectedEventTypes, setSelectedEventTypes] = useState(filters.eventTypes || []);
  const [selectedCultures, setSelectedCultures] = useState(filters.cultures || []);
  const [experienceRange, setExperienceRange] = useState(filters.experienceRange || '');
  const [serviceLocation, setServiceLocation] = useState(filters.serviceLocation || '');
  
  // NEW: Enhanced filter state
  const [minReviewCount, setMinReviewCount] = useState(filters.minReviewCount || '');
  const [freshListingsDays, setFreshListingsDays] = useState(filters.freshListingsDays || '');
  const [hasGoogleReviews, setHasGoogleReviews] = useState(filters.hasGoogleReviews || false);
  const [availabilityDate, setAvailabilityDate] = useState(filters.availabilityDate || '');
  const [availabilityDayOfWeek, setAvailabilityDayOfWeek] = useState(filters.availabilityDayOfWeek || '');
  
  // Lookup data
  const [eventTypes, setEventTypes] = useState([]);
  const [cultures, setCultures] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [features, setFeatures] = useState([]);
  const [eventTypeAvailability, setEventTypeAvailability] = useState({});
  const [cultureAvailability, setCultureAvailability] = useState({});
  
  // NEW: Subcategories and Features filter state
  const [selectedSubcategories, setSelectedSubcategories] = useState(filters.subcategories || []);
  const [selectedFeatures, setSelectedFeatures] = useState(filters.features || []);
  
  // UI state
  const [previewCount, setPreviewCount] = useState(vendorCount);
  const [loadingCount, setLoadingCount] = useState(false);
  const debounceRef = useRef(null);

  // Sync local state with props when modal opens
  useEffect(() => {
    if (isOpen) {
      setPriceRange([filters.minPrice || 0, filters.maxPrice || 10000]);
      setMinRating(filters.minRating || '');
      setInstantBookingOnly(filters.instantBookingOnly || false);
      setSelectedEventTypes(filters.eventTypes || []);
      setSelectedCultures(filters.cultures || []);
      setSelectedSubcategories(filters.subcategories || []);
      setSelectedFeatures(filters.features || []);
      setExperienceRange(filters.experienceRange || '');
      setServiceLocation(filters.serviceLocation || '');
      // NEW: Sync enhanced filter state
      setMinReviewCount(filters.minReviewCount || '');
      setFreshListingsDays(filters.freshListingsDays || '');
      setHasGoogleReviews(filters.hasGoogleReviews || false);
      setAvailabilityDate(filters.availabilityDate || '');
      setAvailabilityDayOfWeek(filters.availabilityDayOfWeek || '');
    }
  }, [isOpen, filters]);

  // Fetch event types, cultures, subcategories, and features on mount
  useEffect(() => {
    const fetchLookups = async () => {
      try {
        // Build subcategories URL - if category is provided, filter by it
        const subcategoriesUrl = category 
          ? `${API_BASE_URL}/vendors/lookup/subcategories?category=${encodeURIComponent(category)}`
          : `${API_BASE_URL}/vendors/lookup/subcategories`;
        
        const [eventTypesRes, culturesRes, subcategoriesRes, featuresRes] = await Promise.all([
          fetch(`${API_BASE_URL}/vendors/lookup/event-types`),
          fetch(`${API_BASE_URL}/vendors/lookup/cultures`),
          fetch(subcategoriesUrl),
          fetch(`${API_BASE_URL}/vendors/features/all-grouped`)
        ]);
        
        if (eventTypesRes.ok) {
          const data = await eventTypesRes.json();
          setEventTypes(data.eventTypes || []);
        }
        if (culturesRes.ok) {
          const data = await culturesRes.json();
          setCultures(data.cultures || []);
        }
        if (subcategoriesRes.ok) {
          const data = await subcategoriesRes.json();
          setSubcategories(data.subcategories || []);
        }
        if (featuresRes.ok) {
          const data = await featuresRes.json();
          // Keep features grouped by category for organized display
          const categorizedFeatures = (data.categories || []).map(cat => ({
            categoryName: cat.categoryName,
            features: (cat.features || []).map(f => ({
              id: f.FeatureID || f.featureId,
              name: f.FeatureName || f.featureName
            }))
          })).filter(cat => cat.features.length > 0);
          setFeatures(categorizedFeatures);
        }
      } catch (error) {
        console.error('Error fetching filter lookups:', error);
      }
    };
    
    if (isOpen) {
      fetchLookups();
    }
  }, [isOpen, category]);

  // Fetch preview count and availability when filters change
  const fetchPreviewCount = useCallback(async () => {
    if (!isOpen) return;
    
    try {
      setLoadingCount(true);
      
      // Use the new filter-count endpoint
      const response = await fetch(`${API_BASE_URL}/vendors/filter-count`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: category || null,
          city: extractCityName(city),
          latitude: userLocation?.lat || null,
          longitude: userLocation?.lng || null,
          radiusMiles: 100, // Use a larger radius for filter count to show more options
          eventTypes: selectedEventTypes,
          cultures: selectedCultures,
          subcategories: selectedSubcategories,
          features: selectedFeatures,
          experienceRange: experienceRange || null,
          serviceLocation: serviceLocation || null,
          minPrice: priceRange[0] > 0 ? priceRange[0] : null,
          maxPrice: priceRange[1] < 10000 ? priceRange[1] : null,
          instantBookingOnly,
          minRating: minRating || null,
          // NEW: Enhanced filter parameters
          minReviewCount: minReviewCount || null,
          freshListingsDays: freshListingsDays || null,
          hasGoogleReviews: hasGoogleReviews || null,
          availabilityDate: availabilityDate || null,
          availabilityDayOfWeek: availabilityDayOfWeek || null
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setPreviewCount(data.count || 0);
      }
    } catch (error) {
      console.error('Error fetching preview count:', error);
      // Fallback to old method
      try {
        const params = new URLSearchParams();
        if (userLocation) {
          params.set('latitude', String(userLocation.lat));
          params.set('longitude', String(userLocation.lng));
        }
        if (minRating) params.set('minRating', minRating);
        if (instantBookingOnly) params.set('instantBookingOnly', 'true');
        if (selectedEventTypes.length > 0) params.set('eventTypes', selectedEventTypes.join(','));
        if (selectedCultures.length > 0) params.set('cultures', selectedCultures.join(','));
        if (selectedSubcategories.length > 0) params.set('subcategories', selectedSubcategories.join(','));
        if (selectedFeatures.length > 0) params.set('features', selectedFeatures.join(','));
        // NEW: Enhanced filter parameters for fallback
        if (minReviewCount) params.set('minReviewCount', minReviewCount);
        if (freshListingsDays) params.set('freshListingsDays', freshListingsDays);
        if (hasGoogleReviews) params.set('hasGoogleReviews', 'true');
        if (availabilityDate) params.set('availabilityDate', availabilityDate);
        if (availabilityDayOfWeek) params.set('availabilityDayOfWeek', availabilityDayOfWeek);
        params.set('pageSize', '1');
        
        const fallbackRes = await fetch(`${API_BASE_URL}/vendors?${params.toString()}`);
        if (fallbackRes.ok) {
          const data = await fallbackRes.json();
          setPreviewCount(data.totalCount || 0);
        }
      } catch (e) {
        console.error('Fallback count fetch failed:', e);
      }
    } finally {
      setLoadingCount(false);
    }
  }, [isOpen, userLocation, category, city, priceRange, minRating, instantBookingOnly, selectedEventTypes, selectedCultures, selectedSubcategories, selectedFeatures, experienceRange, serviceLocation, minReviewCount, freshListingsDays, hasGoogleReviews, availabilityDate, availabilityDayOfWeek]);

  // Debounced fetch when filters change
  useEffect(() => {
    if (!isOpen) return;
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      fetchPreviewCount();
    }, 300);
    
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [fetchPreviewCount, isOpen]);

  // Reset preview count when modal opens
  useEffect(() => {
    if (isOpen) {
      setPreviewCount(vendorCount);
    }
  }, [isOpen, vendorCount]);
  
  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);

  const handleClearAll = () => {
    setPriceRange([0, 10000]);
    setMinRating('');
    setInstantBookingOnly(false);
    setSelectedEventTypes([]);
    setSelectedCultures([]);
    setSelectedSubcategories([]);
    setSelectedFeatures([]);
    setExperienceRange('');
    setServiceLocation('');
    // NEW: Clear enhanced filters
    setMinReviewCount('');
    setFreshListingsDays('');
    setHasGoogleReviews(false);
    setAvailabilityDate('');
    setAvailabilityDayOfWeek('');
  };

  const handleApply = () => {
    const updatedFilters = {
      minPrice: priceRange[0] > 0 ? priceRange[0] : null,
      maxPrice: priceRange[1] < 10000 ? priceRange[1] : null,
      minRating,
      instantBookingOnly,
      eventTypes: selectedEventTypes,
      cultures: selectedCultures,
      subcategories: selectedSubcategories,
      features: selectedFeatures,
      experienceRange,
      serviceLocation,
      // NEW: Enhanced filter values
      minReviewCount: minReviewCount || null,
      freshListingsDays: freshListingsDays || null,
      hasGoogleReviews,
      availabilityDate: availabilityDate || null,
      availabilityDayOfWeek: availabilityDayOfWeek || null
    };
    
    console.log('[FilterModal] Applying filters:', updatedFilters);
    onFilterChange(updatedFilters);
    if (onApply) onApply();
    onClose();
  };

  // Count active filters
  const activeFilterCount = [
    priceRange[0] > 0 || priceRange[1] < 10000,
    minRating,
    instantBookingOnly,
    selectedEventTypes.length > 0,
    selectedCultures.length > 0,
    selectedSubcategories.length > 0,
    selectedFeatures.length > 0,
    experienceRange,
    serviceLocation,
    // NEW: Enhanced filter counts
    minReviewCount,
    freshListingsDays,
    hasGoogleReviews,
    availabilityDate,
    availabilityDayOfWeek
  ].filter(Boolean).length;


  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={onClose}
      title="Filters"
      size="large"
      showFooter={false}
    >
      <div className="filter-modal-content" style={{ 
        maxHeight: 'calc(80vh - 140px)', 
        overflowY: 'auto',
        padding: '0 1.5rem'
      }}>
        
        {/* Price Range Section - Input fields with slider */}
        <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '1.5rem' }}>
          <h3 style={{ 
            fontSize: '1.1rem', 
            fontWeight: 700, 
            margin: '0 0 0.75rem 0',
            color: '#111827'
          }}>
            Price Range
          </h3>
          {/* Min/Max Input Fields */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Minimum</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }}>$</span>
                <input
                  type="number"
                  min="0"
                  max={priceRange[1]}
                  step="100"
                  value={priceRange[0]}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    if (val < priceRange[1]) setPriceRange([val, priceRange[1]]);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem 0.5rem 1.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '0.9rem'
                  }}
                />
              </div>
            </div>
            <span style={{ color: '#9ca3af', marginTop: '1.25rem' }}>—</span>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Maximum</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }}>$</span>
                <input
                  type="number"
                  min={priceRange[0]}
                  max="10000"
                  step="100"
                  value={priceRange[1]}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 10000;
                    if (val > priceRange[0]) setPriceRange([priceRange[0], val]);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem 0.5rem 1.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '0.9rem'
                  }}
                />
              </div>
            </div>
          </div>
          {/* Dual Range Slider */}
          <div style={{ position: 'relative', height: '6px', marginBottom: '0.5rem' }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '6px',
              background: '#e5e7eb',
              borderRadius: '3px'
            }} />
            <div style={{
              position: 'absolute',
              top: 0,
              left: `${(priceRange[0] / 10000) * 100}%`,
              right: `${100 - (priceRange[1] / 10000) * 100}%`,
              height: '6px',
              background: '#5086E8',
              borderRadius: '3px'
            }} />
            <input
              type="range"
              min="0"
              max="10000"
              step="100"
              value={priceRange[0]}
              onChange={(e) => {
                const newMin = parseInt(e.target.value);
                if (newMin < priceRange[1]) setPriceRange([newMin, priceRange[1]]);
              }}
              className="price-range-slider price-range-min"
              style={{
                position: 'absolute',
                top: '-6px',
                left: 0,
                width: '100%',
                height: '18px',
                background: 'transparent',
                cursor: 'pointer',
                appearance: 'none',
                WebkitAppearance: 'none',
                pointerEvents: 'none',
                zIndex: 3
              }}
            />
            {/* Max price slider */}
            <input
              type="range"
              min="0"
              max="10000"
              step="100"
              value={priceRange[1]}
              onChange={(e) => {
                const newMax = parseInt(e.target.value);
                if (newMax > priceRange[0]) {
                  setPriceRange([priceRange[0], newMax]);
                }
              }}
              className="price-range-slider price-range-max"
              style={{
                position: 'absolute',
                top: '-6px',
                left: 0,
                width: '100%',
                height: '18px',
                background: 'transparent',
                cursor: 'pointer',
                appearance: 'none',
                WebkitAppearance: 'none',
                pointerEvents: 'none',
                zIndex: 4
              }}
            />
          </div>
        </div>

        {/* Event Types Section - Checkbox tiles */}
        {eventTypes.length > 0 && (
          <ExpandableCheckboxSection
            title="Event Types"
            items={eventTypes}
            selectedIds={selectedEventTypes}
            onToggle={(id) => {
              setSelectedEventTypes(prev => 
                prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
              );
            }}
            getId={(item) => item.EventTypeID}
            getName={(item) => item.EventTypeName}
          />
        )}

        {/* Cultures Served Section - Checkbox tiles */}
        {cultures.length > 0 && (
          <ExpandableCheckboxSection
            title="Cultures Served"
            items={cultures}
            selectedIds={selectedCultures}
            onToggle={(id) => {
              setSelectedCultures(prev => 
                prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
              );
            }}
            getId={(item) => item.CultureID}
            getName={(item) => item.CultureName}
          />
        )}

        {/* Service Location Section - Checkbox tiles */}
        <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '1.5rem' }}>
          <h3 style={{ 
            fontSize: '1.1rem', 
            fontWeight: 700, 
            margin: '0 0 0.75rem 0',
            color: '#111827'
          }}>
            Service Location
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {SERVICE_LOCATIONS.map((loc) => (
              <CheckboxTile
                key={loc.key}
                label={loc.label}
                checked={serviceLocation === loc.key}
                onChange={() => setServiceLocation(serviceLocation === loc.key ? '' : loc.key)}
              />
            ))}
          </div>
        </div>

        {/* Instant Book - Blue Toggle */}
        <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '1.5rem' }}>
          <h3 style={{ 
            fontSize: '1.1rem', 
            fontWeight: 700, 
            margin: '0 0 0.75rem 0',
            color: '#111827'
          }}>
            Instant Book
          </h3>
          <ToggleSwitch
            checked={instantBookingOnly}
            onChange={() => setInstantBookingOnly(!instantBookingOnly)}
            label="Instant Book"
            description="Listings you can book without waiting for Host approval."
          />
        </div>

        {/* Minimum Rating Section - Blue Stars */}
        <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '1.5rem' }}>
          <h3 style={{ 
            fontSize: '1.1rem', 
            fontWeight: 700, 
            margin: '0 0 0.75rem 0',
            color: '#111827'
          }}>
            Minimum Rating
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <RatingTile
              label="Any"
              checked={minRating === ''}
              onChange={() => setMinRating('')}
            />
            <RatingTile
              rating="3"
              checked={minRating === '3'}
              onChange={() => setMinRating(minRating === '3' ? '' : '3')}
            />
            <RatingTile
              rating="4"
              checked={minRating === '4'}
              onChange={() => setMinRating(minRating === '4' ? '' : '4')}
            />
            <RatingTile
              rating="4.5"
              checked={minRating === '4.5'}
              onChange={() => setMinRating(minRating === '4.5' ? '' : '4.5')}
            />
          </div>
        </div>

        {/* Google Reviews Filter - Blue Toggle */}
        <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '1.5rem' }}>
          <h3 style={{ 
            fontSize: '1.1rem', 
            fontWeight: 700, 
            margin: '0 0 0.75rem 0',
            color: '#111827'
          }}>
            Google Reviews
          </h3>
          <ToggleSwitch
            checked={hasGoogleReviews}
            onChange={() => setHasGoogleReviews(!hasGoogleReviews)}
            label="Has Google Reviews"
            description="Show only vendors with imported Google reviews."
          />
        </div>

        {/* Features Section - Categorized by vendor type with single Show all */}
        <FeaturesSection
          features={features}
          selectedFeatures={selectedFeatures}
          setSelectedFeatures={setSelectedFeatures}
        />

        {/* Subcategories Section - Checkbox tiles */}
        {subcategories.length > 0 && (
          <ExpandableCheckboxSection
            title="Subcategories"
            items={subcategories}
            selectedIds={selectedSubcategories}
            onToggle={(id) => {
              setSelectedSubcategories(prev => 
                prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
              );
            }}
            getId={(item) => item.SubcategoryID}
            getName={(item) => item.SubcategoryName}
          />
        )}

        {/* Years of Experience Section - Checkbox tiles */}
        <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '1.5rem' }}>
          <h3 style={{ 
            fontSize: '1.1rem', 
            fontWeight: 700, 
            margin: '0 0 0.75rem 0',
            color: '#111827'
          }}>
            Years of Experience
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {EXPERIENCE_RANGES.map((range) => (
              <CheckboxTile
                key={range.key}
                label={range.label}
                checked={experienceRange === range.key}
                onChange={() => setExperienceRange(experienceRange === range.key ? '' : range.key)}
              />
            ))}
          </div>
        </div>

        {/* Fresh Listings - Blue Toggle */}
        <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '1.5rem' }}>
          <h3 style={{ 
            fontSize: '1.1rem', 
            fontWeight: 700, 
            margin: '0 0 0.75rem 0',
            color: '#111827'
          }}>
            Fresh Listings
          </h3>
          <ToggleSwitch
            checked={!!freshListingsDays}
            onChange={() => setFreshListingsDays(freshListingsDays ? '' : '30')}
            label="Fresh Listings"
            description="Show vendors added in the last 30 days."
          />
        </div>

        {/* Availability Section - REMOVED: Now handled by search bar at top */}
      </div>

      {/* Footer - Fixed at bottom */}
      <div style={{
        padding: '1rem 1.5rem',
        borderTop: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        background: 'white'
      }}>
        <button
          onClick={handleClearAll}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            background: 'transparent',
            color: '#111827',
            fontSize: '1rem',
            fontWeight: 500,
            cursor: 'pointer',
            textDecoration: 'underline',
            transition: 'opacity 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.opacity = '0.7'}
          onMouseLeave={(e) => e.target.style.opacity = '1'}
        >
          Clear all
        </button>
        <button
          onClick={handleApply}
          style={{
            padding: '0.875rem 2rem',
            border: 'none',
            borderRadius: '8px',
            background: '#5086E8',
            color: 'white',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s',
            minWidth: '180px'
          }}
          onMouseEnter={(e) => e.target.style.background = '#4070D0'}
          onMouseLeave={(e) => e.target.style.background = '#5086E8'}
        >
          {loadingCount ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <span className="spinner-small" style={{
                width: '16px',
                height: '16px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: 'white',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }} />
              Loading...
            </span>
          ) : (
            `Show ${previewCount.toLocaleString()} listing${previewCount !== 1 ? 's' : ''}`
          )}
        </button>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        /* Toggle Switch - Override global button styles */
        .filter-toggle-switch {
          width: 48px !important;
          min-width: 48px !important;
          height: 26px !important;
          min-height: 26px !important;
          max-height: 26px !important;
          padding: 0 !important;
          border-radius: 13px !important;
          position: relative !important;
          border: none !important;
          cursor: pointer !important;
          transition: background-color 0.2s !important;
          flex-shrink: 0 !important;
          overflow: visible !important;
        }
        
        .filter-toggle-knob {
          width: 22px !important;
          height: 22px !important;
          background-color: white !important;
          border-radius: 50% !important;
          position: absolute !important;
          top: 2px !important;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2) !important;
          transition: left 0.2s !important;
        }
        
        /* Custom range slider styling - enable pointer events on thumbs */
        .price-range-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: 2px solid #5086E8;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          pointer-events: auto;
        }

        .price-range-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: 2px solid #5086E8;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          pointer-events: auto;
        }

        /* Scrollbar styling */
        .filter-modal-content::-webkit-scrollbar {
          width: 8px;
        }

        .filter-modal-content::-webkit-scrollbar-track {
          background: #f3f4f6;
          border-radius: 4px;
        }

        .filter-modal-content::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 4px;
        }

        .filter-modal-content::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>
    </UniversalModal>
  );
}

export default FilterModal;
