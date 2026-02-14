/**
 * Admin Sidebar Component
 * Navigation for 8 admin sections with mobile responsiveness
 * Follows existing DashboardSidebar patterns
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

// Grouped admin menu structure with collapsible sections
const adminMenuGroups = [
  {
    id: 'overview',
    label: 'Overview',
    icon: 'fa-tachometer-alt',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-pie' },
      { id: 'analytics', label: 'Analytics & Reports', icon: 'fa-chart-bar' }
    ]
  },
  {
    id: 'users-vendors',
    label: 'Users & Vendors',
    icon: 'fa-users-cog',
    items: [
      { id: 'users', label: 'User Management', icon: 'fa-users' },
      { id: 'vendors', label: 'Vendor Management', icon: 'fa-store' },
      { id: 'guest-favorites', label: 'Guest Favorites', icon: 'fa-heart' },
      { id: 'vendor-badges', label: 'Vendor Badges', icon: 'fa-award' }
    ]
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: 'fa-tasks',
    items: [
      { id: 'bookings', label: 'Bookings', icon: 'fa-calendar-check' },
      { id: 'payments', label: 'Payments & Payouts', icon: 'fa-credit-card' }
    ]
  },
  {
    id: 'content-community',
    label: 'Content & Community',
    icon: 'fa-globe',
    items: [
      { id: 'reviews', label: 'Reviews & Moderation', icon: 'fa-star' },
      { id: 'content', label: 'Content Management', icon: 'fa-newspaper' },
      { id: 'forum', label: 'Forum Moderation', icon: 'fa-comments-alt' }
    ]
  },
  {
    id: 'support-group',
    label: 'Support',
    icon: 'fa-headset',
    items: [
      { id: 'support', label: 'Support Tickets', icon: 'fa-ticket-alt' },
      { id: 'chat', label: 'Live Chat', icon: 'fa-comments' }
    ]
  },
  {
    id: 'system',
    label: 'System',
    icon: 'fa-cogs',
    items: [
      { id: 'security', label: 'Security & Audit', icon: 'fa-shield-alt' },
      { id: 'settings', label: 'Platform Settings', icon: 'fa-cog' },
      { id: 'automation', label: 'Automation & Email', icon: 'fa-robot' },
      { id: 'tools', label: 'Search & Impersonation', icon: 'fa-user-secret' }
    ]
  }
];

// Flat list for backwards compatibility
const adminMenuItems = adminMenuGroups.flatMap(group => group.items);

function AdminSidebar({ 
  activeSection, 
  onSectionChange, 
  onLogout,
  mobileMenuOpen,
  setMobileMenuOpen 
}) {
  const { currentUser } = useAuth();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  // Initialize expanded groups - expand the group containing the active section
  const getInitialExpandedGroups = () => {
    const expanded = {};
    adminMenuGroups.forEach(group => {
      expanded[group.id] = true; // Always expanded
    });
    return expanded;
  };
  
  const [expandedGroups, setExpandedGroups] = useState(getInitialExpandedGroups);
  
  // Toggle group expansion
  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };
  
  // Auto-expand group when active section changes
  useEffect(() => {
    adminMenuGroups.forEach(group => {
      if (group.items.some(item => item.id === activeSection)) {
        setExpandedGroups(prev => ({ ...prev, [group.id]: true }));
      }
    });
  }, [activeSection]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setMobileMenuOpen?.(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setMobileMenuOpen]);

  // Prevent background scrolling when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const handleMenuItemClick = (itemId) => {
    onSectionChange(itemId);
    if (isMobile) {
      setMobileMenuOpen?.(false);
    }
  };

  // Mobile sidebar view
  if (isMobile) {
    return (
      <>
        {/* Slide-out menu overlay */}
        {mobileMenuOpen && (
          <div
            onClick={() => setMobileMenuOpen?.(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 1100
            }}
          />
        )}

        {/* Slide-out menu panel */}
        <aside
          style={{
            position: 'fixed',
            top: 0,
            left: mobileMenuOpen ? 0 : '-300px',
            width: '300px',
            height: '100vh',
            background: 'white',
            zIndex: 1101,
            transition: 'left 0.3s ease',
            boxShadow: mobileMenuOpen ? '4px 0 20px rgba(0,0,0,0.15)' : 'none',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto'
          }}
        >
          {/* Header with admin info */}
          <div style={{
            padding: '1.25rem',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #5086E8 0%, #3d6bc7 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '18px',
                fontWeight: 600
              }}>
                {currentUser?.name?.charAt(0)?.toUpperCase() || 'A'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                  {currentUser?.name || 'Admin'}
                </span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  color: '#5086E8',
                  background: 'rgba(80, 134, 232, 0.1)',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  display: 'inline-block'
                }}>
                  Administrator
                </span>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen?.(false)}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: 'none',
                background: '#f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '20px',
                color: '#6b7280'
              }}
            >
              ×
            </button>
          </div>

          {/* Menu items with collapsible groups */}
          <ul style={{ padding: '0.75rem', margin: 0, listStyle: 'none', flex: 1 }}>
            {adminMenuGroups.map(group => {
              const isExpanded = expandedGroups[group.id];
              const hasActiveItem = group.items.some(item => item.id === activeSection);
              
              return (
                <li key={group.id} style={{ marginBottom: '0.5rem' }}>
                  {/* Group Header - Collapsible */}
                  <button
                    onClick={() => toggleGroup(group.id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 0.75rem',
                      border: 'none',
                      borderRadius: '8px',
                      background: hasActiveItem ? 'rgba(80, 134, 232, 0.08)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <i className={`fas ${group.icon}`} style={{ 
                        width: '20px', 
                        textAlign: 'center', 
                        fontSize: '0.9rem',
                        color: hasActiveItem ? '#5086E8' : '#6b7280'
                      }}></i>
                      <span style={{ 
                        fontSize: '0.85rem', 
                        fontWeight: 600, 
                        color: hasActiveItem ? '#5086E8' : '#374151',
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em'
                      }}>
                        {group.label}
                      </span>
                    </div>
                    <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`} style={{ 
                      fontSize: '0.7rem', 
                      color: '#9ca3af'
                    }}></i>
                  </button>
                  
                  {/* Group Items - Collapsible Content */}
                  <ul style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: 0,
                    maxHeight: isExpanded ? '500px' : '0',
                    overflow: 'hidden',
                    transition: 'max-height 0.3s ease-in-out'
                  }}>
                    {group.items.map(item => (
                      <li key={item.id}>
                        <a 
                          href="#" 
                          onClick={(e) => {
                            e.preventDefault();
                            handleMenuItemClick(item.id);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.65rem',
                            padding: '0.6rem 0.75rem 0.6rem 2.5rem',
                            borderRadius: '6px',
                            color: activeSection === item.id ? 'white' : '#4b5563',
                            background: activeSection === item.id ? '#5086E8' : 'transparent',
                            textDecoration: 'none',
                            fontSize: '0.9rem',
                            fontWeight: activeSection === item.id ? '500' : '400',
                            transition: 'all 0.15s',
                            marginTop: '2px'
                          }}
                        >
                          <i className={`fas ${item.icon}`} style={{ width: '18px', textAlign: 'center', fontSize: '0.85rem' }}></i>
                          {item.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
            <li style={{ marginTop: '1rem', borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
              <a 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  onLogout?.();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  color: '#ef4444',
                  textDecoration: 'none',
                  fontSize: '0.95rem'
                }}
              >
                <i className="fas fa-sign-out-alt" style={{ width: '20px', textAlign: 'center' }}></i>
                Log Out
              </a>
            </li>
          </ul>
        </aside>
      </>
    );
  }

  // Desktop sidebar view
  return (
    <aside className="admin-sidebar" style={{
      width: '260px',
      minWidth: '260px',
      background: 'white',
      borderRight: '1px solid #e5e7eb',
      height: '100vh',
      position: 'sticky',
      top: 0,
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto'
    }}>
      {/* Admin header */}
      <div style={{ 
        padding: '1.25rem 1rem', 
        borderBottom: '1px solid #e5e7eb', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px'
      }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #5086E8 0%, #3d6bc7 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '18px',
          fontWeight: 600
        }}>
          {currentUser?.name?.charAt(0)?.toUpperCase() || 'A'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
            {currentUser?.name || 'Admin'}
          </span>
          <span style={{
            fontSize: '11px',
            fontWeight: 500,
            color: '#5086E8',
            background: 'rgba(80, 134, 232, 0.1)',
            padding: '2px 8px',
            borderRadius: '10px',
            display: 'inline-block'
          }}>
            Administrator
          </span>
        </div>
      </div>

      {/* Menu items with collapsible groups */}
      <ul style={{ padding: '0.75rem', margin: 0, listStyle: 'none', flex: 1 }}>
        {adminMenuGroups.map(group => {
          const isExpanded = expandedGroups[group.id];
          const hasActiveItem = group.items.some(item => item.id === activeSection);
          
          return (
            <li key={group.id} style={{ marginBottom: '0.5rem' }}>
              {/* Group Header - Collapsible */}
              <button
                onClick={() => toggleGroup(group.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.6rem 0.75rem',
                  border: 'none',
                  borderRadius: '8px',
                  background: hasActiveItem ? 'rgba(80, 134, 232, 0.08)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <i className={`fas ${group.icon}`} style={{ 
                    width: '18px', 
                    textAlign: 'center', 
                    fontSize: '0.85rem',
                    color: hasActiveItem ? '#5086E8' : '#6b7280'
                  }}></i>
                  <span style={{ 
                    fontSize: '0.8rem', 
                    fontWeight: 600, 
                    color: hasActiveItem ? '#5086E8' : '#374151',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em'
                  }}>
                    {group.label}
                  </span>
                </div>
                <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`} style={{ 
                  fontSize: '0.65rem', 
                  color: '#9ca3af',
                  transition: 'transform 0.2s'
                }}></i>
              </button>
              
              {/* Group Items - Collapsible Content */}
              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                maxHeight: isExpanded ? '500px' : '0',
                overflow: 'hidden',
                transition: 'max-height 0.3s ease-in-out'
              }}>
                {group.items.map(item => (
                  <li key={item.id}>
                    <a 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault();
                        handleMenuItemClick(item.id);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        padding: '0.55rem 0.75rem 0.55rem 2.25rem',
                        borderRadius: '6px',
                        color: activeSection === item.id ? 'white' : '#4b5563',
                        background: activeSection === item.id ? '#5086E8' : 'transparent',
                        textDecoration: 'none',
                        fontSize: '0.85rem',
                        fontWeight: activeSection === item.id ? '500' : '400',
                        transition: 'all 0.15s',
                        marginTop: '2px'
                      }}
                      onMouseEnter={(e) => {
                        if (activeSection !== item.id) {
                          e.currentTarget.style.background = '#f3f4f6';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (activeSection !== item.id) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      <i className={`fas ${item.icon}`} style={{ width: '16px', textAlign: 'center', fontSize: '0.8rem' }}></i>
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>

      {/* Footer with logout */}
      <div style={{ 
        padding: '1rem', 
        borderTop: '1px solid #e5e7eb',
        marginTop: 'auto'
      }}>
        <a 
          href="#" 
          onClick={(e) => {
            e.preventDefault();
            onLogout?.();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            color: '#ef4444',
            textDecoration: 'none',
            fontSize: '0.9rem',
            transition: 'background 0.15s'
          }}
          onMouseEnter={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.08)'}
          onMouseLeave={(e) => e.target.style.background = 'transparent'}
        >
          <i className="fas fa-sign-out-alt" style={{ width: '20px', textAlign: 'center' }}></i>
          Log Out
        </a>
      </div>
    </aside>
  );
}

export default AdminSidebar;
