/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Suspense } from 'react';
import { Sidebar } from './components/navigation/Sidebar';
import { MobileBottomNav } from './components/navigation/MobileBottomNav';
import { Header } from './components/navigation/Header';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { FloatingEdgeHandle } from './components/common/FloatingEdgeHandle';
import { AndroidOverlayModal } from './components/common/AndroidOverlayModal';
import { QuickLogSheet } from './components/common/QuickLogSheet';
import { AddExpenseModal } from './components/expenses/AddExpenseModal';
import { QuickHabitModal } from './components/habits/QuickHabitModal';
import { HabitRemindersModal } from './components/habits/HabitRemindersModal';
import { RecurringExpensesModal } from './components/expenses/RecurringExpensesModal';
import { OnboardingModal } from './components/onboarding/OnboardingModal';
import { initializeDatabase, processDueRecurringExpenses, exportDatabaseBackup } from './database/db';
import { syncService } from './services/syncService';
import { reminderService } from './utils/reminderService';
import { getLocalDateString } from './utils/dateUtils';
import { useTranslation } from './utils/i18n';
import { Bell, Sparkles, X, Download, ShieldCheck } from 'lucide-react';
import type { ActiveTab, Expense } from './types';

// Lazy-load every tab view with React.lazy for high performance and optimal bundle chunking
const DashboardView = React.lazy(() => import('./components/dashboard/DashboardView').then(m => ({ default: m.DashboardView })));
const ExpensesView = React.lazy(() => import('./components/expenses/ExpensesView').then(m => ({ default: m.ExpensesView })));
const HabitsView = React.lazy(() => import('./components/habits/HabitsView').then(m => ({ default: m.HabitsView })));
const BudgetView = React.lazy(() => import('./components/budget/BudgetView').then(m => ({ default: m.BudgetView })));
const ReportsView = React.lazy(() => import('./components/reports/ReportsView').then(m => ({ default: m.ReportsView })));
const SyncView = React.lazy(() => import('./components/sync/SyncView').then(m => ({ default: m.SyncView })));
const SettingsView = React.lazy(() => import('./components/settings/SettingsView').then(m => ({ default: m.SettingsView })));

const ViewSkeletonFallback = () => (
  <div className="w-full space-y-4 animate-pulse pt-1" aria-busy="true">
    <div className="h-24 rounded-2xl bg-slate-200/50 dark:bg-white/[0.04] border border-slate-300/30 dark:border-white/[0.06]" />
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
      <div className="h-32 rounded-2xl bg-slate-200/50 dark:bg-white/[0.04] border border-slate-300/30 dark:border-white/[0.06]" />
      <div className="h-32 rounded-2xl bg-slate-200/50 dark:bg-white/[0.04] border border-slate-300/30 dark:border-white/[0.06]" />
      <div className="h-32 rounded-2xl bg-slate-200/50 dark:bg-white/[0.04] border border-slate-300/30 dark:border-white/[0.06]" />
    </div>
    <div className="h-64 rounded-2xl bg-slate-200/50 dark:bg-white/[0.04] border border-slate-300/30 dark:border-white/[0.06]" />
  </div>
);

