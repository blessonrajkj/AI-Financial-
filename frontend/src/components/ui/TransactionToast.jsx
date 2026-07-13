import React, { useEffect, useRef } from 'react';
import { CheckCircle2, X, ArrowRight } from 'lucide-react';

/**
 * TransactionToast — shown after a successful transaction is logged.
 * Props:
 *   toast: { amount, category, merchant, date, id } | null
 *   onDismiss: () => void
 *   onViewTransaction: () => void
 */
const TransactionToast = ({ toast, onDismiss, onViewTransaction }) => {
  const timerRef = useRef(null);

  useEffect(() => {
    if (toast) {
      // Auto-dismiss after 4 seconds
      timerRef.current = setTimeout(() => {
        onDismiss();
      }, 4000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast, onDismiss]);

  if (!toast) return null;

  // Format date nicely
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formattedAmount = typeof toast.amount === 'number'
    ? `₹${toast.amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
    : `₹${toast.amount}`;

  return (
    <div
      className="fixed bottom-6 right-6 z-[9999] w-80 animate-slide-up"
      style={{
        animation: 'slideInFromBottom 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      }}
    >
      <style>{`
        @keyframes slideInFromBottom {
          from { transform: translateY(100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      <div className="bg-cardBg border border-success/30 rounded-2xl shadow-2xl overflow-hidden relative">
        {/* Progress bar that counts down */}
        <div
          className="absolute top-0 left-0 h-0.5 bg-success rounded-full"
          style={{
            animation: 'shrink 4s linear forwards',
            width: '100%',
          }}
        />
        <style>{`
          @keyframes shrink {
            from { width: 100%; }
            to { width: 0%; }
          }
        `}</style>

        <div className="p-4">
          {/* Header row */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-success/15 flex items-center justify-center">
                <CheckCircle2 className="w-4.5 h-4.5 text-success" />
              </div>
              <div>
                <p className="text-xs font-black text-success uppercase tracking-wider">Transaction Added</p>
                <p className="text-[10px] text-textMuted mt-0.5">Logged to your financial ledger</p>
              </div>
            </div>
            <button
              onClick={onDismiss}
              className="p-1 text-textMuted hover:text-textPrimary hover:bg-hoverBg rounded-lg transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Transaction Details */}
          <div className="bg-background/60 border border-borderColor/50 rounded-xl p-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-textSecondary uppercase tracking-wider">Amount</span>
              <span className="text-base font-black text-textPrimary">{formattedAmount}</span>
            </div>
            <div className="h-px bg-borderColor/40" />
            <div className="grid grid-cols-2 gap-2">
              {toast.category && (
                <div>
                  <span className="text-[9px] font-bold text-textMuted uppercase tracking-wider block">Category</span>
                  <span className="text-xs font-bold text-textPrimary">{toast.category}</span>
                </div>
              )}
              {toast.merchant && (
                <div>
                  <span className="text-[9px] font-bold text-textMuted uppercase tracking-wider block">Merchant</span>
                  <span className="text-xs font-bold text-textPrimary truncate block">{toast.merchant}</span>
                </div>
              )}
              {toast.date && (
                <div>
                  <span className="text-[9px] font-bold text-textMuted uppercase tracking-wider block">Date</span>
                  <span className="text-xs font-bold text-textPrimary">{formatDate(toast.date)}</span>
                </div>
              )}
              {toast.type && (
                <div>
                  <span className="text-[9px] font-bold text-textMuted uppercase tracking-wider block">Type</span>
                  <span className={`text-xs font-bold capitalize ${toast.type === 'income' ? 'text-success' : 'text-danger'}`}>
                    {toast.type}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action button */}
          <button
            onClick={() => {
              onDismiss();
              if (onViewTransaction) onViewTransaction();
            }}
            className="mt-3 w-full flex items-center justify-center space-x-1.5 py-2.5 bg-success/10 hover:bg-success/15 border border-success/20 text-success text-xs font-bold rounded-xl transition-colors"
          >
            <span>View Transaction</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionToast;
