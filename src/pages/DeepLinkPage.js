import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiGet } from '../utils/api';
import './DeepLinkPage.css';

/**
 * DeepLinkPage - Centralized handler for all email deep links
 * 
 * Validates that:
 * 1. User is authenticated (redirects to login if not)
 * 2. The resource exists and is accessible
 * 3. The resource hasn't expired
 * 4. User has permission to access the resource
 * 
 * Supported link types:
 * - /link/booking/:id - Booking details
 * - /link/payment/:id - Payment page
 * - /link/message/:conversationId - Message thread
 * - /link/ticket/:ticketId - Support ticket
 * - /link/review/:id - Review request
 * - /link/vendor-request/:id - Vendor booking request
 */

function DeepLinkPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { currentUser, loading: authLoading } = useAuth();
  
  const [status, setStatus] = useState('loading'); // loading, error, redirecting
  const [errorMessage, setErrorMessage] = useState('');
  const [errorTitle, setErrorTitle] = useState('');

  useEffect(() => {
    if (authLoading) return;

    // If not logged in, redirect to login with return URL
    if (!currentUser) {
      const returnUrl = location.pathname + location.search;
      sessionStorage.setItem('postLoginRedirect', returnUrl);
      navigate('/', { state: { showLogin: true, returnUrl } });
      return;
    }

    // Parse the link type and ID from the URL
    const pathParts = location.pathname.split('/').filter(Boolean);
    // Expected format: /link/{type}/{id}
    if (pathParts.length < 3 || pathParts[0] !== 'link') {
      setStatus('error');
      setErrorTitle('Invalid Link');
      setErrorMessage('This link is not valid. Please check your email and try again.');
      return;
    }

    const linkType = pathParts[1];
    const resourceId = pathParts[2];

    validateAndRedirect(linkType, resourceId);
  }, [authLoading, currentUser, location, navigate]);

  const validateAndRedirect = async (linkType, resourceId) => {
    try {
      setStatus('loading');

      // Validate the resource based on type
      const validation = await validateResource(linkType, resourceId);

      if (!validation.valid) {
        setStatus('error');
        setErrorTitle(validation.errorTitle || 'Link Not Valid');
        setErrorMessage(validation.errorMessage || 'This link is no longer valid.');
        return;
      }

      // Redirect to the appropriate page
      setStatus('redirecting');
      navigate(validation.redirectUrl, { replace: true });

    } catch (error) {
      console.error('Deep link validation error:', error);
      setStatus('error');
      setErrorTitle('Something Went Wrong');
      setErrorMessage('We couldn\'t process this link. Please try again or contact support.');
    }
  };

  const validateResource = async (linkType, resourceId) => {
    const viewMode = localStorage.getItem('viewMode');
    const isVendorView = viewMode === 'vendor' || (currentUser?.isVendor && viewMode !== 'client');

    switch (linkType) {
      case 'booking': {
        // Validate booking exists and user has access
        try {
          const res = await apiGet(`/bookings/validate/${resourceId}`);
          const response = await res.json();
          if (response.valid) {
            const section = isVendorView ? 'vendor-requests' : 'bookings';
            return {
              valid: true,
              redirectUrl: `/dashboard?section=${section}&itemId=${resourceId}`
            };
          }
          return {
            valid: false,
            errorTitle: response.errorTitle || 'Booking Not Found',
            errorMessage: response.errorMessage || 'This booking could not be found. It may have been cancelled or you may not have permission to view it.'
          };
        } catch (error) {
          if (error.response?.status === 404) {
            return {
              valid: false,
              errorTitle: 'Booking Not Found',
              errorMessage: 'This booking could not be found. It may have been cancelled or deleted.'
            };
          }
          if (error.response?.status === 403) {
            return {
              valid: false,
              errorTitle: 'Access Denied',
              errorMessage: 'You do not have permission to view this booking.'
            };
          }
          throw error;
        }
      }

      case 'payment': {
        // Validate payment/booking exists and is awaiting payment
        try {
          const res = await apiGet(`/bookings/validate/${resourceId}`);
          const response = await res.json();
          if (response.valid) {
            if (response.status === 'confirmed' || response.status === 'completed') {
              return {
                valid: false,
                errorTitle: 'Already Paid',
                errorMessage: 'This booking has already been paid for.'
              };
            }
            if (response.status === 'cancelled' || response.status === 'rejected') {
              return {
                valid: false,
                errorTitle: 'Booking Cancelled',
                errorMessage: 'This booking has been cancelled and payment is no longer required.'
              };
            }
            if (response.isExpired) {
              return {
                valid: false,
                errorTitle: 'Payment Link Expired',
                errorMessage: 'This payment link has expired. The event date has already passed.'
              };
            }
            return {
              valid: true,
              redirectUrl: `/payment/${resourceId}`
            };
          }
          return {
            valid: false,
            errorTitle: 'Booking Not Found',
            errorMessage: 'This booking could not be found.'
          };
        } catch (error) {
          if (error.response?.status === 404) {
            return {
              valid: false,
              errorTitle: 'Booking Not Found',
              errorMessage: 'This booking could not be found.'
            };
          }
          throw error;
        }
      }

      case 'message': {
        // Validate conversation exists and user is a participant
        try {
          const res = await apiGet(`/conversations/validate/${resourceId}`);
          const response = await res.json();
          if (response.valid) {
            return {
              valid: true,
              redirectUrl: `/dashboard?section=messages&conversationId=${resourceId}`
            };
          }
          return {
            valid: false,
            errorTitle: 'Conversation Not Found',
            errorMessage: 'This conversation could not be found or you do not have access to it.'
          };
        } catch (error) {
          return {
            valid: false,
            errorTitle: 'Conversation Not Found',
            errorMessage: 'This conversation could not be found.'
          };
        }
      }

      case 'ticket': {
        // Validate support ticket exists and user owns it
        try {
          const res = await apiGet(`/support/tickets/validate/${resourceId}`);
          const response = await res.json();
          if (response.valid) {
            return {
              valid: true,
              redirectUrl: `/dashboard?section=support&ticketId=${resourceId}`
            };
          }
          return {
            valid: false,
            errorTitle: 'Ticket Not Found',
            errorMessage: 'This support ticket could not be found or you do not have access to it.'
          };
        } catch (error) {
          return {
            valid: false,
            errorTitle: 'Ticket Not Found',
            errorMessage: 'This support ticket could not be found.'
          };
        }
      }

      case 'review': {
        // Validate review request exists and hasn't expired
        try {
          const res = await apiGet(`/reviews/validate/${resourceId}`);
          const response = await res.json();
          if (response.valid) {
            return {
              valid: true,
              redirectUrl: `/review/${resourceId}`
            };
          }
          if (response.expired) {
            return {
              valid: false,
              errorTitle: 'Review Link Expired',
              errorMessage: 'This review link has expired. Review requests are valid for 30 days after your event.'
            };
          }
          if (response.alreadyReviewed) {
            return {
              valid: false,
              errorTitle: 'Already Reviewed',
              errorMessage: 'You have already submitted a review for this booking.'
            };
          }
          return {
            valid: false,
            errorTitle: 'Review Not Available',
            errorMessage: 'This review link is no longer valid.'
          };
        } catch (error) {
          return {
            valid: false,
            errorTitle: 'Review Not Available',
            errorMessage: 'This review link could not be validated.'
          };
        }
      }

      case 'vendor-request': {
        // Validate vendor has access to this booking request
        try {
          const res = await apiGet(`/bookings/validate/${resourceId}`);
          const response = await res.json();
          if (response.valid) {
            return {
              valid: true,
              redirectUrl: `/dashboard?section=vendor-requests&itemId=${resourceId}`
            };
          }
          return {
            valid: false,
            errorTitle: 'Request Not Found',
            errorMessage: 'This booking request could not be found or you do not have access to it.'
          };
        } catch (error) {
          return {
            valid: false,
            errorTitle: 'Request Not Found',
            errorMessage: 'This booking request could not be found.'
          };
        }
      }

      case 'analytics': {
        // Analytics summary - just redirect to analytics section
        return {
          valid: true,
          redirectUrl: '/dashboard?section=analytics'
        };
      }

      case 'vendor-profile': {
        // Vendor profile management
        return {
          valid: true,
          redirectUrl: '/dashboard?section=vendor-profile'
        };
      }

      case 'invoice': {
        // Invoice view - redirect to invoice page where user can view/download PDF
        try {
          const res = await apiGet(`/invoices/validate/${resourceId}`);
          const response = await res.json();
          if (response.valid) {
            return {
              valid: true,
              redirectUrl: `/invoice/booking/${resourceId}`
            };
          }
          return {
            valid: false,
            errorTitle: 'Invoice Not Found',
            errorMessage: 'This invoice could not be found or you do not have access to it.'
          };
        } catch (error) {
          // If validation endpoint doesn't exist, just redirect anyway
          return {
            valid: true,
            redirectUrl: `/invoice/booking/${resourceId}`
          };
        }
      }

      default:
        return {
          valid: false,
          errorTitle: 'Unknown Link Type',
          errorMessage: 'This link type is not recognized.'
        };
    }
  };

  // Loading state
  if (status === 'loading' || status === 'redirecting' || authLoading) {
    return (
      <div className="deep-link-page">
        <div className="deep-link-card">
          <div className="spinner-container">
            <div className="spinner-large"></div>
          </div>
          <h2>{status === 'redirecting' ? 'Redirecting...' : 'Validating Link...'}</h2>
          <p>Please wait while we verify your access.</p>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div className="deep-link-page">
      <div className="deep-link-card">
        <div className="icon-circle error">
          <i className="fas fa-exclamation-triangle"></i>
        </div>
        <h2>{errorTitle}</h2>
        <p>{errorMessage}</p>
        
        <div className="action-buttons">
          <button 
            className="btn-primary"
            onClick={() => navigate('/dashboard')}
          >
            <i className="fas fa-home"></i>
            Go to Dashboard
          </button>
          <button 
            className="btn-secondary"
            onClick={() => navigate('/explore')}
          >
            <i className="fas fa-search"></i>
            Explore Vendors
          </button>
        </div>

        <div className="support-note">
          <p>
            Need help?{' '}
            <button 
              className="link-btn"
              onClick={() => navigate('/dashboard?section=support')}
            >
              Contact Support
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default DeepLinkPage;
