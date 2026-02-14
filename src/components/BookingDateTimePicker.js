import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../config';
import {
  MONTH_NAMES,
  DAY_NAMES,
  parseTimeString,
  formatDateString,
  formatTime12Hour,
  getDaysInMonth,
  getDateAvailabilityStatus,
  getFilteredStartTimeOptions,
  getFilteredEndTimeOptions,
  calculateAutoEndTime,
  getBusinessHoursForTimeline,
  getBookedSlotsForTimeline,
  getSelectedTimeRangeForTimeline,
  generateAllTimeOptions
} from '../utils/availabilityUtils';
import './BookingDateTimePicker.css';

const BookingDateTimePicker = ({ 
  vendorId,
  selectedDate: propSelectedDate,
  selectedStartTime: propStartTime,
  selectedEndTime: propEndTime,
  onDateSelect,
  onStartTimeChange,
  onEndTimeChange,
  vendorAvailability,
  timezone
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [vendorBookings, setVendorBookings] = useState([]);
  const [availabilityExceptions, setAvailabilityExceptions] = useState([]);
  
  // Use internal state for times
  const [selectedStartTime, setSelectedStartTime] = useState(null);
  const [selectedEndTime, setSelectedEndTime] = useState(null);
  
  // Convert selectedDate string to Date object
  const selectedDate = propSelectedDate ? new Date(propSelectedDate + 'T00:00:00') : null;
  
  // Reset times when date changes (from parent)
  useEffect(() => {
    setSelectedStartTime(null);
    setSelectedEndTime(null);
  }, [propSelectedDate]);

  // Fetch vendor bookings for calendar display
  const fetchVendorBookings = useCallback(async () => {
    if (!vendorId) return;
    try {
      const response = await fetch(`${API_BASE_URL}/bookings/vendor/${vendorId}`);
      if (response.ok) {
        const data = await response.json();
        const bookings = data.bookings || [];
        // Filter to only active bookings
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

  const businessHours = vendorAvailability?.businessHours || [];
  const allTimeOptions = generateAllTimeOptions();
  const days = getDaysInMonth(currentMonth);

  // Handle date selection
  const handleDateSelect = (date) => {
    if (!date) return;
    const status = getDateAvailabilityStatus(date, businessHours, vendorBookings, availabilityExceptions);
    if (status === 'past' || status === 'unavailable' || status === 'fully_booked') return;
    
    onDateSelect(formatDateString(date));
  };

  // Handle start time change
  const handleStartTimeChange = (newStartTime) => {
    setSelectedStartTime(newStartTime);
    onStartTimeChange(newStartTime);
    
    // Auto-set end time
    if (newStartTime && selectedDate) {
      const autoEndTime = calculateAutoEndTime(newStartTime, selectedDate, businessHours, 5);
      if (autoEndTime) {
        setSelectedEndTime(autoEndTime);
        onEndTimeChange(autoEndTime);
      }
    }
  };

  // Handle end time change
  const handleEndTimeChange = (newEndTime) => {
    setSelectedEndTime(newEndTime);
    onEndTimeChange(newEndTime);
  };

  // Get filtered time options
  const startTimeOptions = selectedDate 
    ? getFilteredStartTimeOptions(selectedDate, businessHours, vendorBookings, allTimeOptions)
    : [];
  
  const endTimeOptions = selectedDate && selectedStartTime
    ? getFilteredEndTimeOptions(selectedDate, selectedStartTime, businessHours, vendorBookings, allTimeOptions)
    : [];

  // Get timeline data
  const businessHoursTimeline = selectedDate ? getBusinessHoursForTimeline(selectedDate, businessHours) : null;
  const bookedSlots = selectedDate ? getBookedSlotsForTimeline(selectedDate, vendorBookings) : [];
  const selectedTimeRange = getSelectedTimeRangeForTimeline(selectedStartTime, selectedEndTime);

  return (
    <div className="booking-datetime-picker">
      {/* Calendar Section */}
      <div className="bdtp-calendar-section">
        <div className="bdtp-calendar-nav">
          <button 
            className="bdtp-nav-arrow"
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
          >
            <i className="fas fa-chevron-left"></i>
          </button>
          <span className="bdtp-month-title">
            <span className="bdtp-month-name">{MONTH_NAMES[currentMonth.getMonth()]}</span> {currentMonth.getFullYear()}
          </span>
          <button 
            className="bdtp-nav-arrow"
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
          >
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>

        <div className="bdtp-calendar-grid">
          {DAY_NAMES.map(day => (
            <div key={day} className="bdtp-day-header">{day}</div>
          ))}
          {days.map((date, index) => {
            const status = date ? getDateAvailabilityStatus(date, businessHours, vendorBookings, availabilityExceptions) : 'empty';
            const isSelected = date && selectedDate && formatDateString(date) === formatDateString(selectedDate);
            const isToday = date && formatDateString(date) === formatDateString(new Date());
            
            return (
              <button
                key={index}
                className={`bdtp-day ${status} ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                onClick={() => handleDateSelect(date)}
                disabled={!date || status === 'past' || status === 'unavailable' || status === 'fully_booked'}
              >
                {date ? date.getDate() : ''}
                {status === 'partially_booked' && <span className="bdtp-partial-dot"></span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Timeline Section */}
      {selectedDate && (
        <div className="bdtp-timeline-section">
          <div className="bdtp-timeline-labels">
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
          <div className="bdtp-timeline-track">
            {/* Business hours visualization */}
            {businessHoursTimeline && !businessHoursTimeline.isClosed && !businessHoursTimeline.isOvernight && !businessHoursTimeline.morningOnlyFromPrevDay && (
              <>
                {/* Normal hours (e.g., 9 AM - 5 PM) */}
                {/* Morning portion from previous day's overnight (if any) */}
                {businessHoursTimeline.hasMorningFromPrevDay && businessHoursTimeline.morningWidthPct > 0 && (
                  <div className="bdtp-timeline-available" style={{ left: '0%', width: `${businessHoursTimeline.morningWidthPct}%` }} />
                )}
                {/* Closed portion before open time */}
                {businessHoursTimeline.openPct > 0 && (
                  <div className="bdtp-timeline-unavailable" style={{ 
                    left: businessHoursTimeline.hasMorningFromPrevDay ? `${businessHoursTimeline.morningWidthPct}%` : '0%', 
                    width: businessHoursTimeline.hasMorningFromPrevDay ? `${businessHoursTimeline.openPct - businessHoursTimeline.morningWidthPct}%` : `${businessHoursTimeline.openPct}%` 
                  }} />
                )}
                <div className="bdtp-timeline-available" style={{ left: `${businessHoursTimeline.openPct}%`, width: `${businessHoursTimeline.availableWidthPct}%` }} />
                {businessHoursTimeline.closePct < 100 && (
                  <div className="bdtp-timeline-unavailable" style={{ left: `${businessHoursTimeline.closePct}%`, width: `${100 - businessHoursTimeline.closePct}%` }} />
                )}
              </>
            )}
            {businessHoursTimeline && !businessHoursTimeline.isClosed && businessHoursTimeline.isOvernight && (
              <>
                {/* Overnight hours (e.g., 6 PM - 2 AM) */}
                {/* Morning portion from PREVIOUS day's overnight (if any) */}
                {businessHoursTimeline.hasMorningFromPrevDay && businessHoursTimeline.morningWidthPct > 0 && (
                  <div className="bdtp-timeline-available" style={{ left: '0%', width: `${businessHoursTimeline.morningWidthPct}%` }} />
                )}
                {/* Middle portion: morning close to evening open (unavailable) */}
                <div className="bdtp-timeline-unavailable" style={{ 
                  left: businessHoursTimeline.hasMorningFromPrevDay ? `${businessHoursTimeline.closePct}%` : '0%', 
                  width: businessHoursTimeline.hasMorningFromPrevDay ? `${businessHoursTimeline.openPct - businessHoursTimeline.closePct}%` : `${businessHoursTimeline.openPct}%` 
                }} />
                {/* Evening portion: open time to midnight (available) */}
                <div className="bdtp-timeline-available" style={{ left: `${businessHoursTimeline.openPct}%`, width: `${businessHoursTimeline.eveningWidthPct}%` }} />
              </>
            )}
            {businessHoursTimeline && !businessHoursTimeline.isClosed && businessHoursTimeline.morningOnlyFromPrevDay && (
              <>
                {/* Day is closed but has morning availability from previous day's overnight */}
                <div className="bdtp-timeline-available" style={{ left: '0%', width: `${businessHoursTimeline.morningWidthPct}%` }} />
                <div className="bdtp-timeline-unavailable" style={{ left: `${businessHoursTimeline.morningWidthPct}%`, width: `${100 - businessHoursTimeline.morningWidthPct}%` }} />
              </>
            )}
            {businessHoursTimeline?.isClosed && (
              <div className="bdtp-timeline-unavailable" style={{ left: '0%', width: '100%' }} />
            )}
            
            {/* Booked sessions */}
            {bookedSlots.map((slot, idx) => (
              <div 
                key={idx}
                className="bdtp-timeline-booked"
                style={{ left: `${slot.startPct}%`, width: `${slot.widthPct}%` }}
              />
            ))}
            
            {/* Selected time range */}
            {selectedTimeRange && (
              <div 
                className="bdtp-timeline-selected"
                style={{
                  left: `${selectedTimeRange.startPct}%`,
                  width: `${selectedTimeRange.widthPct}%`
                }}
              />
            )}
          </div>
          
          {/* Legend */}
          <div className="bdtp-timeline-legend">
            <div className="bdtp-legend-item">
              <div className="bdtp-legend-dot available"></div>
              <span>Available</span>
            </div>
            <div className="bdtp-legend-item">
              <div className="bdtp-legend-dot unavailable"></div>
              <span>Closed</span>
            </div>
            <div className="bdtp-legend-item">
              <div className="bdtp-legend-dot booked"></div>
              <span>Booked</span>
            </div>
            <div className="bdtp-legend-item">
              <div className="bdtp-legend-dot selected"></div>
              <span>Selected</span>
            </div>
          </div>
        </div>
      )}

      {/* Time Selection */}
      {selectedDate && (
        <div className="bdtp-time-section">
          <h4 className="bdtp-date-title">
            {MONTH_NAMES[selectedDate.getMonth()]} {selectedDate.getDate()}, {selectedDate.getFullYear()}
          </h4>

          <div className="bdtp-time-fields">
            <div className="bdtp-time-field">
              <label>Start time</label>
              <select 
                value={selectedStartTime || ''}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                className="bdtp-time-select"
              >
                <option value="">Select Time</option>
                {startTimeOptions.map(time => (
                  <option key={time} value={time}>{formatTime12Hour(time)}</option>
                ))}
              </select>
            </div>

            <div className="bdtp-time-field">
              <label>End time</label>
              <select 
                value={selectedEndTime || ''}
                onChange={(e) => handleEndTimeChange(e.target.value)}
                className="bdtp-time-select"
                disabled={!selectedStartTime}
              >
                <option value="">Select Time</option>
                {endTimeOptions.map(time => (
                  <option key={time} value={time}>{formatTime12Hour(time)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Timezone */}
          {timezone && (
            <div className="bdtp-timezone">
              <i className="fas fa-globe"></i>
              <span>{timezone}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BookingDateTimePicker;
