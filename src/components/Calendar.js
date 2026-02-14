import React, { useState } from 'react';
import './Calendar.css';

const Calendar = ({ selectedDate, onDateSelect, onClose, startTime, endTime, onTimeChange }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [localStartTime, setLocalStartTime] = useState(startTime || '11:00');
  const [localEndTime, setLocalEndTime] = useState(endTime || '17:00');

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleDateClick = (date) => {
    if (date && date >= new Date().setHours(0, 0, 0, 0)) {
      // Format date in local timezone to avoid UTC conversion issues
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      onDateSelect(`${year}-${month}-${day}`);
      // Don't close - let user select times
    }
  };

  const handleTimeChange = (type, value) => {
    if (type === 'start') {
      setLocalStartTime(value);
      if (onTimeChange) {
        onTimeChange('start', value);
      }
    } else {
      setLocalEndTime(value);
      if (onTimeChange) {
        onTimeChange('end', value);
      }
    }
  };

  const calculateDuration = () => {
    if (!localStartTime || !localEndTime) return '0 hours';
    const [startHour, startMin] = localStartTime.split(':').map(Number);
    const [endHour, endMin] = localEndTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const duration = (endMinutes - startMinutes) / 60;
    return `${duration} hour${duration !== 1 ? 's' : ''} selected`;
  };

  const isDateSelected = (date) => {
    if (!date || !selectedDate) return false;
    // Format date in local timezone to avoid UTC conversion issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}` === selectedDate;
  };

  const isDateDisabled = (date) => {
    if (!date) return true;
    return date < new Date().setHours(0, 0, 0, 0);
  };

  const days = getDaysInMonth(currentMonth);

  return (
    <div className="calendar-popup">
      {/* Close button at top right */}
      <button onClick={onClose} className="calendar-close-x modal-close-btn" title="Close">
        ×
      </button>
      
      <div className="calendar-content">
        {/* Left side - Calendar */}
        <div className="calendar-left">
          <div className="calendar-header">
            <button onClick={handlePrevMonth} className="calendar-nav-btn">
              <i className="fas fa-chevron-left"></i>
            </button>
            <h3 className="calendar-title">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h3>
            <button onClick={handleNextMonth} className="calendar-nav-btn">
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>

          <div className="calendar-grid">
            {dayNames.map((day) => (
              <div key={day} className="calendar-day-header">
                {day}
              </div>
            ))}
            
            {days.map((date, index) => (
              <button
                key={index}
                className={`calendar-day ${
                  date ? (isDateSelected(date) ? 'selected' : isDateDisabled(date) ? 'disabled' : 'available') : 'empty'
                }`}
                onClick={() => handleDateClick(date)}
                disabled={!date || isDateDisabled(date)}
              >
                {date ? date.getDate() : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Right side - Time Selection - Always show */}
        <div className="calendar-right">
          <div className="time-selection">
            <div className="time-duration">{calculateDuration()}</div>
            
            <div className="time-inputs">
            <div className="time-input-group">
              <label>
                <i className="fas fa-clock"></i> Start time
              </label>
              <select 
                value={localStartTime} 
                onChange={(e) => handleTimeChange('start', e.target.value)}
                className="time-select"
              >
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
              <label>
                <i className="fas fa-clock"></i> End time
              </label>
              <select 
                value={localEndTime} 
                onChange={(e) => handleTimeChange('end', e.target.value)}
                className="time-select"
              >
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calendar;
