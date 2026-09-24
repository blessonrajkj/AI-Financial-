import React from 'react';

/**
 * PariView Official Logo Component
 * 
 * Concept: Stylized geometric 'P' infused with ascending financial growth & clarity view.
 * Colors: Deep Navy, Indigo & Electric Blue.
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
    xs: { icon: 20, font: 'text-sm', textGap: 'gap-2' },
    sm: { icon: 26, font: 'text-base', textGap: 'gap-2' },
    md: { icon: 34, font: 'text-lg', textGap: 'gap-2.5' },
    lg: { icon: 44, font: 'text-2xl', textGap: 'gap-3' },
    xl: { icon: 56, font: 'text-3xl', textGap: 'gap-3.5' },
  };

  const currentSize = typeof size === 'number' 
    ? { icon: size, font: 'text-base', textGap: 'gap-2' }
    : sizeMap[size] || sizeMap.md;

  const iconDim = currentSize.icon;

  // Determine color scheme based on variant
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
          className="flex-shrink-0 transition-transform duration-200 hover:scale-105"
        >
          <defs>
            {/* Primary Navy-Indigo-Electric Gradient */}
            <linearGradient id="pariGradPrimary" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#1E1B4B" />
              <stop offset="50%" stopColor="#312E81" />
              <stop offset="100%" stopColor="#2563EB" />
            </linearGradient>

            {/* Accent Growth Pillar Gradient */}
            <linearGradient id="pariGradAccent" x1="20" y1="100" x2="90" y2="20" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#60A5FA" />
            </linearGradient>

            {/* Highlight Lens Arc Gradient */}
            <linearGradient id="pariGradLens" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#818CF8" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
          </defs>

          {isMonoWhite ? (
            /* Monochrome White Icon */
            <g fill="#FFFFFF">
              <rect x="18" y="14" width="18" height="72" rx="9" />
              <path d="M 36 14 H 62 C 77.47 14 90 26.53 90 42 C 90 57.47 77.47 70 62 70 H 36 V 52 H 62 C 67.52 52 72 47.52 72 42 C 72 36.48 67.52 32 62 32 H 36 V 14 Z" />
              <path d="M 46 36 L 68 14 L 84 30 L 62 52 Z" opacity="0.9" />
            </g>
          ) : isMonoBlack ? (
            /* Monochrome Black Icon */
            <g fill="#0F172A">
              <rect x="18" y="14" width="18" height="72" rx="9" />
              <path d="M 36 14 H 62 C 77.47 14 90 26.53 90 42 C 90 57.47 77.47 70 62 70 H 36 V 52 H 62 C 67.52 52 72 47.52 72 42 C 72 36.48 67.52 32 62 32 H 36 V 14 Z" />
              <path d="M 46 36 L 68 14 L 84 30 L 62 52 Z" opacity="0.85" />
            </g>
          ) : (
            /* Standard Color Icon: P Stem + Financial Arc Loop + Upward Trend Pillar */
            <g>
              {/* Outer soft shadow background capsule */}
              <rect x="18" y="14" width="18" height="72" rx="9" fill="url(#pariGradPrimary)" />
              
              {/* Ascending Trend Pillar / Middle Financial Curve */}
              <rect x="42" y="38" width="16" height="48" rx="8" fill="url(#pariGradPrimary)" opacity="0.9" />
              <rect x="66" y="22" width="16" height="64" rx="8" fill="url(#pariGradAccent)" />

              {/* Stylized 'P' Loop Sweeping Arc */}
              <path
                d="M 32 14 H 64 C 78.36 14 90 25.64 90 40 C 90 54.36 78.36 66 64 66 H 36"
                stroke="url(#pariGradLens)"
                strokeWidth="14"
                strokeLinecap="round"
                fill="none"
              />

              {/* Upward Growth Lens Dot */}
              <circle cx="64" cy="40" r="7" fill="#FFFFFF" opacity="0.9" />
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
              isMonoWhite ? 'text-blue-200' : 
              isMonoBlack ? 'text-blue-600' : 
              'text-primary font-black'
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
