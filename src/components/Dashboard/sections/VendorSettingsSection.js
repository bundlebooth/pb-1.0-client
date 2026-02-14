import React, { useState, useEffect } from 'react';
import CommunicationPreferencesPanel from '../panels/CommunicationPreferencesPanel';
import BusinessInformationPanel from '../panels/BusinessInformationPanel';
import { useAuth } from '../../../context/AuthContext';

function VendorSettingsSection() {
  const { currentUser } = useAuth();
  const [activePanel, setActivePanel] = useState(null);

  useEffect(() => {
    setActivePanel(null);
  }, [currentUser?.id, currentUser?.vendorProfileId]);

  const settingsCards = [
    { 
      id: 'business-information', 
      icon: 'fa-building', 
      title: 'Business Information', 
      description: 'Business name, logo, categories, and pricing information.'
    },
    { 
      id: 'vendor-notifications', 
      icon: 'fa-bell', 
      title: 'Vendor Notifications', 
      description: 'Manage booking alerts, inquiry notifications, and review alerts.'
    }
  ];

  const renderPanel = () => {
    const userId = currentUser?.id;
    const vendorId = currentUser?.vendorProfileId;
    
    switch (activePanel) {
      case 'business-information':
        return <BusinessInformationPanel key={vendorId} onBack={() => setActivePanel(null)} vendorProfileId={vendorId} />;
      case 'vendor-notifications':
        return <CommunicationPreferencesPanel key={userId} onBack={() => setActivePanel(null)} isVendorMode={true} />;
      default:
        return null;
    }
  };

  return (
    <div id="settings-section">
      {!activePanel ? (
        <div className="settings-category">
          <h2 className="settings-category-title">Business Settings</h2>
          <div className="settings-grid">
            {settingsCards.map(card => (
              <div 
                key={card.id}
                className="settings-card" 
                data-settings-modal={card.id}
                onClick={() => setActivePanel(card.id)}
                style={{ cursor: 'pointer' }}
              >
                <div className="settings-card-icon">
                  <i className={`fas ${card.icon}`}></i>
                </div>
                <h3 className="settings-card-title">{card.title}</h3>
                <p className="settings-card-description">{card.description}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        renderPanel()
      )}
    </div>
  );
}

export default VendorSettingsSection;
