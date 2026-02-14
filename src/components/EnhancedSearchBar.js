import React, { useState, useEffect, useRef } from 'react';
import { useLocation as useRouterLocation } from 'react-router-dom';
import { API_BASE_URL, GOOGLE_MAPS_API_KEY } from '../config';
import './EnhancedSearchBar.css';
import Calendar from './Calendar';
import LocationSearchModal from './LocationSearchModal';
import DateSearchModal from './DateSearchModal';
import { getIPGeolocationServices, formatFromGooglePlace } from '../utils/locationUtils';

const EnhancedSearchBar = ({ onSearch, isScrolled }) => {
  const routerLocation = useRouterLocation();
  
  // Initialize state from URL params
  const getInitialParams = () => {
    const params = new URLSearchParams(window.location.search);
    return {
      location: params.get('location') || '',
      eventDate: params.get('eventDate') || '',
      startTime: params.get('startTime') || '',
      endTime: params.get('endTime') || ''
    };
  };
  
  const initialParams = getInitialParams();
  
  const [location, setLocation] = useState(initialParams.location);
  const [detectedCity, setDetectedCity] = useState(''); // IP-detected city for placeholder
  const [selectedDate, setSelectedDate] = useState(initialParams.eventDate);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeField, setActiveField] = useState(null); // 'event', 'location', 'date'
  const [userLocation, setUserLocation] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [startTime, setStartTime] = useState(initialParams.startTime || '');
  const [endTime, setEndTime] = useState(initialParams.endTime || '');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [searchRadius, setSearchRadius] = useState(50);
  const [endDate, setEndDate] = useState('');
  
  // Sync state with URL params when URL changes
  useEffect(() => {
    const params = new URLSearchParams(routerLocation.search);
    const urlLocation = params.get('location') || '';
    const urlEventDate = params.get('eventDate') || '';
    const urlStartTime = params.get('startTime') || '';
    const urlEndTime = params.get('endTime') || '';
    
    if (urlLocation) setLocation(urlLocation);
    if (urlEventDate) setSelectedDate(urlEventDate);
    if (urlStartTime) setStartTime(urlStartTime);
    if (urlEndTime) setEndTime(urlEndTime);
  }, [routerLocation.search]);

  const locationRef = useRef(null);
  const dateRef = useRef(null);
  const calendarRef = useRef(null);
  const searchBarRef = useRef(null);
  const autocompleteRef = useRef(null);

  // Auto-detect user's city using IP geolocation (no permission required)
  const detectCityFromIP = async () => {
    // Use centralized IP geolocation services
    const geoServices = getIPGeolocationServices(API_BASE_URL);

    for (const service of geoServices) {
      try {
        const response = await fetch(service.url);
        if (response.ok) {
          const data = await response.json();
          const parsed = service.parse(data);
          if (parsed && parsed.formattedLocation) {
            console.log('[EnhancedSearchBar] IP location detected:', parsed.formattedLocation);
            setDetectedCity(parsed.formattedLocation); // Store for placeholder
            // Set user location if coordinates available
            if (parsed.lat && parsed.lng) {
              setUserLocation({
                latitude: parsed.lat,
                longitude: parsed.lng,
                city: parsed.formattedLocation
              });
            }
            return; // Success
          }
        }
      } catch (error) {
        console.warn('[EnhancedSearchBar] IP geolocation service failed:', service.name, error);
        continue;
      }
    }
    console.warn('[EnhancedSearchBar] All IP geolocation services failed');
  };

  useEffect(() => {
    if (window.google && window.google.maps && window.google.maps.places) {
      initializeGooglePlaces();
    } else {
      // Load Google Maps API if not already loaded
      loadGoogleMapsAPI();
    }
    
    // Auto-detect city from IP on mount (always run to populate detectedCity for display)
    detectCityFromIP();
    
    // Listen for expandSearchBar event from edit icon click
    const handleExpandSearchBar = (event) => {
      setIsExpanded(true);
      if (event.detail?.field === 'location') {
        setActiveField('location');
        setShowLocationDropdown(true);
        // Focus the location input after a short delay
        setTimeout(() => {
          const locationInput = document.getElementById('location-input');
          if (locationInput) {
            locationInput.focus();
            locationInput.select();
          }
        }, 100);
      }
    };
    
    window.addEventListener('expandSearchBar', handleExpandSearchBar);
    return () => window.removeEventListener('expandSearchBar', handleExpandSearchBar);
  }, []);

  // Reinitialize Google Places when expanded, hide when collapsed
  useEffect(() => {
    if (isExpanded && window.google && window.google.maps && window.google.maps.places) {
      setTimeout(() => {
        initializeGooglePlaces();
      }, 100);
    } else if (!isExpanded) {
      // Hide Google Maps dropdown when collapsed
      const pacContainers = document.querySelectorAll('.pac-container');
      pacContainers.forEach(container => {
        container.style.display = 'none';
      });
    }
  }, [isExpanded]);

  // Handle click outside to close dropdowns and collapse search bar
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is on Google Maps dropdown
      const isPacContainer = event.target.closest('.pac-container');
      if (isPacContainer) return;

      if (searchBarRef.current && !searchBarRef.current.contains(event.target)) {
        setIsExpanded(false);
        setShowLocationDropdown(false);
        setShowCalendar(false);
        
        // Clear Google Maps dropdown
        const pacContainers = document.querySelectorAll('.pac-container');
        pacContainers.forEach(container => {
          container.style.display = 'none';
        });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Track if user just clicked to prevent scroll from immediately closing
  const justClickedRef = useRef(false);
  
  // Handle scroll to collapse search bar when expanded
  useEffect(() => {
    let scrollTimeout;
    const handleScroll = () => {
      // Don't collapse if user just clicked to expand
      if (justClickedRef.current) {
        return;
      }
      
      if (isExpanded) {
        // Add a small delay to prevent accidental collapse
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          if (!justClickedRef.current) {
            setIsExpanded(false);
            setShowLocationDropdown(false);
            setShowCalendar(false);
            
            // Clear Google Maps dropdown
            const pacContainers = document.querySelectorAll('.pac-container');
            pacContainers.forEach(container => {
              container.style.display = 'none';
            });
          }
        }, 150);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [isExpanded]);

  const loadGoogleMapsAPI = () => {
    if (window.google) return;
    
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = initializeGooglePlaces;
    document.head.appendChild(script);
  };

  const initializeGooglePlaces = () => {
    if (!locationRef.current) return;
    
    const input = locationRef.current.querySelector('input');
    if (!input) return;

    // Clear existing autocomplete if it exists
    if (autocompleteRef.current) {
      window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
    }

    const autocomplete = new window.google.maps.places.Autocomplete(input, {
      types: ['(cities)'],
      componentRestrictions: { country: 'ca' } // Restrict to Canada
    });

    autocompleteRef.current = autocomplete;

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.geometry) {
        // Use centralized formatting utility
        const formattedLocation = formatFromGooglePlace(place.address_components, place.name);
        
        setLocation(formattedLocation);
        setUserLocation({
          latitude: place.geometry?.location?.lat(),
          longitude: place.geometry?.location?.lng(),
          city: formattedLocation
        });
        
        // Immediately hide Google Maps dropdown
        const pacContainers = document.querySelectorAll('.pac-container');
        pacContainers.forEach(container => {
          container.style.display = 'none';
        });
        
        // Remove focus from input to clear any outline
        if (input) {
          input.blur();
        }
        
        // Collapse search bar after selection
        setTimeout(() => {
          setIsExpanded(false);
        }, 300);
      }
    });
  };

  // Get user's current location
  const getCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by this browser');
      }

      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
          enableHighAccuracy: true
        });
      });

      const { latitude, longitude } = position.coords;
      
      // Use Google Geocoding API if available, otherwise fallback
      if (window.google && window.google.maps) {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode(
          { location: { lat: latitude, lng: longitude } },
          (results, status) => {
            if (status === 'OK' && results[0]) {
              // Use centralized formatting utility
              const formattedLocation = formatFromGooglePlace(results[0].address_components) || results[0].formatted_address;
              setLocation(formattedLocation);
              setUserLocation({ latitude, longitude, city: formattedLocation });
            } else {
              fallbackGeocoding(latitude, longitude);
            }
            setLoadingLocation(false);
          }
        );
      } else {
        fallbackGeocoding(latitude, longitude);
      }
    } catch (error) {
      console.error('Error getting location:', error);
      alert('Unable to get your location. Please select a city manually.');
      setLoadingLocation(false);
    }
  };

  const fallbackGeocoding = async (latitude, longitude) => {
    try {
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
      );
      
      if (response.ok) {
        const data = await response.json();
        const city = data.city || data.locality;
        const province = data.principalSubdivision;
        
        if (city && province) {
          const locationString = `${city}, ${province}`;
          setLocation(locationString);
          setUserLocation({ latitude, longitude, city: locationString });
        }
      }
    } catch (error) {
      console.error('Fallback geocoding error:', error);
    }
  };

  // Check vendor availability for selected date and time
  const handleSearch = async () => {
    if (!location && !selectedDate) {
      alert('Please select a location or date to search');
      return;
    }

    const searchParams = {
      location: location,
      date: selectedDate,
      startTime: startTime,
      endTime: endTime,
      userLocation: userLocation
    };

    if (onSearch) {
      onSearch(searchParams);
    }
    
    // Collapse search bar after search
    setIsExpanded(false);
    setShowCalendar(false);
  };

  const handleLocationSelect = (city) => {
    setLocation(city);
    setShowLocationDropdown(false);
  };

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
    setShowDatePicker(false);
  };

  const handleCalendarDateSelect = (date) => {
    setSelectedDate(date);
    // Don't close calendar - let user select times
  };

  const handleTimeChange = (type, value) => {
    if (type === 'start') {
      setStartTime(value);
    } else {
      setEndTime(value);
    }
  };

  const handleClearLocation = (e) => {
    e.stopPropagation();
    setLocation('');
    setUserLocation(null);
  };

  const handleClearDate = (e) => {
    e.stopPropagation();
    setSelectedDate('');
    setStartTime('11:00');
    setEndTime('17:00');
  };

  const handleDateFieldClick = (e) => {
    e.stopPropagation();
    setIsExpanded(true);
    setShowCalendar(true);
    setShowLocationDropdown(false);
  };

  const handleLocationFieldClick = (e) => {
    e.stopPropagation();
    setIsExpanded(true);
    setShowLocationDropdown(true);
    setShowCalendar(false);
  };

  const handleSearchBarClick = () => {
    // Prevent scroll from immediately closing
    justClickedRef.current = true;
    setIsExpanded(true);
    
    // Reset after a short delay
    setTimeout(() => {
      justClickedRef.current = false;
    }, 300);
  };

  // Format date for display (compact version) - includes time if available
  const formatDateDisplay = (dateString, compact = false) => {
    if (!dateString) return compact ? 'Anytime' : 'Pick the date';
    // Parse the date string as local date to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const monthName = date.toLocaleDateString('en-US', { month: 'short' });
    const dayNum = date.getDate();
    
    // Format time slot display
    let timeDisplay = '';
    if (startTime) {
      if (startTime === '09:00' && endTime === '12:00') {
        timeDisplay = ' • Morning';
      } else if (startTime === '12:00' && endTime === '17:00') {
        timeDisplay = ' • Afternoon';
      } else if (startTime === '17:00' && endTime === '23:00') {
        timeDisplay = ' • Evening';
      } else if (startTime) {
        // Format custom time
        const formatTime = (t) => {
          if (!t) return '';
          const [h, m] = t.split(':');
          const hour = parseInt(h);
          const ampm = hour >= 12 ? 'PM' : 'AM';
          const hour12 = hour % 12 || 12;
          return `${hour12}${m !== '00' ? ':' + m : ''} ${ampm}`;
        };
        timeDisplay = ` • ${formatTime(startTime)}`;
      }
    }
    
    return `${monthName} ${dayNum}${timeDisplay}`;
  };

  // Format location for compact display
  const formatLocationDisplay = (locationString, compact = false) => {
    // Use detected city as fallback when no location is set
    if (!locationString) {
      if (compact && detectedCity) {
        // Show detected city in compact view - truncate for mobile
        if (detectedCity.length > 15) {
          return detectedCity.substring(0, 12) + '...';
        }
        return detectedCity;
      }
      return compact ? (detectedCity || 'Location') : 'Search cities in Canada';
    }
    // Truncate for compact view - shorter for mobile fit
    if (compact && locationString.length > 15) {
      return locationString.substring(0, 12) + '...';
    }
    return locationString;
  };

  const handleFieldClick = (field) => {
    // Prevent scroll from immediately closing
    justClickedRef.current = true;
    setIsExpanded(true);
    setActiveField(field);
    if (field === 'date') {
      setShowCalendar(true);
    } else {
      setShowCalendar(false);
    }
    
    // Reset after a short delay
    setTimeout(() => {
      justClickedRef.current = false;
    }, 300);
  };

  // Get minimum date (today)
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  return (
    <>
      {/* Backdrop overlay for mobile */}
      {isExpanded && <div className="search-backdrop" onClick={() => setIsExpanded(false)} />}
      <div 
        className={`enhanced-search-container ${isScrolled ? 'scrolled' : ''} ${isExpanded ? 'expanded' : ''}`}
        ref={searchBarRef}
      >
        <div className="enhanced-search-bar">
        {/* Compact View (collapsed state) - Opens modals directly, no expand */}
        {!isExpanded ? (
          <div className="compact-view">
            <div className="compact-field compact-location" onClick={(e) => { e.stopPropagation(); setShowLocationModal(true); }}>
              <span className="compact-label">LOCATION</span>
              <span className="compact-value">{formatLocationDisplay(location, true)}</span>
            </div>
            <div className="compact-separator">|</div>
            <div className="compact-field compact-date" onClick={(e) => { e.stopPropagation(); setShowDateModal(true); }}>
              <span className="compact-label">EVENT DATE</span>
              <span className="compact-value">{formatDateDisplay(selectedDate, true)}</span>
            </div>
            <button className="search-btn-compact" onClick={(e) => { e.stopPropagation(); handleSearch(); }} title="Search">
              <i className="fas fa-search"></i>
            </button>
          </div>
        ) : (
          /* Expanded View */
          <div className="expanded-view">
            {/* Location Input */}
            <div 
              className={`search-field location-field ${activeField === 'location' ? 'active' : ''}`}
              ref={locationRef} 
              onClick={() => handleFieldClick('location')}
            >
              <div className="field-label">LOCATION</div>
              <div className="field-input-wrapper">
                <input
                  type="text"
                  placeholder={detectedCity || ''}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
                <button 
                  className="use-location-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    getCurrentLocation();
                  }}
                  disabled={loadingLocation}
                  title="Use my current location"
                >
                  {loadingLocation ? (
                    <i className="fas fa-spinner fa-spin"></i>
                  ) : (
                    <i className="fas fa-crosshairs"></i>
                  )}
                </button>
              </div>
            </div>

            <div className="field-separator"></div>

            {/* Date Input */}
            <div 
              className={`search-field date-field ${activeField === 'date' ? 'active' : ''}`}
              ref={dateRef} 
              onClick={() => handleFieldClick('date')}
            >
              <div className="field-label">EVENT DATE</div>
              <div className="field-value">
                {formatDateDisplay(selectedDate)}
              </div>
              
              {showCalendar && isExpanded && (
                <Calendar
                  selectedDate={selectedDate}
                  onDateSelect={handleCalendarDateSelect}
                  onClose={() => setShowCalendar(false)}
                  startTime={startTime}
                  endTime={endTime}
                  onTimeChange={handleTimeChange}
                />
              )}
            </div>

            {/* Search Button */}
            <button className="search-btn" onClick={handleSearch} title="Search">
              <i className="fas fa-search"></i>
              <span className="search-btn-text">Search</span>
            </button>
          </div>
        )}
      </div>
      </div>
      
      {/* Location Search Modal */}
      <LocationSearchModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onApply={({ location: newLocation, radius, coordinates }) => {
          setLocation(newLocation);
          setSearchRadius(radius);
          const newUserLocation = coordinates ? {
            latitude: coordinates.lat,
            longitude: coordinates.lng,
            city: newLocation
          } : null;
          
          if (newUserLocation) {
            setUserLocation(newUserLocation);
          }
          
          // Trigger search immediately when location is changed
          if (onSearch) {
            onSearch({
              location: newLocation,
              date: selectedDate,
              endDate: endDate,
              startTime: startTime,
              endTime: endTime,
              userLocation: newUserLocation || userLocation
            });
          }
        }}
        initialLocation={location}
        initialRadius={searchRadius}
        onSwitchToDate={() => setShowDateModal(true)}
        currentStep={1}
      />
      
      {/* Date Search Modal */}
      <DateSearchModal
        isOpen={showDateModal}
        onClose={() => setShowDateModal(false)}
        onApply={({ startDate: newStartDate, endDate: newEndDate, startTime: newStartTime, endTime: newEndTime, timezone: newTimezone }) => {
          setSelectedDate(newStartDate);
          setEndDate(newEndDate);
          setStartTime(newStartTime);
          setEndTime(newEndTime);
          
          // Trigger search immediately when dates are changed
          if (onSearch) {
            onSearch({
              location: location,
              date: newStartDate,
              endDate: newEndDate,
              startTime: newStartTime,
              endTime: newEndTime,
              timezone: newTimezone,
              userLocation: userLocation
            });
          }
        }}
        initialStartDate={selectedDate}
        initialEndDate={endDate}
        initialStartTime={startTime}
        initialEndTime={endTime}
        onSwitchToLocation={() => setShowLocationModal(true)}
        currentStep={2}
      />
    </>
  );
};

export default EnhancedSearchBar;