export default function App() {
  const { t } = useTranslation();
  const [currentTab, setCurrentTab] = useState<ActiveTab>('dashboard');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('omni_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    }
    return 'dark';
  });

  const [currencySymbol, setCurrencySymbol] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('omni_currency') || '৳';
    }
    return '৳';
  });

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isQuickHabitOpen, setIsQuickHabitOpen] = useState(false);
  const [isQuickLogOpen, setIsQuickLogOpen] = useState(false);
  const [isRemindersOpen, setIsRemindersOpen] = useState(false);
  const [isRecurringOpen, setIsRecurringOpen] = useState(false);
  const [inAppAlert, setInAppAlert] = useState<{ title: string; desc: string } | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [repeatingExpense, setRepeatingExpense] = useState<Expense | null>(null);
  const [isOverlayGuideOpen, setIsOverlayGuideOpen] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isOnline, setIsOnline] = useState(syncService.isOnline());
  const [dataVersion, setDataVersion] = useState(0);

  // First-time 3-screen Onboarding
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return !localStorage.getItem('omni_onboarding_completed');
    }
    return false;
  });

  // Weekly "Back up your data" reminder banner
  const [showBackupBanner, setShowBackupBanner] = useState(() => {
    if (typeof window !== 'undefined') {
      const last = localStorage.getItem('omni_last_backup_prompt');
      if (!last) return true;
      const lastTime = parseInt(last, 10);
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      return Date.now() - lastTime > sevenDaysMs;
    }
    return false;
  });

  // Apply theme class to document element & body
  useEffect(() => {
    localStorage.setItem('omni_theme', theme);
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
      document.body.className = 'bg-[#F5F7FA] text-[#20242B] antialiased selection:bg-[#17875D]/20';
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
      document.body.className = 'bg-[#101114] text-[#F7F7F8] antialiased selection:bg-[#FF7628]/30 selection:text-white';
    }
  }, [theme]);

  // Persist currency
  const handleCurrencyChange = (sym: string) => {
    setCurrencySymbol(sym);
    localStorage.setItem('omni_currency', sym);
  };

  // One-tap Weekly Backup Export
  const handleWeeklyBackupExport = async () => {
    try {
      const jsonBackup = await exportDatabaseBackup();
      const blob = new Blob([jsonBackup], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `omni_tracker_weekly_backup_${getLocalDateString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      localStorage.setItem('omni_last_backup_prompt', Date.now().toString());
      setShowBackupBanner(false);
    } catch (e) {
      console.error('Backup export failed', e);
    }
  };

  const handleDismissBackupBanner = () => {
    localStorage.setItem('omni_last_backup_prompt', Date.now().toString());
    setShowBackupBanner(false);
  };

  // Initialize IndexedDB, storage persistence, recurring automation, reminders, & sync subscriptions
  useEffect(() => {
    // Request persistent storage on launch
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().catch(() => {});
    }

    initializeDatabase().then(async () => {
      setDataVersion(v => v + 1);
      // Process predictable recurring expenses if due (zero duplicate guarantee)
      try {
        const recRes = await processDueRecurringExpenses();
        if (recRes.generatedCount > 0) {
          setDataVersion(v => v + 1);
        }
      } catch (e) {
        console.warn('Recurring expenses check notice:', e);
      }
    });

    // Start background habit reminder checker
    reminderService.startListener((habit) => {
      setInAppAlert({
        title: `Habit Reminder: ${habit.title}`,
        desc: habit.description || 'Time to complete your habit and keep your streak alive!'
      });
      setTimeout(() => setInAppAlert(null), 7000);
    });

    const updateSyncStatus = async () => {
      setIsOnline(syncService.isOnline());
      const counts = await syncService.getQueueCounts();
      setPendingSyncCount(counts.pending);
    };

    updateSyncStatus();
    const unsub = syncService.subscribe(updateSyncStatus);
    return () => {
      unsub();
      reminderService.stopListener();
    };
  }, []);

  const handleToggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleQuickAddExpense = () => {
    setEditingExpense(null);
    setRepeatingExpense(null);
    setIsAddExpenseOpen(true);
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setRepeatingExpense(null);
    setIsAddExpenseOpen(true);
  };

  const handleRepeatExpense = (expense: Expense) => {
    setEditingExpense(null);
    setRepeatingExpense(expense);
    setIsAddExpenseOpen(true);
  };

  const handleExpenseSaved = () => {
    setDataVersion(v => v + 1);
  };

  return (
    <div className={`min-h-screen relative flex flex-col md:flex-row transition-colors overflow-x-hidden ${
      theme === 'dark' ? 'bg-[#0c0d10] text-[#F8F9FA]' : 'bg-[#F4F6F9] text-[#1A1D24]'
    }`}>
      {/* Ambient Atmospheric Lighting Blobs for Liquid Glass Refraction */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        {theme === 'dark' ? (
          <>
            <div className="absolute -top-32 right-1/4 w-[500px] h-[500px] rounded-full bg-[#FF7628]/[0.08] blur-[130px]" />
            <div className="absolute -bottom-32 left-10 w-[450px] h-[450px] rounded-full bg-[#22C58B]/[0.05] blur-[140px]" />
            <div className="absolute top-1/2 right-10 w-[400px] h-[400px] rounded-full bg-[#6366F1]/[0.03] blur-[150px]" />
          </>
        ) : (
          <>
            <div className="absolute -top-32 right-1/4 w-[500px] h-[500px] rounded-full bg-[#FF7628]/[0.05] blur-[120px]" />
            <div className="absolute -bottom-32 left-10 w-[450px] h-[450px] rounded-full bg-[#16A34A]/[0.04] blur-[130px]" />
            <div className="absolute top-1/3 left-1/3 w-[350px] h-[350px] rounded-full bg-[#38BDF8]/[0.04] blur-[120px]" />
          </>
        )}
      </div>

      {/* Offline Status Badge */}
      <OfflineIndicator />

      {/* Desktop Left Collapsible Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onQuickAddExpense={handleQuickAddExpense}
        pendingSyncCount={pendingSyncCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden relative z-10">
        {/* Top Header */}
        <Header
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onOpenSync={() => setCurrentTab('sync')}
          onOpenOverlayGuide={() => setIsOverlayGuideOpen(true)}
          onQuickAddExpense={handleQuickAddExpense}
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          isOnline={isOnline}
          pendingSyncCount={pendingSyncCount}
        />

        {/* Viewport content */}
        <main className="flex-1 px-3.5 sm:px-6 md:px-8 pt-4 sm:pt-5 pb-28 md:pb-8 max-w-7xl mx-auto w-full">
          {/* Weekly Backup Reminder Banner */}
          {showBackupBanner && (
            <div className="mb-4 p-3.5 sm:p-4 rounded-2xl glass-panel border border-[#FF7628]/35 bg-gradient-to-r from-[#FF7628]/10 via-[#FF7628]/5 to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg animate-in fade-in duration-200">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FF7628]/20 text-[#FF7628] flex items-center justify-center flex-shrink-0">
                  <Download className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{t('weeklyBackupTitle')}</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#FF7628]/15 text-[#FF7628] text-[10px] font-bold">Recommended</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-[#9FA2AC] mt-0.5 max-w-xl leading-relaxed">
                    {t('weeklyBackupDesc')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                <button
                  onClick={handleWeeklyBackupExport}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#FF7628] to-[#FF8C42] hover:brightness-110 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-[#FF7628]/25 transition active:scale-95 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t('oneTapExport')}</span>
                </button>
                <button
                  onClick={handleDismissBackupBanner}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
                  title="Dismiss reminder"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <Suspense fallback={<ViewSkeletonFallback />}>
            {currentTab === 'dashboard' && (
              <DashboardView
                key={`dash_${dataVersion}`}
                onAddExpense={handleQuickAddExpense}
                onEditExpense={handleEditExpense}
                onRepeatExpense={handleRepeatExpense}
                onViewAllExpenses={() => setCurrentTab('expenses')}
                onViewAllHabits={() => setCurrentTab('habits')}
                onViewBudget={() => setCurrentTab('budget')}
                currencySymbol={currencySymbol}
                theme={theme}
              />
            )}

            {currentTab === 'expenses' && (
              <ExpensesView
                key={`exp_${dataVersion}`}
                onAddExpense={handleQuickAddExpense}
                onEditExpense={handleEditExpense}
                onRepeatExpense={handleRepeatExpense}
                onOpenRecurring={() => setIsRecurringOpen(true)}
                currencySymbol={currencySymbol}
                theme={theme}
              />
            )}

            {currentTab === 'habits' && (
              <HabitsView
                key={`hab_${dataVersion}`}
                theme={theme}
                onOpenReminders={() => setIsRemindersOpen(true)}
              />
            )}

            {currentTab === 'budget' && (
              <BudgetView
                key={`bud_${dataVersion}`}
                currencySymbol={currencySymbol}
                theme={theme}
              />
            )}

            {currentTab === 'reports' && (
              <ReportsView
                key={`rep_${dataVersion}`}
                currencySymbol={currencySymbol}
                theme={theme}
                onAddExpense={handleQuickAddExpense}
              />
            )}

            {currentTab === 'sync' && (
              <SyncView key={`sync_${dataVersion}`} theme={theme} />
            )}

            {currentTab === 'settings' && (
              <SettingsView
                theme={theme}
                onToggleTheme={handleToggleTheme}
                currencySymbol={currencySymbol}
                onChangeCurrency={handleCurrencyChange}
                onNavigateTab={setCurrentTab}
                onOpenOverlayGuide={() => setIsOverlayGuideOpen(true)}
                onOpenOnboarding={() => setIsOnboardingOpen(true)}
              />
            )}
          </Suspense>
        </main>
      </div>

      {/* In-App Habit Reminder Banner Toast */}
      {inAppAlert && (
        <div className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-50 glass-panel p-4 rounded-2xl shadow-2xl border border-purple-500/40 animate-in slide-in-from-top duration-200 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0">
            <Bell className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>{inAppAlert.title}</span>
              <Sparkles className="w-3 h-3 text-purple-400" />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-[#9FA2AC] mt-0.5">
              {inAppAlert.desc}
            </p>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => {
                  setInAppAlert(null);
                  setIsQuickHabitOpen(true);
                }}
                className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold transition active:scale-95"
              >
                Complete Habit
              </button>
              <button
                onClick={() => setInAppAlert(null)}
                className="px-2 py-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white text-[11px]"
              >
                Dismiss
              </button>
            </div>
          </div>
          <button
            onClick={() => setInAppAlert(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onQuickLog={() => setIsQuickLogOpen(true)}
        theme={theme}
      />

      {/* Floating In-App Edge Handle (simulation & quick action dock) */}
      <FloatingEdgeHandle
        onAddExpense={handleQuickAddExpense}
        onOpenHabits={() => setIsQuickHabitOpen(true)}
        onOpenOverlayGuide={() => setIsOverlayGuideOpen(true)}
        isModalOpen={isAddExpenseOpen || isQuickHabitOpen || isOverlayGuideOpen || isQuickLogOpen || isRemindersOpen || isRecurringOpen}
      />

      {/* Mobile Quick Log Action Sheet (Choose between Add Expense, Complete Habit, & Repeat Recent) */}
      <QuickLogSheet
        isOpen={isQuickLogOpen}
        onClose={() => setIsQuickLogOpen(false)}
        onSelectAddExpense={() => {
          setIsQuickLogOpen(false);
          handleQuickAddExpense();
        }}
        onSelectCompleteHabit={() => {
          setIsQuickLogOpen(false);
          setIsQuickHabitOpen(true);
        }}
        onSelectRepeatExpense={(exp) => {
          setIsQuickLogOpen(false);
          handleRepeatExpense(exp);
        }}
        currencySymbol={currencySymbol}
        theme={theme}
      />

      {/* Fast Expense Modal (Add / Edit / Repeat with Keypad & Templates) */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        onSaved={handleExpenseSaved}
        initialExpense={editingExpense}
        repeatExpense={repeatingExpense}
        currencySymbol={currencySymbol}
        theme={theme}
      />

      {/* Fast Quick Habit Modal (Check off today's habits with streaks) */}
      <QuickHabitModal
        isOpen={isQuickHabitOpen}
        onClose={() => {
          setIsQuickHabitOpen(false);
          setDataVersion(v => v + 1);
        }}
        onHabitUpdated={() => setDataVersion(v => v + 1)}
        onOpenFullHabits={() => {
          setIsQuickHabitOpen(false);
          setCurrentTab('habits');
        }}
        theme={theme}
      />

      {/* Habit Reminders Modal */}
      <HabitRemindersModal
        isOpen={isRemindersOpen}
        onClose={() => setIsRemindersOpen(false)}
        theme={theme}
      />

      {/* Recurring Expenses Manager Modal */}
      <RecurringExpensesModal
        isOpen={isRecurringOpen}
        onClose={() => setIsRecurringOpen(false)}
        currencySymbol={currencySymbol}
        theme={theme}
        onExpensesChanged={() => setDataVersion(v => v + 1)}
      />

      {/* Android Floating Overlay Blueprint & Spec Modal */}
      <AndroidOverlayModal
        isOpen={isOverlayGuideOpen}
        onClose={() => setIsOverlayGuideOpen(false)}
        onQuickAddExpense={() => {
          setIsOverlayGuideOpen(false);
          handleQuickAddExpense();
        }}
        onQuickAddHabit={() => {
          setIsOverlayGuideOpen(false);
          setIsQuickHabitOpen(true);
        }}
      />

      {/* 3-Screen First-Time User Onboarding */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        theme={theme}
      />
    </div>
  );
}
