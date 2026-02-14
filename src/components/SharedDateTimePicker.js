import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../config';
import './SharedDateTimePicker.css';

const SharedDateTimePicker = ({ 
  vendorId,
  businessHours = [],
  timezone = null,
  minBookingLeadTimeHours = 0,
  selectedDate: propSelectedDate = null,
  selectedStartTime: propSelectedStartTime = null,
  selectedEndTime: propSelectedEndTime = null,
  onDateChange,
  onStartTimeChange,
  onEndTimeChange,
  onSave,
  onDelete,
  showSaveDeleteButtons = true,
  inline = false
}) => {
  // Calculate the first available date based on lead time
  const getFirstAvailableDate = () => {
    if (minBookingLeadTimeHours > 0) {
      const leadTimeMs = minBookingLeadTimeHours * 60 * 60 * 1000;
      return new Date(Date.now() + leadTimeMs);
    }
    return new Date();
  };

  const [currentMonth, setCurrentMonth] = useState(getFirstAvailableDate);
  const [selectedDate, setSelectedDate] = useState(propSelectedDate ? new Date(propSelectedDate + 'T00:00:00') : null);
  const [selectedStartTime, setSelectedStartTime] = useState(propSelectedStartTime);
  const [selectedEndTime, setSelectedEndTime] = useState(propSelectedEndTime);
  const [vendorBookings, setVendorBookings] = useState([]);
  const [availabilityExceptions, setAvailabilityExceptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [calendarReady, setCalendarReady] = useState(true);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

  // Generate all time options (30-min intervals)
  const allTimeOptions = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      allTimeOptions.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }

  // Sync with prop changes
  useEffect(() => {
    if (propSelectedDate) {
      setSelectedDate(new Date(propSelectedDate + 'T00:00:00'));
    } else {
      setSelectedDate(null);
    }
  }, [propSelectedDate]);

  useEffect(() => {
    setSelectedStartTime(propSelectedStartTime);
  }, [propSelectedStartTime]);

  useEffect(() => {
    setSelectedEndTime(propSelectedEndTime);
  }, [propSelectedEndTime]);

  // Fetch vendor bookings for calendar display
  const fetchVendorBookings = useCallback(async () => {
    if (!vendorId) return;
    try {
      const response = await fetch(`${API_BASE_URL}/bookings/vendor/${vendorId}`);
      if (response.ok) {
        const data = await response.json();
        const bookings = data.bookings || [];
        const activeBookings = bookings.filter(b => {
          const status = (b.Status || '').toLowerCase();
          return status === 'confirmed' || status === 'pending' || status === 'paid' || status === 'approved';
        });
        setVendorBookings(activeBookings);
      }
    } catch (error) {
      console.error('Error fetching vendor bookings:', error);
    }
  }, [vendorId]);

  // Fetch availability exceptions
  const fetchAvailabilityExceptions = useCallback(async () => {
    if (!vendorId) return;
    try {
      const response = await fetch(`${API_BASE_URL}/vendors/${vendorId}/availability`);
      if (response.ok) {
        const data = await response.json();
        setAvailabilityExceptions(data.exceptions || []);
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
    }
  }, [vendorId]);

  useEffect(() => {
    fetchVendorBookings();
    fetchAvailabilityExceptions();
  }, [fetchVendorBookings, fetchAvailabilityExceptions]);

  // Get days in month for calendar
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }
    
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const days = getDaysInMonth(currentMonth);

  // Check if a date is in the past or within lead time
  const isDatePast = (date) => {
    if (!date) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return true;
    
    // Check lead time requirement
    if (minBookingLeadTimeHours > 0) {
      const leadTimeMs = minBookingLeadTimeHours * 60 * 60 * 1000;
      const minBookingDate = new Date(Date.now() + leadTimeMs);
      minBookingDate.setHours(0, 0, 0, 0);
      if (date < minBookingDate) return true;
    }
    return false;
  };

  // Check if vendor is available on a specific day of week
  const isVendorAvailableOnDay = (date) => {
    if (!date || !businessHours || businessHours.length === 0) return true;
    const dayOfWeek = date.getDay();
    const dayHours = businessHours.find(bh => bh.DayOfWeek === dayOfWeek);
    if (!dayHours) return false;
    return dayHours.IsAvailable === true || dayHours.IsAvailable === 1;
  };

  // Format date to YYYY-MM-DD string
  const formatDateString = (date) => {
    if (!date) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Get availability status for a date
  const getDateAvailabilityStatus = (date) => {
    if (!date) return 'empty';
    if (isDatePast(date)) return 'past';
    if (!isVendorAvailableOnDay(date)) return 'unavailable';

    const dateStr = formatDateString(date);
    
    const exception = availabilityExceptions.find(ex => {
      const exDate = new Date(ex.Date);
      return formatDateString(exDate) === dateStr;
    });
    if (exception && !exception.IsAvailable) return 'unavailable';

    const dayBookings = vendorBookings.filter(booking => {
      if (!booking.EventDate) return false;
      const bookingDate = new Date(booking.EventDate);
      const bookingDateStr = formatDateString(bookingDate);
      const status = (booking.Status || '').toLowerCase();
      const isActiveStatus = status === 'confirmed' || status === 'pending' || 
                             status === 'paid' || status === 'approved';
      return bookingDateStr === dateStr && isActiveStatus;
    });

    if (dayBookings.length > 0) {
      return 'partially_booked';
    }

    return 'available';
  };

  // Parse time string to hour/minute object
  const parseTimeString = (timeStr) => {
    if (!timeStr) return null;
    if (typeof timeStr !== 'string') {
      if (timeStr instanceof Date) {
        return { hour: timeStr.getHours(), minute: timeStr.getMinutes() };
      }
      timeStr = String(timeStr);
    }
    if (timeStr.includes('T')) {
      const d = new Date(timeStr);
      return { hour: d.getHours(), minute: d.getMinutes() };
    }
    const parts = timeStr.split(':');
    return { hour: parseInt(parts[0]), minute: parseInt(parts[1] || 0) };
  };

  // Format time for display (12-hour format)
  const formatTime12Hour = (timeStr) => {
    if (!timeStr) return 'Select';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Handle date selection
  const handleDateSelect = (date) => {
    if (!date || isDatePast(date) || !isVendorAvailableOnDay(date)) return;
    const status = getDateAvailabilityStatus(date);
    if (status === 'fully_booked' || status === 'unavailable') return;
    
    setSelectedDate(date);
    setSelectedStartTime(null);
    setSelectedEndTime(null);
    
    if (onDateChange) {
      onDateChange(formatDateString(date));
    }
    if (onStartTimeChange) {
      onStartTimeChange(null);
    }
    if (onEndTimeChange) {
      onEndTimeChange(null);
    }
  };

  // Handle start time change
  const handleStartTimeChange = (time) => {
    setSelectedStartTime(time);
    setSelectedEndTime(null);
    if (onStartTimeChange) {
      onStartTimeChange(time);
    }
    if (onEndTimeChange) {
      onEndTimeChange(null);
    }
  };

  // Handle end time change
  const handleEndTimeChange = (time) => {
    setSelectedEndTime(time);
    if (onEndTimeChange) {
      onEndTimeChange(time);
    }
  };

  // Handle save
  const handleSave = () => {
    if (onSave) {
      onSave({
        date: selectedDate ? formatDateString(selectedDate) : null,
        startTime: selectedStartTime,
        endTime: selectedEndTime
      });
    }
  };

  // Handle delete
  const handleDelete = () => {
    setSelectedDate(null);
    setSelectedStartTime(null);
    setSelectedEndTime(null);
    if (onDateChange) onDateChange(null);
    if (onStartTimeChange) onStartTimeChange(null);
    if (onEndTimeChange) onEndTimeChange(null);
    if (onDelete) onDelete();
  };

  // Get filtered start time options
  const getStartTimeOptions = () => {
    if (!selectedDate) return [];
    
    const dayOfWeek = selectedDate.getDay();
    const dayHours = businessHours.find(bh => bh.DayOfWeek === dayOfWeek);
    if (!dayHours || !dayHours.IsAvailable) return [];
    
    const openTime = parseTimeString(dayHours.OpenTime);
    const closeTime = parseTimeString(dayHours.CloseTime);
    if (!openTime || !closeTime) return allTimeOptions;
    
    const openMins = openTime.hour * 60 + openTime.minute;
    const closeMins = closeTime.hour * 60 + closeTime.minute;
    
    const dateStr = formatDateString(selectedDate);
    const dayBookings = vendorBookings.filter(b => {
      if (!b.EventDate) return false;
      const status = (b.Status || '').toLowerCase();
      const isActive = status === 'confirmed' || status === 'pending' || status === 'paid' || status === 'approved';
      return formatDateString(new Date(b.EventDate)) === dateStr && isActive;
    });
    
    return allTimeOptions.filter(time => {
      const [h, m] = time.split(':').map(Number);
      const mins = h * 60 + m;
      if (mins < openMins || mins >= closeMins) return false;
      
      for (const booking of dayBookings) {
        let startHour, startMin, endHour, endMin;
        
        // Parse start time - match timeline visualization logic exactly
        if (booking.EventTime) {
          const timeParts = booking.EventTime.split(':');
          startHour = parseInt(timeParts[0]);
          startMin = parseInt(timeParts[1] || 0);
        } else {
          // Fallback to EventDate time component
          const eventDate = new Date(booking.EventDate);
          startHour = eventDate.getHours();
          startMin = eventDate.getMinutes();
        }
        
        // Parse end time - match timeline visualization logic exactly
        if (booking.EventEndTime) {
          const endParts = booking.EventEndTime.split(':');
          endHour = parseInt(endParts[0]);
          endMin = parseInt(endParts[1] || 0);
        } else if (booking.EndDate) {
          const endDate = new Date(booking.EndDate);
          endHour = endDate.getHours();
          endMin = endDate.getMinutes();
        } else {
          // Default to 2 hours if no end time (same as timeline)
          endHour = startHour + 2;
          endMin = startMin;
        }
        
        const bStartMins = startHour * 60 + startMin;
        const bEndMins = endHour * 60 + endMin;
        
        if (mins >= bStartMins && mins < bEndMins) return false;
      }
      return true;
    });
  };

  // Get filtered end time options
  const getEndTimeOptions = () => {
    if (!selectedDate || !selectedStartTime) return [];
    
    const dayOfWeek = selectedDate.getDay();
    const dayHours = businessHours.find(bh => bh.DayOfWeek === dayOfWeek);
    const closeTime = dayHours ? parseTimeString(dayHours.CloseTime) : null;
    const closeMins = closeTime ? closeTime.hour * 60 + closeTime.minute : 23 * 60 + 30;
    
    const startMins = parseInt(selectedStartTime.split(':')[0]) * 60 + parseInt(selectedStartTime.split(':')[1]);
    
    const dateStr = formatDateString(selectedDate);
    const dayBookings = vendorBookings.filter(b => {
      if (!b.EventDate) return false;
      const status = (b.Status || '').toLowerCase();
      const isActive = status === 'confirmed' || status === 'pending' || status === 'paid' || status === 'approved';
      return formatDateString(new Date(b.EventDate)) === dateStr && isActive;
    });
    
    let maxEndMins = closeMins;
    for (const booking of dayBookings) {
      let startHour, startMin;
      
      // Parse start time - match timeline visualization logic exactly
      if (booking.EventTime) {
        const timeParts = booking.EventTime.split(':');
        startHour = parseInt(timeParts[0]);
        startMin = parseInt(timeParts[1] || 0);
      } else {
        // Fallback to EventDate time component
        const eventDate = new Date(booking.EventDate);
        startHour = eventDate.getHours();
        startMin = eventDate.getMinutes();
      }
      
      const bStartMins = startHour * 60 + startMin;
      if (bStartMins > startMins && bStartMins < maxEndMins) {
        maxEndMins = bStartMins;
      }
    }
    
    return allTimeOptions.filter(time => {
      const [h, m] = time.split(':').map(Number);
      const mins = h * 60 + m;
      return mins > startMins && mins <= maxEndMins;
    });
  };

  const startTimeOptions = getStartTimeOptions();
  const endTimeOptions = getEndTimeOptions();

  return (
    <div className={`sdtp-container ${inline ? 'sdtp-inline' : ''}`}>
      {/* Calendar Section */}
      <div className="sdtp-calendar-section">
        <div className="sdtp-calendar-nav">
          <button 
            className="sdtp-nav-arrow"
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
            type="button"
          >
            <i className="fas fa-chevron-left"></i>
          </button>
          <span className="sdtp-month-year">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </span>
          <button 
            className="sdtp-nav-arrow"
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
            type="button"
          >
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>

        <div className="sdtp-calendar-days">
          {dayNames.map(day => (
            <div key={day} className="sdtp-weekday">{day}</div>
          ))}
          {days.map((date, index) => {
            const status = date ? getDateAvailabilityStatus(date) : 'empty';
            const isSelected = date && selectedDate && formatDateString(date) === formatDateString(selectedDate);
            const isToday = date && formatDateString(date) === formatDateString(new Date());
            
            return (
              <button
                key={index}
                type="button"
                className={`sdtp-day-btn ${status} ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                onClick={() => handleDateSelect(date)}
                disabled={!date || status === 'past' || status === 'unavailable' || status === 'fully_booked'}
              >
                {date ? date.getDate() : ''}
                {status === 'partially_booked' && <span className="sdtp-partial-dot"></span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Timeline Section - ABOVE time selectors */}
      {selectedDate && (
        <div className="sdtp-timeline-section">
          <div className="sdtp-timeline-labels">
            <span>12:00<br/>AM</span>
            <span>3:00<br/>AM</span>
            <span>6:00<br/>AM</span>
            <span>9:00<br/>AM</span>
            <span>12:00<br/>PM</span>
            <span>3:00<br/>PM</span>
            <span>6:00<br/>PM</span>
            <span>9:00<br/>PM</span>
            <span>12:00<br/>AM</span>
          </div>
          <div className="sdtp-timeline-track">
            {/* Business hours visualization */}
            {(() => {
              const dayOfWeek = selectedDate.getDay();
              const dayHours = businessHours.find(bh => bh.DayOfWeek === dayOfWeek);
              
              if (!dayHours || !(dayHours.IsAvailable === true || dayHours.IsAvailable === 1)) {
                return <div className="sdtp-timeline-unavailable" style={{ left: '0%', width: '100%' }} />;
              }
              
              const openTime = parseTimeString(dayHours.OpenTime);
              const closeTime = parseTimeString(dayHours.CloseTime);
              
              if (openTime && closeTime) {
                const openMins = openTime.hour * 60 + (openTime.minute || 0);
                const closeMins = closeTime.hour * 60 + (closeTime.minute || 0);
                const openPct = (openMins / (24 * 60)) * 100;
                const closePct = (closeMins / (24 * 60)) * 100;
                const availableWidthPct = closePct - openPct;
                
                return (
                  <>
                    {openPct > 0 && (
                      <div className="sdtp-timeline-unavailable" style={{ left: '0%', width: `${openPct}%` }} />
                    )}
                    <div className="sdtp-timeline-available" style={{ left: `${openPct}%`, width: `${availableWidthPct}%` }} />
                    {closePct < 100 && (
                      <div className="sdtp-timeline-unavailable" style={{ left: `${closePct}%`, width: `${100 - closePct}%` }} />
                    )}
                  </>
                );
              }
              return null;
            })()}
            
            {/* Booked slots overlay */}
            {vendorBookings
              .filter(b => {
                if (!b.EventDate) return false;
                const status = (b.Status || '').toLowerCase();
                const isActiveStatus = status === 'confirmed' || status === 'pending' || 
                                       status === 'paid' || status === 'approved';
                return formatDateString(new Date(b.EventDate)) === formatDateString(selectedDate) && isActiveStatus;
              })
              .map((booking, idx) => {
                let startHour, startMin, endHour, endMin;
                
                if (booking.EventTime) {
                  const timeParts = booking.EventTime.split(':');
                  startHour = parseInt(timeParts[0]);
                  startMin = parseInt(timeParts[1] || 0);
                } else {
                  const eventDate = new Date(booking.EventDate);
                  startHour = eventDate.getHours();
                  startMin = eventDate.getMinutes();
                }
                
                if (booking.EventEndTime) {
                  const endParts = booking.EventEndTime.split(':');
                  endHour = parseInt(endParts[0]);
                  endMin = parseInt(endParts[1] || 0);
                } else if (booking.EndDate) {
                  const endDate = new Date(booking.EndDate);
                  endHour = endDate.getHours();
                  endMin = endDate.getMinutes();
                } else {
                  endHour = startHour + 2;
                  endMin = startMin;
                }
                
                if (startHour === 0 && startMin === 0 && endHour === 0 && endMin === 0 && !booking.EventTime) {
                  return <div key={idx} className="sdtp-timeline-booked" style={{ left: '0%', width: '100%' }} />;
                }
                
                const startPct = ((startHour * 60 + startMin) / (24 * 60)) * 100;
                const widthPct = ((endHour * 60 + endMin) - (startHour * 60 + startMin)) / (24 * 60) * 100;
                return (
                  <div 
                    key={idx}
                    className="sdtp-timeline-booked"
                    style={{ left: `${startPct}%`, width: `${Math.max(widthPct, 5)}%` }}
                  />
                );
              })}
            
            {/* Selected time range */}
            {selectedStartTime && selectedEndTime && (
              <div 
                className="sdtp-timeline-selected"
                style={{
                  left: `${(parseInt(selectedStartTime.split(':')[0]) * 60 + parseInt(selectedStartTime.split(':')[1])) / (24 * 60) * 100}%`,
                  width: `${((parseInt(selectedEndTime.split(':')[0]) * 60 + parseInt(selectedEndTime.split(':')[1])) - (parseInt(selectedStartTime.split(':')[0]) * 60 + parseInt(selectedStartTime.split(':')[1]))) / (24 * 60) * 100}%`
                }}
              />
            )}
          </div>
          
          {/* Timeline Legend */}
          <div className="sdtp-timeline-legend">
            <div className="sdtp-legend-item">
              <div className="sdtp-legend-dot available"></div>
              <span>Available</span>
            </div>
            <div className="sdtp-legend-item">
              <div className="sdtp-legend-dot unavailable"></div>
              <span>Closed</span>
            </div>
            <div className="sdtp-legend-item">
              <div className="sdtp-legend-dot booked"></div>
              <span>Booked</span>
            </div>
            <div className="sdtp-legend-item">
              <div className="sdtp-legend-dot selected"></div>
              <span>Selected</span>
            </div>
          </div>
        </div>
      )}

      {/* Time Selection Section - BELOW timeline */}
      {selectedDate && (
        <div className="sdtp-time-section">
          <h4 className="sdtp-selected-date-title">
            {monthNames[selectedDate.getMonth()]} {selectedDate.getDate()}, {selectedDate.getFullYear()}
          </h4>

          <div className="sdtp-time-pickers-row">
            <div className="sdtp-time-picker-group">
              <label>Start time</label>
              <select 
                value={selectedStartTime || ''}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                className="sdtp-time-select"
              >
                <option value="">Select time</option>
                {startTimeOptions.map(time => (
                  <option key={time} value={time}>{formatTime12Hour(time)}</option>
                ))}
              </select>
            </div>

            <div className="sdtp-time-picker-group">
              <label>End time</label>
              <select 
                value={selectedEndTime || ''}
                onChange={(e) => handleEndTimeChange(e.target.value)}
                className="sdtp-time-select"
                disabled={!selectedStartTime}
              >
                <option value="">Select time</option>
                {endTimeOptions.map(time => (
                  <option key={time} value={time}>{formatTime12Hour(time)}</option>
                ))}
              </select>
            </div>
          </div>

          {timezone && (
            <div className="sdtp-timezone-inline">
              <i className="fas fa-globe"></i>
              <span>{timezone}</span>
            </div>
          )}

          {showSaveDeleteButtons && (
            <div className="sdtp-action-buttons">
              <button 
                type="button"
                className="sdtp-save-date-btn"
                onClick={handleSave}
              >
                Save date
              </button>
              <button 
                type="button"
                className="sdtp-delete-date-btn"
                onClick={handleDelete}
              >
                Delete date
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SharedDateTimePicker;
