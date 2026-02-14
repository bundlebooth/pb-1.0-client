import React, { useEffect, useRef, useState, useCallback } from 'react';
import { encodeVendorId } from '../utils/hashIds';

function MapView({ vendors, onVendorSelect, selectedVendorId, loading = false, userLocation = null, onMapBoundsChange = null, searchOnDrag = false }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const markerClusterRef = useRef(null);
  const infoWindowRef = useRef(null);
  const userLocationMarkerRef = useRef(null); // Track user location marker
  const [mapLoaded, setMapLoaded] = useState(false);
  const [userCity, setUserCity] = useState(''); // Store user's city name
  const [searchOnDragEnabled, setSearchOnDragEnabled] = useState(searchOnDrag);
  const isInitializingRef = useRef(false); // Prevent duplicate initialization
  const previousVendorsRef = useRef([]); // Track previous vendors to prevent unnecessary updates
  const dragTimeoutRef = useRef(null); // Debounce drag events
  const searchOnDragEnabledRef = useRef(searchOnDrag); // Ref to track current state for event listeners
  const onMapBoundsChangeRef = useRef(onMapBoundsChange); // Ref for callback

  // Helper function to create custom marker icon (grey by default, blue on hover/click)
  const createMarkerIcon = useCallback((color = '#9CA3AF', isHovered = false) => {
    // Small grey pin style matching Google Maps default
    const size = isHovered ? 28 : 20;
    const svg = `
      <svg width="${size}" height="${size}" viewBox="0 0 27 43" xmlns="http://www.w3.org/2000/svg">
        <g fill="none" fill-rule="evenodd">
          <path d="M13.5 0C6.044 0 0 6.044 0 13.5c0 1.45.228 2.853.65 4.165C2.723 25.45 13.5 43 13.5 43s10.777-17.55 12.85-25.335c.422-1.312.65-2.715.65-4.165C27 6.044 20.956 0 13.5 0z" 
                fill="${color}"/>
          <ellipse fill="#FFFFFF" cx="13.5" cy="13.5" rx="5.5" ry="5.5"/>
        </g>
      </svg>
    `;
    
    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
  }, []);

  const createMiniVendorCardHTML = useCallback((vendor) => {
    // Image URL resolution - match VendorCard.js
    const imageUrl = vendor.LogoURL || 
                     vendor.FeaturedImageURL || 
                     vendor.featuredImageURL ||
                     vendor.featuredImageUrl ||
                     vendor.FeaturedImageUrl ||
                     vendor.image || 
                     vendor.ImageURL ||
                     vendor.imageURL ||
                     vendor.imageUrl ||
                     vendor.ProfileImageURL ||
                     vendor.profileImage ||
                     vendor.featuredImage?.url || 
                     vendor.featuredImage?.thumbnailUrl || 
                     (vendor.images && vendor.images.length > 0 ? vendor.images[0].url : null) ||
                     'https://res.cloudinary.com/dxgy4apj5/image/upload/v1755105530/image_placeholder.png';
    
    // Guest Favorite status
    const isGuestFavorite = vendor.IsGuestFavorite === true || vendor.isGuestFavorite === true;
    
    // Price resolution
    const rawPrice = vendor.startingPrice ?? vendor.MinPriceNumeric ?? vendor.MinPrice ?? 
                     vendor.price ?? vendor.Price ?? vendor.minPrice ?? vendor.starting_price ?? 
                     vendor.HourlyRate ?? vendor.BasePrice;
    let hourlyRate = 0;
    if (rawPrice !== undefined && rawPrice !== null && rawPrice !== '') {
      if (typeof rawPrice === 'number') {
        hourlyRate = Math.round(rawPrice);
      } else if (typeof rawPrice === 'string') {
        const parsed = parseFloat(rawPrice.replace(/[^0-9.]/g, ''));
        if (!isNaN(parsed)) hourlyRate = Math.round(parsed);
      }
    }
    
    // Rating and reviews
    const rating = (() => {
      const r = parseFloat(vendor.averageRating ?? vendor.rating ?? vendor.AverageRating ?? 0);
      return isNaN(r) || r === 0 ? 0 : r;
    })();
    const reviewCount = vendor.totalReviews ?? vendor.reviewCount ?? vendor.TotalReviews ?? 0;
    
    // Location - format to "City, AB" short format
    const locCity = vendor.City || vendor.city || '';
    const locState = vendor.State || vendor.state || '';
    const rawLocation = (vendor.location && vendor.location.trim()) || 
                        [locCity, locState].filter(Boolean).join(', ');
    // Format location to short format inline (avoid import in this file)
    const locationText = (() => {
      if (!rawLocation) return '';
      if (/^[^,]+,\s*[A-Z]{2}$/.test(rawLocation.trim())) return rawLocation.trim();
      const parts = rawLocation.split(',').map(p => p.trim()).filter(Boolean);
      if (parts.length === 0) return rawLocation;
      const city = parts[0];
      const provAbbr = { 'alberta': 'AB', 'british columbia': 'BC', 'manitoba': 'MB', 'new brunswick': 'NB', 'newfoundland and labrador': 'NL', 'newfoundland': 'NL', 'northwest territories': 'NT', 'nova scotia': 'NS', 'nunavut': 'NU', 'ontario': 'ON', 'prince edward island': 'PE', 'quebec': 'QC', 'saskatchewan': 'SK', 'yukon': 'YT' };
      for (let i = 1; i < parts.length; i++) {
        const part = parts[i].toLowerCase().replace('canada', '').trim();
        if (provAbbr[part]) return `${city}, ${provAbbr[part]}`;
        if (/^[A-Z]{2}$/.test(parts[i].trim())) return `${city}, ${parts[i].trim()}`;
      }
      return city;
    })();
    
    // Response time - format to "Responds within X hours"
    const responseTimeMinutes = vendor.avgResponseMinutes || vendor.ResponseTimeMinutes || 0;
    const responseTime = (() => {
      if (!responseTimeMinutes || responseTimeMinutes <= 0) return 'within a few hours';
      if (responseTimeMinutes < 60) return `within ${responseTimeMinutes} mins`;
      if (responseTimeMinutes < 120) return 'within 1 hour';
      if (responseTimeMinutes < 1440) return `within ${Math.round(responseTimeMinutes / 60)} hours`;
      return `within ${Math.round(responseTimeMinutes / 1440)} days`;
    })();
    const businessName = vendor.BusinessName || vendor.name || 'Vendor';
    
    // Compact map info window card - smaller size
    return `
      <div class="map-vendor-card" style="width: 180px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.15); cursor: pointer; margin: 0; padding: 0;">
        <!-- Image Container -->
        <img 
          src="${imageUrl}" 
          alt="${businessName}"
          onerror="this.src='https://res.cloudinary.com/dxgy4apj5/image/upload/v1755105530/image_placeholder.png';"
          style="width: 100%; height: 120px; object-fit: cover; object-position: center; display: block; margin: 0; padding: 0; border-radius: 10px 10px 0 0;"
        />
        <!-- Card Content -->
        <div style="padding: 8px 10px 10px;">
          <div style="font-size: 13px; color: #222; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin: 0 0 2px 0;">${businessName}</div>
          ${locationText ? `<div style="font-size: 11px; color: #717171; margin: 0 0 2px 0;">${locationText}</div>` : ''}
          <div style="font-size: 11px; color: #717171; display: flex; align-items: center; gap: 4px;">
            <span>Contact for pricing</span>
            ${reviewCount > 0 ? `<span>·</span><span style="color: #5e72e4;">★</span><span style="color: #222; font-weight: 500;">${rating > 0 ? rating.toFixed(1) : '5.0'}</span><span>(${reviewCount})</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }, []);

  const createLoadingSkeletonHTML = useCallback(() => {
    return `
      <div style="width: 220px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
        <!-- Image Skeleton -->
        <div style="position: relative; width: 100%; padding-top: 66.67%; overflow: hidden; background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite;">
        </div>
        
        <!-- Content Skeleton -->
        <div style="padding: 10px; display: flex; flex-direction: column; gap: 6px;">
          <div style="height: 18px; background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 4px; width: 70%;"></div>
          <div style="height: 16px; background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 4px; width: 90%;"></div>
          <div style="height: 16px; background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 4px; width: 50%;"></div>
        </div>
        
        <style>
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        </style>
      </div>
    `;
  }, []);

  const updateVendorsInViewport = useCallback(() => {
    if (!mapInstanceRef.current) return;

    const bounds = mapInstanceRef.current.getBounds();
    if (!bounds) return;

    const vendorsInView = vendors.filter(vendor => {
      const lat = parseFloat(vendor.Latitude || vendor.latitude || vendor.lat);
      const lng = parseFloat(vendor.Longitude || vendor.longitude || vendor.lng || vendor.lon);
      
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        return false;
      }

      const position = new window.google.maps.LatLng(lat, lng);
      return bounds.contains(position);
    });

  }, [vendors]);

  const createMap = useCallback(() => {
    if (!mapRef.current) {
      console.error('❌ mapRef.current is null!');
      return;
    }

    // Center on vendors if available, otherwise use a generic US center
    let mapCenter = { lat: 39.8283, lng: -98.5795 }; // Geographic center of US
    let mapZoom = 4; // Zoomed out to show whole US
    
    // If we have vendors, center on them
    if (vendors && vendors.length > 0) {
      const validVendors = vendors.filter(v => v.Latitude && v.Longitude);
      if (validVendors.length > 0) {
        // Calculate center of all vendors
        const avgLat = validVendors.reduce((sum, v) => sum + parseFloat(v.Latitude), 0) / validVendors.length;
        const avgLng = validVendors.reduce((sum, v) => sum + parseFloat(v.Longitude), 0) / validVendors.length;
        mapCenter = { lat: avgLat, lng: avgLng };
        mapZoom = validVendors.length === 1 ? 13 : 10; // Closer zoom if we have vendors
      }
    }

    const map = new window.google.maps.Map(mapRef.current, {
      center: mapCenter,
      zoom: mapZoom,
      mapTypeControl: false, // Remove Map/Satellite toggle
      streetViewControl: false,
      fullscreenControl: false, // Remove fullscreen button
      zoomControl: false, // Remove zoom +/- buttons
      gestureHandling: 'greedy', // Allow scroll zoom without Ctrl key
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ]
    });

    mapInstanceRef.current = map;
    setMapLoaded(true);

    // Add bounds changed listener for viewport tracking
    map.addListener('bounds_changed', () => {
      updateVendorsInViewport();
    });

    // Helper function to trigger bounds change callback
    const triggerBoundsChange = () => {
      if (searchOnDragEnabledRef.current && onMapBoundsChangeRef.current) {
        // Debounce the search to avoid too many API calls
        if (dragTimeoutRef.current) {
          clearTimeout(dragTimeoutRef.current);
        }
        dragTimeoutRef.current = setTimeout(() => {
          const bounds = map.getBounds();
          const center = map.getCenter();
          if (bounds && center) {
            const ne = bounds.getNorthEast();
            const sw = bounds.getSouthWest();
            onMapBoundsChangeRef.current({
              center: { lat: center.lat(), lng: center.lng() },
              bounds: {
                north: ne.lat(),
                south: sw.lat(),
                east: ne.lng(),
                west: sw.lng()
              },
              zoom: map.getZoom()
            });
          }
        }, 800); // 800ms debounce - responsive but avoids spam
      }
    };

    // Use 'idle' event - fires after map stops moving (pan, zoom, etc.)
    // This is the most reliable way to detect when user finishes interacting
    map.addListener('idle', () => {
      triggerBoundsChange();
    });

  }, [updateVendorsInViewport]);

  const initializeMap = useCallback(async () => {
    // Prevent duplicate initialization
    if (isInitializingRef.current || mapInstanceRef.current) {
      return;
    }
    
    isInitializingRef.current = true;
    
    // Check if Google Maps API is fully loaded (including ControlPosition)
    const isGoogleMapsReady = () => {
      return window.google && 
             window.google.maps && 
             window.google.maps.Map && 
             window.google.maps.ControlPosition;
    };
    
    if (!isGoogleMapsReady()) {
      // Wait for Google Maps to be fully loaded from CDN
      const checkGoogleMaps = setInterval(() => {
        if (isGoogleMapsReady()) {
          clearInterval(checkGoogleMaps);
          createMap();
          isInitializingRef.current = false;
        }
      }, 100);
      return;
    }
    
    createMap();
    isInitializingRef.current = false;
  }, [createMap]);

  const updateMarkers = useCallback(() => {
    if (!mapInstanceRef.current || !window.google || !window.google.maps) {
      return;
    }

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Clear cluster if exists
    if (markerClusterRef.current) {
      markerClusterRef.current.clearMarkers();
    }

    const bounds = new window.google.maps.LatLngBounds();
    let hasValidMarkers = false;

    // Create markers for each vendor
    vendors.forEach(vendor => {
      // Try multiple field name variations for coordinates
      const lat = parseFloat(vendor.Latitude || vendor.latitude || vendor.lat);
      const lng = parseFloat(vendor.Longitude || vendor.longitude || vendor.lng || vendor.lon);

      // Only check if coordinates exist and are valid numbers
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        return;
      }

      const position = { lat, lng };
      
      // Create grey marker by default (smaller size)
      const greyIcon = createMarkerIcon('#9CA3AF', false);
      const blueIcon = createMarkerIcon('#5E72E4', true);
      
      const marker = new window.google.maps.Marker({
        position,
        map: mapInstanceRef.current,
        title: vendor.BusinessName || vendor.name,
        animation: searchOnDragEnabledRef.current ? null : window.google.maps.Animation.DROP,
        icon: {
          url: greyIcon,
          scaledSize: new window.google.maps.Size(20, 30),
          anchor: new window.google.maps.Point(10, 30)
        }
      });
      
      // Add hover effect - turn blue on mouseover
      marker.addListener('mouseover', () => {
        marker.setIcon({
          url: blueIcon,
          scaledSize: new window.google.maps.Size(28, 42),
          anchor: new window.google.maps.Point(14, 42)
        });
      });
      
      // Return to grey on mouseout (unless InfoWindow is open)
      marker.addListener('mouseout', () => {
        if (!infoWindowRef.current || infoWindowRef.current.anchor !== marker) {
          marker.setIcon({
            url: greyIcon,
            scaledSize: new window.google.maps.Size(20, 30),
            anchor: new window.google.maps.Point(10, 30)
          });
        }
      });

      // Store vendor ID and data with marker
      marker.vendorId = vendor.VendorProfileID || vendor.id;
      marker.vendorData = vendor;

      // Add click listener to show InfoWindow with mini vendor card
      marker.addListener('click', () => {
        // Reset all markers to grey
        markersRef.current.forEach(m => {
          if (m !== marker) {
            m.setIcon({
              url: greyIcon,
              scaledSize: new window.google.maps.Size(20, 30),
              anchor: new window.google.maps.Point(10, 30)
            });
          }
        });
        
        // Keep clicked marker blue
        marker.setIcon({
          url: blueIcon,
          scaledSize: new window.google.maps.Size(28, 42),
          anchor: new window.google.maps.Point(14, 42)
        });
        
        // Close existing InfoWindow if any
        if (infoWindowRef.current) {
          infoWindowRef.current.close();
        }
        
        // Show loading skeleton first
        const loadingHTML = createLoadingSkeletonHTML();
        const infoWindow = new window.google.maps.InfoWindow({
          content: loadingHTML,
          maxWidth: 240
        });
        
        try {
          infoWindow.open(mapInstanceRef.current, marker);
          infoWindowRef.current = infoWindow;
          // After a brief delay, replace with actual card content
          setTimeout(() => {
            const cardHTML = createMiniVendorCardHTML(vendor);
            infoWindow.setContent(cardHTML);
          }, 300);
        } catch (error) {
          console.error('Error opening InfoWindow:', error);
        }
        
        // Listen for close events
        window.google.maps.event.addListener(infoWindow, 'closeclick', () => {
          marker.setIcon({
            url: greyIcon,
            scaledSize: new window.google.maps.Size(20, 30),
            anchor: new window.google.maps.Point(10, 30)
          });
        });
        
        // Style and add interactions when DOM is ready
        window.google.maps.event.addListener(infoWindow, 'domready', () => {
          // HIDE Google's default close button
          const closeButton = document.querySelector('button[title="Close"]');
          if (closeButton) {
            closeButton.style.display = 'none';
          }
          
          // Add global close function for the X button in the card
          window.closeMapInfoWindow = () => {
            if (infoWindowRef.current) {
              infoWindowRef.current.close();
              // Reset marker to grey
              marker.setIcon({
                url: greyIcon,
                scaledSize: new window.google.maps.Size(20, 30),
                anchor: new window.google.maps.Point(10, 30)
              });
            }
          };
          
          // Style InfoWindow - remove padding but keep content visible
          const iwContainer = document.querySelector('.gm-style-iw-c');
          if (iwContainer) {
            iwContainer.style.padding = '0';
            iwContainer.style.borderRadius = '10px';
            iwContainer.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
            iwContainer.style.overflow = 'hidden';
          }
          const iwContent = document.querySelector('.gm-style-iw-d');
          if (iwContent) {
            iwContent.style.padding = '0';
            iwContent.style.margin = '0';
            iwContent.style.overflow = 'visible';
          }
          // Hide close button container (causes top gap) and arrow
          const closeBtn = document.querySelector('.gm-style-iw-chr');
          if (closeBtn) closeBtn.style.display = 'none';
          const arrow = document.querySelector('.gm-style-iw-tc');
          if (arrow) arrow.style.display = 'none';
          const hoverBtn = document.querySelector('.gm-ui-hover-effect');
          if (hoverBtn) hoverBtn.style.display = 'none';
          
          // Click on card to navigate to vendor profile page
          const cardDiv = document.querySelector('.map-vendor-card');
          if (cardDiv) {
            cardDiv.addEventListener('click', () => {
              const vendorId = marker.vendorId;
              // Navigate to vendor profile page with encoded ID
              window.location.href = `/vendor/${encodeVendorId(vendorId)}`;
            });
          }
        });
      });

      markersRef.current.push(marker);
      bounds.extend(position);
      hasValidMarkers = true;
    });

    // Show city-level view instead of zooming to individual vendors
    // This keeps the map at a city overview level
    // BUT: Don't re-center if searchOnDrag is enabled - user is controlling the map position
    // When searchOnDrag is enabled, NEVER recenter or change zoom - user controls the map
    // Also don't recenter if map expansion is in progress (Load More Vendors)
    if (hasValidMarkers && !searchOnDragEnabledRef.current && !window._mapExpandInProgress) {
      // If we have user location, center on that city
      if (userLocation && userLocation.lat && userLocation.lng) {
        mapInstanceRef.current.setCenter({ lat: userLocation.lat, lng: userLocation.lng });
        mapInstanceRef.current.setZoom(11); // City-level zoom
      } else {
        // Otherwise center on vendors but keep city-level zoom
        const center = bounds.getCenter();
        mapInstanceRef.current.setCenter(center);
        mapInstanceRef.current.setZoom(11); // City-level zoom, don't zoom in on vendors
      }
    }
    // When searchOnDrag is enabled, pins update in place without moving the map

    // No clustering - show all individual pins like Google Maps default
    // Clustering disabled to match the desired pin style
  }, [vendors, onVendorSelect, createMiniVendorCardHTML, createMarkerIcon, userLocation]);

  // Update map center when userLocation changes
  // No marker is shown, but map centers on the user's location
  const updateUserLocationMarker = useCallback(async () => {
    // Remove existing user location marker if any
    if (userLocationMarkerRef.current) {
      userLocationMarkerRef.current.setMap(null);
      userLocationMarkerRef.current = null;
    }
    
    // Do NOT create a marker - user requested no blue location marker
    // Only center the map if searchOnDrag is NOT enabled
    // When searchOnDrag is enabled, user controls the map position - don't recenter
    if (mapInstanceRef.current && userLocation && userLocation.lat && userLocation.lng && !searchOnDragEnabledRef.current) {
      mapInstanceRef.current.setCenter({ lat: userLocation.lat, lng: userLocation.lng });
      mapInstanceRef.current.setZoom(11); // City-level zoom
    }
    
    // Store city name if available (regardless of searchOnDrag state)
    if (userLocation && userLocation.city) {
      setUserCity(userLocation.city);
    }
  }, [userLocation]);

  const highlightMarker = useCallback((vendorId, shouldAnimate = false) => {
    const greyIcon = createMarkerIcon('#9CA3AF', false);
    const blueIcon = createMarkerIcon('#5E72E4', true);
    
    markersRef.current.forEach(marker => {
      if (marker.vendorId === vendorId) {
        marker.setIcon({
          url: blueIcon,
          scaledSize: new window.google.maps.Size(28, 42),
          anchor: new window.google.maps.Point(14, 42)
        });
        // Only animate if explicitly requested (e.g., when clicking from list)
        if (shouldAnimate) {
          marker.setAnimation(window.google.maps.Animation.BOUNCE);
          setTimeout(() => marker.setAnimation(null), 2000);
        }
      } else {
        marker.setIcon({
          url: greyIcon,
          scaledSize: new window.google.maps.Size(20, 30),
          anchor: new window.google.maps.Point(10, 30)
        });
      }
    });
  }, [createMarkerIcon]);

  // Keep refs in sync with state/props for event listeners (fixes closure issue)
  useEffect(() => {
    searchOnDragEnabledRef.current = searchOnDragEnabled;
  }, [searchOnDragEnabled]);

  useEffect(() => {
    onMapBoundsChangeRef.current = onMapBoundsChange;
  }, [onMapBoundsChange]);

  // Initialize map ONCE on mount
  useEffect(() => {
    if (!mapInstanceRef.current) {
      initializeMap();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers when vendors change
  useEffect(() => {
    if (!mapLoaded || vendors.length === 0) return;
    
    // Check if vendors actually changed to prevent unnecessary updates
    const vendorsChanged = vendors.length !== previousVendorsRef.current.length ||
      vendors.some((v, i) => {
        const prev = previousVendorsRef.current[i];
        return !prev || (v.VendorProfileID || v.id) !== (prev.VendorProfileID || prev.id);
      });
    
    // Also update if we have vendors but no markers (initial load case)
    const needsInitialMarkers = vendors.length > 0 && markersRef.current.length === 0;
    
    if (vendorsChanged || needsInitialMarkers) {
      previousVendorsRef.current = vendors;
      updateMarkers();
    }
  }, [vendors, mapLoaded, updateMarkers]);

  useEffect(() => {
    if (mapLoaded && selectedVendorId) {
      highlightMarker(selectedVendorId, true); // Animate when selected from map
    }
  }, [selectedVendorId, mapLoaded, highlightMarker]);

  // Update user location marker when userLocation changes
  useEffect(() => {
    if (mapLoaded && userLocation) {
      updateUserLocationMarker();
    }
  }, [userLocation, mapLoaded, updateUserLocationMarker]);

  // Listen for expandMapRadius event from IndexPage to zoom out programmatically
  useEffect(() => {
    const handleExpandRadius = (event) => {
      if (!mapInstanceRef.current) return;
      
      const { zoom, center } = event.detail;
      
      // Set flag to prevent updateMarkers from resetting zoom
      window._mapExpandInProgress = true;
      
      // Smoothly animate to new zoom level and center
      if (center?.lat && center?.lng) {
        mapInstanceRef.current.panTo({ lat: center.lat, lng: center.lng });
      }
      
      // Use setTimeout to allow pan to complete before zooming
      setTimeout(() => {
        if (zoom && mapInstanceRef.current) {
          mapInstanceRef.current.setZoom(zoom);
        }
        // Clear flag after zoom is complete
        setTimeout(() => {
          window._mapExpandInProgress = false;
        }, 500);
      }, 300);
    };
    
    window.addEventListener('expandMapRadius', handleExpandRadius);
    return () => window.removeEventListener('expandMapRadius', handleExpandRadius);
  }, []);

  // Expose highlight function globally for card hover
  // Use a registry pattern to support multiple MapView instances (desktop + mobile)
  useEffect(() => {
    if (!window._mapViewInstances) {
      window._mapViewInstances = [];
    }
    
    const instanceId = Math.random().toString(36).substr(2, 9);
    const instance = {
      id: instanceId,
      markersRef: markersRef,
      createMarkerIcon: createMarkerIcon
    };
    
    window._mapViewInstances.push(instance);
    
    // Global function that updates markers on ALL map instances
    window.highlightMapMarker = (vendorId, highlight) => {
      if (!window.google) return;
      
      window._mapViewInstances.forEach((inst) => {
        const markers = inst.markersRef?.current;
        if (!markers || markers.length === 0) return;
        
        const greyIcon = inst.createMarkerIcon('#9CA3AF', false);
        const blueIcon = inst.createMarkerIcon('#5E72E4', true);
        
        if (highlight) {
          markers.forEach(marker => {
            if (String(marker.vendorId) === String(vendorId)) {
              marker.setIcon({
                url: blueIcon,
                scaledSize: new window.google.maps.Size(28, 42),
                anchor: new window.google.maps.Point(14, 42)
              });
            } else {
              marker.setIcon({
                url: greyIcon,
                scaledSize: new window.google.maps.Size(20, 30),
                anchor: new window.google.maps.Point(10, 30)
              });
            }
          });
        } else {
          markers.forEach(marker => {
            marker.setIcon({
              url: greyIcon,
              scaledSize: new window.google.maps.Size(20, 30),
              anchor: new window.google.maps.Point(10, 30)
            });
          });
        }
      });
    };

    return () => {
      if (window._mapViewInstances) {
        window._mapViewInstances = window._mapViewInstances.filter(inst => inst.id !== instanceId);
      }
      if (window._mapViewInstances?.length === 0) {
        delete window.highlightMapMarker;
        delete window._mapViewInstances;
      }
    };
  }, [createMarkerIcon]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '500px' }}>
      {/* Search as you drag toggle */}
      {onMapBoundsChange && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          background: 'white',
          borderRadius: '24px',
          padding: '8px 16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          fontWeight: 500
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={searchOnDragEnabled}
              onChange={(e) => setSearchOnDragEnabled(e.target.checked)}
              style={{ 
                width: '18px', 
                height: '18px', 
                accentColor: '#5e72e4',
                cursor: 'pointer'
              }}
            />
            <span style={{ color: '#222' }}>Search as I move the map</span>
          </label>
        </div>
      )}
      
      {/* Map container - always rendered */}
      <div 
        ref={mapRef} 
        id="map-view" 
        style={{ 
          width: '100%', 
          height: '100%',
          minHeight: '500px'
        }}
      />
      
      {/* Loading overlay - only show when NOT in searchOnDrag mode to avoid map "refresh" effect */}
      {loading && !searchOnDragEnabled && (
        <div 
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f9fafb',
            borderRadius: '12px',
            zIndex: 10
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div 
              style={{
                width: '48px',
                height: '48px',
                border: '4px solid #e5e7eb',
                borderTopColor: '#3b82f6',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default MapView;
