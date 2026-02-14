import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Breadcrumb Component
 * Supports both simple string items and clickable link items
 * 
 * Items can be:
 * - Simple strings: ['Home', 'Category', 'Vendor']
 * - Objects with label and path: [{ label: 'Home', path: '/' }, { label: 'Category', path: '/browse/catering' }]
 * - Mixed: ['Home', { label: 'Category', path: '/browse/catering' }, 'Vendor Name']
 */
const Breadcrumb = ({ items }) => {
  return (
    <nav style={{
      padding: '1rem 0',
      fontSize: '0.875rem',
      color: '#6b7280'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        flexWrap: 'wrap'
      }}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isObject = typeof item === 'object' && item !== null;
          const label = isObject ? item.label : item;
          const path = isObject ? item.path : null;
          const isClickable = path && !isLast;

          return (
            <React.Fragment key={index}>
              {isClickable ? (
                <Link 
                  to={path}
                  style={{
                    color: '#6b7280',
                    textDecoration: 'none',
                    transition: 'color 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.color = '#222222';
                    e.currentTarget.style.textDecoration = 'underline';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.color = '#6b7280';
                    e.currentTarget.style.textDecoration = 'none';
                  }}
                >
                  {label}
                </Link>
              ) : (
                <span style={{
                  color: isLast ? '#111827' : '#6b7280',
                  fontWeight: isLast ? '600' : '400'
                }}>
                  {label}
                </span>
              )}
              {!isLast && (
                <span style={{ color: '#d1d5db' }}>{'›'}</span>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
};

export default Breadcrumb;
