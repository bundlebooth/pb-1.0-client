import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config';
import { showBanner } from '../../utils/helpers';

function CancellationPolicyStep({ formData, setFormData }) {
  const { currentUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Booking settings (matching BookingSettingsPanel)
  const [instantBookingEnabled, setInstantBookingEnabled] = useState(false);
  const [minBookingLeadTimeHours, setMinBookingLeadTimeHours] = useState(24);
  
  const leadTimeOptions = [
    { value: 0, label: 'No minimum' },
    { value: 24, label: '24 hours (1 day)' },
    { value: 48, label: '48 hours (2 days)' },
    { value: 72, label: '72 hours (3 days)' },
    { value: 168, label: '1 week' },
    { value: 336, label: '2 weeks' }
  ];
  
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
      icon: 'fa-shield-alt',
      color: '#10b981',
      bg: '#ecfdf5'
    },
    {
      id: 'moderate',
      name: 'Moderate',
      description: 'Full refund 7 days before, 50% refund 3 days before',
      icon: 'fa-shield-alt',
      color: '#f59e0b',
      bg: '#fffbeb'
    },
    {
      id: 'strict',
      name: 'Strict',
      description: '50% refund 14 days before, no refund after',
      icon: 'fa-shield-alt',
      color: '#ef4444',
      bg: '#fef2f2'
    },
    {
      id: 'custom',
      name: 'Custom',
      description: 'Set your own cancellation terms',
      icon: 'fa-shield-alt',
      color: '#8b5cf6',
      bg: '#f5f3ff'
    }
  ];

  // Load existing policy and booking settings on mount
  useEffect(() => {
    const loadData = async () => {
      if (!currentUser?.vendorProfileId) {
        setLoading(false);
        return;
      }
      try {
        const token = localStorage.getItem('token');
        
        // Load vendor profile for booking settings
        const profileRes = await fetch(`${API_BASE_URL}/vendors/${currentUser.vendorProfileId}`, {
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
        const policyRes = await fetch(`${API_BASE_URL}/payments/vendor/${currentUser.vendorProfileId}/cancellation-policy`, {
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
            setFormData(prev => ({ ...prev, cancellationPolicy: loadedPolicy }));
          }
        }
      } catch (error) {
        console.error('Error loading booking settings:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [currentUser?.vendorProfileId]);

  // Also load from formData if it exists
  useEffect(() => {
    if (formData.cancellationPolicy && typeof formData.cancellationPolicy === 'object') {
      setPolicy(formData.cancellationPolicy);
    }
  }, []);

  const handlePolicyTypeChange = (type) => {
    const defaults = {
      flexible: { fullRefundDays: 1, partialRefundDays: 0, partialRefundPercent: 0, noRefundDays: 0 },
      moderate: { fullRefundDays: 7, partialRefundDays: 3, partialRefundPercent: 50, noRefundDays: 1 },
      strict: { fullRefundDays: 14, partialRefundDays: 7, partialRefundPercent: 50, noRefundDays: 3 },
      custom: { fullRefundDays: policy.fullRefundDays, partialRefundDays: policy.partialRefundDays, partialRefundPercent: policy.partialRefundPercent, noRefundDays: policy.noRefundDays }
    };
    const newPolicy = { ...policy, policyType: type, ...defaults[type] };
    setPolicy(newPolicy);
    setFormData(prev => ({ ...prev, cancellationPolicy: newPolicy }));
  };

  const handlePolicyChange = (field, value) => {
    const newPolicy = { ...policy, [field]: value };
    setPolicy(newPolicy);
    setFormData(prev => ({ ...prev, cancellationPolicy: newPolicy }));
  };

  const handleSave = async () => {
    if (!currentUser?.vendorProfileId) {
      showBanner('Please complete your profile first', 'error');
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      
      // Save booking settings via step4 endpoint (same as BookingSettingsPanel)
      await fetch(`${API_BASE_URL}/vendors/setup/step4-business-hours`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          vendorProfileId: currentUser.vendorProfileId,
          instantBookingEnabled,
          minBookingLeadTimeHours
        })
      });
      
      // Save cancellation policy
      const response = await fetch(`${API_BASE_URL}/payments/vendor/${currentUser.vendorProfileId}/cancellation-policy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(policy)
      });
      const data = await response.json();
      if (response.ok && data.success) {
        showBanner('Booking settings saved!', 'success');
      } else {
        throw new Error(data.message || 'Failed to save');
      }
    } catch (error) {
      console.error('Error saving booking settings:', error);
      showBanner('Failed to save: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="step-loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="cancellation-policy-step">
      {/* Instant Booking Section */}
      <div style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem', fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <i className="fas fa-bolt" style={{ color: '#5086E8' }}></i>
          Instant Booking
        </h3>
        <p style={{ margin: '0 0 1rem 0', color: '#6b7280', fontSize: '0.875rem' }}>
          Allow clients to book and pay immediately without waiting for your approval
        </p>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span style={{ fontWeight: 500, color: '#111827' }}>
            Enable Instant Booking
          </span>
          <button
            type="button"
            onClick={() => setInstantBookingEnabled(!instantBookingEnabled)}
            style={{
              width: '48px',
              height: '26px',
              borderRadius: '13px',
              border: 'none',
              background: instantBookingEnabled ? '#5086E8' : '#d1d5db',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background 0.2s ease'
            }}
          >
            <span style={{
              position: 'absolute',
              top: '3px',
              left: instantBookingEnabled ? '25px' : '3px',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: 'white',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              transition: 'left 0.2s ease'
            }} />
          </button>
        </div>
      </div>

      {/* Minimum Lead Time Section */}
      <div style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem', fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <i className="fas fa-clock" style={{ color: '#5086E8' }}></i>
          Minimum Booking Lead Time
        </h3>
        <p style={{ margin: '0 0 1rem 0', color: '#6b7280', fontSize: '0.875rem' }}>
          How much advance notice do you need for bookings?
        </p>
        <select
          value={minBookingLeadTimeHours}
          onChange={(e) => setMinBookingLeadTimeHours(parseInt(e.target.value))}
          style={{
            width: '100%',
            maxWidth: '300px',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            fontSize: '0.95rem',
            background: 'white',
            color: '#111827'
          }}
        >
          {leadTimeOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Cancellation Policy Section */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem', fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <i className="fas fa-shield-alt" style={{ color: '#5086E8' }}></i>
          Cancellation Policy
        </h3>
        <p style={{ margin: '0 0 1rem 0', color: '#6b7280', fontSize: '0.875rem' }}>
          A clear cancellation policy protects your business while giving clients confidence when booking.
        </p>
      </div>

      {/* Policy Type Selection - 2x2 Grid */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#1f2937' }}>
          Select Policy Type
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
          {policyTypes.map(type => (
            <div
              key={type.id}
              onClick={() => handlePolicyTypeChange(type.id)}
              style={{
                padding: '1rem',
                border: `1px solid ${policy.policyType === type.id ? type.color : '#e5e7eb'}`,
                borderRadius: '12px',
                cursor: 'pointer',
                background: policy.policyType === type.id ? `${type.color}10` : 'white',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: `${type.color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <i className={`fas ${type.icon}`} style={{ color: type.color }}></i>
                </div>
                <strong style={{ color: '#1f2937' }}>{type.name}</strong>
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280' }}>{type.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Settings */}
      {policy.policyType === 'custom' && (
        <div style={{
          background: '#f9fafb',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#1f2937' }}>
            Custom Policy Settings
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem', color: '#374151' }}>
                Full Refund (days before event)
              </label>
              <input
                type="number"
                min="0"
                max="90"
                value={policy.fullRefundDays}
                onChange={(e) => handlePolicyChange('fullRefundDays', parseInt(e.target.value) || 0)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '0.95rem'
                }}
              />
              <small style={{ color: '#6b7280' }}>100% refund if cancelled this many days before</small>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem', color: '#374151' }}>
                Partial Refund (days before event)
              </label>
              <input
                type="number"
                min="0"
                max="90"
                value={policy.partialRefundDays}
                onChange={(e) => handlePolicyChange('partialRefundDays', parseInt(e.target.value) || 0)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '0.95rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem', color: '#374151' }}>
                Partial Refund Percentage
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={policy.partialRefundPercent}
                onChange={(e) => handlePolicyChange('partialRefundPercent', parseInt(e.target.value) || 0)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '0.95rem'
                }}
              />
              <small style={{ color: '#6b7280' }}>Percentage refunded during partial period</small>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem', color: '#374151' }}>
                No Refund (days before event)
              </label>
              <input
                type="number"
                min="0"
                max="90"
                value={policy.noRefundDays}
                onChange={(e) => handlePolicyChange('noRefundDays', parseInt(e.target.value) || 0)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '0.95rem'
                }}
              />
              <small style={{ color: '#6b7280' }}>No refund if cancelled within this period</small>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem', color: '#374151' }}>
              Additional Terms (Optional)
            </label>
            <textarea
              value={policy.customTerms}
              onChange={(e) => handlePolicyChange('customTerms', e.target.value)}
              placeholder="Add any additional cancellation terms or conditions..."
              rows={3}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '0.95rem',
                resize: 'vertical'
              }}
            />
          </div>
        </div>
      )}

    </div>
  );
}

export default CancellationPolicyStep;
