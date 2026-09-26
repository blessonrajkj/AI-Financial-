import React, { useState, useRef, useEffect } from 'react';
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
  GraduationCap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Category Icon Map
const CATEGORY_ICONS = {
  Food: Utensils,
  Groceries: ShoppingCart,
  Transportation: Car,
  Fuel: Fuel,
  Healthcare: HeartPulse,
  Medical: HeartPulse,
  Entertainment: Film,
  Education: GraduationCap,
  Shopping: ShoppingCart,
  Utilities: Zap,
  Bills: Receipt,
  Travel: Plane,
  Insurance: ShieldCheck,
  Investment: TrendingUp,
  Investments: TrendingUp,
  Subscriptions: Repeat,
  Recharge: Smartphone,
  Salary: Wallet,
  'Other Income': CircleDollarSign,
  Refunds: CircleDollarSign,
  'Cash Withdrawal': Wallet,
  Others: Tag,
  Miscellaneous: Tag
};

const DEFAULT_OPTIONS = [
  'Food', 'Groceries', 'Transportation', 'Fuel', 'Healthcare', 'Entertainment', 
  'Education', 'Shopping', 'Utilities', 'Bills', 'Travel', 'Insurance', 
  'Investments', 'Subscriptions', 'Recharge', 'Salary', 'Other Income', 'Refunds', 'Others'
];

export const getCategoryIcon = (categoryName) => {
  if (!categoryName) return Tag;
  const key = Object.keys(CATEGORY_ICONS).find(k => k.toLowerCase() === categoryName.toLowerCase());
  return key ? CATEGORY_ICONS[key] : Tag;
};

const CategorySelect = ({
  value,
  onChange,
  options = DEFAULT_OPTIONS,
  placeholder = "Select category",
  className = "",
  size = "md", // "sm" | "md" | "lg"
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef(null);
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
    }
  }, [isOpen]);

  const selectedValue = value || options[0] || "Others";
  const SelectedIcon = getCategoryIcon(selectedValue);

  const filteredOptions = options.filter(opt => {
    const name = typeof opt === 'string' ? opt : opt.name || opt.label;
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const isSmall = size === "sm";

  return (
    <div ref={containerRef} className={`relative inline-block text-left w-full ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 border rounded-xl font-medium transition-all duration-200 outline-none focus:ring-2 focus:ring-primary/20 ${
          isSmall 
            ? 'px-2 py-1 text-xs bg-background hover:bg-hoverBg border-borderColor/80 shadow-xs' 
            : 'px-3.5 py-2.5 text-sm bg-background hover:bg-hoverBg border-borderColor shadow-sm'
        } ${isOpen ? 'border-primary ring-2 ring-primary/20' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-2 truncate">
          <span className={`p-1 rounded-md flex items-center justify-center ${isSmall ? 'bg-primary/10 text-primary' : 'bg-primary/10 text-primary'}`}>
            <SelectedIcon className={isSmall ? "w-3 h-3" : "w-4 h-4"} />
          </span>
          <span className="truncate font-semibold text-textPrimary">{selectedValue}</span>
        </div>
        <ChevronDown className={`transition-transform duration-200 text-textMuted ${isSmall ? 'w-3 h-3' : 'w-4 h-4'} ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Animated Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute z-50 left-0 right-0 mt-1 min-w-[200px] max-w-[280px] bg-cardBg border border-borderColor rounded-2xl shadow-xl overflow-hidden backdrop-blur-md"
          >
            {/* Search Input Header */}
            {options.length > 5 && (
              <div className="p-2 border-b border-borderColor bg-background/50">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-textMuted absolute left-2.5 top-2.5" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search categories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-8 pl-8 pr-3 bg-background border border-borderColor/60 rounded-lg text-xs text-textPrimary placeholder-textMuted focus:outline-none focus:border-primary transition-all font-medium"
                  />
                </div>
              </div>
            )}

            {/* Options List */}
            <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => {
                  const optName = typeof opt === 'string' ? opt : opt.name || opt.label;
                  const IconComp = getCategoryIcon(optName);
                  const isSelected = optName.toLowerCase() === selectedValue.toLowerCase();

                  return (
                    <button
                      key={optName}
                      type="button"
                      onClick={() => {
                        onChange(optName);
                        setIsOpen(false);
                        setSearchQuery("");
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl transition-colors font-medium text-left ${
                        isSelected 
                          ? 'bg-primary/10 text-primary font-bold' 
                          : 'text-textPrimary hover:bg-hoverBg'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span className={`p-1 rounded-md ${isSelected ? 'bg-primary text-white' : 'bg-surface text-textSecondary'}`}>
                          <IconComp className="w-3.5 h-3.5" />
                        </span>
                        <span className="truncate">{optName}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                    </button>
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
};

export default CategorySelect;
