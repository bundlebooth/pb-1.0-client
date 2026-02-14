import React, { useState, useEffect, useRef } from 'react';
import UniversalModal from './UniversalModal';
import './DateSearchModal.css';

const DateSearchModal = ({ 
  isOpen, 
  onClose, 
  onApply, 
  initialStartDate, 
  initialEndDate,
  initialStartTime,
  initialEndTime,
  onSwitchToLocation,
  showStepIndicator = true,
  currentStep = 2,
  anchorRef = null,
  asDropdown = false
}) => {
  const dropdownRef = useRef(null);
  const [selectedDate, setSelectedDate] = useState(initialStartDate || '');
  const [startTime, setStartTime] = useState(initialStartTime || '');
  const [endTime, setEndTime] = useState(initialEndTime || '');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [timeError, setTimeError] = useState('');

  // Common timezones for North America
  const timezones = [
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Toronto', label: 'Toronto (ET)' },
    { value: 'America/Vancouver', label: 'Vancouver (PT)' },
    { value: 'America/Halifax', label: 'Atlantic Time (AT)' },
    { value: 'America/St_Johns', label: 'Newfoundland (NT)' },
    { value: 'UTC', label: 'UTC' }
  ];

  // Validate that start time is before end time (no overnight)
  const validateTimes = (start, end) => {
    if (!start || !end) {
      setTimeError('');
      return true;
    }
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    if (startMinutes >= endMinutes) {
      setTimeError('End time must be after start time (no overnight events)');
      return false;
    }
    setTimeError('');
    return true;
  };

  const handleStartTimeChange = (newStartTime) => {
    setStartTime(newStartTime);
    validateTimes(newStartTime, endTime);
  };

  const handleEndTimeChange = (newEndTime) => {
    setEndTime(newEndTime);
    validateTimes(startTime, newEndTime);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedDate(initialStartDate || '');
      setStartTime(initialStartTime || '');
      setEndTime(initialEndTime || '');
      setTimeError('');
      // Set current month to show the selected date if exists
      if (initialStartDate) {
        const [year, month] = initialStartDate.split('-').map(Number);
        setCurrentMonth(new Date(year, month - 1, 1));
      } else {
        setCurrentMonth(new Date());
      }
    }
  }, [isOpen, initialStartDate, initialStartTime, initialEndTime]);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const formatDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleDateClick = (date) => {
    if (!date || date < new Date().setHours(0, 0, 0, 0)) return;
    const dateStr = formatDateString(date);
    setSelectedDate(dateStr);
  };

  const isDateSelected = (date) => {
    if (!date || !selectedDate) return false;
    return formatDateString(date) === selectedDate;
  };

  const isDateDisabled = (date) => {
    if (!date) return true;
    return date < new Date().setHours(0, 0, 0, 0);
  };

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const handleApply = () => {
    // Validate times before applying
    if (startTime && endTime && !validateTimes(startTime, endTime)) {
      return; // Don't apply if times are invalid
    }
    onApply({
      startDate: selectedDate,
      endDate: selectedDate,
      startTime,
      endTime,
      timezone
    });
    onClose();
  };

  const handleClear = () => {
    setSelectedDate('');
    setStartTime('');
    setEndTime('');
  };

  const days = getDaysInMonth(currentMonth);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!anchorRef || !isOpen) return;
    
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          anchorRef.current && !anchorRef.current.contains(event.target)) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, anchorRef, onClose]);

  // If anchorRef is provided, render as dropdown instead of modal
  if (anchorRef) {
    if (!isOpen) return null;
    
    return (
      <div 
        ref={dropdownRef}
        className="date-search-dropdown"
        style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          zIndex: 1000,
          background: '#fff',
          borderRadius: '0 0 16px 16px',
          boxShadow: '0 8px 40px rgba(0, 0, 0, 0.15)',
          borderTop: '1px solid #e0e0e0',
          minWidth: '500px'
        }}
      >
        <div className="date-search-content">
          {/* Left side - Calendar */}
          <div className="date-search-calendar">
            <div className="calendar-header">
              <button onClick={handlePrevMonth} className="calendar-nav-btn" type="button">
                <i className="fas fa-chevron-left"></i>
              </button>
              <h3 className="calendar-title">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h3>
              <button onClick={handleNextMonth} className="calendar-nav-btn" type="button">
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
                  type="button"
                  className={`calendar-day ${
                    date ? (
                      isDateSelected(date) ? 'selected' :
                      isDateDisabled(date) ? 'disabled' :
                      date.toDateString() === new Date().toDateString() ? 'today' : ''
                    ) : 'empty'
                  }`}
                  onClick={() => handleDateClick(date)}
                  disabled={isDateDisabled(date)}
                >
                  {date ? date.getDate() : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Right side - Time selection */}
          <div className="date-search-time">
            <h4>Select a date</h4>
            
            {/* Time inputs */}
            <div className="time-input-group">
              <label>Start time</label>
              <select 
                value={startTime} 
                onChange={(e) => handleStartTimeChange(e.target.value)}
                className="time-select"
              >
                <option value="">Select time</option>
                {Array.from({ length: 24 }, (_, i) => {
                  const hour = i.toString().padStart(2, '0');
                  return (
                    <React.Fragment key={i}>
                      <option value={`${hour}:00`}>{i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i-12}:00 PM`}</option>
                      <option value={`${hour}:30`}>{i === 0 ? '12:30 AM' : i < 12 ? `${i}:30 AM` : i === 12 ? '12:30 PM' : `${i-12}:30 PM`}</option>
                    </React.Fragment>
                  );
                })}
              </select>
            </div>

            <div className="time-input-group">
              <label>End time</label>
              <select 
                value={endTime} 
                onChange={(e) => handleEndTimeChange(e.target.value)}
                className="time-select"
              >
                <option value="">Select time</option>
                {Array.from({ length: 24 }, (_, i) => {
                  const hour = i.toString().padStart(2, '0');
                  return (
                    <React.Fragment key={i}>
                      <option value={`${hour}:00`}>{i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i-12}:00 PM`}</option>
                      <option value={`${hour}:30`}>{i === 0 ? '12:30 AM' : i < 12 ? `${i}:30 AM` : i === 12 ? '12:30 PM' : `${i-12}:30 PM`}</option>
                    </React.Fragment>
                  );
                })}
              </select>
            </div>

            {timeError && (
              <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '8px' }}>
                {timeError}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button 
                type="button"
                onClick={handleClear}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  background: '#fff',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Clear
              </button>
              <button 
                type="button"
                onClick={handleApply}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  border: 'none',
                  borderRadius: '8px',
                  background: '#4F86E8',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={onClose}
      title="Select availability"
      size="medium"
      primaryAction={{ label: 'Save date', onClick: handleApply }}
      secondaryAction={{ label: 'Delete date', onClick: handleClear, variant: 'text' }}
    >
      <div className="date-search-content">
        {/* Left side - Calendar */}
        <div className="date-search-calendar">
          <div className="calendar-header">
            <button onClick={handlePrevMonth} className="calendar-nav-btn" type="button">
              <i className="fas fa-chevron-left"></i>
            </button>
            <h3 className="calendar-title">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h3>
            <button onClick={handleNextMonth} className="calendar-nav-btn" type="button">
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
                type="button"
                className={`calendar-day ${
                  date ? (
                    isDateSelected(date) ? 'selected' : 
                    isDateDisabled(date) ? 'disabled' : 'available'
                  ) : 'empty'
                }`}
                onClick={() => handleDateClick(date)}
                disabled={!date || isDateDisabled(date)}
              >
                {date ? date.getDate() : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Right side - Date display and Time Selection */}
        <div className="date-search-sidebar">
          {/* Selected Date Display */}
          <div className="selected-date-display">
            {selectedDate ? formatDisplayDate(selectedDate) : 'Select a date'}
          </div>

          {/* Time Selection */}
          <div className="time-input-group">
            <label>Start time</label>
            <select 
              value={startTime} 
              onChange={(e) => handleStartTimeChange(e.target.value)}
              className="time-select"
            >
              <option value="">Select time</option>
              {Array.from({ length: 48 }, (_, i) => {
                const hour = Math.floor(i / 2);
                const min = i % 2 === 0 ? '00' : '30';
                const time = `${hour.toString().padStart(2, '0')}:${min}`;
                const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                const period = hour < 12 ? 'AM' : 'PM';
                return (
                  <option key={time} value={time}>
                    {displayHour}:{min} {period}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="time-input-group">
            <label>End time</label>
            <select 
              value={endTime} 
              onChange={(e) => handleEndTimeChange(e.target.value)}
              className={`time-select ${timeError ? 'error' : ''}`}
            >
              <option value="">Select time</option>
              {Array.from({ length: 48 }, (_, i) => {
                const hour = Math.floor(i / 2);
                const min = i % 2 === 0 ? '00' : '30';
                const time = `${hour.toString().padStart(2, '0')}:${min}`;
                const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                const period = hour < 12 ? 'AM' : 'PM';
                return (
                  <option key={time} value={time}>
                    {displayHour}:{min} {period}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Time validation error */}
          {timeError && (
            <div className="time-error">
              <i className="fas fa-exclamation-circle"></i>
              <span>{timeError}</span>
            </div>
          )}

          {/* Timezone selector */}
          <div className="time-input-group">
            <label>Timezone</label>
            <select 
              value={timezone} 
              onChange={(e) => setTimezone(e.target.value)}
              className="time-select"
            >
              {timezones.map(tz => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>
        </div>

      </div>
    </UniversalModal>
  );
};

export default DateSearchModal;
