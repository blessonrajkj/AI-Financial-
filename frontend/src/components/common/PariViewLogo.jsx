import React from 'react';
import pariViewLogoImg from '../../assets/pariview-logo.png';

/**
 * PariView Official Logo Component
 * 
 * Uses exact brand logo image uploaded by the user.
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
    xs: { icon: 24, font: 'text-sm', textGap: 'gap-2' },
    sm: { icon: 30, font: 'text-base', textGap: 'gap-2.5' },
    md: { icon: 38, font: 'text-lg', textGap: 'gap-3' },
    lg: { icon: 50, font: 'text-2xl', textGap: 'gap-3.5' },
    xl: { icon: 64, font: 'text-3xl', textGap: 'gap-4' },
  };

  const currentSize = typeof size === 'number' 
    ? { icon: size, font: 'text-base', textGap: 'gap-2.5' }
    : sizeMap[size] || sizeMap.md;

  const iconDim = currentSize.icon;

  const isMonoWhite = variant === 'monochrome-white';
  const isMonoBlack = variant === 'monochrome-black';

  return (
    <div className={`inline-flex items-center ${currentSize.textGap} select-none ${className}`}>
      {/* ─── EXACT PARIVIEW LOGO IMAGE ─── */}
      {variant !== 'wordmark' && (
        <img
          src={pariViewLogoImg}
          alt="PariView Logo"
          style={{ width: iconDim, height: iconDim }}
          className="flex-shrink-0 object-contain rounded-xl transition-transform duration-200 hover:scale-105 drop-shadow-sm"
        />
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
