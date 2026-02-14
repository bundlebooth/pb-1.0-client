import React, { useState } from 'react';

function BusinessHoursStep({ formData, setFormData }) {
  const daysOfWeek = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' }
  ];

  // Canadian timezones only
  const timezones = [
    { value: 'America/St_Johns', label: 'Newfoundland (NST) GMT -3:30' },
    { value: 'America/Halifax', label: 'Atlantic (AST) GMT -4:00' },
    { value: 'America/Toronto', label: 'Eastern (EST) GMT -5:00' },
    { value: 'America/Winnipeg', label: 'Central (CST) GMT -6:00' },
    { value: 'America/Edmonton', label: 'Mountain (MST) GMT -7:00' },
    { value: 'America/Vancouver', label: 'Pacific (PST) GMT -8:00' }
  ];

  const [timeError, setTimeError] = useState(null);

  const handleHourChange = (day, field, value) => {
    setFormData(prev => {
      const currentDayHours = prev.businessHours[day];
      const newOpenTime = field === 'openTime' ? value : currentDayHours?.openTime || '09:00';
      const newCloseTime = field === 'closeTime' ? value : currentDayHours?.closeTime || '17:00';
      
      // Validate: close time must be after open time (no overnight hours)
      if (newCloseTime <= newOpenTime) {
        // If setting open time and it would be >= close time, auto-adjust close time
        if (field === 'openTime') {
          const [hours, mins] = value.split(':').map(Number);
          const adjustedHours = hours + 1 > 23 ? 23 : hours + 1;
          const adjustedClose = `${String(adjustedHours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
          setTimeError({ day, message: 'Close time adjusted - overnight hours not supported' });
          setTimeout(() => setTimeError(null), 3000);
          return {
            ...prev,
            businessHours: {
              ...prev.businessHours,
              [day]: {
                ...currentDayHours,
                openTime: value,
                closeTime: adjustedClose
              }
            }
          };
        }
        // If setting close time and it would be <= open time, show error and don't allow it
        if (field === 'closeTime') {
          setTimeError({ day, message: 'Close time must be after open time - overnight hours not supported' });
          setTimeout(() => setTimeError(null), 3000);
          return prev; // Don't update, keep current value
        }
      }
      
      setTimeError(null);
      return {
        ...prev,
        businessHours: {
          ...prev.businessHours,
          [day]: {
            ...currentDayHours,
            [field]: value
          }
        }
      };
    });
  };

  const handleToggleClosed = (day) => {
    setFormData(prev => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: {
          ...prev.businessHours[day],
          isAvailable: !prev.businessHours[day].isAvailable
        }
      }
    }));
  };

  const handleTimezoneChange = (timezone) => {
    setFormData(prev => ({
      ...prev,
      timezone: timezone
    }));
  };

  return (
    <div className="business-hours-step">
      <div style={{ maxWidth: '100%', width: '100%' }}>
        <div style={{ marginBottom: '1.5rem', padding: '1.25rem', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <i className="fas fa-clock" style={{ color: '#5086E8', fontSize: '1rem' }}></i>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#111827' }}>
              Set Your Regular Hours <span style={{ color: '#ef4444' }}>*</span>
            </h3>
          </div>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem', lineHeight: 1.5 }}>
            Set at least one day as available. These hours will be displayed on your public profile.
          </p>
        </div>

        <div style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <i className="fas fa-globe" style={{ color: 'var(--primary)', fontSize: '1rem' }}></i>
            <label style={{ fontSize: '0.95rem', fontWeight: 600, color: '#374151' }}>Timezone</label>
          </div>
          <select
            value={formData.timezone || ''}
            onChange={(e) => handleTimezoneChange(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '0.9rem',
              background: 'white',
              cursor: 'pointer',
              appearance: 'none',
              backgroundImage: 'url(\'data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23666%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e\')',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 1rem center',
              backgroundSize: '1.25rem',
              paddingRight: '3rem'
            }}
          >
            <option value="" disabled>Select timezone...</option>
            {timezones.map(tz => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
          <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.5rem', marginBottom: 0 }}>
            This timezone will be displayed to customers viewing your profile
          </p>
        </div>

        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {daysOfWeek.map(day => (
            <div
              key={day.key}
              className="business-hours-day-row"
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '1rem',
                alignItems: 'center',
                padding: '0.875rem 1rem',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                background: formData.businessHours[day.key]?.isAvailable === false ? '#f9fafb' : 'white'
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '0.9rem', minWidth: '80px' }}>{day.label}</div>
              
              {formData.businessHours[day.key]?.isAvailable !== false ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <label style={{ fontSize: '0.8rem', color: '#6b7280' }}>Open:</label>
                      <input
                        type="time"
                        value={formData.businessHours[day.key]?.openTime || '09:00'}
                        onChange={(e) => handleHourChange(day.key, 'openTime', e.target.value)}
                        max="22:59"
                        style={{ padding: '0.4rem 0.5rem', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.85rem' }}
                      />
                    </div>
                    <span style={{ color: '#6b7280' }}>-</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <label style={{ fontSize: '0.8rem', color: '#6b7280' }}>Close:</label>
                      <input
                        type="time"
                        value={formData.businessHours[day.key]?.closeTime || '17:00'}
                        min={formData.businessHours[day.key]?.openTime || '09:00'}
                        onChange={(e) => handleHourChange(day.key, 'closeTime', e.target.value)}
                        style={{ 
                          padding: '0.4rem 0.5rem', 
                          border: timeError?.day === day.key ? '1px solid #ef4444' : '1px solid #e5e7eb', 
                          borderRadius: '6px', 
                          fontSize: '0.85rem',
                          backgroundColor: timeError?.day === day.key ? '#fef2f2' : 'white'
                        }}
                      />
                    </div>
                  </div>
                  {timeError?.day === day.key && (
                    <div style={{ fontSize: '0.75rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <i className="fas fa-exclamation-circle"></i>
                      {timeError.message}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '0.85rem' }}>Closed</div>
              )}

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={formData.businessHours[day.key]?.isAvailable === false}
                  onChange={() => handleToggleClosed(day.key)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Closed</span>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default BusinessHoursStep;
