import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { apiGet, apiPost } from '../../../utils/api';
import { buildVendorProfileUrl } from '../../../utils/urlHelpers';
import { encodeConversationId, encodeVendorId } from '../../../utils/hashIds';
import { useLocalization } from '../../../context/LocalizationContext';

function ClientFavoritesSection() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { formatCurrency } = useLocalization();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState(null);

  const loadFavorites = useCallback(async () => {
    if (!currentUser?.id) return;
    
    try {
      setLoading(true);
      const resp = await apiGet(`/favorites/user/${currentUser.id}`);
      
      if (!resp.ok) throw new Error('Failed to fetch favorites');
      const favs = await resp.json();
      setFavorites(Array.isArray(favs) ? favs : []);
    } catch (error) {
      console.error('Error loading favorites:', error);
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuId]);

  const handleUnfavorite = useCallback(async (vendorId) => {
    try {
      const resp = await apiPost('/users/favorites/toggle', { userId: currentUser.id, vendorProfileId: vendorId });
      if (resp.ok) {
        loadFavorites();
      }
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  }, [currentUser, loadFavorites]);

  const handleMessage = async (vendor) => {
    const vendorId = vendor.VendorProfileID || vendor.id;
    try {
      // Create or get conversation with vendor
      const resp = await apiPost('/messages/conversations', { 
        userId: currentUser.id, 
        vendorProfileId: vendorId,
        subject: 'New Inquiry'
      });
      
      if (resp.ok) {
        const data = await resp.json();
        navigate(`/dashboard?section=messages&conversationId=${encodeConversationId(data.conversationId)}`);
      } else {
        // Fallback to just navigating with vendorId
        navigate(`/dashboard?section=messages&vendorId=${encodeVendorId(vendorId)}`);
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      navigate(`/dashboard?section=messages&vendorId=${encodeVendorId(vendorId)}`);
    }
  };

  const handleViewProfile = (vendor) => {
    const url = buildVendorProfileUrl(vendor.VendorProfileID, vendor.vendorPublicId, vendor.BusinessName || vendor.VendorName);
    window.open(url, '_blank');
  };

  const renderFavoriteCard = (vendor) => {
    const imageUrl = vendor.FeaturedImageURL || vendor.PortfolioImage || vendor.ImageURL || 'https://res.cloudinary.com/dxgy4apj5/image/upload/v1755105530/image_placeholder.png';
    const businessName = vendor.VendorName || vendor.BusinessName || 'Vendor';
    const vendorId = vendor.VendorProfileID || vendor.id;
    const locationText = [vendor.City, vendor.State].filter(Boolean).join(' ');
    const rawPrice = vendor.MinPrice ?? vendor.startingPrice;
    const priceDisplay = rawPrice ? formatCurrency(rawPrice, null, { showCents: false }) : 'Contact for pricing';
    const ratingValue = parseFloat(vendor.averageRating || 0);
    const reviewCount = vendor.totalReviews || 0;
    const isMenuOpen = openMenuId === vendorId;

    return (
      <div 
        key={vendorId}
        onClick={() => handleViewProfile(vendor)}
        style={{ cursor: 'pointer' }}
      >
        {/* Square Image Container */}
        <div style={{ 
          position: 'relative', 
          width: '100%', 
          paddingTop: '100%',
          borderRadius: '12px',
          overflow: 'hidden',
          background: '#f3f4f6'
        }}>
          <img 
            src={imageUrl} 
            alt={businessName}
            style={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%', 
              height: '100%', 
              objectFit: 'cover',
              display: 'block'
            }}
            onError={(e) => { e.target.src = 'https://res.cloudinary.com/dxgy4apj5/image/upload/v1755105530/image_placeholder.png'; }}
          />
          {/* Three-dot menu button - top right */}
          <button
            onClick={(e) => { e.stopPropagation(); setOpenMenuId(isMenuOpen ? null : vendorId); }}
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.95)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
            }}
          >
            <i className="fas fa-ellipsis-v" style={{ color: '#374151', fontSize: '14px' }}></i>
          </button>
          {/* Dropdown Menu */}
          {isMenuOpen && (
            <div 
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                top: '46px',
                right: '10px',
                background: 'white',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                overflow: 'hidden',
                zIndex: 100,
                minWidth: '140px'
              }}
            >
              <button
                onClick={(e) => { e.stopPropagation(); handleMessage(vendor); setOpenMenuId(null); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '12px 16px',
                  background: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#374151',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
              >
                <i className="fas fa-envelope" style={{ fontSize: '13px', color: '#6b7280' }}></i>
                Message
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleUnfavorite(vendorId); setOpenMenuId(null); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '12px 16px',
                  background: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#ef4444',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
              >
                <i className="fas fa-heart-broken" style={{ fontSize: '13px' }}></i>
                Remove
              </button>
            </div>
          )}
        </div>
        
        {/* Content - Airbnb style matching VendorCard */}
        <div style={{ padding: '10px 0 4px 0' }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#222222', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {businessName}
          </div>
          <div style={{ fontSize: '13px', color: '#717171', marginBottom: '2px' }}>{locationText || 'Location not specified'}</div>
          <div style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '3px' }}>
            {rawPrice ? (
              <>
                <span style={{ color: '#717171' }}>Starting from</span>
                <span style={{ fontWeight: 600, color: '#222222' }}>{formatCurrency(rawPrice, null, { showCents: false })}</span>
              </>
            ) : (
              <span style={{ color: '#717171' }}>Contact for pricing</span>
            )}
            <span style={{ color: '#717171', margin: '0 2px' }}>·</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" style={{ height: '10px', width: '10px', fill: '#5e72e4' }}>
                <path fillRule="evenodd" d="M15.1 1.58l-4.13 8.88-9.86 1.27a1 1 0 0 0-.54 1.74l7.3 6.57-1.97 9.85a1 1 0 0 0 1.48 1.06l8.62-5 8.63 5a1 1 0 0 0 1.48-1.06l-1.97-9.85 7.3-6.57a1 1 0 0 0-.55-1.73l-9.86-1.28-4.12-8.88a1 1 0 0 0-1.82 0z"></path>
              </svg>
              <span style={{ color: '#222222' }}>{ratingValue > 0 ? ratingValue.toFixed(1) : '5.0'}</span>
              <span style={{ color: '#717171' }}>({reviewCount})</span>
            </span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div id="favorites-section">
        <div className="dashboard-card" style={{ padding: '40px', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto' }}></div>
        </div>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div id="favorites-section">
        <div className="dashboard-card" style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
          <i className="fas fa-heart" style={{ fontSize: '48px', color: '#d1d5db', marginBottom: '16px', display: 'block' }}></i>
          <p style={{ margin: 0 }}>No saved favorites yet. Explore vendors to add some!</p>
        </div>
      </div>
    );
  }

  // Calculate stats
  const totalFavorites = favorites.length;
  const avgRating = favorites.length > 0 
    ? (favorites.reduce((sum, v) => sum + (parseFloat(v.averageRating) || 0), 0) / favorites.length).toFixed(1)
    : '0.0';
  const categories = [...new Set(favorites.map(v => v.CategoryName || v.Category).filter(Boolean))];

  return (
    <div id="favorites-section">
      <div className="dashboard-card" style={{ padding: '24px' }}>
        {/* Header with stats */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>
              <i className="fas fa-heart" style={{ color: '#ef4444', marginRight: '8px' }}></i>
              My Favorites
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
              Vendors you've saved for later
            </p>
          </div>
          <div style={{ display: 'flex', gap: '24px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#5e72e4' }}>{totalFavorites}</div>
              <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Saved</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#f59e0b' }}>
                <span style={{ fontSize: '16px', marginRight: '2px' }}>★</span>{avgRating}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Avg Rating</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>{categories.length}</div>
              <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Categories</div>
            </div>
          </div>
        </div>

        {/* Category tags */}
        {categories.length > 0 && (
          <div style={{ marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {categories.map(cat => (
              <span key={cat} style={{ 
                padding: '4px 12px', 
                background: '#f3f4f6', 
                borderRadius: '16px', 
                fontSize: '12px', 
                color: '#374151',
                fontWeight: 500
              }}>
                {cat}
              </span>
            ))}
          </div>
        )}

        {/* Vendor grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '20px'
        }}>
          {favorites.map(renderFavoriteCard)}
        </div>
      </div>
    </div>
  );
}

export default ClientFavoritesSection;
