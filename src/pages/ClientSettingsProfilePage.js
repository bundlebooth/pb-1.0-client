import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import MobileBottomNav from '../components/MobileBottomNav';
import ProfileEditPanel from '../components/Dashboard/panels/ProfileEditPanel';
import { clientNavItems } from '../config/clientNavItems';
import './ClientPage.css';

function ClientSettingsProfilePage() {
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
            <button 
              className="btn btn-outline back-to-menu-btn" 
              style={{ marginBottom: '1rem' }} 
              onClick={() => navigate('/client/settings')}
            >
              <i className="fas fa-arrow-left"></i> Back to Settings
            </button>
            <ProfileEditPanel 
              onClose={() => navigate('/client/settings')} 
              onSave={() => navigate('/client/settings')} 
              embedded={true}
            />
          </div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}

export default ClientSettingsProfilePage;
