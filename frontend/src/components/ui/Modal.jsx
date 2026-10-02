import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * Shared Responsive Viewport Modal & Bottom-Sheet Component for PariView.
 * 
 * Guarantees:
 * 1. Portal to document.body (escapes parent CSS transforms like animate-page-enter).
 * 2. Mobile Viewport Bottom Sheet on <=640px screens with 90dvh max-height.
 * 3. Centered modal dialog on >=640px desktop screens.
 * 4. Automatic body scroll lock while open.
 * 5. Safe-area padding support for mobile devices.
 * 6. Pinned sticky header & action footer.
 */
const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'max-w-md',
  showCloseButton = true,
  icon: Icon
}) => {
  // Lock body scroll on open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9990] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
          {/* Backdrop click dismiss area */}
          <div 
            className="absolute inset-0 z-0" 
            onClick={onClose} 
            aria-hidden="true"
          />

          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className={`z-10 w-full ${maxWidth} max-h-[90dvh] bg-cardBg border-t sm:border border-borderColor rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden relative pb-[max(16px,env(safe-area-inset-bottom))]`}
          >
            {/* Header Toolbar */}
            {(title || showCloseButton) && (
              <div className="px-5 sm:px-6 pt-5 pb-3 border-b border-borderColor flex justify-between items-center bg-cardBg shrink-0">
                <div className="flex items-center space-x-3 pr-2">
                  {Icon && (
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    {title && (
                      <h3 className="text-base sm:text-lg font-extrabold text-textPrimary tracking-tight">
                        {title}
                      </h3>
                    )}
                    {subtitle && (
                      <p className="text-xs text-textSecondary font-medium mt-0.5">
                        {subtitle}
                      </p>
                    )}
                  </div>
                </div>

                {showCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-2.5 -mr-1 rounded-full text-textSecondary hover:bg-hoverBg hover:text-textPrimary transition-colors flex items-center justify-center min-w-[44px] min-h-[44px]"
                    aria-label="Close modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}

            {/* Scrollable Form Content Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 -webkit-overflow-scrolling-touch">
              {children}
            </div>

            {/* Sticky Action Footer (Optional) */}
            {footer && (
              <div className="px-5 sm:px-6 py-4 border-t border-borderColor bg-cardBg shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default Modal;
