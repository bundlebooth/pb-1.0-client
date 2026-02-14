import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import { showBanner } from '../utils/helpers';

function BookingWizard({ vendorId, onClose, onSuccess }) {
  const { currentUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [vendor, setVendor] = useState(null);
  const [services, setServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    if (vendorId) {
      loadVendorData();
    }
  }, [vendorId]);

  const loadVendorData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/vendors/${vendorId}`);
      if (!response.ok) throw new Error('Failed to load vendor');
      const data = await response.json();
      setVendor(data.data);
    } catch (error) {
      console.error('Error loading vendor:', error);
      showBanner('Failed to load vendor information', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/vendors/${vendorId}/selected-services`);
      if (!response.ok) throw new Error('Failed to load services');
      const data = await response.json();
      setServices(data.selectedServices || []);
    } catch (error) {
      console.error('Error loading services:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setBookingData(prev => ({ ...prev, [field]: value }));
  };

  const toggleService = (service) => {
    const serviceId = service.PredefinedServiceID || service.VendorSelectedServiceID;
    const isSelected = selectedServices.some(s => s.id === serviceId);
    
    if (isSelected) {
      setSelectedServices(prev => prev.filter(s => s.id !== serviceId));
    } else {
      setSelectedServices(prev => [...prev, {
        id: serviceId,
        name: service.ServiceName,
        price: service.VendorPrice || 0
      }]);
    }
  };

  const validateStep = (step) => {
    if (step === 1) {
      if (!bookingData.eventName.trim()) {
        showBanner('Please enter an event name', 'error');
        return false;
      }
      if (!bookingData.eventType) {
        showBanner('Please select an event type', 'error');
        return false;
      }
      if (!bookingData.eventDate) {
        showBanner('Please select an event date', 'error');
        return false;
      }
      if (!bookingData.eventTime) {
        showBanner('Please select a start time', 'error');
        return false;
      }
      if (!bookingData.eventEndTime) {
        showBanner('Please select an end time', 'error');
        return false;
      }
      if (!bookingData.attendeeCount || bookingData.attendeeCount < 1) {
        showBanner('Please enter the number of guests', 'error');
        return false;
      }
      if (!bookingData.eventLocation.trim()) {
        showBanner('Please enter the event location', 'error');
        return false;
      }
      return true;
    }
    return true;
  };

  const nextStep = () => {
    if (!validateStep(currentStep)) return;
    
    if (currentStep === 2 && services.length === 0) {
      loadServices();
    }
    
    if (currentStep < 3) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const submitBooking = async () => {
    if (!currentUser) {
      showBanner('Please log in to submit a booking request', 'error');
      return;
    }

    try {
      // Build services array with proper structure
      const servicesData = selectedServices.map(s => ({
        id: s.id,
        name: s.name,
        price: s.price || 0
      }));

      const payload = {
        userId: currentUser.id,
        vendorProfileId: vendorId,
        eventName: bookingData.eventName,
        eventType: bookingData.eventType,
        eventDate: bookingData.eventDate,
        eventTime: bookingData.eventTime + ':00',
        eventEndTime: bookingData.eventEndTime ? bookingData.eventEndTime + ':00' : null,
        attendeeCount: parseInt(bookingData.attendeeCount),
        eventLocation: bookingData.eventLocation,
        specialRequestText: bookingData.specialRequests || '',
        services: servicesData,
        budget: servicesData.reduce((sum, s) => sum + (s.price || 0), 0),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };

      const response = await fetch(`${API_BASE_URL}/bookings/requests/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Failed to submit booking request');

      showBanner('Booking request sent successfully!', 'success');
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (error) {
      console.error('Error submitting booking:', error);
      showBanner('Failed to submit booking request', 'error');
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="booking-wizard-modal">
        <div className="booking-wizard-content">
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div className="loading-spinner"></div>
            <p style={{ marginTop: '1rem' }}>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-wizard-modal" onClick={onClose}>
      <div className="booking-wizard-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} style={{
          background: '#f3f4f6',
          border: 'none',
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          fontSize: '20px',
          color: '#6b7280',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>×</button>

        <div className="booking-container">
          {/* Left Side - Form */}
          <div className="booking-form-section">
            <h1 className="booking-title">Request to book</h1>

            {/* Step 1: Event Details */}
            {currentStep === 1 && (
              <div className="booking-step">
                <div className="step-header">
                  <div className="step-number-circle">1</div>
                  <h2 className="step-title">Your Event Details</h2>
                </div>

                <div className="form-group">
                  <label className="form-label">Event Name <span className="required-asterisk">*</span></label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., Sarah & John's Wedding"
                    value={bookingData.eventName}
                    onChange={(e) => handleInputChange('eventName', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Event Type <span className="required-asterisk">*</span></label>
                  <select
                    className="form-input"
                    value={bookingData.eventType}
                    onChange={(e) => handleInputChange('eventType', e.target.value)}
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
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Event Date <span className="required-asterisk">*</span></label>
                    <input
                      type="date"
                      className="form-input"
                      min={new Date().toISOString().split('T')[0]}
                      value={bookingData.eventDate}
                      onChange={(e) => handleInputChange('eventDate', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Start Time <span className="required-asterisk">*</span></label>
                    <input
                      type="time"
                      className="form-input"
                      value={bookingData.eventTime}
                      onChange={(e) => handleInputChange('eventTime', e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">End Time <span className="required-asterisk">*</span></label>
                    <input
                      type="time"
                      className="form-input"
                      value={bookingData.eventEndTime}
                      onChange={(e) => handleInputChange('eventEndTime', e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Number of Guests <span className="required-asterisk">*</span></label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="50"
                      min="1"
                      value={bookingData.attendeeCount}
                      onChange={(e) => handleInputChange('attendeeCount', e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Event Location <span className="required-asterisk">*</span></label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter address or venue"
                    value={bookingData.eventLocation}
                    onChange={(e) => handleInputChange('eventLocation', e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Services */}
            {currentStep === 2 && (
              <div className="booking-step">
                <div className="step-header">
                  <div className="step-number-circle">2</div>
                  <h2 className="step-title">Choose Services</h2>
                </div>
                <p className="step-description">Select the services you'd like to book</p>

                <div className="services-list">
                  {services.length === 0 ? (
                    <div className="no-services">
                      <i className="fas fa-info-circle"></i>
                      <p>This vendor hasn't listed specific services yet. You can still send a booking request.</p>
                    </div>
                  ) : (
                    services.map(service => {
                      const serviceId = service.PredefinedServiceID || service.VendorSelectedServiceID;
                      const isSelected = selectedServices.some(s => s.id === serviceId);
                      
                      return (
                        <div
                          key={serviceId}
                          className={`service-card ${isSelected ? 'selected' : ''}`}
                          onClick={() => toggleService(service)}
                        >
                          <div className="service-icon-container">
                            <i className="fas fa-concierge-bell"></i>
                          </div>
                          <div className="service-content">
                            <h4 className="service-name">{service.ServiceName}</h4>
                            <div className="service-meta">
                              <span className="service-category">
                                <i className="fas fa-tag"></i>
                                {service.Category || 'Service'}
                              </span>
                            </div>
                          </div>
                          <div className="service-checkbox">
                            <i className="fas fa-check" style={{ display: isSelected ? 'block' : 'none' }}></i>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {currentStep === 3 && (
              <div className="booking-step">
                <div className="step-header">
                  <div className="step-number-circle">3</div>
                  <h2 className="step-title">Review your request</h2>
                </div>

                <div className="review-section">
                  <h3 className="review-subtitle">Event Details</h3>
                  <div className="review-item">
                    <span className="review-label">Event:</span>
                    <span className="review-value">{bookingData.eventName}</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Type:</span>
                    <span className="review-value">{bookingData.eventType}</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Date & Time:</span>
                    <span className="review-value">
                      {new Date(bookingData.eventDate).toLocaleDateString()} at {formatTime(bookingData.eventTime)}
                      {bookingData.eventEndTime && ` - ${formatTime(bookingData.eventEndTime)}`}
                    </span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Guests:</span>
                    <span className="review-value">{bookingData.attendeeCount}</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Location:</span>
                    <span className="review-value">{bookingData.eventLocation}</span>
                  </div>
                </div>

                {selectedServices.length > 0 && (
                  <div className="review-section">
                    <h3 className="review-subtitle">Selected Services</h3>
                    {selectedServices.map(service => (
                      <div key={service.id} className="review-service-item">
                        {service.name}
                      </div>
                    ))}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Special Requests or Questions (Optional)</label>
                  <textarea
                    className="form-textarea"
                    rows="4"
                    placeholder="Add any special requests, dietary restrictions, or questions..."
                    value={bookingData.specialRequests}
                    onChange={(e) => handleInputChange('specialRequests', e.target.value)}
                  />
                </div>

                <div className="info-box">
                  <i className="fas fa-info-circle"></i>
                  <div>
                    <strong>What happens next?</strong>
                    <p>The vendor will review your request and respond within 24 hours.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="form-actions">
              {currentStep > 1 && (
                <button className="btn btn-secondary" onClick={prevStep}>
                  <i className="fas fa-arrow-left"></i> Back
                </button>
              )}
              {currentStep < 3 ? (
                <button className="btn btn-primary" onClick={nextStep}>
                  Next <i className="fas fa-arrow-right"></i>
                </button>
              ) : (
                <button className="btn btn-primary" onClick={submitBooking}>
                  <i className="fas fa-paper-plane"></i> Send Request
                </button>
              )}
            </div>
          </div>

          {/* Right Side - Summary */}
          <div className="booking-summary-section">
            <div className="booking-summary-card">
              {vendor && (
                <div className="vendor-info">
                  <div className="vendor-details">
                    <h3 className="vendor-name">{vendor.profile?.BusinessName || 'Vendor'}</h3>
                    <p className="vendor-category">{vendor.profile?.PrimaryCategory || 'Event Services'}</p>
                  </div>
                </div>
              )}

              <div className="summary-divider"></div>

              <div className="booking-summary-details">
                <h4 className="summary-title">Booking Summary</h4>
                
                {bookingData.eventDate && (
                  <div className="summary-item">
                    <i className="fas fa-calendar"></i>
                    <div>
                      <div className="summary-label">Date</div>
                      <div className="summary-value">{new Date(bookingData.eventDate).toLocaleDateString()}</div>
                    </div>
                  </div>
                )}

                {bookingData.eventTime && (
                  <div className="summary-item">
                    <i className="fas fa-clock"></i>
                    <div>
                      <div className="summary-label">Time</div>
                      <div className="summary-value">
                        {formatTime(bookingData.eventTime)}
                        {bookingData.eventEndTime && ` - ${formatTime(bookingData.eventEndTime)}`}
                      </div>
                    </div>
                  </div>
                )}

                {bookingData.attendeeCount && (
                  <div className="summary-item">
                    <i className="fas fa-users"></i>
                    <div>
                      <div className="summary-label">Guests</div>
                      <div className="summary-value">{bookingData.attendeeCount} guests</div>
                    </div>
                  </div>
                )}

                {selectedServices.length > 0 && (
                  <div className="summary-item">
                    <i className="fas fa-list"></i>
                    <div>
                      <div className="summary-label">Services</div>
                      <div className="summary-value">{selectedServices.length} service{selectedServices.length > 1 ? 's' : ''}</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="summary-divider"></div>

              <div className="info-notice">
                <i className="fas fa-shield-alt"></i>
                <p>This is a free request. You won't be charged until you confirm with the vendor.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BookingWizard;
