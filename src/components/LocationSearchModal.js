import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GOOGLE_MAPS_API_KEY } from '../config';
import UniversalModal from './UniversalModal';
import './LocationSearchModal.css';
import { formatFromGooglePlace, normalizeLocation } from '../utils/locationUtils';

const LocationSearchModal = ({ isOpen, onClose, onApply, onUseCurrentLocation, initialLocation, initialRadius, onSwitchToDate, showStepIndicator = true, currentStep = 1 }) => {
  const [location, setLocation] = useState(initialLocation || '');
  const [radius, setRadius] = useState(initialRadius || 50);
  const [coordinates, setCoordinates] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  const autocompleteRef = useRef(null);
  const inputRef = useRef(null);

  const radiusOptions = [
    { value: 10, label: '10 kilometers' },
    { value: 25, label: '25 kilometers' },
    { value: 50, label: '50 kilometers' },
    { value: 100, label: '100 kilometers' },
    { value: 250, label: '250 kilometers' },
    { value: 500, label: '500 kilometers' }
  ];

  // Initialize map when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const initMap = () => {
      if (!mapRef.current || !window.google) return;

      // Default to Toronto if no coordinates
      const defaultCenter = { lat: 43.6532, lng: -79.3832 };
      const center = coordinates || defaultCenter;

      const map = new window.google.maps.Map(mapRef.current, {
        center: center,
        zoom: 8,
        disableDefaultUI: true,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      mapInstanceRef.current = map;

      // Add marker
      const marker = new window.google.maps.Marker({
        position: center,
        map: map,
        draggable: true,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#ef4444',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2
        }
      });

      markerRef.current = marker;

      // Add radius circle
      const circle = new window.google.maps.Circle({
        map: map,
        center: center,
        radius: radius * 1000, // Convert km to meters
        fillColor: '#5086E8',
        fillOpacity: 0.1,
        strokeColor: '#5086E8',
        strokeOpacity: 0.3,
        strokeWeight: 2
      });

      circleRef.current = circle;

      // Handle marker drag
      marker.addListener('dragend', () => {
        const pos = marker.getPosition();
        const newCoords = { lat: pos.lat(), lng: pos.lng() };
        setCoordinates(newCoords);
        circle.setCenter(newCoords);
        
        // Reverse geocode to get address
        reverseGeocode(newCoords);
      });

      // Handle map click
      map.addListener('click', (e) => {
        const newCoords = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        marker.setPosition(newCoords);
        circle.setCenter(newCoords);
        setCoordinates(newCoords);
        reverseGeocode(newCoords);
      });

      setMapLoaded(true);
    };

    // Load Google Maps if not already loaded
    if (window.google && window.google.maps) {
      initMap();
    } else {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = initMap;
      document.head.appendChild(script);
    }

    return () => {
      // Cleanup
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }
      if (circleRef.current) {
        circleRef.current.setMap(null);
      }
    };
  }, [isOpen]);

  // Initialize autocomplete
  useEffect(() => {
    if (!isOpen || !mapLoaded || !inputRef.current || !window.google) return;

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['(cities)'],
      componentRestrictions: { country: 'ca' }
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.geometry) {
        const newCoords = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        };
        setCoordinates(newCoords);
        
        // Use centralized formatting utility
        const formattedLocation = formatFromGooglePlace(place.address_components, place.name);
        setLocation(formattedLocation || place.name);
        
        // Update map
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setCenter(newCoords);
          mapInstanceRef.current.setZoom(10);
        }
        if (markerRef.current) {
          markerRef.current.setPosition(newCoords);
        }
        if (circleRef.current) {
          circleRef.current.setCenter(newCoords);
        }
      }
    });

    autocompleteRef.current = autocomplete;
  }, [isOpen, mapLoaded]);

  // Update circle radius when radius changes
  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(radius * 1000);
      
      // Adjust map zoom based on radius
      if (mapInstanceRef.current) {
        const zoomLevels = {
          10: 11,
          25: 10,
          50: 9,
          100: 8,
          250: 7,
          500: 6
        };
        mapInstanceRef.current.setZoom(zoomLevels[radius] || 8);
      }
    }
  }, [radius]);

  const reverseGeocode = useCallback((coords) => {
    if (!window.google) return;
    
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: coords }, (results, status) => {
      if (status === 'OK' && results[0]) {
        // Find city-level result
        const cityResult = results.find(r => 
          r.types.includes('locality') || r.types.includes('administrative_area_level_1')
        ) || results[0];
        
        // Use centralized formatting utility
        const formattedLocation = formatFromGooglePlace(cityResult.address_components);
        setLocation(formattedLocation || cityResult.formatted_address);
      }
    });
  }, []);

  // Fall back to IP lookup when geolocation fails
  const fallbackToIpLookup = useCallback(async () => {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      
      if (data.latitude && data.longitude) {
        const newCoords = {
          lat: data.latitude,
          lng: data.longitude
        };
        setCoordinates(newCoords);
        
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setCenter(newCoords);
          mapInstanceRef.current.setZoom(10);
        }
        if (markerRef.current) {
          markerRef.current.setPosition(newCoords);
        }
        if (circleRef.current) {
          circleRef.current.setCenter(newCoords);
        }
        
        // Use city from IP lookup - format as "City, Province" only (no country)
        const locationString = [data.city, data.region_code || data.region].filter(Boolean).join(', ');
        setLocation(locationString || 'Your Location');
      } else {
        setLocation('');
      }
    } catch (error) {
      console.error('IP lookup failed:', error);
      setLocation('');
    }
  }, []);

  const handleCurrentLocation = () => {
    // Clear localStorage to allow fresh location detection
    if (onUseCurrentLocation) {
      localStorage.removeItem('userSelectedLocation');
    }

    // Show loading state
    setLocation('Getting your location...');

    // Check if geolocation is available
    if (!navigator.geolocation) {
      // Fall back to IP lookup
      fallbackToIpLookup();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newCoords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setCoordinates(newCoords);
        
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setCenter(newCoords);
          mapInstanceRef.current.setZoom(10);
        }
        if (markerRef.current) {
          markerRef.current.setPosition(newCoords);
        }
        if (circleRef.current) {
          circleRef.current.setCenter(newCoords);
        }
        
        // Reverse geocode to get the city name and update location field immediately
        if (window.google && window.google.maps) {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: newCoords }, (results, status) => {
            if (status === 'OK' && results[0]) {
              // Find city-level result
              const cityResult = results.find(r => 
                r.types.includes('locality') || r.types.includes('administrative_area_level_1')
              ) || results[0];
              
              // Use centralized formatting utility
              const locationString = formatFromGooglePlace(cityResult.address_components) || cityResult.formatted_address;
              setLocation(locationString);
            } else {
              setLocation('Your Location');
            }
          });
        } else {
          setLocation('Your Location');
        }
      },
      (error) => {
        console.error('Geolocation error, falling back to IP lookup:', error);
        // Fall back to IP lookup instead of showing error
        fallbackToIpLookup();
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleApply = () => {
    // Save the user-selected location to localStorage for session persistence
    // This ensures the location persists on page refresh until user opts to use IP lookup again
    if (location && coordinates) {
      const locationData = {
        city: location,
        lat: coordinates.lat,
        lng: coordinates.lng,
        radius: radius,
        source: 'user_search', // Mark as user-selected (not IP lookup)
        savedAt: new Date().toISOString(),
        // Set expiration to 24 hours from now (or use admin-configured value)
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };
      localStorage.setItem('userSelectedLocation', JSON.stringify(locationData));
      console.log('[LocationSearchModal] Saved user location to localStorage:', locationData);
    }
    
    onApply({
      location,
      radius,
      coordinates
    });
    onClose();
  };

  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={onClose}
      title="Change location"
      size="medium"
      primaryAction={{ label: 'Apply', onClick: handleApply }}
      secondaryAction={false}
    >
      <p className="modal-subtitle">Search by city, neighborhood or ZIP code.</p>

      {/* Location Input */}
      <div className="location-input-group">
        <div className="input-icon">
          <i className="fas fa-map-marker-alt"></i>
        </div>
        <div className="input-content">
          <label>Location</label>
          <input
            ref={inputRef}
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Enter a location"
          />
        </div>
        <button 
          className="current-location-btn-inline"
          onClick={handleCurrentLocation}
          title="Use my current location"
          type="button"
        >
          <i className="fas fa-location-arrow"></i>
        </button>
      </div>

      {/* Radius Selector */}
      <div className="radius-selector">
        <div className="input-icon">
          <i className="fas fa-expand-arrows-alt"></i>
        </div>
        <div className="input-content">
          <label>Radius</label>
          <select 
            value={radius} 
            onChange={(e) => setRadius(Number(e.target.value))}
          >
            {radiusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="select-arrow">
          <i className="fas fa-chevron-down"></i>
        </div>
      </div>

      {/* Map Container */}
      <div className="map-container">
        <div ref={mapRef} className="map"></div>
      </div>

    </UniversalModal>
  );
};

export default LocationSearchModal;
