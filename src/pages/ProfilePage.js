import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import { getUnifiedNotificationIcon } from '../components/common/AppIcons';
import { PageLayout } from '../components/PageWrapper';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProfileModal from '../components/ProfileModal';
import VendorCard from '../components/VendorCard';
import { showBanner } from '../utils/helpers';
import { useUserOnlineStatus } from '../hooks/useOnlineStatus';
import { decodeUserId, isPublicId } from '../utils/hashIds';
import { getProfileLocation } from '../utils/locationUtils';
import './ProfilePage.css';

function ProfilePage() {
  const { userId: rawUserId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // Decode the user ID from URL (supports both encoded and numeric IDs)
  const userId = useMemo(() => {
    if (!rawUserId) return null;
    if (isPublicId(rawUserId)) {
      return decodeUserId(rawUserId);
    }
    const parsed = parseInt(rawUserId, 10);
    return isNaN(parsed) ? null : parsed;
  }, [rawUserId]);

  const [host, setHost] = useState(null);
  const [enhancedProfile, setEnhancedProfile] = useState(null);
  const [listings, setListings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [currentReviewPage, setCurrentReviewPage] = useState(1);
  const [isUserProfile, setIsUserProfile] = useState(false);
  const [showAllAbout, setShowAllAbout] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showAllActivities, setShowAllActivities] = useState(false);
  const activitiesLimit = 5; // Show 5 activities initially
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportForm, setReportForm] = useState({ reason: '', details: '' });
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [activities, setActivities] = useState([]);
  const [activitySummary, setActivitySummary] = useState(null);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const reviewsPerPage = 5;

  // Get online status for this user
  const { statuses: onlineStatuses } = useUserOnlineStatus(
    userId ? [userId] : [],
    { enabled: !!userId, refreshInterval: 60000 } // 1 minute refresh
  );
  const userOnlineStatus = userId ? onlineStatuses[userId] : null;

  // Load host profile data - fetches USER data, not vendor data
  const loadHostProfile = useCallback(async () => {
    try {
      setLoading(true);
      
      // First try to load user profile directly
      const profileResp = await fetch(`${API_BASE_URL}/users/${userId}/profile`);
      
      if (profileResp.ok) {
        // User profile found - show client/user info
        const profileData = await profileResp.json();
        const userProfile = profileData.profile;
        
        // Try to get user profile data from UserProfiles table
        let enhancedData = null;
        try {
          const userProfileResp = await fetch(`${API_BASE_URL}/users/${userId}/user-profile`);
          if (userProfileResp.ok) {
            const userProfileJson = await userProfileResp.json();
            enhancedData = {
              ...userProfileJson.profile,
              Interests: userProfileJson.interests || [],
              MemberSince: userProfileJson.user?.JoinYear
            };
          }
        } catch (e) {
          console.warn('User profile not available:', e.message);
        }
        
        // Load reviews given by this user
        const reviewsResp = await fetch(`${API_BASE_URL}/users/${userId}/reviews`);
        const reviewsData = reviewsResp.ok ? await reviewsResp.json() : [];
        
        // Load bookings to get associated vendors (for clients)
        const bookingsResp = await fetch(`${API_BASE_URL}/users/${userId}/bookings/all`);
        const bookingsData = bookingsResp.ok ? await bookingsResp.json() : [];
        
        // Check if user has a vendor profile to get response metrics
        let vendorResponseRating = null;
        let vendorResponseTime = null;
        let vendorListings = [];
        let vendorReviews = [];
        
        if (userProfile?.VendorProfileID) {
          // User is a vendor - fetch their vendor data for response metrics
          try {
            const vendorResp = await fetch(`${API_BASE_URL}/vendors/${userProfile.VendorProfileID}`);
            if (vendorResp.ok) {
              const vendorData = await vendorResp.json();
              const vp = vendorData.data?.profile;
              vendorResponseRating = vp?.ResponseRating;
              vendorResponseTime = vp?.ResponseTime;
              vendorReviews = vendorData.data?.reviews || [];
              
              // Add their vendor as a listing
              vendorListings.push({
                id: userProfile.VendorProfileID,
                businessName: vp?.BusinessName,
                featuredImage: vendorData.data?.images?.[0]?.ImageURL || vp?.LogoURL,
                city: vp?.City,
                state: vp?.State,
                category: vendorData.data?.categories?.[0]?.Category,
                rating: vp?.AverageRating || 5.0,
                reviewCount: vp?.ReviewCount || 0
              });
            }
          } catch (vendorErr) {
            console.warn('Could not fetch vendor data:', vendorErr.message);
          }
        }
        
        // Only show vendor listings the user OWNS (not booked vendors)
        const allListings = [...vendorListings];
        
        // Use vendor reviews if user is a vendor, otherwise use reviews they gave
        const displayReviews = vendorReviews.length > 0 ? vendorReviews : (Array.isArray(reviewsData) ? reviewsData : []);
        
        const hostInfo = {
          id: userId,
          name: userProfile?.Name || userProfile?.DisplayName || 'User',
          profileImage: userProfile?.ProfileImageURL || userProfile?.Avatar,
          bio: userProfile?.Bio || '',
          memberSince: userProfile?.CreatedAt || userProfile?.JoinDate,
          responseRating: vendorResponseRating || null,
          responseTime: vendorResponseTime || null,
          reviewCount: displayReviews.length,
          isVerified: userProfile?.IsVerified || false,
          isEmailConfirmed: userProfile?.IsEmailConfirmed || userProfile?.EmailVerified || false,
          isPhoneConfirmed: userProfile?.IsPhoneConfirmed || !!userProfile?.Phone,
          isSuperhost: false,
          isVendor: !!userProfile?.VendorProfileID
        };
        
        setHost(hostInfo);
        setEnhancedProfile(enhancedData);
        setReviews(displayReviews);
        setListings(allListings);
        setIsUserProfile(true);
        
        document.title = `${hostInfo.name} - Profile | Planbeau`;
      } else {
        // Fallback: Try loading as vendor profile (for backwards compatibility)
        const response = await fetch(`${API_BASE_URL}/vendors/${userId}`);
        if (!response.ok) {
          throw new Error('Failed to load profile');
        }

        const data = await response.json();
        const vendorData = data.data;
        
        // Extract host info from vendor profile
        const hostInfo = {
          id: userId,
          name: vendorData.profile?.HostName || vendorData.profile?.ContactName || vendorData.profile?.BusinessName?.split(' ')[0] || 'Host',
          profileImage: vendorData.profile?.HostProfileImage || vendorData.profile?.LogoURL || vendorData.profile?.FeaturedImageURL,
          bio: vendorData.profile?.HostBio || vendorData.profile?.BusinessDescription || '',
          memberSince: vendorData.profile?.HostMemberSince || vendorData.profile?.CreatedAt || vendorData.profile?.JoinDate,
          responseRating: vendorData.profile?.ResponseRating || null,
          responseTime: vendorData.profile?.ResponseTime || null,
          reviewCount: vendorData.reviews?.length || 0,
          isVerified: vendorData.profile?.IsVerified || false,
          isEmailConfirmed: true,
          isPhoneConfirmed: vendorData.profile?.Phone ? true : false,
          isSuperhost: vendorData.profile?.IsSuperhost || false
        };
        
        setHost(hostInfo);
        setReviews(vendorData.reviews || []);
        setListings([{
          id: userId,
          businessName: vendorData.profile?.BusinessName,
          featuredImage: vendorData.images?.[0]?.url || vendorData.images?.[0]?.URL || vendorData.profile?.FeaturedImageURL,
          city: vendorData.profile?.City,
          state: vendorData.profile?.State,
          rating: 5.0,
          reviewCount: vendorData.reviews?.length || 0,
          category: vendorData.profile?.PrimaryCategory || vendorData.profile?.CategoryName
        }]);
        setIsUserProfile(false);

        document.title = `${hostInfo.name} - Host Profile | Planbeau`;
      }
    } catch (error) {
      console.error('Error loading host profile:', error);
      showBanner('Failed to load profile', 'error');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadHostProfile();
  }, [loadHostProfile]);

  // Load user activities
  const loadActivities = useCallback(async () => {
    if (!userId) return;
    try {
      setActivitiesLoading(true);
      const [activitiesResp, summaryResp] = await Promise.all([
        fetch(`${API_BASE_URL}/users/${userId}/activities?limit=50`),
        fetch(`${API_BASE_URL}/users/${userId}/activity-summary`)
      ]);
      
      if (activitiesResp.ok) {
        const data = await activitiesResp.json();
        setActivities(data.activities || []);
      }
      
      if (summaryResp.ok) {
        const data = await summaryResp.json();
        setActivitySummary(data.summary || null);
      }
    } catch (err) {
      console.error('Error loading activities:', err);
    } finally {
      setActivitiesLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  // Pagination for reviews
  const totalPages = Math.ceil(reviews.length / reviewsPerPage);
  const paginatedReviews = reviews.slice(
    (currentReviewPage - 1) * reviewsPerPage,
    currentReviewPage * reviewsPerPage
  );

  if (loading) {
    return (
      <>
        <Header onSearch={() => {}} onProfileClick={() => setProfileModalOpen(true)} />
        <div className="host-profile-page">
          <div className="host-profile-container">
            {/* Hero Section Skeleton */}
            <div className="host-hero-section">
              {/* Profile Card Skeleton - matches actual card layout */}
              <div>
                <div className="host-profile-card" style={{ background: '#fff' }}>
                  <div className="host-card-left" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div className="skeleton" style={{ width: '110px', height: '110px', borderRadius: '50%', marginBottom: '16px' }}></div>
                    <div className="skeleton" style={{ width: '120px', height: '24px', marginBottom: '8px', borderRadius: '6px' }}></div>
                  </div>
                  <div className="host-card-right" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="skeleton" style={{ width: '40px', height: '32px', borderRadius: '4px' }}></div>
                      <div className="skeleton" style={{ width: '60px', height: '16px', borderRadius: '4px' }}></div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="skeleton" style={{ width: '40px', height: '32px', borderRadius: '4px' }}></div>
                      <div className="skeleton" style={{ width: '50px', height: '16px', borderRadius: '4px' }}></div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="skeleton" style={{ width: '30px', height: '32px', borderRadius: '4px' }}></div>
                      <div className="skeleton" style={{ width: '80px', height: '16px', borderRadius: '4px' }}></div>
                    </div>
                  </div>
                </div>
              </div>
              {/* About Section Skeleton */}
              <div className="host-about-section" style={{ flex: 1 }}>
                <div className="skeleton" style={{ width: '160px', height: '28px', marginBottom: '16px', borderRadius: '6px' }}></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="skeleton" style={{ width: '20px', height: '20px', borderRadius: '4px' }}></div>
                    <div className="skeleton" style={{ width: '140px', height: '16px', borderRadius: '4px' }}></div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="skeleton" style={{ width: '20px', height: '20px', borderRadius: '4px' }}></div>
                    <div className="skeleton" style={{ width: '100px', height: '16px', borderRadius: '4px' }}></div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="skeleton" style={{ width: '20px', height: '20px', borderRadius: '4px' }}></div>
                    <div className="skeleton" style={{ width: '120px', height: '16px', borderRadius: '4px' }}></div>
                  </div>
                </div>
                <div className="skeleton" style={{ width: '100%', height: '80px', borderRadius: '8px' }}></div>
              </div>
            </div>
            {/* Tab Navigation Skeleton */}
            <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid #ebebeb', marginBottom: '2rem', paddingBottom: '16px' }}>
              <div className="skeleton" style={{ width: '80px', height: '20px', borderRadius: '4px' }}></div>
              <div className="skeleton" style={{ width: '100px', height: '20px', borderRadius: '4px' }}></div>
              <div className="skeleton" style={{ width: '70px', height: '20px', borderRadius: '4px' }}></div>
            </div>
            {/* Content Skeleton */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="skeleton" style={{ width: '100%', height: '100px', borderRadius: '12px' }}></div>
              <div className="skeleton" style={{ width: '100%', height: '100px', borderRadius: '12px' }}></div>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (!host) {
    return (
      <>
        <Header onSearch={() => {}} onProfileClick={() => setProfileModalOpen(true)} />
        <div className="host-profile-page">
          <div className="host-profile-container">
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <h2>Host not found</h2>
              <button className="btn btn-primary" onClick={() => navigate('/')}>
                Back to Home
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // Calculate years hosting
  const getYearsHosting = () => {
    if (!host.memberSince) return null;
    const date = new Date(host.memberSince);
    if (isNaN(date.getTime())) return null;
    const years = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24 * 365));
    return years > 0 ? years : null;
  };

  const yearsHosting = getYearsHosting();

  // Get average rating
  const getAverageRating = () => {
    if (reviews.length === 0) return null;
    const sum = reviews.reduce((acc, r) => acc + (r.Rating || 5), 0);
    return (sum / reviews.length).toFixed(1);
  };

  const avgRating = getAverageRating();

  // Format member since date
  const formatMemberSince = () => {
    if (!host.memberSince) return null;
    const date = new Date(host.memberSince);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Get first name
  const firstName = host.name?.split(' ')[0] || 'User';

  // Check if there are any "about" details to show
  const hasAboutDetails = enhancedProfile && (
    enhancedProfile.Occupation || enhancedProfile.LifeMotto || enhancedProfile.FurryFriends ||
    enhancedProfile.Education || enhancedProfile.FreeTimeActivity || enhancedProfile.Languages ||
    enhancedProfile.Generation || enhancedProfile.CurrentPassion || enhancedProfile.InterestingTidbit ||
    enhancedProfile.HiddenTalent
  );

  return (
    <PageLayout variant="fullWidth" pageClassName="host-profile-page-layout">
      <Header 
        onSearch={() => {}} 
        onProfileClick={() => {
          if (currentUser) {
            navigate('/client/bookings');
          } else {
            setProfileModalOpen(true);
          }
        }}
      />
      <ProfileModal isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} />
      
      <div className="host-profile-page">
        <div className="host-profile-container">
          
          {/* Edit Profile Button - Top of page for own profile */}
          {currentUser && (String(currentUser.id) === String(userId) || String(currentUser.userId) === String(userId)) && (
            <div style={{ marginBottom: '24px' }}>
              <button
                onClick={() => navigate('/client/settings/profile')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  background: '#fff',
                  color: '#222',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.08)'
                }}
                onMouseEnter={(e) => { e.target.style.background = '#f7f7f7'; e.target.style.borderColor = '#222'; }}
                onMouseLeave={(e) => { e.target.style.background = '#fff'; e.target.style.borderColor = '#ddd'; }}
              >
                <i className="fas fa-pen"></i>
                Edit profile
              </button>
            </div>
          )}
          
          {/* Hero Section - Airbnb Style */}
          <div className="host-hero-section">
            
            {/* Left Column - Card + Report */}
            <div>
              {/* Profile Card - Horizontal Layout */}
              <div className="host-profile-card card-animate-in">
                <div className="host-card-left">
                  <div className="host-card-avatar">
                    <img 
                      src={host.profileImage || 'https://res.cloudinary.com/dxgy4apj5/image/upload/v1755105530/image_placeholder.png'}
                      alt={host.name}
                      onError={(e) => { e.target.src = 'https://res.cloudinary.com/dxgy4apj5/image/upload/v1755105530/image_placeholder.png'; }}
                    />
                    {host.isVerified && (
                      <span className="host-verified-badge">
                        <i className="fas fa-shield-alt"></i>
                      </span>
                    )}
                  </div>
                  <h1 className="host-card-name">{host.name}</h1>
                  {host.isSuperhost && (
                    <span className="host-superhost-badge">
                      <i className="fas fa-award"></i> Superhost
                    </span>
                  )}
                </div>
                
                <div className="host-card-right">
                  <div className="host-card-stat">
                    <span className="host-card-stat-value">{reviews.length}</span>
                    <span className="host-card-stat-label">Reviews</span>
                  </div>
                  <div className="host-card-stat-divider"></div>
                  <div className="host-card-stat">
                    <span className="host-card-stat-value">{avgRating || '5.0'}<i className="fas fa-star"></i></span>
                    <span className="host-card-stat-label">Rating</span>
                  </div>
                  <div className="host-card-stat-divider"></div>
                  <div className="host-card-stat">
                    <span className="host-card-stat-value">{yearsHosting || 1}</span>
                    <span className="host-card-stat-label">{yearsHosting === 1 ? 'Year hosting' : 'Years hosting'}</span>
                  </div>
                </div>
              </div>
              
              {/* Report Link - Outside the card */}
              <button
                onClick={() => setShowReportModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '1rem',
                  background: 'none',
                  border: 'none',
                  color: '#717171',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0,
                  justifyContent: 'center',
                  width: '100%'
                }}
              >
                <i className="fas fa-flag" style={{ fontSize: '0.75rem' }}></i>
                Report
              </button>
            </div>

            {/* Right - About Section */}
            <div className="host-about-section">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <h2 className="host-about-title" style={{ marginBottom: 0 }}>About {firstName}</h2>
                {/* Online Status Indicator */}
                {userOnlineStatus && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    background: userOnlineStatus.isOnline ? '#f0fdf4' : '#f9fafb',
                    border: userOnlineStatus.isOnline ? '1px solid #bbf7d0' : '1px solid #e5e7eb'
                  }}>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: userOnlineStatus.isOnline ? '#22c55e' : '#9ca3af',
                      boxShadow: userOnlineStatus.isOnline ? '0 0 0 2px rgba(34, 197, 94, 0.2)' : 'none'
                    }} />
                    <span style={{ 
                      fontSize: '0.8rem',
                      color: userOnlineStatus.isOnline ? '#166534' : '#6b7280',
                      fontWeight: 500
                    }}>
                      {userOnlineStatus.isOnline ? 'Online now' : (userOnlineStatus.lastActiveText || 'Offline')}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Quick Info */}
              <div className="host-quick-info">
                {(enhancedProfile?.Work || enhancedProfile?.BiographyTitle) && (
                  <div className="host-quick-item">
                    <i className="fas fa-briefcase"></i>
                    <span>My work: {enhancedProfile?.Work || enhancedProfile?.BiographyTitle}</span>
                  </div>
                )}
                {enhancedProfile?.Languages && (
                  <div className="host-quick-item">
                    <i className="fas fa-globe"></i>
                    <span>Speaks {enhancedProfile.Languages}</span>
                  </div>
                )}
                {(enhancedProfile?.City || enhancedProfile?.State) && (
                  <div className="host-quick-item">
                    <i className="fas fa-map-marker-alt"></i>
                    <span>Lives in {getProfileLocation(enhancedProfile)}</span>
                  </div>
                )}
                {host.isVerified && (
                  <div className="host-quick-item verified">
                    <i className="fas fa-check-circle"></i>
                    <span>Identity verified</span>
                  </div>
                )}
              </div>
              
              {/* Bio */}
              {(host.bio || enhancedProfile?.Bio) && (
                <p className="host-bio">{host.bio || enhancedProfile?.Bio}</p>
              )}
            </div>
          </div>

          {/* Main Content - Single Scrollable Page */}
          <div className="host-content">
            
            {/* About Section - Profile Details */}
            {(enhancedProfile?.Occupation || enhancedProfile?.Education || enhancedProfile?.Languages || 
              enhancedProfile?.Generation || enhancedProfile?.DreamDestination || enhancedProfile?.FurryFriends ||
              enhancedProfile?.HiddenTalent || enhancedProfile?.FreeTimeActivity || enhancedProfile?.InterestingTidbit ||
              enhancedProfile?.LifeMotto || enhancedProfile?.CurrentPassion) && (
              <section style={{ marginBottom: '3rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem', color: '#111827' }}>
                  {firstName}'s profile
                </h2>
                
                {/* Two Column Grid of Profile Fields */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0', borderTop: '1px solid #e5e7eb' }}>
                  {enhancedProfile?.Occupation && (
                    <div style={{ padding: '1rem 0', borderBottom: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', paddingRight: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <i className="fas fa-briefcase" style={{ color: '#6b7280', width: '20px', fontSize: '0.9rem' }}></i>
                      <span style={{ color: '#111827', fontSize: '0.95rem' }}>My work: {enhancedProfile.Occupation}</span>
                    </div>
                  )}
                  {enhancedProfile?.DreamDestination && (
                    <div style={{ padding: '1rem 0', borderBottom: '1px solid #e5e7eb', paddingLeft: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <i className="fas fa-plane" style={{ color: '#6b7280', width: '20px', fontSize: '0.9rem' }}></i>
                      <span style={{ color: '#111827', fontSize: '0.95rem' }}>Dream destination: {enhancedProfile.DreamDestination}</span>
                    </div>
                  )}
                  {enhancedProfile?.FurryFriends && (
                    <div style={{ padding: '1rem 0', borderBottom: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', paddingRight: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <i className="fas fa-paw" style={{ color: '#6b7280', width: '20px', fontSize: '0.9rem' }}></i>
                      <span style={{ color: '#111827', fontSize: '0.95rem' }}>Pets: {enhancedProfile.FurryFriends}</span>
                    </div>
                  )}
                  {enhancedProfile?.Education && (
                    <div style={{ padding: '1rem 0', borderBottom: '1px solid #e5e7eb', paddingLeft: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <i className="fas fa-graduation-cap" style={{ color: '#6b7280', width: '20px', fontSize: '0.9rem' }}></i>
                      <span style={{ color: '#111827', fontSize: '0.95rem' }}>Where I went to school: {enhancedProfile.Education}</span>
                    </div>
                  )}
                  {enhancedProfile?.FreeTimeActivity && (
                    <div style={{ padding: '1rem 0', borderBottom: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', paddingRight: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <i className="fas fa-clock" style={{ color: '#6b7280', width: '20px', fontSize: '0.9rem' }}></i>
                      <span style={{ color: '#111827', fontSize: '0.95rem' }}>My hobbies: {enhancedProfile.FreeTimeActivity}</span>
                    </div>
                  )}
                  {enhancedProfile?.HiddenTalent && (
                    <div style={{ padding: '1rem 0', borderBottom: '1px solid #e5e7eb', paddingLeft: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <i className="fas fa-magic" style={{ color: '#6b7280', width: '20px', fontSize: '0.9rem' }}></i>
                      <span style={{ color: '#111827', fontSize: '0.95rem' }}>My most useless skill: {enhancedProfile.HiddenTalent}</span>
                    </div>
                  )}
                  {enhancedProfile?.InterestingTidbit && (
                    <div style={{ padding: '1rem 0', borderBottom: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', paddingRight: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <i className="fas fa-lightbulb" style={{ color: '#6b7280', width: '20px', fontSize: '0.9rem' }}></i>
                      <span style={{ color: '#111827', fontSize: '0.95rem' }}>My fun fact: {enhancedProfile.InterestingTidbit}</span>
                    </div>
                  )}
                  {enhancedProfile?.CurrentPassion && (
                    <div style={{ padding: '1rem 0', borderBottom: '1px solid #e5e7eb', paddingLeft: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <i className="fas fa-heart" style={{ color: '#6b7280', width: '20px', fontSize: '0.9rem' }}></i>
                      <span style={{ color: '#111827', fontSize: '0.95rem' }}>My obsession: {enhancedProfile.CurrentPassion}</span>
                    </div>
                  )}
                  {enhancedProfile?.LifeMotto && (
                    <div style={{ padding: '1rem 0', borderBottom: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', paddingRight: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <i className="fas fa-book" style={{ color: '#6b7280', width: '20px', fontSize: '0.9rem' }}></i>
                      <span style={{ color: '#111827', fontSize: '0.95rem' }}>My biography title would be: {enhancedProfile.LifeMotto}</span>
                    </div>
                  )}
                  {enhancedProfile?.Generation && (
                    <div style={{ padding: '1rem 0', borderBottom: '1px solid #e5e7eb', paddingLeft: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <i className="fas fa-birthday-cake" style={{ color: '#6b7280', width: '20px', fontSize: '0.9rem' }}></i>
                      <span style={{ color: '#111827', fontSize: '0.95rem' }}>Decade I was born: {enhancedProfile.Generation}</span>
                    </div>
                  )}
                  {enhancedProfile?.Languages && (
                    <div style={{ padding: '1rem 0', borderBottom: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', paddingRight: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <i className="fas fa-language" style={{ color: '#6b7280', width: '20px', fontSize: '0.9rem' }}></i>
                      <span style={{ color: '#111827', fontSize: '0.95rem' }}>Languages I speak: {enhancedProfile.Languages}</span>
                    </div>
                  )}
                  {(enhancedProfile?.City || enhancedProfile?.State) && (
                    <div style={{ padding: '1rem 0', borderBottom: '1px solid #e5e7eb', paddingLeft: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <i className="fas fa-map-marker-alt" style={{ color: '#6b7280', width: '20px', fontSize: '0.9rem' }}></i>
                      <span style={{ color: '#111827', fontSize: '0.95rem' }}>Where I live: {getProfileLocation(enhancedProfile)}</span>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Interests Section */}
            {enhancedProfile?.Interests && enhancedProfile.Interests.length > 0 && (
              <section style={{ marginBottom: '3rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem', color: '#111827' }}>
                  What {firstName}'s into
                </h2>
                <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1rem' }}>
                  Find common ground with {firstName} by exploring their interests.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {enhancedProfile.Interests.map((interest, i) => (
                    <span 
                      key={i} 
                      style={{
                        padding: '0.5rem 1rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '20px',
                        backgroundColor: 'white',
                        color: '#111827',
                        fontSize: '0.9rem'
                      }}
                    >
                      {interest.Interest || interest}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Listings Section */}
            {listings.filter(l => l.businessName).length > 0 && (
              <section style={{ marginBottom: '3rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem', color: '#111827' }}>
                  {firstName}'s Listings
                </h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                  {listings.filter(l => l.businessName).map((listing) => (
                    <div key={listing.id} style={{ width: '200px', maxWidth: '200px' }}>
                      <VendorCard
                        vendor={{
                          VendorProfileID: listing.id,
                          BusinessName: listing.businessName,
                          FeaturedImageURL: listing.featuredImage,
                          City: listing.city,
                          State: listing.state,
                          AverageRating: listing.rating,
                          TotalReviews: listing.reviewCount,
                          PrimaryCategory: listing.category
                        }}
                        isFavorite={false}
                        onToggleFavorite={() => {}}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Activity Section */}
            {activities.length > 0 && (
              <section style={{ marginBottom: '3rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem', color: '#111827' }}>
                  {firstName}'s Activity
                </h2>

                {/* Activity Feed - Limited with Show More */}
                {activitiesLoading ? (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <div className="skeleton" style={{ width: '100%', height: '60px', marginBottom: '0.75rem' }}></div>
                    <div className="skeleton" style={{ width: '100%', height: '60px', marginBottom: '0.75rem' }}></div>
                    <div className="skeleton" style={{ width: '100%', height: '60px' }}></div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                      {(showAllActivities ? activities : activities.slice(0, activitiesLimit)).map((activity, index, arr) => (
                        <div 
                          key={`${activity.ActivityType}-${activity.ActivityID}`}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '1rem',
                            padding: '1rem 0',
                            borderBottom: index < arr.length - 1 ? '1px solid #e5e7eb' : 'none',
                            cursor: activity.TargetURL ? 'pointer' : 'default'
                          }}
                          onClick={() => activity.TargetURL && navigate(activity.TargetURL)}
                        >
                          {/* Activity Icon - Unified SVG */}
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            flexShrink: 0
                          }}>
                            <img
                              src={getUnifiedNotificationIcon(
                                activity.ActivityType === 'review' ? 'review' :
                                activity.ActivityType === 'forum_post' ? 'support' :
                                activity.ActivityType === 'forum_comment' ? 'message' :
                                activity.ActivityType === 'favorite' ? 'heart' : 'general'
                              )}
                              alt={activity.ActivityType}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>

                          {/* Activity Content */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 500, color: '#111827', fontSize: '0.9rem', marginBottom: '2px' }}>
                              {activity.Title}
                            </div>
                            {activity.Description && (
                              <div style={{ 
                                color: '#6b7280', 
                                fontSize: '0.85rem',
                                lineHeight: 1.4,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {activity.Description}
                              </div>
                            )}
                            {activity.Rating && (
                              <div style={{ color: '#fbbf24', fontSize: '0.8rem', marginTop: '2px' }}>
                                {'★'.repeat(activity.Rating)}{'☆'.repeat(5 - activity.Rating)}
                              </div>
                            )}
                            <div style={{ color: '#9ca3af', fontSize: '0.75rem', marginTop: '4px' }}>
                              {(() => {
                                const date = new Date(activity.CreatedAt);
                                if (isNaN(date.getTime())) return '';
                                const now = new Date();
                                const diffMs = now - date;
                                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                                if (diffDays === 0) return 'Today';
                                if (diffDays === 1) return 'Yesterday';
                                if (diffDays < 7) return `${diffDays} days ago`;
                                if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
                                if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
                                return `${Math.floor(diffDays / 365)} years ago`;
                              })()}
                            </div>
                          </div>

                          {/* Activity Image */}
                          {activity.ImageURL && (
                            <div style={{
                              width: '50px',
                              height: '50px',
                              borderRadius: '6px',
                              overflow: 'hidden',
                              flexShrink: 0
                            }}>
                              <img 
                                src={activity.ImageURL} 
                                alt=""
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {/* Show More Button */}
                    {activities.length > activitiesLimit && (
                      <button
                        onClick={() => setShowAllActivities(!showAllActivities)}
                        style={{
                          marginTop: '1rem',
                          background: 'none',
                          border: 'none',
                          color: '#111827',
                          fontSize: '0.9rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          padding: 0
                        }}
                      >
                        {showAllActivities ? 'Show less' : `Show all ${activities.length} activities`}
                      </button>
                    )}
                  </>
                )}
              </section>
            )}

            {/* Reviews Section - Hidden for now */}
            {false && (
              <section className="host-section">
                <h2 style={{ marginBottom: '1.5rem' }}>Reviews for {firstName}</h2>
                
                {/* Rating with stars on same row */}
                {reviews.length > 0 && (
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
                        {avgRating || 'N/A'}
                      </div>
                      <div>
                        <div style={{ 
                          fontSize: '0.9rem', 
                          color: 'var(--primary)',
                          marginBottom: '0.125rem'
                        }}>
                          {'★'.repeat(Math.round(parseFloat(avgRating) || 5))}
                        </div>
                        <div style={{ 
                          fontSize: '0.8rem', 
                          color: 'var(--text-light)'
                        }}>
                          Based on {reviews.length} reviews
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Average Survey Ratings - Only show if reviews have survey data */}
                {reviews.length > 0 && (() => {
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

                {/* Review Content */}
                <div>
                  {paginatedReviews.length > 0 ? (
                    <>
                      {paginatedReviews.map((review, index) => (
                        <div key={index} style={{ 
                          padding: '1.5rem 0', 
                          borderBottom: index < paginatedReviews.length - 1 ? '1px solid var(--border)' : 'none' 
                        }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                            {/* Reviewer Avatar */}
                            <div style={{ 
                              width: '40px', 
                              height: '40px', 
                              borderRadius: '50%', 
                              backgroundImage: review.ReviewerAvatar || review.ReviewerImage 
                                ? `url(${review.ReviewerAvatar || review.ReviewerImage})` 
                                : 'none',
                              backgroundColor: review.ReviewerAvatar || review.ReviewerImage 
                                ? 'transparent' 
                                : 'var(--primary)', 
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontWeight: 600,
                              fontSize: '0.9rem',
                              flexShrink: 0
                            }}>
                              {!(review.ReviewerAvatar || review.ReviewerImage) && (review.ReviewerName?.charAt(0) || 'A')}
                            </div>

                            <div style={{ flex: 1 }}>
                              {/* Reviewer Info */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.95rem' }}>
                                  {review.ReviewerName || 'Anonymous'}
                                </div>
                                <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
                                  {(() => {
                                    const rawDate = review.CreatedAt || review.createdAt || review.ReviewDate || review.created_at;
                                    if (!rawDate) {
                                      return 'recently';
                                    }
                                    const date = new Date(rawDate);
                                    if (isNaN(date.getTime())) {
                                      return 'recently';
                                    }
                                    
                                    const now = new Date();
                                    const diffMs = now - date;
                                    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                                    const diffWeeks = Math.floor(diffDays / 7);
                                    const diffMonths = Math.floor(diffDays / 30);
                                    const diffYears = Math.floor(diffDays / 365);
                                    
                                    if (diffDays === 0) return 'today';
                                    if (diffDays === 1) return 'yesterday';
                                    if (diffDays < 7) return `${diffDays} days ago`;
                                    if (diffWeeks === 1) return '1 week ago';
                                    if (diffWeeks < 4) return `${diffWeeks} weeks ago`;
                                    if (diffMonths === 1) return '1 month ago';
                                    if (diffMonths < 12) return `${diffMonths} months ago`;
                                    if (diffYears === 1) return '1 year ago';
                                    return `${diffYears} years ago`;
                                  })()}
                                </span>
                              </div>

                              {/* Rating */}
                              <div style={{ color: 'var(--primary)', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                                {'★'.repeat(review.Rating || 5)}{'☆'.repeat(5 - (review.Rating || 5))}
                              </div>

                              {/* Review Text */}
                              <div style={{ 
                                color: 'var(--text)', 
                                fontSize: '0.95rem', 
                                lineHeight: 1.6
                              }}>
                                {review.Comment || review.ReviewText || 'Great experience!'}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

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
                            onClick={() => setCurrentReviewPage(Math.max(1, currentReviewPage - 1))}
                            disabled={currentReviewPage === 1}
                            className="btn btn-outline"
                            style={{
                              opacity: currentReviewPage === 1 ? 0.5 : 1,
                              cursor: currentReviewPage === 1 ? 'not-allowed' : 'pointer'
                            }}
                          >
                            <i className="fas fa-chevron-left"></i> Previous
                          </button>
                          
                          <span style={{ fontSize: '0.9rem', color: 'var(--text-light)', fontWeight: 500 }}>
                            Page {currentReviewPage} of {totalPages}
                          </span>
                          
                          <button
                            onClick={() => setCurrentReviewPage(Math.min(totalPages, currentReviewPage + 1))}
                            disabled={currentReviewPage === totalPages}
                            className="btn btn-outline"
                            style={{
                              opacity: currentReviewPage === totalPages ? 0.5 : 1,
                              cursor: currentReviewPage === totalPages ? 'not-allowed' : 'pointer'
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
                      <div style={{ fontSize: '0.9rem' }}>No reviews yet.</div>
                    </div>
                  )}
                </div>
              </section>
            )}

          </div>
        </div>
      </div>

      {/* Report Profile Modal */}
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
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Report this profile</h3>
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
                  Why are you reporting this profile?
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
                  <option value="fake">Fake or misleading profile</option>
                  <option value="inappropriate">Inappropriate content</option>
                  <option value="harassment">Harassment or bullying</option>
                  <option value="spam">Spam or scam</option>
                  <option value="impersonation">Impersonation</option>
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
                    const response = await fetch(`${API_BASE_URL}/users/report`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        reportedUserId: userId,
                        reason: reportForm.reason,
                        details: reportForm.details,
                        reportedBy: currentUser?.id || null
                      })
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
      
      <Footer />
    </PageLayout>
  );
}

export default ProfilePage;
