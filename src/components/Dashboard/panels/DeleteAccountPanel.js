import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { apiDelete } from '../../../utils/api';
import { showBanner } from '../../../utils/helpers';
import UniversalModal from '../../UniversalModal';

function DeleteAccountPanel({ onBack, embedded = false }) {
  const { currentUser, logout } = useAuth();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE MY ACCOUNT') {
      showBanner('Please type DELETE MY ACCOUNT to confirm', 'error');
      return;
    }

    if (!password) {
      showBanner('Please enter your password', 'error');
      return;
    }

    try {
      setLoading(true);
      const response = await apiDelete(`/users/${currentUser.id}/delete-account`, {
        password,
        reason: reason || 'User requested account deletion'
      });

      if (response.ok) {
        showBanner('Your account has been deleted. We\'re sorry to see you go.', 'success');
        // Log out the user
        logout();
        window.location.href = '/';
      } else {
        const data = await response.json();
        showBanner(data.message || 'Failed to delete account', 'error');
      }
    } catch (error) {
      console.error('Delete account error:', error);
      showBanner('Failed to delete account. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {!embedded && (
        <button className="btn btn-outline back-to-menu-btn" style={{ marginBottom: '1rem' }} onClick={onBack}>
          <i className="fas fa-arrow-left"></i> Back to Settings
        </button>
      )}
      <div className="dashboard-card">
        <h2 className="dashboard-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', fontSize: '1.1rem' }}>
            <i className="fas fa-trash-alt"></i>
          </span>
          Delete Account
        </h2>
        <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Permanently delete your account and all associated data.
        </p>
        <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '1.5rem 0' }} />

      {/* Warning Section */}
      <div style={{
        background: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '32px'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: '#fee2e2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <i className="fas fa-exclamation-triangle" style={{ color: '#dc2626', fontSize: '20px' }}></i>
          </div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#dc2626', marginBottom: '12px' }}>
              Warning: This action is permanent
            </h3>
            <ul style={{ 
              margin: '0', 
              paddingLeft: '20px', 
              color: '#7f1d1d',
              lineHeight: '1.8'
            }}>
              <li>Your account cannot be recovered once deleted</li>
              <li>All your bookings, reviews, and messages will be permanently removed</li>
              <li>If you're a vendor, your business profile and all associated data will be deleted</li>
              <li>Any pending payments or refunds may be affected</li>
              <li>You will need to create a new account if you wish to use our services again</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Alternative Options */}
      <div style={{
        background: '#f0f9ff',
        border: '1px solid #bae6fd',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '32px'
      }}>
        <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#0369a1', marginBottom: '12px' }}>
          <i className="fas fa-lightbulb" style={{ marginRight: '8px' }}></i>
          Before you go...
        </h4>
        <p style={{ color: '#0c4a6e', fontSize: '14px', margin: 0 }}>
          If you're having issues with your account, our support team may be able to help. 
          Consider <a href="/help-centre" style={{ color: '#0284c7', textDecoration: 'underline' }}>contacting support</a> before 
          deleting your account.
        </p>
      </div>

      {/* Delete Button */}
      <button
        onClick={() => setShowConfirmModal(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          backgroundColor: '#3d3d3d',
          color: 'white',
          border: 'none',
          padding: '12px 20px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer'
        }}
      >
        <i className="fas fa-trash-alt"></i>
        Delete My Account
      </button>

      {/* Confirmation Modal */}
      <UniversalModal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setPassword('');
          setConfirmText('');
          setReason('');
        }}
        title="Confirm Account Deletion"
        size="medium"
      >
        <div style={{ padding: '24px' }}>
          <div style={{
            background: '#fef2f2',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'center'
          }}>
            <i className="fas fa-exclamation-circle" style={{ 
              fontSize: '48px', 
              color: '#dc2626',
              marginBottom: '12px',
              display: 'block'
            }}></i>
            <p style={{ color: '#7f1d1d', fontWeight: '500', margin: 0 }}>
              This action is <strong>permanent</strong> and cannot be undone.
            </p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '500',
              color: '#374151'
            }}>
              Why are you leaving? (optional)
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            >
              <option value="">Select a reason...</option>
              <option value="Not using the service anymore">Not using the service anymore</option>
              <option value="Found a better alternative">Found a better alternative</option>
              <option value="Privacy concerns">Privacy concerns</option>
              <option value="Too many emails">Too many emails</option>
              <option value="Technical issues">Technical issues</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '500',
              color: '#374151'
            }}>
              Enter your password to confirm
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '500',
              color: '#374151'
            }}>
              To confirm, type <strong style={{ color: '#dc2626' }}>DELETE MY ACCOUNT</strong> in the textbox below
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              placeholder="Type DELETE MY ACCOUNT to confirm"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => {
                setShowConfirmModal(false);
                setPassword('');
                setConfirmText('');
                setReason('');
              }}
              style={{
                flex: 1,
                padding: '14px',
                background: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={loading || confirmText !== 'DELETE MY ACCOUNT' || !password}
              style={{
                flex: 1,
                padding: '14px',
                background: confirmText === 'DELETE MY ACCOUNT' && password ? '#dc2626' : '#fecaca',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: confirmText === 'DELETE MY ACCOUNT' && password ? 'pointer' : 'not-allowed'
              }}
            >
              {loading ? 'Deleting...' : 'Delete Account Forever'}
            </button>
          </div>
        </div>
      </UniversalModal>
      </div>
    </div>
  );
}

export default DeleteAccountPanel;
