import React from 'react';
import { 
  LayoutDashboard, 
  Receipt, 
  CheckSquare, 
  BarChart3, 
  Plus, 
  Settings 
} from 'lucide-react';
import type { ActiveTab } from '../../types';

interface MobileBottomNavProps {
  currentTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onQuickLog: () => void;
  theme: 'dark' | 'light';
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onSelectTab,
  onQuickLog,
  theme,
}) => {
  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-3 left-3 right-3 sm:max-w-md sm:mx-auto z-40 select-none pb-safe pointer-events-none"
    >
      <div className="glass-dock rounded-[2rem] px-2 py-1.5 flex items-center justify-around relative pointer-events-auto">
        {/* Dashboard */}
        <button
          onClick={() => onSelectTab('dashboard')}
          aria-label="Dashboard"
          className={`flex flex-col items-center justify-center min-w-[54px] py-1.5 px-2 rounded-2xl transition-all active:scale-95 ${
            currentTab === 'dashboard'
              ? theme === 'dark' 
                ? 'text-[#FF7628] bg-[#FF7628]/15 shadow-sm shadow-[#FF7628]/20' 
                : 'text-[#FF7628] bg-[#FF7628]/10'
              : theme === 'dark' 
                ? 'text-[#9FA2AC] hover:text-white' 
                : 'text-[#5A606E] hover:text-[#1A1D24]'
          }`}
        >
          <LayoutDashboard className={`w-5 h-5 mb-0.5 ${currentTab === 'dashboard' ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
          <span className="text-[10px] font-semibold tracking-tight">Home</span>
        </button>

        {/* Expenses */}
        <button
          onClick={() => onSelectTab('expenses')}
          aria-label="Expenses"
          className={`flex flex-col items-center justify-center min-w-[54px] py-1.5 px-2 rounded-2xl transition-all active:scale-95 ${
            currentTab === 'expenses'
              ? theme === 'dark' 
                ? 'text-[#FF7628] bg-[#FF7628]/15 shadow-sm shadow-[#FF7628]/20' 
                : 'text-[#FF7628] bg-[#FF7628]/10'
              : theme === 'dark' 
                ? 'text-[#9FA2AC] hover:text-white' 
                : 'text-[#5A606E] hover:text-[#1A1D24]'
          }`}
        >
          <Receipt className={`w-5 h-5 mb-0.5 ${currentTab === 'expenses' ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
          <span className="text-[10px] font-semibold tracking-tight">Expense</span>
        </button>

        {/* Center Prominent Glowing Quick Log FAB */}
        <div className="relative -top-4 flex flex-col items-center px-1">
          <button
            onClick={onQuickLog}
            aria-label="Quick Log (Expense or Habit)"
            className="w-13 h-13 rounded-full bg-gradient-to-tr from-[#FF7628] via-[#FF853E] to-[#FFA066] text-white flex items-center justify-center shadow-xl shadow-[#FF7628]/45 ring-4 ring-black/20 dark:ring-black/40 active:scale-90 transition-all cursor-pointer group"
          >
            <Plus className="w-6 h-6 stroke-[3] group-hover:rotate-90 transition-transform duration-200" />
          </button>
          <span className="text-[9px] font-bold text-[#FF7628] mt-0.5 tracking-tight uppercase">
            Quick Log
          </span>
        </div>

        {/* Habits */}
        <button
          onClick={() => onSelectTab('habits')}
          aria-label="Habits"
          className={`flex flex-col items-center justify-center min-w-[54px] py-1.5 px-2 rounded-2xl transition-all active:scale-95 ${
            currentTab === 'habits'
              ? theme === 'dark' 
                ? 'text-[#22C58B] bg-[#22C58B]/15 shadow-sm shadow-[#22C58B]/20' 
                : 'text-[#16A34A] bg-[#16A34A]/10'
              : theme === 'dark' 
                ? 'text-[#9FA2AC] hover:text-white' 
                : 'text-[#5A606E] hover:text-[#1A1D24]'
          }`}
        >
          <CheckSquare className={`w-5 h-5 mb-0.5 ${currentTab === 'habits' ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
          <span className="text-[10px] font-semibold tracking-tight">Habits</span>
        </button>

        {/* Reports / Settings */}
        <button
          onClick={() => onSelectTab(currentTab === 'reports' ? 'settings' : 'reports')}
          aria-label={currentTab === 'settings' ? 'Settings' : 'Reports'}
          className={`flex flex-col items-center justify-center min-w-[54px] py-1.5 px-2 rounded-2xl transition-all active:scale-95 ${
            currentTab === 'reports' || currentTab === 'settings'
              ? theme === 'dark' 
                ? 'text-[#FF7628] bg-[#FF7628]/15 shadow-sm shadow-[#FF7628]/20' 
                : 'text-[#FF7628] bg-[#FF7628]/10'
              : theme === 'dark' 
                ? 'text-[#9FA2AC] hover:text-white' 
                : 'text-[#5A606E] hover:text-[#1A1D24]'
          }`}
        >
          {currentTab === 'settings' ? (
            <Settings className={`w-5 h-5 mb-0.5 ${currentTab === 'settings' ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
          ) : (
            <BarChart3 className={`w-5 h-5 mb-0.5 ${currentTab === 'reports' ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
          )}
          <span className="text-[10px] font-semibold tracking-tight">
            {currentTab === 'settings' ? 'Settings' : 'Reports'}
          </span>
        </button>
      </div>
    </nav>
  );
};
