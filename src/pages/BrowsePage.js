import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GOOGLE_MAPS_API_KEY, API_BASE_URL } from '../config';
import { apiGet, apiPost } from '../utils/api';
import { PageLayout } from '../components/PageWrapper';
import Header from '../components/Header';
import CategoriesNav from '../components/CategoryPills';
import VendorCard from '../components/VendorCard';
import VendorGrid from '../components/VendorGrid';
import VendorSection from '../components/VendorSection';
import VendorSectionSkeleton from '../components/VendorSectionSkeleton';
import ProfileModal from '../components/ProfileModal';
import MapView from '../components/MapView';
import Footer from '../components/Footer';
import MessagingWidget from '../components/MessagingWidget';
import { showBanner } from '../utils/helpers';
import { getBrowsePageImage } from '../utils/unsplash';
import { encodeVendorId } from '../utils/hashIds';
import { getIPGeolocationServices } from '../utils/locationUtils';
import './BrowsePage.css';

// Category key to label mapping - IDs match DB directly
const categoryLabels = {
  'all': 'All Categories',
  'venue': 'Venues',
  'photo': 'Photography',
  'video': 'Videography',
  'music': 'Music',
  'dj': 'DJ',
  'catering': 'Catering',
  'entertainment': 'Entertainment',
  'experiences': 'Experiences',
  'decorations': 'Decorations',
  'beauty': 'Beauty',
  'cake': 'Cake',
  'transportation': 'Transportation',
  'planners': 'Planners',
  'fashion': 'Fashion',
  'stationery': 'Stationery'
};

// Discovery type to display info mapping with hero content
const discoveryTypes = {
  'trending': { 
    title: 'Trending Vendors', 
    icon: 'fa-chart-line', 
    color: '#FF385C',
    heroTitle: 'Find and Book\nTrending Vendors Near You',
    heroSubtitle: 'Discover the most popular vendors that everyone is booking right now',
    heroImage: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80',
    stats: [
      { value: '500+', label: 'Vendors on platform' },
      { value: '4.8/5', label: 'Average rating' },
      { value: '$150', label: 'Average cost' }
    ]
  },
  'trending-vendors': { 
    title: 'Trending Vendors', 
    icon: 'fa-chart-line', 
    color: '#FF385C',
    heroTitle: 'Find and Book\nTrending Vendors Near You',
    heroSubtitle: 'Discover the most popular vendors that everyone is booking right now',
    heroImage: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80',
    stats: [
      { value: '500+', label: 'Vendors on platform' },
      { value: '4.8/5', label: 'Average rating' },
      { value: '$150', label: 'Average cost' }
    ]
  },
  'top-rated': { 
    title: 'Top Rated Vendors', 
    icon: 'fa-star', 
    color: '#FFB400',
    heroTitle: 'Find and Book\nTop Rated Vendors Near You',
    heroSubtitle: 'Work with the highest-rated professionals for your special event',
    heroImage: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80',
    stats: [
      { value: '300+', label: 'Vendors on platform' },
      { value: '4.9/5', label: 'Average rating' },
      { value: '$175', label: 'Average cost' }
    ]
  },
  'most-responsive': { 
    title: 'Quick Responders', 
    icon: 'fa-bolt', 
    color: '#00A699',
    heroTitle: 'Find and Book\nFast-Responding Vendors',
    heroSubtitle: 'Connect with vendors who respond quickly to your inquiries',
    heroImage: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&q=80',
    stats: [
      { value: '200+', label: 'Vendors on platform' },
      { value: '<1hr', label: 'Avg response time' },
      { value: '95%', label: 'Response rate' }
    ]
  },
  'quick-responders': { 
    title: 'Quick Responders', 
    icon: 'fa-bolt', 
    color: '#00A699',
    heroTitle: 'Find and Book\nFast-Responding Vendors',
    heroSubtitle: 'Connect with vendors who respond quickly to your inquiries',
    heroImage: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&q=80',
    stats: [
      { value: '200+', label: 'Vendors on platform' },
      { value: '<1hr', label: 'Avg response time' },
      { value: '95%', label: 'Response rate' }
    ]
  },
  'recently-reviewed': { 
    title: 'Recently Reviewed', 
    icon: 'fa-comment-dots', 
    color: '#5E72E4',
    heroTitle: 'Find and Book\nRecently Reviewed Vendors',
    heroSubtitle: 'See what others are saying about these vendors with fresh reviews',
    heroImage: 'https://images.unsplash.com/photo-1529543544277-750e0e8e0e5f?w=800&q=80',
    stats: [
      { value: '1000+', label: 'Recent reviews' },
      { value: '4.7/5', label: 'Average rating' },
      { value: '$140', label: 'Average cost' }
    ]
  },
  'nearby': { 
    title: 'Nearby Vendors', 
    icon: 'fa-location-dot', 
    color: '#8B5CF6',
    heroTitle: 'Find and Book\nVendors Near You',
    heroSubtitle: 'Discover local vendors in your area for convenient service',
    heroImage: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&q=80',
    stats: [
      { value: '100+', label: 'Vendors on platform' },
      { value: '4.8/5', label: 'Average rating' },
      { value: '$130', label: 'Average cost' }
    ]
  },
  'premium': { 
    title: 'Premium Vendors', 
    icon: 'fa-crown', 
    color: '#F59E0B',
    heroTitle: 'Find and Book\nPremium Event Vendors',
    heroSubtitle: 'Experience luxury service from our most exclusive vendors',
    heroImage: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&q=80',
    stats: [
      { value: '100+', label: 'Vendors on platform' },
      { value: '5.0/5', label: 'Average rating' },
      { value: '$250', label: 'Average cost' }
    ]
  },
  'popular': { 
    title: 'Most Booked', 
    icon: 'fa-heart', 
    color: '#EC4899',
    heroTitle: 'Find and Book\nMost Booked Vendors',
    heroSubtitle: 'These vendors are in high demand - book early to secure your date',
    heroImage: 'https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=800&q=80',
    stats: [
      { value: '200+', label: 'Vendors on platform' },
      { value: '4.8/5', label: 'Average rating' },
      { value: '$160', label: 'Average cost' }
    ]
  },
  'most-booked': { 
    title: 'Most Booked', 
    icon: 'fa-heart', 
    color: '#EC4899',
    heroTitle: 'Find and Book\nMost Booked Vendors',
    heroSubtitle: 'These vendors are in high demand - book early to secure your date',
    heroImage: 'https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=800&q=80',
    stats: [
      { value: '200+', label: 'Vendors on platform' },
      { value: '4.8/5', label: 'Average rating' },
      { value: '$160', label: 'Average cost' }
    ]
  },
  'new': { 
    title: 'New Arrivals', 
    icon: 'fa-sparkles', 
    color: '#10B981',
    heroTitle: 'Find and Book\nNewly Added Vendors',
    heroSubtitle: 'Be the first to discover fresh talent joining our platform',
    heroImage: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80',
    stats: [
      { value: '50+', label: 'New this month' },
      { value: '4.5/5', label: 'Average rating' },
      { value: '$120', label: 'Average cost' }
    ]
  },
  'new-arrivals': { 
    title: 'New Arrivals', 
    icon: 'fa-sparkles', 
    color: '#10B981',
    heroTitle: 'Find and Book\nNewly Added Vendors',
    heroSubtitle: 'Be the first to discover fresh talent joining our platform',
    heroImage: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80',
    stats: [
      { value: '50+', label: 'New this month' },
      { value: '4.5/5', label: 'Average rating' },
      { value: '$120', label: 'Average cost' }
    ]
  },
  'recommended': { 
    title: 'Recommended', 
    icon: 'fa-thumbs-up', 
    color: '#3B82F6',
    heroTitle: 'Find and Book\nRecommended Vendors',
    heroSubtitle: 'Hand-picked vendors based on quality, reliability, and reviews',
    heroImage: 'https://images.unsplash.com/photo-1505236858219-8359eb29e329?w=800&q=80',
    stats: [
      { value: '150+', label: 'Vendors on platform' },
      { value: '4.8/5', label: 'Average rating' },
      { value: '$145', label: 'Average cost' }
    ]
  }
};

