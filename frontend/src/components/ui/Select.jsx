import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Universal Custom Select Dropdown
 * Replaces native <select> elements across the platform with a high-contrast,
 * animated, accessible custom dropdown.
 */
const Select = ({
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
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Normalize options into { value, label }
  const normalizedOptions = useMemo(() => {
    return options.map(opt => {
      if (typeof opt === 'string' || typeof opt === 'number') {
        return { value: opt, label: String(opt) };
      }
      return {
        value: opt.value !== undefined ? opt.value : opt.id,
        label: opt.label !== undefined ? opt.label : opt.name || String(opt.value),
        desc: opt.desc,
        icon: opt.icon
      };
    });
  }, [options]);

  const selectedOption = normalizedOptions.find(o => String(o.value) === String(value)) || null;

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

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
  };

  const heightClass = size === 'sm' ? 'h-10 text-xs px-3' : 'h-11 sm:h-12 text-sm px-3.5';

  return (
    <div className={`relative ${minWidth} ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`${heightClass} ${minWidth} bg-background hover:bg-hoverBg border border-borderColor rounded-xl text-textPrimary flex items-center justify-between gap-2 font-medium focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-left ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50'
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={`truncate ${selectedOption ? 'text-textPrimary font-semibold' : 'text-textMuted'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-textSecondary transition-transform duration-200 flex-shrink-0 ml-1.5 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Hidden native select for form validation and accessibility */}
      <select
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
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute left-0 top-full mt-1.5 ${dropdownWidth} bg-cardBg border border-borderColor rounded-xl shadow-2xl shadow-indigo-500/10 z-50 overflow-hidden py-1 max-h-60 overflow-y-auto`}
            role="listbox"
          >
            {normalizedOptions.map((opt) => {
              const isSelected = String(opt.value) === String(value);
              const OptIcon = opt.icon;

              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full px-3.5 py-2.5 flex items-center justify-between text-left transition-colors duration-150 cursor-pointer ${
                    size === 'sm' ? 'text-xs py-2' : 'text-sm py-2.5'
                  } ${
                    isSelected ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-hoverBg text-textPrimary font-medium'
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
};

export default Select;
