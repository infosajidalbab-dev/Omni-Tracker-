import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 'md', showText = true }) => {
  const sizeMap = {
    sm: { icon: 'w-7 h-7', text: 'text-base', sub: 'text-[9px]' },
    md: { icon: 'w-9 h-9', text: 'text-lg', sub: 'text-[10px]' },
    lg: { icon: 'w-11 h-11', text: 'text-2xl', sub: 'text-xs' },
  };

  const { icon, text, sub } = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Abstract geometric circular O-mark */}
      <div className={`relative ${icon} flex-shrink-0 flex items-center justify-center`}>
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
          {/* Outer track background */}
          <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" className="opacity-15" />
          
          {/* Orange active momentum arc */}
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="#FF7628"
            strokeWidth="7"
            strokeDasharray="210 270"
            strokeLinecap="round"
            className="transform -rotate-90 origin-center"
          />

          {/* Green habit completion inner arc */}
          <circle
            cx="50"
            cy="50"
            r="28"
            fill="none"
            stroke="#22C58B"
            strokeWidth="6"
            strokeDasharray="120 180"
            strokeLinecap="round"
            className="transform rotate-45 origin-center"
          />

          {/* Central pulse core */}
          <circle cx="50" cy="50" r="8" fill="#F7F7F8" />
          <circle cx="50" cy="50" r="4" fill="#FF7628" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1">
            <span className={`font-black tracking-wider uppercase ${text} tracking-tight`}>
              OMNI
            </span>
            <span className={`font-semibold text-[#FF7628] ${text}`}>
              TRACKER
            </span>
          </div>
          <span className={`font-medium tracking-wide text-[#A0A2AA] uppercase ${sub} mt-0.5`}>
            Track. Improve.
          </span>
        </div>
      )}
    </div>
  );
};