function BrowsePage() {
  const { filter, subfilter } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();

  // Redirect /browse/all to /browse (with any query params preserved)
  useEffect(() => {
    if (filter?.toLowerCase() === 'all') {
      const queryParams = location.search;
      navigate(`/browse${queryParams}`, { replace: true });
    }
  }, [filter, location.search, navigate]);

  // Determine what type of filter we're dealing with
  // Treat "all" as no filter (will be redirected above)
  const normalizedFilter = filter?.toLowerCase() === 'all' ? null : filter;
  const isCategory = normalizedFilter && categoryLabels[normalizedFilter.toLowerCase()];
  const isDiscovery = normalizedFilter && discoveryTypes[normalizedFilter.toLowerCase()];
  const isCity = normalizedFilter && !isCategory && !isDiscovery;

  // Parse the filters
  const cityFilter = isCity ? normalizedFilter : (subfilter && !categoryLabels[subfilter?.toLowerCase()] ? subfilter : null);
  const categoryFilter = isCategory ? normalizedFilter.toLowerCase() : (subfilter && categoryLabels[subfilter?.toLowerCase()] ? subfilter.toLowerCase() : null);
  const discoveryFilter = isDiscovery ? normalizedFilter.toLowerCase() : null;

  // State
  const [vendors, setVendors] = useState([]);
  const [categorySections, setCategorySections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState('recommended');
  const [mapActive, setMapActive] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState(null);
  const [filters, setFilters] = useState({
    location: cityFilter || ''
  });
  const [dynamicHeroImage, setDynamicHeroImage] = useState(null);

  const pageSize = 24;
  const hasLoadedRef = useRef(false);

  // Build page title and description
  const getPageInfo = () => {
    let title = 'Browse Vendors';
    let description = 'Find the perfect vendors for your event';
    let icon = 'fa-store';
    let iconColor = '#6366F1';

    if (discoveryFilter && discoveryTypes[discoveryFilter]) {
      const discovery = discoveryTypes[discoveryFilter];
      title = discovery.title;
      icon = discovery.icon;
      iconColor = discovery.color;
      if (cityFilter) {
        title += ` in ${decodeURIComponent(cityFilter)}`;
      }
    } else if (categoryFilter && categoryLabels[categoryFilter]) {
      title = categoryLabels[categoryFilter];
      if (cityFilter) {
        title += ` in ${decodeURIComponent(cityFilter)}`;
      }
    } else if (cityFilter) {
      title = `Vendors in ${decodeURIComponent(cityFilter)}`;
    }

    return { title, description, icon, iconColor };
  };

  const pageInfo = getPageInfo();

  // Get hero content for ALL browse pages - consistent layout
  const getHeroContent = () => {
    // Show hero for discovery type pages
    if (discoveryFilter && discoveryTypes[discoveryFilter]) {
      const discovery = discoveryTypes[discoveryFilter];
      return {
        title: discovery.heroTitle || discovery.title,
        subtitle: discovery.heroSubtitle || 'Find the perfect vendors for your event',
        image: discovery.heroImage,
        stats: discovery.stats || [],
        color: discovery.color,
        icon: discovery.icon,
        discoveryType: discoveryFilter,
        isDiscoveryPage: true,
        isCityPage: false
      };
    }
    // Show hero for city + category pages (e.g., /browse/Toronto/photo)
    if (cityFilter && categoryFilter) {
      const cityName = decodeURIComponent(cityFilter);
      const categoryLabel = categoryLabels[categoryFilter] || categoryFilter;
      return {
        title: `Find and Book\n${categoryLabel} in ${cityName}`,
        subtitle: `Discover the best ${categoryLabel.toLowerCase()} for your event in ${cityName}`,
        image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80',
        stats: null,
        color: '#5086E8',
        icon: 'fa-store',
        discoveryType: null,
        isDiscoveryPage: false,
        isCityPage: true,
        cityName: cityName,
        useDynamicStats: true
      };
    }
    // Show hero for city pages (e.g., /browse/Toronto)
    if (cityFilter && !categoryFilter) {
      const cityName = decodeURIComponent(cityFilter);
      return {
        title: `Find and Book\nVendors in ${cityName}`,
        subtitle: `Discover the best event vendors and services in ${cityName}`,
        image: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&q=80',
        stats: null,
        color: '#6366F1',
        icon: 'fa-location-dot',
        discoveryType: null,
        isDiscoveryPage: false,
        isCityPage: true,
        cityName: cityName,
        useDynamicStats: true
      };
    }
    // Show hero for category-only pages (e.g., /browse/photo)
    if (categoryFilter && !cityFilter) {
      const categoryLabel = categoryLabels[categoryFilter] || categoryFilter;
      return {
        title: `Find and Book\n${categoryLabel}`,
        subtitle: `Discover the best ${categoryLabel.toLowerCase()} for your event across Canada`,
        image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80',
        stats: null,
        color: '#5086E8',
        icon: 'fa-store',
        discoveryType: null,
        isDiscoveryPage: false,
        isCityPage: false,
        isCategoryPage: true,
        useDynamicStats: true
      };
    }
    // Default: Show hero for "All Vendors" page (no filters or normalizedFilter is null)
    return {
      title: 'Find and Book\nEvent Vendors',
      subtitle: 'Browse all vendors across Canada for your next event',
      image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80',
      stats: null,
      color: '#5086E8',
      icon: 'fa-store',
      discoveryType: null,
      isDiscoveryPage: false,
      isCityPage: false,
      isAllVendorsPage: true,
      useDynamicStats: true
    };
  };

  const heroContent = getHeroContent();

  // Fetch dynamic hero image from Unsplash
  useEffect(() => {
    const fetchHeroImage = async () => {
      let imageData = null;
      
      if (discoveryFilter) {
        imageData = await getBrowsePageImage('discovery', discoveryFilter);
      } else if (cityFilter && !categoryFilter) {
        imageData = await getBrowsePageImage('city', decodeURIComponent(cityFilter));
      } else if (categoryFilter) {
        imageData = await getBrowsePageImage('category', categoryFilter);
      } else {
        imageData = await getBrowsePageImage('all', null);
      }
      
      if (imageData?.url) {
        setDynamicHeroImage(imageData);
      }
    };

    fetchHeroImage();
  }, [discoveryFilter, cityFilter, categoryFilter]);

  // Get query params for hero filter state initialization
  const urlParams = new URLSearchParams(location.search);
  const queryCategoryParam = urlParams.get('category');
  const queryCityParam = urlParams.get('city');

  // Helper to normalize city to "City, Province" format
  const normalizeCityWithProvince = (city) => {
    if (!city) return '';
    // If already has comma (province), return as-is
    if (city.includes(',')) return city;
    // Default province mappings for common Canadian cities
    const cityProvinceMap = {
      'toronto': 'ON',
      'vancouver': 'BC',
      'montreal': 'QC',
      'calgary': 'AB',
      'edmonton': 'AB',
      'ottawa': 'ON',
      'winnipeg': 'MB',
      'quebec city': 'QC',
      'hamilton': 'ON',
      'kitchener': 'ON',
      'london': 'ON',
      'victoria': 'BC',
      'halifax': 'NS',
      'saskatoon': 'SK',
      'regina': 'SK',
      'mississauga': 'ON',
      'brampton': 'ON',
      'markham': 'ON',
      'vaughan': 'ON',
      'richmond hill': 'ON',
      'oakville': 'ON',
      'burlington': 'ON'
    };
    const province = cityProvinceMap[city.toLowerCase()];
    return province ? `${city}, ${province}` : city;
  };

  // State for hero filter selections (category and city within discovery)
  const [heroCategory, setHeroCategory] = useState(queryCategoryParam || categoryFilter || 'all');
  const [heroCity, setHeroCity] = useState(normalizeCityWithProvince(queryCategoryParam || (cityFilter ? decodeURIComponent(cityFilter) : '')));
  const [detectedCity, setDetectedCity] = useState(''); // IP-detected city for placeholder

  // Sync hero filters with URL query params when they change
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const cat = params.get('category');
    const city = params.get('city');
    if (cat) setHeroCategory(cat);
    if (city) setHeroCity(normalizeCityWithProvince(city));
  }, [location.search]);

  // Detect city from IP for placeholder
  useEffect(() => {
    const detectCityFromIP = async () => {
      const geoServices = getIPGeolocationServices(API_BASE_URL);
      for (const service of geoServices) {
        try {
          const response = await fetch(service.url);
          if (response.ok) {
            const data = await response.json();
            const parsed = service.parse(data);
            if (parsed && parsed.formattedLocation) {
              setDetectedCity(parsed.formattedLocation);
              return;
            }
          }
        } catch (error) {
          continue;
        }
      }
    };
    detectCityFromIP();
  }, []);

  // State for city input on city pages (editable)
  const [heroCityInput, setHeroCityInput] = useState(cityFilter ? decodeURIComponent(cityFilter) : '');
  
  // Ref for Google Places autocomplete
  const cityInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  // Initialize Google Places autocomplete
  useEffect(() => {
    const initGooglePlaces = () => {
      if (!cityInputRef.current || !window.google?.maps?.places) return;
      
      // Clear existing autocomplete
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }

      const autocomplete = new window.google.maps.places.Autocomplete(cityInputRef.current, {
        types: ['(cities)'],
        componentRestrictions: { country: 'ca' }
      });

      autocompleteRef.current = autocomplete;

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.address_components) {
          // Extract city and province from address components
          let city = '';
          let province = '';
          
          for (const component of place.address_components) {
            if (component.types.includes('locality')) {
              city = component.long_name;
            }
            if (component.types.includes('administrative_area_level_1')) {
              province = component.short_name; // Use short name for province (ON, BC, etc.)
            }
          }
          
          // Format as "City, Province" (e.g., "Toronto, ON")
          const formattedLocation = city && province ? `${city}, ${province}` : city || place.formatted_address?.split(',')[0] || '';
          setHeroCity(formattedLocation);
        } else if (place.formatted_address) {
          // Fallback to first part of formatted address
          setHeroCity(place.formatted_address.split(',')[0].trim());
        }
      });
    };

    // Load Google Maps API if not loaded
    if (!window.google?.maps?.places) {
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (!existingScript) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => setTimeout(initGooglePlaces, 100);
        document.head.appendChild(script);
      } else {
        // Script exists but may still be loading
        existingScript.addEventListener('load', () => setTimeout(initGooglePlaces, 100));
      }
    } else {
      initGooglePlaces();
    }

    return () => {
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [heroContent]);

  // Stats state for dynamic data
  const [pageStats, setPageStats] = useState({
    vendorCount: 0,
    avgRating: 0,
    avgCost: 0
  });

  // Calculate dynamic stats from loaded vendors
  useEffect(() => {
    if (vendors.length > 0) {
      // Calculate average rating
      const vendorsWithRating = vendors.filter(v => {
        const rating = v.averageRating || v.AverageRating || v.rating || 0;
        return rating > 0;
      });
      const avgRating = vendorsWithRating.length > 0
        ? vendorsWithRating.reduce((sum, v) => sum + (v.averageRating || v.AverageRating || v.rating || 0), 0) / vendorsWithRating.length
        : 0;
      
      // Calculate average cost (starting price)
      const vendorsWithPrice = vendors.filter(v => {
        const price = v.startingPrice || v.StartingPrice || v.price || 0;
        return price > 0;
      });
      const avgCost = vendorsWithPrice.length > 0
        ? vendorsWithPrice.reduce((sum, v) => sum + (v.startingPrice || v.StartingPrice || v.price || 0), 0) / vendorsWithPrice.length
        : 0;
      
      setPageStats({
        vendorCount: totalCount || vendors.length,
        avgRating: avgRating.toFixed(1),
        avgCost: Math.round(avgCost)
      });
    }
  }, [vendors, totalCount]);

  // Handle filter search from hero
  const handleHeroSearch = useCallback(() => {
    let url = '';
    const params = new URLSearchParams();
    
    if (heroContent?.isDiscoveryPage) {
      // Discovery page: /browse/trending?category=photo&city=Toronto
      url = `/browse/${discoveryFilter}`;
      if (heroCategory && heroCategory !== 'all') {
        params.set('category', heroCategory);
      }
      if (heroCity && heroCity.trim()) {
        params.set('city', heroCity.trim());
      }
    } else if (heroContent?.isCityPage) {
      // City page: Navigate based on category and city inputs
      const targetCity = heroCityInput.trim() || heroContent.cityName;
      
      // Build URL: /browse/CityName or /browse/CityName/category
      url = `/browse/${encodeURIComponent(targetCity)}`;
      if (heroCategory && heroCategory !== 'all') {
        url += `/${heroCategory}`;
      }
    } else {
      return;
    }
    
    if (params.toString()) {
      url += '?' + params.toString();
    }
    
    navigate(url);
  }, [discoveryFilter, heroCategory, heroCity, heroCityInput, heroContent, navigate]);

  // Build breadcrumb items
  const getBreadcrumbs = () => {
    const crumbs = [{ label: 'Home', path: '/' }];
    
    if (cityFilter) {
      crumbs.push({ 
        label: decodeURIComponent(cityFilter), 
        path: `/browse/${encodeURIComponent(cityFilter)}` 
      });
    }
    
    if (categoryFilter && categoryLabels[categoryFilter]) {
      const catPath = cityFilter 
        ? `/browse/${encodeURIComponent(cityFilter)}/${categoryFilter}`
        : `/browse/${categoryFilter}`;
      crumbs.push({ label: categoryLabels[categoryFilter], path: catPath });
    }
    
    if (discoveryFilter && discoveryTypes[discoveryFilter]) {
      crumbs.push({ 
        label: discoveryTypes[discoveryFilter].title, 
        path: `/browse/${discoveryFilter}` 
      });
    }

    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  // Load favorites
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
  }, [currentUser?.id]);

  // Load vendors based on filters
  const loadVendors = useCallback(async (append = false) => {
    try {
      if (!append) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const nextPage = append ? currentPage + 1 : 1;
      const params = new URLSearchParams();
      params.set('pageNumber', String(nextPage));
      params.set('pageSize', String(pageSize));

      // Get query params for discovery page filtering
      const urlParams = new URLSearchParams(location.search);
      const queryCategoryFilter = urlParams.get('category');
      const queryCityFilter = urlParams.get('city');

      // Use query params if on discovery page, otherwise use route params
      const effectiveCategory = discoveryFilter ? (queryCategoryFilter || categoryFilter) : categoryFilter;
      const effectiveCity = discoveryFilter ? (queryCityFilter || (cityFilter ? decodeURIComponent(cityFilter) : null)) : (cityFilter ? decodeURIComponent(cityFilter) : null);

      // Add city filter
      if (effectiveCity) {
        params.set('city', effectiveCity);
      }

      // Add category filter
      if (effectiveCategory && effectiveCategory !== 'all') {
        params.set('category', effectiveCategory);
      }

      // Add discovery type filters
      if (discoveryFilter) {
        switch (discoveryFilter) {
          case 'trending':
            params.set('sortBy', 'views');
            params.set('trending', 'true');
            break;
          case 'top-rated':
            params.set('sortBy', 'rating');
            params.set('minRating', '4');
            break;
          case 'most-responsive':
            params.set('sortBy', 'responseTime');
            break;
          case 'recently-reviewed':
            params.set('sortBy', 'recentReviews');
            break;
          case 'popular':
            params.set('sortBy', 'bookings');
            break;
          case 'new':
            params.set('sortBy', 'newest');
            break;
          default:
            break;
        }
      }

      // Add sort
      if (sortBy && sortBy !== 'recommended') {
        switch (sortBy) {
          case 'price-low':
            params.set('sortBy', 'priceAsc');
            break;
          case 'price-high':
            params.set('sortBy', 'priceDesc');
            break;
          case 'rating':
            params.set('sortBy', 'rating');
            break;
          case 'nearest':
            params.set('sortBy', 'nearest');
            break;
          default:
            break;
        }
      }

      // Add additional filters
      if (filters.priceLevel) params.set('priceLevel', filters.priceLevel);
      if (filters.minRating) params.set('minRating', filters.minRating);
      if (filters.eventTypes && filters.eventTypes.length > 0) params.set('eventTypes', filters.eventTypes.join(','));
      if (filters.cultures && filters.cultures.length > 0) params.set('cultures', filters.cultures.join(','));
      if (filters.subcategories && filters.subcategories.length > 0) params.set('subcategoryIds', filters.subcategories.join(','));
      if (filters.features && filters.features.length > 0) params.set('featureIds', filters.features.join(','));
      if (filters.experienceRange) params.set('experienceRange', filters.experienceRange);
      if (filters.serviceLocation) params.set('serviceLocation', filters.serviceLocation);
      if (filters.instantBookingOnly) params.set('instantBookingOnly', 'true');
      if (filters.minReviewCount) params.set('minReviewCount', filters.minReviewCount);
      if (filters.freshListingsDays) params.set('freshListingsDays', filters.freshListingsDays);
      if (filters.hasGoogleReviews) params.set('hasGoogleReviews', 'true');
      if (filters.availabilityDate) params.set('availabilityDate', filters.availabilityDate);
      if (filters.availabilityDayOfWeek) params.set('availabilityDayOfWeek', filters.availabilityDayOfWeek);

      let url = `${API_BASE_URL}/vendors?${params.toString()}`;

      // Use category search endpoint if category is specified
      if (effectiveCategory && effectiveCategory !== 'all') {
        url = `${API_BASE_URL}/vendors/search-by-categories?${params.toString()}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch vendors');
      }

      const data = await response.json();
      let newVendors = [];
      let total = 0;
      let sections = [];

      // Handle different response formats
      if (Array.isArray(data.sections)) {
        // Response from search-by-categories - preserve sections for category display
        sections = data.sections.filter(s => s?.vendors?.length > 0);
        newVendors = data.sections.flatMap(s => s?.vendors || []);
        // Deduplicate
        const seen = new Set();
        newVendors = newVendors.filter(v => {
          const k = v.vendorProfileId || v.VendorProfileID || v.id;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
        total = data.sections.reduce((acc, s) => acc + (s?.totalCount || s?.vendors?.length || 0), 0);
      } else {
        newVendors = data.vendors || data.data || [];
        total = data.totalCount || newVendors.length;
        
        // Add analytics badges to vendors based on discovery type
        // Calculate engagement score like backend does: (bookings * 3) + (favorites * 2) + (reviews * 1) + (views * 1)
        newVendors = newVendors.map(vendor => {
          let badge = '';
          // Check all possible view count field names from backend
          const viewCount = vendor.viewCount7Days || vendor.ViewCount7Days || 
                           vendor.profileViews || vendor.ProfileViews ||
                           vendor.viewCount || vendor.ViewCount || 0;
          const bookingCount = vendor.bookingCount || vendor.BookingCount || 0;
          const favoriteCount = vendor.favoriteCount || vendor.FavoriteCount || 0;
          const avgRating = vendor.averageRating || vendor.AverageRating || vendor.rating || 0;
          const totalReviews = vendor.totalReviews || vendor.TotalReviews || vendor.reviewCount || vendor.ReviewCount || 0;
          
          // Calculate trending/engagement score
          const engagementScore = (bookingCount * 3) + (favoriteCount * 2) + (totalReviews * 1) + (viewCount * 1);
          
          if (discoveryFilter === 'trending' || discoveryFilter === 'trending-vendors') {
            // Show views for trending vendors
            if (viewCount > 0) {
              badge = `${viewCount.toLocaleString()} view${viewCount !== 1 ? 's' : ''}`;
            }
          } else if (discoveryFilter === 'most-booked' || discoveryFilter === 'popular') {
            if (bookingCount > 0) {
              badge = `${bookingCount} booking${bookingCount > 1 ? 's' : ''} this month`;
            } else if (favoriteCount > 0) {
              badge = `${favoriteCount} favorite${favoriteCount > 1 ? 's' : ''}`;
            }
          } else if (discoveryFilter === 'top-rated') {
            if (totalReviews > 0) {
              badge = `${avgRating > 0 ? avgRating.toFixed(1) : '5.0'} rating (${totalReviews} reviews)`;
            }
          } else if (discoveryFilter === 'most-responsive') {
            const responseTime = vendor.avgResponseMinutes || vendor.AvgResponseMinutes || vendor.ResponseTime || 0;
            if (responseTime > 0 && responseTime < 60) {
              badge = `Replies in ${responseTime} min`;
            } else if (responseTime >= 60 && responseTime < 1440) {
              badge = `Replies in ${Math.round(responseTime / 60)} hr`;
            }
          } else if (discoveryFilter === 'new' || discoveryFilter === 'new-arrivals') {
            badge = 'New on platform';
          } else if (discoveryFilter === 'premium') {
            badge = 'Premium vendor';
          } else {
            // Default: show views if available
            if (viewCount > 0) {
              badge = `${viewCount.toLocaleString()} view${viewCount !== 1 ? 's' : ''}`;
            }
          }
          
          return { ...vendor, analyticsBadge: badge };
        });
        
        // Group vendors by category for section display
        const categoryGroups = {};
        newVendors.forEach(vendor => {
          const cat = vendor.category || vendor.type || 'other';
          if (!categoryGroups[cat]) {
            categoryGroups[cat] = [];
          }
          categoryGroups[cat].push(vendor);
        });
        
        // Convert to sections array
        sections = Object.entries(categoryGroups).map(([category, vendors]) => ({
          id: category,
          title: categoryLabels[category] || category.charAt(0).toUpperCase() + category.slice(1),
          category: category,
          vendors: vendors
        }));
      }
      
      setCategorySections(sections);

      if (append) {
        setVendors(prev => {
          const merged = [...prev, ...newVendors];
          const byId = new Map();
          for (const v of merged) {
            const key = v.vendorProfileId || v.VendorProfileID || v.id;
            byId.set(String(key || Math.random()), v);
          }
          return Array.from(byId.values());
        });
        setCurrentPage(nextPage);
      } else {
        setVendors(newVendors);
        setCurrentPage(1);
      }
      setTotalCount(total);

    } catch (error) {
      console.error('Error loading vendors:', error);
      showBanner('Failed to load vendors', 'error');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [cityFilter, categoryFilter, discoveryFilter, sortBy, filters, currentPage, location.search]);

  // Initial load
  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadVendors();
      loadFavorites();
    }
  }, []);

  // Reload favorites when user logs in
  useEffect(() => {
    if (currentUser?.id) {
      loadFavorites();
    } else {
      setFavorites([]);
    }
  }, [currentUser?.id, loadFavorites]);

  // Reload when filters change (including query params)
  useEffect(() => {
    if (hasLoadedRef.current) {
      loadVendors();
    }
  }, [filter, subfilter, sortBy, location.search]);

  // Handle category change from nav
  const handleCategoryChange = useCallback((category) => {
    if (cityFilter) {
      navigate(`/browse/${encodeURIComponent(cityFilter)}/${category}`);
    } else {
      navigate(`/browse/${category}`);
    }
  }, [cityFilter, navigate]);

  // Handle sort change
  const handleSortChange = useCallback((e) => {
    setSortBy(e.target.value);
  }, []);

  // Handle favorite toggle
  const handleToggleFavorite = useCallback(async (vendorId) => {
    if (!currentUser) {
      setProfileModalOpen(true);
      return;
    }
    try {
      const response = await apiPost('/favorites/toggle', { userId: currentUser.id, vendorProfileId: vendorId });
      if (!response.ok) throw new Error('Failed to toggle favorite');
      const result = await response.json();
      if (result.IsFavorite) {
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

  // Handle view vendor
  const handleViewVendor = useCallback((vendorId) => {
    navigate(`/vendor/${encodeVendorId(vendorId)}`);
  }, [navigate]);

  // Handle filter change
  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
    loadVendors();
  }, [loadVendors]);

  // Handle map toggle
  const handleToggleMap = useCallback(() => {
    setMapActive(!mapActive);
  }, [mapActive]);

  // Handle vendor select from map
  const handleVendorSelectFromMap = useCallback((vendorId) => {
    setSelectedVendorId(vendorId);
    const card = document.querySelector(`[data-vendor-id="${vendorId}"]`);
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  // Handle highlight vendor (for map interaction)
  const handleHighlightVendor = useCallback((vendorId, highlight) => {
    if (window.highlightMapMarker) {
      window.highlightMapMarker(vendorId, highlight);
    }
  }, []);

  return (
    <PageLayout variant="fullWidth" pageClassName="browse-page">
      <Header 
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
      />

      <ProfileModal isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} />

      <div className="browse-container">
        {/* Giggster-style Hero Section */}
        {heroContent && (
          <section className="browse-hero">
            <div className="browse-hero-content">
              <div className="browse-hero-left">
                <h1 className="browse-hero-title">
                  {heroContent.title.split('\n').map((line, i) => (
                    <React.Fragment key={i}>
                      {line}
                      {i === 0 && <br />}
                    </React.Fragment>
                  ))}
                </h1>
                <p className="browse-hero-subtitle">{heroContent.subtitle}</p>
                
                {/* Filter Form - Giggster style: Category + City */}
                <div className="browse-hero-search">
                  <div className="browse-hero-search-field">
                    <label>What are you planning</label>
                    <select 
                      value={heroCategory}
                      onChange={(e) => setHeroCategory(e.target.value)}
                      className="browse-hero-select"
                    >
                      {Object.entries(categoryLabels).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="browse-hero-search-field">
                    <label>Where</label>
                    <input 
                      ref={cityInputRef}
                      type="text"
                      placeholder={detectedCity || ''}
                      value={heroCity}
                      onChange={(e) => setHeroCity(e.target.value)}
                      className="browse-hero-input"
                    />
                  </div>
                  <button 
                    className="browse-hero-search-btn"
                    onClick={handleHeroSearch}
                    style={{ backgroundColor: '#6366F1' }}
                  >
                    <i className="fas fa-search"></i>
                    <span>Find vendors</span>
                  </button>
                </div>
              </div>
              
              <div className="browse-hero-right">
                <div className="browse-hero-image-wrapper">
                  {dynamicHeroImage?.url ? (
                    <>
                      <img 
                        src={dynamicHeroImage.url} 
                        alt={dynamicHeroImage?.alt || pageInfo.title}
                        className="browse-hero-image"
                      />
                      {dynamicHeroImage?.photographer && (
                        <a 
                          href={dynamicHeroImage.photographerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            position: 'absolute',
                            bottom: '8px',
                            right: '8px',
                            fontSize: '10px',
                            color: 'rgba(255,255,255,0.7)',
                            textDecoration: 'none',
                            backgroundColor: 'rgba(0,0,0,0.3)',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}
                        >
                          Photo by {dynamicHeroImage.photographer}
                        </a>
                      )}
                    </>
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      minHeight: '300px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#f3f4f6',
                      borderRadius: '16px'
                    }}>
                      <div 
                        className="spinner"
                        style={{
                          width: '40px',
                          height: '40px',
                          border: '3px solid #e5e7eb',
                          borderTopColor: '#4F86E8',
                          borderRadius: '50%'
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Stats Bar - Giggster style with real dynamic data */}
            <div className="browse-hero-stats">
              <div className="browse-hero-stat">
                <span className="browse-hero-stat-value">
                  {pageStats.vendorCount > 0 ? pageStats.vendorCount : totalCount || '100'}
                  <span className="stat-suffix">+</span>
                </span>
                <span className="browse-hero-stat-label">Vendors on platform</span>
              </div>
              <div className="browse-hero-stat">
                <span className="browse-hero-stat-value">
                  {pageStats.avgRating > 0 ? pageStats.avgRating : '4.8'}/5
                  <span className="stat-star">☆</span>
                </span>
                <span className="browse-hero-stat-label">Average rating</span>
              </div>
              <div className="browse-hero-stat">
                <span className="browse-hero-stat-value">
                  ${pageStats.avgCost > 0 ? pageStats.avgCost : '150'}
                  <span className="stat-suffix">/hr</span>
                </span>
                <span className="browse-hero-stat-label">Average cost</span>
              </div>
            </div>
          </section>
        )}

        {/* Categories Navigation - Only show if no hero */}
        {!heroContent && (
          <CategoriesNav 
            activeCategory={categoryFilter || 'all'} 
            onCategoryChange={handleCategoryChange} 
            loading={loading}
          />
        )}

        <main className="browse-main">
          {/* Section Title for Vendor Listings - Clean style */}
          <div className="browse-section-header">
            <h2 className="browse-section-title">
              {heroContent ? (
                <>
                  <span 
                    className="browse-section-icon"
                    style={{ 
                      backgroundColor: `${heroContent.color}15`, 
                      color: heroContent.color 
                    }}
                  >
                    <i className={`fas ${heroContent.icon}`}></i>
                  </span>
                  {heroContent.isDiscoveryPage 
                    ? `Top ${discoveryTypes[discoveryFilter]?.title || 'Vendors'}`
                    : pageInfo.title
                  }
                </>
              ) : (
                pageInfo.title
              )}
            </h2>
          </div>


          {/* Vendor Display - Grid View */}
          <div className="browse-grid-view">
            {loading ? (
              // Skeleton grid
              <div className="browse-vendor-grid">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="browse-vendor-skeleton">
                    <div className="skeleton" style={{ width: '100%', paddingTop: '100%', borderRadius: '12px' }}></div>
                    <div className="skeleton" style={{ width: '80%', height: '16px', marginTop: '12px', borderRadius: '4px' }}></div>
                    <div className="skeleton" style={{ width: '60%', height: '14px', marginTop: '8px', borderRadius: '4px' }}></div>
                    <div className="skeleton" style={{ width: '40%', height: '14px', marginTop: '8px', borderRadius: '4px' }}></div>
                  </div>
                ))}
              </div>
            ) : vendors.length > 0 ? (
              <>
                <div className="browse-vendor-grid">
                  {vendors.map((vendor) => {
                    const vendorId = vendor.vendorProfileId || vendor.VendorProfileID || vendor.id;
                    return (
                      <div key={vendorId} className="browse-vendor-grid-item">
                        <VendorCard
                          vendor={vendor}
                          isFavorite={favorites.includes(vendorId)}
                          onToggleFavorite={handleToggleFavorite}
                          onView={handleViewVendor}
                          onHighlight={handleHighlightVendor}
                          showAnalyticsBadge={true}
                          analyticsBadgeType={discoveryFilter || 'trending'}
                          showBio={true}
                        />
                      </div>
                    );
                  })}
                </div>
                
                {/* Load More Button */}
                {vendors.length < totalCount && !loadingMore && (
                  <div className="browse-load-more">
                    <button 
                      className="browse-load-more-btn"
                      onClick={() => loadVendors(true)}
                      disabled={loadingMore}
                    >
                      <span>Load More</span>
                      <i className="fas fa-chevron-down"></i>
                    </button>
                  </div>
                )}
                {loadingMore && (
                  <div className="browse-loading-spinner">
                    <div className="spinner"></div>
                  </div>
                )}
              </>
            ) : (
              <div className="browse-no-results">
                <i className="fas fa-search" style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }}></i>
                <h3>No vendors found</h3>
                <p>Try adjusting your filters or search criteria</p>
              </div>
            )}
          </div>
        </main>
      </div>

      <Footer />
      <MessagingWidget />
    </PageLayout>
  );
}

export default BrowsePage;
