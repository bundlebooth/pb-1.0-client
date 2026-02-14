// Force recompile - Airbnb style updates
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost } from '../utils/api';
import { API_BASE_URL } from '../config';
import { PageLayout, ContentWrapper } from '../components/PageWrapper';
import Header from '../components/Header';
import VendorGallery from '../components/VendorGallery';
import VendorCard from '../components/VendorCard';
import SkeletonLoader from '../components/SkeletonLoader';
import { ServiceCard, PackageCard, PackageServiceTabs, PackageServiceEmpty, PackageServiceList } from '../components/PackageServiceCard';
import ProfileModal from '../components/ProfileModal';
import UniversalModal from '../components/UniversalModal';
import Footer from '../components/Footer';
import MobileBottomNav from '../components/MobileBottomNav';
import Breadcrumb from '../components/Breadcrumb';
import SetupIncompleteBanner from '../components/SetupIncompleteBanner';
import MessagingWidget from '../components/MessagingWidget';
import { useVendorOnlineStatus } from '../hooks/useOnlineStatus';
import { showBanner } from '../utils/helpers';
import { extractVendorIdFromSlug, parseQueryParams, trackPageView, buildBookingUrl } from '../utils/urlHelpers';
import { decodeVendorId, encodeVendorId, encodeUserId } from '../utils/hashIds';
import { useLocalization } from '../context/LocalizationContext';
import { useTranslation } from '../hooks/useTranslation';
import ProfileVendorWidget from '../components/ProfileVendorWidget';
import { getServiceAreaLocation, getProfileLocation } from '../utils/locationUtils';
import { Icons } from '../components/common/AppIcons';
import './VendorProfilePage.css';

