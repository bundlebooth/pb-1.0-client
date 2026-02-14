import React from 'react';

/**
 * ContactStep - Vendor onboarding step for contact information
 * Extracted from BecomeVendorPage.js for better maintainability
 */
function ContactStep({ formData, onInputChange }) {
  return (
    <div className="contact-step">
      {/* Intro Section */}
      <div style={{ marginBottom: '1.5rem', padding: '1.25rem', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <i className="fas fa-phone-alt" style={{ color: '#5086E8', fontSize: '1rem' }}></i>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#111827' }}>
            Contact Information
          </h3>
        </div>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem', lineHeight: 1.5 }}>
          Provide your contact details so clients can reach you easily.
        </p>
      </div>

      <div className="form-group">
        <label>Business Phone <span style={{ color: '#ef4444' }}>*</span></label>
        <input
          type="tel"
          value={formData.businessPhone}
          onChange={(e) => onInputChange('businessPhone', e.target.value)}
          className="form-input"
          placeholder="(555) 123-4567"
        />
      </div>

      <div className="form-group">
        <label>Email <span style={{ color: '#ef4444' }}>*</span></label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => onInputChange('email', e.target.value)}
          className="form-input"
          placeholder="your@email.com"
        />
      </div>

      <div className="form-group">
        <label>Website</label>
        <input
          type="url"
          value={formData.website}
          onChange={(e) => onInputChange('website', e.target.value)}
          className="form-input"
          placeholder="https://yourwebsite.com"
        />
      </div>
    </div>
  );
}

export default ContactStep;
