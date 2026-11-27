import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { 
  ChevronDown, 
  Search, 
  Check, 
  Tag, 
  Utensils, 
  ShoppingCart, 
  Car, 
  HeartPulse, 
  Film, 
  BookOpen, 
  Zap, 
  Plane, 
  ShieldCheck, 
  TrendingUp, 
  Repeat, 
  Smartphone, 
  Wallet, 
  CircleDollarSign,
  Fuel,
  Receipt,
  GraduationCap,
  Home,
  User,
  Users,
  Dog,
  Landmark,
  Briefcase,
  Heart,
  ArrowLeftRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { EXPENSE_TAXONOMY } from '../../utils/taxonomy';

// Category Icon Map
const CATEGORY_ICONS = {
  'Food & Dining': Utensils,
  Food: Utensils,
  Groceries: ShoppingCart,
  Transportation: Car,
  Fuel: Fuel,
  Healthcare: HeartPulse,
  Medical: HeartPulse,
  'Health & Medical': HeartPulse,
  Entertainment: Film,
  Education: GraduationCap,
  Shopping: ShoppingCart,
  'Bills & Utilities': Zap,
  Utilities: Zap,
  Bills: Receipt,
  Housing: Home,
  Travel: Plane,
  Insurance: ShieldCheck,
  Investments: TrendingUp,
  Investment: TrendingUp,
  Subscriptions: Repeat,
  Recharge: Smartphone,
  Salary: Wallet,
  'Other Income': CircleDollarSign,
  Refunds: CircleDollarSign,
  'Personal Care': User,
  'Debt & Loans': Landmark,
  'Family & Kids': Users,
  Pets: Dog,
  'Taxes & Fees': Landmark,
  Business: Briefcase,
  'Charitable Giving': Heart,
  'Cash & Transfers': ArrowLeftRight,
  Transfer: ArrowLeftRight,
  'Cash Withdrawal': Wallet,
  Others: Tag,
  Miscellaneous: Tag
};

const DEFAULT_OPTIONS = Object.keys(EXPENSE_TAXONOMY);

export const getCategoryIcon = (categoryName) => {
  if (!categoryName) return Tag;
  const key = Object.keys(CATEGORY_ICONS).find(k => k.toLowerCase() === categoryName.toLowerCase());
  return key ? CATEGORY_ICONS[key] : Tag;
};

export const CategorySelect = forwardRef(({
  value,
  onChange,
  name = 'category',
  options = DEFAULT_OPTIONS,
  placeholder = "Select category",
  className = "",
  size = "md", // "sm" | "md" | "lg"
  disabled = false
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
      setHighlightedIndex(0);
    } else {
      setHighlightedIndex(-1);
    }
  }, [isOpen]);

  const selectedValue = value || (options[0] ? (typeof options[0] === 'string' ? options[0] : options[0].name) : "Miscellaneous");
  const SelectedIcon = getCategoryIcon(selectedValue);

  const filteredOptions = options.filter(opt => {
    const optName = typeof opt === 'string' ? opt : opt.name || opt.label;
    return optName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleSelect = (categoryName) => {
    onChange(categoryName);
    setIsOpen(false);
    setSearchQuery("");
    triggerRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
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
        setHighlightedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          const opt = filteredOptions[highlightedIndex];
          const optName = typeof opt === 'string' ? opt : opt.name || opt.label;
          handleSelect(optName);
        }
        break;
      default:
        break;
    }
  };

  const isSmall = size === "sm";

  return (
    <div ref={containerRef} onKeyDown={handleKeyDown} className={`relative inline-block text-left w-full ${className}`}>
      {/* Hidden native input for forms and react-hook-form */}
      <input
        ref={ref}
        type="hidden"
        name={name}
        value={selectedValue}
        onChange={(e) => onChange && onChange(e.target.value)}
      />

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 border rounded-xl font-medium transition-all duration-200 outline-none ${
          isSmall 
            ? 'px-2.5 py-1.5 text-xs bg-background/80 hover:bg-hoverBg border-borderColor/80 shadow-xs' 
            : 'px-3.5 py-2.5 text-sm bg-background/80 hover:bg-hoverBg border-borderColor shadow-sm'
        } ${isOpen ? 'border-primary ring-2 ring-primary/20 shadow-glow' : 'hover:border-primary/40'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5 truncate">
          <span className={`p-1.5 rounded-lg flex items-center justify-center transition-all ${isSmall ? 'bg-primary/10 text-primary' : 'bg-primary/10 text-primary shadow-xs'}`}>
            <SelectedIcon className={isSmall ? "w-3.5 h-3.5" : "w-4 h-4"} />
          </span>
          <span className="truncate font-semibold text-textPrimary">{selectedValue}</span>
        </div>
        <ChevronDown className={`transition-transform duration-300 text-textMuted ${isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4'} ${isOpen ? 'rotate-180 text-primary' : ''}`} />
      </button>

      {/* Animated Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="absolute z-50 left-0 right-0 mt-1.5 min-w-[210px] max-w-[300px] bg-cardBg/95 border border-borderColor/80 rounded-2xl shadow-2xl shadow-primary/10 overflow-hidden backdrop-blur-xl"
            role="listbox"
          >
            {/* Search Input Header */}
            {options.length > 5 && (
              <div className="p-2 border-b border-borderColor/70 bg-background/60 backdrop-blur-md">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-textMuted absolute left-3 top-2.5" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search categories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-8 pl-8 pr-3 bg-cardBg border border-borderColor/70 rounded-xl text-xs text-textPrimary placeholder-textMuted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all font-medium"
                    aria-label="Search categories"
                  />
                </div>
              </div>
            )}

            {/* Options List */}
            <div className="max-h-60 overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt, idx) => {
                  const optName = typeof opt === 'string' ? opt : opt.name || opt.label;
                  const IconComp = getCategoryIcon(optName);
                  const isSelected = optName.toLowerCase() === selectedValue.toLowerCase();
                  const isHighlighted = idx === highlightedIndex;

                  return (
                    <motion.button
                      key={optName}
                      type="button"
                      whileHover={{ x: 3 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelect(optName)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl transition-all font-medium text-left ${
                        isSelected 
                          ? 'bg-primary/12 text-primary font-bold shadow-xs border border-primary/20' 
                          : isHighlighted
                          ? 'bg-hoverBg text-textPrimary'
                          : 'text-textPrimary hover:bg-hoverBg'
                      }`}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span className={`p-1.5 rounded-lg transition-colors ${isSelected ? 'bg-primary text-white shadow-xs' : 'bg-surface text-textSecondary border border-borderColor/50'}`}>
                          <IconComp className="w-3.5 h-3.5" />
                        </span>
                        <span className="truncate">{optName}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                    </motion.button>
                  );
                })
              ) : (
                <div className="p-3 text-center text-xs text-textMuted font-medium">
                  No matching category
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

CategorySelect.displayName = 'CategorySelect';

export const SubcategorySelect = forwardRef(({
  category,
  value,
  onChange,
  name = 'subcategory',
  subcategories = [],
  placeholder = "Select subcategory",
  className = "",
  size = "md",
  disabled = false
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const optionsList = subcategories.length > 0
    ? subcategories
    : (EXPENSE_TAXONOMY[category] || ["Uncategorized", "Other"]);

  const selectedValue = value || optionsList[0] || "Uncategorized";
  const isSmall = size === "sm";

  const handleSelect = (sub) => {
    onChange(sub);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
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
        setHighlightedIndex(prev => (prev < optionsList.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : optionsList.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < optionsList.length) {
          handleSelect(optionsList[highlightedIndex]);
        }
        break;
      default:
        break;
    }
  };

  return (
    <div ref={containerRef} onKeyDown={handleKeyDown} className={`relative inline-block text-left w-full ${className}`}>
      <input
        ref={ref}
        type="hidden"
        name={name}
        value={selectedValue}
        onChange={(e) => onChange && onChange(e.target.value)}
      />

      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 border rounded-xl font-medium transition-all duration-200 outline-none focus:ring-2 focus:ring-primary/20 ${
          isSmall 
            ? 'px-2 py-1 text-xs bg-background hover:bg-hoverBg border-borderColor/80 shadow-xs' 
            : 'px-3.5 py-2.5 text-sm bg-background hover:bg-hoverBg border-borderColor shadow-sm'
        } ${isOpen ? 'border-primary ring-2 ring-primary/20' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 truncate">
          <span className="truncate font-semibold text-textPrimary">{selectedValue}</span>
        </div>
        <ChevronDown className={`transition-transform duration-200 text-textMuted ${isSmall ? 'w-3 h-3' : 'w-4 h-4'} ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute z-50 left-0 right-0 mt-1 min-w-[180px] bg-cardBg border border-borderColor rounded-2xl shadow-xl overflow-hidden backdrop-blur-md"
            role="listbox"
          >
            <div className="max-h-52 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
              {optionsList.map((sub, idx) => {
                const isSelected = sub.toLowerCase() === selectedValue.toLowerCase();
                const isHighlighted = idx === highlightedIndex;
                return (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => handleSelect(sub)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl transition-colors font-medium text-left ${
                      isSelected 
                        ? 'bg-primary/10 text-primary font-bold' 
                        : isHighlighted
                        ? 'bg-hoverBg text-textPrimary'
                        : 'text-textPrimary hover:bg-hoverBg'
                    }`}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <span className="truncate">{sub}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

SubcategorySelect.displayName = 'SubcategorySelect';

export default CategorySelect;