function VendorProfilePage() {
  const { vendorSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { formatCurrency } = useLocalization();
  const { t } = useTranslation();
  
  // Extract vendor ID from slug - strict validation, no fallback to raw slug
  const vendorId = extractVendorIdFromSlug(vendorSlug);
  const isInvalidVendorId = !vendorId && vendorSlug;
  const { currentUser } = useAuth();

  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [profileModalOpen, setProfileModalOpen] = useState(false);


  // Handle opening map - navigate to explore page with map open
  const handleOpenMap = () => {
    navigate('/?map=true');
  };
  const [vendorFeatures, setVendorFeatures] = useState([]);
  const [vendorSubcategories, setVendorSubcategories] = useState([]);
  const [portfolioAlbums, setPortfolioAlbums] = useState([]);
  const [recommendations, setRecommendations] = useState({ similar: [], nearby: [], popular: [] });
  const [activeRecommendationTab, setActiveRecommendationTab] = useState('similar');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [socialMedia, setSocialMedia] = useState([]);
  const [serviceAreas, setServiceAreas] = useState([]);
  const [team, setTeam] = useState([]);
  const [googleReviews, setGoogleReviews] = useState(null);
  const [googleReviewsLoading, setGoogleReviewsLoading] = useState(false);
  const [showGoogleReviews, setShowGoogleReviews] = useState(false);
  const [currentReviewPage, setCurrentReviewPage] = useState(0);
  const [reviewsPerPage] = useState(5);
  const [carouselIndex, setCarouselIndex] = useState(0);

  // Album viewer state
  const [albumViewerOpen, setAlbumViewerOpen] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [albumImages, setAlbumImages] = useState([]);
  const [albumImagesLoading, setAlbumImagesLoading] = useState(false);

  // Description modal state
  const [descriptionModalOpen, setDescriptionModalOpen] = useState(false);

  // Vendor badges state
  const [vendorBadges, setVendorBadges] = useState([]);
  
  // Report listing modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportForm, setReportForm] = useState({ reason: '', details: '' });
  const [reportSubmitting, setReportSubmitting] = useState(false);

  // Vendor packages state
  const [packages, setPackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [packageModalOpen, setPackageModalOpen] = useState(false);
  const [offeringsTab, setOfferingsTab] = useState('services'); // 'services' (Featured) or 'packages'
  
  // Service detail modal state
  const [selectedService, setSelectedService] = useState(null);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);

  // Cancellation policy state
  const [cancellationPolicy, setCancellationPolicy] = useState(null);
  
  // Amenities/Features modal state
  const [showAmenitiesModal, setShowAmenitiesModal] = useState(false);
  
  // Services/Packages modal state  
  const [showServicesModal, setShowServicesModal] = useState(false);
  
  // Search date params from explore page (for pre-filling availability widget)
  const [searchDateParams, setSearchDateParams] = useState(null);
  
  // Load search date params from URL or sessionStorage on mount
  useEffect(() => {
    // First check URL params
    const urlParams = new URLSearchParams(window.location.search);
    const urlEventDate = urlParams.get('eventDate');
    const urlStartTime = urlParams.get('startTime');
    const urlEndTime = urlParams.get('endTime');
    
    if (urlEventDate) {
      setSearchDateParams({
        date: urlEventDate,
        endDate: urlEventDate,
        startTime: urlStartTime || '',
        endTime: urlEndTime || ''
      });
      return;
    }
    
    // Fall back to sessionStorage
    const storedParams = sessionStorage.getItem('searchDateParams');
    if (storedParams) {
      try {
        const parsed = JSON.parse(storedParams);
        setSearchDateParams(parsed);
      } catch (e) {
        console.error('Error parsing search date params:', e);
      }
    }
  }, []);

  // Get online status for this vendor
  const { statuses: onlineStatuses } = useVendorOnlineStatus(
    vendorId ? [vendorId] : [],
    { enabled: !!vendorId, refreshInterval: 180000 } // 3 minutes
  );
  const vendorOnlineStatus = vendorId ? onlineStatuses[vendorId] : null;

  const loadVendorProfile = useCallback(async () => {
    try {
      setLoading(true);
      const userId = currentUser?.id || '';
      const response = await apiGet(`/vendors/${vendorId}?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to load vendor profile');
      }

      const data = await response.json();
      const vendorDetails = data.data;
      
      setVendor(vendorDetails);
      setIsFavorite(vendorDetails.isFavorite || false);
      setSocialMedia(vendorDetails.socialMedia || []);
      setServiceAreas(vendorDetails.serviceAreas || []);
      setTeam(vendorDetails.team || []);
      
      // Load additional data
      if (vendorDetails.profile?.VendorProfileID) {
        loadVendorFeatures(vendorDetails.profile.VendorProfileID);
        loadVendorSubcategories(vendorDetails.profile.VendorProfileID);
        loadPortfolioAlbums(vendorDetails.profile.VendorProfileID);
        loadRecommendations(vendorId, vendorDetails);
        loadReviewsWithSurvey(vendorDetails.profile.VendorProfileID);
        loadVendorBadges(vendorDetails.profile.VendorProfileID);
        loadVendorPackages(vendorDetails.profile.VendorProfileID);
        loadCancellationPolicy(vendorDetails.profile.VendorProfileID);
        
        // Load Google Reviews if Google Place ID exists
        if (vendorDetails.profile.GooglePlaceId) {
          loadGoogleReviews(vendorDetails.profile.GooglePlaceId);
        }

        // Auto-toggle to Google Reviews if no in-app reviews
        if (vendorDetails.reviews.length === 0 && vendorDetails.profile.GooglePlaceId) {
          setShowGoogleReviews(true);
        }
      }
      
      // Update page title
      document.title = `${vendorDetails.profile.BusinessName || vendorDetails.profile.DisplayName} - Planbeau`;
      
      // Track page view with URL parameters
      const queryParams = parseQueryParams(location.search);
      trackPageView('Vendor Profile', {
        vendorId,
        vendorName: vendorDetails.profile.BusinessName,
        category: vendorDetails.profile.PrimaryCategory,
        ...queryParams
      });
    } catch (error) {
      console.error('Error loading vendor profile:', error);
      showBanner('Failed to load vendor profile', 'error');
    } finally {
      setLoading(false);
    }
  }, [vendorId, currentUser, location.search]);

  // Load vendor features
  const loadVendorFeatures = useCallback(async (vendorProfileId) => {
    try {
      const response = await apiGet(`/vendors/features/vendor/${vendorProfileId}`);
      if (response.ok) {
        const data = await response.json();
        setVendorFeatures(data.features || data.selectedFeatures || []);
      }
    } catch (error) {
      console.error('Error loading vendor features:', error);
    }
  }, []);

  // Load vendor subcategories
  const loadVendorSubcategories = useCallback(async (vendorProfileId) => {
    try {
      const response = await apiGet(`/vendors/${vendorProfileId}/subcategories`);
      if (response.ok) {
        const data = await response.json();
        setVendorSubcategories(data.subcategories || []);
      }
    } catch (error) {
      console.error('Error loading vendor subcategories:', error);
    }
  }, []);

  // Load portfolio albums
  const loadPortfolioAlbums = useCallback(async (vendorProfileId) => {
    try {
      const response = await apiGet(`/vendor/${vendorProfileId}/portfolio/albums/public`);
      if (response.ok) {
        const data = await response.json();
        setPortfolioAlbums(data.albums || []);
      }
    } catch (error) {
      console.error('Error loading portfolio albums:', error);
    }
  }, []);

  // Load vendor badges
  const loadVendorBadges = useCallback(async (vendorProfileId) => {
    try {
      const response = await apiGet(`/vendors/${vendorProfileId}/badges`);
      if (response.ok) {
        const data = await response.json();
        setVendorBadges(data.badges || []);
      }
    } catch (error) {
      console.error('Error loading vendor badges:', error);
    }
  }, []);

  // Load vendor packages
  const loadVendorPackages = useCallback(async (vendorProfileId) => {
    try {
      const response = await apiGet(`/vendors/${vendorProfileId}/packages`);
      if (response.ok) {
        const data = await response.json();
        setPackages(data.packages || []);
      }
    } catch (error) {
      console.error('Error loading vendor packages:', error);
    }
  }, []);

  // Load cancellation policy
  const loadCancellationPolicy = useCallback(async (vendorProfileId) => {
    try {
      const response = await apiGet(`/payments/vendor/${vendorProfileId}/cancellation-policy`);
      if (response.ok) {
        const data = await response.json();
        setCancellationPolicy(data.policy);
      }
    } catch (error) {
      console.error('Error loading cancellation policy:', error);
    }
  }, []);

  // Load album images when album is clicked
  const loadAlbumImages = useCallback(async (album) => {
    try {
      setAlbumImagesLoading(true);
      setSelectedAlbum(album);
      setAlbumViewerOpen(true);
      
      const url = `/vendor/${vendor?.profile?.VendorProfileID}/portfolio/albums/${album.AlbumID}/images/public`;
      console.log('Loading album images from:', url);
      
      const response = await apiGet(url);
      const data = await response.json();
      console.log('Album images response:', data);
      
      if (response.ok && data.success) {
        setAlbumImages(data.images || []);
      } else {
        console.error('Failed to load album images:', data);
        setAlbumImages([]);
      }
    } catch (error) {
      console.error('Error loading album images:', error);
      setAlbumImages([]);
    } finally {
      setAlbumImagesLoading(false);
    }
  }, [vendor?.profile?.VendorProfileID]);

  // Load reviews with survey ratings (separate call to get full review data)
  const loadReviewsWithSurvey = useCallback(async (vendorProfileId) => {
    try {
      const response = await apiGet(`/vendors/${vendorProfileId}/reviews`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.reviews) {
          // Update vendor state with full review data including survey ratings
          setVendor(prev => prev ? { ...prev, reviews: data.reviews } : prev);
        }
      }
    } catch (error) {
      console.error('Error loading reviews with survey:', error);
    }
  }, []);

  // Load Google Reviews
  const loadGoogleReviews = useCallback(async (googlePlaceId) => {
    try {
      setGoogleReviewsLoading(true);
      
      const response = await apiGet(`/vendors/google-reviews/${googlePlaceId}`);
      if (response.ok) {
        const data = await response.json();
        setGoogleReviews(data.data);
      } else {
        console.warn('Google Reviews not available:', response.status);
      }
    } catch (error) {
      console.error('Error loading Google Reviews:', error);
    } finally {
      setGoogleReviewsLoading(false);
    }
  }, []);

  // Load recommendations
  const loadRecommendations = useCallback(async (vendorId, vendorData) => {
    try {
      // Load similar vendors
      const category = vendorData.profile?.PrimaryCategory || vendorData.profile?.Category;
      const similarUrl = category 
        ? `${API_BASE_URL}/vendors?category=${encodeURIComponent(category)}&pageSize=8`
        : `${API_BASE_URL}/vendors?pageSize=8&sortBy=rating`;
      
      const similarResponse = await fetch(similarUrl);
      if (similarResponse.ok) {
        const similarData = await similarResponse.json();
        const similar = (similarData.vendors || similarData.data || []).filter(v => v.VendorProfileID != vendorId);
        setRecommendations(prev => ({ ...prev, similar }));
      }

      // Load nearby vendors
      const latitude = vendorData.profile?.Latitude;
      const longitude = vendorData.profile?.Longitude;
      if (latitude && longitude) {
        const nearbyResponse = await apiGet(
          `/vendors?latitude=${latitude}&longitude=${longitude}&radiusMiles=25&pageSize=8&sortBy=nearest`
        );
        if (nearbyResponse.ok) {
          const nearbyData = await nearbyResponse.json();
          const nearby = (nearbyData.data || []).filter(v => v.VendorProfileID !== vendorId);
          setRecommendations(prev => ({ ...prev, nearby }));
        }
      }

      // Load popular vendors
      const popularResponse = await apiGet('/vendors?pageSize=8&sortBy=rating');
      if (popularResponse.ok) {
        const popularData = await popularResponse.json();
        const popular = (popularData.data || []).filter(v => v.VendorProfileID !== vendorId);
        setRecommendations(prev => ({ ...prev, popular }));
      }
    } catch (error) {
      console.error('Error loading recommendations:', error);
    }
  }, []);

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

  useEffect(() => {
    if (vendorId) {
      loadVendorProfile();
    }
  }, [vendorId, loadVendorProfile]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  // Track profile view when visiting vendor page
  useEffect(() => {
    if (vendorId) {
      // Generate or retrieve session ID for deduplication
      let sessionId = sessionStorage.getItem('vv_session_id');
      if (!sessionId) {
        sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
        sessionStorage.setItem('vv_session_id', sessionId);
      }
      
      // Track the profile view
      const trackView = async () => {
        try {
          await apiPost('/analytics/track-view', {
            vendorId: vendorId,
            referrerUrl: document.referrer || window.location.href,
            sessionId: sessionId
          });
        } catch (error) {
          // Silently fail - view tracking is not critical
          console.debug('Profile view tracking failed:', error);
        }
      };
      
      trackView();
    }
  }, [vendorId]);

  // Scroll to top when component mounts or vendorId changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [vendorId]);

  const handleToggleFavorite = async () => {
    if (!currentUser) {
      setProfileModalOpen(true);
      return;
    }

    try {
      const response = await apiPost('/favorites/toggle', {
        userId: currentUser.id,
        vendorProfileId: vendorId
      });

      if (!response.ok) throw new Error('Failed to toggle favorite');

      const result = await response.json();
      setIsFavorite(result.IsFavorite);
      showBanner(
        result.IsFavorite ? 'Vendor saved to favorites' : 'Vendor removed from favorites',
        'favorite'
      );
    } catch (error) {
      console.error('Error toggling favorite:', error);
      showBanner('Failed to update favorites', 'error');
    }
  };

  // Handle favorite toggle for recommendation cards
  const handleRecommendationFavorite = async (recommendationVendorId) => {
    if (!currentUser) {
      setProfileModalOpen(true);
      return;
    }

    try {
      const response = await apiPost('/favorites/toggle', {
        userId: currentUser.id,
        vendorProfileId: recommendationVendorId
      });

      if (!response.ok) throw new Error('Failed to toggle favorite');

      const result = await response.json();
      
      // Update favorites list
      if (result.IsFavorite) {
        setFavorites(prev => [...prev, { vendorProfileId: recommendationVendorId }]);
      } else {
        setFavorites(prev => prev.filter(fav => fav.vendorProfileId !== recommendationVendorId));
      }
      
      showBanner(
        result.IsFavorite ? 'Vendor saved to favorites' : 'Vendor removed from favorites',
        'favorite'
      );
    } catch (error) {
      console.error('Error toggling favorite:', error);
      showBanner('Failed to update favorites', 'error');
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    const vendorName = vendor?.profile?.BusinessName || 'this vendor';

    if (navigator.share) {
      try {
        await navigator.share({
          title: vendorName,
          text: `Check out ${vendorName} on Planbeau!`,
          url: url
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
          copyToClipboard(url);
        }
      }
    } else {
      copyToClipboard(url);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      showBanner('Link copied to clipboard!', 'success');
    }).catch(() => {
      showBanner('Failed to copy link', 'error');
    });
  };

  const handleRequestBooking = (bookingData = null) => {
    // Allow navigation to booking page without login - login will be required at submission
    // If bookingData is provided (from ProfileVendorWidget), include it in URL params
    const params = { source: 'profile' };
    
    if (bookingData && typeof bookingData === 'object') {
      if (bookingData.selectedDate) params.date = bookingData.selectedDate;
      if (bookingData.selectedStartTime) params.startTime = bookingData.selectedStartTime;
      if (bookingData.selectedEndTime) params.endTime = bookingData.selectedEndTime;
      if (bookingData.selectedPackage?.PackageID) params.packageId = bookingData.selectedPackage.PackageID;
    }
    
    const bookingUrl = buildBookingUrl(
      { 
        VendorProfileID: vendorId, 
        BusinessName: vendor?.BusinessName || vendor?.Name || 'vendor'
      },
      params
    );
    navigate(bookingUrl);
  };

  const handleMessageVendor = async () => {
    if (!currentUser) {
      setProfileModalOpen(true);
      return;
    }
    
    try {
      // Create or get existing conversation with this vendor
      const response = await apiPost('/messages/conversations', {
        userId: currentUser.id,
        vendorProfileId: vendorId,
        subject: `Inquiry about ${profile?.BusinessName || 'your services'}`
      });
      
      if (response.ok) {
        const data = await response.json();
        // Store conversation info for the messages page to pick up
        sessionStorage.setItem('openConversationId', data.conversationId);
        sessionStorage.setItem('openConversationName', profile?.BusinessName || 'Vendor');
        // Redirect to client messages page with the conversation
        navigate(`/client/messages?conversationId=${data.conversationId}`);
      } else {
        // Fallback: just go to messages page
        navigate('/client/messages');
      }
    } catch (error) {
      console.error('Failed to start conversation:', error);
      // Fallback: just go to messages page
      navigate('/client/messages');
    }
  };

  // Render social media icons
  const renderSocialMediaIcons = () => {
    if (!socialMedia || (socialMedia.length === 0 && !profile.Website)) {
      return null;
    }

    const platformIcons = {
      'facebook': 'https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg',
      'instagram': 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png',
      'twitter': 'https://upload.wikimedia.org/wikipedia/commons/c/ce/X_logo_2023.svg',
      'x': 'https://upload.wikimedia.org/wikipedia/commons/c/ce/X_logo_2023.svg',
      'linkedin': 'https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png',
      'youtube': 'https://upload.wikimedia.org/wikipedia/commons/4/42/YouTube_icon_%282013-2017%29.png'
    };

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.75rem' }}>
        {socialMedia.map((social, index) => {
          const iconUrl = platformIcons[social.Platform.toLowerCase()] || 'https://upload.wikimedia.org/wikipedia/commons/c/c4/Globe_icon.svg';
          const url = social.URL.startsWith('http') ? social.URL : `https://${social.URL}`;
          return (
            <a key={index} href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', opacity: 0.7, transition: 'all 0.2s' }}
               onMouseOver={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
               onMouseOut={(e) => { e.currentTarget.style.opacity = '0.7'; e.currentTarget.style.transform = 'translateY(0)'; }}>
              <img src={iconUrl} className="social-icon-small" alt={social.Platform} />
            </a>
          );
        })}
        {profile.Website && (
          <a href={profile.Website.startsWith('http') ? profile.Website : `https://${profile.Website}`} target="_blank" rel="noopener noreferrer"
             style={{ textDecoration: 'none', opacity: 0.7, transition: 'all 0.2s' }}
             onMouseOver={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
             onMouseOut={(e) => { e.currentTarget.style.opacity = '0.7'; e.currentTarget.style.transform = 'translateY(0)'; }}>
            <img src="https://upload.wikimedia.org/wikipedia/commons/c/c4/Globe_icon.svg" className="social-icon-small" alt="Website" />
          </a>
        )}
      </div>
    );
  };

  // Icon mapping for vendor features - comprehensive mapping
  const getFeatureIcon = (featureName, categoryName) => {
    // Normalize feature name for matching
    const normalizedName = featureName?.toLowerCase() || '';
    
    // Category-based icon defaults
    const categoryIcons = {
      'Venue Features': 'building',
      'Venue': 'building',
      'Photography': 'camera',
      'Photography & Video': 'camera',
      'Videography': 'video',
      'Music': 'music',
      'Music & Entertainment': 'music',
      'Entertainment': 'theater-masks',
      'Catering': 'utensils',
      'Catering & Bar': 'utensils',
      'Bar': 'cocktail',
      'Event Planning': 'clipboard-list',
      'Planning': 'clipboard-list',
      'Beauty': 'spa',
      'Beauty & Fashion': 'spa',
      'Fashion': 'tshirt',
      'Floral': 'seedling',
      'Flowers': 'seedling',
      'Decor': 'palette',
      'Decoration': 'palette',
      'Transportation': 'car',
      'Rentals': 'couch',
      'Lighting': 'lightbulb',
      'Audio': 'volume-up',
      'Officiant': 'book',
      'Cake': 'birthday-cake',
      'Bakery': 'birthday-cake',
      'Invitations': 'envelope',
      'Stationery': 'envelope',
      'Jewelry': 'gem',
      'Favors': 'gift',
      'Other': 'star'
    };

    // Keyword-based icon mapping
    const keywordIcons = [
      // Venue & Space
      { keywords: ['indoor', 'inside'], icon: 'home' },
      { keywords: ['outdoor', 'outside', 'garden', 'patio'], icon: 'tree' },
      { keywords: ['wheelchair', 'accessible', 'handicap'], icon: 'wheelchair' },
      { keywords: ['parking', 'valet'], icon: 'parking' },
      { keywords: ['wifi', 'internet'], icon: 'wifi' },
      { keywords: ['dance', 'dancing'], icon: 'music' },
      { keywords: ['stage', 'platform'], icon: 'theater-masks' },
      { keywords: ['view', 'scenic', 'waterfront', 'ocean', 'lake'], icon: 'mountain' },
      { keywords: ['dressing', 'changing', 'bridal suite'], icon: 'door-closed' },
      { keywords: ['kitchen', 'prep'], icon: 'blender' },
      { keywords: ['air condition', 'ac', 'climate', 'heating'], icon: 'snowflake' },
      { keywords: ['elevator', 'lift'], icon: 'arrows-alt-v' },
      { keywords: ['restroom', 'bathroom', 'washroom'], icon: 'restroom' },
      { keywords: ['pool', 'swimming'], icon: 'swimming-pool' },
      { keywords: ['fireplace', 'fire pit'], icon: 'fire' },
      { keywords: ['tent', 'canopy'], icon: 'campground' },
      
      // Photography & Video
      { keywords: ['photo', 'photography', 'photographer', 'second photographer'], icon: 'camera' },
      { keywords: ['video', 'videography', 'film', 'cinemat'], icon: 'video' },
      { keywords: ['drone', 'aerial'], icon: 'plane' },
      { keywords: ['album', 'print'], icon: 'book' },
      { keywords: ['edit', 'retouch', 'post-production'], icon: 'wand-magic-sparkles' },
      { keywords: ['engagement', 'pre-wedding', 'session'], icon: 'heart' },
      { keywords: ['portrait', 'headshot'], icon: 'user' },
      { keywords: ['candid', 'documentary'], icon: 'camera' },
      { keywords: ['booth', 'photo booth'], icon: 'camera' },
      
      // Music & Entertainment
      { keywords: ['dj', 'disc jockey'], icon: 'headphones' },
      { keywords: ['band', 'live music'], icon: 'guitar' },
      { keywords: ['singer', 'vocalist'], icon: 'microphone' },
      { keywords: ['piano', 'pianist'], icon: 'music' },
      { keywords: ['string', 'quartet', 'violin'], icon: 'music' },
      { keywords: ['mc', 'emcee', 'host'], icon: 'bullhorn' },
      { keywords: ['sound', 'audio', 'speaker'], icon: 'volume-up' },
      { keywords: ['lighting', 'lights'], icon: 'lightbulb' },
      { keywords: ['photo booth'], icon: 'camera-retro' },
      { keywords: ['magic', 'magician'], icon: 'hat-wizard' },
      { keywords: ['dance', 'choreograph'], icon: 'shoe-prints' },
      
      // Catering & Food
      { keywords: ['catering', 'food', 'meal'], icon: 'utensils' },
      { keywords: ['bar', 'cocktail', 'drink', 'beverage'], icon: 'cocktail' },
      { keywords: ['wine'], icon: 'wine-glass-alt' },
      { keywords: ['beer'], icon: 'beer' },
      { keywords: ['coffee', 'espresso'], icon: 'coffee' },
      { keywords: ['cake', 'dessert', 'pastry'], icon: 'birthday-cake' },
      { keywords: ['vegetarian', 'vegan', 'dietary'], icon: 'leaf' },
      { keywords: ['kosher', 'halal'], icon: 'check-circle' },
      { keywords: ['tasting', 'sample'], icon: 'utensil-spoon' },
      { keywords: ['buffet'], icon: 'concierge-bell' },
      { keywords: ['plated', 'served'], icon: 'concierge-bell' },
      
      // Beauty & Fashion
      { keywords: ['makeup', 'cosmetic'], icon: 'paint-brush' },
      { keywords: ['hair', 'styling', 'hairstyl'], icon: 'cut' },
      { keywords: ['nail', 'manicure'], icon: 'hand-sparkles' },
      { keywords: ['spa', 'massage', 'relax'], icon: 'spa' },
      { keywords: ['dress', 'gown', 'bridal wear'], icon: 'tshirt' },
      { keywords: ['suit', 'tuxedo', 'formal wear'], icon: 'user-tie' },
      { keywords: ['alteration', 'tailor', 'fitting'], icon: 'ruler' },
      { keywords: ['accessory', 'accessories'], icon: 'gem' },
      { keywords: ['jewelry', 'ring'], icon: 'ring' },
      
      // Floral & Decor
      { keywords: ['flower', 'floral', 'bouquet'], icon: 'seedling' },
      { keywords: ['centerpiece', 'arrangement'], icon: 'vase' },
      { keywords: ['decor', 'decoration', 'design'], icon: 'palette' },
      { keywords: ['linen', 'tablecloth', 'napkin'], icon: 'scroll' },
      { keywords: ['chair', 'seating'], icon: 'chair' },
      { keywords: ['table'], icon: 'border-all' },
      { keywords: ['arch', 'backdrop'], icon: 'archway' },
      { keywords: ['balloon'], icon: 'circle' },
      { keywords: ['candle', 'candel'], icon: 'fire-alt' },
      
      // Planning & Coordination
      { keywords: ['planning', 'planner', 'coordinator'], icon: 'clipboard-list' },
      { keywords: ['day-of', 'on-site'], icon: 'calendar-day' },
      { keywords: ['full service', 'full-service'], icon: 'concierge-bell' },
      { keywords: ['partial', 'month-of'], icon: 'calendar-alt' },
      { keywords: ['budget', 'financial'], icon: 'dollar-sign' },
      { keywords: ['vendor', 'referral'], icon: 'users' },
      { keywords: ['timeline', 'schedule'], icon: 'clock' },
      { keywords: ['contract', 'legal'], icon: 'file-contract' },
      { keywords: ['consultation', 'consult'], icon: 'comments' },
      
      // Transportation
      { keywords: ['limo', 'limousine'], icon: 'car-side' },
      { keywords: ['car', 'vehicle', 'transport'], icon: 'car' },
      { keywords: ['bus', 'shuttle'], icon: 'bus' },
      { keywords: ['horse', 'carriage'], icon: 'horse' },
      { keywords: ['boat', 'yacht'], icon: 'ship' },
      
      // Rentals & Equipment
      { keywords: ['rental', 'rent'], icon: 'box' },
      { keywords: ['furniture'], icon: 'couch' },
      { keywords: ['tent', 'marquee'], icon: 'campground' },
      { keywords: ['generator', 'power'], icon: 'bolt' },
      { keywords: ['heater', 'heating'], icon: 'temperature-high' },
      { keywords: ['fan', 'cooling'], icon: 'fan' },
      
      // Invitations & Stationery
      { keywords: ['invitation', 'invite'], icon: 'envelope-open-text' },
      { keywords: ['save the date'], icon: 'calendar-plus' },
      { keywords: ['menu', 'program'], icon: 'file-alt' },
      { keywords: ['signage', 'sign'], icon: 'sign' },
      { keywords: ['calligraphy'], icon: 'pen-fancy' },
      
      // Other Services
      { keywords: ['officiant', 'ceremony'], icon: 'book' },
      { keywords: ['favor', 'gift'], icon: 'gift' },
      { keywords: ['guest', 'accommodation', 'hotel'], icon: 'bed' },
      { keywords: ['insurance'], icon: 'shield-alt' },
      { keywords: ['security'], icon: 'user-shield' },
      { keywords: ['childcare', 'babysit', 'kids'], icon: 'child' },
      { keywords: ['pet', 'dog', 'animal'], icon: 'paw' },
      { keywords: ['firework', 'pyro'], icon: 'star' },
      { keywords: ['lantern', 'release'], icon: 'paper-plane' }
    ];

    // First check keyword matches
    for (const mapping of keywordIcons) {
      if (mapping.keywords.some(kw => normalizedName.includes(kw))) {
        return mapping.icon;
      }
    }

    // Then check category
    if (categoryName && categoryIcons[categoryName]) {
      return categoryIcons[categoryName];
    }

    // Default icon based on first letter or generic
    return 'check-circle';
  };

  // Render vendor features (questionnaire)
  const renderVendorFeatures = () => {
    if (!vendorFeatures || vendorFeatures.length === 0) return null;

    // Group features by category
    const categorizedFeatures = {};
    vendorFeatures.forEach(feature => {
      const category = feature.CategoryName || 'Other';
      if (!categorizedFeatures[category]) {
        categorizedFeatures[category] = [];
      }
      categorizedFeatures[category].push(feature);
    });

    // Flatten all features for 2-column display
    const allFeatures = vendorFeatures.slice(0, 10); // Show first 10
    const hasMore = vendorFeatures.length > 10;

    return (
      <div className="content-section">
        <h2>What this place offers</h2>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: '16px',
          marginTop: '24px'
        }}>
          {allFeatures.map((feature, idx) => (
            <div key={idx} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '16px',
              padding: '8px 0'
            }}>
              <i className={`fas fa-${getFeatureIcon(feature.FeatureName, feature.CategoryName)}`} style={{ 
                fontSize: '24px', 
                color: '#222', 
                width: '24px',
                textAlign: 'center'
              }}></i>
              <span style={{ fontSize: '16px', color: '#222' }}>{feature.FeatureName}</span>
            </div>
          ))}
        </div>
        {hasMore && (
          <button 
            onClick={() => setShowAmenitiesModal(true)}
            style={{
              marginTop: '24px',
              padding: '14px 24px',
              border: '1px solid #222',
              borderRadius: '8px',
              background: 'white',
              color: '#222',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer'
            }}>
            Show all {vendorFeatures.length} amenities
          </button>
        )}
        
        {/* Amenities Modal */}
        <UniversalModal
          isOpen={showAmenitiesModal}
          onClose={() => setShowAmenitiesModal(false)}
          title="What this place offers"
          size="medium"
        >
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '16px',
            padding: '8px 0'
          }}>
            {vendorFeatures.map((feature, idx) => (
              <div key={idx} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '16px',
                padding: '12px 0',
                borderBottom: idx < vendorFeatures.length - 1 ? '1px solid #f0f0f0' : 'none'
              }}>
                <i className={`fas fa-${getFeatureIcon(feature.FeatureName, feature.CategoryName)}`} style={{ 
                  fontSize: '24px', 
                  color: '#222', 
                  width: '24px',
                  textAlign: 'center'
                }}></i>
                <span style={{ fontSize: '16px', color: '#222' }}>{feature.FeatureName}</span>
              </div>
            ))}
          </div>
        </UniversalModal>
      </div>
    );
  };

  // Render location and service areas with enhanced Google Maps
  const renderLocationAndServiceAreas = () => {
    const hasLocation = profile.Latitude && profile.Longitude;
    const hasAddress = profile.Address || profile.City;
    const hasServiceAreas = serviceAreas && serviceAreas.length > 0;

    if (!hasLocation && !hasAddress && !hasServiceAreas) return null;

    return (
      <div className="content-section" id="location-section">
        <h2>Where you'll find us</h2>
        
        {/* Google Maps - Clean map with custom blue marker overlay */}
        {(hasLocation || hasAddress) && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div 
              onClick={() => {
                const url = hasLocation 
                  ? `https://www.google.com/maps?q=${profile.Latitude},${profile.Longitude}`
                  : `https://www.google.com/maps?q=${encodeURIComponent([profile.Address, profile.City, profile.State].filter(Boolean).join(', '))}`;
                window.open(url, '_blank');
              }}
              style={{ 
                position: 'relative',
                borderRadius: '16px',
                overflow: 'hidden',
                height: '320px',
                background: '#f5f5f5',
                cursor: 'pointer'
              }}
            >
              {/* Map iframe using view mode - clean without place info */}
              <iframe
                title="Location map"
                width="100%"
                height="100%"
                frameBorder="0"
                style={{ border: 0, pointerEvents: 'none' }}
                src={hasLocation 
                  ? `https://www.google.com/maps/embed/v1/view?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&center=${profile.Latitude},${profile.Longitude}&zoom=14&maptype=roadmap`
                  : `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent([profile.Address, profile.City, profile.State].filter(Boolean).join(', '))}&zoom=14`
                }
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
              
              {/* Custom Blue Pin Marker Overlay - centered on map */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -100%)',
                zIndex: 10,
                pointerEvents: 'none'
              }}>
                <svg width="40" height="48" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 20 12 20s12-11 12-20c0-6.627-5.373-12-12-12z" fill="#4285F4"/>
                  <circle cx="12" cy="12" r="5" fill="white"/>
                </svg>
              </div>
              
              {/* Overlay to hide Google Maps fullscreen button in top-right corner */}
              <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '50px',
                height: '50px',
                background: '#e5e3df',
                zIndex: 5,
                pointerEvents: 'none',
                borderBottomLeftRadius: '8px'
              }} />
            </div>
          </div>
        )}

        {/* Service Areas */}
        {hasServiceAreas && (
          <div>
            <h3 style={{ 
              fontSize: '1.25rem', 
              fontWeight: 600, 
              color: '#111827',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              Areas We Serve
            </h3>
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap',
              gap: '0.5rem' 
            }}>
              {serviceAreas.map((area, index) => {
                // Use centralized formatting utility
                const location = getServiceAreaLocation(area);
                return (
                  <div key={index} style={{ 
                    background: 'white', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '8px', 
                    padding: '0.5rem 0.75rem',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '0.875rem'
                  }}>
                    <i className="fas fa-map-marker-alt" style={{ 
                      color: '#3b82f6', 
                      fontSize: '0.7rem' 
                    }}></i>
                    <span style={{ fontWeight: 500, color: '#111827' }}>{location}</span>
                    {area.TravelCost && parseFloat(area.TravelCost) > 0 && (
                      <span style={{ color: '#6b7280', fontSize: '0.8rem', marginLeft: '0.25rem' }}>
                        ({formatCurrency(parseFloat(area.TravelCost), null, { showCents: false })} fee)
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render portfolio albums - Airbnb "Where you'll sleep" style
  const renderPortfolioAlbums = () => {
    if (!portfolioAlbums || portfolioAlbums.length === 0) return null;

    return (
      <div className="content-section">
        <h2>Our work</h2>
        <div style={{ 
          display: 'flex',
          gap: '16px',
          marginTop: '24px',
          overflowX: 'auto',
          paddingBottom: '8px',
          scrollSnapType: 'x mandatory'
        }}>
          {portfolioAlbums.map((album, index) => (
            <div 
              key={index} 
              onClick={() => loadAlbumImages(album)}
              style={{
                cursor: 'pointer',
                flex: '0 0 200px',
                scrollSnapAlign: 'start'
              }}
            >
              {/* Album Cover Image */}
              <div style={{ 
                width: '200px',
                height: '140px',
                background: '#f7f7f7',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid #ebebeb'
              }}>
                {album.CoverImageURL ? (
                  <img 
                    src={album.CoverImageURL} 
                    alt={album.AlbumName} 
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover'
                    }} 
                  />
                ) : (
                  <div style={{ 
                    width: '100%', 
                    height: '100%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    background: '#f7f7f7'
                  }}>
                    <i className="fas fa-images" style={{ fontSize: '2rem', color: '#717171' }}></i>
                  </div>
                )}
              </div>
              
              {/* Album Info - Below image */}
              <div style={{ padding: '12px 0 0 0' }}>
                <h4 style={{ 
                  fontSize: '14px', 
                  fontWeight: 600, 
                  color: '#222', 
                  margin: '0 0 4px 0'
                }}>
                  {album.AlbumName}
                </h4>
                <p style={{ 
                  fontSize: '14px', 
                  color: '#717171', 
                  margin: 0
                }}>
                  {album.ImageCount || 0} {(album.ImageCount || 0) === 1 ? 'photo' : 'photos'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render vendor subcategories section - Clean list style like Airbnb
  const renderVendorSubcategories = () => {
    if (!vendorSubcategories || vendorSubcategories.length === 0) return null;

    return (
      <div className="content-section" style={{ paddingTop: '1.5rem', paddingBottom: '1.5rem', borderTop: '1px solid #ebebeb' }}>
        <h2 style={{ fontSize: '1.375rem', fontWeight: 600, marginBottom: '1rem' }}>Services Offered</h2>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: '12px 24px'
        }}>
          {vendorSubcategories.map((subcategory, index) => (
            <div 
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '0.95rem',
                color: '#222'
              }}
            >
              <i className="fas fa-check" style={{ color: '#222', fontSize: '14px' }}></i>
              <span>{subcategory.SubcategoryName || subcategory.subcategoryName}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render vendor badges section - Using badge images from /images/badges/
  const renderVendorBadges = () => {
    if (!vendorBadges || vendorBadges.length === 0) return null;

    const getBadgeStyle = (badgeType) => {
      const styles = {
        'new_vendor': { bg: '#e0f2fe', textColor: '#0369a1', label: 'New Vendor' },
        'top_rated': { bg: '#fef3c7', textColor: '#d97706', label: 'Top Rated' },
        'choice_award': { bg: '#fee2e2', textColor: '#dc2626', label: 'Choice Award' },
        'premium': { bg: '#f3e8ff', textColor: '#7c3aed', label: 'Premium' },
        'verified': { bg: '#d1fae5', textColor: '#059669', label: 'Verified' },
        'featured': { bg: '#fce7f3', textColor: '#db2777', label: 'Featured' }
      };
      return styles[badgeType?.toLowerCase()] || { bg: '#f3f4f6', textColor: '#6b7280', label: badgeType };
    };

    return (
      <div className="content-section" style={{ paddingTop: '1rem', paddingBottom: '1rem', borderTop: '1px solid #ebebeb' }}>
        <h2 style={{ fontSize: '1.375rem', fontWeight: 600, marginBottom: '0.75rem' }}>Badges</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          {vendorBadges.map((badge, index) => {
            const style = getBadgeStyle(badge.BadgeType || badge.badgeType);
            return (
              <div 
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  MozUserSelect: 'none',
                  msUserSelect: 'none'
                }}
              >
                {/* Badge image display */}
                {badge.ImageURL ? (
                  <img 
                    src={badge.ImageURL} 
                    alt={badge.BadgeName || style.label}
                    style={{ width: '120px', height: '120px', objectFit: 'contain' }}
                  />
                ) : (
                  <div style={{
                    width: '100px',
                    padding: '1rem 0.75rem',
                    borderRadius: '16px',
                    background: style.bg,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      marginBottom: '0.5rem'
                    }}>
                      <i className="fas fa-certificate" style={{ fontSize: '1.25rem', color: style.textColor }}></i>
                    </div>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: 600, 
                      color: style.textColor,
                      textAlign: 'center',
                      lineHeight: 1.2
                    }}>
                      {badge.BadgeName || style.label}
                    </span>
                    {badge.Year && (
                      <span style={{ 
                        fontSize: '0.7rem', 
                        fontWeight: 500,
                        color: style.textColor,
                        opacity: 0.7,
                        marginTop: '2px'
                      }}>
                        {badge.Year}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render team members
  const renderTeam = () => {
    if (!team || team.length === 0) return null;

    return (
      <div className="content-section">
        <h2>Meet the team</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          {team.map((member, index) => (
            <div key={index} className="team-member-card">
              {member.PhotoURL && <img src={member.PhotoURL} alt={member.Name} className="team-member-photo" />}
              <h4 className="team-member-name">{member.Name}</h4>
              <p className="team-member-role">{member.Role}</p>
              {member.Bio && <p className="team-member-bio">{member.Bio}</p>}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render enhanced services with better formatting - show both services and packages with toggle
  // Helper function to get cancellation policy badge styles
  const getCancellationPolicyBadge = (policyType) => {
    const policies = {
      flexible: { bg: '#d1fae5', color: '#065f46', icon: 'fa-shield-alt', label: 'Flexible Cancellation' },
      moderate: { bg: '#fef3c7', color: '#92400e', icon: 'fa-shield-alt', label: 'Moderate Cancellation' },
      strict: { bg: '#fee2e2', color: '#991b1b', icon: 'fa-shield-alt', label: 'Strict Cancellation' },
      custom: { bg: '#e0e7ff', color: '#3730a3', icon: 'fa-shield-alt', label: 'Custom Policy' }
    };
    return policies[policyType] || policies.flexible;
  };

  const renderEnhancedServices = () => {
    const hasPackages = packages && packages.length > 0;
    const services = vendor?.services || [];
    const hasServices = services && services.length > 0;
    
    // Show nothing if no services and no packages
    if (!hasPackages && !hasServices) return null;

    // Get items based on active tab
    const displayItems = offeringsTab === 'services' 
      ? services.slice(0, 3)
      : packages.slice(0, 3);
    
    const allItems = offeringsTab === 'services' ? services : packages;
    const hasMoreItems = allItems.length > 3;

    return (
      <div className="content-section">
        <h2>{t('vendorProfile.whatWeOffer', 'What we offer')}</h2>
        
        {/* Fresha-style Tabs */}
        <PackageServiceTabs
          activeTab={offeringsTab}
          onTabChange={setOfferingsTab}
          packagesCount={packages.length}
          servicesCount={services.length}
        />
        
        {/* Show items based on active tab */}
        <PackageServiceList>
          {offeringsTab === 'services' ? (
            displayItems.map((service, index) => (
              <ServiceCard
                key={service.ServiceID || service.VendorServiceID || service.VendorSelectedServiceID || `service-${index}`}
                service={service}
                onClick={() => { setSelectedService(service); setServiceModalOpen(true); }}
                selectable={false}
              />
            ))
          ) : (
            displayItems.map((pkg) => (
              <PackageCard
                key={pkg.PackageID}
                pkg={pkg}
                onClick={() => { setSelectedPackage(pkg); setPackageModalOpen(true); }}
                selectable={false}
              />
            ))
          )}
        </PackageServiceList>
        
        {/* Empty state */}
        {displayItems.length === 0 && (
          <PackageServiceEmpty type={offeringsTab} />
        )}
        
        {/* Show more button */}
        {hasMoreItems && (
          <button 
            onClick={() => setShowServicesModal(true)}
            style={{
              marginTop: '24px',
              padding: '14px 24px',
              border: '1px solid #222',
              borderRadius: '8px',
              background: 'white',
              color: '#222',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer'
            }}>
            Show all {allItems.length} {offeringsTab === 'services' ? 'services' : 'packages'}
          </button>
        )}
        
        {/* Services/Packages Modal */}
        <UniversalModal
          isOpen={showServicesModal}
          onClose={() => setShowServicesModal(false)}
          title={offeringsTab === 'services' ? 'Featured Services' : 'Packages'}
          size="large"
        >
          <PackageServiceList>
            {offeringsTab === 'services' ? (
              services.map((service, index) => (
                <ServiceCard
                  key={service.ServiceID || service.VendorServiceID || service.VendorSelectedServiceID || `service-modal-${index}`}
                  service={service}
                  onClick={() => { setSelectedService(service); setServiceModalOpen(true); setShowServicesModal(false); }}
                  selectable={false}
                />
              ))
            ) : (
              packages.map((pkg) => (
                <PackageCard
                  key={pkg.PackageID}
                  pkg={pkg}
                  onClick={() => { setSelectedPackage(pkg); setPackageModalOpen(true); setShowServicesModal(false); }}
                  selectable={false}
                />
              ))
            )}
          </PackageServiceList>
        </UniversalModal>
      </div>
    );
  };

  // Render cancellation policy section (Airbnb style)
  const renderCancellationPolicy = () => {
    if (!cancellationPolicy) return null;

    const policyDescriptions = {
      flexible: {
        title: 'Flexible',
        color: '#10b981',
        icon: 'fa-check-circle',
        description: 'Full refund if cancelled at least 24 hours before the event.'
      },
      moderate: {
        title: 'Moderate', 
        color: '#f59e0b',
        icon: 'fa-clock',
        description: 'Full refund if cancelled 7+ days before. 50% refund if cancelled 3-7 days before.'
      },
      strict: {
        title: 'Strict',
        color: '#ef4444',
        icon: 'fa-exclamation-circle',
        description: '50% refund if cancelled 14+ days before. No refund within 14 days of event.'
      },
      custom: {
        title: 'Custom Policy',
        color: '#6366f1',
        icon: 'fa-cog',
        description: null
      }
    };

    const policyType = cancellationPolicy.PolicyType || 'flexible';
    const policyInfo = policyDescriptions[policyType] || policyDescriptions.flexible;

    // Build custom description if custom policy
    let description = policyInfo.description;
    if (policyType === 'custom') {
      const parts = [];
      if (cancellationPolicy.FullRefundDays > 0) {
        parts.push(`Full refund if cancelled ${cancellationPolicy.FullRefundDays}+ days before`);
      }
      if (cancellationPolicy.PartialRefundDays > 0 && cancellationPolicy.PartialRefundPercent > 0) {
        parts.push(`${cancellationPolicy.PartialRefundPercent}% refund if cancelled ${cancellationPolicy.PartialRefundDays}-${cancellationPolicy.FullRefundDays} days before`);
      }
      if (cancellationPolicy.NoRefundDays > 0) {
        parts.push(`No refund within ${cancellationPolicy.NoRefundDays} day(s) of event`);
      }
      description = parts.join('. ') + '.';
      if (cancellationPolicy.CustomTerms) {
        description += ' ' + cancellationPolicy.CustomTerms;
      }
    }

    return (
      <div className="content-section" style={{ marginTop: '2rem' }}>
        <h2>Cancellation policy</h2>
        <div style={{ 
          background: 'linear-gradient(135deg, #f8f9fa 0%, #fff 100%)',
          border: '1px solid #e9ecef',
          borderRadius: '16px',
          padding: '24px',
          marginTop: '1rem'
        }}>
          {/* Policy Type Badge */}
          <div style={{ 
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: policyType === 'flexible' ? '#d4edda' : policyType === 'moderate' ? '#fff3cd' : policyType === 'strict' ? '#f8d7da' : '#e2e3e5',
            color: policyType === 'flexible' ? '#155724' : policyType === 'moderate' ? '#856404' : policyType === 'strict' ? '#721c24' : '#383d41',
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginBottom: '16px',
            textTransform: 'capitalize'
          }}>
            <i className={`fas ${policyType === 'flexible' ? 'fa-check-circle' : policyType === 'moderate' ? 'fa-clock' : policyType === 'strict' ? 'fa-exclamation-circle' : 'fa-cog'}`}></i>
            {policyInfo.title}
          </div>

          {/* Policy Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {policyType === 'custom' ? (
              <>
                {cancellationPolicy.FullRefundDays > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                      width: '36px', 
                      height: '36px', 
                      borderRadius: '50%', 
                      background: '#d4edda', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <i className="fas fa-check" style={{ color: '#28a745', fontSize: '0.9rem' }}></i>
                    </div>
                    <span style={{ color: '#484848', fontSize: '0.95rem' }}>
                      <strong>Full refund</strong> if cancelled {cancellationPolicy.FullRefundDays}+ days before the event
                    </span>
                  </div>
                )}
                {cancellationPolicy.PartialRefundDays > 0 && cancellationPolicy.PartialRefundPercent > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                      width: '36px', 
                      height: '36px', 
                      borderRadius: '50%', 
                      background: '#fff3cd', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <i className="fas fa-percentage" style={{ color: '#856404', fontSize: '0.9rem' }}></i>
                    </div>
                    <span style={{ color: '#484848', fontSize: '0.95rem' }}>
                      <strong>{cancellationPolicy.PartialRefundPercent}% refund</strong> if cancelled {cancellationPolicy.PartialRefundDays}-{cancellationPolicy.FullRefundDays - 1} days before
                    </span>
                  </div>
                )}
                {cancellationPolicy.NoRefundDays > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                      width: '36px', 
                      height: '36px', 
                      borderRadius: '50%', 
                      background: '#f8d7da', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <i className="fas fa-times" style={{ color: '#dc3545', fontSize: '0.9rem' }}></i>
                    </div>
                    <span style={{ color: '#484848', fontSize: '0.95rem' }}>
                      <strong>No refund</strong> within {cancellationPolicy.NoRefundDays} day{cancellationPolicy.NoRefundDays > 1 ? 's' : ''} of the event
                    </span>
                  </div>
                )}
                {cancellationPolicy.CustomTerms && (
                  <div style={{ 
                    marginTop: '8px', 
                    padding: '12px 16px', 
                    background: '#f8f9fa', 
                    borderRadius: '8px',
                    borderLeft: '3px solid #6c757d'
                  }}>
                    <p style={{ margin: 0, color: '#6c757d', fontSize: '0.9rem', fontStyle: 'italic' }}>
                      {cancellationPolicy.CustomTerms}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <p style={{ margin: 0, color: '#484848', fontSize: '0.95rem', lineHeight: 1.6 }}>
                {description}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render enhanced FAQs with multiple choice support
  const renderEnhancedFAQs = () => {
    if (!faqs || faqs.length === 0) return null;

    // Helper to parse answers (handles bullet points, newlines, etc.)
    const parseAnswers = (answer) => {
      if (!answer) return [];
      const answerStr = String(answer);
      // Clean up bullet points and split by newlines
      const cleaned = answerStr.replace(/^[•\-]\s*/gm, '').trim();
      if (cleaned.includes('\n')) {
        return cleaned.split('\n').map(a => a.replace(/^[•\-]\s*/, '').trim()).filter(a => a);
      }
      return [cleaned];
    };

    return (
      <div className="content-section">
        <h2>Frequently asked questions</h2>
        <div style={{ marginTop: '1.5rem' }}>
          {faqs.map((faq, index) => {
            const answerType = (faq.AnswerType || '').trim().toLowerCase();
            const hasAnswerOptions = faq.AnswerOptions && faq.AnswerOptions !== 'null' && faq.AnswerOptions !== '';
            
            let answerItems = [];

            if ((answerType === 'multiple choice' || answerType === 'multiple_choice') && hasAnswerOptions) {
              try {
                let options = typeof faq.AnswerOptions === 'string' ? JSON.parse(faq.AnswerOptions) : faq.AnswerOptions;
                
                if (Array.isArray(options) && options.length > 0) {
                  if (options[0] && typeof options[0] === 'object' && 'label' in options[0]) {
                    answerItems = options.filter(opt => opt.checked === true).map(opt => opt.label);
                  } else {
                    answerItems = options;
                  }
                }
              } catch (e) {
                answerItems = parseAnswers(faq.Answer);
              }
            } else {
              answerItems = parseAnswers(faq.Answer);
            }

            return (
              <div 
                key={index} 
                style={{ 
                  padding: '1.25rem 0'
                }}
              >
                <div style={{ 
                  fontWeight: 500, 
                  color: '#111827', 
                  fontSize: '0.95rem', 
                  marginBottom: '0.75rem'
                }}>
                  {faq.Question}
                </div>
                <div style={{ color: '#4b5563', fontSize: '0.95rem', lineHeight: 1.7 }}>
                  {answerItems.length === 0 ? (
                    <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>No answer provided</span>
                  ) : answerItems.length === 1 ? (
                    <span>{answerItems[0]}</span>
                  ) : (
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(3, 1fr)', 
                      gap: '0.5rem 2rem',
                      marginTop: '0.5rem'
                    }}>
                      {answerItems.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <i className="fas fa-check" style={{ color: '#5e72e4', fontSize: '0.85rem', flexShrink: 0 }}></i>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render reviews section with toggle switch
  const renderReviewsSection = () => {
    const hasGoogleReviews = googleReviews && (googleReviews.reviews?.length > 0 || googleReviews.rating > 0);
    const hasPlatformReviews = reviews && reviews.length > 0;
    
    // Don't show section if no reviews at all
    if (!hasGoogleReviews && !hasPlatformReviews && !googleReviewsLoading) return null;

    // Get current reviews to display
    const currentReviews = showGoogleReviews ? (googleReviews?.reviews || []) : reviews;
    const totalReviews = currentReviews.length;
    const startIndex = currentReviewPage * reviewsPerPage;
    const endIndex = startIndex + reviewsPerPage;
    const displayedReviews = currentReviews.slice(startIndex, endIndex);
    const totalPages = Math.ceil(totalReviews / reviewsPerPage);

    // Get vendor name
    const vendorName = vendor?.profile?.BusinessName || vendor?.profile?.DisplayName || 'This Vendor';

    // Calculate rating
    const avgRating = showGoogleReviews 
      ? (googleReviews?.rating || 0) 
      : (reviews && reviews.length > 0 
          ? reviews.reduce((sum, r) => sum + (r.Rating || 0), 0) / reviews.length
          : 0
        );
    const reviewCount = showGoogleReviews ? (googleReviews?.user_ratings_total || 0) : (reviews?.length || 0);

    return (
      <div className="content-section" id="reviews-section">
        {/* Guest Favourite Section - Only show if admin has granted Guest Favorite status */}
        {vendor?.profile?.IsGuestFavorite && (
          <div style={{
            textAlign: 'center',
            padding: '3rem 1.5rem',
            marginBottom: '2rem',
            background: '#ffffff',
            borderRadius: '16px'
          }}>
            {/* Crown and Rating Display - positioned like Airbnb */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              justifyContent: 'center',
              gap: '0.5rem',
              marginBottom: '1.25rem'
            }}>
              <img 
                src="/images/planbeau-platform-assets/circular_crown_left.avif" 
                alt="" 
                style={{ 
                  width: '44px', 
                  height: '88px', 
                  objectFit: 'contain',
                  marginTop: '0.5rem'
                }}
              />
              <span style={{ 
                fontSize: '4.5rem', 
                fontWeight: 600, 
                color: '#222222', 
                lineHeight: 1,
                letterSpacing: '-2px'
              }}>
                {avgRating.toFixed(2)}
              </span>
              <img 
                src="/images/planbeau-platform-assets/circular_crown_right.avif" 
                alt="" 
                style={{ 
                  width: '44px', 
                  height: '88px', 
                  objectFit: 'contain',
                  marginTop: '0.5rem'
                }}
              />
            </div>
            
            {/* Guest favourite label */}
            <div style={{ 
              fontSize: '1.25rem', 
              fontWeight: 600, 
              color: '#222222',
              marginBottom: '0.75rem'
            }}>
              Guest favourite
            </div>
            
            {/* Description */}
            <div style={{ 
              fontSize: '0.9rem', 
              color: '#717171',
              maxWidth: '280px',
              margin: '0 auto',
              lineHeight: 1.5
            }}>
              Highly rated for exceptional service, quality, and client satisfaction
            </div>
          </div>
        )}


        {/* Header */}
        <h2 style={{ marginBottom: '1.5rem' }}>Reviews for {vendorName}</h2>

        {/* Rating with Toggle on same row */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '1.5rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid var(--border)'
        }}>
          {/* Rating Display - Left side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ 
              fontSize: '2.5rem', 
              fontWeight: 700, 
              color: 'var(--text)', 
              lineHeight: 1
            }}>
              {avgRating > 0 ? avgRating.toFixed(1) : 'N/A'}
            </div>
            <div>
              <div style={{ 
                fontSize: '0.9rem', 
                color: 'var(--primary)',
                marginBottom: '0.125rem'
              }}>
                {'★'.repeat(Math.round(avgRating) || 5)}
              </div>
              <div style={{ 
                fontSize: '0.8rem', 
                color: 'var(--text-light)'
              }}>
                Based on {reviewCount} {showGoogleReviews ? 'Google ' : ''}reviews
              </div>
            </div>
          </div>

          {/* Toggle Switch - Right side, same row */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem'
          }}>
            <span style={{ 
              fontSize: '0.75rem', 
              color: showGoogleReviews ? 'var(--text-light)' : 'var(--primary)', 
              fontWeight: showGoogleReviews ? 400 : 600,
              transition: 'all 0.2s'
            }}>
              Planbeau
            </span>
            
            <div 
              onClick={() => {
                setShowGoogleReviews(!showGoogleReviews);
                setCurrentReviewPage(0);
              }}
              style={{
                width: '40px',
                height: '20px',
                backgroundColor: showGoogleReviews ? 'var(--primary)' : '#e2e8f0',
                borderRadius: '10px',
                position: 'relative',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease'
              }}
            >
              <div style={{
                width: '16px',
                height: '16px',
                backgroundColor: 'white',
                borderRadius: '50%',
                position: 'absolute',
                top: '2px',
                left: showGoogleReviews ? '22px' : '2px',
                transition: 'left 0.2s ease',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
              }} />
            </div>
            
            <span style={{ 
              fontSize: '0.75rem', 
              color: showGoogleReviews ? 'var(--primary)' : 'var(--text-light)', 
              fontWeight: showGoogleReviews ? 600 : 400,
              transition: 'all 0.2s'
            }}>
              Google
            </span>
          </div>
        </div>

        {/* Average Survey Ratings - Only show for Planbeau reviews */}
        {!showGoogleReviews && reviews && reviews.length > 0 && (() => {
          // Calculate averages for each survey category
          const surveyCategories = [
            { key: 'QualityRating', label: 'Quality of Service' },
            { key: 'CommunicationRating', label: 'Communication' },
            { key: 'ValueRating', label: 'Value for Money' },
            { key: 'PunctualityRating', label: 'Punctuality' },
            { key: 'ProfessionalismRating', label: 'Professionalism' }
          ];
          
          const averages = surveyCategories.map(cat => {
            const validRatings = reviews.filter(r => r[cat.key] != null && r[cat.key] > 0);
            if (validRatings.length === 0) return null;
            const avg = validRatings.reduce((sum, r) => sum + r[cat.key], 0) / validRatings.length;
            return { label: cat.label, value: avg };
          }).filter(Boolean);
          
          if (averages.length === 0) return null;
          
          return (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px 24px',
              padding: '20px',
              background: '#f9fafb',
              borderRadius: '12px',
              marginBottom: '1.5rem'
            }}>
              {averages.map(avg => (
                <div key={avg.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '180px' }}>
                  <span style={{ fontSize: '13px', color: '#374151', whiteSpace: 'nowrap' }}>{avg.label}</span>
                  <div style={{ 
                    width: '60px', 
                    height: '6px', 
                    background: '#e5e7eb', 
                    borderRadius: '3px',
                    overflow: 'hidden',
                    flexShrink: 0
                  }}>
                    <div style={{ 
                      width: `${(avg.value / 5) * 100}%`, 
                      height: '100%', 
                      background: '#5e72e4',
                      borderRadius: '3px'
                    }} />
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                    {avg.value.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Review Content - Airbnb 2-column grid */}
        <div>
          {googleReviewsLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ fontSize: '0.95rem', color: 'var(--text-light)' }}>Loading reviews...</div>
            </div>
          ) : displayedReviews.length > 0 ? (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '40px 48px'
              }}>
                {displayedReviews.map((review, index) => {
                  const reviewerName = showGoogleReviews ? (review.author_name || 'Anonymous') : (review.ReviewerName || 'Anonymous');
                  const reviewerLocation = showGoogleReviews ? '' : (review.ReviewerLocation || 'Canada');
                  const reviewerAvatar = showGoogleReviews ? review.profile_photo_url : review.ReviewerAvatar;
                  const rating = showGoogleReviews ? (review.rating || 5) : (review.Rating || 5);
                  const reviewText = showGoogleReviews ? (review.text || '') : (review.Comment || '');
                  const maxLength = 180;
                  const isLongText = reviewText.length > maxLength;
                  const displayText = isLongText ? reviewText.substring(0, maxLength) + '...' : reviewText;
                  
                  // Format date like "October 2025 · Stayed a few nights"
                  const formatReviewDate = () => {
                    if (showGoogleReviews) {
                      return review.relative_time_description || '';
                    }
                    const rawDate = review.CreatedAt || review.createdAt || review.ReviewDate || review.created_at;
                    if (!rawDate) return '';
                    const date = new Date(rawDate);
                    if (isNaN(date.getTime())) return '';
                    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                    return `${months[date.getMonth()]} ${date.getFullYear()}`;
                  };

                  return (
                    <div key={index}>
                      {/* Reviewer Header - Avatar + Name + Location */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        {/* Avatar */}
                        <div style={{ 
                          width: '48px', 
                          height: '48px', 
                          borderRadius: '50%', 
                          backgroundImage: reviewerAvatar ? `url(${reviewerAvatar})` : 'none',
                          backgroundColor: reviewerAvatar ? 'transparent' : '#222', 
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 600,
                          fontSize: '18px',
                          flexShrink: 0
                        }}>
                          {!reviewerAvatar && reviewerName.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '16px', color: '#222' }}>
                            {reviewerName}
                          </div>
                          {reviewerLocation && (
                            <div style={{ fontSize: '14px', color: '#717171' }}>
                              {reviewerLocation}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Rating + Date Row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        {/* Star Rating */}
                        <div style={{ display: 'flex', gap: '2px' }}>
                          {[1,2,3,4,5].map(i => (
                            <svg key={i} width="12" height="12" viewBox="0 0 32 32" fill={i <= rating ? '#222' : '#e0e0e0'}>
                              <path d="M15.1 1.58l-4.13 8.88-9.86 1.27a1 1 0 0 0-.54 1.74l7.3 6.57-1.97 9.85a1 1 0 0 0 1.48 1.06l8.62-5 8.63 5a1 1 0 0 0 1.48-1.06l-1.97-9.85 7.3-6.57a1 1 0 0 0-.55-1.73l-9.86-1.28-4.12-8.88a1 1 0 0 0-1.82 0z"/>
                            </svg>
                          ))}
                        </div>
                        <span style={{ fontSize: '14px', color: '#222' }}>·</span>
                        <span style={{ fontSize: '14px', color: '#717171' }}>
                          {formatReviewDate()}
                        </span>
                      </div>

                      {/* Review Text */}
                      <div style={{ 
                        fontSize: '16px', 
                        color: '#222',
                        lineHeight: 1.5
                      }}>
                        {displayText}
                      </div>

                      {/* Show more button - consistent style */}
                      {isLongText && (
                        <button style={{ 
                          marginTop: '12px',
                          padding: '10px 20px',
                          border: '1px solid #222',
                          borderRadius: '8px',
                          background: 'white',
                          color: '#222',
                          fontSize: '14px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}>
                          Show more
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  gap: '1rem',
                  marginTop: '2rem',
                  padding: '1.5rem 0',
                  borderTop: '1px solid var(--border)'
                }}>
                  <button
                    onClick={() => setCurrentReviewPage(Math.max(0, currentReviewPage - 1))}
                    disabled={currentReviewPage === 0}
                    className="btn btn-outline"
                    style={{
                      opacity: currentReviewPage === 0 ? 0.5 : 1,
                      cursor: currentReviewPage === 0 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <i className="fas fa-chevron-left"></i> Previous
                  </button>
                  
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-light)', fontWeight: 500 }}>
                    Page {currentReviewPage + 1} of {totalPages}
                  </span>
                  
                  <button
                    onClick={() => setCurrentReviewPage(Math.min(totalPages - 1, currentReviewPage + 1))}
                    disabled={currentReviewPage === totalPages - 1}
                    className="btn btn-outline"
                    style={{
                      opacity: currentReviewPage === totalPages - 1 ? 0.5 : 1,
                      cursor: currentReviewPage === totalPages - 1 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Next <i className="fas fa-chevron-right"></i>
                  </button>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-light)' }}>
              <i className="fas fa-comment" style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }}></i>
              <div style={{ fontSize: '0.9rem' }}>No {showGoogleReviews ? 'Google' : 'in-app'} reviews yet.</div>
            </div>
          )}
        </div>

        {/* View on Google Link */}
        {hasGoogleReviews && showGoogleReviews && googleReviews?.url && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center',
            marginTop: '1.5rem',
            padding: '1rem 0',
            borderTop: '1px solid var(--border)'
          }}>
            <a 
              href={googleReviews.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                color: 'var(--primary)', 
                textDecoration: 'none', 
                fontSize: '0.9rem', 
                fontWeight: 500,
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius)',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => e.target.style.background = 'var(--bg-light)'}
              onMouseOut={(e) => e.target.style.background = 'transparent'}
            >
              <img 
                src="https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png" 
                alt="Google" 
                style={{ height: '16px' }} 
              />
              View on Google
              <i className="fas fa-external-link-alt" style={{ fontSize: '0.75rem' }}></i>
            </a>
          </div>
        )}
      </div>
    );
  };

  // Render recommendations section - simple grid layout
  const renderRecommendations = () => {
    // Combine similar and nearby vendors, deduplicate by VendorProfileID
    const similarVendors = recommendations.similar || [];
    const nearbyVendors = recommendations.nearby || [];
    const seenIds = new Set();
    const combinedRecs = [];
    
    similarVendors.forEach(v => {
      const id = v.VendorProfileID || v.id;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        combinedRecs.push(v);
      }
    });
    
    nearbyVendors.forEach(v => {
      const id = v.VendorProfileID || v.id;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        combinedRecs.push(v);
      }
    });
    
    // Limit to 4 vendors for clean grid
    const currentRecs = combinedRecs.slice(0, 4);

    if (currentRecs.length === 0) return null;

    return (
      <div style={{ 
        padding: '3rem 0 2rem 0', 
        marginTop: '2rem',
        borderTop: '1px solid #ebebeb'
      }}>
        <h2 style={{ 
          fontSize: '1.375rem', 
          fontWeight: '600', 
          color: '#222222',
          margin: 0,
          marginBottom: '1.5rem'
        }}>
          Similar vendors
        </h2>
        
        {/* Simple 4-column grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px'
        }}>
          {currentRecs.map((venue, index) => (
            <VendorCard
              key={venue.VendorProfileID || venue.id || index}
              vendor={venue}
              isFavorite={favorites.some(fav => fav.vendorProfileId === (venue.VendorProfileID || venue.id))}
              onToggleFavorite={(vendorId) => handleRecommendationFavorite(vendorId)}
              onView={(vendorId) => navigate(`/vendor/${encodeVendorId(vendorId)}`)}
            />
          ))}
        </div>
      </div>
    );
  };

  // Show error page for invalid/tampered vendor IDs
  if (isInvalidVendorId) {
    return (
      <PageLayout variant="fullWidth" pageClassName="vendor-profile-page">
        <Header 
          onSearch={() => {}} 
          onProfileClick={() => setProfileModalOpen(true)} 
          onWishlistClick={() => setProfileModalOpen(true)} 
          onChatClick={() => setProfileModalOpen(true)} 
          onNotificationsClick={() => {}} 
        />
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '60vh',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <i className="fas fa-exclamation-triangle" style={{ fontSize: '4rem', color: '#f59e0b', marginBottom: '1.5rem' }}></i>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 600, marginBottom: '0.75rem', color: '#222' }}>Invalid Vendor Link</h1>
          <p style={{ color: '#717171', marginBottom: '1.5rem', maxWidth: '400px' }}>
            The vendor link you're trying to access is invalid or has been tampered with.
          </p>
          <button 
            onClick={() => navigate('/')}
            style={{
              background: '#222',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '1rem',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Go to Homepage
          </button>
        </div>
        <Footer />
      </PageLayout>
    );
  }

  if (loading) {
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
    
    // Mobile: Simple skeleton matching the reference design
    if (isMobile) {
      return (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          minHeight: '100vh',
          background: '#fff',
          position: 'relative'
        }}>
          {/* Back button - white circle with arrow */}
          <button 
            onClick={() => navigate(-1)}
            style={{ 
              position: 'absolute',
              top: '16px',
              left: '16px',
              zIndex: 10,
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: '#fff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <i className="fas fa-arrow-left" style={{ color: '#222', fontSize: '14px' }}></i>
          </button>
          
          {/* Gray image area - approximately 47% of viewport height */}
          <div style={{ 
            height: '47vh', 
            width: '100%', 
            background: '#e8e8e8'
          }}></div>
          
          {/* White content area with skeleton bars - curved top overlapping image */}
          <div style={{ 
            flex: 1,
            background: '#fff',
            padding: '32px 24px 24px 24px',
            marginTop: '-20px',
            borderRadius: '20px 20px 0 0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            position: 'relative',
            zIndex: 1
          }}>
            {/* First bar - widest, rounded ends */}
            <div className="skeleton" style={{ 
              height: '20px', 
              width: '90%', 
              maxWidth: '340px',
              borderRadius: '10px'
            }}></div>
            
            {/* Second bar - medium width */}
            <div className="skeleton" style={{ 
              height: '16px', 
              width: '75%', 
              maxWidth: '280px',
              borderRadius: '8px'
            }}></div>
            
            {/* Third bar - shortest */}
            <div className="skeleton" style={{ 
              height: '14px', 
              width: '55%', 
              maxWidth: '200px',
              borderRadius: '7px'
            }}></div>
          </div>
        </div>
      );
    }
    
    // Desktop: Full skeleton with header and content
    return (
      <>
        <Header 
          onSearch={() => {}} 
          onProfileClick={() => setProfileModalOpen(true)} 
          onWishlistClick={() => setProfileModalOpen(true)} 
          onChatClick={() => setProfileModalOpen(true)} 
          onNotificationsClick={() => {}} 
        />
        <div style={{ background: '#ffffff', minHeight: '100vh' }}>
          <div className="profile-container" style={{ background: '#ffffff' }}>
            {/* Breadcrumb Skeleton */}
            <div className="skeleton" style={{ width: '300px', height: '20px', borderRadius: '6px', marginBottom: '1rem' }}></div>

            {/* Image Gallery Skeleton - Desktop Grid layout */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '8px', 
              borderRadius: '12px', 
              overflow: 'hidden',
              marginBottom: '1.5rem',
              height: '400px'
            }}>
              <div className="skeleton" style={{ 
                height: '100%',
                borderRadius: '12px 0 0 12px'
              }}></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '8px' }}>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="skeleton" style={{ 
                    borderRadius: i === 2 ? '0 12px 0 0' : i === 4 ? '0 0 12px 0' : '0'
                  }}></div>
                ))}
              </div>
            </div>

            {/* Header Skeleton */}
            <div style={{ marginBottom: '2rem' }}>
              <div className="skeleton" style={{ width: '60%', height: '36px', marginBottom: '0.5rem' }}></div>
              <div className="skeleton" style={{ width: '40%', height: '18px', marginBottom: '0.5rem' }}></div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                <div className="skeleton" style={{ width: '60px', height: '24px', borderRadius: '12px' }}></div>
                <div className="skeleton" style={{ width: '100px', height: '24px', borderRadius: '12px' }}></div>
              </div>
            </div>

            {/* Content Layout Skeleton */}
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: '1fr 320px',
              gap: '3rem'
            }}>
              {/* Main Content */}
              <div>
                {/* About Section Skeleton */}
                <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
                  <div className="skeleton" style={{ width: '150px', height: '24px', marginBottom: '1rem' }}></div>
                  <div className="skeleton" style={{ width: '100%', height: '16px', marginBottom: '0.5rem' }}></div>
                  <div className="skeleton" style={{ width: '95%', height: '16px', marginBottom: '0.5rem' }}></div>
                  <div className="skeleton" style={{ width: '85%', height: '16px' }}></div>
                </div>

                {/* Services Section Skeleton */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <div className="skeleton" style={{ width: '140px', height: '24px', marginBottom: '1rem' }}></div>
                  {[1, 2].map((i) => (
                    <div key={i} style={{ 
                      padding: '1rem', 
                      border: '1px solid #e5e7eb', 
                      borderRadius: '12px', 
                      marginBottom: '0.75rem'
                    }}>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <div className="skeleton" style={{ width: '60px', height: '60px', borderRadius: '8px', flexShrink: 0 }}></div>
                        <div style={{ flex: 1 }}>
                          <div className="skeleton" style={{ width: '70%', height: '18px', marginBottom: '0.5rem' }}></div>
                          <div className="skeleton" style={{ width: '100%', height: '14px', marginBottom: '0.25rem' }}></div>
                          <div className="skeleton" style={{ width: '50%', height: '14px' }}></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sidebar Skeleton */}
              <div>
                <div style={{ 
                  padding: '1.5rem', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '12px',
                  boxShadow: '0 6px 16px rgba(0,0,0,0.12)'
                }}>
                  <div className="skeleton" style={{ width: '100%', height: '44px', borderRadius: '8px', marginBottom: '1rem' }}></div>
                  <div className="skeleton" style={{ width: '100%', height: '44px', borderRadius: '8px' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (!vendor) {
    return (
      <div className="profile-container">
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-light)' }}>Vendor not found</p>
          <button className="btn btn-primary" onClick={() => {
            // If this page was opened in a new tab, close it
            // Otherwise, navigate to home
            if (window.opener || window.history.length <= 1) {
              window.close();
            } else {
              navigate('/');
            }
          }} style={{ marginTop: '1rem' }}>
            Back to Search
          </button>
        </div>
      </div>
    );
  }

  const profile = vendor.profile;
  const images = vendor.images || [];
  const services = vendor.services || [];
  const reviews = vendor.reviews || [];
  const faqs = vendor.faqs || [];
  const businessHours = vendor.businessHours || [];
  const categories = vendor.categories || [];

  return (
    <PageLayout variant="fullWidth" pageClassName="vendor-profile-page">
      <Header 
        onSearch={() => {}} 
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
      <div className="profile-container">
        {/* Back Button - Close tab and go back to main page */}
        <button className="back-button" onClick={() => {
          // If this page was opened in a new tab, close it
          // Otherwise, navigate back
          if (window.opener || window.history.length <= 1) {
            window.close();
          } else {
            navigate(-1);
          }
        }}>
          <i className="fas fa-arrow-left"></i>
          <span>Back to search</span>
        </button>


        {/* Breadcrumb Navigation with Save/Share */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <Breadcrumb items={[
            { 
              label: profile.City || 'City', 
              path: `/browse/${encodeURIComponent(profile.City || 'City')}` 
            },
            { 
              label: (() => {
                const categoryDisplayNames = {
                  'venue': 'Venues', 'photo': 'Photography', 'video': 'Videography',
                  'music': 'Music', 'dj': 'DJ', 'catering': 'Catering', 'entertainment': 'Entertainment',
                  'experiences': 'Experiences', 'decorations': 'Decorations', 'beauty': 'Beauty', 'cake': 'Cake',
                  'transportation': 'Transportation', 'planners': 'Planners', 'fashion': 'Fashion', 'stationery': 'Stationery'
                };
                const catId = categories[0]?.Category || profile.PrimaryCategory || profile.Category || '';
                return categoryDisplayNames[catId] || categories[0]?.CategoryName || profile.CategoryName || catId || 'Services';
              })(),
              path: `/browse/${encodeURIComponent(profile.City || 'City')}/${(categories[0]?.Category || categories[0]?.CategoryKey || profile.CategoryKey || 'all').toLowerCase()}`
            },
            profile.BusinessName || profile.DisplayName || 'Vendor Name',
            'Profile'
          ]} />
          
          {/* Compact Action Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleToggleFavorite}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.35rem 0.75rem',
                border: '1px solid #ddd',
                borderRadius: '8px',
                background: isFavorite ? '#fff0f0' : 'white',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 500,
                color: isFavorite ? '#e11d48' : '#222',
                transition: 'all 0.2s'
              }}
            >
              <i className={`${isFavorite ? 'fas' : 'far'} fa-heart`} style={{ fontSize: '0.75rem', color: isFavorite ? '#e11d48' : '#717171' }}></i>
              Save
            </button>
            <button
              onClick={handleShare}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.35rem 0.75rem',
                border: '1px solid #ddd',
                borderRadius: '8px',
                background: 'white',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 500,
                color: '#222',
                transition: 'all 0.2s'
              }}
            >
              <i className="fas fa-share-alt" style={{ fontSize: '0.7rem', color: '#717171' }}></i>
              Share
            </button>
          </div>
        </div>

        {/* Image Gallery */}
        <VendorGallery 
          images={images} 
          onBack={() => navigate(-1)}
          onShare={handleShare}
          onFavorite={handleToggleFavorite}
          isFavorite={isFavorite}
        />

        {/* Mobile Content Sheet - overlaps image with rounded corners */}
        <div className="mobile-content-sheet">
        {/* Main Layout Grid - Sidebar starts at vendor name level */}
        <div className="vendor-profile-layout">
          {/* Left Column - Vendor Info + Content */}
          <div>
            {/* Vendor Title and Rating */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {/* Business Logo */}
              {(profile.LogoURL || profile.FeaturedImageURL) && (
                <div style={{ 
                  width: '80px', 
                  height: '80px', 
                  borderRadius: '50%', 
                  overflow: 'hidden', 
                  border: '2px solid var(--border)',
                  background: 'var(--secondary)',
                  flexShrink: 0
                }}>
                  <img 
                    src={profile.LogoURL || profile.FeaturedImageURL} 
                    alt={`${profile.BusinessName || profile.DisplayName} logo`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => e.target.style.display = 'none'}
                  />
                </div>
              )}
              
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <h1 style={{ fontSize: '1.625rem', fontWeight: 600, color: '#222', lineHeight: 1.25, margin: 0 }}>
                    {profile.BusinessName || profile.DisplayName}
                  </h1>
                  {/* Online Status Indicator */}
                  {vendorOnlineStatus && (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px',
                      padding: '4px 10px',
                      borderRadius: '16px',
                      backgroundColor: vendorOnlineStatus.isOnline ? '#dcfce7' : '#f3f4f6',
                      flexShrink: 0
                    }}>
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: vendorOnlineStatus.isOnline ? '#22c55e' : '#9ca3af'
                      }} />
                      <span style={{ 
                        fontSize: '0.8rem', 
                        fontWeight: 500,
                        color: vendorOnlineStatus.isOnline ? '#16a34a' : '#6b7280'
                      }}>
                        {vendorOnlineStatus.isOnline ? 'Online' : vendorOnlineStatus.lastActiveText || 'Offline'}
                      </span>
                    </div>
                  )}
                </div>
              
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.95rem' }}>
                  {/* Rating with blue star - clickable */}
                  <span 
                    onClick={() => {
                      const reviewsSection = document.getElementById('reviews-section');
                      if (reviewsSection) {
                        reviewsSection.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" style={{ 
                      display: 'block', 
                      height: '14px', 
                      width: '14px', 
                      fill: '#0066CC'
                    }}>
                      <path fillRule="evenodd" d="M15.1 1.58l-4.13 8.88-9.86 1.27a1 1 0 0 0-.54 1.74l7.3 6.57-1.97 9.85a1 1 0 0 0 1.48 1.06l8.62-5 8.63 5a1 1 0 0 0 1.48-1.06l-1.97-9.85 7.3-6.57a1 1 0 0 0-.55-1.73l-9.86-1.28-4.12-8.88a1 1 0 0 0-1.82 0z"></path>
                    </svg>
                    <span style={{ fontWeight: 600, color: '#000' }}>
                      {reviews.length > 0 ? '4.9' : '5.0'}
                    </span>
                    {reviews.length > 0 && (
                      <span style={{ color: '#717171' }}>({reviews.length})</span>
                    )}
                  </span>
                  
                  <span style={{ color: '#717171', margin: '0 0.25rem' }}>·</span>
                  
                  {/* Location - clickable */}
                  {(profile.City || profile.State) && (
                    <>
                      <span 
                        onClick={() => {
                          const locationSection = document.getElementById('location-section');
                          if (locationSection) {
                            locationSection.scrollIntoView({ behavior: 'smooth' });
                          }
                        }}
                        style={{ 
                          color: '#000', 
                          textDecoration: 'underline', 
                          fontWeight: 500, 
                          cursor: 'pointer' 
                        }}
                      >
                        {getProfileLocation(profile)}
                      </span>
                      <span style={{ color: '#717171', margin: '0 0.25rem' }}>·</span>
                    </>
                  )}
                  
                  {/* Category */}
                  <span style={{ color: '#000' }}>{profile.CategoryName || 'Event Services'}</span>
                </div>
              </div>
                </div>
              </div>

            </div>

            {/* Airbnb-style Guest Favourite Row - Only show if admin has granted Guest Favorite status */}
            {vendor?.profile?.IsGuestFavorite && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              padding: '24px 0',
              borderBottom: '1px solid #ebebeb',
              marginTop: '8px'
            }}>
              {/* Guest Favourite Badge */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px',
                padding: '12px 20px',
                border: '1px solid #e0e0e0',
                borderRadius: '12px',
                width: '100%',
                justifyContent: 'space-between'
              }}>
                {/* Guest Favourite with crowns grouped together */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {/* Crown Left */}
                  <img 
                    src="/images/planbeau-platform-assets/circular_crown_left.avif" 
                    alt="" 
                    style={{ width: '40px', height: '40px', objectFit: 'contain' }}
                  />
                  
                  <div style={{ textAlign: 'center', padding: '0 4px' }}>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#222' }}>Guest</div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#222' }}>favourite</div>
                  </div>
                  
                  {/* Crown Right */}
                  <img 
                    src="/images/planbeau-platform-assets/circular_crown_right.avif" 
                    alt="" 
                    style={{ width: '40px', height: '40px', objectFit: 'contain' }}
                  />
                </div>
                
                {/* Description text - hidden on mobile */}
                <div className="guest-favourite-description" style={{ 
                  fontSize: '14px', 
                  color: '#222', 
                  maxWidth: '180px',
                  lineHeight: 1.4,
                  marginLeft: '8px'
                }}>
                  One of the most loved vendors on Planbeau, according to guests
                </div>
                
                <div style={{ 
                  width: '1px', 
                  height: '40px', 
                  background: '#dddddd',
                  margin: '0 8px'
                }}></div>
                
                <div style={{ textAlign: 'center', minWidth: '50px' }}>
                  <div style={{ fontSize: '20px', fontWeight: 600, color: '#222' }}>
                    {reviews.length > 0 ? (reviews.reduce((sum, r) => sum + (r.Rating || 5), 0) / reviews.length).toFixed(2) : '5.0'}
                  </div>
                  <div style={{ display: 'flex', gap: '1px', justifyContent: 'center' }}>
                    {[1,2,3,4,5].map(i => (
                      <svg key={i} width="10" height="10" viewBox="0 0 32 32" fill="#222">
                        <path d="M15.1 1.58l-4.13 8.88-9.86 1.27a1 1 0 0 0-.54 1.74l7.3 6.57-1.97 9.85a1 1 0 0 0 1.48 1.06l8.62-5 8.63 5a1 1 0 0 0 1.48-1.06l-1.97-9.85 7.3-6.57a1 1 0 0 0-.55-1.73l-9.86-1.28-4.12-8.88a1 1 0 0 0-1.82 0z"/>
                      </svg>
                    ))}
                  </div>
                </div>
                
                <div style={{ 
                  width: '1px', 
                  height: '40px', 
                  background: '#dddddd',
                  margin: '0 8px'
                }}></div>
                
                <div style={{ textAlign: 'center', minWidth: '50px' }}>
                  <div style={{ fontSize: '20px', fontWeight: 600, color: '#222' }}>
                    {reviews.length || 0}
                  </div>
                  <div style={{ fontSize: '12px', color: '#222', textDecoration: 'underline', cursor: 'pointer' }}>
                    Reviews
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* Discovery Badges - 2x2 Grid Layout (simple styling, no colored borders) */}
            {(vendor.discoveryFlags?.isTrending || vendor.discoveryFlags?.isMostBooked || vendor.discoveryFlags?.isTopRated || vendor.discoveryFlags?.isNewVendor) && (
              <div style={{ padding: '24px 0', borderBottom: '1px solid #ebebeb' }}>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(2, 1fr)', 
                  gap: '12px'
                }}>
                  {vendor.discoveryFlags?.isTrending && (
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <i className="fas fa-arrow-trend-up" style={{ fontSize: '20px', color: '#FF6B35', width: '24px', flexShrink: 0, marginTop: '2px' }}></i>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#222' }}>Trending</div>
                        <div style={{ fontSize: '12px', color: '#717171' }}>
                          {vendor.discoveryFlags.trendingBadge || 'Popular with guests right now'}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {vendor.discoveryFlags?.isMostBooked && (
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <i className="fas fa-calendar-check" style={{ fontSize: '20px', color: '#EC4899', width: '24px', flexShrink: 0, marginTop: '2px' }}></i>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#222' }}>Most Booked</div>
                        <div style={{ fontSize: '12px', color: '#717171' }}>
                          {vendor.discoveryFlags.bookingsBadge || 'Frequently booked by guests'}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {vendor.discoveryFlags?.isTopRated && (
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <i className="fas fa-star" style={{ fontSize: '20px', color: '#FFB400', width: '24px', flexShrink: 0, marginTop: '2px' }}></i>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#222' }}>Top Rated</div>
                        <div style={{ fontSize: '12px', color: '#717171' }}>
                          {vendor.discoveryFlags.ratingBadge || 'Highly rated by guests'}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {vendor.discoveryFlags?.isNewVendor && (
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <i className="fas fa-wand-magic-sparkles" style={{ fontSize: '20px', color: '#5086E8', width: '24px', flexShrink: 0, marginTop: '2px' }}></i>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#222' }}>New on Planbeau</div>
                        <div style={{ fontSize: '12px', color: '#717171' }}>Recently joined our platform</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Main Content */}
            <div style={{ paddingTop: '24px' }}>
          {/* 1. About This Vendor - with Show More for long descriptions */}
          <div className="content-section">
            <h2>About this vendor</h2>
            {(() => {
              const description = profile.BusinessDescription || 'Welcome to our business! We provide exceptional event services tailored to your needs.';
              const maxLength = 400;
              const isLong = description.length > maxLength;
              
              return (
                <>
                  <p style={{ margin: 0, lineHeight: 1.6 }}>
                    {isLong ? `${description.substring(0, maxLength)}...` : description}
                  </p>
                  {isLong && (
                    <button
                      onClick={() => setDescriptionModalOpen(true)}
                      style={{
                        marginTop: '16px',
                        padding: '10px 20px',
                        border: '1px solid #222',
                        borderRadius: '8px',
                        background: 'white',
                        color: '#222',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Show more
                    </button>
                  )}
                </>
              );
            })()}
          </div>

          {/* 2. Services Offered (Subcategories) */}
          {renderVendorSubcategories()}

          {/* 3. What This Place Offers (Questionnaire of Services) */}
          {renderVendorFeatures()}

          {/* 4. Badges Section */}
          {renderVendorBadges()}

          {/* 4. What We Offer (Service Pricing) */}
          {renderEnhancedServices()}

          {/* 5. Portfolio (Media Gallery) */}
          {renderPortfolioAlbums()}

          {/* 6. Things to Know */}
          {renderEnhancedFAQs()}

          {/* Cancellation Policy - Now shown on individual packages/services */}

          {/* 7. Where You'll Find Us (Map + Cities Served) */}
          {renderLocationAndServiceAreas()}

          {/* Team Section - optional at bottom */}
              {renderTeam()}
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="vendor-sidebar" id="vendor-sidebar">
          {/* 1. Booking Widget with Calendar */}
          <ProfileVendorWidget
            vendorId={vendorId}
            vendorName={profile?.BusinessName}
            packages={packages}
            services={vendor?.services || []}
            businessHours={businessHours}
            basePrice={profile?.HourlyRate || profile?.BasePrice || null}
            priceType={profile?.PricingType || 'per_hour'}
            minBookingHours={profile?.MinBookingHours || 1}
            timezone={profile?.TimeZone || profile?.Timezone}
            cancellationPolicy={cancellationPolicy}
            instantBookingEnabled={profile?.InstantBookingEnabled || false}
            minBookingLeadTimeHours={profile?.MinBookingLeadTimeHours || 0}
            onReserve={handleRequestBooking}
            onMessage={handleMessageVendor}
            prefilledDate={searchDateParams?.date}
            prefilledStartTime={searchDateParams?.startTime}
            prefilledEndTime={searchDateParams?.endTime}
          />

          {/* 2. Hosted By Card */}
          <div className="sidebar-card" style={{ marginTop: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              {/* Host Avatar */}
              <div 
                onClick={() => navigate(`/profile/${encodeUserId(profile.HostUserID || vendorId)}`)}
                style={{ 
                  width: '56px', 
                  height: '56px', 
                  borderRadius: '50%', 
                  overflow: 'hidden',
                  cursor: 'pointer',
                  flexShrink: 0,
                  border: '2px solid #f0f0f0'
                }}
              >
                <img 
                  src={profile.HostProfileImage || profile.LogoURL || 'https://res.cloudinary.com/dxgy4apj5/image/upload/v1755105530/image_placeholder.png'}
                  alt={profile.HostName || 'Host'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.target.src = 'https://res.cloudinary.com/dxgy4apj5/image/upload/v1755105530/image_placeholder.png'; }}
                />
              </div>
              
              {/* Host Info */}
              <div style={{ flex: 1 }}>
                <div 
                  onClick={() => navigate(`/profile/${encodeUserId(profile.HostUserID || vendorId)}`)}
                  style={{ 
                    fontSize: '1rem', 
                    fontWeight: 600, 
                    color: '#222',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  Hosted by {profile.HostName || profile.BusinessName?.split(' ')[0] || 'Host'}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#717171', marginTop: '2px' }}>
                  {reviews.length > 0 ? (
                    <span>{reviews.length} review{reviews.length !== 1 ? 's' : ''}</span>
                  ) : (
                    <span>New host</span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Message Host Button */}
            <button 
              className="btn btn-outline btn-full-width" 
              onClick={handleMessageVendor}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 16px',
                border: '1px solid #222',
                borderRadius: '8px',
                background: 'white',
                color: '#222',
                fontWeight: 600,
                fontSize: '0.95rem',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#f7f7f7'}
              onMouseOut={(e) => e.currentTarget.style.background = 'white'}
            >
              Message Host
            </button>
            
            {/* Report this listing link */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: '6px',
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: '1px solid #ebebeb'
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#717171" strokeWidth="2">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                <line x1="4" y1="22" x2="4" y2="15"/>
              </svg>
              <button
                onClick={() => setShowReportModal(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#717171',
                  fontSize: '14px',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0
                }}
              >
                Report this listing
              </button>
            </div>
          </div>

          </div>
        </div>
        
        {/* Divider between map and reviews */}
        <div style={{ borderTop: '1px solid #ebebeb', marginTop: '48px' }}></div>
        
        {/* 8. Reviews - Full Width Section (outside grid) */}
        <div style={{ marginTop: '48px' }}>
          {renderReviewsSection()}
        </div>
      
      {/* Meet Your Host Section - Matching HostProfilePage Card Style */}
      {profile?.HostUserID && (
        <section style={{
          padding: '48px 0',
          borderTop: '1px solid #ebebeb',
          marginTop: '48px'
        }}>
          <h2 style={{
            fontSize: '22px',
            fontWeight: 600,
            color: '#222',
            marginBottom: '32px'
          }}>Meet your host</h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: '340px 1fr',
            gap: '64px',
            alignItems: 'start'
          }}>
            {/* Left Column - Card + Report */}
            <div>
              {/* Profile Card - Horizontal Layout (matching HostProfilePage) */}
              <div 
                onClick={() => navigate(`/profile/${encodeUserId(profile.HostUserID)}`)}
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  background: '#fff',
                  border: '1px solid #ddd',
                  borderRadius: '24px',
                  padding: '24px',
                  boxShadow: '0 6px 16px rgba(0, 0, 0, 0.12)',
                  cursor: 'pointer'
                }}
              >
                {/* Left - Avatar and Name */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingRight: '24px' }}>
                  <div style={{
                    position: 'relative',
                    width: '128px',
                    height: '128px',
                    marginBottom: '16px'
                  }}>
                    <img 
                      src={profile.HostProfileImage || profile.LogoURL || 'https://res.cloudinary.com/dxgy4apj5/image/upload/v1755105530/image_placeholder.png'}
                      alt={profile.HostName || 'Host'}
                      style={{ 
                        width: '128px', 
                        height: '128px', 
                        borderRadius: '50%', 
                        objectFit: 'cover',
                        border: '4px solid #f0f0f0'
                      }}
                      onError={(e) => { e.target.src = 'https://res.cloudinary.com/dxgy4apj5/image/upload/v1755105530/image_placeholder.png'; }}
                    />
                    {profile.HostIsVerified && (
                      <span style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: '28px',
                        height: '28px',
                        background: '#E31C5F',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '12px',
                        border: '3px solid #fff'
                      }}>
                        <i className="fas fa-shield-alt"></i>
                      </span>
                    )}
                  </div>
                  <h3 style={{
                    fontSize: '26px',
                    fontWeight: 600,
                    color: '#222',
                    margin: '0 0 8px',
                    lineHeight: 1.2,
                    textAlign: 'center'
                  }}>
                    {profile.HostName || profile.BusinessName?.split(' ')[0] || 'Host'}
                  </h3>
                  {profile.IsSuperhost && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      color: '#717171'
                    }}>
                      <i className="fas fa-award" style={{ fontSize: '10px', color: 'var(--primary)' }}></i> Superhost
                    </span>
                  )}
                  
                  {/* Quick Info in Card */}
                  <div style={{ marginTop: '12px', textAlign: 'center' }}>
                    {profile.HostWork && (
                      <p style={{ fontSize: '12px', color: '#717171', margin: '4px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <i className="fas fa-briefcase" style={{ fontSize: '10px' }}></i>
                        {profile.HostWork}
                      </p>
                    )}
                    {profile.HostLanguages && (
                      <p style={{ fontSize: '12px', color: '#717171', margin: '4px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <i className="fas fa-globe" style={{ fontSize: '10px' }}></i>
                        {profile.HostLanguages}
                      </p>
                    )}
                    {profile.HostLocation && (
                      <p style={{ fontSize: '12px', color: '#717171', margin: '4px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <i className="fas fa-map-marker-alt" style={{ fontSize: '10px' }}></i>
                        {profile.HostLocation}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Right - Stats Column */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  paddingLeft: '24px',
                  borderLeft: '1px solid #ddd'
                }}>
                  <div style={{ padding: '8px 0' }}>
                    <span style={{ fontSize: '22px', fontWeight: 800, color: '#222', lineHeight: 1.2 }}>{reviews.length}</span>
                    <span style={{ display: 'block', fontSize: '11px', color: '#717171' }}>Reviews</span>
                  </div>
                  <div style={{ width: '100%', height: '1px', background: '#ddd', margin: '4px 0' }}></div>
                  <div style={{ padding: '8px 0' }}>
                    <span style={{ fontSize: '22px', fontWeight: 800, color: '#222', lineHeight: 1.2 }}>
                      {profile.AverageRating?.toFixed(1) || '5.0'}<i className="fas fa-star" style={{ fontSize: '12px', marginLeft: '2px' }}></i>
                    </span>
                    <span style={{ display: 'block', fontSize: '11px', color: '#717171' }}>Rating</span>
                  </div>
                  <div style={{ width: '100%', height: '1px', background: '#ddd', margin: '4px 0' }}></div>
                  <div style={{ padding: '8px 0' }}>
                    <span style={{ fontSize: '22px', fontWeight: 800, color: '#222', lineHeight: 1.2 }}>
                      {profile.YearsHosting || (profile.HostCreatedAt ? Math.max(1, Math.floor((new Date() - new Date(profile.HostCreatedAt)) / (1000 * 60 * 60 * 24 * 365))) : 1)}
                    </span>
                    <span style={{ display: 'block', fontSize: '11px', color: '#717171' }}>Years hosting</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right - About Section */}
            <div>
              <h3 style={{ fontSize: '22px', fontWeight: 500, color: '#222', margin: '0 0 16px' }}>
                About {profile.HostName || profile.BusinessName?.split(' ')[0] || 'Host'}
              </h3>
              
              {/* Quick Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                {profile.HostWork && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '16px', color: '#222' }}>
                    <i className="fas fa-briefcase" style={{ width: '24px', fontSize: '20px', color: '#717171', textAlign: 'center' }}></i>
                    My work: {profile.HostWork}
                  </div>
                )}
                {profile.HostLanguages && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '16px', color: '#222' }}>
                    <i className="fas fa-globe" style={{ width: '24px', fontSize: '20px', color: '#717171', textAlign: 'center' }}></i>
                    Speaks {profile.HostLanguages}
                  </div>
                )}
                {profile.HostLocation && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '16px', color: '#222' }}>
                    <i className="fas fa-map-marker-alt" style={{ width: '24px', fontSize: '20px', color: '#717171', textAlign: 'center' }}></i>
                    Lives in {profile.HostLocation}
                  </div>
                )}
              </div>
              
              {/* Bio */}
              {profile.HostBio && (
                <p style={{ fontSize: '16px', color: '#222', lineHeight: 1.6, margin: '0 0 24px' }}>
                  {profile.HostBio.length > 300 ? profile.HostBio.substring(0, 300) + '...' : profile.HostBio}
                </p>
              )}
              
              {/* Message Button */}
              <button 
                onClick={(e) => { e.stopPropagation(); handleMessageVendor(); }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '14px 24px',
                  border: '1px solid #222',
                  borderRadius: '8px',
                  background: 'white',
                  color: '#222',
                  fontWeight: 600,
                  fontSize: '16px',
                  cursor: 'pointer'
                }}
              >
                Message Host
              </button>
              
              {/* Safety Notice */}
              <div style={{ 
                marginTop: '24px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px'
              }}>
                <i className="fas fa-shield-alt" style={{ color: 'var(--primary)', fontSize: '16px', marginTop: '2px' }}></i>
                <p style={{ fontSize: '12px', color: '#717171', margin: 0, lineHeight: 1.5 }}>
                  To protect your payment, never transfer money or communicate outside of the PlanBeau website.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Recommendations Section */}
      {renderRecommendations()}
      </div>{/* End mobile-content-sheet */}
      </div>{/* End profile-container */}
      
      {/* Mobile Sticky Booking Bar - Giggster style with price + Message + Reserve */}
      <div className="sticky-booking-bar giggster-style">
        <div className="sticky-bar-price">
          <span className="price-amount">
            {profile?.HourlyRate || profile?.BasePrice 
              ? `from ${formatCurrency(profile?.HourlyRate || profile?.BasePrice, null, { showCents: false })}` 
              : 'Contact for pricing'}
          </span>
          {(profile?.HourlyRate || profile?.BasePrice) && (
            <span className="price-type">/hr</span>
          )}
        </div>
        <div className="sticky-bar-buttons">
          <button 
            className="message-btn-giggster" 
            onClick={handleMessageVendor}
          >
            Message
          </button>
          <button 
            className="reserve-btn-giggster" 
            onClick={handleRequestBooking}
          >
            Reserve
          </button>
        </div>
      </div>
      
      {/* Footer - Full Width */}
      <div style={{ width: '100vw', marginLeft: 'calc(-50vw + 50%)' }}>
        <Footer />
      </div>
      <MessagingWidget />

      {/* Album Viewer Modal - Unified photo viewer like "Show all photos" */}
      {albumViewerOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: '#fff',
            zIndex: 9998,
            overflowY: 'auto'
          }}
        >
          {/* Header */}
          <div style={{
            position: 'sticky',
            top: 0,
            background: '#fff',
            padding: '16px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #ebebeb',
            zIndex: 10
          }}>
            <button
              onClick={() => {
                setAlbumViewerOpen(false);
                setSelectedAlbum(null);
                setAlbumImages([]);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                color: '#222',
                padding: '8px 12px',
                borderRadius: '8px',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#f7f7f7'}
              onMouseOut={(e) => e.currentTarget.style.background = 'none'}
            >
              <i className="fas fa-arrow-left"></i>
              Back
            </button>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
              {selectedAlbum?.AlbumName || 'Album'}
            </h3>
            <div style={{ width: '80px' }}></div>
          </div>

          {/* Photo Grid */}
          <div style={{
            maxWidth: '800px',
            margin: '0 auto',
            padding: '24px'
          }}>
            {albumImagesLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: '#717171' }}></i>
                <p style={{ color: '#717171', marginTop: '1rem' }}>Loading photos...</p>
              </div>
            ) : albumImages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <i className="fas fa-images" style={{ fontSize: '3rem', color: '#d1d5db' }}></i>
                <p style={{ color: '#717171', marginTop: '1rem' }}>No photos in this album yet</p>
              </div>
            ) : (
              <>
                {/* First large image */}
                {albumImages[0] && (
                  <div
                    onClick={() => {
                      setLightboxImages(albumImages.map(img => ({ url: img.ImageURL || img.URL })));
                      setLightboxIndex(0);
                      setLightboxOpen(true);
                    }}
                    style={{
                      width: '100%',
                      aspectRatio: '16/10',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      marginBottom: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    <img
                      src={albumImages[0].ImageURL || albumImages[0].URL}
                      alt="Photo 1"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  </div>
                )}

                {/* Grid of remaining images - 2 columns */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '8px'
                }}>
                  {albumImages.slice(1).map((img, idx) => (
                    <div
                      key={idx + 1}
                      onClick={() => {
                        setLightboxImages(albumImages.map(i => ({ url: i.ImageURL || i.URL })));
                        setLightboxIndex(idx + 1);
                        setLightboxOpen(true);
                      }}
                      style={{
                        aspectRatio: '1/1',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        cursor: 'pointer'
                      }}
                    >
                      <img
                        src={img.ImageURL || img.URL}
                        alt={`Photo ${idx + 2}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          transition: 'transform 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Lightbox for album images */}
      {lightboxOpen && lightboxImages.length > 0 && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: '#000',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Top Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            color: 'white'
          }}>
            <button
              onClick={() => {
                setLightboxOpen(false);
                setLightboxImages([]);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                padding: '8px 12px',
                borderRadius: '8px'
              }}
            >
              <i className="fas fa-times"></i>
              Close
            </button>
            
            <div style={{ fontSize: '14px', fontWeight: 500 }}>
              {lightboxIndex + 1} / {lightboxImages.length}
            </div>

            <div style={{ width: '80px' }}></div>
          </div>

          {/* Main Image Area */}
          <div 
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              padding: '0 60px'
            }}
            onClick={() => {
              setLightboxOpen(false);
              setLightboxImages([]);
            }}
          >
            {/* Previous Button */}
            {lightboxImages.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length);
                }}
                style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: 'none',
                  color: '#222',
                  fontSize: '16px',
                  cursor: 'pointer',
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                }}
              >
                <i className="fas fa-chevron-left"></i>
              </button>
            )}

            {/* Image */}
            <img
              src={lightboxImages[lightboxIndex]?.url}
              alt={`Photo ${lightboxIndex + 1}`}
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '100%',
                maxHeight: 'calc(100vh - 120px)',
                objectFit: 'contain',
                borderRadius: '4px'
              }}
            />

            {/* Next Button */}
            {lightboxImages.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((prev) => (prev + 1) % lightboxImages.length);
                }}
                style={{
                  position: 'absolute',
                  right: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: 'none',
                  color: '#222',
                  fontSize: '16px',
                  cursor: 'pointer',
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                }}
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Package Detail Modal - Clean Airbnb Style */}
      {packageModalOpen && selectedPackage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.6)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
          onClick={() => { setPackageModalOpen(false); setSelectedPackage(null); }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: '12px',
              maxWidth: '480px',
              width: '100%',
              maxHeight: '85vh',
              overflow: 'hidden',
              position: 'relative',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
          >
            {/* Modal Header - Minimal */}
            <div style={{ 
              padding: '16px 20px', 
              borderBottom: '1px solid #ebebeb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#222' }}>
                {selectedPackage.PackageName}
              </h2>
              <button
                onClick={() => { setPackageModalOpen(false); setSelectedPackage(null); }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  color: '#717171',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>
            
            {/* Scrollable Content */}
            <div style={{ maxHeight: 'calc(85vh - 140px)', overflowY: 'auto' }}>
              {/* Modal Content */}
              <div style={{ padding: '20px' }}>
                {/* Pricing - Prominent */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                    {selectedPackage.SalePrice && parseFloat(selectedPackage.SalePrice) < parseFloat(selectedPackage.Price) ? (
                      <>
                        <span style={{ fontSize: '1.5rem', fontWeight: 600, color: '#222' }}>
                          {formatCurrency(parseFloat(selectedPackage.SalePrice), null, { showCents: false })}
                        </span>
                        <span style={{ fontSize: '1rem', color: '#717171', textDecoration: 'line-through' }}>
                          {formatCurrency(parseFloat(selectedPackage.Price), null, { showCents: false })}
                        </span>
                        <span style={{ color: '#e31c5f', fontSize: '0.875rem', fontWeight: 600 }}>SALE!</span>
                      </>
                    ) : (
                      <span style={{ fontSize: '1.5rem', fontWeight: 600, color: '#222' }}>
                        {formatCurrency(parseFloat(selectedPackage.Price), null, { showCents: false })}
                      </span>
                    )}
                    <span style={{ fontSize: '1rem', color: '#717171' }}>
                      / {selectedPackage.PriceType === 'per_person' ? 'person' : 'package'}
                    </span>
                  </div>
                </div>
                
                {/* Description */}
                {selectedPackage.Description && (
                  <div style={{ marginBottom: '20px' }}>
                    <p style={{ margin: 0, color: '#484848', fontSize: '0.95rem', lineHeight: 1.6 }}>{selectedPackage.Description}</p>
                  </div>
                )}
                
                {/* Included Services */}
                {selectedPackage.IncludedServices && selectedPackage.IncludedServices.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#222', margin: '0 0 12px 0' }}>What's included</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {selectedPackage.IncludedServices.map((svc, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ color: '#00a699', fontSize: '0.9rem' }}>✓</span>
                          <span style={{ color: '#484848', fontSize: '0.9rem' }}>{svc.name || svc.ServiceName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Fine Print */}
                {selectedPackage.FinePrint && (
                  <div style={{ marginBottom: '20px', padding: '12px', background: '#f7f7f7', borderRadius: '8px' }}>
                    <p style={{ margin: 0, color: '#717171', fontSize: '0.85rem', lineHeight: 1.5 }}>{selectedPackage.FinePrint}</p>
                  </div>
                )}
                
                {/* Gallery Images */}
                {(() => {
                  const mainImage = selectedPackage.ImageURL;
                  const rawGallery = selectedPackage.GalleryImages 
                    ? (typeof selectedPackage.GalleryImages === 'string' 
                        ? JSON.parse(selectedPackage.GalleryImages) 
                        : selectedPackage.GalleryImages)
                    : [];
                  const allImages = mainImage ? [mainImage, ...rawGallery] : rawGallery;
                  
                  return allImages.length > 0 ? (
                    <div style={{ marginBottom: '20px' }}>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#717171', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Gallery Images <span style={{ fontWeight: 400, textTransform: 'none' }}>(Click to view)</span>
                      </h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {allImages.map((img, idx) => (
                          <div 
                            key={idx}
                            onClick={() => {
                              setLightboxImages(allImages.map(url => ({ url })));
                              setLightboxIndex(idx);
                              setLightboxOpen(true);
                            }}
                            style={{ 
                              width: '70px', 
                              height: '70px', 
                              borderRadius: '8px', 
                              overflow: 'hidden',
                              border: '1px solid #ddd',
                              cursor: 'pointer'
                            }}
                          >
                            <img 
                              src={img} 
                              alt={`Gallery ${idx + 1}`}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            </div>
            
            {/* Fixed Footer with Button */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid #ebebeb', background: '#fff' }}>
              
              {/* Book Now Button */}
              <button
                onClick={() => {
                  setPackageModalOpen(false);
                  const pkgId = selectedPackage.PackageID;
                  setSelectedPackage(null);
                  navigate(`/booking/${encodeVendorId(vendorId)}?packageId=${pkgId}`);
                }}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  background: '#222',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {t('bookings.requestToBook', 'Request Booking')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Service Detail Modal - Clean Airbnb Style */}
      {serviceModalOpen && selectedService && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
          onClick={() => { setServiceModalOpen(false); setSelectedService(null); }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '500px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #ebebeb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#222' }}>
                {selectedService.Name || selectedService.ServiceName || selectedService.name}
              </h2>
              <button
                onClick={() => { setServiceModalOpen(false); setSelectedService(null); }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#717171',
                  padding: '4px'
                }}
              >
                ×
              </button>
            </div>
            
            {/* Scrollable Content */}
            <div style={{ maxHeight: 'calc(85vh - 140px)', overflowY: 'auto' }}>
              <div style={{ padding: '20px' }}>
                {/* Pricing - Prominent */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                    {(() => {
                      const pricingModel = selectedService.PricingModel || selectedService.pricingModel;
                      const salePrice = selectedService.SalePrice || selectedService.salePrice;
                      let price = 0;
                      let suffix = '';
                      
                      if (pricingModel === 'time_based') {
                        price = parseFloat(selectedService.BaseRate || selectedService.baseRate || 0);
                        suffix = '/ hour';
                      } else if (pricingModel === 'per_attendee') {
                        price = parseFloat(selectedService.PricePerPerson || selectedService.pricePerPerson || 0);
                        suffix = '/ person';
                      } else {
                        price = parseFloat(selectedService.FixedPrice || selectedService.fixedPrice || selectedService.Price || 0);
                        suffix = 'fixed price';
                      }
                      
                      const isOnSale = salePrice && parseFloat(salePrice) < price && pricingModel !== 'time_based';
                      
                      return isOnSale ? (
                        <>
                          <span style={{ fontSize: '1.5rem', fontWeight: 600, color: '#222' }}>
                            {formatCurrency(parseFloat(salePrice), null, { showCents: false })}
                          </span>
                          <span style={{ fontSize: '1rem', color: '#717171', textDecoration: 'line-through' }}>
                            {formatCurrency(price, null, { showCents: false })}
                          </span>
                          <span style={{ color: '#e31c5f', fontSize: '0.875rem', fontWeight: 600 }}>SALE!</span>
                          <span style={{ fontSize: '1rem', color: '#717171' }}>{suffix}</span>
                        </>
                      ) : (
                        <>
                          <span style={{ fontSize: '1.5rem', fontWeight: 600, color: '#222' }}>
                            {formatCurrency(price, null, { showCents: false })}
                          </span>
                          <span style={{ fontSize: '1rem', color: '#717171' }}>{suffix}</span>
                        </>
                      );
                    })()}
                  </div>
                </div>
                
                {/* Duration */}
                {(selectedService.BaseDurationMinutes || selectedService.baseDurationMinutes) && (
                  <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="far fa-clock" style={{ color: '#717171' }}></i>
                    <span style={{ color: '#484848', fontSize: '0.95rem' }}>
                      {(() => {
                        const mins = parseInt(selectedService.BaseDurationMinutes || selectedService.baseDurationMinutes);
                        if (mins >= 60) {
                          const hours = Math.floor(mins / 60);
                          const remainingMins = mins % 60;
                          return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours} hour${hours > 1 ? 's' : ''}`;
                        }
                        return `${mins} min`;
                      })()}
                    </span>
                  </div>
                )}
                
                {/* Attendee Range for per_attendee */}
                {(selectedService.PricingModel === 'per_attendee' || selectedService.pricingModel === 'per_attendee') && 
                 (selectedService.MinimumAttendees || selectedService.MaximumAttendees) && (
                  <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fas fa-users" style={{ color: '#717171' }}></i>
                    <span style={{ color: '#484848', fontSize: '0.95rem' }}>
                      {selectedService.MinimumAttendees && selectedService.MaximumAttendees 
                        ? `${selectedService.MinimumAttendees}-${selectedService.MaximumAttendees} guests`
                        : selectedService.MinimumAttendees 
                          ? `Min ${selectedService.MinimumAttendees} guests`
                          : `Max ${selectedService.MaximumAttendees} guests`
                      }
                    </span>
                  </div>
                )}
                
                {/* Description */}
                {(selectedService.Description || selectedService.description) && (
                  <div style={{ marginBottom: '20px' }}>
                    <p style={{ margin: 0, color: '#484848', fontSize: '0.95rem', lineHeight: 1.6 }}>
                      {selectedService.Description || selectedService.description}
                    </p>
                  </div>
                )}
                
                {/* Gallery Images */}
                {(() => {
                  const mainImage = selectedService.ImageURL || selectedService.imageURL;
                  const rawGallery = selectedService.GalleryImages || selectedService.galleryImages;
                  const galleryImages = rawGallery
                    ? (typeof rawGallery === 'string' ? JSON.parse(rawGallery) : rawGallery)
                    : [];
                  const allImages = mainImage ? [mainImage, ...galleryImages] : galleryImages;
                  
                  return allImages.length > 0 ? (
                    <div style={{ marginBottom: '20px' }}>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#717171', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Gallery Images <span style={{ fontWeight: 400, textTransform: 'none' }}>(Click to view)</span>
                      </h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {allImages.map((img, idx) => (
                          <div 
                            key={idx}
                            onClick={() => {
                              setLightboxImages(allImages.map(url => ({ url })));
                              setLightboxIndex(idx);
                              setLightboxOpen(true);
                            }}
                            style={{ 
                              width: '70px', 
                              height: '70px', 
                              borderRadius: '8px', 
                              overflow: 'hidden',
                              border: '1px solid #ddd',
                              cursor: 'pointer'
                            }}
                          >
                            <img 
                              src={img} 
                              alt={`Gallery ${idx + 1}`}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            </div>
            
            {/* Fixed Footer with Button */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid #ebebeb', background: '#fff' }}>
              <button
                onClick={() => {
                  setServiceModalOpen(false);
                  const svcId = selectedService.ServiceID || selectedService.VendorServiceID || selectedService.VendorSelectedServiceID || selectedService.serviceId || selectedService.id;
                  setSelectedService(null);
                  if (svcId) {
                    navigate(`/booking/${encodeVendorId(vendorId)}?serviceId=${svcId}`);
                  } else {
                    navigate(`/booking/${encodeVendorId(vendorId)}`);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  background: '#222',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Request Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Description Modal */}
      {descriptionModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9998,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
          onClick={() => setDescriptionModalOpen(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              position: 'sticky',
              top: 0,
              background: 'white',
              padding: '1rem 1.5rem',
              borderBottom: '1px solid #ebebeb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>About this vendor</h3>
              <button
                onClick={() => setDescriptionModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1.25rem',
                  color: '#717171',
                  padding: '0.5rem'
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            {/* Modal Content */}
            <div style={{ padding: '1.5rem' }}>
              <p style={{ 
                margin: 0, 
                lineHeight: 1.7, 
                color: '#222',
                whiteSpace: 'pre-wrap'
              }}>
                {vendor?.profile?.BusinessDescription || 'Welcome to our business! We provide exceptional event services tailored to your needs.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Report Listing Modal */}
      {showReportModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            maxWidth: '480px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #ebebeb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Report this listing</h3>
              <button
                onClick={() => { setShowReportModal(false); setReportForm({ reason: '', details: '' }); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#717171' }}
              >
                ×
              </button>
            </div>
            
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px', color: '#222' }}>
                  Why are you reporting this listing?
                </label>
                <select
                  value={reportForm.reason}
                  onChange={(e) => setReportForm({ ...reportForm, reason: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: 'white'
                  }}
                >
                  <option value="">Select a reason</option>
                  <option value="inaccurate">Inaccurate or misleading information</option>
                  <option value="inappropriate">Inappropriate content</option>
                  <option value="scam">Suspected scam or fraud</option>
                  <option value="duplicate">Duplicate listing</option>
                  <option value="closed">Business is closed</option>
                  <option value="offensive">Offensive content</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px', color: '#222' }}>
                  Additional details (optional)
                </label>
                <textarea
                  value={reportForm.details}
                  onChange={(e) => setReportForm({ ...reportForm, details: e.target.value })}
                  placeholder="Please provide any additional information..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              
              <button
                onClick={async () => {
                  if (!reportForm.reason) {
                    showBanner('Please select a reason for reporting', 'error');
                    return;
                  }
                  setReportSubmitting(true);
                  try {
                    const response = await apiPost('/vendors/report', {
                      vendorProfileId: vendorId,
                      reason: reportForm.reason,
                      details: reportForm.details,
                      reportedBy: currentUser?.id || null
                    });
                    if (response.ok) {
                      showBanner('Thank you for your report. We will review it shortly.', 'success');
                      setShowReportModal(false);
                      setReportForm({ reason: '', details: '' });
                    } else {
                      showBanner('Failed to submit report. Please try again.', 'error');
                    }
                  } catch (error) {
                    showBanner('Failed to submit report. Please try again.', 'error');
                  } finally {
                    setReportSubmitting(false);
                  }
                }}
                disabled={reportSubmitting || !reportForm.reason}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: reportSubmitting || !reportForm.reason ? '#ccc' : '#222',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: reportSubmitting || !reportForm.reason ? 'not-allowed' : 'pointer'
                }}
              >
                {reportSubmitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      <MobileBottomNav 
        onOpenDashboard={(section) => {
          if (section) {
            const sectionMap = {
              'messages': currentUser?.isVendor ? 'vendor-messages' : 'messages',
              'dashboard': 'dashboard'
            };
            const targetSection = sectionMap[section] || section;
            navigate(`/dashboard?section=${targetSection}`);
          } else {
            navigate('/dashboard');
          }
        }}
        onCloseDashboard={() => {}}
        onOpenProfile={() => setProfileModalOpen(true)}
        onOpenMap={handleOpenMap}
        onOpenMessages={() => {
          window.dispatchEvent(new CustomEvent('openMessagingWidget', { detail: {} }));
        }}
      />
    </PageLayout>
  );
}

export default VendorProfilePage;
