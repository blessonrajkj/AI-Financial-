import React from 'react';

/**
 * PariView Official Logo Component
 * 
 * Includes:
 * - 'P' silhouette in Electric Blue to Violet gradient.
 * - 3 ascending cyan bar chart pillars inside the lower stem.
 * - Glowing upward trend line graph with data nodes inside the 'P'.
 * - Bold white ascending arrow launching to the top-right.
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
          className="flex-shrink-0 transition-transform duration-200 hover:scale-105 filter drop-shadow-sm"
        >
          <defs>
            {/* 'P' Outer Body Blue to Purple Gradient */}
            <linearGradient id="pvPBodyGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#00A3FF" />
              <stop offset="35%" stopColor="#1D4ED8" />
              <stop offset="75%" stopColor="#7C3AED" />
              <stop offset="100%" stopColor="#9333EA" />
            </linearGradient>

            {/* Ascending Financial Bars Cyan Gradient */}
            <linearGradient id="pvBarsGrad" x1="10" y1="80" x2="60" y2="20" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#0284C7" />
            </linearGradient>

            {/* Glowing Trend Line Gradient */}
            <linearGradient id="pvLineGraphGrad" x1="15" y1="65" x2="75" y2="20" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#00F0FF" />
              <stop offset="50%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#34D399" />
            </linearGradient>

            {/* Dark Shadow Polygon inside upper 'P' loop */}
            <linearGradient id="pvShadowGrad" x1="40" y1="20" x2="80" y2="50" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0B132B" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#1E1B4B" stopOpacity="0.2" />
            </linearGradient>

            <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#00F0FF" floodOpacity="0.6" />
            </filter>
          </defs>

          {isMonoWhite ? (
            /* Monochrome White Icon */
            <g fill="#FFFFFF">
              <path d="M 8 28 C 8 16 18 6 30 6 H 64 C 79.46 6 92 18.54 92 34 C 92 49.46 79.46 62 64 62 H 36 V 82 C 36 88.63 30.63 94 24 94 H 20 C 13.37 94 8 88.63 8 82 V 28 Z" />
            </g>
          ) : isMonoBlack ? (
            /* Monochrome Black Icon */
            <g fill="#0F172A">
              <path d="M 8 28 C 8 16 18 6 30 6 H 64 C 79.46 6 92 18.54 92 34 C 92 49.46 79.46 62 64 62 H 36 V 82 C 36 88.63 30.63 94 24 94 H 20 C 13.37 94 8 88.63 8 82 V 28 Z" />
            </g>
          ) : (
            /* Standard Full Color Design with Bar Chart + Ascending Line Graph inside P */
            <g>
              {/* Main Outer "P" Silhouette Body */}
              <path
                d="M 8 26 C 8 15 17 6 28 6 H 62 C 78.57 6 92 19.43 92 36 C 92 52.57 78.57 66 62 66 H 36 V 80 C 36 87.73 29.73 94 22 94 H 20 C 13.37 94 8 88.63 8 82 V 26 Z"
                fill="url(#pvPBodyGrad)"
              />

              {/* Dark Triangle Shadow in Upper Loop */}
              <path
                d="M 36 24 L 72 38 L 48 58 Z"
                fill="url(#pvShadowGrad)"
              />

              {/* 3 Ascending Slanted Parallelogram Financial Chart Bars */}
              <polygon points="10,64 24,53 32,53 18,64" fill="url(#pvBarsGrad)" opacity="0.95" />
              <polygon points="20,53 36,40 44,40 28,53" fill="url(#pvBarsGrad)" />
              <polygon points="30,42 48,27 56,27 38,42" fill="url(#pvBarsGrad)" />

              {/* Explicit Upward Line Graph Curve inside the P */}
              <path
                d="M 16 66 L 30 52 L 44 56 L 66 28"
                stroke="url(#pvLineGraphGrad)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#lineGlow)"
              />
              {/* Line Graph Data Points / Nodes */}
              <circle cx="16" cy="66" r="3" fill="#FFFFFF" />
              <circle cx="30" cy="52" r="3" fill="#FFFFFF" />
              <circle cx="44" cy="56" r="3" fill="#FFFFFF" />
              <circle cx="66" cy="28" r="4" fill="#34D399" />

              {/* White Sweeping Ascending Arrow Curve */}
              <path
                d="M 8 86 C 18 78 30 66 48 48 C 55 41 63 33 70 26 L 60 26 L 73 14 L 73 38 L 68 30 C 58 40 45 54 30 68 C 20 78 12 84 8 86 Z"
                fill="#FFFFFF"
              />
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
