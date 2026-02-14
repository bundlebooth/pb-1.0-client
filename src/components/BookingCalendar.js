import React, { useState } from 'react';
import './Calendar.css';

// Simple calendar component - NO useEffects to avoid infinite loops
const BookingCalendar = ({ selectedDate, onDateSelect, onClose, vendorAvailability }) => {
  // Initialize calendar to the first available date based on lead time
  const getInitialMonth = () => {
    if (vendorAvailability?.minBookingLeadTimeHours) {
      const leadTimeMs = vendorAvailability.minBookingLeadTimeHours * 60 * 60 * 1000;
      const minBookingDate = new Date(Date.now() + leadTimeMs);
      return minBookingDate;
    }
    return new Date();
  };
  
  const [currentMonth, setCurrentMonth] = useState(getInitialMonth);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    for (let day = 1; day <= lastDay.getDate(); day++) days.push(new Date(year, month, day));
    return days;
  };

  const isDateDisabled = (date) => {
    if (!date) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return true;
    
    // Check minimum booking lead time (advance notice requirement)
    if (vendorAvailability?.minBookingLeadTimeHours) {
      const leadTimeMs = vendorAvailability.minBookingLeadTimeHours * 60 * 60 * 1000;
      const minBookingDate = new Date(Date.now() + leadTimeMs);
      minBookingDate.setHours(0, 0, 0, 0);
      if (date < minBookingDate) return true;
    }
    
    if (!vendorAvailability?.businessHours) return false;
    
    const dayOfWeek = date.getDay();
    const dayHours = vendorAvailability.businessHours.find(bh => bh.DayOfWeek === dayOfWeek);
    if (!dayHours) return true;
    return !(dayHours.IsAvailable === true || dayHours.IsAvailable === 1);
  };

  const isDateSelected = (date) => {
    if (!date || !selectedDate) return false;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}` === selectedDate;
  };

  const handleDateClick = (date) => {
    if (!date || isDateDisabled(date)) return;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    onDateSelect(`${y}-${m}-${d}`);
  };

  const days = getDaysInMonth(currentMonth);

  return (
    <div className="calendar-popup">
      <button onClick={onClose} className="calendar-close-x modal-close-btn" title="Close">
        ×
      </button>
      
      <div className="calendar-section">
        <div className="calendar-header">
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="calendar-nav-btn">
            <i className="fas fa-chevron-left"></i>
          </button>
          <h3 className="calendar-title">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h3>
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="calendar-nav-btn">
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>

        <div className="calendar-grid">
          {dayNames.map((day) => (
            <div key={day} className="calendar-day-header">{day}</div>
          ))}
          {days.map((date, index) => (
            <button
              key={index}
              className={`calendar-day ${date ? (isDateSelected(date) ? 'selected' : isDateDisabled(date) ? 'disabled' : 'available') : 'empty'}`}
              onClick={() => handleDateClick(date)}
              disabled={!date || isDateDisabled(date)}
            >
              {date ? date.getDate() : ''}
            </button>
          ))}
        </div>
        
        {vendorAvailability && (
          <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#f0f9ff', borderRadius: '8px', fontSize: '0.85rem', color: '#0369a1' }}>
            <i className="fas fa-info-circle" style={{ marginRight: '0.5rem' }}></i>
            {vendorAvailability.minBookingLeadTimeHours > 0 
              ? `Bookings require ${vendorAvailability.minBookingLeadTimeHours >= 168 
                  ? `${Math.floor(vendorAvailability.minBookingLeadTimeHours / 168)} week${Math.floor(vendorAvailability.minBookingLeadTimeHours / 168) > 1 ? 's' : ''}` 
                  : vendorAvailability.minBookingLeadTimeHours >= 24 
                    ? `${Math.floor(vendorAvailability.minBookingLeadTimeHours / 24)} day${Math.floor(vendorAvailability.minBookingLeadTimeHours / 24) > 1 ? 's' : ''}` 
                    : `${vendorAvailability.minBookingLeadTimeHours} hours`} advance notice`
              : 'Only dates when vendor is available are shown'}
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingCalendar;
