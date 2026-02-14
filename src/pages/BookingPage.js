import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { GOOGLE_MAPS_API_KEY } from '../config';
import { apiGet, apiPost } from '../utils/api';
import { PageLayout } from '../components/PageWrapper';
import Header from '../components/Header';
import SkeletonLoader from '../components/SkeletonLoader';
import { ServiceCard, PackageCard, PackageServiceTabs, PackageServiceEmpty, PackageServiceList } from '../components/PackageServiceCard';
import UniversalModal, { ConfirmationModal } from '../components/UniversalModal';
import ProfileModal from '../components/ProfileModal';
import SetupIncompleteBanner from '../components/SetupIncompleteBanner';
import MessagingWidget from '../components/MessagingWidget';
import Breadcrumb from '../components/Breadcrumb';
import BookingCalendar from '../components/BookingCalendar';
import SharedDateTimePicker from '../components/SharedDateTimePicker';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, CardNumberElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { API_BASE_URL } from '../config';

import { extractVendorIdFromSlug, parseQueryParams, trackPageView, buildVendorProfileUrl } from '../utils/urlHelpers';
import { encodeUserId } from '../utils/hashIds';
import { formatDateWithWeekday } from '../utils/helpers';
import { getProvinceFromLocation, getTaxInfoForProvince, PROVINCE_TAX_RATES } from '../utils/taxCalculations';
import { useLocalization } from '../context/LocalizationContext';
import { useTranslation } from '../hooks/useTranslation';
import { extractAddressComponents } from '../utils/locationUtils';
import '../styles/BookingPage.css';
import '../components/Calendar.css';

// Initialize Stripe outside component to avoid recreating on each render
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

// Card Element styling
const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      '::placeholder': {
        color: '#aab7c4',
      },
      padding: '12px',
    },
    invalid: {
      color: '#dc2626',
      iconColor: '#dc2626',
    },
  },
};

// Embedded Payment Form Component using CardElement (simpler, no payment intent needed upfront)
function EmbeddedPaymentForm({ onSubmit, isProcessing, error, totalAmount }) {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    onSubmit(stripe, elements);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ 
        marginBottom: '1rem', 
        padding: '1rem', 
        border: '1px solid #e5e7eb', 
        borderRadius: '8px',
        backgroundColor: '#fff'
      }}>
        <CardElement options={CARD_ELEMENT_OPTIONS} />
      </div>
      
      {error && (
        <div style={{ 
          padding: '0.75rem 1rem', 
          backgroundColor: '#fef2f2', 
          border: '1px solid #fecaca', 
          borderRadius: '8px', 
          color: '#dc2626',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <i className="fas fa-exclamation-circle"></i>
          {error}
        </div>
      )}
      
      <button
        type="submit"
        disabled={!stripe || isProcessing}
        style={{
          width: '100%',
          padding: '1rem',
          background: isProcessing ? '#9ca3af' : '#5086E8',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: isProcessing ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem'
        }}
      >
        {isProcessing ? (
          <>
            <svg className="animate-spin" style={{ width: '20px', height: '20px' }} viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4 31.4" />
            </svg>
            Processing Payment...
          </>
        ) : (
          <>
            <i className="fas fa-lock"></i>
            Pay & Confirm Booking
          </>
        )}
      </button>
      
      <p style={{ fontSize: '0.8rem', color: '#6b7280', textAlign: 'center', marginTop: '1rem' }}>
        <i className="fas fa-shield-alt" style={{ marginRight: '0.25rem' }}></i>
        Secure payment powered by Stripe
      </p>
    </form>
  );
}

// Inline Payment Form Component (Giggster-style, not modal)
function InlinePaymentForm({ onSubmit, isProcessing, error, totalAmount, currentUser, onLoginRequired }) {
  const stripe = useStripe();
  const elements = useElements();
  const [nameOnCard, setNameOnCard] = useState('');
  const [country, setCountry] = useState('Canada');
  const [postalCode, setPostalCode] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    
    if (!currentUser || !currentUser.id) {
      onLoginRequired();
      return;
    }
    
    onSubmit(stripe, elements, { nameOnCard, country, postalCode });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
          Card number
        </label>
        <div style={{ padding: '12px 14px', border: '1px solid #d1d5db', borderRadius: '8px', backgroundColor: '#fff' }}>
          <CardElement options={CARD_ELEMENT_OPTIONS} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
            Country
          </label>
          <select 
            value={country} 
            onChange={e => setCountry(e.target.value)}
            style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', backgroundColor: '#fff' }}
          >
            <option value="Canada">Canada</option>
            <option value="United States">United States</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
            Postal code
          </label>
          <input 
            type="text" 
            value={postalCode}
            onChange={e => setPostalCode(e.target.value)}
            placeholder="M5V 1T4"
            style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }}
          />
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
          Name on card
        </label>
        <input 
          type="text" 
          value={nameOnCard}
          onChange={e => setNameOnCard(e.target.value)}
          placeholder="Full name as shown on card"
          style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }}
        />
      </div>

      <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '16px', lineHeight: 1.5 }}>
        By providing your card information, you allow Planbeau Canada Inc. to charge your card for this booking in accordance with our terms.
      </p>

      {error && (
        <div style={{ 
          padding: '12px 16px', 
          backgroundColor: '#fef2f2', 
          border: '1px solid #fecaca', 
          borderRadius: '8px', 
          color: '#dc2626',
          marginBottom: '16px',
          fontSize: '0.9rem'
        }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        style={{
          width: '100%',
          padding: '14px 24px',
          background: isProcessing ? '#9ca3af' : '#5086E8',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: isProcessing ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
      >
        {isProcessing ? (
          <>
            <svg className="animate-spin" style={{ width: '20px', height: '20px' }} viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4 31.4" />
            </svg>
            Processing...
          </>
        ) : (
          <>
            <i className="fas fa-lock"></i>
            Pay ${totalAmount?.toFixed(2)} CAD
          </>
        )}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '12px' }}>
        <i className="fas fa-shield-alt" style={{ fontSize: '0.75rem', color: '#9ca3af' }}></i>
        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Secure payment powered by Stripe</span>
      </div>
      <p style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'center', marginTop: '8px', marginBottom: 0 }}>
        By proceeding, you agree to our <a href="/terms-of-service" style={{ color: '#5086E8' }}>Terms of Service</a> and <a href="/privacy-policy" style={{ color: '#5086E8' }}>Privacy Policy</a>
      </p>
    </form>
  );
}

