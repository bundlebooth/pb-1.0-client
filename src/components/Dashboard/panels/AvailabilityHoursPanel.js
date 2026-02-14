import React, { useState, useEffect } from 'react';
import { showBanner } from '../../../utils/helpers';
import { apiGet, apiPut } from '../../../utils/api';
import { API_BASE_URL } from '../../../config';
import { FormRow, ToggleSwitch, SelectDropdown, TextArea, SectionHeader } from '../../common/FormFields';

function AvailabilityHoursPanel({ onBack, vendorProfileId }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [timezone, setTimezone] = useState('');
  const [originalTimezone, setOriginalTimezone] = useState('');
  const [originalHours, setOriginalHours] = useState(null);
  const [hours, setHours] = useState({
    monday: { open: '09:00', close: '17:00', closed: false },
    tuesday: { open: '09:00', close: '17:00', closed: false },
    wednesday: { open: '09:00', close: '17:00', closed: false },
    thursday: { open: '09:00', close: '17:00', closed: false },
    friday: { open: '09:00', close: '17:00', closed: false },
    saturday: { open: '10:00', close: '16:00', closed: false },
    sunday: { open: '10:00', close: '16:00', closed: true }
  });

  const daysOfWeek = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' }
  ];

  useEffect(() => {
    if (vendorProfileId) {
      loadHours();
    } else {
      setLoading(false);
    }
  }, [vendorProfileId]);

  const loadHours = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/vendors/${vendorProfileId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Handle nested structure from /vendors/:id endpoint
        const profile = result.data?.profile || result.profile || result;
        const businessHours = result.data?.businessHours || result.businessHours || [];
        
        // Set timezone from profile - check multiple possible field names
        const tz = profile.Timezone || profile.timezone || profile.TimeZone || profile.time_zone;
        if (tz) {
          setTimezone(tz);
        }
        
        // Also check if timezone is stored in businessHours
        if (!tz && businessHours.length > 0 && businessHours[0].Timezone) {
          setTimezone(businessHours[0].Timezone);
        }
        
        // Convert business hours array to object format
        if (businessHours.length > 0) {
          const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const hoursObj = {};
          
          businessHours.forEach(bh => {
            const dayName = dayMap[bh.DayOfWeek];
            if (dayName) {
              hoursObj[dayName] = {
                open: bh.OpenTime ? bh.OpenTime.substring(0, 5) : '09:00',
                close: bh.CloseTime ? bh.CloseTime.substring(0, 5) : '17:00',
                closed: !bh.IsAvailable
              };
            }
          });
          
          // Merge with defaults for any missing days
          setHours(prev => {
            const merged = { ...prev, ...hoursObj };
            setOriginalHours(merged);
            return merged;
          });
        } else {
          setOriginalHours(hours);
        }
        setOriginalTimezone(tz || timezone);
      }
    } catch (error) {
      console.error('Error loading hours:', error);
    } finally {
      setLoading(false);
    }
  };

  const [timeError, setTimeError] = useState(null);

  const handleHourChange = (day, field, value) => {
    setHours(prev => {
      const currentDayHours = prev[day];
      const newOpenTime = field === 'open' ? value : currentDayHours?.open || '09:00';
      const newCloseTime = field === 'close' ? value : currentDayHours?.close || '17:00';
      
      // Validate: close time must be after open time (no overnight hours)
      if (newCloseTime <= newOpenTime) {
        // If setting open time and it would be >= close time, auto-adjust close time
        if (field === 'open') {
          const [hours, mins] = value.split(':').map(Number);
          const adjustedHours = hours + 1 > 23 ? 23 : hours + 1;
          const adjustedClose = `${String(adjustedHours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
          setTimeError({ day, message: 'Close time adjusted - overnight hours not supported' });
          setTimeout(() => setTimeError(null), 3000);
          return {
            ...prev,
            [day]: {
              ...currentDayHours,
              open: value,
              close: adjustedClose
            }
          };
        }
        // If setting close time and it would be <= open time, show error and don't allow it
        if (field === 'close') {
          setTimeError({ day, message: 'Close time must be after open time - overnight hours not supported' });
          setTimeout(() => setTimeError(null), 3000);
          return prev; // Don't update, keep current value
        }
      }
      
      setTimeError(null);
      return {
        ...prev,
        [day]: {
          ...currentDayHours,
          [field]: value
        }
      };
    });
  };

  const handleToggleClosed = (day) => {
    setHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        closed: !prev[day].closed
      }
    }));
  };

  // Check if there are changes
  const hasChanges = originalHours ? (
    timezone !== originalTimezone ||
    JSON.stringify(hours) !== JSON.stringify(originalHours)
  ) : false;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      // Convert day names to DayOfWeek numbers (0=Sunday, 1=Monday, etc.)
      const dayMap = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
      const businessHoursData = Object.entries(hours).map(([day, data]) => ({
        dayOfWeek: dayMap[day],
        openTime: data.open,
        closeTime: data.close,
        isAvailable: !data.closed
      }));

      const response = await fetch(`${API_BASE_URL}/vendors/setup/step4-business-hours`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          vendorProfileId,
          timezone,
          businessHours: businessHoursData
        })
      });
      
      if (response.ok) {
        showBanner('Business hours updated successfully!', 'success');
        setOriginalHours({ ...hours });
        setOriginalTimezone(timezone);
      } else {
        throw new Error('Failed to update');
      }
    } catch (error) {
      console.error('Error saving:', error);
      showBanner('Failed to save changes', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <button className="btn btn-outline back-to-menu-btn" style={{ marginBottom: '1rem' }} onClick={onBack}>
          <i className="fas fa-arrow-left"></i> Back to Business Profile Menu
        </button>
        <div className="dashboard-card">
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="spinner" style={{ margin: '0 auto' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button className="btn btn-outline back-to-menu-btn" style={{ marginBottom: '1rem' }} onClick={onBack}>
        <i className="fas fa-arrow-left"></i> Back to Business Profile Menu
      </button>
      <div className="dashboard-card">
        <h2 className="dashboard-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#f0f7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontSize: '1.1rem' }}>
            <i className="fas fa-calendar-check"></i>
          </span>
          Availability & Hours
        </h2>
        <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Set your business hours and booking preferences</p>
        <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '1.5rem 0' }} />
        
        {/* Timezone Selection */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text)', fontSize: '0.9rem' }}>
            <i className="fas fa-globe" style={{ color: 'var(--primary)', marginRight: '0.5rem' }}></i>
            Timezone
          </label>
          <select
            id="business-timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              background: 'white',
              fontSize: '0.95rem',
              color: 'var(--text)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              appearance: 'none',
              backgroundImage: 'url(\'data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23666%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e\')',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 1rem center',
              backgroundSize: '1.25rem',
              paddingRight: '3rem'
            }}
          >
            <option value="" disabled>Select timezone...</option>
            <option value="America/St_Johns">America/St_Johns (NST) GMT -3:30</option>
            <option value="America/Halifax">America/Halifax (AST) GMT -4:00</option>
            <option value="America/Toronto">America/Toronto (EST) GMT -5:00</option>
            <option value="America/Winnipeg">America/Winnipeg (CST) GMT -6:00</option>
            <option value="America/Edmonton">America/Edmonton (MST) GMT -7:00</option>
            <option value="America/Vancouver">America/Vancouver (PST) GMT -8:00</option>
          </select>
          <small style={{ color: 'var(--text-light)', display: 'block', marginTop: '0.5rem', fontSize: '0.85rem' }}>
            This timezone will be displayed to customers viewing your profile
          </small>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {daysOfWeek.map(day => (
              <div
                key={day.key}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '120px 1fr auto',
                  gap: '1rem',
                  alignItems: 'center',
                  padding: '1rem',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  background: hours[day.key].closed ? '#f9fafb' : 'white'
                }}
              >
                <div style={{ fontWeight: 600 }}>{day.label}</div>
                
                {!hours[day.key].closed ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>Open:</label>
                        <input
                          type="time"
                          value={hours[day.key].open}
                          onChange={(e) => handleHourChange(day.key, 'open', e.target.value)}
                          max="22:59"
                          style={{ padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
                        />
                      </div>
                      <span style={{ color: 'var(--text-light)' }}>-</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>Close:</label>
                        <input
                          type="time"
                          value={hours[day.key].close}
                          min={hours[day.key].open}
                          onChange={(e) => handleHourChange(day.key, 'close', e.target.value)}
                          style={{ 
                            padding: '0.5rem', 
                            border: timeError?.day === day.key ? '1px solid #ef4444' : '1px solid var(--border)', 
                            borderRadius: 'var(--radius)',
                            backgroundColor: timeError?.day === day.key ? '#fef2f2' : 'white'
                          }}
                        />
                      </div>
                    </div>
                    {timeError?.day === day.key && (
                      <div style={{ fontSize: '0.8rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <i className="fas fa-exclamation-circle"></i>
                        {timeError.message}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-light)', fontStyle: 'italic' }}>
                    Closed
                  </div>
                )}

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={hours[day.key].closed}
                    onChange={() => handleToggleClosed(day.key)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.9rem' }}>Closed</span>
                </label>
              </div>
            ))}
          </div>

          <div id="business-hours-container" style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'start' }}>
              <i className="fas fa-info-circle" style={{ color: 'var(--primary)', marginTop: '0.25rem' }}></i>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text)' }}>
                These hours will be displayed on your public profile. You can still accept bookings outside these hours by arrangement.
              </p>
            </div>
          </div>

          <button 
            id="save-business-hours-btn" 
            onClick={handleSubmit}
            disabled={!hasChanges || saving || !!timeError}
            style={{ 
              backgroundColor: (!hasChanges || saving || !!timeError) ? '#9ca3af' : '#3d3d3d', 
              border: 'none', 
              color: 'white',
              padding: '12px 20px',
              borderRadius: '8px',
              fontWeight: 500,
              fontSize: '14px',
              cursor: (!hasChanges || saving || !!timeError) ? 'not-allowed' : 'pointer'
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AvailabilityHoursPanel;
