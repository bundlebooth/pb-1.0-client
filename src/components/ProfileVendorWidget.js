import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { useLocalization } from '../context/LocalizationContext';
import { encodeVendorId } from '../utils/hashIds';
import './ProfileVendorWidget.css';

const ProfileVendorWidget = ({ 
  vendorId, 
  vendorName,
  packages = [],
  services = [],
  businessHours = [],
  basePrice = null,
  priceType = 'per_hour',
  minBookingHours = 1,
  timezone = null,
  cancellationPolicy = null,
  instantBookingEnabled = false,
  minBookingLeadTimeHours = 0,
  onReserve,
  onMessage,
  prefilledDate = null,
  prefilledStartTime = null,
  prefilledEndTime = null
}) => {
  const navigate = useNavigate();
  const { formatCurrency } = useLocalization();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedStartTime, setSelectedStartTime] = useState(null);
  const [selectedEndTime, setSelectedEndTime] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [vendorBookings, setVendorBookings] = useState([]);
  const [availabilityExceptions, setAvailabilityExceptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const pickerRef = useRef(null);
  const widgetRef = useRef(null);

  // Click outside handler to close picker - only close if clicking outside the entire widget
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (widgetRef.current && !widgetRef.current.contains(event.target)) {
        setShowDatePicker(false);
      }
    };

    if (showDatePicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDatePicker]);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

  // Fetch vendor bookings for calendar display
  const fetchVendorBookings = useCallback(async () => {
    if (!vendorId) return;
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/bookings/vendor/${vendorId}`);
      if (response.ok) {
        const data = await response.json();
        // The /bookings/vendor/:id endpoint returns { success: true, bookings: [] }
        const bookings = data.bookings || [];
        // Filter to only active bookings
        const activeBookings = bookings.filter(b => {
          const status = (b.Status || '').toLowerCase();
          return status === 'confirmed' || status === 'pending' || status === 'paid' || status === 'approved';
        });
        // Group by month to show which months have bookings
        const bookingsByMonth = {};
        activeBookings.forEach(b => {
          if (b.EventDate) {
            const d = new Date(b.EventDate);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            bookingsByMonth[key] = (bookingsByMonth[key] || 0) + 1;
          }
        });
        setVendorBookings(bookings);
      }
    } catch (error) {
      console.error('Error fetching vendor bookings:', error);
    } finally {
      setLoading(false);
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

  // Initialize from prefilled date/time props (from search bar)
  useEffect(() => {
    if (prefilledDate) {
      // Parse the date string (YYYY-MM-DD) to a Date object
      const [year, month, day] = prefilledDate.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      setSelectedDate(date);
      setCurrentMonth(new Date(year, month - 1, 1));
      
      // Set times if provided
      if (prefilledStartTime) {
        setSelectedStartTime(prefilledStartTime);
      }
      if (prefilledEndTime) {
        setSelectedEndTime(prefilledEndTime);
      }
    }
  }, [prefilledDate, prefilledStartTime, prefilledEndTime]);

  // Auto-select first available date based on lead time when picker opens
  useEffect(() => {
    if (showDatePicker && !selectedDate) {
      // Calculate first available date based on lead time
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let firstAvailableDate = new Date(today);
      
      // Add lead time hours
      if (minBookingLeadTimeHours > 0) {
        const leadTimeMs = minBookingLeadTimeHours * 60 * 60 * 1000;
        firstAvailableDate = new Date(Date.now() + leadTimeMs);
        firstAvailableDate.setHours(0, 0, 0, 0);
        // If we're past midnight after adding lead time, move to next day
        if (new Date(Date.now() + leadTimeMs).getDate() !== today.getDate()) {
          firstAvailableDate.setDate(firstAvailableDate.getDate() + 1);
        }
      }
      
      // Find the first day that's actually available (checking business hours)
      let daysChecked = 0;
      const maxDaysToCheck = 60; // Don't check more than 60 days ahead
      
      while (daysChecked < maxDaysToCheck) {
        const dayOfWeek = firstAvailableDate.getDay();
        const dayHours = businessHours?.find(bh => bh.DayOfWeek === dayOfWeek);
        const isAvailable = dayHours?.IsAvailable === true || dayHours?.IsAvailable === 1;
        
        // If no business hours defined, assume available
        if (!businessHours || businessHours.length === 0 || isAvailable) {
          break;
        }
        
        firstAvailableDate.setDate(firstAvailableDate.getDate() + 1);
        daysChecked++;
      }
      
      // Set the selected date and update current month to show it
      setSelectedDate(firstAvailableDate);
      setCurrentMonth(new Date(firstAvailableDate.getFullYear(), firstAvailableDate.getMonth(), 1));
    }
  }, [showDatePicker, selectedDate, minBookingLeadTimeHours, businessHours]);

  // Get days in month for calendar
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

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

  // Get availability status for a date (available, partially_booked, fully_booked, unavailable)
  const getDateAvailabilityStatus = (date) => {
    if (!date) return 'empty';
    if (isDatePast(date)) return 'past';
    if (!isVendorAvailableOnDay(date)) return 'unavailable';

    const dateStr = formatDateString(date);
    
    // Check exceptions
    const exception = availabilityExceptions.find(ex => {
      const exDate = new Date(ex.Date);
      return formatDateString(exDate) === dateStr;
    });
    if (exception && !exception.IsAvailable) return 'unavailable';

    // Check bookings for this date
    const dayBookings = vendorBookings.filter(booking => {
      if (!booking.EventDate) return false;
      const bookingDate = new Date(booking.EventDate);
      const bookingDateStr = formatDateString(bookingDate);
      // Include all active booking statuses (case-insensitive check)
      const status = (booking.Status || '').toLowerCase();
      const isActiveStatus = status === 'confirmed' || status === 'pending' || 
                             status === 'paid' || status === 'approved';
      const matches = bookingDateStr === dateStr && isActiveStatus;
      return matches;
    });

    // If there are any bookings for this date, mark as partially booked
    // (Since bookings don't have separate time fields, we treat any booking as partial)
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

  // Format date to YYYY-MM-DD string
  const formatDateString = (date) => {
    if (!date) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Format date for display
  const formatDisplayDate = (date) => {
    if (!date) return 'Add date';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  };

  // Get available time slots for selected date
  const getAvailableTimeSlots = () => {
    if (!selectedDate || !businessHours || businessHours.length === 0) return [];
    
    const dayOfWeek = selectedDate.getDay();
    const dayHours = businessHours.find(bh => bh.DayOfWeek === dayOfWeek);
    if (!dayHours || !dayHours.IsAvailable) return [];

    const openTime = parseTimeString(dayHours.OpenTime);
    const closeTime = parseTimeString(dayHours.CloseTime);
    if (!openTime || !closeTime) return [];

    const slots = [];
    let currentHour = openTime.hour;
    let currentMinute = openTime.minute || 0;
    const closeMinutes = closeTime.hour * 60 + (closeTime.minute || 0);

    while (currentHour * 60 + currentMinute <= closeMinutes) {
      const timeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
      
      // Check if this slot is booked
      const dateStr = formatDateString(selectedDate);
      const isBooked = vendorBookings.some(booking => {
        const bookingDate = formatDateString(new Date(booking.EventDate));
        if (bookingDate !== dateStr) return false;
        
        const bookingStart = parseTimeString(booking.EventTime);
        const bookingEnd = parseTimeString(booking.EventEndTime);
        if (!bookingStart || !bookingEnd) return false;
        
        const slotMinutes = currentHour * 60 + currentMinute;
        const bookingStartMinutes = bookingStart.hour * 60 + bookingStart.minute;
        const bookingEndMinutes = bookingEnd.hour * 60 + bookingEnd.minute;
        
        return slotMinutes >= bookingStartMinutes && slotMinutes < bookingEndMinutes;
      });

      slots.push({ time: timeStr, isBooked });
      
      currentMinute += 30;
      if (currentMinute >= 60) {
        currentMinute = 0;
        currentHour++;
      }
    }

    return slots;
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
  };

  // Calculate total price
  const calculateTotal = () => {
    if (selectedPackage) {
      const price = selectedPackage.SalePrice && parseFloat(selectedPackage.SalePrice) < parseFloat(selectedPackage.Price)
        ? parseFloat(selectedPackage.SalePrice)
        : parseFloat(selectedPackage.Price);
      return price;
    }

    if (!basePrice || !selectedStartTime || !selectedEndTime) return null;

    const startParts = selectedStartTime.split(':');
    const endParts = selectedEndTime.split(':');
    const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
    const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
    const hours = (endMinutes - startMinutes) / 60;

    if (priceType === 'per_hour') {
      return basePrice * hours;
    }
    return basePrice;
  };

  // Handle reserve button click
  const handleReserve = () => {
    console.log('Reserve button clicked!');
    const bookingData = {
      vendorId,
      selectedDate: selectedDate ? formatDateString(selectedDate) : null,
      selectedStartTime,
      selectedEndTime,
      selectedPackage,
      totalPrice: calculateTotal()
    };
    console.log('Booking data:', bookingData);
    console.log('onReserve prop:', onReserve);

    if (onReserve) {
      console.log('Calling onReserve callback...');
      onReserve(bookingData);
    } else {
      // Navigate to booking page with pre-filled data
      const params = new URLSearchParams();
      if (selectedDate) params.set('date', formatDateString(selectedDate));
      if (selectedStartTime) params.set('startTime', selectedStartTime);
      if (selectedEndTime) params.set('endTime', selectedEndTime);
      if (selectedPackage) params.set('packageId', selectedPackage.PackageID);
      
      console.log('Navigating to:', `/booking/${encodeVendorId(vendorId)}?${params.toString()}`);
      navigate(`/booking/${encodeVendorId(vendorId)}?${params.toString()}`);
    }
  };

  const days = getDaysInMonth(currentMonth);
  const timeSlots = getAvailableTimeSlots();
  const total = calculateTotal();

  // Get display price
  const displayPrice = selectedPackage 
    ? (selectedPackage.SalePrice && parseFloat(selectedPackage.SalePrice) < parseFloat(selectedPackage.Price)
        ? parseFloat(selectedPackage.SalePrice)
        : parseFloat(selectedPackage.Price))
    : basePrice;

  // Generate all time options for dropdowns (every 30 min)
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let min = 0; min < 60; min += 30) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
        options.push(timeStr);
      }
    }
    return options;
  };

  const allTimeOptions = generateTimeOptions();

  // Format lead time for display
  const formatLeadTime = (hours) => {
    if (!hours || hours <= 0) return null;
    if (hours >= 168) return `${Math.floor(hours / 168)} week${Math.floor(hours / 168) > 1 ? 's' : ''} advance notice`;
    if (hours >= 24) return `${Math.floor(hours / 24)} day${Math.floor(hours / 24) > 1 ? 's' : ''} advance notice`;
    return `${hours} hours advance notice`;
  };

  return (
    <div className={`giggster-booking-widget ${showDatePicker ? 'picker-open' : ''}`} ref={widgetRef}>
      {/* Price Header */}
      <div className="gbw-header">
        <div className="gbw-price-section">
          {displayPrice ? (
            <>
              <span className="gbw-price-prefix">Starting from </span>
              <span className="gbw-price">{formatCurrency(displayPrice, null, { showCents: false })}</span>
              <span className="gbw-price-suffix">/hr</span>
            </>
          ) : (
            <span className="gbw-price">Request a Quote</span>
          )}
        </div>
      </div>

      {/* Date Selection Row */}
      <div 
        className={`gbw-date-selector ${showDatePicker ? 'active' : ''}`}
        onClick={() => setShowDatePicker(!showDatePicker)}
      >
        {selectedDate ? (
          <>
            <span className="gbw-date-text">
              {formatDisplayDate(selectedDate)}
            </span>
            <span className="gbw-time-text">
              {selectedStartTime && selectedEndTime 
                ? `${formatTime12Hour(selectedStartTime)} – ${formatTime12Hour(selectedEndTime)}`
                : 'Select time'}
            </span>
          </>
        ) : (
          <span className="gbw-pick-text">Pick day and time</span>
        )}
        <i className={`fas fa-chevron-${showDatePicker ? 'up' : 'down'} gbw-chevron`}></i>
      </div>

      {/* Date Picker Dropdown */}
      {showDatePicker && (
        <div className="gbw-picker-container" ref={pickerRef} onClick={(e) => e.stopPropagation()}>
            {/* Main Content - Side by Side */}
            <div className="gbw-picker-main">
              {/* Left Side - Calendar */}
              <div className="gbw-calendar-section">
                <div className="gbw-calendar-nav">
                  <button 
                    className="gbw-nav-arrow"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
                    }}
                  >
                    <i className="fas fa-chevron-left"></i>
                  </button>
                  <span className="gbw-month-year">
                    {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                  </span>
                  <button 
                    className="gbw-nav-arrow"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
                    }}
                  >
                    <i className="fas fa-chevron-right"></i>
                  </button>
                </div>

                <div className="gbw-calendar-days">
                  {dayNames.map(day => (
                    <div key={day} className="gbw-weekday">{day}</div>
                  ))}
                  {days.map((date, index) => {
                    const status = date ? getDateAvailabilityStatus(date) : 'empty';
                    const isSelected = date && selectedDate && formatDateString(date) === formatDateString(selectedDate);
                    const isToday = date && formatDateString(date) === formatDateString(new Date());
                    
                    return (
                      <button
                        key={index}
                        className={`gbw-day-btn ${status} ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDateSelect(date);
                        }}
                        disabled={!date || status === 'past' || status === 'unavailable' || status === 'fully_booked'}
                      >
                        {date ? date.getDate() : ''}
                        {status === 'partially_booked' && <span className="gbw-partial-dot"></span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Side - Time Selection */}
              <div className="gbw-time-section">
                {selectedDate ? (
                  <>
                    <h4 className="gbw-selected-date-title">
                      {monthNames[selectedDate.getMonth()]} {selectedDate.getDate()}, {selectedDate.getFullYear()}
                    </h4>

                    <div className="gbw-time-picker-row">
                  <label>Start time</label>
                  <select 
                    value={selectedStartTime || ''}
                    onChange={(e) => setSelectedStartTime(e.target.value)}
                    className="gbw-time-select"
                  >
                    <option value="">Select time</option>
                    {(() => {
                      // Filter times based on business hours for selected day
                      const dayOfWeek = selectedDate.getDay();
                      const dayHours = businessHours.find(bh => bh.DayOfWeek === dayOfWeek);
                      if (!dayHours || !dayHours.IsAvailable) return null;
                      
                      const openTime = parseTimeString(dayHours.OpenTime);
                      const closeTime = parseTimeString(dayHours.CloseTime);
                      if (!openTime || !closeTime) return allTimeOptions.map(time => (
                        <option key={time} value={time}>{formatTime12Hour(time)}</option>
                      ));
                      
                      const openMins = openTime.hour * 60 + openTime.minute;
                      const closeMins = closeTime.hour * 60 + closeTime.minute;
                      
                      // Get bookings for this date to check for overlaps
                      const dateStr = formatDateString(selectedDate);
                      const dayBookings = vendorBookings.filter(b => {
                        if (!b.EventDate) return false;
                        const status = (b.Status || '').toLowerCase();
                        const isActive = status === 'confirmed' || status === 'pending' || status === 'paid' || status === 'approved';
                        return formatDateString(new Date(b.EventDate)) === dateStr && isActive;
                      });
                      
                      return allTimeOptions
                        .filter(time => {
                          const [h, m] = time.split(':').map(Number);
                          const mins = h * 60 + m;
                          // Must be within business hours
                          if (mins < openMins || mins >= closeMins) return false;
                          // Check if this time falls within any booked slot
                          for (const booking of dayBookings) {
                            let startHour, startMin, endHour, endMin;
                            
                            // Parse start time - match timeline visualization logic exactly
                            if (booking.EventTime) {
                              const timeParts = booking.EventTime.split(':');
                              startHour = parseInt(timeParts[0]);
                              startMin = parseInt(timeParts[1] || 0);
                            } else {
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
                        })
                        .map(time => (
                          <option key={time} value={time}>{formatTime12Hour(time)}</option>
                        ));
                    })()}
                  </select>
                </div>

                <div className="gbw-time-picker-row">
                  <label>End time</label>
                  <select 
                    value={selectedEndTime || ''}
                    onChange={(e) => setSelectedEndTime(e.target.value)}
                    className="gbw-time-select"
                  >
                    <option value="">Select time</option>
                    {(() => {
                      // Filter times based on business hours and start time
                      const dayOfWeek = selectedDate.getDay();
                      const dayHours = businessHours.find(bh => bh.DayOfWeek === dayOfWeek);
                      const closeTime = dayHours ? parseTimeString(dayHours.CloseTime) : null;
                      // Default to 11:30 PM if no business hours found
                      const closeMins = closeTime ? closeTime.hour * 60 + closeTime.minute : 23 * 60 + 30;
                      
                      const startMins = selectedStartTime 
                        ? parseInt(selectedStartTime.split(':')[0]) * 60 + parseInt(selectedStartTime.split(':')[1])
                        : 0;
                      
                      // Get bookings for this date to find the next booking after start time
                      const dateStr = formatDateString(selectedDate);
                      const dayBookings = vendorBookings.filter(b => {
                        if (!b.EventDate) return false;
                        const status = (b.Status || '').toLowerCase();
                        const isActive = status === 'confirmed' || status === 'pending' || status === 'paid' || status === 'approved';
                        return formatDateString(new Date(b.EventDate)) === dateStr && isActive;
                      });
                      
                      // Find the earliest booking that starts after our selected start time
                      let maxEndMins = closeMins;
                      for (const booking of dayBookings) {
                        let startHour, startMin;
                        
                        // Parse start time - match timeline visualization logic exactly
                        if (booking.EventTime) {
                          const timeParts = booking.EventTime.split(':');
                          startHour = parseInt(timeParts[0]);
                          startMin = parseInt(timeParts[1] || 0);
                        } else {
                          const eventDate = new Date(booking.EventDate);
                          startHour = eventDate.getHours();
                          startMin = eventDate.getMinutes();
                        }
                        
                        const bStartMins = startHour * 60 + startMin;
                        // If this booking starts after our start time, we can't go past it
                        if (bStartMins > startMins && bStartMins < maxEndMins) {
                          maxEndMins = bStartMins;
                        }
                      }
                      
                      return allTimeOptions
                        .filter(time => {
                          const [h, m] = time.split(':').map(Number);
                          const mins = h * 60 + m;
                          return mins > startMins && mins <= maxEndMins;
                        })
                        .map(time => (
                          <option key={time} value={time}>{formatTime12Hour(time)}</option>
                        ));
                    })()}
                  </select>
                </div>

                {/* Timezone under End Time */}
                {timezone && (
                  <div className="gbw-timezone-inline">
                    <i className="fas fa-globe"></i>
                    <span>{timezone}</span>
                  </div>
                )}

                <div className="gbw-action-buttons">
                  <button 
                    className="gbw-save-date-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDatePicker(false);
                    }}
                  >
                    Save date
                  </button>
                  <button 
                    className="gbw-delete-date-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDate(null);
                      setSelectedStartTime(null);
                      setSelectedEndTime(null);
                    }}
                  >
                    Delete date
                  </button>
                </div>
                  </>
                ) : (
                  <div className="gbw-select-date-placeholder">
                    Select date
                  </div>
                )}
              </div>
            </div>

            {/* Timeline at Bottom - Full Width with Business Hours */}
            <div className="gbw-timeline-section">
              <div className="gbw-timeline-labels">
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
              <div className="gbw-timeline-track">
                {/* Show unavailable hours (outside business hours) and available hours */}
                {selectedDate && (() => {
                  const dayOfWeek = selectedDate.getDay();
                  const dayHours = businessHours.find(bh => bh.DayOfWeek === dayOfWeek);
                  
                  // If day is closed, show entire timeline as unavailable
                  if (!dayHours || !(dayHours.IsAvailable === true || dayHours.IsAvailable === 1)) {
                    return <div className="gbw-timeline-unavailable" style={{ left: '0%', width: '100%' }} />;
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
                        {/* Unavailable: before business hours */}
                        {openPct > 0 && (
                          <div 
                            className="gbw-timeline-unavailable"
                            style={{ left: '0%', width: `${openPct}%` }}
                          />
                        )}
                        {/* Available: business hours */}
                        <div 
                          className="gbw-timeline-available"
                          style={{ left: `${openPct}%`, width: `${availableWidthPct}%` }}
                        />
                        {/* Unavailable: after business hours */}
                        {closePct < 100 && (
                          <div 
                            className="gbw-timeline-unavailable"
                            style={{ left: `${closePct}%`, width: `${100 - closePct}%` }}
                          />
                        )}
                      </>
                    );
                  }
                  return null;
                })()}
                {/* Booked slots overlay */}
                {selectedDate && vendorBookings
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
                      return (
                        <div 
                          key={idx}
                          className="gbw-timeline-booked"
                          style={{ left: '0%', width: '100%' }}
                        />
                      );
                    }
                    
                    const startPct = ((startHour * 60 + startMin) / (24 * 60)) * 100;
                    const widthPct = ((endHour * 60 + endMin) - (startHour * 60 + startMin)) / (24 * 60) * 100;
                    return (
                      <div 
                        key={idx}
                        className="gbw-timeline-booked"
                        style={{ left: `${startPct}%`, width: `${Math.max(widthPct, 5)}%` }}
                      />
                    );
                  })}
                {/* Selected time range */}
                {selectedStartTime && selectedEndTime && (
                  <div 
                    className="gbw-timeline-selected"
                    style={{
                      left: `${(parseInt(selectedStartTime.split(':')[0]) * 60 + parseInt(selectedStartTime.split(':')[1])) / (24 * 60) * 100}%`,
                      width: `${((parseInt(selectedEndTime.split(':')[0]) * 60 + parseInt(selectedEndTime.split(':')[1])) - (parseInt(selectedStartTime.split(':')[0]) * 60 + parseInt(selectedStartTime.split(':')[1]))) / (24 * 60) * 100}%`
                    }}
                  />
                )}
              </div>
              {/* Timeline Legend */}
              <div className="gbw-timeline-legend">
                <div className="gbw-legend-item">
                  <div className="gbw-legend-dot available"></div>
                  <span>Available</span>
                </div>
                <div className="gbw-legend-item">
                  <div className="gbw-legend-dot unavailable"></div>
                  <span>Closed</span>
                </div>
                <div className="gbw-legend-item">
                  <div className="gbw-legend-dot booked"></div>
                  <span>Booked</span>
                </div>
                <div className="gbw-legend-item">
                  <div className="gbw-legend-dot selected"></div>
                  <span>Selected</span>
                </div>
              </div>
            </div>
          </div>
      )}

      {/* Reserve Button */}
      <button 
        className="gbw-reserve-btn"
        onClick={(e) => {
          e.stopPropagation();
          handleReserve();
        }}
      >
        Reserve
      </button>

      {/* Booking Policies - Instant Booking, Lead Time, Cancellation */}
      <div style={{ marginTop: '16px', borderTop: '1px solid #ebebeb', paddingTop: '16px' }}>
        {/* Instant Booking */}
        {instantBookingEnabled && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
            <i className="fas fa-bolt" style={{ color: '#5086E8', fontSize: '14px', marginTop: '2px', width: '16px' }}></i>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#222' }}>Instant Booking</div>
              <div style={{ fontSize: '12px', color: '#717171' }}>Book and pay now without waiting for vendor approval</div>
            </div>
          </div>
        )}

        {/* Lead Time / Advance Notice */}
        {minBookingLeadTimeHours > 0 && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
            <i className="fas fa-clock" style={{ color: '#f59e0b', fontSize: '14px', marginTop: '2px', width: '16px' }}></i>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#222' }}>Advance notice required</div>
              <div style={{ fontSize: '12px', color: '#717171' }}>
                {minBookingLeadTimeHours >= 168 
                  ? `Book at least ${Math.floor(minBookingLeadTimeHours / 168)} week${Math.floor(minBookingLeadTimeHours / 168) > 1 ? 's' : ''} in advance`
                  : minBookingLeadTimeHours >= 24 
                    ? `Book at least ${Math.floor(minBookingLeadTimeHours / 24)} day${Math.floor(minBookingLeadTimeHours / 24) > 1 ? 's' : ''} in advance`
                    : `Book at least ${minBookingLeadTimeHours} hours in advance`}
              </div>
            </div>
          </div>
        )}

        {/* Cancellation Policy */}
        {cancellationPolicy && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <i className="fas fa-calendar-times" style={{ color: '#222', fontSize: '14px', marginTop: '2px', width: '16px' }}></i>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#222' }}>
                {cancellationPolicy.PolicyType === 'flexible' 
                  ? 'Free cancellation' 
                  : cancellationPolicy.PolicyType === 'moderate' 
                    ? 'Moderate cancellation' 
                    : cancellationPolicy.PolicyType === 'strict'
                      ? 'Strict cancellation'
                      : 'Cancellation policy'}
              </div>
              <div style={{ fontSize: '12px', color: '#717171' }}>
                {cancellationPolicy.PolicyType === 'flexible' 
                  ? 'Free cancellation up to 24 hours before the event' 
                  : cancellationPolicy.PolicyType === 'moderate' 
                    ? 'Free cancellation up to 5 days before the event' 
                    : cancellationPolicy.PolicyType === 'strict'
                      ? 'Non-refundable after booking'
                      : cancellationPolicy.Description || 'Flexible cancellation policy'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Price Breakdown */}
      {total && selectedStartTime && selectedEndTime && (
        <div className="gbw-breakdown">
          <div className="gbw-breakdown-line">
            <span>
              ${displayPrice?.toFixed(0)} x {
                ((parseInt(selectedEndTime.split(':')[0]) * 60 + parseInt(selectedEndTime.split(':')[1])) - 
                (parseInt(selectedStartTime.split(':')[0]) * 60 + parseInt(selectedStartTime.split(':')[1]))) / 60
              } hours
            </span>
            <span>${total.toFixed(2)}</span>
          </div>
          <div className="gbw-breakdown-total">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileVendorWidget;
