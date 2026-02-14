import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import ClientBookingsSection from '../components/Dashboard/sections/ClientBookingsSection';
import MobileBottomNav from '../components/MobileBottomNav';
import { encodeBookingId } from '../utils/hashIds';
import { clientNavItems } from '../config/clientNavItems';
import './ClientPage.css';

function ClientBookingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const navItems = clientNavItems;

  // Handle Pay Now - navigate to payment page
  const handlePayNow = (booking) => {
    const bookingId = booking.BookingID || booking.RequestID;
    const encodedId = encodeBookingId(bookingId);
    navigate(`/payment/${encodedId}`);
  };

  return (
    <div className="client-page">
      <Header />
      <div className="client-page-container">
        <aside className="client-page-sidebar">
          <h1 className="client-page-sidebar-title">My Bookings</h1>
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
            <ClientBookingsSection onPayNow={handlePayNow} />
          </div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}

export default ClientBookingsPage;
