import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL, GOOGLE_MAPS_API_KEY } from '../config';
import {
  LayoutGrid, School, Camera, Video, Music, Headphones, Utensils,
  PartyPopper, Star, Ribbon, Scissors, Cake, Car, ClipboardList,
  ShoppingBag, Mail
} from 'lucide-react';
import { apiGet, apiPost, apiDelete } from '../utils/api';
import { PageLayout } from '../components/PageWrapper';
import Header from '../components/Header';
import VendorSection from '../components/VendorSection';
import VendorCard from '../components/VendorCard';
import Footer from '../components/Footer';
import MobileBottomNav from '../components/MobileBottomNav';
import MessagingWidget from '../components/MessagingWidget';
import ProfileModal from '../components/ProfileModal';
import DateSearchModal from '../components/DateSearchModal';
import { useTranslation } from '../hooks/useTranslation';
import { encodeVendorId } from '../utils/hashIds';
import { formatFromGooglePlace, getIPGeolocationServices } from '../utils/locationUtils';
import './LandingPage.css';

function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  
  const [discoverySections, setDiscoverySections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const [isScrolled, setIsScrolled] = useState(false);
  const [detectedCity, setDetectedCity] = useState(''); // IP-detected city for placeholder
  // Check if we should show login modal (from deep link redirect or session expiry)
  const searchParams = new URLSearchParams(location.search);
  const sessionExpired = searchParams.get('sessionExpired') === 'true';
  const shouldShowLogin = location.state?.showLogin === true || sessionExpired;
  const [profileModalOpen, setProfileModalOpen] = useState(shouldShowLogin);
  const [activeSlide, setActiveSlide] = useState(0);
  const [visibleSections, setVisibleSections] = useState(new Set());
  const observerRef = useRef(null);
  
  // Hero slideshow data - memoized for performance
  const heroSlides = useMemo(() => [
    { icon: 'fa-camera', label: 'Photography', image: '/images/planbeau-platform-assets/landing/slide-photography.jpg' },
    { icon: 'fa-utensils', label: 'Catering', image: '/images/planbeau-platform-assets/landing/slide-catering.jpg' },
    { icon: 'fa-music', label: 'Music & DJ', image: '/images/planbeau-platform-assets/landing/slide-music.jpg' },
    { icon: 'fa-users', label: 'Events', image: '/images/planbeau-platform-assets/landing/slide-events.jpg' }
  ], []);
  
  // Search bar state
  const [searchLocation, setSearchLocation] = useState('');
  const [searchCategory, setSearchCategory] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [searchStartTime, setSearchStartTime] = useState('');
  const [searchEndTime, setSearchEndTime] = useState('');
  const locationInputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const searchBarRef = useRef(null);
  
  // Dropdown states
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  
  // Mobile search modal state
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [mobileSearchStep, setMobileSearchStep] = useState(0); // 0: category, 1: location, 2: date
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  // Categories - IDs match DB directly
  const categories = useMemo(() => [
    { name: 'All Categories', slug: 'all', icon: <LayoutGrid size={20} /> },
    { name: 'Venues', slug: 'venue', icon: <School size={20} /> },
    { name: 'Photography', slug: 'photo', icon: <Camera size={20} /> },
    { name: 'Videography', slug: 'video', icon: <Video size={20} /> },
    { name: 'Music', slug: 'music', icon: <Music size={20} /> },
    { name: 'DJ', slug: 'dj', icon: <Headphones size={20} /> },
    { name: 'Catering', slug: 'catering', icon: <Utensils size={20} /> },
    { name: 'Entertainment', slug: 'entertainment', icon: <PartyPopper size={20} /> },
    { name: 'Experiences', slug: 'experiences', icon: <Star size={20} /> },
    { name: 'Decorations', slug: 'decorations', icon: <Ribbon size={20} /> },
    { name: 'Beauty', slug: 'beauty', icon: <Scissors size={20} /> },
    { name: 'Cake', slug: 'cake', icon: <Cake size={20} /> },
    { name: 'Transportation', slug: 'transportation', icon: <Car size={20} /> },
    { name: 'Planners', slug: 'planners', icon: <ClipboardList size={20} /> },
    { name: 'Fashion', slug: 'fashion', icon: <ShoppingBag size={20} /> },
    { name: 'Stationery', slug: 'stationery', icon: <Mail size={20} /> }
  ], []);

  // Handle scroll for header transparency
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Intersection Observer for scroll animations
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set([...prev, entry.target.id]));
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
    );

    // Observe all animated sections
    document.querySelectorAll('.animate-section').forEach((el) => {
      observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [loading]);

  // Auto-rotate slideshow every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroSlides.length]);

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

  // Google Places suggestions state
  const [placeSuggestions, setPlaceSuggestions] = useState([]);
  const autocompleteServiceRef = useRef(null);

  // Initialize Google Places AutocompleteService (not Autocomplete widget)
  useEffect(() => {
    const initAutocompleteService = () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
      }
    };

    if (window.google && window.google.maps) {
      initAutocompleteService();
    } else {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = initAutocompleteService;
      document.head.appendChild(script);
    }
  }, []);

  // Fetch place suggestions when user types
  const handleLocationInputChange = (e) => {
    const value = e.target.value;
    setSearchLocation(value);
    
    if (value.length >= 2 && autocompleteServiceRef.current) {
      autocompleteServiceRef.current.getPlacePredictions(
        {
          input: value,
          types: ['(cities)'],
          componentRestrictions: { country: 'ca' }
        },
        (predictions, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            setPlaceSuggestions(predictions.slice(0, 5));
          } else {
            setPlaceSuggestions([]);
          }
        }
      );
    } else {
      setPlaceSuggestions([]);
    }
  };

  // Handle selecting a Google Places suggestion
  const handlePlaceSuggestionSelect = (suggestion) => {
    setSearchLocation(suggestion.description);
    setPlaceSuggestions([]);
    setShowLocationDropdown(false);
  };

  // Load discovery sections from API (same as IndexPage)
  const loadVendors = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/vendors?pageSize=200&includeDiscoverySections=true`);
      if (response.ok) {
        const data = await response.json();
        
        // Use discovery sections from API if available
        if (data.discoverySections && Array.isArray(data.discoverySections)) {
          // Filter out Budget-Friendly Options section
          const filteredSections = data.discoverySections.filter(
            section => !section.title?.toLowerCase().includes('budget')
          );
          setDiscoverySections(filteredSections);
        } else {
          // Fallback: create sections from vendors
          const vendors = data.vendors || [];
          const sections = [];
          
          // Top Rated
          const topRated = vendors.filter(v => (v.AverageRating || v.averageRating || 0) >= 4.5).slice(0, 8);
          if (topRated.length > 0) {
            sections.push({ id: 'top-rated', title: 'Top Rated Vendors', description: 'Highly rated by our community', vendors: topRated });
          }
          
          // Most Responsive
          const responsive = vendors.filter(v => v.ResponseTime || v.responseTime).slice(0, 8);
          if (responsive.length > 0) {
            sections.push({ id: 'responsive', title: 'Most Responsive', description: 'Quick to respond to inquiries', vendors: responsive });
          }
          
          // Popular
          const popular = vendors.slice(0, 8);
          if (popular.length > 0) {
            sections.push({ id: 'popular', title: 'Popular vendors to book', description: 'Highly rated vendors loved by our community', vendors: popular });
          }
          
          setDiscoverySections(sections);
        }
      }
    } catch (error) {
      console.error('Failed to load vendors:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVendors();
  }, [loadVendors]);


  // Track window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchBarRef.current && !searchBarRef.current.contains(event.target)) {
        setShowCategoryDropdown(false);
        setShowLocationDropdown(false);
        setShowDateModal(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Prevent body scroll when mobile search is open
  useEffect(() => {
    if (showMobileSearch) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showMobileSearch]);

  // Close all dropdowns helper
  const closeAllDropdowns = () => {
    setShowCategoryDropdown(false);
    setShowLocationDropdown(false);
    setShowDateModal(false);
  };

  // Handle date modal apply
  const handleDateApply = ({ startDate, startTime, endTime }) => {
    setSearchDate(startDate || '');
    setSearchStartTime(startTime || '');
    setSearchEndTime(endTime || '');
  };

  // Handle use current location
  const handleUseCurrentLocation = () => {
    if (detectedCity) {
      setSearchLocation(detectedCity);
    }
    setShowLocationDropdown(false);
  };

  // Handle location select
  const handleLocationSelect = (city) => {
    setSearchLocation(city);
    setShowLocationDropdown(false);
  };

  // Get category label from slug
  const getCategoryLabel = (slug) => {
    if (!slug || slug === 'all') return 'All Categories';
    const cat = categories.find(c => c.slug === slug);
    return cat ? cat.name : 'All Categories';
  };

  // Handle category select
  const handleCategorySelect = (cat) => {
    setSearchCategory(cat.slug === 'all' ? '' : cat.slug);
    setShowCategoryDropdown(false);
  };

  // Calendar helper constants
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

  // Format date for display
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return 'Any time';
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    // Adjust for Monday start (0 = Monday, 6 = Sunday)
    let startingDayOfWeek = firstDay.getDay() - 1;
    if (startingDayOfWeek < 0) startingDayOfWeek = 6;

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    return days;
  };

  const formatDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isDateDisabled = (date) => {
    if (!date) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isTomorrow = (date) => {
    if (!date) return false;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date.toDateString() === tomorrow.toDateString();
  };

  const handleDateSelect = (date) => {
    if (!date || isDateDisabled(date)) return;
    setSearchDate(formatDateString(date));
  };

  const handleQuickDate = (type) => {
    const today = new Date();
    if (type === 'today') {
      setSearchDate(formatDateString(today));
    } else if (type === 'tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setSearchDate(formatDateString(tomorrow));
    } else if (type === 'anytime') {
      setSearchDate('');
    }
  };

  const handleTimeSelect = (timeSlot) => {
    if (timeSlot === 'anytime') {
      setSearchStartTime('');
      setSearchEndTime('');
    } else if (timeSlot === 'morning') {
      setSearchStartTime('09:00');
      setSearchEndTime('12:00');
    } else if (timeSlot === 'afternoon') {
      setSearchStartTime('12:00');
      setSearchEndTime('17:00');
    } else if (timeSlot === 'evening') {
      setSearchStartTime('17:00');
      setSearchEndTime('23:00');
    }
  };

  const getSelectedTimeSlot = () => {
    if (!searchStartTime && !searchEndTime) return 'anytime';
    if (searchStartTime === '09:00' && searchEndTime === '12:00') return 'morning';
    if (searchStartTime === '12:00' && searchEndTime === '17:00') return 'afternoon';
    if (searchStartTime === '17:00' && searchEndTime === '23:00') return 'evening';
    return 'custom';
  };

  const handleSearch = (e) => {
    e?.preventDefault();
    const params = new URLSearchParams();
    if (searchLocation) params.set('location', searchLocation);
    if (searchCategory) params.set('category', searchCategory);
    if (searchDate) params.set('eventDate', searchDate);
    if (searchStartTime) params.set('startTime', searchStartTime);
    if (searchEndTime) params.set('endTime', searchEndTime);
    window.scrollTo(0, 0);
    navigate(`/explore?${params.toString()}`);
  };

  const handleCityClick = (cityName) => {
    // Extract just the city name without province for API compatibility
    const city = cityName.split(',')[0].trim();
    window.scrollTo(0, 0);
    navigate(`/explore?location=${encodeURIComponent(city)}`);
  };

  const handleCategoryClick = (categorySlug) => {
    window.scrollTo(0, 0);
    navigate(`/explore?category=${encodeURIComponent(categorySlug)}`);
  };

  const handleToggleFavorite = (vendorId) => {
    if (!currentUser) {
      setProfileModalOpen(true);
      return;
    }
    setFavorites(prev => 
      prev.includes(vendorId) 
        ? prev.filter(id => id !== vendorId)
        : [...prev, vendorId]
    );
  };

  // Static data - memoized for performance
  const eventTypes = useMemo(() => [
    'Wedding', 'Corporate Event', 'Birthday Party', 'Conference', 
    'Product Launch', 'Networking Event', 'Workshop', 'Gala'
  ], []);

  const vendorCategories = useMemo(() => [
    { name: 'Venues', slug: 'Venues', icon: 'fa-building', image: '/images/planbeau-platform-assets/landing/meeting-venue.jpg', count: 150 },
    { name: 'Caterers', slug: 'Catering', icon: 'fa-utensils', image: '/images/planbeau-platform-assets/landing/slide-catering.jpg', count: 85 },
    { name: 'Photographers', slug: 'Photo/Video', icon: 'fa-camera', image: '/images/planbeau-platform-assets/landing/slide-photography.jpg', count: 120 },
    { name: 'DJs & Music', slug: 'Music/DJ', icon: 'fa-music', image: '/images/planbeau-platform-assets/landing/slide-music.jpg', count: 65 },
    { name: 'Decorators', slug: 'Decorations', icon: 'fa-palette', image: '/images/planbeau-platform-assets/landing/creative-space.jpg', count: 45 },
    { name: 'Event Planners', slug: 'Entertainment', icon: 'fa-clipboard-list', image: '/images/planbeau-platform-assets/landing/slide-events.jpg', count: 55 }
  ], []);

  const cities = useMemo(() => [
    { name: 'Toronto, ON', shortName: 'Toronto', image: '/images/planbeau-platform-assets/landing/city-toronto.jpg', vendorCount: 180, description: 'Canada\'s largest city with incredible venues' },
    { name: 'Vancouver, BC', shortName: 'Vancouver', image: '/images/planbeau-platform-assets/landing/city-vancouver.jpg', vendorCount: 95, description: 'Beautiful coastal event spaces' },
    { name: 'Montreal, QC', shortName: 'Montreal', image: '/images/planbeau-platform-assets/landing/city-montreal.jpg', vendorCount: 75, description: 'Historic charm meets modern elegance' },
    { name: 'Calgary, AB', shortName: 'Calgary', image: '/images/planbeau-platform-assets/landing/city-calgary.jpg', vendorCount: 60, description: 'Mountain city celebrations' },
    { name: 'Ottawa, ON', shortName: 'Ottawa', image: '/images/planbeau-platform-assets/landing/city-ottawa.jpg', vendorCount: 45, description: 'Capital city sophistication' },
    { name: 'Edmonton, AB', shortName: 'Edmonton', image: '/images/planbeau-platform-assets/landing/city-edmonton.jpg', vendorCount: 40, description: 'Festival city venues' }
  ], []);

  const features = useMemo(() => [
    { icon: 'fa-search', title: 'Discover unique spaces for any event', description: 'Browse hundreds of vendors across Canada. Find the right one among venues, caterers, photographers, and more.' },
    { icon: 'fa-sliders-h', title: 'Find the perfect fit with smart tools', description: 'Use intuitive filters to customize your search by budget, guest count, amenities, and availability.' },
    { icon: 'fa-star', title: 'Check verified reviews before you book', description: 'Read real reviews from people who have hosted events. Make confident decisions with trusted feedback.' },
    { icon: 'fa-shield-alt', title: 'Make a secure, hassle-free booking', description: 'Pay securely, chat directly with vendors, and manage everything with your free account.' }
  ], []);

  return (
    <PageLayout variant="fullWidth" pageClassName="landing-page">
      {/* Standard Header */}
      <Header 
        onSearch={() => navigate('/explore')} 
        onProfileClick={() => setProfileModalOpen(true)}
        onWishlistClick={() => navigate('/explore')}
        onChatClick={() => navigate('/explore')}
        onNotificationsClick={() => {}}
      />
      <ProfileModal isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} />

      {/* Hero Section - Tagvenue style with overlapping image */}
      <section className="landing-hero">
        <div className="landing-hero-container">
          {/* Hero Image - positioned on right, extends below search bar */}
          <div className="landing-hero-images">
            <div className="landing-hero-slideshow">
              {heroSlides.map((slide, index) => (
                <div 
                  key={index}
                  className={`landing-hero-slide ${index === activeSlide ? 'active' : ''}`}
                >
                  <img src={slide.image} alt={slide.label} />
                </div>
              ))}
            </div>
            {/* Slideshow Indicator Dots */}
            <div className="landing-hero-dots">
              {heroSlides.map((_, index) => (
                <button
                  key={index}
                  className={`landing-hero-dot ${index === activeSlide ? 'active' : ''}`}
                  onClick={() => setActiveSlide(index)}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
          
          {/* Text Content and Search Bar - positioned on left */}
          <div className="landing-hero-content">
            <div className="landing-hero-badge">
              <span>{t('landing.over500Vendors', 'Over 500 vendors')}</span>
              <span className="badge-dot">·</span>
              <span>{t('landing.trustedBy', 'Trusted by 10K+ customers')}</span>
            </div>
            
            <h1 className="landing-hero-title">
              {t('landing.heroTitle', 'Find and book venues')}<br/>
              {t('landing.heroTitle2', 'for any event')}<br/>
              {t('landing.heroTitle3', 'imaginable')}
            </h1>
            
            {/* Search Bar - Clean Professional Design */}
            <div className="hero-search-wrapper" ref={searchBarRef}>
              {/* Mobile: Tagvenue-style stacked search fields */}
              {isMobile ? (
                <div className="mobile-hero-search">
                  {/* Event Type Field */}
                  <div 
                    className="mobile-hero-field"
                    onClick={() => { setShowMobileSearch(true); setMobileSearchStep(0); }}
                  >
                    <i className="fas fa-search"></i>
                    <div className="mobile-hero-field-content">
                      <span className="mobile-hero-field-label">EVENT TYPE</span>
                      <span className="mobile-hero-field-value">{searchCategory ? getCategoryLabel(searchCategory) : 'What are you planning?'}</span>
                    </div>
                  </div>
                  
                  {/* Location Field */}
                  <div 
                    className="mobile-hero-field"
                    onClick={() => { setShowMobileSearch(true); setMobileSearchStep(1); }}
                  >
                    <i className="fas fa-map-marker-alt"></i>
                    <div className="mobile-hero-field-content">
                      <span className="mobile-hero-field-label">LOCATION</span>
                      <span className="mobile-hero-field-value">{searchLocation || detectedCity || 'Enter location'}</span>
                    </div>
                  </div>
                  
                  {/* Date Field */}
                  <div 
                    className="mobile-hero-field"
                    onClick={() => { setShowMobileSearch(true); setMobileSearchStep(2); }}
                  >
                    <i className="fas fa-calendar-alt"></i>
                    <div className="mobile-hero-field-content">
                      <span className="mobile-hero-field-label">WHEN</span>
                      <span className="mobile-hero-field-value">
                        {searchDate 
                          ? new Date(searchDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : 'Select date'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Search Button */}
                  <button className="mobile-hero-search-btn" onClick={handleSearch}>
                    Search
                  </button>
                  
                  <div className="mobile-hero-trust">
                    <i className="fas fa-shield-alt"></i>
                    <span>Trusted by over 10K+ customers</span>
                  </div>
                </div>
              ) : (
              <div className="hero-search-bar-new">
                {/* Category Field with Dropdown */}
                <div className="hero-field-wrapper">
                  <div 
                    className={`hero-search-field ${showCategoryDropdown ? 'active' : ''}`}
                    onClick={() => { 
                      closeAllDropdowns();
                      setShowCategoryDropdown(!showCategoryDropdown); 
                    }}
                  >
                    <i className="fas fa-search hero-field-icon"></i>
                    <div className="hero-field-content">
                      <span className="hero-field-label">CATEGORY</span>
                      <span className="hero-field-value">{getCategoryLabel(searchCategory)}</span>
                    </div>
                  </div>
                  {showCategoryDropdown && (
                    <div className="hero-dropdown hero-dropdown-category">
                      {categories.map((cat) => (
                        <div 
                          key={cat.slug}
                          className={`hero-dropdown-item ${(searchCategory === cat.slug) || (!searchCategory && cat.slug === 'all') ? 'selected' : ''}`}
                          onClick={() => handleCategorySelect(cat)}
                        >
                          <span className="hero-dropdown-icon">{cat.icon}</span>
                          <span>{cat.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="hero-search-separator"></div>

                {/* Location Field with Dropdown */}
                <div className="hero-field-wrapper">
                  <div 
                    className={`hero-search-field hero-search-field-location ${showLocationDropdown ? 'active' : ''}`}
                    onClick={() => { 
                      closeAllDropdowns();
                      setShowLocationDropdown(true); 
                    }}
                  >
                    <i className="fas fa-map-marker-alt hero-field-icon"></i>
                    <div className="hero-field-content">
                      <span className="hero-field-label">LOCATION</span>
                      <input
                        ref={locationInputRef}
                        type="text"
                        className="hero-location-input"
                        placeholder={detectedCity || 'Enter city'}
                        value={searchLocation}
                        onChange={handleLocationInputChange}
                        onClick={(e) => e.stopPropagation()}
                        autoComplete="off"
                      />
                    </div>
                  </div>
                  {showLocationDropdown && (
                    <div className="hero-dropdown hero-dropdown-location">
                      {/* Google Places Suggestions */}
                      {placeSuggestions.length > 0 && (
                        <>
                          {placeSuggestions.map((suggestion) => (
                            <div 
                              key={suggestion.place_id}
                              className="hero-dropdown-item"
                              onClick={() => handlePlaceSuggestionSelect(suggestion)}
                            >
                              <i className="fas fa-map-marker-alt"></i>
                              <span>{suggestion.description}</span>
                            </div>
                          ))}
                          <div className="hero-dropdown-divider"></div>
                        </>
                      )}
                      <div 
                        className="hero-dropdown-item hero-location-current"
                        onClick={handleUseCurrentLocation}
                      >
                        <i className="fas fa-crosshairs"></i>
                        <span>Use my current location</span>
                      </div>
                      {detectedCity && !placeSuggestions.length && (
                        <div 
                          className={`hero-dropdown-item ${searchLocation === detectedCity ? 'selected' : ''}`}
                          onClick={() => handleLocationSelect(detectedCity)}
                        >
                          <i className="fas fa-map-marker-alt"></i>
                          <span>{detectedCity}</span>
                        </div>
                      )}
                      {!placeSuggestions.length && (
                        <>
                          <div className="hero-dropdown-section-title">Popular cities</div>
                          {['Toronto, ON', 'Vancouver, BC', 'Montreal, QC', 'Calgary, AB', 'Ottawa, ON', 'Edmonton, AB'].map((city) => (
                            <div 
                              key={city}
                              className={`hero-dropdown-item ${searchLocation === city ? 'selected' : ''}`}
                              onClick={() => handleLocationSelect(city)}
                            >
                              <i className="fas fa-map-marker-alt"></i>
                              <span>{city}</span>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="hero-search-separator"></div>

                {/* When Field - Opens Inline Calendar Dropdown */}
                <div className="hero-field-wrapper">
                  <div 
                    className={`hero-search-field ${showDateModal ? 'active' : ''}`}
                    onClick={() => { 
                      closeAllDropdowns();
                      setShowDateModal(!showDateModal); 
                    }}
                  >
                    <i className="fas fa-calendar hero-field-icon"></i>
                    <div className="hero-field-content">
                      <span className="hero-field-label">EVENT DATE</span>
                      <span className="hero-field-value">
                        {searchDate 
                          ? `${new Date(searchDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} • ${searchStartTime ? (searchStartTime === '09:00' ? 'Morning' : searchStartTime === '12:00' ? 'Afternoon' : searchStartTime === '17:00' ? 'Evening' : searchStartTime) : 'Any time'}`
                          : 'Any time'}
                      </span>
                    </div>
                  </div>
                  {/* Inline Calendar Dropdown - NOT a modal */}
                  {showDateModal && (
                    <div className="hero-dropdown hero-dropdown-calendar">
                      <div className="calendar-dropdown-header">
                        <span className="calendar-dropdown-title">Select availability</span>
                        <button type="button" className="calendar-dropdown-close" onClick={(e) => { e.stopPropagation(); setShowDateModal(false); }}>
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                      <div className="calendar-dropdown-content">
                        {/* Calendar Section */}
                        <div className="calendar-dropdown-calendar">
                          <div className="calendar-header">
                            <button type="button" className="calendar-nav-btn" onClick={(e) => { e.stopPropagation(); setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1)); }}>
                              <i className="fas fa-chevron-left"></i>
                            </button>
                            <span className="calendar-title">{monthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}</span>
                            <button type="button" className="calendar-nav-btn" onClick={(e) => { e.stopPropagation(); setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1)); }}>
                              <i className="fas fa-chevron-right"></i>
                            </button>
                          </div>
                          <div className="calendar-grid">
                            {dayNames.map((day) => (
                              <div key={day} className="calendar-day-header">{day}</div>
                            ))}
                            {getDaysInMonth(calendarMonth).map((date, index) => (
                              <button
                                key={index}
                                type="button"
                                className={`calendar-day ${date ? (searchDate === formatDateString(date) ? 'selected' : isDateDisabled(date) ? 'disabled' : isToday(date) ? 'today' : '') : 'empty'}`}
                                onClick={(e) => { e.stopPropagation(); if (date && !isDateDisabled(date)) setSearchDate(formatDateString(date)); }}
                                disabled={!date || isDateDisabled(date)}
                              >
                                {date ? date.getDate() : ''}
                              </button>
                            ))}
                          </div>
                        </div>
                        {/* Time Selection Section */}
                        <div className="calendar-dropdown-time">
                          <h4>Select a date</h4>
                          <div className="time-input-group">
                            <label>Start time</label>
                            <select 
                              value={searchStartTime} 
                              onChange={(e) => setSearchStartTime(e.target.value)}
                              className="time-select"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <option value="">Select time</option>
                              {Array.from({ length: 24 }, (_, i) => {
                                const hour = i.toString().padStart(2, '0');
                                return (
                                  <React.Fragment key={i}>
                                    <option value={`${hour}:00`}>{i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i-12}:00 PM`}</option>
                                    <option value={`${hour}:30`}>{i === 0 ? '12:30 AM' : i < 12 ? `${i}:30 AM` : i === 12 ? '12:30 PM' : `${i-12}:30 PM`}</option>
                                  </React.Fragment>
                                );
                              })}
                            </select>
                          </div>
                          <div className="time-input-group">
                            <label>End time</label>
                            <select 
                              value={searchEndTime} 
                              onChange={(e) => setSearchEndTime(e.target.value)}
                              className="time-select"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <option value="">Select time</option>
                              {Array.from({ length: 24 }, (_, i) => {
                                const hour = i.toString().padStart(2, '0');
                                return (
                                  <React.Fragment key={i}>
                                    <option value={`${hour}:00`}>{i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i-12}:00 PM`}</option>
                                    <option value={`${hour}:30`}>{i === 0 ? '12:30 AM' : i < 12 ? `${i}:30 AM` : i === 12 ? '12:30 PM' : `${i-12}:30 PM`}</option>
                                  </React.Fragment>
                                );
                              })}
                            </select>
                          </div>
                          <div className="time-input-group">
                            <label>Timezone</label>
                            <select className="time-select" onClick={(e) => e.stopPropagation()}>
                              <option value="America/Toronto">Eastern Time (ET)</option>
                              <option value="America/Vancouver">Pacific Time (PT)</option>
                              <option value="America/Chicago">Central Time (CT)</option>
                              <option value="America/Denver">Mountain Time (MT)</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Search Button - Circular with icon */}
                <button type="button" className="hero-search-button-circular" onClick={handleSearch}>
                  <i className="fas fa-search"></i>
                </button>
              </div>
              )}
            </div>
          </div>
        </div>
      </section>
      
      {/* Mobile Full-Page Search Modal */}
      {showMobileSearch && (
        <div className="mobile-search-modal">
          <div className="mobile-search-header">
            <button className="mobile-search-close" onClick={() => setShowMobileSearch(false)}>
              <i className="fas fa-times"></i>
            </button>
            <span className="mobile-search-title">
              {mobileSearchStep === 0 ? 'What are you looking for?' : mobileSearchStep === 1 ? 'Where?' : 'When?'}
            </span>
            {/* Search button on last step */}
            {mobileSearchStep === 2 ? (
              <button 
                className="mobile-search-done"
                onClick={() => { setShowMobileSearch(false); handleSearch(); }}
              >
                Search
              </button>
            ) : (
              <div style={{ width: 40 }}></div>
            )}
          </div>
          
          {/* Step Dots - tiny grey dots below header */}
          <div className="mobile-search-dots">
            {[0, 1, 2].map((step) => (
              <button
                key={step}
                className={`mobile-search-dot ${mobileSearchStep === step ? 'active' : ''} ${step < mobileSearchStep ? 'completed' : ''}`}
                onClick={() => setMobileSearchStep(step)}
                aria-label={`Step ${step + 1}`}
              />
            ))}
          </div>
          
          <div className="mobile-search-content">
            {/* Step 0: Category Selection */}
            {mobileSearchStep === 0 && (
              <div className="mobile-search-step">
                <div className="mobile-search-options">
                  {categories.map((cat) => (
                    <div 
                      key={cat.slug}
                      className={`mobile-search-option ${(searchCategory === cat.slug) || (!searchCategory && cat.slug === 'all') ? 'selected' : ''}`}
                      onClick={() => { 
                        setSearchCategory(cat.slug === 'all' ? '' : cat.slug);
                        setMobileSearchStep(1);
                      }}
                    >
                      <span className="mobile-search-icon">{cat.icon}</span>
                      <span>{cat.name}</span>
                      {((searchCategory === cat.slug) || (!searchCategory && cat.slug === 'all')) && (
                        <i className="fas fa-check mobile-check"></i>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Step 1: Location Selection */}
            {mobileSearchStep === 1 && (
              <div className="mobile-search-step">
                <div className="mobile-location-input-wrapper">
                  <i className="fas fa-map-marker-alt"></i>
                  <input
                    type="text"
                    className="mobile-location-input"
                    placeholder="Enter city or use current location"
                    value={searchLocation}
                    onChange={handleLocationInputChange}
                    autoFocus
                  />
                </div>
                <div className="mobile-search-options">
                  <div 
                    className="mobile-search-option mobile-current-location"
                    onClick={() => { handleUseCurrentLocation(); setMobileSearchStep(2); }}
                  >
                    <i className="fas fa-crosshairs"></i>
                    <span>Use my current location</span>
                  </div>
                  {placeSuggestions.length > 0 ? (
                    placeSuggestions.map((suggestion) => (
                      <div 
                        key={suggestion.place_id}
                        className="mobile-search-option"
                        onClick={() => { 
                          setSearchLocation(suggestion.description);
                          setPlaceSuggestions([]);
                          setMobileSearchStep(2);
                        }}
                      >
                        <i className="fas fa-map-marker-alt"></i>
                        <span>{suggestion.description}</span>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="mobile-search-section-title">Popular cities</div>
                      {['Toronto, ON', 'Vancouver, BC', 'Montreal, QC', 'Calgary, AB', 'Ottawa, ON', 'Edmonton, AB'].map((city) => (
                        <div 
                          key={city}
                          className={`mobile-search-option ${searchLocation === city ? 'selected' : ''}`}
                          onClick={() => { setSearchLocation(city); setMobileSearchStep(2); }}
                        >
                          <i className="fas fa-map-marker-alt"></i>
                          <span>{city}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
            
            {/* Step 2: Date Selection */}
            {mobileSearchStep === 2 && (
              <div className="mobile-search-step mobile-date-step">
                <div className="mobile-calendar-container">
                  <div className="calendar-header">
                    <button type="button" className="calendar-nav-btn" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}>
                      <i className="fas fa-chevron-left"></i>
                    </button>
                    <span className="calendar-title">{monthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}</span>
                    <button type="button" className="calendar-nav-btn" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}>
                      <i className="fas fa-chevron-right"></i>
                    </button>
                  </div>
                  <div className="calendar-grid">
                    {dayNames.map((day) => (
                      <div key={day} className="calendar-day-header">{day}</div>
                    ))}
                    {getDaysInMonth(calendarMonth).map((date, index) => (
                      <button
                        key={index}
                        type="button"
                        className={`calendar-day ${date ? (searchDate === formatDateString(date) ? 'selected' : isDateDisabled(date) ? 'disabled' : isToday(date) ? 'today' : '') : 'empty'}`}
                        onClick={() => { if (date && !isDateDisabled(date)) setSearchDate(formatDateString(date)); }}
                        disabled={!date || isDateDisabled(date)}
                      >
                        {date ? date.getDate() : ''}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="mobile-time-options">
                  <div className="mobile-search-section-title">Time of day</div>
                  {[
                    { label: 'Any time', value: '' },
                    { label: 'Morning (9am - 12pm)', value: 'morning' },
                    { label: 'Afternoon (12pm - 5pm)', value: 'afternoon' },
                    { label: 'Evening (5pm - 11pm)', value: 'evening' }
                  ].map((time) => (
                    <div 
                      key={time.value}
                      className={`mobile-search-option ${getSelectedTimeSlot() === (time.value || 'anytime') ? 'selected' : ''}`}
                      onClick={() => handleTimeSelect(time.value || 'anytime')}
                    >
                      <span>{time.label}</span>
                      {getSelectedTimeSlot() === (time.value || 'anytime') && (
                        <i className="fas fa-check mobile-check"></i>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
        </div>
      )}

      {/* 1. Find the perfect vendors for your event (Lead Section) */}
      <section className="feature-showcase-section">
        <div 
          id="feature-discover" 
          className={`feature-row animate-section ${visibleSections.has('feature-discover') ? 'visible' : ''}`}
        >
          <div className="feature-row-content">
            <div className="feature-text-side">
              <div className="feature-badge">
                <i className="fas fa-compass"></i>
                <span>{t('landing.discover', 'Discover')}</span>
              </div>
              <h2>{t('landing.findPerfectVendors', 'Find the perfect vendors for your event')}</h2>
              <p>{t('landing.browseVendorsDesc', "Browse 500+ verified vendors across Canada. From photographers to caterers, venues to DJs — we've curated the best so you don't have to search endlessly.")}</p>
              <ul className="feature-list">
                <li><i className="fas fa-check-circle"></i> Photographers & Videographers</li>
                <li><i className="fas fa-check-circle"></i> Caterers & Food Services</li>
                <li><i className="fas fa-check-circle"></i> Venues & Event Spaces</li>
                <li><i className="fas fa-check-circle"></i> DJs, Musicians & Entertainment</li>
              </ul>
              <button className="feature-cta" onClick={() => { window.scrollTo(0, 0); navigate('/explore'); }}>
                {t('landing.exploreVendors', 'Explore Vendors')} <i className="fas fa-arrow-right"></i>
              </button>
            </div>
            <div className="feature-image-side">
              <div className="feature-image-stack">
                <img src="/images/planbeau-platform-assets/landing/slide-photography.jpg" alt="Photography" className="stack-img stack-img-1" />
                <img src="/images/planbeau-platform-assets/landing/slide-catering.jpg" alt="Catering" className="stack-img stack-img-2" />
                <div className="floating-stat floating-stat-1">
                  <i className="fas fa-star"></i>
                  <span>4.9 avg rating</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Stats Bar (Trust Builder) */}
      <section 
        id="stats-section" 
        className={`stats-counter-section animate-section ${visibleSections.has('stats-section') ? 'visible' : ''}`}
      >
        <div className="section-container">
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-number" data-target="500">500+</div>
              <div className="stat-label">{t('landing.verifiedVendors', 'Verified Vendors')}</div>
            </div>
            <div className="stat-item">
              <div className="stat-number" data-target="10000">10K+</div>
              <div className="stat-label">{t('landing.eventsBooked', 'Events Booked')}</div>
            </div>
            <div className="stat-item">
              <div className="stat-number" data-target="50">50+</div>
              <div className="stat-label">{t('landing.citiesCovered', 'Cities Covered')}</div>
            </div>
            <div className="stat-item">
              <div className="stat-number" data-target="4.9">4.9</div>
              <div className="stat-label">{t('landing.averageRating', 'Average Rating')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Browse by vendor type (Navigation) */}
      <section className="category-carousel-section">
        <div className="section-container">
          <h2>{t('landing.browseByType', 'Browse by vendor type')}</h2>
          <p className="section-subtitle">{t('landing.browseByTypeDesc', 'Find the perfect vendors for every aspect of your event')}</p>
          <div className="carousel-wrapper">
            <div className="carousel-scroll">
              {vendorCategories.map((category, index) => (
                <div 
                  key={index} 
                  className="carousel-card"
                  onClick={() => handleCategoryClick(category.slug)}
                >
                  <div className="carousel-card-image">
                    <img src={category.image} alt={category.name} />
                    <div className="carousel-card-overlay">
                      <h3>{category.name}</h3>
                      <p>{category.count}+ vendors</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4. Value Card (Why Planbeau - Benefits) */}
      <section className="why-planhive-section">
        <div className="section-container">
          <div className="why-planhive-content">
            <div className="why-planhive-card">
              <div className="why-item">
                <div className="why-icon">
                  <i className="fas fa-th-large"></i>
                </div>
                <div className="why-text">
                  <h3>The perfect vendors</h3>
                  <p>From <span className="highlight">professional photographers</span> to <span className="highlight">top-rated caterers</span> or <span className="highlight">stunning venues</span>, you can find your perfect fit.</p>
                </div>
              </div>
              <div className="why-item">
                <div className="why-icon">
                  <i className="fas fa-dollar-sign"></i>
                </div>
                <div className="why-text">
                  <h3>Simple budgeting</h3>
                  <p>With <span className="highlight">clear pricing</span> and no surprise fees, you'll know what you're <span className="highlight">paying for</span>, right from the get-go.</p>
                </div>
              </div>
              <div className="why-item">
                <div className="why-icon">
                  <i className="fas fa-shield-alt"></i>
                </div>
                <div className="why-text">
                  <h3>Cover your booking</h3>
                  <p><span className="highlight">Things happen.</span> Get the liability and damage protection <span className="highlight">you need</span> for any event or <span className="highlight">production.</span></p>
                </div>
              </div>
            </div>
            <div className="why-planhive-image">
              <img 
                src="/images/planbeau-platform-assets/landing/venue-feature.jpg" 
                alt="Beautiful venue"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 5. Browse Our Vendors (Showcase) */}
      {!loading && discoverySections[0] && discoverySections[0].vendors?.length > 0 && (
        <section className="featured-vendors-section browse-vendors-section">
          <div className="section-container">
            <div className="browse-vendors-header">
              <h2>Browse Our Vendors</h2>
              <p>Explore top-rated professionals for your next event</p>
            </div>
            <div className="landing-discovery-row">
              <VendorSection
                title=""
                description=""
                vendors={discoverySections[0].vendors}
                favorites={favorites}
                onToggleFavorite={handleToggleFavorite}
                onViewVendor={(vendorId) => { window.scrollTo(0, 0); navigate(`/vendor/${encodeVendorId(vendorId)}`); }}
              />
            </div>
          </div>
        </section>
      )}

      {/* 6. Find your perfect match in seconds (How-To Part 1) */}
      <section className="feature-showcase-section">
        <div 
          id="feature-search" 
          className={`feature-row feature-row-reverse animate-section ${visibleSections.has('feature-search') ? 'visible' : ''}`}
        >
          <div className="feature-row-content">
            <div className="feature-text-side">
              <div className="feature-badge feature-badge-purple">
                <i className="fas fa-sliders-h"></i>
                <span>Smart Tools</span>
              </div>
              <h2>Find your perfect match in seconds</h2>
              <p>Our <strong>intelligent search</strong> helps you filter by budget, location, availability, and more. See real prices and response times upfront — no surprises.</p>
              <div className="feature-highlights">
                <div className="highlight-item">
                  <div className="highlight-icon"><i className="fas fa-dollar-sign"></i></div>
                  <div>
                    <strong>Transparent Pricing</strong>
                    <span>Know costs upfront</span>
                  </div>
                </div>
                <div className="highlight-item">
                  <div className="highlight-icon"><i className="fas fa-map-marker-alt"></i></div>
                  <div>
                    <strong>Location-Based</strong>
                    <span>Find vendors near you</span>
                  </div>
                </div>
                <div className="highlight-item">
                  <div className="highlight-icon"><i className="fas fa-calendar-check"></i></div>
                  <div>
                    <strong>Real-Time Availability</strong>
                    <span>Book instantly</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="feature-image-side">
              <div className="feature-mockup">
                <div className="mockup-browser">
                  <div className="browser-dots">
                    <span></span><span></span><span></span>
                  </div>
                  <div className="mockup-content">
                    <div className="mock-filter-bar">
                      <div className="mock-filter"><i className="fas fa-map-marker-alt"></i> Toronto</div>
                      <div className="mock-filter"><i className="fas fa-users"></i> 50-100</div>
                      <div className="mock-filter"><i className="fas fa-dollar-sign"></i> $$</div>
                    </div>
                    <div className="mock-results">
                      <div className="mock-card"></div>
                      <div className="mock-card"></div>
                      <div className="mock-card"></div>
                    </div>
                  </div>
                </div>
                <div className="floating-stat floating-stat-2">
                  <i className="fas fa-bolt"></i>
                  <span>Avg 2hr response</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Book securely, stress-free (How-To Part 2) */}
      <section className="feature-showcase-section">
        <div 
          id="feature-booking" 
          className={`feature-row animate-section ${visibleSections.has('feature-booking') ? 'visible' : ''}`}
        >
          <div className="feature-row-content">
            <div className="feature-text-side">
              <div className="feature-badge feature-badge-blue">
                <i className="fas fa-shield-alt"></i>
                <span>Secure & Easy</span>
              </div>
              <h2>Book securely, stress-free</h2>
              <p>Pay safely through our platform, chat directly with vendors, and manage everything from your <strong>free account</strong>. Our support team has your back.</p>
              <div className="security-badges">
                <div className="security-badge">
                  <i className="fas fa-lock"></i>
                  <span>Secure Payments</span>
                </div>
                <div className="security-badge">
                  <i className="fas fa-comments"></i>
                  <span>Direct Messaging</span>
                </div>
                <div className="security-badge">
                  <i className="fas fa-headset"></i>
                  <span>24/7 Support</span>
                </div>
              </div>
              <button className="feature-cta feature-cta-dark" onClick={() => { window.scrollTo(0, 0); navigate('/explore'); }}>
                Start Planning <i className="fas fa-arrow-right"></i>
              </button>
            </div>
            <div className="feature-image-side">
              <div className="booking-visual">
                <div className="booking-card">
                  <div className="booking-header">
                    <i className="fas fa-calendar-check"></i>
                    <span>Booking Confirmed</span>
                  </div>
                  <div className="booking-details">
                    <div className="booking-vendor">
                      <img src="/images/planbeau-platform-assets/landing/slide-music.jpg" alt="Vendor" />
                      <div>
                        <strong>Elite Photography</strong>
                        <span>Wedding Package</span>
                      </div>
                    </div>
                    <div className="booking-info">
                      <div><i className="fas fa-calendar"></i> June 15, 2024</div>
                      <div><i className="fas fa-clock"></i> 4:00 PM - 10:00 PM</div>
                    </div>
                    <div className="booking-status">
                      <i className="fas fa-check-circle"></i> Payment Secured
                    </div>
                  </div>
                </div>
                <div className="floating-stat floating-stat-3">
                  <i className="fas fa-heart"></i>
                  <span>10K+ happy customers</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Discover top event spaces in Canada (Location Discovery) */}
      <section className="cities-section">
        <div className="section-container">
          <h2>Discover top event spaces in Canada</h2>
          <p className="section-subtitle">Explore vendors in popular Canadian cities</p>
          <div className="cities-grid">
            {cities.map((city, index) => (
              <div 
                key={index} 
                className="city-card"
                onClick={() => handleCityClick(city.name)}
              >
                <img src={city.image} alt={city.name} />
                <div className="city-overlay">
                  <h3>{city.shortName}</h3>
                  <p>{city.vendorCount}+ vendors</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. Book with confidence (Social Proof) */}
      <section className="feature-showcase-section">
        <div 
          id="feature-reviews" 
          className={`feature-row feature-row-reverse animate-section ${visibleSections.has('feature-reviews') ? 'visible' : ''}`}
        >
          <div className="feature-row-content">
            <div className="feature-text-side">
              <div className="feature-badge feature-badge-green">
                <i className="fas fa-star"></i>
                <span>Verified Reviews</span>
              </div>
              <h2>Book with confidence</h2>
              <p>Read <strong>authentic reviews</strong> from real customers who've hosted events. Every review is verified, so you can trust what you read.</p>
              <div className="review-preview">
                <div className="review-card">
                  <div className="review-header">
                    <div className="reviewer-avatar">JM</div>
                    <div>
                      <strong>Jessica M.</strong>
                      <div className="review-stars">
                        <i className="fas fa-star"></i>
                        <i className="fas fa-star"></i>
                        <i className="fas fa-star"></i>
                        <i className="fas fa-star"></i>
                        <i className="fas fa-star"></i>
                      </div>
                    </div>
                  </div>
                  <p>"Found our wedding photographer through Planbeau. The process was so easy and the results were amazing!"</p>
                </div>
              </div>
            </div>
            <div className="feature-image-side">
              <div className="reviews-collage">
                <img src="/images/planbeau-platform-assets/landing/slide-events.jpg" alt="Events" className="collage-main" />
                <div className="review-bubble review-bubble-1">
                  <div className="bubble-stars"><i className="fas fa-star"></i><i className="fas fa-star"></i><i className="fas fa-star"></i><i className="fas fa-star"></i><i className="fas fa-star"></i></div>
                  <span>"Absolutely perfect!"</span>
                </div>
                <div className="review-bubble review-bubble-2">
                  <div className="bubble-stars"><i className="fas fa-star"></i><i className="fas fa-star"></i><i className="fas fa-star"></i><i className="fas fa-star"></i><i className="fas fa-star"></i></div>
                  <span>"Best decision ever"</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 10. List your business for free (Footer CTA) */}
      <section className="vendor-cta-banner">
        <div className="section-container">
          <div className="vendor-cta-content">
            <div className="vendor-cta-image">
              <img src="/images/planbeau-platform-assets/landing/venue-feature.jpg" alt="Grow your business" />
            </div>
            <div className="vendor-cta-text">
              <h2>List your business for free and get more bookings!</h2>
              <p>We are Canada's fastest-growing online marketplace for event vendors, giving you direct access to the right customers.</p>
              <button className="vendor-cta-btn" onClick={() => { window.scrollTo(0, 0); navigate('/become-a-vendor'); }}>
                Become a Vendor
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
      <MessagingWidget />
      <MobileBottomNav 
        onOpenDashboard={(section) => {
          // LandingPage is for unauthenticated users, so just open profile modal
          setProfileModalOpen(true);
        }}
        onOpenProfile={() => setProfileModalOpen(true)}
      />
    </PageLayout>
  );
}

export default LandingPage;
