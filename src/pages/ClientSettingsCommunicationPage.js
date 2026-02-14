import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import MobileBottomNav from '../components/MobileBottomNav';
import CommunicationPreferencesPanel from '../components/Dashboard/panels/CommunicationPreferencesPanel';
import { clientNavItems } from '../config/clientNavItems';
import './ClientPage.css';

function ClientSettingsCommunicationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const navItems = clientNavItems;
  
  return (
    <div className="client-page">
      <Header />
      <div className="client-page-container">
        <aside className="client-page-sidebar">
          <h1 className="client-page-sidebar-title">Settings</h1>
          <nav className="client-page-sidebar-nav">
            {navItems.map(item => {
              const isActive = item.path === '/client/settings' 
                ? location.pathname.startsWith('/client/settings')
                : location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  className={`client-page-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => navigate(item.path)}
                >
                  <i className={item.icon}></i>
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>
        <main className="client-page-main">
          <div className="client-page-content">
            <CommunicationPreferencesPanel onBack={() => navigate('/client/settings')} />
          </div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}

export default ClientSettingsCommunicationPage;
