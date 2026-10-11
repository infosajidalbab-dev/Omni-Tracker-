import React from 'react';
import { 
  Sun, 
  Moon, 
  RefreshCw, 
  WifiOff, 
  Plus, 
  Smartphone,
  ChevronDown
} from 'lucide-react';
import { Logo } from '../common/Logo';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { useTranslation } from '../../utils/i18n';
import type { ActiveTab } from '../../types';

interface HeaderProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenSync: () => void;
  onOpenOverlayGuide: () => void;
  onQuickAddExpense: () => void;
  currentTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  isOnline: boolean;
  pendingSyncCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  onToggleTheme,
  onOpenSync,
  onOpenOverlayGuide,
  onQuickAddExpense,
  currentTab,
  onSelectTab,
  isOnline,
  pendingSyncCount,
}) => {
  const { t } = useTranslation();

  // Current time greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Formatted date
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  return (
    <header
      className={`sticky top-0 z-20 flex items-center justify-between px-3.5 sm:px-6 py-2.5 sm:py-3 border-b transition-colors select-none ${
        theme === 'dark'
          ? 'bg-[#0c0d10]/70 backdrop-blur-2xl border-white/10 text-[#F8F9FA]'
          : 'bg-[#F4F6F9]/75 backdrop-blur-2xl border-slate-200/80 text-[#1A1D24]'
      }`}
    >
      {/* Top subtle reflection highlight */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

      {/* Left: Mobile Brand / Desktop Greetings */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="md:hidden flex-shrink-0">
          <Logo size="sm" showText={true} />
        </div>

        <div className="hidden md:flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-current">
              {getGreeting()}
            </span>
            <span className="text-xs text-muted-foreground opacity-60">· {formattedDate}</span>
          </div>
          <span className="text-xs opacity-70">
            Track everything · Improve every day
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* PWA Install Button */}
        <PWAInstallButton compact={true} />

        {/* Sync Status Badge */}
        <button
          onClick={onOpenSync}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all active:scale-95 ${
            !isOnline
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              : pendingSyncCount > 0
                ? 'bg-[#FF7628]/10 border-[#FF7628]/30 text-[#FF7628]'
                : theme === 'dark'
                  ? 'bg-white/5 border-white/10 text-[#22C58B] hover:bg-white/10'
                  : 'bg-white/80 border-slate-200 text-emerald-700 hover:bg-white shadow-xs'
          }`}
          title="Cloud Sync & OneDrive Status"
        >
          {!isOnline ? (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('offline')}</span>
            </>
          ) : pendingSyncCount > 0 ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#FF7628]" />
              <span className="text-[11px] font-bold">{pendingSyncCount} {t('pending')}</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-[#22C58B] inline-block animate-pulse shadow-sm shadow-[#22C58B]/50" />
              <span className="hidden sm:inline">{t('synced')}</span>
            </>
          )}
        </button>

        {/* Android Floating Overlay Spec / Simulation Guide */}
        <button
          onClick={onOpenOverlayGuide}
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all active:scale-95 ${
            theme === 'dark'
              ? 'bg-white/5 border-white/10 text-[#9FA2AC] hover:text-white hover:bg-white/10'
              : 'bg-white/80 border-slate-200 text-[#5A606E] hover:text-[#1A1D24] hover:bg-white shadow-xs'
          }`}
          title="Android Floating Overlay Feature & Setup"
        >
          <Smartphone className="w-3.5 h-3.5 text-[#FF7628]" />
          <span>Android Dock</span>
        </button>

        {/* Theme Toggle (Mobile & Desktop Header) */}
        <button
          onClick={onToggleTheme}
          aria-label="Toggle Theme"
          className={`p-2 rounded-xl border transition-all active:scale-90 ${
            theme === 'dark'
              ? 'bg-white/5 border-white/10 text-amber-400 hover:bg-white/10'
              : 'bg-white/80 border-slate-200 text-amber-600 hover:bg-white shadow-xs'
          }`}
        >
          {theme === 'dark' ? <Moon className="w-4 h-4 text-[#FF7628]" /> : <Sun className="w-4 h-4 text-amber-500" />}
        </button>

        {/* Quick Add Button (Desktop Header) */}
        <button
          onClick={onQuickAddExpense}
          className="hidden lg:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#FF7628] to-[#FF8C42] text-white text-xs font-bold hover:brightness-110 active:scale-95 transition shadow-sm shadow-[#FF7628]/25"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Expense</span>
        </button>
      </div>
    </header>
  );
};
