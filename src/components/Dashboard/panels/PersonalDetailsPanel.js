import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { showBanner } from '../../../utils/helpers';
import { apiGet, apiPut, apiPostFormData } from '../../../utils/api';
import { API_BASE_URL } from '../../../config';

function PersonalDetailsPanel({ onBack, embedded = false }) {
  const { currentUser, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });
  const [originalData, setOriginalData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });

  // Check if there are changes
  const hasChanges = 
    formData.firstName !== originalData.firstName ||
    formData.lastName !== originalData.lastName ||
    formData.phone !== originalData.phone;

  // Clear form data when user changes
  useEffect(() => {
    const emptyData = {
      firstName: '',
      lastName: '',
      email: '',
      phone: ''
    };
    setFormData(emptyData);
    setOriginalData(emptyData);
  }, [currentUser?.id]);

  useEffect(() => {
    loadUserData();
  }, [currentUser]);

  const loadUserData = async () => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }
    
    // First, populate from currentUser data (from localStorage/session)
    const nameFromSession = currentUser.name || '';
    const nameParts = nameFromSession.split(' ');
    const firstNameFromSession = currentUser.firstName || nameParts[0] || '';
    const lastNameFromSession = currentUser.lastName || nameParts.slice(1).join(' ') || '';
    
    // Set initial data from session immediately
    const sessionData = {
      firstName: firstNameFromSession,
      lastName: lastNameFromSession,
      email: currentUser.email || '',
      phone: currentUser.phone || ''
    };
    setFormData(sessionData);
    setOriginalData(sessionData);
    
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/users/${currentUser.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const userData = await response.json();
        // Update with API data if available (API data takes precedence)
        const apiData = {
          firstName: userData.FirstName || userData.firstName || sessionData.firstName,
          lastName: userData.LastName || userData.lastName || sessionData.lastName,
          email: userData.Email || userData.email || sessionData.email,
          phone: userData.Phone || userData.phone || sessionData.phone
        };
        setFormData(apiData);
        setOriginalData(apiData);
      } else {
        console.warn('API returned non-OK status, using session data');
      }
    } catch (error) {
      console.error('Error loading user data from API:', error);
      // Keep the session data that was already set
    } finally {
      setLoading(false);
    }
  };

  const handleSendPasswordReset = async () => {
    if (!formData.email) {
      showBanner('No email address found', 'error');
      return;
    }
    
    try {
      setSendingReset(true);
      const response = await fetch(`${API_BASE_URL}/users/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
      });
      
      if (response.ok) {
        showBanner('Password reset email sent! Check your inbox.', 'success');
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to send reset email');
      }
    } catch (error) {
      console.error('Error sending password reset:', error);
      showBanner(error.message || 'Failed to send password reset email', 'error');
    } finally {
      setSendingReset(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      
      const updateData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone
      };
      
      const response = await fetch(`${API_BASE_URL}/users/${currentUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updateData)
      });
      
      if (response.ok) {
        showBanner('Account details updated successfully!', 'success');
        // Update auth context to persist the data
        if (updateUser) {
          updateUser({
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone,
            name: `${formData.firstName} ${formData.lastName}`.trim()
          });
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      showBanner(error.message || 'Failed to save changes', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <button className="btn btn-outline back-to-menu-btn" style={{ marginBottom: '1rem' }} onClick={onBack}>
          <i className="fas fa-arrow-left"></i> Back to Settings
        </button>
        <div className="dashboard-card">
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="spinner" style={{ margin: '0 auto' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {!embedded && (
        <button className="btn btn-outline back-to-menu-btn" style={{ marginBottom: '1rem' }} onClick={onBack}>
          <i className="fas fa-arrow-left"></i> Back to Settings
        </button>
      )}
      <div className="dashboard-card">
        <h2 className="dashboard-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontSize: '1.1rem' }}>
            <i className="fas fa-user"></i>
          </span>
          Account Details
        </h2>
        <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Update your contact information.
        </p>
        <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '1.5rem 0' }} />
        
        <form onSubmit={handleSubmit}>
          {/* Contact Information */}
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text)' }}>
            Contact Information
          </h3>
          
          <div className="form-row">
            <div className="form-col">
              <div className="form-group">
                <label htmlFor="first-name">First Name</label>
                <input
                  type="text"
                  id="first-name"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>
            </div>
            <div className="form-col">
              <div className="form-group">
                <label htmlFor="last-name">Last Name</label>
                <input
                  type="text"
                  id="last-name"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-col">
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  disabled
                  style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
                />
                <small style={{ color: 'var(--text-light)', fontSize: '0.8rem' }}>
                  Email cannot be changed
                </small>
              </div>
            </div>
            <div className="form-col">
              <div className="form-group">
                <label htmlFor="phone">Phone Number</label>
                <input
                  type="tel"
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </div>

          {/* Password Reset */}
          <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '2rem 0' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text)' }}>
            Password
          </h3>
          <p style={{ color: 'var(--text-light)', marginBottom: '1rem', fontSize: '0.85rem' }}>
            Click the button below to receive a password reset email.
          </p>
          <button
            type="button"
            onClick={handleSendPasswordReset}
            disabled={sendingReset}
            style={{ 
              backgroundColor: 'transparent', 
              border: '1px solid #d1d5db', 
              color: '#374151',
              padding: '10px 16px',
              borderRadius: '8px',
              fontWeight: 500,
              fontSize: '14px',
              cursor: sendingReset ? 'not-allowed' : 'pointer',
              display: 'block'
            }}
          >
            <i className="fas fa-envelope" style={{ marginRight: '8px' }}></i>
            {sendingReset ? 'Sending...' : 'Send Password Reset Email'}
          </button>

          <button 
            type="submit" 
            disabled={!hasChanges || saving}
            style={{ 
              backgroundColor: (!hasChanges || saving) ? '#9ca3af' : '#3d3d3d', 
              border: 'none', 
              color: 'white',
              padding: '12px 20px',
              borderRadius: '8px',
              fontWeight: 500,
              fontSize: '14px',
              cursor: (!hasChanges || saving) ? 'not-allowed' : 'pointer',
              marginTop: '1.5rem',
              display: 'block'
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default PersonalDetailsPanel;
