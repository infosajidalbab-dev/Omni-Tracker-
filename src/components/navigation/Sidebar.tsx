import React from 'react';
import { 
  LayoutDashboard, 
  Receipt, 
  CheckSquare, 
  PieChart, 
  BarChart3, 
  RefreshCw, 
  Settings, 
  Sun, 
  Moon, 
  ChevronLeft, 
  ChevronRight,
  ShieldCheck,
  Plus
} from 'lucide-react';
import { Logo } from '../common/Logo';
import { useTranslation } from '../../utils/i18n';
import type { ActiveTab } from '../../types';

interface SidebarProps {
  currentTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onQuickAddExpense: () => void;
  pendingSyncCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  theme,
  onToggleTheme,
  isCollapsed,
  onToggleCollapse,
  onQuickAddExpense,
  pendingSyncCount,
}) => {
  const { t } = useTranslation();

  const navItems: Array<{ id: ActiveTab; label: string; icon: React.ElementType; badge?: number }> = [
    { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { id: 'expenses', label: t('expenses'), icon: Receipt },
    { id: 'habits', label: t('habits'), icon: CheckSquare },
    { id: 'budget', label: t('budget'), icon: PieChart },
    { id: 'reports', label: t('reports'), icon: BarChart3 },
    { id: 'sync', label: t('sync'), icon: RefreshCw, badge: pendingSyncCount > 0 ? pendingSyncCount : undefined },
    { id: 'settings', label: t('settings'), icon: Settings },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col justify-between border-r transition-all duration-300 z-30 select-none ${
        theme === 'dark'
          ? 'bg-[#0c0d10]/75 backdrop-blur-2xl border-white/10 text-[#F8F9FA]'
          : 'bg-white/80 backdrop-blur-2xl border-slate-200/80 text-[#1A1D24] shadow-sm'
      } ${isCollapsed ? 'w-20' : 'w-64'}`}
    >
      {/* Top Brand Header */}
      <div>
        <div className={`flex items-center justify-between p-4 border-b ${theme === 'dark' ? 'border-white/10' : 'border-slate-200/70'}`}>
          <Logo size="md" showText={!isCollapsed} />
          <button
            onClick={onToggleCollapse}
            aria-label="Collapse sidebar"
            className={`p-1.5 rounded-xl transition active:scale-90 ${
              theme === 'dark' ? 'hover:bg-white/10 text-[#9FA2AC] hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
            }`}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Quick Add Button */}
        <div className="p-3">
          <button
            onClick={onQuickAddExpense}
            className={`w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FF7628] to-[#FF8C42] text-white font-bold shadow-md shadow-[#FF7628]/25 hover:brightness-110 active:scale-98 transition ${
              isCollapsed ? 'p-3' : 'py-3 px-4 text-xs'
            }`}
            title="Record New Expense"
          >
            <Plus className="w-4 h-4 stroke-[2.5] flex-shrink-0" />
            {!isCollapsed && <span>Add Expense</span>}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="px-2.5 space-y-1.5 mt-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group relative border ${
                  isActive
                    ? theme === 'dark'
                      ? 'bg-[#FF7628]/15 border-[#FF7628]/35 text-[#FF7628] shadow-sm shadow-[#FF7628]/20'
                      : 'bg-[#FF7628]/10 border-[#FF7628]/30 text-[#FF7628] shadow-xs'
                    : theme === 'dark'
                      ? 'border-transparent text-[#9FA2AC] hover:bg-white/5 hover:text-white'
                      : 'border-transparent text-[#5A606E] hover:bg-slate-100/80 hover:text-[#1A1D24]'
                }`}
                title={item.label}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#FF7628] shadow-sm shadow-[#FF7628]/50" />
                )}

                <Icon className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-105 ${
                  isActive ? 'text-[#FF7628]' : ''
                }`} />

                {!isCollapsed && (
                  <span className="truncate flex-1 text-left">{item.label}</span>
                )}

                {item.badge !== undefined && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isCollapsed ? 'absolute top-2 right-2' : ''
                  } ${
                    theme === 'dark' ? 'bg-[#FF7628]/20 text-[#FF7628]' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer controls: theme switch & offline safety badge */}
      <div className={`p-3 border-t space-y-2 ${theme === 'dark' ? 'border-white/10' : 'border-slate-200/70'}`}>
        {/* Offline Safe indicator */}
        {!isCollapsed && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-medium border ${
            theme === 'dark' 
              ? 'bg-white/5 border-white/5 text-[#9FA2AC]' 
              : 'bg-white/80 border-slate-200/70 text-[#5A606E]'
          }`}>
            <ShieldCheck className="w-4 h-4 text-[#22C58B] flex-shrink-0" />
            <span className="truncate">Offline-First IndexedDB</span>
          </div>
        )}

        {/* Theme toggle */}
        <button
          onClick={onToggleTheme}
          className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition border active:scale-98 ${
            theme === 'dark'
              ? 'bg-white/5 border-white/5 text-[#9FA2AC] hover:text-white hover:bg-white/10'
              : 'bg-white/80 border-slate-200/70 text-slate-700 hover:text-slate-950 hover:bg-white shadow-xs'
          }`}
          title="Toggle light and dark themes"
        >
          <div className="flex items-center gap-2.5">
            {theme === 'dark' ? (
              <Moon className="w-4 h-4 text-[#FF7628]" />
            ) : (
              <Sun className="w-4 h-4 text-amber-500" />
            )}
            {!isCollapsed && <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>}
          </div>
          {!isCollapsed && (
            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-white/10 opacity-80">
              {theme}
            </span>
          )}
        </button>
      </div>
    </aside>
  );
};
