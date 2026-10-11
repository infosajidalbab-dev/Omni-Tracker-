import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Calendar, 
  CheckCircle2, 
  Circle, 
  ArrowRight, 
  Bike, 
  Bus, 
  Car, 
  Navigation, 
  Footprints, 
  Utensils, 
  ShoppingBag, 
  HelpCircle,
  Clock, 
  ChevronRight,
  Flame,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { db, toggleHabitCompletion } from '../../database/db';
import { getLocalDateString, getLocalMonthString, getPreviousMonthString } from '../../utils/dateUtils';
import type { Expense, Habit, HabitCompletion, MonthlyBudget, TransportType } from '../../types';

interface DashboardViewProps {
  onAddExpense: () => void;
  onEditExpense: (expense: Expense) => void;
  onRepeatExpense: (expense: Expense) => void;
  onViewAllExpenses: () => void;
  onViewAllHabits: () => void;
  onViewBudget: () => void;
  currencySymbol: string;
  theme: 'dark' | 'light';
}

const TRANSPORT_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  Rickshaw: { icon: Bike, color: '#FF7628' },
  Bus: { icon: Bus, color: '#38BDF8' },
  CNG: { icon: Car, color: '#22C58B' },
  Bike: { icon: Navigation, color: '#A855F7' },
  Walking: { icon: Footprints, color: '#EAB308' },
  Food: { icon: Utensils, color: '#F43F5E' },
  Shopping: { icon: ShoppingBag, color: '#EC4899' },
  Other: { icon: HelpCircle, color: '#94A3B8' },
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  onAddExpense,
  onEditExpense,
  onRepeatExpense,
  onViewAllExpenses,
  onViewAllHabits,
  onViewBudget,
  currencySymbol,
  theme,
}) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<HabitCompletion[]>([]);
  const [budget, setBudget] = useState<MonthlyBudget | null>(null);
  const [loading, setLoading] = useState(true);

  const todayStr = getLocalDateString();
  const currentMonthStr = getLocalMonthString(); // YYYY-MM

  // Fetch real records from Dexie IndexedDB
  const loadData = async () => {
    try {
      const allExpenses = await db.expenses.orderBy('timestamp').reverse().toArray();
      const allHabits = (await db.habits.toArray()).filter(h => h.active !== false);
      const todayCompletions = await db.habitCompletions.where('date').equals(todayStr).toArray();
      const currentBudget = await db.budgets.where('month').equals(currentMonthStr).first();

      setExpenses(allExpenses);
      setHabits(allHabits);
      setCompletions(todayCompletions);
      setBudget(currentBudget || null);
    } catch (e) {
      console.error('Failed to load dashboard data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Calculate actual metrics from real data
  const todayExpenses = expenses.filter(e => e.date === todayStr);
  const todayTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

  const thisMonthExpenses = expenses.filter(e => e.date?.startsWith(currentMonthStr));
  const monthTotal = thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Previous month comparison
  const prevMonthPrefix = getPreviousMonthString();
  const prevMonthExpenses = expenses.filter(e => e.date?.startsWith(prevMonthPrefix));
  const prevMonthTotal = prevMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const momDiff = monthTotal - prevMonthTotal;
  const momPercent = prevMonthTotal > 0 ? Math.round((momDiff / prevMonthTotal) * 100) : null;

  const monthlyBudgetAmount = budget?.budgetAmount || 25000;
  const budgetRemaining = monthlyBudgetAmount - monthTotal;
  const budgetPercentUsed = Math.min(Math.round((monthTotal / (monthlyBudgetAmount || 1)) * 100), 100);

  // Habit metrics
  const completedHabitIds = new Set(completions.map(c => c.habitId));
  const completedHabitsCount = habits.filter(h => completedHabitIds.has(h.id)).length;
  const habitCompletionRate = habits.length > 0 
    ? Math.round((completedHabitsCount / habits.length) * 100) 
    : 0;

  // Toggle habit directly from dashboard
  const handleToggleHabit = async (habitId: string) => {
    await toggleHabitCompletion(habitId, todayStr);
    await loadData();
  };

  // Spending by category breakdown for transport
  const categoryTotals: Record<string, number> = {};
  thisMonthExpenses.forEach(e => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  });

  const sortedCategories = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // Last 7 days spending trend calculation
  const last7Days: Array<{ date: string; label: string; total: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dStr = getLocalDateString(d);
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'narrow' });
    const dayTotal = expenses.filter(e => e.date === dStr).reduce((acc, cur) => acc + cur.amount, 0);
    last7Days.push({ date: dStr, label: dayLabel, total: dayTotal });
  }
  const maxDayTotal = Math.max(...last7Days.map(d => d.total), 100);

  return (
    <div className="space-y-5 sm:space-y-6 pb-20 md:pb-8">
      
      {/* 4 Primary Floating Translucent Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        
        {/* 1. Today's Expense */}
        <div className="glass-panel p-3.5 sm:p-5 transition-all duration-300 hover:-translate-y-0.5 group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#9FA2AC]">
              Today's Spent
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FF7628]/15 text-[#FF7628] flex items-center justify-center shadow-xs">
              <Wallet className="w-4 h-4 stroke-[2.2]" />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3">
            <div className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-[#FF7628] drop-shadow-[0_2px_10px_rgba(255,118,40,0.2)]">
              {currencySymbol}{todayTotal.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 text-[10px] sm:text-[11px] text-slate-500 dark:text-[#9FA2AC]">
              <span>{todayExpenses.length} log{todayExpenses.length === 1 ? '' : 's'} recorded</span>
            </div>
          </div>
        </div>

        {/* 2. This Month's Expense */}
        <div className="glass-panel p-3.5 sm:p-5 transition-all duration-300 hover:-translate-y-0.5 group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#9FA2AC]">
              This Month
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#38BDF8]/15 text-[#0284C7] dark:text-[#38BDF8] flex items-center justify-center shadow-xs">
              <Calendar className="w-4 h-4 stroke-[2.2]" />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3">
            <div className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {currencySymbol}{monthTotal.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 text-[10px] sm:text-[11px] text-slate-500 dark:text-[#9FA2AC]">
              {momPercent !== null ? (
                <span className={`font-semibold flex items-center gap-0.5 ${
                  momDiff > 0 ? 'text-amber-500' : 'text-[#16A34A] dark:text-[#22C58B]'
                }`}>
                  {momDiff > 0 ? `+${momPercent}%` : `${momPercent}%`} vs last mo
                </span>
              ) : (
                <span>{thisMonthExpenses.length} logs · {new Date().toLocaleDateString('en-US', { month: 'short' })}</span>
              )}
            </div>
          </div>
        </div>

        {/* 3. Monthly Budget Remaining */}
        <div 
          onClick={onViewBudget}
          className="glass-panel p-3.5 sm:p-5 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#9FA2AC]">
              Budget Left
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-xs ${
              budgetRemaining < 0 
                ? 'bg-rose-500/20 text-rose-500 dark:text-rose-400' 
                : budgetPercentUsed > 80 
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                  : 'bg-[#22C58B]/15 text-[#16A34A] dark:text-[#22C58B]'
            }`}>
              {budgetRemaining < 0 ? (
                <AlertTriangle className="w-4 h-4 stroke-[2.2]" />
              ) : (
                <TrendingUp className="w-4 h-4 stroke-[2.2]" />
              )}
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3">
            <div className={`text-xl sm:text-2xl lg:text-3xl font-black tracking-tight ${
              budgetRemaining < 0 
                ? 'text-rose-500 dark:text-rose-400' 
                : budgetPercentUsed > 80 
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-[#16A34A] dark:text-[#22C58B]'
            }`}>
              {currencySymbol}{budgetRemaining.toLocaleString()}
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-200 dark:bg-white/10 rounded-full h-1.5 mt-2.5 overflow-hidden">
              <div 
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  budgetPercentUsed > 90 ? 'bg-rose-500' : budgetPercentUsed > 75 ? 'bg-amber-400' : 'bg-gradient-to-r from-[#22C58B] to-[#34D399]'
                }`}
                style={{ width: `${budgetPercentUsed}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-[#9FA2AC] mt-1.5">
              <span>{budgetPercentUsed}% used</span>
              <span>Cap: {currencySymbol}{monthlyBudgetAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* 4. Today's Habit Completion */}
        <div 
          onClick={onViewAllHabits}
          className="glass-panel p-3.5 sm:p-5 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#9FA2AC]">
              Habits Today
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-xs">
              <Flame className="w-4 h-4 stroke-[2.2]" />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3">
            <div className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-[#16A34A] dark:text-[#22C58B]">
              {habitCompletionRate}%
            </div>
            <div className="w-full bg-slate-200 dark:bg-white/10 rounded-full h-1.5 mt-2.5 overflow-hidden">
              <div 
                className="h-1.5 rounded-full bg-gradient-to-r from-purple-500 to-[#22C58B] transition-all duration-500"
                style={{ width: `${habitCompletionRate}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-[#9FA2AC] mt-1.5">
              <span>{completedHabitsCount} of {habits.length} done</span>
              <span className="font-semibold text-[#16A34A] dark:text-[#22C58B]">Today</span>
            </div>
          </div>
        </div>

      </div>

      {/* Middle Section: 7-Day Expense Bar Chart + Habit Quick Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* 7-Day Spending Trend (SVG chart) */}
        <div className="lg:col-span-2 glass-panel p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Daily Spending Trend</span>
                <span className="text-[10px] font-semibold text-[#FF7628] opacity-90">
                  · Last 7 Days
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#9FA2AC]">Daily commute fares and expense flow</p>
            </div>
            <button
              onClick={onViewAllExpenses}
              className="text-xs text-[#FF7628] hover:underline flex items-center gap-1 font-bold"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* SVG Bar Chart */}
          <div className="h-44 flex items-end justify-between gap-2 pt-4 px-1">
            {last7Days.map((item, idx) => {
              const heightPercent = Math.max(Math.round((item.total / maxDayTotal) * 100), 6);
              const isToday = item.date === todayStr;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-[#FF7628] font-bold">
                    {currencySymbol}{item.total}
                  </div>
                  {/* Bar */}
                  <div className="w-full max-w-[38px] bg-slate-100 dark:bg-white/5 rounded-t-xl overflow-hidden h-28 flex items-end border-b border-white/10">
                    <div
                      className={`w-full rounded-t-lg transition-all duration-500 ${
                        isToday 
                          ? 'bg-gradient-to-t from-[#FF7628] to-[#FF9457] shadow-lg shadow-[#FF7628]/35' 
                          : item.total > 0
                            ? 'bg-[#FF7628]/45 hover:bg-[#FF7628]/75'
                            : 'bg-transparent'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>
                  {/* Day label */}
                  <span className={`text-[11px] font-bold ${
                    isToday ? 'text-[#FF7628]' : 'text-slate-500 dark:text-[#9FA2AC]'
                  }`}>
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Transport Breakdown Horizontal Chips */}
          <div className="mt-4 pt-3.5 border-t border-slate-200/70 dark:border-white/10 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-[#9FA2AC]">Top Transport This Month:</span>
            <div className="flex flex-wrap gap-2">
              {sortedCategories.length > 0 ? (
                sortedCategories.map(([cat, total]) => {
                  const meta = TRANSPORT_ICONS[cat] || TRANSPORT_ICONS.Other;
                  const Icon = meta.icon;
                  return (
                    <div
                      key={cat}
                      className="glass-panel-subtle flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-slate-700 dark:text-white/90"
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
                      <span>{cat}:</span>
                      <span className="font-bold text-[#FF7628]">{currencySymbol}{total}</span>
                    </div>
                  );
                })
              ) : (
                <span className="text-[11px] text-slate-400 dark:text-[#9FA2AC] italic">No expenses logged yet this month</span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Today's Habits Checklist */}
        <div className="glass-panel p-5">
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Today's Habits</span>
                <span className="text-xs text-[#16A34A] dark:text-[#22C58B]">({completedHabitsCount}/{habits.length})</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-[#9FA2AC]">One-tap to check off</p>
            </div>
            <button
              onClick={onViewAllHabits}
              className="text-xs text-[#16A34A] dark:text-[#22C58B] hover:underline flex items-center gap-1 font-bold"
            >
              <span>Streaks</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto">
            {habits.length > 0 ? (
              habits.map((h) => {
                const isCompleted = completedHabitIds.has(h.id);
                return (
                  <button
                    key={h.id}
                    onClick={() => handleToggleHabit(h.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition active:scale-98 ${
                      isCompleted
                        ? 'bg-[#22C58B]/15 border-[#22C58B]/40 text-slate-900 dark:text-white shadow-xs'
                        : 'glass-panel-subtle text-slate-600 dark:text-[#9FA2AC] hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-[#16A34A] dark:text-[#22C58B] flex-shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-400 dark:text-[#9FA2AC] flex-shrink-0" />
                      )}
                      <span className={`text-xs font-semibold truncate ${isCompleted ? 'line-through opacity-75' : ''}`}>
                        {h.title}
                      </span>
                    </div>
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0 ml-2 shadow-xs"
                      style={{ backgroundColor: h.color || '#22C58B' }}
                    />
                  </button>
                );
              })
            ) : (
              <div className="py-6 text-center text-xs text-slate-500 dark:text-[#9FA2AC]">
                No active habits configured.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Recent Activity List */}
      <div className="glass-panel p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Expenses</h3>
            <p className="text-xs text-slate-500 dark:text-[#9FA2AC]">Latest transport rides and daily spending records</p>
          </div>
          <button
            onClick={onViewAllExpenses}
            className="text-xs text-[#FF7628] hover:underline flex items-center gap-1 font-bold"
          >
            <span>All History</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {expenses.length > 0 ? (
          <div className="space-y-2.5">
            {expenses.slice(0, 6).map((expense) => {
              const meta = TRANSPORT_ICONS[expense.category] || TRANSPORT_ICONS.Other;
              const Icon = meta.icon;
              return (
                <div
                  key={expense.id}
                  className="glass-panel-subtle flex items-center justify-between p-3 transition group hover:border-[#FF7628]/30"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-xs"
                      style={{ backgroundColor: `${meta.color}20` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: meta.color }} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {expense.category}
                        </span>
                        {expense.fromLocation && expense.toLocation && (
                          <span className="text-[11px] text-slate-500 dark:text-[#9FA2AC] truncate flex items-center gap-1">
                            <span>{expense.fromLocation}</span>
                            <ArrowRight className="w-2.5 h-2.5 text-[#FF7628]" />
                            <span>{expense.toLocation}</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-[#9FA2AC] mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>{expense.date} · {expense.time || 'Commute'}</span>
                        {expense.note && (
                          <span className="truncate max-w-[140px] text-slate-600 dark:text-white/60">
                            · {expense.note}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    <div className="text-right">
                      <div className="text-sm font-black text-[#FF7628]">
                        {currencySymbol}{expense.amount}
                      </div>
                      <span className={`text-[10px] font-semibold ${
                        expense.syncStatus === 'synced' ? 'text-[#16A34A] dark:text-[#22C58B]' : 'text-slate-400 dark:text-[#9FA2AC]'
                      }`}>
                        {expense.syncStatus === 'synced' ? 'Synced' : 'Saved locally'}
                      </span>
                    </div>

                    {/* Quick repeat button */}
                    <button
                      onClick={() => onRepeatExpense(expense)}
                      title="Repeat this expense"
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-[#FF7628]/20 text-slate-400 dark:text-[#9FA2AC] hover:text-[#FF7628] transition active:scale-95"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-[#FF7628]/15 text-[#FF7628] flex items-center justify-center mb-3">
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">No expenses recorded yet</h4>
            <p className="text-xs text-slate-500 dark:text-[#9FA2AC] max-w-xs mt-1 mb-4">
              Tap below to record your first rickshaw, bus, CNG, or meal expense in seconds.
            </p>
            <button
              onClick={onAddExpense}
              className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-[#FF7628] to-[#FF8C42] text-white font-bold text-xs shadow-md shadow-[#FF7628]/25 hover:brightness-110 transition active:scale-95"
            >
              + Log First Expense
            </button>
          </div>
        )}
      </div>

    </div>
  );
};
