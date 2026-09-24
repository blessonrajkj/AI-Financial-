import React from 'react';

/**
 * PariView Official Logo Component
 * 
 * Concept: Precision Geometric Squi-shield featuring an ascending 'P' 
 * financial growth curve & clarity lens core.
 * Colors: Deep Navy, Indigo & Electric Blue with Emerald Growth Accent.
 */
const PariViewLogo = ({
  variant = 'full', // 'full' | 'icon' | 'wordmark' | 'light' | 'dark' | 'monochrome-white' | 'monochrome-black'
  size = 'md',     // 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number
  showTagline = false,
  className = '',
  iconOnly = false,
}) => {
  // Dimension mapping
  const sizeMap = {
    xs: { icon: 22, font: 'text-sm', textGap: 'gap-2' },
    sm: { icon: 28, font: 'text-base', textGap: 'gap-2.5' },
    md: { icon: 36, font: 'text-lg', textGap: 'gap-3' },
    lg: { icon: 46, font: 'text-2xl', textGap: 'gap-3.5' },
    xl: { icon: 58, font: 'text-3xl', textGap: 'gap-4' },
  };

  const currentSize = typeof size === 'number' 
    ? { icon: size, font: 'text-base', textGap: 'gap-2.5' }
    : sizeMap[size] || sizeMap.md;

  const iconDim = currentSize.icon;

  const isMonoWhite = variant === 'monochrome-white';
  const isMonoBlack = variant === 'monochrome-black';

  return (
    <div className={`inline-flex items-center ${currentSize.textGap} select-none ${className}`}>
      {/* ─── PARIVIEW ICON SYMBOL ─── */}
      {variant !== 'wordmark' && (
        <svg
          width={iconDim}
          height={iconDim}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="flex-shrink-0 transition-transform duration-200 hover:scale-105 drop-shadow-sm"
        >
          <defs>
            {/* Base Squircle Container Gradient */}
            <linearGradient id="pvSquircleGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0F172A" />
              <stop offset="60%" stopColor="#1E1B4B" />
              <stop offset="100%" stopColor="#312E81" />
            </linearGradient>

            {/* Ascending Chart Line & 'P' Loop Gradient */}
            <linearGradient id="pvStrokeGrad" x1="15" y1="85" x2="85" y2="15" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#2563EB" />
              <stop offset="40%" stopColor="#3B82F6" />
              <stop offset="80%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#34D399" />
            </linearGradient>

            {/* Inner Core Glow */}
            <linearGradient id="pvCoreGrad" x1="30" y1="30" x2="70" y2="70" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>

            <filter id="pvGlow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#2563EB" floodOpacity="0.4" />
            </filter>
          </defs>

          {isMonoWhite ? (
            /* Monochrome White Icon */
            <g>
              <rect x="6" y="6" width="88" height="88" rx="26" fill="#FFFFFF" />
              {/* Vertical Pillar Stem of 'P' */}
              <rect x="26" y="24" width="14" height="52" rx="7" fill="#0F172A" />
              {/* Sweeping Loop of 'P' and Trend Arc */}
              <path
                d="M 40 24 H 60 C 72.15 24 82 33.85 82 46 C 82 58.15 72.15 68 60 68 H 40"
                stroke="#0F172A"
                strokeWidth="12"
                strokeLinecap="round"
                fill="none"
              />
              {/* Upward Growth Arrow Indicator */}
              <polygon points="68,26 84,26 84,42" fill="#0F172A" />
            </g>
          ) : isMonoBlack ? (
            /* Monochrome Black Icon */
            <g>
              <rect x="6" y="6" width="88" height="88" rx="26" fill="#0F172A" />
              <rect x="26" y="24" width="14" height="52" rx="7" fill="#FFFFFF" />
              <path
                d="M 40 24 H 60 C 72.15 24 82 33.85 82 46 C 82 58.15 72.15 68 60 68 H 40"
                stroke="#FFFFFF"
                strokeWidth="12"
                strokeLinecap="round"
                fill="none"
              />
              <polygon points="68,26 84,26 84,42" fill="#FFFFFF" />
            </g>
          ) : (
            /* Premium Fintech Color Icon */
            <g>
              {/* Base Rounded Squircle Container */}
              <rect x="6" y="6" width="88" height="88" rx="26" fill="url(#pvSquircleGrad)" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
              
              {/* Subdued Grid Line for Financial Precision Feel */}
              <line x1="20" y1="76" x2="80" y2="76" stroke="rgba(255,255,255,0.08)" strokeWidth="2" strokeDasharray="4 4" />
              <line x1="20" y1="52" x2="80" y2="52" stroke="rgba(255,255,255,0.06)" strokeWidth="2" strokeDasharray="4 4" />

              {/* Vertical Pillar Stem of 'P' */}
              <rect x="26" y="24" width="13" height="52" rx="6.5" fill="url(#pvStrokeGrad)" />
              
              {/* Ascending Chart Sweep & 'P' Loop */}
              <path
                d="M 39 25.5 H 58 C 69.59 25.5 79 34.91 79 46.5 C 79 58.09 69.59 67.5 58 67.5 H 39"
                stroke="url(#pvStrokeGrad)"
                strokeWidth="13"
                strokeLinecap="round"
                fill="none"
                filter="url(#pvGlow)"
              />

              {/* Upward Ascending Peak Arrow / Clarity Dot */}
              <circle cx="58" cy="46.5" r="6" fill="#FFFFFF" />
              <polygon points="65,21 82,21 82,38" fill="#34D399" />
            </g>
          )}
        </svg>
      )}

      {/* ─── PARIVIEW WORDMARK ─── */}
      {!iconOnly && variant !== 'icon' && (
        <div className="flex flex-col justify-center">
          <div className={`font-extrabold tracking-tight leading-none ${currentSize.font} flex items-center`}>
            <span className={
              isMonoWhite ? 'text-white' : 
              isMonoBlack ? 'text-slate-900' : 
              'text-textPrimary dark:text-white'
            }>
              Pari
            </span>
            <span className={
              isMonoWhite ? 'text-blue-300' : 
              isMonoBlack ? 'text-blue-600' : 
              'text-primary font-black ml-[1px]'
            }>
              View
            </span>
          </div>

          {(showTagline || variant === 'full-tagline') && (
            <span className="text-[10px] font-semibold text-textMuted tracking-wider uppercase mt-1">
              Smart Finance Platform
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default PariViewLogo;
