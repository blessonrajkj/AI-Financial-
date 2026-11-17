import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const SHORT_MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/**
 * Custom DatePicker component that replaces native browser date inputs
 * with an elegant, responsive, theme-aware calendar dropdown.
 */
const DatePicker = ({
  value,
  onChange,
  required = false,
  className = '',
  disabled = false,
  placeholder = 'Select date'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Parse initial date from value prop or default to today
  const selectedDate = useMemo(() => {
    if (!value) return null;
    const parts = value.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      return new Date(y, m, d);
    }
    return null;
  }, [value]);

  // Viewing month & year
  const [viewYear, setViewYear] = useState(() => (selectedDate ? selectedDate.getFullYear() : new Date().getFullYear()));
  const [viewMonth, setViewMonth] = useState(() => (selectedDate ? selectedDate.getMonth() : new Date().getMonth()));

  // Synchronize viewing month when value changes externally
  useEffect(() => {
    if (selectedDate) {
      setViewYear(selectedDate.getFullYear());
      setViewMonth(selectedDate.getMonth());
    }
  }, [value]);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  const formatToISO = (year, month, day) => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  const handleSelectDay = (year, month, day) => {
    const isoString = formatToISO(year, month, day);
    onChange(isoString);
    setIsOpen(false);
  };

  const handleSelectToday = () => {
    const now = new Date();
    const isoString = formatToISO(now.getFullYear(), now.getMonth(), now.getDate());
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    onChange(isoString);
    setIsOpen(false);
  };

  const handleSelectYesterday = () => {
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    const isoString = formatToISO(yest.getFullYear(), yest.getMonth(), yest.getDate());
    setViewYear(yest.getFullYear());
    setViewMonth(yest.getMonth());
    onChange(isoString);
    setIsOpen(false);
  };

  // Calendar cells computation
  const calendarCells = useMemo(() => {
    const cells = [];
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    // Previous month padding
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
      cells.push({
        day,
        year: prevYear,
        month: prevMonth,
        isCurrentMonth: false,
        key: `prev-${prevYear}-${prevMonth}-${day}`
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      cells.push({
        day: d,
        year: viewYear,
        month: viewMonth,
        isCurrentMonth: true,
        key: `curr-${viewYear}-${viewMonth}-${d}`
      });
    }

    // Next month padding (complete grid to 35 or 42 cells)
    const totalFilled = cells.length;
    const targetTotal = totalFilled > 35 ? 42 : 35;
    const remaining = targetTotal - totalFilled;
    for (let d = 1; d <= remaining; d++) {
      const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
      const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
      cells.push({
        day: d,
        year: nextYear,
        month: nextMonth,
        isCurrentMonth: false,
        key: `next-${nextYear}-${nextMonth}-${d}`
      });
    }

    return cells;
  }, [viewYear, viewMonth]);

  // Display label
  const formattedDisplay = useMemo(() => {
    if (!selectedDate) return placeholder;
    const d = selectedDate.getDate();
    const m = SHORT_MONTH_NAMES[selectedDate.getMonth()];
    const y = selectedDate.getFullYear();
    return `${d} ${m} ${y}`;
  }, [selectedDate, placeholder]);

  const today = useMemo(() => new Date(), []);
  const isToday = (y, m, d) => (
    today.getFullYear() === y &&
    today.getMonth() === m &&
    today.getDate() === d
  );

  const isSelected = (y, m, d) => (
    selectedDate &&
    selectedDate.getFullYear() === y &&
    selectedDate.getMonth() === m &&
    selectedDate.getDate() === d
  );

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-12 px-3.5 bg-background border border-borderColor rounded-xl flex items-center justify-between text-textPrimary text-sm font-medium focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-left ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50'
        }`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5 truncate">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary/10 text-primary">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <span className={`font-semibold truncate ${selectedDate ? 'text-textPrimary' : 'text-textMuted'}`}>
            {formattedDisplay}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-textSecondary transition-transform duration-200 flex-shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Visually-hidden native input for form compatibility and validation */}
      <input
        type="date"
        name="transaction_date"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />

      {/* Floating Calendar Popup */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute left-0 top-full mt-2 w-72 sm:w-80 bg-cardBg border border-borderColor rounded-2xl shadow-2xl shadow-indigo-500/10 z-50 p-4 select-none"
            role="dialog"
            aria-label="Calendar picker"
          >
            {/* Header: Month/Year navigation */}
            <div className="flex items-center justify-between mb-3 px-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-textSecondary hover:text-textPrimary hover:bg-hoverBg transition-colors"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-bold text-textPrimary tracking-tight">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-textSecondary hover:text-textPrimary hover:bg-hoverBg transition-colors"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 mb-2 text-center">
              {DAYS_OF_WEEK.map((day) => (
                <div key={day} className="text-[11px] font-bold text-textMuted uppercase py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((cell) => {
                const selected = isSelected(cell.year, cell.month, cell.day);
                const currentDay = isToday(cell.year, cell.month, cell.day);

                return (
                  <button
                    key={cell.key}
                    type="button"
                    onClick={() => handleSelectDay(cell.year, cell.month, cell.day)}
                    className={`h-9 rounded-xl text-xs font-semibold flex items-center justify-center transition-all duration-150 ${
                      selected
                        ? 'bg-primary text-white font-bold shadow-md shadow-indigo-500/30'
                        : currentDay
                        ? 'border border-primary text-primary font-bold hover:bg-primary/10'
                        : cell.isCurrentMonth
                        ? 'text-textPrimary hover:bg-hoverBg'
                        : 'text-textMuted/40 hover:bg-hoverBg/50'
                    }`}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>

            {/* Footer Quick Shortcuts */}
            <div className="mt-3.5 pt-3 border-t border-borderColor/60 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={handleSelectYesterday}
                className="px-2.5 py-1 rounded-lg text-textSecondary hover:text-primary hover:bg-hoverBg font-medium transition-colors"
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={handleSelectToday}
                className="px-3 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 font-bold transition-colors"
              >
                Today
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DatePicker;
