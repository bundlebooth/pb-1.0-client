import React from 'react';

/**
 * Shared CardRow component for consistent header styling across Reviews and Bookings
 * Used for the collapsed/toggle row that shows date, name, service, location, badge, and chevron
 * 
 * Props:
 * - date: Date object for the event/review date
 * - primaryName: The main name to display (vendor name, client name)
 * - primaryNameClickable: Boolean - if true, name is clickable
 * - onPrimaryNameClick: Function - callback when name is clicked
 * - serviceName: Service name to display
 * - location: Location string (optional)
 * - badgeLabel: Text for the status badge
 * - badgeColor: Color for the badge (border and text)
 * - isExpanded: Boolean - whether the card is expanded
 * - onClick: Function - callback when row is clicked
 * - showChevron: Boolean - whether to show the chevron (default true)
 * - extraInfo: React node - additional info to show below location (optional)
 */

const CardRow = ({
  date,
  primaryName,
  primaryNameClickable = false,
  onPrimaryNameClick,
  serviceName,
  location,
  badgeLabel,
  badgeColor = '#5e72e4',
  isExpanded = false,
  onClick,
  showChevron = true,
  extraInfo
}) => {
  // Format date parts
  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  let dateMonth = '';
  let dateDay = '';
  let dateDayName = '';
  
  if (date && !isNaN(date.getTime())) {
    dateMonth = monthNames[date.getMonth()];
    dateDay = date.getDate();
    dateDayName = dayNames[date.getDay()];
  }

  const handleNameClick = (e) => {
    if (primaryNameClickable && onPrimaryNameClick) {
      e.preventDefault();
      e.stopPropagation();
      onPrimaryNameClick();
    }
  };

  return (
    <div 
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        padding: '16px 12px 16px 8px', 
        cursor: onClick ? 'pointer' : 'default',
        background: isExpanded ? '#f8f9fa' : 'transparent',
        transition: 'background 0.2s'
      }}
      onClick={onClick}
    >
      {/* Date Block */}
      <div style={{ 
        textAlign: 'center', 
        minWidth: '45px',
        marginRight: '12px',
        flexShrink: 0
      }}>
        {date && !isNaN(date.getTime()) ? (
          <>
            <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {dateMonth}
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#1f2937', lineHeight: 1.1 }}>
              {dateDay}
            </div>
            <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'capitalize' }}>
              {dateDayName}
            </div>
          </>
        ) : (
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            background: '#f3f4f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <i className="fas fa-calendar" style={{ color: '#9ca3af', fontSize: '16px' }}></i>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {primaryNameClickable ? (
          <span 
            style={{ fontSize: '14px', fontWeight: 600, color: '#0d9488', cursor: 'pointer', marginBottom: '2px', display: 'inline-block' }}
            onClick={handleNameClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') handleNameClick(e); }}
          >
            {primaryName}
          </span>
        ) : (
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#0d9488', marginBottom: '2px' }}>
            {primaryName}
          </div>
        )}
        <div style={{ fontSize: '14px', color: '#374151', marginBottom: '4px' }}>{serviceName}</div>
        {location && (
          <div style={{ fontSize: '13px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: extraInfo ? '4px' : '0' }}>
            <i className="fas fa-map-marker-alt" style={{ fontSize: '11px', color: '#9ca3af' }}></i>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>{location}</span>
          </div>
        )}
        {extraInfo}
      </div>

      {/* Status Badge */}
      <div style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        padding: '6px 12px', 
        borderRadius: '20px', 
        fontSize: '12px', 
        fontWeight: 500,
        background: 'white', 
        color: badgeColor, 
        border: `1px solid ${badgeColor}`,
        marginRight: '12px',
        flexShrink: 0,
        whiteSpace: 'nowrap'
      }}>
        {badgeLabel}
      </div>

      {/* Expand Arrow */}
      {showChevron && (
        <div style={{ color: '#9ca3af', fontSize: '14px', flexShrink: 0 }}>
          <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`}></i>
        </div>
      )}
    </div>
  );
};

export default CardRow;
