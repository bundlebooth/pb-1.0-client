import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import ClientSettingsSection from './ClientSettingsSection';
import VendorSettingsSection from './VendorSettingsSection';

function UnifiedSettingsSection() {
  const { currentUser } = useAuth();
  const [viewRole, setViewRole] = useState('client');

  const isVendor = currentUser?.isVendor;

  return (
    <div id="unified-settings-section">
      {/* Role Tabs - Only show if user is a vendor */}
      {isVendor && (
        <div style={{ 
          display: 'flex', 
          borderBottom: '1px solid #e0e0e0',
          marginBottom: '1rem',
          background: '#fafafa',
          borderRadius: '8px 8px 0 0'
        }}>
          <button
            onClick={() => setViewRole('client')}
            style={{
              flex: 1,
              padding: '14px 20px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: viewRole === 'client' ? 600 : 400,
              color: viewRole === 'client' ? '#5e72e4' : '#666',
              borderBottom: viewRole === 'client' ? '2px solid #5e72e4' : '2px solid transparent',
              transition: 'all 0.2s'
            }}
          >
            <i className="fas fa-user" style={{ marginRight: '8px' }}></i>
            Account Settings
          </button>
          <button
            onClick={() => setViewRole('vendor')}
            style={{
              flex: 1,
              padding: '14px 20px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: viewRole === 'vendor' ? 600 : 400,
              color: viewRole === 'vendor' ? '#5e72e4' : '#666',
              borderBottom: viewRole === 'vendor' ? '2px solid #5e72e4' : '2px solid transparent',
              transition: 'all 0.2s'
            }}
          >
            <i className="fas fa-store" style={{ marginRight: '8px' }}></i>
            Business Settings
          </button>
        </div>
      )}

      {/* Render appropriate section based on role */}
      {viewRole === 'client' ? (
        <ClientSettingsSection key="client-settings" />
      ) : (
        <VendorSettingsSection key="vendor-settings" />
      )}
    </div>
  );
}

export default UnifiedSettingsSection;
