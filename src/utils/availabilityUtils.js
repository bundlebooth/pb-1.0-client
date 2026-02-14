/**
 * Shared availability utility functions for vendor booking calendars
 * Used by ProfileVendorWidget and BookingDateTimePicker
 */

// Month and day name constants
export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

export const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const DAY_NAMES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

/**
 * Parse time string to hour/minute object
 * Handles various formats: "HH:MM", "HH:MM:SS", ISO timestamps, Date objects
 */
export const parseTimeString = (timeStr) => {
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

/**
 * Format date to YYYY-MM-DD string
 */
export const formatDateString = (date) => {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Format date for display (e.g., "Jan 15")
 */
export const formatDisplayDate = (date) => {
  if (!date) return 'Add date';
  return `${MONTH_NAMES_SHORT[date.getMonth()]} ${date.getDate()}`;
};

/**
 * Format time to 12-hour format (e.g., "2:30 PM")
 */
export const formatTime12Hour = (timeStr) => {
  if (!timeStr) return 'Select';
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

/**
 * Get days in month for calendar display
 * Returns array with null for empty cells before first day
 */
export const getDaysInMonth = (date) => {
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

/**
 * Check if a date is in the past
 */
export const isDatePast = (date) => {
  if (!date) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
};

/**
 * Check if vendor is available on a specific day of week based on business hours
 */
export const isVendorAvailableOnDay = (date, businessHours) => {
  if (!date || !businessHours || businessHours.length === 0) return true;
  const dayOfWeek = date.getDay();
  const dayHours = businessHours.find(bh => bh.DayOfWeek === dayOfWeek);
  if (!dayHours) return false;
  return dayHours.IsAvailable === true || dayHours.IsAvailable === 1;
};

/**
 * Get availability status for a date
 * Returns: 'empty', 'past', 'unavailable', 'partially_booked', 'fully_booked', 'available'
 */
export const getDateAvailabilityStatus = (date, businessHours, vendorBookings, availabilityExceptions) => {
  if (!date) return 'empty';
  if (isDatePast(date)) return 'past';
  if (!isVendorAvailableOnDay(date, businessHours)) return 'unavailable';

  const dateStr = formatDateString(date);
  
  // Check exceptions
  if (availabilityExceptions && availabilityExceptions.length > 0) {
    const exception = availabilityExceptions.find(ex => {
      const exDate = new Date(ex.Date);
      return formatDateString(exDate) === dateStr;
    });
    if (exception && !exception.IsAvailable) return 'unavailable';
  }

  // Check bookings for this date
  if (vendorBookings && vendorBookings.length > 0) {
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
  }

  return 'available';
};

/**
 * Get available time slots for a selected date
 * Filters out booked times and times outside business hours
 */
export const getAvailableTimeSlots = (selectedDate, businessHours, vendorBookings) => {
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
    const isBooked = vendorBookings?.some(booking => {
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

    slots.push({ time: timeStr, isBooked: isBooked || false });
    
    currentMinute += 30;
    if (currentMinute >= 60) {
      currentMinute = 0;
      currentHour++;
    }
  }

  return slots;
};

/**
 * Generate all time options (every 30 min for 24 hours)
 */
export const generateAllTimeOptions = () => {
  const options = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let min = 0; min < 60; min += 30) {
      const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
      options.push(timeStr);
    }
  }
  return options;
};

/**
 * Filter start time options based on business hours and existing bookings
 * Handles overnight hours (e.g., 6 PM - 2 AM)
 * Morning availability (12 AM - close) comes from PREVIOUS day's overnight hours
 */
export const getFilteredStartTimeOptions = (selectedDate, businessHours, vendorBookings, allTimeOptions) => {
  if (!selectedDate) return [];
  
  const dayOfWeek = selectedDate.getDay();
  const dayHours = businessHours?.find(bh => bh.DayOfWeek === dayOfWeek);
  
  // If no business hours data, return all time options (fallback)
  if (!businessHours || businessHours.length === 0) {
    return allTimeOptions;
  }
  
  // Check previous day for overnight hours that spill into this day's morning
  const prevDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const prevDayHours = businessHours?.find(bh => bh.DayOfWeek === prevDayOfWeek);
  
  let hasMorningFromPrevDay = false;
  let prevDayCloseMins = 0;
  if (prevDayHours && (prevDayHours.IsAvailable === true || prevDayHours.IsAvailable === 1)) {
    const prevOpenTime = parseTimeString(prevDayHours.OpenTime);
    const prevCloseTime = parseTimeString(prevDayHours.CloseTime);
    if (prevOpenTime && prevCloseTime) {
      const prevOpenMins = prevOpenTime.hour * 60 + (prevOpenTime.minute || 0);
      prevDayCloseMins = prevCloseTime.hour * 60 + (prevCloseTime.minute || 0);
      if (prevDayCloseMins < prevOpenMins && prevDayCloseMins > 0) {
        hasMorningFromPrevDay = true;
      }
    }
  }
  
  // Get current day's hours
  let currentDayOpenMins = 0;
  let currentDayCloseMins = 0;
  let currentDayIsOvernight = false;
  let currentDayIsAvailable = dayHours && (dayHours.IsAvailable === true || dayHours.IsAvailable === 1);
  
  if (currentDayIsAvailable) {
    const openTime = parseTimeString(dayHours.OpenTime);
    const closeTime = parseTimeString(dayHours.CloseTime);
    if (openTime && closeTime) {
      currentDayOpenMins = openTime.hour * 60 + openTime.minute;
      currentDayCloseMins = closeTime.hour * 60 + closeTime.minute;
      currentDayIsOvernight = currentDayCloseMins < currentDayOpenMins;
    }
  }
  
  // If current day is closed and no morning from prev day, return empty
  if (!currentDayIsAvailable && !hasMorningFromPrevDay) return [];
  
  // Get bookings for this date
  const dateStr = formatDateString(selectedDate);
  const dayBookings = vendorBookings?.filter(b => {
    if (!b.EventDate) return false;
    const status = (b.Status || '').toLowerCase();
    const isActive = status === 'confirmed' || status === 'pending' || status === 'paid' || status === 'approved';
    return formatDateString(new Date(b.EventDate)) === dateStr && isActive;
  }) || [];
  
  return allTimeOptions.filter(time => {
    const [h, m] = time.split(':').map(Number);
    const mins = h * 60 + m;
    
    // Check if time is within available hours
    let isWithinBusinessHours = false;
    
    // Check morning availability from previous day's overnight
    if (hasMorningFromPrevDay && mins < prevDayCloseMins) {
      isWithinBusinessHours = true;
    }
    
    // Check current day's hours (evening portion for overnight, or normal hours)
    if (currentDayIsAvailable) {
      if (currentDayIsOvernight) {
        // For overnight hours, only the evening portion (open to midnight) is on this day
        if (mins >= currentDayOpenMins) {
          isWithinBusinessHours = true;
        }
      } else {
        // Normal hours
        if (mins >= currentDayOpenMins && mins < currentDayCloseMins) {
          isWithinBusinessHours = true;
        }
      }
    }
    
    if (!isWithinBusinessHours) return false;
    
    // Check if this time falls within any booked slot
    for (const booking of dayBookings) {
      const bookingStart = parseTimeString(booking.EventTime);
      const bookingEnd = parseTimeString(booking.EventEndTime);
      if (bookingStart && bookingEnd) {
        const bStartMins = bookingStart.hour * 60 + (bookingStart.minute || 0);
        const bEndMins = bookingEnd.hour * 60 + (bookingEnd.minute || 0);
        if (mins >= bStartMins && mins < bEndMins) return false;
      }
    }
    return true;
  });
};

/**
 * Filter end time options based on start time, business hours, and bookings
 * Handles overnight hours (e.g., 6 PM - 2 AM)
 * Morning availability comes from PREVIOUS day's overnight hours
 */
export const getFilteredEndTimeOptions = (selectedDate, selectedStartTime, businessHours, vendorBookings, allTimeOptions) => {
  if (!selectedDate || !selectedStartTime) return [];
  
  const dayOfWeek = selectedDate.getDay();
  const dayHours = businessHours?.find(bh => bh.DayOfWeek === dayOfWeek);
  
  // Parse start time
  const startParts = selectedStartTime.split(':');
  const startMins = parseInt(startParts[0]) * 60 + parseInt(startParts[1] || 0);
  
  // Check previous day for overnight hours that spill into this day's morning
  const prevDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const prevDayHours = businessHours?.find(bh => bh.DayOfWeek === prevDayOfWeek);
  
  let prevDayCloseMins = 0;
  if (prevDayHours && (prevDayHours.IsAvailable === true || prevDayHours.IsAvailable === 1)) {
    const prevOpenTime = parseTimeString(prevDayHours.OpenTime);
    const prevCloseTime = parseTimeString(prevDayHours.CloseTime);
    if (prevOpenTime && prevCloseTime) {
      const prevOpenMins = prevOpenTime.hour * 60 + (prevOpenTime.minute || 0);
      prevDayCloseMins = prevCloseTime.hour * 60 + (prevCloseTime.minute || 0);
      if (!(prevDayCloseMins < prevOpenMins && prevDayCloseMins > 0)) {
        prevDayCloseMins = 0; // Not overnight
      }
    }
  }
  
  // Determine max end time based on where the start time falls
  let maxEndMins = 23 * 60 + 30; // Default: 11:30 PM
  
  // If start time is in morning (from previous day's overnight)
  if (prevDayCloseMins > 0 && startMins < prevDayCloseMins) {
    maxEndMins = prevDayCloseMins;
  } else if (dayHours && (dayHours.IsAvailable === true || dayHours.IsAvailable === 1)) {
    const openTime = parseTimeString(dayHours.OpenTime);
    const closeTime = parseTimeString(dayHours.CloseTime);
    if (openTime && closeTime) {
      const openMins = openTime.hour * 60 + openTime.minute;
      const closeMins = closeTime.hour * 60 + closeTime.minute;
      const isOvernight = closeMins < openMins;
      
      if (isOvernight) {
        // For overnight hours, evening portion ends at midnight
        if (startMins >= openMins) {
          maxEndMins = 23 * 60 + 30;
        }
      } else {
        // Normal hours - end at close time
        maxEndMins = closeMins;
      }
    }
  }
  
  // Get bookings for this date
  const dateStr = formatDateString(selectedDate);
  const dayBookings = vendorBookings?.filter(b => {
    if (!b.EventDate) return false;
    const status = (b.Status || '').toLowerCase();
    const isActive = status === 'confirmed' || status === 'pending' || status === 'paid' || status === 'approved';
    return formatDateString(new Date(b.EventDate)) === dateStr && isActive;
  }) || [];
  
  // Find the earliest booking that starts after our selected start time
  for (const booking of dayBookings) {
    const bookingStart = parseTimeString(booking.EventTime);
    if (bookingStart) {
      const bStartMins = bookingStart.hour * 60 + (bookingStart.minute || 0);
      if (bStartMins > startMins && bStartMins < maxEndMins) {
        maxEndMins = bStartMins;
      }
    }
  }
  
  // Return all times after start time up to max end time
  return allTimeOptions.filter(time => {
    const [h, m] = time.split(':').map(Number);
    const mins = h * 60 + m;
    return mins > startMins && mins <= maxEndMins;
  });
};

/**
 * Calculate auto end time based on start time and business hours
 * Handles overnight hours (e.g., 6 PM - 2 AM)
 * Morning availability comes from PREVIOUS day's overnight hours
 * Default to 5 hours later or close time, whichever is earlier
 */
export const calculateAutoEndTime = (startTime, selectedDate, businessHours, defaultHours = 5) => {
  if (!startTime || !selectedDate) return null;
  
  const dayOfWeek = selectedDate.getDay();
  const dayHours = businessHours?.find(bh => bh.DayOfWeek === dayOfWeek);
  
  const startParts = startTime.split(':');
  const startMins = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
  
  // Default to specified hours later
  let endMins = startMins + (defaultHours * 60);
  
  // Check previous day for overnight hours that spill into this day's morning
  const prevDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const prevDayHours = businessHours?.find(bh => bh.DayOfWeek === prevDayOfWeek);
  
  let prevDayCloseMins = 0;
  if (prevDayHours && (prevDayHours.IsAvailable === true || prevDayHours.IsAvailable === 1)) {
    const prevOpenTime = parseTimeString(prevDayHours.OpenTime);
    const prevCloseTime = parseTimeString(prevDayHours.CloseTime);
    if (prevOpenTime && prevCloseTime) {
      const prevOpenMins = prevOpenTime.hour * 60 + (prevOpenTime.minute || 0);
      prevDayCloseMins = prevCloseTime.hour * 60 + (prevCloseTime.minute || 0);
      if (!(prevDayCloseMins < prevOpenMins && prevDayCloseMins > 0)) {
        prevDayCloseMins = 0; // Not overnight
      }
    }
  }
  
  // If start time is in morning (from previous day's overnight)
  if (prevDayCloseMins > 0 && startMins < prevDayCloseMins) {
    endMins = Math.min(endMins, prevDayCloseMins);
  } else if (dayHours && (dayHours.IsAvailable === true || dayHours.IsAvailable === 1)) {
    const openTime = parseTimeString(dayHours.OpenTime);
    const closeTime = parseTimeString(dayHours.CloseTime);
    
    if (openTime && closeTime) {
      const openMins = openTime.hour * 60 + openTime.minute;
      const closeMins = closeTime.hour * 60 + closeTime.minute;
      const isOvernight = closeMins < openMins;
      
      if (isOvernight) {
        // For overnight hours, evening portion ends at midnight
        if (startMins >= openMins) {
          endMins = Math.min(endMins, 23 * 60 + 30);
        }
      } else {
        // Normal hours - end at close time max
        endMins = Math.min(endMins, closeMins);
      }
    }
  }
  
  // Cap at 23:30 (11:30 PM) to stay within same day
  endMins = Math.min(endMins, 23 * 60 + 30);
  
  const endHour = Math.floor(endMins / 60);
  const endMin = endMins % 60;
  return `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
};

/**
 * Get business hours for timeline visualization
 * Handles overnight hours (e.g., 6 PM - 2 AM)
 * Returns { openMins, closeMins, openPct, closePct, availableWidthPct, isOvernight }
 */
export const getBusinessHoursForTimeline = (selectedDate, businessHours) => {
  if (!selectedDate) return null;
  
  const dayOfWeek = selectedDate.getDay();
  const dayHours = businessHours?.find(bh => bh.DayOfWeek === dayOfWeek);
  
  // Check previous day's hours for overnight spillover into current day's morning
  const prevDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const prevDayHours = businessHours?.find(bh => bh.DayOfWeek === prevDayOfWeek);
  
  // Check if previous day has overnight hours that spill into this day's morning
  let hasMorningFromPrevDay = false;
  let prevDayCloseMins = 0;
  if (prevDayHours && (prevDayHours.IsAvailable === true || prevDayHours.IsAvailable === 1)) {
    const prevOpenTime = parseTimeString(prevDayHours.OpenTime);
    const prevCloseTime = parseTimeString(prevDayHours.CloseTime);
    if (prevOpenTime && prevCloseTime) {
      const prevOpenMins = prevOpenTime.hour * 60 + (prevOpenTime.minute || 0);
      prevDayCloseMins = prevCloseTime.hour * 60 + (prevCloseTime.minute || 0);
      // Previous day is overnight if close < open (e.g., 6 PM - 2 AM)
      if (prevDayCloseMins < prevOpenMins && prevDayCloseMins > 0) {
        hasMorningFromPrevDay = true;
      }
    }
  }
  
  // If current day is closed, check if we still have morning availability from previous day
  if (!dayHours || !(dayHours.IsAvailable === true || dayHours.IsAvailable === 1)) {
    if (hasMorningFromPrevDay) {
      // Show only the morning portion from previous day's overnight hours
      const morningClosePct = (prevDayCloseMins / (24 * 60)) * 100;
      return {
        openMins: 0,
        closeMins: prevDayCloseMins,
        openPct: 0,
        closePct: morningClosePct,
        morningWidthPct: morningClosePct,
        eveningWidthPct: 0,
        isOvernight: false,
        isClosed: false,
        morningOnlyFromPrevDay: true
      };
    }
    return { isClosed: true };
  }
  
  const openTime = parseTimeString(dayHours.OpenTime);
  const closeTime = parseTimeString(dayHours.CloseTime);
  
  if (!openTime || !closeTime) return null;
  
  const openMins = openTime.hour * 60 + (openTime.minute || 0);
  const closeMins = closeTime.hour * 60 + (closeTime.minute || 0);
  
  // Check if current day has overnight hours (close time is next day, e.g., 6 PM - 2 AM)
  const isOvernight = closeMins < openMins;
  
  const openPct = (openMins / (24 * 60)) * 100;
  const closePct = (closeMins / (24 * 60)) * 100;
  
  if (isOvernight) {
    // For overnight hours, the morning portion (12 AM to close) belongs to the NEXT day
    // So for the current day, we only show the evening portion (open to midnight)
    // Plus any morning availability from the PREVIOUS day's overnight hours
    const eveningWidthPct = 100 - openPct;
    
    // Morning portion comes from PREVIOUS day's overnight, not current day
    const morningWidthPct = hasMorningFromPrevDay ? (prevDayCloseMins / (24 * 60)) * 100 : 0;
    const morningClosePct = hasMorningFromPrevDay ? (prevDayCloseMins / (24 * 60)) * 100 : 0;
    
    return { 
      openMins, 
      closeMins: hasMorningFromPrevDay ? prevDayCloseMins : 0, 
      openPct, 
      closePct: morningClosePct, 
      eveningWidthPct,
      morningWidthPct,
      isOvernight: true, 
      isClosed: false,
      hasMorningFromPrevDay
    };
  }
  
  // Normal hours (e.g., 9 AM - 5 PM)
  // But also check if previous day had overnight hours that spill into morning
  if (hasMorningFromPrevDay) {
    const morningClosePct = (prevDayCloseMins / (24 * 60)) * 100;
    return {
      openMins,
      closeMins,
      openPct,
      closePct,
      availableWidthPct: closePct - openPct,
      isOvernight: false,
      isClosed: false,
      hasMorningFromPrevDay: true,
      morningWidthPct: morningClosePct,
      morningClosePct
    };
  }
  
  const availableWidthPct = closePct - openPct;
  return { openMins, closeMins, openPct, closePct, availableWidthPct, isOvernight: false, isClosed: false };
};

/**
 * Get booked slots for timeline visualization
 */
export const getBookedSlotsForTimeline = (selectedDate, vendorBookings) => {
  if (!selectedDate || !vendorBookings) return [];
  
  const dateStr = formatDateString(selectedDate);
  
  return vendorBookings
    .filter(b => {
      if (!b.EventDate) return false;
      const status = (b.Status || '').toLowerCase();
      const isActiveStatus = status === 'confirmed' || status === 'pending' || 
                             status === 'paid' || status === 'approved';
      return formatDateString(new Date(b.EventDate)) === dateStr && isActiveStatus;
    })
    .map(booking => {
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
      
      // Full day booking check
      if (startHour === 0 && startMin === 0 && endHour === 0 && endMin === 0 && !booking.EventTime) {
        return { startPct: 0, widthPct: 100, isFullDay: true };
      }
      
      const startPct = ((startHour * 60 + startMin) / (24 * 60)) * 100;
      const widthPct = ((endHour * 60 + endMin) - (startHour * 60 + startMin)) / (24 * 60) * 100;
      
      return { startPct, widthPct: Math.max(widthPct, 5), isFullDay: false };
    });
};

/**
 * Calculate selected time range for timeline visualization
 */
export const getSelectedTimeRangeForTimeline = (startTime, endTime) => {
  if (!startTime || !endTime) return null;
  
  const startMins = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
  const endMins = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);
  
  const startPct = (startMins / (24 * 60)) * 100;
  const widthPct = (endMins - startMins) / (24 * 60) * 100;
  
  return { startPct, widthPct };
};
