import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import MobileBottomNav from '../components/MobileBottomNav';
import { useTranslation } from '../hooks/useTranslation';
import { clientNavItems } from '../config/clientNavItems';
import './ClientPage.css';
import './ClientSettingsPage.css';

function ClientSettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const navItems = clientNavItems;

  const settingsCards = [
    { 
      id: 'profile', 
      icon: 'fa-id-card', 
      title: 'Edit Profile', 
      description: 'Update your bio, interests, and profile information',
      category: 'personal',
      route: '/client/settings/profile'
    },
    { 
      id: 'personal', 
      icon: 'fa-user', 
      title: 'Account Details', 
      description: 'Update your name, email, and phone number',
      category: 'account',
      route: '/client/settings/personal'
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
      icon: 'fa-language', 
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
    <div className="client-page">
      <Header />
      <div className="client-page-container">
        <aside className="client-page-sidebar">
          <h1 className="client-page-sidebar-title">Settings</h1>
          <nav className="client-page-sidebar-nav">
            {navItems.map(item => (
              <button
                key={item.path}
                className={`client-page-nav-item ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                <i className={item.icon}></i>
                {item.label}
              </button>
            ))}
          </nav>
        </aside>
        <main className="client-page-main">
          <div className="client-page-content">
            {/* Personal Settings Category */}
            <div className="settings-category">
              <h2 className="settings-category-title">Profile Settings</h2>
              <div className="settings-grid">
                {personalCards.map(card => (
                  <div 
                    key={card.id}
                    className="settings-card" 
                    onClick={() => navigate(card.route)}
                    style={{ cursor: 'pointer', padding: '1rem' }}
                  >
                    <div style={{ width: '40px', height: '40px', backgroundColor: '#f0f7ff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5086E8', fontSize: '1.2rem', marginBottom: '0.5rem' }}>
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
                    className={`settings-card ${card.danger ? 'danger' : ''}`}
                    onClick={() => navigate(card.route)}
                    style={{ cursor: 'pointer', padding: '1rem' }}
                  >
                    <div style={{ width: '40px', height: '40px', backgroundColor: card.danger ? '#fee2e2' : '#f0f7ff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.danger ? '#dc2626' : '#5086E8', fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                      <i className={`fas ${card.icon}`}></i>
                    </div>
                    <h3 className="settings-card-title">{card.title}</h3>
                    <p className="settings-card-description">{card.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}

export default ClientSettingsPage;
