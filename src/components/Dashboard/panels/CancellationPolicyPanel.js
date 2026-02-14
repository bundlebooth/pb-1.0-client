import React, { useState, useEffect } from 'react';
import { showBanner } from '../../../utils/helpers';
import { apiGet, apiPut } from '../../../utils/api';
import { API_BASE_URL } from '../../../config';

const CancellationPolicyPanel = ({ onBack, vendorProfileId }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
      color: '#065f46',
      bg: '#d1fae5'
    },
    {
      id: 'moderate',
      name: 'Moderate',
      description: 'Full refund 7 days before, 50% refund 3 days before',
      icon: 'fa-shield-alt',
      color: '#92400e',
      bg: '#fef3c7'
    },
    {
      id: 'strict',
      name: 'Strict',
      description: '50% refund 14 days before, no refund after',
      icon: 'fa-shield-alt',
      color: '#991b1b',
      bg: '#fee2e2'
    },
    {
      id: 'custom',
      name: 'Custom',
      description: 'Set your own cancellation terms',
      icon: 'fa-shield-alt',
      color: '#3730a3',
      bg: '#e0e7ff'
    }
  ];

  useEffect(() => {
    fetchPolicy();
  }, [vendorProfileId]);

  const fetchPolicy = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/payments/vendor/${vendorProfileId}/cancellation-policy`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.policy) {
          setPolicy({
            policyType: data.policy.PolicyType || 'flexible',
            fullRefundDays: data.policy.FullRefundDays || 7,
            partialRefundDays: data.policy.PartialRefundDays || 3,
            partialRefundPercent: data.policy.PartialRefundPercent || 50,
            noRefundDays: data.policy.NoRefundDays || 1,
            customTerms: data.policy.CustomTerms || ''
          });
        }
      }
    } catch (error) {
      console.error('Error fetching cancellation policy:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/payments/vendor/${vendorProfileId}/cancellation-policy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(policy)
      });

      if (response.ok) {
        showBanner('Cancellation policy saved successfully', 'success');
      } else {
        const error = await response.json();
        showBanner(error.message || 'Failed to save policy', 'error');
      }
    } catch (error) {
      console.error('Error saving cancellation policy:', error);
      showBanner('Failed to save cancellation policy', 'error');
    } finally {
      setSaving(false);
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
          <span style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontSize: '1.1rem' }}>
            <i className="fas fa-file-contract"></i>
          </span>
          Cancellation Policy
        </h2>
        <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Set your cancellation policy to protect your business while giving clients confidence when booking.
        </p>
        <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '1.5rem 0' }} />

        <div className="panel-content">
        {/* Info Box */}
        <div style={{
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem'
        }}>
          <i className="fas fa-info-circle" style={{ color: '#3b82f6', marginTop: '0.15rem' }}></i>
          <div>
            <strong style={{ color: '#1e40af' }}>Why set a cancellation policy?</strong>
            <p style={{ margin: '0.5rem 0 0', color: '#1e40af', fontSize: '0.9rem' }}>
              A clear cancellation policy protects your business while giving clients confidence when booking. 
              It will be displayed on your profile and applied automatically when clients cancel.
            </p>
          </div>
        </div>

        {/* Policy Type Selection */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#1f2937' }}>
            Select Policy Type
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {policyTypes.map(type => (
              <div
                key={type.id}
                onClick={() => handlePolicyTypeChange(type.id)}
                style={{
                  padding: '1.25rem',
                  border: `2px solid ${policy.policyType === type.id ? type.color : '#e5e7eb'}`,
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
                  {policy.policyType === type.id && (
                    <i className="fas fa-check-circle" style={{ color: type.color, marginLeft: 'auto' }}></i>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280' }}>{type.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Custom Settings (shown for custom or to display current settings) */}
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
                  onChange={(e) => setPolicy({ ...policy, fullRefundDays: parseInt(e.target.value) || 0 })}
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
                  onChange={(e) => setPolicy({ ...policy, partialRefundDays: parseInt(e.target.value) || 0 })}
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
                  onChange={(e) => setPolicy({ ...policy, partialRefundPercent: parseInt(e.target.value) || 0 })}
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
                  onChange={(e) => setPolicy({ ...policy, noRefundDays: parseInt(e.target.value) || 0 })}
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
                onChange={(e) => setPolicy({ ...policy, customTerms: e.target.value })}
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

        {/* Policy Preview */}
        <div style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className="fas fa-eye" style={{ color: '#5e72e4' }}></i>
            Policy Preview
          </h3>
          <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '1rem' }}>
            <p style={{ margin: 0, color: '#374151', lineHeight: 1.6 }}>
              {policy.policyType === 'flexible' && (
                <>
                  <strong>Flexible Policy:</strong> Clients can cancel and receive a full refund up to 24 hours before the scheduled event. 
                  Cancellations made less than 24 hours before the event are non-refundable.
                </>
              )}
              {policy.policyType === 'moderate' && (
                <>
                  <strong>Moderate Policy:</strong> Full refund if cancelled 7+ days before the event. 
                  50% refund if cancelled 3-7 days before. No refund for cancellations within 3 days of the event.
                </>
              )}
              {policy.policyType === 'strict' && (
                <>
                  <strong>Strict Policy:</strong> 50% refund if cancelled 14+ days before the event. 
                  No refund for cancellations within 14 days of the event.
                </>
              )}
              {policy.policyType === 'custom' && (
                <>
                  <strong>Custom Policy:</strong> Full refund if cancelled {policy.fullRefundDays}+ days before the event.
                  {policy.partialRefundDays > 0 && policy.partialRefundPercent > 0 && (
                    <> {policy.partialRefundPercent}% refund if cancelled {policy.partialRefundDays}-{policy.fullRefundDays} days before.</>
                  )}
                  {policy.noRefundDays > 0 && (
                    <> No refund for cancellations within {policy.noRefundDays} days of the event.</>
                  )}
                  {policy.customTerms && (
                    <><br /><br />{policy.customTerms}</>
                  )}
                </>
              )}
            </p>
          </div>
        </div>

        {/* Save Button */}
        <div style={{ marginTop: '1.5rem' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
};

export default CancellationPolicyPanel;
