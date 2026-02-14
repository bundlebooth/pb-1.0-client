import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../../hooks/useTranslation';

function ClientSettingsSection() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const settingsCards = [
    { 
      id: 'profile', 
      icon: 'fa-id-card', 
      title: 'Your Profile', 
      description: 'Add personal details, interests, and fun facts to help others get to know you',
      category: 'personal',
      route: '/client/settings/profile'
    },
    { 
      id: 'personal', 
      icon: 'fa-user', 
      title: t('settings.personalDetails'), 
      description: t('settings.personalDetailsDesc'),
      category: 'personal',
      route: '/client/settings/personal'
    },
    { 
      id: 'location', 
      icon: 'fa-map-marker-alt', 
      title: 'Location & Tax', 
      description: 'Set your province for accurate tax calculation on payments.',
      category: 'personal',
      route: '/client/settings/location'
    },
    { 
      id: 'communication', 
      icon: 'fa-envelope', 
      title: t('settings.communicationPreferences'), 
      description: t('settings.communicationPreferencesDesc'),
      category: 'personal',
      route: '/client/settings/communication'
    },
    { 
      id: 'language', 
      icon: 'fa-globe', 
      title: t('settings.languageCurrency'), 
      description: t('settings.languageCurrencyDesc'),
      category: 'personal',
      route: '/client/settings/language'
    },
    { 
      id: 'privacy', 
      icon: 'fa-eye-slash', 
      title: 'Privacy Settings', 
      description: 'Control what activities are visible on your public profile',
      category: 'personal',
      route: '/client/settings/privacy'
    },
    { 
      id: 'security', 
      icon: 'fa-shield-alt', 
      title: t('settings.security'), 
      description: t('settings.securityDesc'),
      category: 'account',
      route: '/client/settings/security'
    },
    { 
      id: 'cookies', 
      icon: 'fa-cookie-bite', 
      title: 'Cookie Preferences', 
      description: 'Manage how we use cookies to personalize your experience',
      category: 'account',
      route: '/client/settings/cookies'
    },
    { 
      id: 'delete', 
      icon: 'fa-trash-alt', 
      title: t('settings.deleteAccount'), 
      description: t('settings.deleteAccountDesc'),
      category: 'account',
      danger: true,
      route: '/client/settings/delete'
    }
  ];

  const personalCards = settingsCards.filter(c => c.category === 'personal');
  const accountCards = settingsCards.filter(c => c.category === 'account');

  return (
    <div id="settings-section">
      {/* Personal Settings Category */}
      <div className="settings-category">
        <h2 className="settings-category-title">Personal settings</h2>
        <div className="settings-grid">
          {personalCards.map(card => (
            <div 
              key={card.id}
              className="settings-card" 
              onClick={() => navigate(card.route)}
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

      {/* Account Settings Category */}
      <div className="settings-category">
        <h2 className="settings-category-title">Account settings</h2>
        <div className="settings-grid">
          {accountCards.map(card => (
            <div 
              key={card.id}
              className="settings-card" 
              onClick={() => navigate(card.route)}
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
    </div>
  );
}

export default ClientSettingsSection;