function BookingPage() {
  const { vendorSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { showWarning } = useAlert();
  const { formatCurrency } = useLocalization();
  const { t } = useTranslation();
  
  // Extract vendor ID from slug (supports both "138" and "business-name-138")
  const vendorId = extractVendorIdFromSlug(vendorSlug) || vendorSlug;

  // State Management
  const [currentStep, setCurrentStep] = useState(1);
  const [vendorData, setVendorData] = useState(null);
  const [selectedServices, setSelectedServices] = useState([]);
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [packages, setPackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [step2Tab, setStep2Tab] = useState('packages'); // 'packages' or 'services'
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalType, setSuccessModalType] = useState('request'); // 'request' or 'payment'
  const [submitting, setSubmitting] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [vendorAvailability, setVendorAvailability] = useState(null);
  const [cancellationPolicy, setCancellationPolicy] = useState(null);
  const [commissionSettings, setCommissionSettings] = useState({ platformFeePercent: 5 });
  const [provinceTaxRates, setProvinceTaxRates] = useState({});
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [paymentError, setPaymentError] = useState('');
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [hasPrefilledDate, setHasPrefilledDate] = useState(false);
  const [showLeaveConfirmModal, setShowLeaveConfirmModal] = useState(false);
  const [showNoSelectionModal, setShowNoSelectionModal] = useState(false);
  const [pendingStepAction, setPendingStepAction] = useState(null);
  const [validationError, setValidationError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const locationInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  const [bookingData, setBookingData] = useState({
    eventName: '',
    eventType: '',
    eventDate: '',
    eventTime: '',
    eventEndTime: '',
    attendeeCount: '',
    eventLocation: '',
    specialRequests: ''
  });

  // Initialize page and pre-fill data from URL params (from ProfileVendorWidget)
  useEffect(() => {
    if (!vendorId) {
      showWarning('No vendor selected. Redirecting to home page.', 'Error').then(() => {
        navigate('/');
      });
      return;
    }

    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('event-date');
    if (dateInput) {
      dateInput.setAttribute('min', today);
    }

    // Pre-fill booking data from URL params (coming from ProfileVendorWidget or search bar)
    const searchParams = new URLSearchParams(location.search);
    // Check both 'date' (from widget) and 'eventDate' (from search bar URL)
    const prefilledDate = searchParams.get('date') || searchParams.get('eventDate');
    const prefilledStartTime = searchParams.get('startTime');
    const prefilledEndTime = searchParams.get('endTime');
    const prefilledPackageId = searchParams.get('packageId');
    const prefilledServiceId = searchParams.get('serviceId');

    if (prefilledDate || prefilledStartTime || prefilledEndTime) {
      setBookingData(prev => ({
        ...prev,
        eventDate: prefilledDate || prev.eventDate,
        eventTime: prefilledStartTime || prev.eventTime,
        eventEndTime: prefilledEndTime || prev.eventEndTime
      }));
      // Track that we have prefilled date from search/profile
      if (prefilledDate) {
        setHasPrefilledDate(true);
      }
    }

    // Store prefilled package ID to select after packages load
    if (prefilledPackageId) {
      sessionStorage.setItem('prefilledPackageId', prefilledPackageId);
    }

    // Store prefilled service ID to select after services load
    if (prefilledServiceId) {
      sessionStorage.setItem('prefilledServiceId', prefilledServiceId);
      // Switch to services tab if coming from a service selection
      setStep2Tab('services');
    }

    loadVendorData();
    loadVendorAvailability();
    loadCancellationPolicy();
    loadCommissionSettings();
    loadProvinceTaxRates();
  }, [vendorId, navigate, location.search]);

  // Load commission settings from API
  const loadCommissionSettings = useCallback(async () => {
    try {
      const response = await apiGet('/public/commission-info');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.commissionInfo) {
          setCommissionSettings({
            platformFeePercent: parseFloat(data.commissionInfo.renterProcessingFee) || 5
          });
        }
      }
    } catch (error) {
      console.error('Error loading commission settings:', error);
    }
  }, []);

  // Load province tax rates
  const loadProvinceTaxRates = useCallback(async () => {
    try {
      const response = await apiGet('/payments/tax-rates');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.provinces) {
          setProvinceTaxRates(data.provinces);
        }
      }
    } catch (error) {
      console.error('Error loading province tax rates:', error);
    }
  }, []);

  // Load Google Maps API for location autocomplete
  useEffect(() => {
    if (window.google && window.google.maps && window.google.maps.places) {
      initializeGooglePlaces();
    } else {
      loadGoogleMapsAPI();
    }
  }, []);

  // Initialize Google Places when location input is rendered
  useEffect(() => {
    if (locationInputRef.current && window.google && window.google.maps && window.google.maps.places) {
      initializeGooglePlaces();
    }
  }, [currentStep]);

  // Scroll to top when component mounts or vendorId changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [vendorId]);

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  // Load vendor data
  const loadVendorData = useCallback(async () => {
    try {
      const response = await apiGet(`/vendors/${vendorId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load vendor data: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        setVendorData(result.data);
      } else {
        throw new Error('Invalid vendor data format');
      }
    } catch (error) {
      console.error('Error loading vendor data:', error);
      // Keep vendorData as null to show skeleton loading
      setVendorData(null);
    }
  }, [vendorId]);

  // Load vendor availability (business hours, exceptions, lead time, AND bookings)
  const loadVendorAvailability = useCallback(async () => {
    try {
      const response = await apiGet(`/vendors/${vendorId}/availability`);
      if (response.ok) {
        const data = await response.json();
        // Also get lead time from vendor profile if not in availability response
        if (!data.minBookingLeadTimeHours && vendorData?.profile) {
          data.minBookingLeadTimeHours = vendorData.profile.MinBookingLeadTimeHours || 0;
        }
        
        // Also fetch vendor bookings for overlap validation
        try {
          const bookingsResponse = await fetch(`${API_BASE_URL}/bookings/vendor/${vendorId}`);
          if (bookingsResponse.ok) {
            const bookingsData = await bookingsResponse.json();
            const activeBookings = (bookingsData.bookings || []).filter(b => {
              const status = (b.Status || '').toLowerCase();
              return status === 'confirmed' || status === 'pending' || status === 'paid' || status === 'approved';
            });
            data.bookings = activeBookings;
          }
        } catch (bookingsError) {
          console.error('Error fetching vendor bookings:', bookingsError);
          data.bookings = [];
        }
        
        setVendorAvailability(data);
      }
    } catch (error) {
      console.error('❌ Error loading vendor availability:', error);
    }
  }, [vendorId, vendorData]);

  // Load cancellation policy
  const loadCancellationPolicy = useCallback(async () => {
    try {
      const response = await apiGet(`/payments/vendor/${vendorId}/cancellation-policy`);
      if (response.ok) {
        const data = await response.json();
        setCancellationPolicy(data.policy);
      }
    } catch (error) {
      console.error('Error loading cancellation policy:', error);
    }
  }, [vendorId]);

  // Load Google Maps API
  const loadGoogleMapsAPI = () => {
    if (window.google) return;
    
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = initializeGooglePlaces;
    document.head.appendChild(script);
  };

  // Initialize Google Places Autocomplete
  const initializeGooglePlaces = () => {
    if (!locationInputRef.current) return;
    
    // Clear existing autocomplete if it exists
    if (autocompleteRef.current) {
      window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
    }

    const autocomplete = new window.google.maps.places.Autocomplete(locationInputRef.current, {
      componentRestrictions: { country: 'ca' } // Restrict to Canada
    });

    autocompleteRef.current = autocomplete;

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.geometry) {
        // Use centralized utility to extract address components
        const extracted = extractAddressComponents(place);
        
        // For event location, use street address if available, otherwise City, Province
        const streetAddress = extracted.fullAddress;
        const eventLocation = streetAddress ? `${streetAddress}, ${extracted.formattedLocation}` : extracted.formattedLocation || place.formatted_address;
        
        setBookingData(prev => ({
          ...prev,
          eventLocation: eventLocation
        }));
      }
    });
  };

  // Load vendor services
  const loadVendorServices = useCallback(async () => {
    setLoadingServices(true);
    try {
      const response = await apiGet(`/vendors/${vendorId}/selected-services`);
      
      if (!response.ok) {
        throw new Error('Failed to load services');
      }
      
      const data = await response.json();
      setServices(data.selectedServices || []);
    } catch (error) {
      console.error('Error loading services:', error);
      setServices([]);
    } finally {
      setLoadingServices(false);
    }
  }, [vendorId]);

  // Load vendor packages
  const loadVendorPackages = useCallback(async () => {
    setLoadingPackages(true);
    try {
      const response = await apiGet(`/vendors/${vendorId}/packages`);
      
      if (!response.ok) {
        throw new Error('Failed to load packages');
      }
      
      const data = await response.json();
      setPackages(data.packages || []);
    } catch (error) {
      console.error('Error loading packages:', error);
      setPackages([]);
    } finally {
      setLoadingPackages(false);
    }
  }, [vendorId]);

  // Load packages and services when entering step 2
  useEffect(() => {
    if (currentStep === 2) {
      if (packages.length === 0) loadVendorPackages();
      if (services.length === 0) loadVendorServices();
    }
  }, [currentStep, packages.length, services.length, loadVendorPackages, loadVendorServices]);

  // Auto-select prefilled package after packages load
  useEffect(() => {
    if (packages.length > 0) {
      const prefilledPackageId = sessionStorage.getItem('prefilledPackageId');
      if (prefilledPackageId) {
        const pkg = packages.find(p => p.PackageID === parseInt(prefilledPackageId));
        if (pkg) {
          setSelectedPackage(pkg);
        }
        sessionStorage.removeItem('prefilledPackageId');
      }
    }
  }, [packages]);

  // Auto-select prefilled service after services load
  useEffect(() => {
    if (services.length > 0) {
      const prefilledServiceId = sessionStorage.getItem('prefilledServiceId');
      if (prefilledServiceId) {
        const svc = services.find(s => 
          (s.ServiceID === parseInt(prefilledServiceId)) || 
          (s.VendorServiceID === parseInt(prefilledServiceId)) ||
          (s.serviceId === parseInt(prefilledServiceId))
        );
        if (svc) {
          // Add service to selectedServices if not already selected
          setSelectedServices(prev => {
            const isAlreadySelected = prev.some(s => 
              (s.ServiceID || s.VendorServiceID || s.id) === (svc.ServiceID || svc.VendorServiceID || svc.id)
            );
            if (!isAlreadySelected) {
              return [...prev, svc];
            }
            return prev;
          });
        }
        sessionStorage.removeItem('prefilledServiceId');
      }
    }
  }, [services]);

  // Handle input changes
  const handleInputChange = (e) => {
    const { id, value } = e.target;
    let fieldName = id;
    
    // Map form field IDs to state property names
    const fieldMapping = {
      'event-name': 'eventName',
      'event-type': 'eventType',
      'event-date': 'eventDate',
      'event-time': 'eventTime',
      'event-end-time': 'eventEndTime',
      'attendee-count': 'attendeeCount',
      'event-location': 'eventLocation',
      'special-requests': 'specialRequests'
    };
    
    fieldName = fieldMapping[id] || fieldName;
    
    setBookingData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  // Handle calendar date selection - do everything here, no useEffect
  const handleCalendarDateSelect = (dateString) => {
    // Generate time slots for this date
    let newSlots = [];
    if (dateString && vendorAvailability?.businessHours) {
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      
      let dayHours = vendorAvailability.businessHours.find(bh => bh.DayOfWeek === dayOfWeek);
      if (!dayHours && dayOfWeek === 0) {
        dayHours = vendorAvailability.businessHours.find(bh => bh.DayOfWeek === 7);
      }
      
      if (dayHours && dayHours.IsAvailable) {
        const parseTime = (timeStr) => {
          if (!timeStr) return null;
          if (typeof timeStr !== 'string') {
            if (timeStr instanceof Date) return { hour: timeStr.getHours(), minute: timeStr.getMinutes() };
            if (typeof timeStr === 'object' && timeStr.hour !== undefined) return timeStr;
            timeStr = String(timeStr);
          }
          if (timeStr.includes('T')) {
            const d = new Date(timeStr);
            return { hour: d.getHours(), minute: d.getMinutes() };
          }
          const parts = timeStr.split(':');
          return { hour: parseInt(parts[0]), minute: parseInt(parts[1] || 0) };
        };
        
        const openTime = parseTime(dayHours.OpenTime);
        const closeTime = parseTime(dayHours.CloseTime);
        
        if (openTime && closeTime && !isNaN(openTime.hour) && !isNaN(closeTime.hour)) {
          let currentHour = openTime.hour;
          let currentMinute = openTime.minute || 0;
          const closeMinutes = closeTime.hour * 60 + (closeTime.minute || 0);
          
          while (currentHour * 60 + currentMinute <= closeMinutes) {
            newSlots.push(`${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`);
            currentMinute += 30;
            if (currentMinute >= 60) { currentMinute = 0; currentHour++; }
          }
        }
      }
    }
    
    setAvailableTimeSlots(newSlots);
    
    // Set date only - don't auto-select times, let user choose
    setBookingData(prev => ({
      ...prev,
      eventDate: dateString,
      eventTime: '',
      eventEndTime: ''
    }));
  };

  // Handle time change from calendar
  const handleTimeChange = (type, value) => {
    if (type === 'start') {
      setBookingData(prev => ({
        ...prev,
        eventTime: value
      }));
    } else {
      setBookingData(prev => ({
        ...prev,
        eventEndTime: value
      }));
    }
  };

  // Generate available time slots based on business hours for selected date
  const updateAvailableTimeSlots = useCallback((dateString) => {
    if (!dateString) {
      setAvailableTimeSlots([]);
      return;
    }

    if (!vendorAvailability) {
      setAvailableTimeSlots([]);
      return;
    }

    if (!vendorAvailability.businessHours) {
      setAvailableTimeSlots([]);
      return;
    }

    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday (JavaScript standard)
    
    // Try to find business hours - check if database uses 0-6 or 1-7
    let dayHours = vendorAvailability.businessHours.find(bh => bh.DayOfWeek === dayOfWeek);
    
    // If not found and it's Sunday (0), try looking for day 7 (some databases use 1-7 where Sunday=7)
    if (!dayHours && dayOfWeek === 0) {
      dayHours = vendorAvailability.businessHours.find(bh => bh.DayOfWeek === 7);
    }
    
    if (!dayHours) {
      setAvailableTimeSlots([]);
      return;
    }

    if (!dayHours.IsAvailable) {
      setAvailableTimeSlots([]);
      return;
    }

    // Parse OpenTime and CloseTime (can be ISO timestamp or time string)
    const parseTime = (timeStr) => {
      if (!timeStr) return null;
      
      // Ensure timeStr is a string
      if (typeof timeStr !== 'string') {
        // If it's a Date object, extract time
        if (timeStr instanceof Date) {
          return {
            hour: timeStr.getHours(),
            minute: timeStr.getMinutes()
          };
        }
        // If it's an object with hour/minute, return as-is
        if (typeof timeStr === 'object' && timeStr.hour !== undefined) {
          return timeStr;
        }
        // Try to convert to string
        timeStr = String(timeStr);
      }
      
      // Check if it's an ISO timestamp (contains 'T')
      if (timeStr.includes('T')) {
        const date = new Date(timeStr);
        // Use local time (getHours) instead of UTC to respect timezone
        return {
          hour: date.getHours(),
          minute: date.getMinutes()
        };
      }
      
      // Otherwise parse as time string "HH:MM:SS"
      const parts = timeStr.split(':');
      return {
        hour: parseInt(parts[0]),
        minute: parseInt(parts[1] || 0)
      };
    };

    const openTime = parseTime(dayHours.OpenTime);
    const closeTime = parseTime(dayHours.CloseTime);

    if (!openTime || !closeTime) {
      setAvailableTimeSlots([]);
      return;
    }

    // Validate parsed times before proceeding
    if (isNaN(openTime.hour) || isNaN(closeTime.hour)) {
      setAvailableTimeSlots([]);
      return;
    }

    // Generate 30-minute interval slots (including close time)
    const slots = [];
    let currentHour = openTime.hour;
    let currentMinute = openTime.minute || 0;
    const closeMinutes = closeTime.hour * 60 + (closeTime.minute || 0);

    while (currentHour * 60 + currentMinute <= closeMinutes) {
      const timeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
      slots.push(timeStr);

      currentMinute += 30;
      if (currentMinute >= 60) {
        currentMinute = 0;
        currentHour++;
      }
    }

    setAvailableTimeSlots(slots);
    return slots;
  }, [vendorAvailability]);

  // Toggle service selection
  const toggleServiceSelection = (service) => {
    const serviceId = service.PredefinedServiceID || service.VendorSelectedServiceID;
    const serviceName = service.ServiceName;
    const servicePrice = service.VendorPrice || 0;

    setSelectedServices(prev => {
      const isSelected = prev.some(s => s.id === serviceId);
      if (isSelected) {
        return prev.filter(s => s.id !== serviceId);
      } else {
        return [...prev, { id: serviceId, name: serviceName, price: servicePrice }];
      }
    });
  };

  // Select package with duration and attendee validation
  const selectPackage = (pkg) => {
    if (selectedPackage?.PackageID === pkg.PackageID) {
      setSelectedPackage(null); // Deselect if already selected
    } else {
      // Check if package duration fits in time slot
      const pkgDuration = pkg.DurationMinutes || pkg.Duration || pkg.duration || null;
      const durationCheck = checkDurationFits(pkgDuration);
      
      if (!durationCheck.fits) {
        setDurationWarning({
          type: 'package',
          name: pkg.PackageName || pkg.name,
          itemDuration: durationCheck.itemDuration,
          slotDuration: durationCheck.slotDuration
        });
        return;
      }
      
      // Check attendee limits for packages with per_attendee pricing
      const attendeeCheck = checkAttendeeFits(pkg);
      if (!attendeeCheck.fits) {
        setAttendeeWarning({
          type: 'package',
          name: pkg.PackageName || pkg.name,
          min: attendeeCheck.min,
          max: attendeeCheck.max,
          current: attendeeCheck.current
        });
        return;
      }
      
      setSelectedPackage(pkg);
    }
  };

  const showValidationError = (message) => {
    showWarning(message);
    return false;
  };

  // Validation - uses inline field highlighting and scrolls to top
  const validateStep = (step) => {
    // Clear previous errors
    setFieldErrors({});
    setValidationError(null);
    
    const errors = {};
    
    if (step === 1) {
      if (!bookingData.eventName.trim()) {
        errors.eventName = 'Please enter an event name';
      }
      if (!bookingData.eventType) {
        errors.eventType = 'Please select an event type';
      }
      if (!bookingData.eventDate) {
        errors.eventDate = 'Please select an event date';
      }
      if (!bookingData.eventTime) {
        errors.eventTime = 'Please select a start time';
      }
      if (!bookingData.eventEndTime) {
        errors.eventEndTime = 'Please select an end time';
      }
      if (!bookingData.attendeeCount || bookingData.attendeeCount < 1) {
        errors.attendeeCount = 'Please enter the number of guests';
      }
      if (!bookingData.eventLocation.trim()) {
        errors.eventLocation = 'Please enter the event location';
      }
      
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        // Scroll to top of page to show errors
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return false;
      }
      return true;
    }
    
    if (step === 2) {
      // Validate attendee count against selected package/services min/max
      const attendees = parseInt(bookingData.attendeeCount) || 0;
      
      // Check package attendee limits (for any package with min/max set, regardless of pricing model)
      if (selectedPackage) {
        const minAttendees = selectedPackage.MinAttendees || selectedPackage.minAttendees || selectedPackage.MinimumAttendees || selectedPackage.minimumAttendees;
        const maxAttendees = selectedPackage.MaxAttendees || selectedPackage.maxAttendees || selectedPackage.MaximumAttendees || selectedPackage.maximumAttendees;
        const packageName = selectedPackage.PackageName || selectedPackage.name || 'This package';
        
        if (minAttendees && attendees < parseInt(minAttendees)) {
          return showValidationError(`"${packageName}" requires at least ${minAttendees} guests. You entered ${attendees} guests.`);
        }
        if (maxAttendees && attendees > parseInt(maxAttendees)) {
          return showValidationError(`"${packageName}" allows a maximum of ${maxAttendees} guests. You entered ${attendees} guests.`);
        }
      }
      
      // Check selected services attendee limits (only for per_attendee pricing model)
      for (const service of selectedServices) {
        const pricingModel = service.PricingModel || service.pricingModel;
        if (pricingModel === 'per_attendee' || pricingModel === 'per_person') {
          const minAttendees = service.MinAttendees || service.minAttendees || service.MinimumAttendees || service.minimumAttendees;
          const maxAttendees = service.MaxAttendees || service.maxAttendees || service.MaximumAttendees || service.maximumAttendees;
          const serviceName = service.ServiceName || service.name || service.serviceName;
          
          if (minAttendees && attendees < parseInt(minAttendees)) {
            return showValidationError(`"${serviceName}" requires at least ${minAttendees} guests. You entered ${attendees} guests.`);
          }
          if (maxAttendees && attendees > parseInt(maxAttendees)) {
            return showValidationError(`"${serviceName}" allows a maximum of ${maxAttendees} guests. You entered ${attendees} guests.`);
          }
        }
      }
      
      if (!selectedPackage && selectedServices.length === 0) {
        setShowNoSelectionModal(true);
        return false;
      }
      return true;
    }
    
    return true;
  };

  // Handle no selection confirmation
  const handleNoSelectionConfirm = () => {
    setShowNoSelectionModal(false);
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Handle leave confirmation
  const handleLeaveConfirm = () => {
    setShowLeaveConfirmModal(false);
    if (vendorData?.profile) {
      navigate(buildVendorProfileUrl(vendorData.profile));
    } else {
      navigate(`/vendor/${vendorSlug}`);
    }
  };

  // Navigation
  const nextStep = () => {
    if (!validateStep(currentStep)) {
      return;
    }
    
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const previousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goBackToVendor = () => {
    setShowLeaveConfirmModal(true);
  };

  // Check if vendor has instant booking enabled
  const isInstantBookingEnabled = vendorAvailability?.instantBookingEnabled || vendorData?.profile?.InstantBookingEnabled || false;

  // Calculate booking totals (shared between request and instant booking)
  // Uses the SAME logic as the sidebar price breakdown
  const calculateBookingTotals = () => {
    // Calculate total hours
    let totalHours = 0;
    if (bookingData.eventTime && bookingData.eventEndTime) {
      const start = new Date(`2000-01-01T${bookingData.eventTime}`);
      const end = new Date(`2000-01-01T${bookingData.eventEndTime}`);
      const diffMs = end - start;
      totalHours = diffMs > 0 ? diffMs / (1000 * 60 * 60) : 0;
    }

    // Calculate services subtotal (with hourly multiplier if applicable)
    const servicesSubtotal = selectedServices.reduce((sum, s) => {
      const price = parseFloat(s.VendorPrice || s.Price || s.BasePrice || s.baseRate || s.fixedPrice || s.price || 0);
      const pricingModel = s.PricingModel || s.pricingModel || '';
      const isHourly = pricingModel === 'time_based' || pricingModel === 'hourly';
      return sum + (isHourly && totalHours > 0 ? price * totalHours : price);
    }, 0);

    // Calculate package price (SAME logic as sidebar)
    const packagePriceType = selectedPackage?.PriceType || selectedPackage?.priceType || 'fixed_price';
    const isPackageHourly = packagePriceType === 'time_based' || packagePriceType === 'hourly';
    const packageBasePrice = selectedPackage 
      ? (selectedPackage.SalePrice && parseFloat(selectedPackage.SalePrice) < parseFloat(selectedPackage.Price) 
          ? parseFloat(selectedPackage.SalePrice) 
          : parseFloat(selectedPackage.BaseRate || selectedPackage.baseRate || selectedPackage.Price || selectedPackage.price || 0))
      : 0;
    const packagePriceCalc = isPackageHourly && totalHours > 0 ? packageBasePrice * totalHours : packageBasePrice;

    // Subtotal before fees
    const subtotal = servicesSubtotal + packagePriceCalc;

    // Platform Service Fee (from admin console settings)
    const platformFeePercent = (commissionSettings?.platformFeePercent || 5) / 100;
    const platformFee = subtotal * platformFeePercent;

    // Get province and tax info from event location
    const eventProvince = getProvinceFromLocation(bookingData.eventLocation);
    const taxInfo = getTaxInfoForProvince(eventProvince);
    const taxPercent = taxInfo.rate / 100;
    const taxableAmount = subtotal + platformFee;
    const taxAmount = taxableAmount * taxPercent;

    // Payment Processing Fee (Stripe: 2.9% + $0.30)
    const stripePercent = 0.029;
    const stripeFixed = 0.30;
    const processingFee = (subtotal * stripePercent) + stripeFixed;

    // Total (SAME as sidebar)
    const total = subtotal + platformFee + taxAmount + processingFee;

    const servicesWithPrices = selectedServices.map(s => {
      const price = parseFloat(s.VendorPrice || s.Price || s.BasePrice || s.baseRate || s.fixedPrice || s.price || 0);
      const pricingModel = s.PricingModel || s.pricingModel || '';
      const isHourly = pricingModel === 'time_based' || pricingModel === 'hourly';
      const calculatedPrice = isHourly && totalHours > 0 ? price * totalHours : price;
      return { ...s, calculatedPrice, hours: isHourly ? totalHours : null };
    });

    return { 
      totalHours, 
      servicesSubtotal, 
      packagePriceCalc, 
      subtotal, 
      servicesWithPrices, 
      platformFee, 
      taxAmount, 
      taxLabel: taxInfo.label,
      processingFee, 
      total 
    };
  };

  // Submit booking request (for non-instant booking vendors)
  const submitBookingRequest = async () => {
    if (!currentUser || !currentUser.id) {
      setProfileModalOpen(true);
      return;
    }

    setSubmitting(true);

    try {
      const { subtotal, servicesWithPrices, packagePriceCalc, platformFee, taxAmount, taxLabel, processingFee, total } = calculateBookingTotals();

      // Get tax info for the request
      const eventProvince = getProvinceFromLocation(bookingData.eventLocation);
      const taxInfo = getTaxInfoForProvince(eventProvince);

      const requestData = {
        userId: currentUser.id,
        vendorProfileId: parseInt(vendorId),
        eventName: bookingData.eventName,
        eventType: bookingData.eventType,
        eventDate: bookingData.eventDate,
        eventTime: bookingData.eventTime + ':00',
        eventEndTime: bookingData.eventEndTime ? bookingData.eventEndTime + ':00' : null,
        eventLocation: bookingData.eventLocation,
        attendeeCount: parseInt(bookingData.attendeeCount),
        services: servicesWithPrices,
        packageId: selectedPackage?.PackageID || null,
        packageName: selectedPackage?.PackageName || null,
        packagePrice: packagePriceCalc || null,
        budget: subtotal,
        specialRequestText: bookingData.specialRequests,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        // Send ALL calculated values - backend should NOT recalculate
        subtotal: subtotal,
        platformFee: platformFee,
        taxAmount: taxAmount,
        taxPercent: taxInfo.rate,
        taxLabel: taxLabel,
        processingFee: processingFee,
        grandTotal: total
      };

      const response = await apiPost('/bookings/requests/send', requestData);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to send booking request');
      }

      setSuccessModalType('request');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error submitting booking request:', error);
      setValidationError('Failed to send booking request: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle payment submission (called from PaymentCheckoutModal)
  const handlePaymentSubmit = async (stripe, elements, billingDetails = {}) => {
    if (!stripe || !elements) return;

    // Check if user is logged in
    if (!currentUser || !currentUser.id) {
      setProfileModalOpen(true);
      return;
    }

    setPaymentProcessing(true);
    setPaymentError('');

    try {
      const { subtotal, total, servicesWithPrices, packagePriceCalc } = calculateBookingTotals();
      const clientProvince = getProvinceFromLocation(bookingData.eventLocation);

      // Step 1: Create payment intent on backend
      const paymentIntentResponse = await fetch(`${API_BASE_URL}/payments/payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          amount: total,
          vendorProfileId: parseInt(vendorId),
          clientProvince: clientProvince,
          metadata: {
            eventName: bookingData.eventName,
            eventDate: bookingData.eventDate,
            vendorId: vendorId
          }
        })
      });

      const paymentIntentData = await paymentIntentResponse.json();
      
      if (!paymentIntentResponse.ok || !paymentIntentData.clientSecret) {
        throw new Error(paymentIntentData.message || 'Failed to create payment intent');
      }

      // Step 2: Confirm payment with card (supports both CardElement and CardNumberElement)
      const cardElement = elements.getElement(CardNumberElement) || elements.getElement(CardElement);
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
        paymentIntentData.clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: billingDetails.nameOnCard || currentUser?.name || currentUser?.email || 'Customer',
              address: {
                postal_code: billingDetails.postalCode || '',
                country: billingDetails.country === 'Canada' ? 'CA' : 'US'
              }
            },
          },
        }
      );

      if (confirmError) {
        setPaymentError(confirmError.message || 'Payment failed. Please try again.');
        setPaymentProcessing(false);
        return;
      }

      if (paymentIntent.status !== 'succeeded') {
        setPaymentError('Payment requires additional verification.');
        setPaymentProcessing(false);
        return;
      }

      // Get tax info for the booking
      const taxInfo = getTaxInfoForProvince(clientProvince);
      const taxRate = taxInfo?.totalRate || 0.13;
      const taxLabel = taxInfo?.label || 'HST 13%';
      const platformFeePercent = commissionSettings?.platformFeePercent || 5;
      const platformFee = subtotal * (platformFeePercent / 100);
      const taxAmount = subtotal * taxRate;
      const processingFee = (subtotal + platformFee + taxAmount) * 0.029 + 0.30;

      // Step 3: Create booking with payment intent ID
      const bookingResponse = await fetch(`${API_BASE_URL}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userId: currentUser.id,
          vendorProfileId: parseInt(vendorId),
          eventName: bookingData.eventName,
          eventType: bookingData.eventType,
          eventDate: bookingData.eventDate,
          eventTime: bookingData.eventTime + ':00',
          eventEndTime: bookingData.eventEndTime ? bookingData.eventEndTime + ':00' : null,
          eventLocation: bookingData.eventLocation,
          attendeeCount: parseInt(bookingData.attendeeCount),
          services: servicesWithPrices,
          packageId: selectedPackage?.PackageID || null,
          packageName: selectedPackage?.PackageName || null,
          packagePrice: packagePriceCalc || null,
          budget: total,
          specialRequestText: bookingData.specialRequests,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          isInstantBooking: true,
          paymentIntentId: paymentIntent.id,
          // Financial details
          subtotal: subtotal,
          platformFee: platformFee,
          taxAmount: taxAmount,
          taxPercent: taxRate * 100,
          taxLabel: taxLabel,
          processingFee: processingFee,
          grandTotal: total
        })
      });

      const bookingResult = await bookingResponse.json();
      
      if (!bookingResponse.ok || !bookingResult.success) {
        throw new Error(bookingResult.message || 'Failed to create booking');
      }

      // Success!
      setSuccessModalType('payment');
      setShowSuccessModal(true);
      setPaymentProcessing(false);

    } catch (error) {
      console.error('Payment error:', error);
      setPaymentError(error.message || 'Payment failed. Please try again.');
      setPaymentProcessing(false);
      throw error; // Re-throw so the modal can handle it
    }
  };

  // Format time for display
  const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDate = formatDateWithWeekday;

  // Get timezone info from vendor data
  const getVendorTimezoneInfo = () => {
    const profile = vendorData?.profile || {};
    const timezone = profile.TimeZone || 'America/Toronto';
    const abbr = profile.TimeZoneAbbr;
    
    // If we have the abbreviation from the database, use it
    if (abbr) {
      return { timezone, abbr };
    }
    
    // Otherwise, try to get it dynamically
    try {
      const date = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        timeZoneName: 'short'
      });
      const parts = formatter.formatToParts(date);
      const tzPart = parts.find(part => part.type === 'timeZoneName');
      return { 
        timezone, 
        abbr: tzPart ? tzPart.value : 'EST' 
      };
    } catch (error) {
      return { timezone, abbr: 'EST' };
    }
  };

  // Format service duration
  const formatDuration = (minutes) => {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ${mins} min`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      return `${mins} min`;
    }
  };

  // Calculate selected time slot duration in minutes
  const getSelectedTimeSlotDuration = () => {
    if (!bookingData.eventTime || !bookingData.eventEndTime) return null;
    
    const parseTime = (timeStr) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const startMinutes = parseTime(bookingData.eventTime);
    const endMinutes = parseTime(bookingData.eventEndTime);
    
    // Handle overnight bookings
    if (endMinutes < startMinutes) {
      return (24 * 60 - startMinutes) + endMinutes;
    }
    return endMinutes - startMinutes;
  };

  // Check if a service/package duration fits in the selected time slot
  const checkDurationFits = (itemDuration) => {
    const slotDuration = getSelectedTimeSlotDuration();
    if (!slotDuration || !itemDuration) return { fits: true, slotDuration: null, itemDuration: null };
    return { 
      fits: itemDuration <= slotDuration, 
      slotDuration, 
      itemDuration 
    };
  };

  // State for duration warning modal
  const [durationWarning, setDurationWarning] = useState(null);
  
  // State for attendee warning modal
  const [attendeeWarning, setAttendeeWarning] = useState(null);
  
  // Check if attendee count fits service/package limits
  const checkAttendeeFits = (item) => {
    const attendees = parseInt(bookingData.attendeeCount) || 0;
    // Check both PricingModel (services) and PriceType (packages)
    const pricingModel = item.PricingModel || item.pricingModel || item.PriceType || item.priceType;
    
    // Only check for per_attendee pricing model
    if (pricingModel !== 'per_attendee' && pricingModel !== 'per_person') {
      return { fits: true };
    }
    
    const minAttendees = item.MinAttendees || item.minAttendees || item.MinimumAttendees || item.minimumAttendees;
    const maxAttendees = item.MaxAttendees || item.maxAttendees || item.MaximumAttendees || item.maximumAttendees;
    
    if (minAttendees && attendees < parseInt(minAttendees)) {
      return { fits: false, min: minAttendees, max: maxAttendees, current: attendees, reason: 'below_min' };
    }
    if (maxAttendees && attendees > parseInt(maxAttendees)) {
      return { fits: false, min: minAttendees, max: maxAttendees, current: attendees, reason: 'above_max' };
    }
    return { fits: true };
  };

  const profile = vendorData?.profile || {};
  const businessName = profile.BusinessName || profile.Name || 'Vendor';
  // Removed category - not useful to display
  const rating = profile.AverageRating || profile.Rating || 0;
  const reviewCount = profile.ReviewCount || profile.TotalReviews || 0;
  const profilePic = profile.LogoURL || profile.FeaturedImageURL || profile.ProfilePictureURL || profile.ProfilePicture || '';

  return (
    <PageLayout variant="fullWidth" pageClassName="booking-page-layout">
      {/* Header */}
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

      {/* Page Header - Outside grid for proper alignment */}
      <div className="booking-page-header" style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 2rem 0' }}>
        {/* Back Button */}
        <button 
          className="back-button" 
          onClick={goBackToVendor}
          style={{ 
            marginBottom: '1rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            background: 'transparent',
            border: '1px solid #ddd',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.95rem',
            color: '#222'
          }}
        >
          <i className="fas fa-arrow-left"></i>
          Back to Vendor
        </button>

        {/* Breadcrumb Navigation */}
        {vendorData && (
          <Breadcrumb items={[
            vendorData.profile?.City || 'City',
            vendorData.categories?.[0]?.CategoryName || vendorData.profile?.CategoryName || vendorData.profile?.PrimaryCategory || vendorData.profile?.Category || 'Services',
            vendorData.profile?.BusinessName || 'Vendor Name',
            'Booking'
          ]} />
        )}

        <h1 className="booking-title" style={{ marginBottom: '1.5rem' }}>{isInstantBookingEnabled ? 'Book & Pay' : 'Request to book'}</h1>
      </div>

      {/* Main Content - Grid with aligned panels */}
      <div className="booking-container" style={{ paddingTop: 0 }}>
        {/* Left Side - Booking Form */}
        <div className="booking-form-section">
          <div className="booking-form-wrapper">
            {/* Accordion Step 1: Event Details */}
            <div 
              className={`accordion-step ${currentStep === 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}
              onClick={() => { if (currentStep > 1) { setCurrentStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }); } }}
            >
              <div className="accordion-step-header">
                <span className="accordion-step-number">1.</span>
                <span className="accordion-step-title">
                  {currentStep > 1 && bookingData.eventName 
                    ? `${bookingData.eventName} · ${bookingData.eventDate ? formatDate(bookingData.eventDate) : ''}`
                    : 'Your event details'
                  }
                </span>
              </div>
              {currentStep === 1 && (
                <div className="accordion-step-content">
                  {/* Validation Error Summary Banner */}
                  {Object.keys(fieldErrors).length > 0 && (
                    <div style={{
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '8px',
                      padding: '16px',
                      marginBottom: '20px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <i className="fas fa-exclamation-circle" style={{ color: '#dc2626' }}></i>
                        <span style={{ fontWeight: 600, color: '#dc2626' }}>Please fix the following errors:</span>
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '24px', color: '#b91c1c', fontSize: '0.9rem' }}>
                        {Object.values(fieldErrors).map((error, idx) => (
                          <li key={idx} style={{ marginBottom: '4px' }}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="form-group">
                    <label htmlFor="event-name" className="form-label">Event Name <span style={{ color: '#dc2626' }}>*</span></label>
                    <input
                      type="text"
                      id="event-name"
                      className="form-input"
                      placeholder="e.g., Sarah & John's Wedding"
                      value={bookingData.eventName}
                      onChange={(e) => {
                        handleInputChange(e);
                        if (fieldErrors.eventName) setFieldErrors(prev => ({ ...prev, eventName: null }));
                      }}
                      style={fieldErrors.eventName ? { borderColor: '#dc2626', boxShadow: '0 0 0 1px #dc2626' } : {}}
                    />
                    {fieldErrors.eventName && <span style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{fieldErrors.eventName}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="event-type" className="form-label">Event Type <span style={{ color: '#dc2626' }}>*</span></label>
                    <select
                      id="event-type"
                      className="form-input"
                      value={bookingData.eventType}
                      onChange={(e) => {
                        handleInputChange(e);
                        if (fieldErrors.eventType) setFieldErrors(prev => ({ ...prev, eventType: null }));
                      }}
                      style={fieldErrors.eventType ? { borderColor: '#dc2626', boxShadow: '0 0 0 1px #dc2626' } : {}}
                    >
                      <option value="">Select event type</option>
                      <option value="wedding">Wedding</option>
                      <option value="birthday">Birthday Party</option>
                      <option value="corporate">Corporate Event</option>
                      <option value="anniversary">Anniversary</option>
                      <option value="graduation">Graduation</option>
                      <option value="baby-shower">Baby Shower</option>
                      <option value="engagement">Engagement Party</option>
                      <option value="other">Other</option>
                    </select>
                    {fieldErrors.eventType && <span style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{fieldErrors.eventType}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Event Date & Time</label>
                    {/* Prefilled date banner */}
                    {hasPrefilledDate && bookingData.eventDate && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        marginBottom: '12px',
                        fontSize: '0.9rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#374151' }}>
                          <i className="fas fa-calendar-check"></i>
                          <span>Date pre-filled from your search</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setBookingData(prev => ({ ...prev, eventDate: '', eventTime: '', eventEndTime: '' }));
                            setHasPrefilledDate(false);
                            sessionStorage.removeItem('searchDateParams');
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#6b7280',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            textDecoration: 'underline',
                            padding: '0'
                          }}
                        >
                          Choose different date
                        </button>
                      </div>
                    )}
                    <SharedDateTimePicker
                      vendorId={vendorId}
                      businessHours={vendorData?.businessHours || vendorAvailability?.businessHours || []}
                      timezone={vendorData?.profile?.Timezone || null}
                      minBookingLeadTimeHours={vendorData?.profile?.MinBookingLeadTimeHours || vendorAvailability?.minBookingLeadTimeHours || 0}
                      selectedDate={bookingData.eventDate}
                      selectedStartTime={bookingData.eventTime}
                      selectedEndTime={bookingData.eventEndTime}
                      onDateChange={(date) => {
                        setBookingData(prev => ({ ...prev, eventDate: date, eventTime: '', eventEndTime: '' }));
                      }}
                      onStartTimeChange={(time) => {
                        setBookingData(prev => ({ ...prev, eventTime: time || '', eventEndTime: '' }));
                      }}
                      onEndTimeChange={(time) => {
                        setBookingData(prev => ({ ...prev, eventEndTime: time || '' }));
                      }}
                      showSaveDeleteButtons={false}
                      inline={true}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="attendee-count" className="form-label">Number of Guests</label>
                    <input
                      type="number"
                      id="attendee-count"
                      className="form-input"
                      placeholder="50"
                      min="1"
                      value={bookingData.attendeeCount}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="event-location" className="form-label">Event Location</label>
                    <input
                      ref={locationInputRef}
                      type="text"
                      id="event-location"
                      className="form-input"
                      placeholder="Enter address or city (Canada only)"
                      value={bookingData.eventLocation}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); nextStep(); }}
                      style={{
                        padding: '12px 24px',
                        background: '#222',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        fontWeight: 500,
                        cursor: 'pointer'
                      }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Accordion Step 2: Choose Services */}
            <div 
              className={`accordion-step ${currentStep === 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}
              onClick={() => { if (currentStep > 2) { setCurrentStep(2); window.scrollTo({ top: 0, behavior: 'smooth' }); } }}
            >
              <div className="accordion-step-header">
                <span className="accordion-step-number">2.</span>
                <span className="accordion-step-title">
                  {currentStep > 2 && (selectedPackage || selectedServices.length > 0)
                    ? selectedPackage 
                      ? selectedPackage.PackageName || selectedPackage.name
                      : `${selectedServices.length} service${selectedServices.length > 1 ? 's' : ''} selected`
                    : 'Choose a package or service'
                  }
                </span>
              </div>
              {currentStep === 2 && (
                <div className="accordion-step-content">
                  <PackageServiceTabs 
                    activeTab={step2Tab}
                    onTabChange={setStep2Tab}
                    packagesCount={packages.length}
                    servicesCount={services.length}
                  />
                  
                  {step2Tab === 'packages' && (
                  <PackageServiceList>
                    {loadingPackages ? (
                      <SkeletonLoader variant="service-card" count={3} />
                    ) : packages.length === 0 ? (
                      <PackageServiceEmpty type="packages" message="No packages available. Check the Services tab." />
                    ) : (
                      packages.map((pkg) => (
                        <PackageCard
                          key={pkg.PackageID}
                          pkg={pkg}
                          isSelected={selectedPackage?.PackageID === pkg.PackageID}
                          onClick={() => selectPackage(pkg)}
                          selectable={true}
                        />
                      ))
                    )}
                  </PackageServiceList>
                  )}
                  
                  {step2Tab === 'services' && (
                  <PackageServiceList>
                    {loadingServices ? (
                      <SkeletonLoader variant="service-card" count={3} />
                    ) : services.length === 0 ? (
                      <PackageServiceEmpty type="services" message="No individual services available." />
                    ) : (
                      services.map((service, index) => {
                        const serviceId = service.VendorServiceID || service.ServiceID || service.id || `service-${index}`;
                        const serviceName = service.ServiceName || service.name || '';
                        const serviceDuration = service.DurationMinutes || service.VendorDurationMinutes || service.baseDuration || service.vendorDuration || null;
                        
                        const isSelected = selectedServices.some(s => {
                          const sId = s.VendorServiceID || s.ServiceID || s.id;
                          const sName = s.ServiceName || s.name || '';
                          return sId === serviceId || (sName && sName === serviceName);
                        });
                        
                        const durationCheck = checkDurationFits(serviceDuration);
                        
                        return (
                          <ServiceCard
                            key={`${serviceId}-${serviceName}-${index}`}
                            service={service}
                            isSelected={isSelected}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedServices(selectedServices.filter(s => {
                                  const sId = s.VendorServiceID || s.ServiceID || s.id;
                                  const sName = s.ServiceName || s.name || '';
                                  return sId !== serviceId && sName !== serviceName;
                                }));
                              } else {
                                if (!durationCheck.fits) {
                                  setDurationWarning({
                                    type: 'service',
                                    name: serviceName,
                                    itemDuration: durationCheck.itemDuration,
                                    slotDuration: durationCheck.slotDuration
                                  });
                                } else {
                                  const attendeeCheck = checkAttendeeFits(service);
                                  if (!attendeeCheck.fits) {
                                    setAttendeeWarning({
                                      type: 'service',
                                      name: serviceName,
                                      min: attendeeCheck.min,
                                      max: attendeeCheck.max,
                                      current: attendeeCheck.current,
                                      reason: attendeeCheck.reason
                                    });
                                  } else {
                                    setSelectedServices([...selectedServices, service]);
                                  }
                                }
                              }
                            }}
                            selectable={true}
                          />
                        );
                      })
                    )}
                  </PackageServiceList>
                  )}
                  
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); nextStep(); }}
                      disabled={!selectedPackage && selectedServices.length === 0}
                      style={{
                        padding: '12px 24px',
                        background: (!selectedPackage && selectedServices.length === 0) ? '#ccc' : '#222',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        fontWeight: 500,
                        cursor: (!selectedPackage && selectedServices.length === 0) ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Accordion Step 3: Review & Pay */}
            <div 
              className={`accordion-step ${currentStep === 3 ? 'active' : ''}`}
            >
              <div 
                className="accordion-step-header"
                onClick={() => { if (currentStep >= 3) { setCurrentStep(3); window.scrollTo({ top: 0, behavior: 'smooth' }); } }}
              >
                <span className="accordion-step-number">3.</span>
                <span className="accordion-step-title">
                  {isInstantBookingEnabled ? 'Review & pay' : 'Write a message to the host'}
                </span>
              </div>
              {currentStep === 3 && (
                <div className="accordion-step-content">
                  <div className="form-group">
                    <label htmlFor="special-requests" className="form-label">
                      Message to vendor (optional)
                    </label>
                    <textarea
                      id="special-requests"
                      className="form-textarea"
                      rows="4"
                      placeholder="Add any special requests, dietary restrictions, or questions..."
                      value={bookingData.specialRequests}
                      onChange={handleInputChange}
                    ></textarea>
                  </div>

                  {isInstantBookingEnabled ? (
                    <>
                      <div style={{ 
                        padding: '20px', 
                        border: '1px solid #ddd', 
                        borderRadius: '12px', 
                        backgroundColor: '#fff',
                        marginBottom: '16px'
                      }}>
                        <div style={{ fontWeight: '600', color: '#222', marginBottom: '8px' }}>Pay in full</div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '16px' }}>
                          Pay ${calculateBookingTotals().total?.toFixed(2)} CAD now and your booking is confirmed instantly.
                        </div>
                        
                        <Elements stripe={stripePromise}>
                          <InlinePaymentForm 
                            onSubmit={handlePaymentSubmit}
                            isProcessing={paymentProcessing}
                            error={paymentError}
                            totalAmount={calculateBookingTotals().total}
                            currentUser={currentUser}
                            onLoginRequired={() => setProfileModalOpen(true)}
                          />
                        </Elements>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '20px 0' }}>
                        <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }}></div>
                        <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>OR</span>
                        <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }}></div>
                      </div>

                      <div style={{ 
                        padding: '20px', 
                        border: '1px solid #ddd', 
                        borderRadius: '12px', 
                        backgroundColor: '#fff'
                      }}>
                        <div style={{ fontWeight: '600', color: '#222', marginBottom: '8px' }}>Request to book</div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '16px' }}>
                          The vendor will review and respond within 24-48 hours.
                        </div>
                        
                        <button
                          onClick={() => {
                            if (!currentUser || !currentUser.id) {
                              setProfileModalOpen(true);
                              return;
                            }
                            submitBookingRequest();
                          }}
                          disabled={submitting}
                          style={{
                            width: '100%',
                            padding: '14px 24px',
                            background: '#222',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            fontWeight: 500,
                            cursor: submitting ? 'not-allowed' : 'pointer',
                            opacity: submitting ? 0.7 : 1
                          }}
                        >
                          {submitting ? 'Sending...' : 'Send Booking Request'}
                        </button>
                        <p style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'center', marginTop: '12px', marginBottom: 0 }}>
                          By proceeding, you agree to our <a href="/terms-of-service" style={{ color: '#5086E8' }}>Terms of Service</a> and <a href="/privacy-policy" style={{ color: '#5086E8' }}>Privacy Policy</a>
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                    <button
                      onClick={() => {
                        if (!currentUser || !currentUser.id) {
                          setProfileModalOpen(true);
                          return;
                        }
                        submitBookingRequest();
                      }}
                      disabled={submitting}
                      style={{
                        width: '100%',
                        padding: '14px 24px',
                        background: '#222',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        fontWeight: 500,
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        opacity: submitting ? 0.7 : 1
                      }}
                    >
                      {submitting ? 'Sending...' : 'Send Booking Request'}
                    </button>
                    <p style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'center', marginTop: '12px', marginBottom: 0 }}>
                      By proceeding, you agree to our <a href="/terms-of-service" style={{ color: '#5086E8' }}>Terms of Service</a> and <a href="/privacy-policy" style={{ color: '#5086E8' }}>Privacy Policy</a>
                    </p>
                    </>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Right Side - Booking Summary */}
        <div className="booking-summary-section">
          <div className="booking-summary-card">
            {!vendorData ? (
              /* Skeleton loading for vendor info */
              <div className="vendor-info" id="vendor-info">
                <div style={{ 
                  width: '64px', 
                  height: '64px', 
                  borderRadius: '50%', 
                  background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s infinite',
                  flexShrink: 0
                }}></div>
                <div className="vendor-details" style={{ flex: 1 }}>
                  <div style={{ 
                    height: '20px', 
                    width: '140px', 
                    background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.5s infinite',
                    borderRadius: '4px',
                    marginBottom: '8px'
                  }}></div>
                  <div style={{ 
                    height: '14px', 
                    width: '100px', 
                    background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.5s infinite',
                    borderRadius: '4px'
                  }}></div>
                </div>
              </div>
            ) : (
              <div className="vendor-info" id="vendor-info">
                {profilePic ? (
                  <div style={{ 
                    width: '64px', 
                    height: '64px', 
                    borderRadius: '50%', 
                    overflow: 'hidden', 
                    border: '2px solid #DDDDDD',
                    background: '#f7f7f7',
                    flexShrink: 0
                  }}>
                    <img src={profilePic} alt={businessName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ) : (
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: '#f7f7f7',
                    border: '2px solid #DDDDDD',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <i className="fas fa-store" style={{ fontSize: '24px', color: '#717171' }}></i>
                  </div>
                )}
                <div className="vendor-details">
                  <h3 className="vendor-name" style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 4px', color: '#222' }}>{businessName}</h3>
                  {/* Show host name with profile picture - clickable to open profile */}
                  {(() => {
                    const hostName = vendorData?.profile?.HostName || vendorData?.HostName || 
                      vendorData?.profile?.OwnerName || vendorData?.profile?.FirstName ||
                      (vendorData?.profile?.ContactFirstName && vendorData?.profile?.ContactLastName 
                        ? `${vendorData.profile.ContactFirstName} ${vendorData.profile.ContactLastName}` 
                        : vendorData?.profile?.ContactFirstName);
                    const hostProfilePic = vendorData?.profile?.HostProfileImage || vendorData?.profile?.ProfileImageURL;
                    const hostUserId = vendorData?.profile?.HostUserID || vendorData?.profile?.UserID;
                    return hostName ? (
                      <p 
                        style={{ fontSize: '0.875rem', color: '#717171', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '6px', cursor: hostUserId ? 'pointer' : 'default' }}
                        onClick={() => hostUserId && navigate(`/profile/${encodeUserId(hostUserId)}`)}
                      >
                        {hostProfilePic ? (
                          <img src={hostProfilePic} alt={hostName} style={{ width: '16px', height: '16px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <i className="fas fa-user" style={{ fontSize: '0.75rem' }}></i>
                        )}
                        Hosted by {hostName}
                      </p>
                    ) : null;
                  })()}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {rating > 0 ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem', color: '#222' }}>
                        <i className="fas fa-star" style={{ color: '#5086E8', fontSize: '0.8rem' }}></i>
                        {rating.toFixed(1)}
                        {reviewCount > 0 && (
                          <span style={{ color: '#717171' }}>({reviewCount} review{reviewCount !== 1 ? 's' : ''})</span>
                        )}
                      </span>
                    ) : (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem', color: '#717171' }}>
                        <i className="fas fa-check-circle" style={{ color: '#5086E8', fontSize: '0.8rem' }}></i>
                        Verified
                      </span>
                    )}
                    {vendorData?.profile?.City && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem', color: '#717171' }}>
                        <i className="fas fa-map-marker-alt" style={{ fontSize: '0.75rem' }}></i>
                        {vendorData.profile.City}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
            

            {/* Enhanced Event Details Display - Only show when user has entered data */}
            {(bookingData.eventName || bookingData.eventType || bookingData.eventDate || bookingData.attendeeCount || bookingData.eventLocation) && (
              <>
                <div className="summary-divider"></div>
                <div className="booking-details-animate" style={{ padding: '16px 0' }}>
                  {/* Event Name */}
                  {bookingData.eventName && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#717171', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                        Event
                      </div>
                      <div style={{ fontSize: '1rem', color: '#222', fontWeight: 500 }}>
                        {bookingData.eventName}
                      </div>
                    </div>
                  )}

                  {/* Event Type */}
                  {bookingData.eventType && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#717171', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                        Type
                      </div>
                      <div style={{ fontSize: '0.95rem', color: '#222' }}>
                        {bookingData.eventType.charAt(0).toUpperCase() + bookingData.eventType.slice(1).replace('-', ' ')}
                      </div>
                    </div>
                  )}

                  {/* Date & Time */}
                  {bookingData.eventDate && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#717171', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                        Date & Time
                      </div>
                      <div style={{ fontSize: '0.95rem', color: '#222', fontWeight: 500 }}>
                        {formatDate(bookingData.eventDate)}
                      </div>
                      {bookingData.eventTime && bookingData.eventEndTime && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                          <span style={{ fontSize: '0.9rem', color: '#222' }}>{formatTime(bookingData.eventTime)}</span>
                          <span style={{ color: '#9ca3af' }}>→</span>
                          <span style={{ fontSize: '0.9rem', color: '#222' }}>{formatTime(bookingData.eventEndTime)}</span>
                          {(() => {
                            const start = new Date(`2000-01-01T${bookingData.eventTime}`);
                            const end = new Date(`2000-01-01T${bookingData.eventEndTime}`);
                            const diffMs = end - start;
                            const totalHours = diffMs > 0 ? diffMs / (1000 * 60 * 60) : 0;
                            return totalHours > 0 ? (
                              <span style={{ fontSize: '0.85rem', color: '#6b7280', marginLeft: '8px' }}>
                                ({totalHours % 1 === 0 ? totalHours : totalHours.toFixed(1)} hrs)
                              </span>
                            ) : null;
                          })()}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Guest Count */}
                  {bookingData.attendeeCount && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#717171', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                        Guests
                      </div>
                      <div style={{ fontSize: '0.95rem', color: '#222' }}>
                        {bookingData.attendeeCount} guests
                      </div>
                    </div>
                  )}

                  {/* Event Location */}
                  {bookingData.eventLocation && (
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#717171', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                        Location
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#222' }}>
                        {bookingData.eventLocation}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Giggster-style Price Breakdown - Only show when items selected */}
            {(selectedServices.length > 0 || selectedPackage) && (
              <>
                <div className="summary-divider"></div>
                <div style={{ padding: '16px 0', position: 'relative' }}>
                  {(() => {
                    // Calculate total hours
                    let totalHours = 0;
                    if (bookingData.eventTime && bookingData.eventEndTime) {
                      const start = new Date(`2000-01-01T${bookingData.eventTime}`);
                      const end = new Date(`2000-01-01T${bookingData.eventEndTime}`);
                      const diffMs = end - start;
                      totalHours = diffMs > 0 ? diffMs / (1000 * 60 * 60) : 0;
                    }

                    // Calculate services subtotal (with hourly multiplier if applicable)
                    const servicesSubtotal = selectedServices.reduce((sum, s) => {
                      const price = parseFloat(s.VendorPrice || s.Price || s.BasePrice || s.baseRate || s.fixedPrice || s.price || 0);
                      const pricingModel = s.PricingModel || s.pricingModel || '';
                      const isHourly = pricingModel === 'time_based' || pricingModel === 'hourly';
                      return sum + (isHourly && totalHours > 0 ? price * totalHours : price);
                    }, 0);

                    // Calculate package price (with hourly multiplier if applicable)
                    const packagePriceType = selectedPackage?.PriceType || selectedPackage?.priceType || 'fixed_price';
                    const isPackageHourly = packagePriceType === 'time_based' || packagePriceType === 'hourly';
                    const packageBasePrice = selectedPackage 
                      ? (selectedPackage.SalePrice && parseFloat(selectedPackage.SalePrice) < parseFloat(selectedPackage.Price) 
                          ? parseFloat(selectedPackage.SalePrice) 
                          : parseFloat(selectedPackage.BaseRate || selectedPackage.baseRate || selectedPackage.Price || selectedPackage.price || 0))
                      : 0;
                    const packagePrice = isPackageHourly && totalHours > 0 ? packageBasePrice * totalHours : packageBasePrice;

                    // Subtotal before fees
                    const subtotal = servicesSubtotal + packagePrice;

                    // Platform Service Fee (from admin console settings)
                    const platformFeePercent = (commissionSettings.platformFeePercent || 5) / 100;
                    const platformFee = subtotal * platformFeePercent;

                    // Get province and tax info from event location using shared utility
                    const eventProvince = getProvinceFromLocation(bookingData.eventLocation);
                    const taxInfo = getTaxInfoForProvince(eventProvince);
                    const taxPercent = taxInfo.rate / 100;
                    const taxableAmount = subtotal + platformFee;
                    const tax = taxableAmount * taxPercent;

                    // Payment Processing Fee (Stripe: 2.9% + $0.30) - calculated on subtotal only
                    const stripePercent = 0.029;
                    const stripeFixed = 0.30;
                    const stripeFee = (subtotal * stripePercent) + stripeFixed;

                    // Total
                    const total = subtotal + platformFee + tax + stripeFee;

                    // Tooltip component
                    const TooltipIcon = ({ id, children }) => (
                      <div style={{ position: 'relative', display: 'inline-flex' }}>
                        <div 
                          onClick={() => setActiveTooltip(activeTooltip === id ? null : id)}
                          onMouseEnter={() => setActiveTooltip(id)}
                          onMouseLeave={() => setActiveTooltip(null)}
                          style={{ 
                            width: '16px', 
                            height: '16px', 
                            borderRadius: '50%', 
                            border: '1px solid #d1d5db',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            background: activeTooltip === id ? '#f3f4f6' : 'transparent'
                          }}
                        >
                          <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>?</span>
                        </div>
                        {activeTooltip === id && (
                          <div style={{
                            position: 'absolute',
                            bottom: '100%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            marginBottom: '8px',
                            padding: '12px 14px',
                            background: '#fff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            width: '220px',
                            zIndex: 1000,
                            fontSize: '0.85rem',
                            color: '#374151',
                            lineHeight: 1.5
                          }}>
                            {children}
                            <div style={{
                              position: 'absolute',
                              bottom: '-6px',
                              left: '50%',
                              transform: 'translateX(-50%) rotate(45deg)',
                              width: '10px',
                              height: '10px',
                              background: '#fff',
                              borderRight: '1px solid #e5e7eb',
                              borderBottom: '1px solid #e5e7eb'
                            }}></div>
                          </div>
                        )}
                      </div>
                    );

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {/* Package line item */}
                        {selectedPackage && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <span style={{ color: '#222', fontSize: '0.95rem' }}>
                                {selectedPackage.PackageName || selectedPackage.name}
                              </span>
                              {isPackageHourly && totalHours > 0 && (
                                <span style={{ color: '#6b7280', fontSize: '0.85rem', marginLeft: '4px' }}>
                                  ({formatCurrency(packageBasePrice)} × {totalHours % 1 === 0 ? totalHours : totalHours.toFixed(1)} hrs)
                                </span>
                              )}
                              {selectedPackage.PriceType === 'per_person' && bookingData.attendeeCount && (
                                <span style={{ color: '#6b7280', fontSize: '0.85rem', marginLeft: '4px' }}>
                                  × {bookingData.attendeeCount}
                                </span>
                              )}
                            </div>
                            <span style={{ color: '#222', fontSize: '0.95rem', fontWeight: 500 }}>
                              {formatCurrency(packagePrice)}
                            </span>
                          </div>
                        )}

                        {/* Services line items */}
                        {selectedServices.map((s, idx) => {
                          const servicePrice = parseFloat(s.VendorPrice || s.Price || s.BasePrice || s.baseRate || s.fixedPrice || s.price || 0);
                          const pricingModel = s.PricingModel || s.pricingModel || '';
                          const isHourly = pricingModel === 'time_based' || pricingModel === 'hourly';
                          const calculatedPrice = isHourly && totalHours > 0 ? servicePrice * totalHours : servicePrice;
                          
                          return (
                            <div key={s.VendorServiceID || s.ServiceID || s.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <span style={{ color: '#222', fontSize: '0.95rem' }}>
                                  {s.ServiceName || s.name}
                                </span>
                                {isHourly && totalHours > 0 && (
                                  <span style={{ color: '#6b7280', fontSize: '0.85rem', marginLeft: '4px' }}>
                                    ({formatCurrency(servicePrice)} × {totalHours % 1 === 0 ? totalHours : totalHours.toFixed(1)} hrs)
                                  </span>
                                )}
                              </div>
                              <span style={{ color: '#222', fontSize: '0.95rem', fontWeight: 500 }}>
                                {formatCurrency(calculatedPrice)}
                              </span>
                            </div>
                          );
                        })}

                        {/* Subtotal */}
                        <div style={{ borderTop: '1px solid #e5e7eb', margin: '4px 0', paddingTop: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#222', fontSize: '0.95rem' }}>Subtotal</span>
                            <span style={{ color: '#222', fontSize: '0.95rem', fontWeight: 500 }}>
                              {formatCurrency(subtotal)}
                            </span>
                          </div>
                        </div>

                        {/* Platform Service Fee */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>Platform Service Fee</span>
                            <TooltipIcon id="platform-fee">
                              This helps us cover transaction fees and provide support for your booking.
                            </TooltipIcon>
                          </div>
                          <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                            {formatCurrency(platformFee)}
                          </span>
                        </div>

                        {/* Tax (Province-based) */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>Tax ({taxInfo.label})</span>
                            <TooltipIcon id="tax-info">
                              Tax is calculated based on the location of your event. {eventProvince ? `Event in ${eventProvince}.` : 'Enter your event location in Step 1 for accurate tax calculation.'}
                            </TooltipIcon>
                          </div>
                          <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                            {formatCurrency(tax)}
                          </span>
                        </div>

                        {/* Payment Processing Fee */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>Payment Processing Fee</span>
                            <TooltipIcon id="processing-fee">
                              This helps us cover transaction fees and provide support for your booking.
                            </TooltipIcon>
                          </div>
                          <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                            {formatCurrency(stripeFee)}
                          </span>
                        </div>

                        {/* Total */}
                        <div style={{ borderTop: '1px solid #e5e7eb', margin: '4px 0', paddingTop: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#222', fontSize: '1rem', fontWeight: 600 }}>Total</span>
                            <span style={{ color: '#222', fontSize: '1.15rem', fontWeight: 700 }}>
                              {formatCurrency(total)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div className="summary-divider"></div>
              </>
            )}

            {/* Booking Info Section - Instant Booking, Cancellation, Lead Time */}
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #ebebeb' }}>
              {/* Instant Booking */}
              {isInstantBookingEnabled && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
                  <i className="fas fa-bolt" style={{ fontSize: '16px', color: '#222', width: '20px', marginTop: '2px' }}></i>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#222' }}>Instant Booking</div>
                    <div style={{ fontSize: '0.8rem', color: '#717171' }}>Book and pay now without waiting for vendor approval</div>
                  </div>
                </div>
              )}

              {/* Cancellation Policy */}
              {cancellationPolicy && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
                  <i className="fas fa-calendar-check" style={{ fontSize: '16px', color: '#222', width: '20px', marginTop: '2px' }}></i>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#222' }}>
                      {cancellationPolicy.Name || 'Free cancellation'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#717171' }}>
                      {cancellationPolicy.CancellationDays 
                        ? `Free cancellation up to ${cancellationPolicy.CancellationDays} days before`
                        : cancellationPolicy.Description || 'Flexible cancellation policy'}
                    </div>
                  </div>
                </div>
              )}

              {/* Lead Time */}
              {vendorData?.profile?.MinBookingLeadTimeHours > 0 && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <i className="fas fa-clock" style={{ fontSize: '16px', color: '#222', width: '20px', marginTop: '2px' }}></i>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#222' }}>Advance notice required</div>
                    <div style={{ fontSize: '0.8rem', color: '#717171' }}>
                      {vendorData.profile.MinBookingLeadTimeHours >= 168 
                        ? `Book at least ${Math.floor(vendorData.profile.MinBookingLeadTimeHours / 168)} week${Math.floor(vendorData.profile.MinBookingLeadTimeHours / 168) > 1 ? 's' : ''} in advance`
                        : vendorData.profile.MinBookingLeadTimeHours >= 24 
                          ? `Book at least ${Math.floor(vendorData.profile.MinBookingLeadTimeHours / 24)} day${Math.floor(vendorData.profile.MinBookingLeadTimeHours / 24) > 1 ? 's' : ''} in advance`
                          : `Book at least ${vendorData.profile.MinBookingLeadTimeHours} hours in advance`}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Duration Warning Modal */}
      {durationWarning && (
        <UniversalModal
          isOpen={!!durationWarning}
          onClose={() => setDurationWarning(null)}
          title="Duration Doesn't Fit"
          size="small"
          footerCentered={true}
          primaryAction={{
            label: 'Go to Step 1',
            onClick: () => {
              setDurationWarning(null);
              setCurrentStep(1);
            }
          }}
          secondaryAction={{
            label: 'Choose Another',
            onClick: () => setDurationWarning(null)
          }}
        >
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#fef3c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem'
            }}>
              <i className="fas fa-exclamation-triangle" style={{ fontSize: '28px', color: '#f59e0b' }}></i>
            </div>
            <p style={{ color: '#6b7280', marginBottom: '1rem', lineHeight: 1.6 }}>
              The <strong>{durationWarning.name}</strong> {durationWarning.type} requires <strong>{formatDuration(durationWarning.itemDuration)}</strong>, 
              but your selected time slot is only <strong>{formatDuration(durationWarning.slotDuration)}</strong>.
            </p>
            <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
              Please go back to Step 1 to select a longer time slot, or choose a different {durationWarning.type}.
            </p>
          </div>
        </UniversalModal>
      )}

      {/* Attendee Warning Modal */}
      {attendeeWarning && (
        <UniversalModal
          isOpen={!!attendeeWarning}
          onClose={() => setAttendeeWarning(null)}
          title="Guest Count Doesn't Match"
          size="small"
          footerCentered={true}
          primaryAction={{
            label: 'Go to Step 1',
            onClick: () => {
              setAttendeeWarning(null);
              setCurrentStep(1);
            }
          }}
          secondaryAction={{
            label: 'Choose Another',
            onClick: () => setAttendeeWarning(null)
          }}
        >
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#fef3c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem'
            }}>
              <i className="fas fa-users" style={{ fontSize: '28px', color: '#f59e0b' }}></i>
            </div>
            <p style={{ color: '#6b7280', marginBottom: '1rem', lineHeight: 1.6 }}>
              The <strong>{attendeeWarning.name}</strong> {attendeeWarning.type} requires <strong>{attendeeWarning.min}-{attendeeWarning.max} guests</strong>, 
              but you entered <strong>{attendeeWarning.current} guests</strong>.
            </p>
            <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
              Please go back to Step 1 to update your guest count, or choose a different {attendeeWarning.type}.
            </p>
          </div>
        </UniversalModal>
      )}

      {/* Success Modal with Confetti */}
      {showSuccessModal && (
        <div id="success-modal" className="modal">
          {/* Confetti Animation */}
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10001, overflow: 'hidden' }}>
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  width: `${Math.random() * 10 + 5}px`,
                  height: `${Math.random() * 10 + 5}px`,
                  background: ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899'][Math.floor(Math.random() * 6)],
                  borderRadius: Math.random() > 0.5 ? '50%' : '0',
                  left: `${Math.random() * 100}%`,
                  top: '-20px',
                  animation: `confetti-fall ${Math.random() * 3 + 2}s linear forwards`,
                  animationDelay: `${Math.random() * 2}s`,
                  transform: `rotate(${Math.random() * 360}deg)`
                }}
              />
            ))}
          </div>
          <style>{`
            @keyframes confetti-fall {
              0% { transform: translateY(0) rotate(0deg); opacity: 1; }
              100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
            }
          `}</style>
          <div className="modal-content success-modal-content">
            <div className="success-icon" style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem'
            }}>
              <i className="fas fa-check" style={{ fontSize: '28px', color: 'white' }}></i>
            </div>
            <h2 style={{ marginBottom: '0.5rem' }}>{successModalType === 'payment' ? 'Booking Confirmed!' : 'Request Sent Successfully!'}</h2>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
              {successModalType === 'payment' 
                ? 'Your booking has been confirmed and payment processed successfully.' 
                : 'Your booking request has been sent to the vendor.'}
            </p>
            
            <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem', marginBottom: '2rem', textAlign: 'left' }}>
              <div style={{ fontWeight: 600, color: '#374151', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                What happens next?
              </div>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem', lineHeight: 1.6 }}>
                {successModalType === 'payment' 
                  ? 'The vendor has been notified of your booking. You can view your booking details and communicate with the vendor from your dashboard.'
                  : 'The vendor will review your request and respond within 24 hours. You\'ll receive a notification when they respond.'}
              </p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
              <button
                onClick={() => navigate('/dashboard?section=bookings')}
                style={{
                  width: '100%',
                  padding: '0.875rem 1.5rem',
                  background: '#222',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                View My Bookings
              </button>
              <button
                onClick={() => {
                  if (vendorData?.profile) {
                    navigate(buildVendorProfileUrl(vendorData.profile));
                  } else {
                    navigate(`/vendor/${vendorSlug}`);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '0.875rem 1.5rem',
                  background: '#fff',
                  color: '#222',
                  border: '1px solid #222',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Back to Vendor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      <ProfileModal 
        isOpen={profileModalOpen} 
        onClose={() => setProfileModalOpen(false)} 
      />

      
      {/* Messaging Widget */}
      <MessagingWidget />

      {/* Leave Confirmation Modal */}
      <ConfirmationModal
        isOpen={showLeaveConfirmModal}
        onClose={() => setShowLeaveConfirmModal(false)}
        title="Leave Booking?"
        message="Are you sure you want to leave? Your booking information will be lost."
        confirmLabel="Leave"
        cancelLabel="Stay"
        onConfirm={handleLeaveConfirm}
        variant="warning"
      />

      {/* No Selection Confirmation Modal */}
      <ConfirmationModal
        isOpen={showNoSelectionModal}
        onClose={() => setShowNoSelectionModal(false)}
        title="No Package or Services Selected"
        message="You haven't selected a package or services. Do you want to continue anyway?"
        confirmLabel="Continue"
        cancelLabel="Go Back"
        onConfirm={handleNoSelectionConfirm}
        variant="info"
      />

      {/* Validation Error Modal */}
      <ConfirmationModal
        isOpen={!!validationError}
        onClose={() => setValidationError(null)}
        title="Missing Information"
        message={validationError || ''}
        confirmLabel="OK"
        cancelLabel={null}
        onConfirm={() => setValidationError(null)}
        variant="warning"
      />
    </PageLayout>
  );
}

export default BookingPage;
