import React, { useState, useRef, useEffect, useMemo, forwardRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Universal Custom Select Dropdown
 * High-contrast, animated, fully keyboard accessible (Arrow keys, Enter, Escape, Home, End),
 * with ARIA listbox roles and react-hook-form ref integration.
 */
const Select = forwardRef(({
  value,
  onChange,
  options = [],
  name = '',
  placeholder = 'Select option',
  disabled = false,
  className = '',
  size = 'md', // 'sm' (h-10), 'md' (h-11 or h-12)
  minWidth = 'w-full',
  dropdownWidth = 'w-full',
  required = false,
  id = ''
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const listboxRef = useRef(null);

  // Normalize options into { value, label }
  const normalizedOptions = useMemo(() => {
    return options.map((opt, idx) => {
      if (typeof opt === 'string' || typeof opt === 'number') {
        return { value: opt, label: String(opt), id: `opt-${idx}` };
      }
      return {
        value: opt.value !== undefined ? opt.value : opt.id,
        label: opt.label !== undefined ? opt.label : opt.name || String(opt.value),
        desc: opt.desc,
        icon: opt.icon,
        id: opt.id ? `opt-${opt.id}` : `opt-${idx}`
      };
    });
  }, [options]);

  const selectedIndex = normalizedOptions.findIndex(o => String(o.value) === String(value));
  const selectedOption = selectedIndex >= 0 ? normalizedOptions[selectedIndex] : null;

  // Sync highlighted option when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    } else {
      setHighlightedIndex(-1);
    }
  }, [isOpen, selectedIndex]);

  // Outside click closing
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

  const handleSelect = (newVal) => {
    setIsOpen(false);
    if (!onChange) return;
    
    // Synthetic event matching standard React form event signature
    const syntheticEvent = {
      target: { name: name || '', value: newVal },
      currentTarget: { name: name || '', value: newVal },
      value: newVal
    };
    
    onChange(syntheticEvent);
    triggerRef.current?.focus();
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => (prev < normalizedOptions.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : normalizedOptions.length - 1));
        break;
      case 'Home':
        e.preventDefault();
        setHighlightedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setHighlightedIndex(normalizedOptions.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < normalizedOptions.length) {
          handleSelect(normalizedOptions[highlightedIndex].value);
        }
        break;
      case 'Tab':
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  const heightClass = size === 'sm' ? 'h-10 text-xs px-3' : 'h-11 sm:h-12 text-sm px-3.5';

  return (
    <div className={`relative ${minWidth} ${className}`} ref={containerRef} onKeyDown={handleKeyDown}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        id={id ? `${id}-button` : undefined}
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`${heightClass} ${minWidth} bg-background hover:bg-hoverBg border border-borderColor rounded-xl text-textPrimary flex items-center justify-between gap-2 font-medium focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-left ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50'
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-activedescendant={isOpen && highlightedIndex >= 0 ? normalizedOptions[highlightedIndex]?.id : undefined}
      >
        <span className={`truncate ${selectedOption ? 'text-textPrimary font-semibold' : 'text-textMuted'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-textSecondary transition-transform duration-200 flex-shrink-0 ml-1.5 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Hidden native select for form validation, accessibility, and react-hook-form */}
      <select
        ref={ref}
        id={id || undefined}
        name={name}
        value={value || ''}
        onChange={(e) => onChange && onChange(e)}
        required={required}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {normalizedOptions.map(o => (
          <option key={String(o.value)} value={o.value}>{o.label}</option>
        ))}
      </select>

      {/* Floating Dropdown Card */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={listboxRef}
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute left-0 top-full mt-1.5 ${dropdownWidth} bg-cardBg border border-borderColor rounded-xl shadow-2xl shadow-indigo-500/10 z-50 overflow-hidden py-1 max-h-60 overflow-y-auto`}
            role="listbox"
            tabIndex={-1}
          >
            {normalizedOptions.map((opt, idx) => {
              const isSelected = String(opt.value) === String(value);
              const isHighlighted = idx === highlightedIndex;
              const OptIcon = opt.icon;

              return (
                <button
                  id={opt.id}
                  key={String(opt.value)}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`w-full px-3.5 py-2.5 flex items-center justify-between text-left transition-colors duration-150 cursor-pointer ${
                    size === 'sm' ? 'text-xs py-2' : 'text-sm py-2.5'
                  } ${
                    isSelected ? 'bg-primary/10 text-primary font-bold' : isHighlighted ? 'bg-hoverBg text-textPrimary' : 'text-textPrimary font-medium'
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="flex items-center gap-2 truncate">
                    {OptIcon && <OptIcon className="w-4 h-4 flex-shrink-0 text-textSecondary" />}
                    <div className="truncate">
                      <div className="truncate">{opt.label}</div>
                      {opt.desc && <div className="text-[10px] text-textMuted truncate">{opt.desc}</div>}
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 text-primary flex-shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

Select.displayName = 'Select';

export default Select;
