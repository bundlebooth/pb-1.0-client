import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import ClientFavoritesSection from '../components/Dashboard/sections/ClientFavoritesSection';
import MobileBottomNav from '../components/MobileBottomNav';
import { clientNavItems } from '../config/clientNavItems';
import './ClientPage.css';

function ClientFavoritesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const navItems = clientNavItems;

  return (
    <div className="client-page">
      <Header />
      <div className="client-page-container">
        <aside className="client-page-sidebar">
          <h1 className="client-page-sidebar-title">Favorites</h1>
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
            <ClientFavoritesSection />
          </div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}

export default ClientFavoritesPage;
