import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GOOGLE_MAPS_API_KEY } from '../config';
import { formatFromGooglePlace } from '../utils/locationUtils';
import {
  LayoutGrid, School, Camera, Video, Music, Headphones, Utensils,
  PartyPopper, Star, Ribbon, Scissors, Cake, Car, ClipboardList,
  ShoppingBag, Mail
} from 'lucide-react';
import './LandingSearchBar.css';

const LandingSearchBar = ({ detectedCity }) => {
  const navigate = useNavigate();
  
  // Search state
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [when, setWhen] = useState('');
  
  // Dropdown states
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showWhenDropdown, setShowWhenDropdown] = useState(false);
  
  // Recent searches from localStorage
  const [recentSearches, setRecentSearches] = useState([]);
  
  // Refs
  const searchBarRef = useRef(null);
  const locationInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  // Categories - IDs match DB directly, icons match CategoriesNav (Lucide)
  const categories = [
    { name: 'All Categories', slug: '', icon: <LayoutGrid size={18} /> },
    { name: 'Venues', slug: 'venue', icon: <School size={18} /> },
    { name: 'Photography', slug: 'photo', icon: <Camera size={18} /> },
    { name: 'Videography', slug: 'video', icon: <Video size={18} /> },
    { name: 'Music', slug: 'music', icon: <Music size={18} /> },
    { name: 'DJ', slug: 'dj', icon: <Headphones size={18} /> },
    { name: 'Catering', slug: 'catering', icon: <Utensils size={18} /> },
    { name: 'Entertainment', slug: 'entertainment', icon: <PartyPopper size={18} /> },
    { name: 'Experiences', slug: 'experiences', icon: <Star size={18} /> },
    { name: 'Decorations', slug: 'decorations', icon: <Ribbon size={18} /> },
    { name: 'Beauty', slug: 'beauty', icon: <Scissors size={18} /> },
    { name: 'Cake', slug: 'cake', icon: <Cake size={18} /> },
    { name: 'Transportation', slug: 'transportation', icon: <Car size={18} /> },
    { name: 'Planners', slug: 'planners', icon: <ClipboardList size={18} /> },
    { name: 'Fashion', slug: 'fashion', icon: <ShoppingBag size={18} /> },
    { name: 'Stationery', slug: 'stationery', icon: <Mail size={18} /> }
  ];

  // When options
  const whenOptions = [
    { label: 'Any time', value: '' },
    { label: 'Today', value: 'today' },
    { label: 'Tomorrow', value: 'tomorrow' },
    { label: 'This week', value: 'this-week' },
    { label: 'This weekend', value: 'this-weekend' },
    { label: 'Next week', value: 'next-week' },
    { label: 'This month', value: 'this-month' }
  ];

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recentSearches');
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored).slice(0, 5));
      } catch (e) {
        setRecentSearches([]);
      }
    }
  }, []);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    const initAutocomplete = () => {
      if (window.google && window.google.maps && window.google.maps.places && locationInputRef.current) {
        autocompleteRef.current = new window.google.maps.places.Autocomplete(locationInputRef.current, {
          types: ['(cities)'],
          componentRestrictions: { country: 'ca' }
        });
        
        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current.getPlace();
          if (place.geometry) {
            const formattedLocation = formatFromGooglePlace(place.address_components, place.name);
            setLocation(formattedLocation || place.name);
            setShowLocationDropdown(false);
          } else if (place.name) {
            setLocation(place.name);
            setShowLocationDropdown(false);
          }
        });
      }
    };

    if (window.google && window.google.maps) {
      initAutocomplete();
    } else {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = initAutocomplete;
      document.head.appendChild(script);
    }
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchBarRef.current && !searchBarRef.current.contains(event.target)) {
        setShowCategoryDropdown(false);
        setShowLocationDropdown(false);
        setShowWhenDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Save search to recent
  const saveRecentSearch = (searchData) => {
    const newRecent = [searchData, ...recentSearches.filter(s => 
      s.category !== searchData.category || s.location !== searchData.location
    )].slice(0, 5);
    setRecentSearches(newRecent);
    localStorage.setItem('recentSearches', JSON.stringify(newRecent));
  };

  // Remove recent search
  const removeRecentSearch = (index, e) => {
    e.stopPropagation();
    const newRecent = recentSearches.filter((_, i) => i !== index);
    setRecentSearches(newRecent);
    localStorage.setItem('recentSearches', JSON.stringify(newRecent));
  };

  // Handle search
  const handleSearch = (e) => {
    e?.preventDefault();
    
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (location) params.set('location', location);
    if (when) params.set('when', when);
    
    // Save to recent searches
    if (category || location) {
      saveRecentSearch({ category, location, when, label: getCategoryLabel(category) });
    }
    
    window.scrollTo(0, 0);
    navigate(`/explore?${params.toString()}`);
  };

  // Apply recent search
  const applyRecentSearch = (search) => {
    setCategory(search.category || '');
    setLocation(search.location || '');
    setWhen(search.when || '');
    setShowCategoryDropdown(false);
    
    // Navigate immediately
    const params = new URLSearchParams();
    if (search.category) params.set('category', search.category);
    if (search.location) params.set('location', search.location);
    if (search.when) params.set('when', search.when);
    
    window.scrollTo(0, 0);
    navigate(`/explore?${params.toString()}`);
  };

  // Get category label from slug
  const getCategoryLabel = (slug) => {
    const cat = categories.find(c => c.slug === slug);
    return cat ? cat.name : slug;
  };

  // Handle category select
  const handleCategorySelect = (cat) => {
    setCategory(cat.slug);
    setShowCategoryDropdown(false);
  };

  // Handle when select
  const handleWhenSelect = (option) => {
    setWhen(option.value);
    setShowWhenDropdown(false);
  };

  // Get when label
  const getWhenLabel = () => {
    const option = whenOptions.find(o => o.value === when);
    return option ? option.label : 'Any time';
  };

  return (
    <div className="landing-search-bar-wrapper" ref={searchBarRef}>
      <form className="landing-search-bar" onSubmit={handleSearch}>
        {/* Category Field */}
        <div 
          className={`landing-search-field ${showCategoryDropdown ? 'active' : ''}`}
          onClick={() => {
            setShowCategoryDropdown(!showCategoryDropdown);
            setShowLocationDropdown(false);
            setShowWhenDropdown(false);
          }}
        >
          <svg className="landing-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          <div className="landing-search-field-inner">
            <span className="landing-search-label">CATEGORY</span>
            <span className="landing-search-value">
              {category ? getCategoryLabel(category) : 'All vendors and services'}
            </span>
          </div>
        </div>
        
        <div className="landing-search-divider"></div>
        
        {/* Location Field */}
        <div 
          className={`landing-search-field ${showLocationDropdown ? 'active' : ''}`}
          onClick={() => {
            setShowLocationDropdown(!showLocationDropdown);
            setShowCategoryDropdown(false);
            setShowWhenDropdown(false);
            setTimeout(() => locationInputRef.current?.focus(), 100);
          }}
        >
          <svg className="landing-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <div className="landing-search-field-inner">
            <span className="landing-search-label">CITY</span>
            {showLocationDropdown ? (
              <input 
                ref={locationInputRef}
                type="text" 
                placeholder={detectedCity || 'Search cities'}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="landing-search-input"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="landing-search-value">
                {location || detectedCity || 'Current location'}
              </span>
            )}
          </div>
        </div>
        
        <div className="landing-search-divider"></div>
        
        {/* When Field */}
        <div 
          className={`landing-search-field ${showWhenDropdown ? 'active' : ''}`}
          onClick={() => {
            setShowWhenDropdown(!showWhenDropdown);
            setShowCategoryDropdown(false);
            setShowLocationDropdown(false);
          }}
        >
          <svg className="landing-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <div className="landing-search-field-inner">
            <span className="landing-search-label">WHEN</span>
            <span className="landing-search-value">{getWhenLabel()}</span>
          </div>
        </div>
        
        <button type="submit" className="landing-search-btn">
          Search
        </button>
      </form>

      {/* Category Dropdown */}
      {showCategoryDropdown && (
        <div className="landing-search-dropdown category-dropdown">
          {recentSearches.length > 0 && (
            <div className="dropdown-section">
              <div className="dropdown-section-title">Recents</div>
              <div className="recent-chips">
                {recentSearches.map((search, index) => (
                  <div 
                    key={index} 
                    className="recent-chip"
                    onClick={() => applyRecentSearch(search)}
                  >
                    <span>{search.label || search.category}{search.location ? ` in ${search.location}` : ''}</span>
                    <button 
                      className="chip-remove"
                      onClick={(e) => removeRecentSearch(index, e)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="dropdown-section">
            <div className="dropdown-section-title">Top categories</div>
            <div className="category-list">
              {categories.map((cat) => (
                <div 
                  key={cat.slug}
                  className={`category-item ${category === cat.slug ? 'selected' : ''}`}
                  onClick={() => handleCategorySelect(cat)}
                >
                  <div className="category-icon">
                    {cat.icon}
                  </div>
                  <span>{cat.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* When Dropdown */}
      {showWhenDropdown && (
        <div className="landing-search-dropdown when-dropdown">
          <div className="when-list">
            {whenOptions.map((option) => (
              <div 
                key={option.value}
                className={`when-item ${when === option.value ? 'selected' : ''}`}
                onClick={() => handleWhenSelect(option)}
              >
                <span>{option.label}</span>
                {when === option.value && <i className="fas fa-check"></i>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingSearchBar;
