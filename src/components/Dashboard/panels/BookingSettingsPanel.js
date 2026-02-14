import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../../config';
import { showBanner } from '../../../utils/helpers';
import { ToggleSwitch } from '../../common/FormFields';

function BookingSettingsPanel({ onBack, vendorProfileId }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [originalData, setOriginalData] = useState(null);
  
  // Booking settings
  const [instantBookingEnabled, setInstantBookingEnabled] = useState(false);
  const [minBookingLeadTimeHours, setMinBookingLeadTimeHours] = useState(24);
  const [leadTimeOptions] = useState([
    { value: 0, label: 'No minimum' },
    { value: 24, label: '24 hours (1 day)' },
    { value: 48, label: '48 hours (2 days)' },
    { value: 72, label: '72 hours (3 days)' },
    { value: 168, label: '1 week' },
    { value: 336, label: '2 weeks' }
  ]);
  
  // Cancellation policy
  const [policy, setPolicy] = useState({
    policyType: 'flexible',
    fullRefundDays: 7,
    partialRefundDays: 3,
    partialRefundPercent: 50,
    noRefundDays: 1,
    customTerms: ''
  });

  const policyTypes = [
    {
      id: 'flexible',
      name: 'Flexible',
      description: 'Full refund up to 24 hours before the event',
      icon: 'fa-smile',
      color: '#10b981',
      bg: '#d1fae5'
    },
    {
      id: 'moderate',
      name: 'Moderate',
      description: 'Full refund 7 days before, 50% refund 3 days before',
      icon: 'fa-balance-scale',
      color: '#f59e0b',
      bg: '#fef3c7'
    },
    {
      id: 'strict',
      name: 'Strict',
      description: '50% refund 14 days before, no refund after',
      icon: 'fa-lock',
      color: '#ef4444',
      bg: '#fee2e2'
    },
    {
      id: 'custom',
      name: 'Custom',
      description: 'Set your own cancellation terms',
      icon: 'fa-sliders-h',
      color: '#3730a3',
      bg: '#e0e7ff'
    }
  ];

  useEffect(() => {
    loadData();
  }, [vendorProfileId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Load vendor profile for booking settings
      const profileRes = await fetch(`${API_BASE_URL}/vendors/${vendorProfileId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (profileRes.ok) {
        const result = await profileRes.json();
        const profile = result.data?.profile || result.profile || result;
        
        if (profile.InstantBookingEnabled !== undefined) {
          setInstantBookingEnabled(profile.InstantBookingEnabled);
        }
        if (profile.MinBookingLeadTimeHours !== undefined) {
          setMinBookingLeadTimeHours(profile.MinBookingLeadTimeHours);
        }
      }
      
      // Load cancellation policy
      const policyRes = await fetch(`${API_BASE_URL}/payments/vendor/${vendorProfileId}/cancellation-policy`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (policyRes.ok) {
        const data = await policyRes.json();
        if (data.policy) {
          const loadedPolicy = {
            policyType: data.policy.PolicyType || 'flexible',
            fullRefundDays: data.policy.FullRefundDays || 7,
            partialRefundDays: data.policy.PartialRefundDays || 3,
            partialRefundPercent: data.policy.PartialRefundPercent || 50,
            noRefundDays: data.policy.NoRefundDays || 1,
            customTerms: data.policy.CustomTerms || ''
          };
          setPolicy(loadedPolicy);
          setOriginalData(prev => ({ ...prev, policy: loadedPolicy }));
        }
      }
      
      // Set original data for change tracking
      setOriginalData(prev => ({
        ...prev,
        instantBookingEnabled,
        minBookingLeadTimeHours
      }));
    } catch (error) {
      console.error('Error loading booking settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePolicyTypeChange = (type) => {
    const defaults = {
      flexible: { fullRefundDays: 1, partialRefundDays: 0, partialRefundPercent: 0, noRefundDays: 0 },
      moderate: { fullRefundDays: 7, partialRefundDays: 3, partialRefundPercent: 50, noRefundDays: 1 },
      strict: { fullRefundDays: 14, partialRefundDays: 7, partialRefundPercent: 50, noRefundDays: 3 },
      custom: { fullRefundDays: policy.fullRefundDays, partialRefundDays: policy.partialRefundDays, partialRefundPercent: policy.partialRefundPercent, noRefundDays: policy.noRefundDays }
    };

    setPolicy({
      ...policy,
      policyType: type,
      ...defaults[type]
    });
  };

  // Check if there are changes
  const hasChanges = originalData ? (
    instantBookingEnabled !== originalData.instantBookingEnabled ||
    minBookingLeadTimeHours !== originalData.minBookingLeadTimeHours ||
    JSON.stringify(policy) !== JSON.stringify(originalData.policy)
  ) : false;

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      
      // Save booking settings via step4 endpoint
      const bookingRes = await fetch(`${API_BASE_URL}/vendors/setup/step4-business-hours`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          vendorProfileId,
          instantBookingEnabled,
          minBookingLeadTimeHours
        })
      });
      
      // Save cancellation policy
      const policyRes = await fetch(`${API_BASE_URL}/payments/vendor/${vendorProfileId}/cancellation-policy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(policy)
      });
      
      if (bookingRes.ok && policyRes.ok) {
        showBanner('Booking settings saved successfully!', 'success');
        setOriginalData({
          instantBookingEnabled,
          minBookingLeadTimeHours,
          policy: { ...policy }
        });
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error('Error saving booking settings:', error);
      showBanner('Failed to save booking settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <button className="btn btn-outline back-to-menu-btn" style={{ marginBottom: '1rem' }} onClick={onBack}>
          <i className="fas fa-arrow-left"></i> Back to Business Profile Menu
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
      <button className="btn btn-outline back-to-menu-btn" style={{ marginBottom: '1rem' }} onClick={onBack}>
        <i className="fas fa-arrow-left"></i> Back to Business Profile Menu
      </button>
      <div className="dashboard-card">
        <h2 className="dashboard-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#f0f7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontSize: '1.1rem' }}>
            <i className="fas fa-calendar-check"></i>
          </span>
          Booking Settings
        </h2>
        <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Configure how clients can book your services and set your cancellation policy.
        </p>
        <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '1.5rem 0' }} />
        
        {/* Instant Booking Section */}
        <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.25rem' }}>
                Instant Booking
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-light)' }}>
                Allow clients to book and pay immediately without waiting for your approval
              </p>
            </div>
            <ToggleSwitch
              checked={instantBookingEnabled}
              onChange={setInstantBookingEnabled}
            />
          </div>
        </div>

        {/* Minimum Lead Time Section */}
        <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.75rem' }}>
            Minimum Booking Lead Time
          </h3>
          <select
            value={minBookingLeadTimeHours}
            onChange={(e) => setMinBookingLeadTimeHours(parseInt(e.target.value))}
            style={{
              width: '100%',
              maxWidth: '300px',
              padding: '0.75rem 1rem',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              fontSize: '0.9rem',
              background: 'white',
              color: 'var(--text)'
            }}
          >
            {leadTimeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-light)' }}>
            Set the minimum advance notice required for bookings
          </p>
        </div>

        {/* Cancellation Policy Section */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.5rem' }}>
            Cancellation Policy
          </h3>
          <p style={{ color: 'var(--text-light)', fontSize: '0.8rem', marginBottom: '1rem' }}>
            Set your cancellation policy to protect your business while giving clients confidence when booking.
          </p>

          {/* Policy Type Selection - White with grey border unselected, grey when selected */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {policyTypes.map(type => {
              const isSelected = policy.policyType === type.id;
              return (
                <div
                  key={type.id}
                  onClick={() => handlePolicyTypeChange(type.id)}
                  style={{
                    padding: '1rem',
                    border: isSelected ? 'none' : '1px solid #d1d5db',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: isSelected ? '#f3f4f6' : 'white',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <i className={`fas ${type.icon || 'fa-shield-alt'}`} style={{ color: type.color, fontSize: '0.9rem' }}></i>
                    <strong style={{ color: '#1f2937', fontSize: '0.875rem' }}>{type.name}</strong>
                    {isSelected && (
                      <i className="fas fa-check" style={{ color: '#6b7280', marginLeft: 'auto', fontSize: '0.85rem' }}></i>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280', lineHeight: 1.4 }}>{type.description}</p>
                </div>
              );
            })}
          </div>

          {/* Custom Settings */}
          {policy.policyType === 'custom' && (
            <div style={{
              background: '#f9fafb',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1rem'
            }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem', color: '#1f2937' }}>
                Custom Policy Settings
              </h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.85rem', color: '#374151' }}>
                    Full Refund (days before)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="90"
                    value={policy.fullRefundDays}
                    onChange={(e) => setPolicy({ ...policy, fullRefundDays: parseInt(e.target.value) || 0 })}
                    style={{
                      width: '100%',
                      padding: '0.625rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.85rem', color: '#374151' }}>
                    Partial Refund (days before)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="90"
                    value={policy.partialRefundDays}
                    onChange={(e) => setPolicy({ ...policy, partialRefundDays: parseInt(e.target.value) || 0 })}
                    style={{
                      width: '100%',
                      padding: '0.625rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.85rem', color: '#374151' }}>
                    Partial Refund %
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={policy.partialRefundPercent}
                    onChange={(e) => setPolicy({ ...policy, partialRefundPercent: parseInt(e.target.value) || 0 })}
                    style={{
                      width: '100%',
                      padding: '0.625rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.85rem', color: '#374151' }}>
                    No Refund (days before)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="90"
                    value={policy.noRefundDays}
                    onChange={(e) => setPolicy({ ...policy, noRefundDays: parseInt(e.target.value) || 0 })}
                    style={{
                      width: '100%',
                      padding: '0.625rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.85rem', color: '#374151' }}>
                  Additional Terms (Optional)
                </label>
                <textarea
                  value={policy.customTerms}
                  onChange={(e) => setPolicy({ ...policy, customTerms: e.target.value })}
                  placeholder="Add any additional cancellation terms..."
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>
          )}

          {/* Policy Preview */}
          <div style={{
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '10px',
            padding: '1rem'
          }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className="fas fa-eye"></i>
              Policy Preview
            </h4>
            <p style={{ margin: 0, color: '#0c4a6e', fontSize: '0.85rem', lineHeight: 1.5 }}>
              {policy.policyType === 'flexible' && (
                <>Clients can cancel and receive a full refund up to 24 hours before the scheduled event.</>
              )}
              {policy.policyType === 'moderate' && (
                <>Full refund if cancelled 7+ days before. 50% refund if cancelled 3-7 days before. No refund within 3 days.</>
              )}
              {policy.policyType === 'strict' && (
                <>50% refund if cancelled 14+ days before. No refund for cancellations within 14 days of the event.</>
              )}
              {policy.policyType === 'custom' && (
                <>
                  Full refund if cancelled {policy.fullRefundDays}+ days before.
                  {policy.partialRefundDays > 0 && policy.partialRefundPercent > 0 && (
                    <> {policy.partialRefundPercent}% refund if cancelled {policy.partialRefundDays}-{policy.fullRefundDays} days before.</>
                  )}
                  {policy.noRefundDays > 0 && (
                    <> No refund within {policy.noRefundDays} days.</>
                  )}
                </>
              )}
            </p>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          style={{ 
            backgroundColor: (!hasChanges || saving) ? '#9ca3af' : '#3d3d3d', 
            border: 'none', 
            color: 'white',
            padding: '12px 20px',
            borderRadius: '8px',
            fontWeight: 500,
            fontSize: '14px',
            cursor: (!hasChanges || saving) ? 'not-allowed' : 'pointer'
          }}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}

export default BookingSettingsPanel;
