import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  FileDown, 
  Calendar, 
  Filter, 
  Download, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown, 
  PieChart, 
  Layers, 
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Compass,
  FileSpreadsheet,
  Check,
  Info
} from 'lucide-react';
import { db, getMonthlyBudget } from '../../database/db';
import { 
  getLocalDateString, 
  getLocalMonthString, 
  getPreviousMonthString,
  isDateInPastDays 
} from '../../utils/dateUtils';
import { exportExpensesToCSV, exportHabitsToCSV } from '../../utils/csvUtils';
import { 
  calculateCategoryBreakdown,
  calculateWeekComparison,
  calculateMonthComparison,
  calculateMostExpensiveDay,
  calculateFrequentRoutes
} from '../../utils/analyticsUtils';
import { CalendarHeatmap } from './CalendarHeatmap';
import { InsightCardsView } from './InsightCardsView';
import type { Expense, Habit, HabitCompletion } from '../../types';

interface ReportsViewProps {
  currencySymbol: string;
  theme: 'dark' | 'light';
  onAddExpense?: (expense?: Partial<Expense>) => void;
}

type ReportsTab = 'insights' | 'calendar' | 'trends' | 'export';

export const ReportsView: React.FC<ReportsViewProps> = ({ currencySymbol, theme, onAddExpense }) => {
  const [activeTab, setActiveTab] = useState<ReportsTab>('insights');
  const [period, setPeriod] = useState<'today' | 'week' | 'last_week' | 'month' | 'last_month' | 'all' | 'custom'>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<HabitCompletion[]>([]);
  const [monthlyBudget, setMonthlyBudgetVal] = useState<number>(25000);
  const [toastMessage, setToastMessage] = useState('');

  const todayStr = getLocalDateString();
  const curMonthStr = getLocalMonthString();

  useEffect(() => {
    Promise.all([
      db.expenses.toArray(),
      db.habits.toArray(),
      db.habitCompletions.toArray(),
      getMonthlyBudget(curMonthStr),
    ]).then(([exp, hab, comp, budgetRec]) => {
      setExpenses(exp);
      setHabits(hab);
      setCompletions(comp);
      if (budgetRec) {
        setMonthlyBudgetVal(budgetRec.budgetAmount);
      }
    });
  }, [curMonthStr]);

  // Filter expenses by selected period
  const getFilteredExpenses = (): Expense[] => {
    return expenses.filter(e => {
      if (period === 'today') return e.date === todayStr;
      if (period === 'week') {
        return isDateInPastDays(e.date, 7, todayStr);
      }
      if (period === 'last_week') {
        return isDateInPastDays(e.date, 14, todayStr) && !isDateInPastDays(e.date, 7, todayStr);
      }
      if (period === 'month') {
        return e.date.startsWith(curMonthStr);
      }
      if (period === 'last_month') {
        const lastMonthPrefix = getPreviousMonthString(curMonthStr);
        return e.date.startsWith(lastMonthPrefix);
      }
      if (period === 'custom') {
        if (!customStart || !customEnd) return true;
        return e.date >= customStart && e.date <= customEnd;
      }
      return true; // all
    });
  };

  const filteredExpenses = getFilteredExpenses();
  const totalExpenseAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Category summary for period
  const categorySummary = calculateCategoryBreakdown(filteredExpenses);

  // Time comparisons for period
  const weekComp = calculateWeekComparison(expenses, todayStr);
  const monthComp = calculateMonthComparison(expenses, curMonthStr);

  // Habit completion count for period
  const relevantCompletions = completions.filter(c => {
    if (period === 'today') return c.date === todayStr;
    if (period === 'week') return isDateInPastDays(c.date, 7, todayStr);
    if (period === 'last_week') return isDateInPastDays(c.date, 14, todayStr) && !isDateInPastDays(c.date, 7, todayStr);
    if (period === 'month') return c.date.startsWith(curMonthStr);
    if (period === 'last_month') return c.date.startsWith(getPreviousMonthString(curMonthStr));
    if (period === 'custom') {
      if (!customStart || !customEnd) return true;
      return c.date >= customStart && c.date <= customEnd;
    }
    return true;
  });

  // Daily spend in the last 7 days for mini trend bars
  const last7DaysTrend: Array<{ date: string; label: string; amount: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dStr = getLocalDateString(d);
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dayTotal = expenses.filter(e => e.date === dStr).reduce((s, e) => s + e.amount, 0);
    last7DaysTrend.push({ date: dStr, label: dayLabel, amount: dayTotal });
  }
  const maxTrendDay = Math.max(...last7DaysTrend.map(t => t.amount), 1);

  // Export Expenses CSV
  const exportExpensesCSV = () => {
    if (filteredExpenses.length === 0) {
      setToastMessage('No expenses available in the selected period to export');
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }

    exportExpensesToCSV(
      filteredExpenses,
      currencySymbol,
      `omni_expenses_${period}_${todayStr}.csv`
    );
    setToastMessage('Expenses CSV exported successfully (UTF-8 BOM with Unicode & Bengali support)!');
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Export Habits CSV
  const exportHabitsCSV = () => {
    if (relevantCompletions.length === 0) {
      setToastMessage('No habit completion records available in this period to export');
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }

    exportHabitsToCSV(
      habits,
      relevantCompletions,
      `omni_habits_${period}_${todayStr}.csv`
    );
    setToastMessage('Habits CSV exported successfully (UTF-8 BOM with Unicode support)!');
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleQuickAddForDate = (dateStr: string) => {
    if (onAddExpense) {
      onAddExpense({ date: dateStr });
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white">
            Smart Analytics &amp; Intelligence
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#9FA2AC]">
            Interactive calendar heatmap, rule-based spending intelligence, and verifiable reports
          </p>
        </div>

        {/* Global CSV Quick Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={exportExpensesCSV}
            className="flex items-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-[#FF7628] to-[#FF9457] text-white font-bold text-xs shadow-md shadow-[#FF7628]/25 hover:brightness-110 transition active:scale-95 cursor-pointer"
            title="Download CSV spreadsheet of expenses"
          >
            <Download className="w-3.5 h-3.5 stroke-[3]" />
            <span className="hidden sm:inline">Export Expenses</span>
            <span className="sm:hidden">CSV</span>
          </button>

          <button
            onClick={exportHabitsCSV}
            className="flex items-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-[#22C58B] to-[#34D399] text-white font-bold text-xs shadow-md shadow-[#22C58B]/25 hover:brightness-110 transition active:scale-95 cursor-pointer"
            title="Download CSV spreadsheet of habits"
          >
            <Download className="w-3.5 h-3.5 stroke-[3]" />
            <span className="hidden sm:inline">Export Habits</span>
            <span className="sm:hidden">Habits</span>
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-[#22C58B]/15 border border-[#22C58B]/30 text-[#16A34A] dark:text-[#22C58B] text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Module Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/70 dark:border-white/10 pb-2 overflow-x-auto">
        {[
          { id: 'insights', label: 'Smart Insights', icon: Sparkles },
          { id: 'calendar', label: 'Calendar Heatmap', icon: Calendar },
          { id: 'trends', label: 'Breakdown & Trends', icon: BarChart3 },
          { id: 'export', label: 'Data Export (CSV)', icon: FileSpreadsheet },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ReportsTab)}
              className={`flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer active:scale-95 ${
                isActive
                  ? 'bg-gradient-to-r from-[#FF7628] to-[#FF9457] text-white shadow-md shadow-[#FF7628]/25'
                  : 'glass-panel-subtle text-slate-600 dark:text-[#9FA2AC] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: SMART INSIGHTS */}
      {activeTab === 'insights' && (
        <InsightCardsView
          expenses={expenses}
          habits={habits}
          completions={completions}
          monthlyBudget={monthlyBudget}
          currencySymbol={currencySymbol}
          theme={theme}
        />
      )}

      {/* TAB 2: CALENDAR HEATMAP */}
      {activeTab === 'calendar' && (
        <CalendarHeatmap
          expenses={expenses}
          habits={habits}
          completions={completions}
          currencySymbol={currencySymbol}
          theme={theme}
          onQuickAddForDate={handleQuickAddForDate}
        />
      )}

      {/* TAB 3: BREAKDOWN & TRENDS */}
      {activeTab === 'trends' && (
        <div className="space-y-6">
          {/* Period Selector Tabs */}
          <div className="glass-panel p-3.5 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-[#9FA2AC] mr-1">Timeframe:</span>
            {[
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'This Week' },
              { id: 'last_week', label: 'Last Week' },
              { id: 'month', label: 'This Month' },
              { id: 'last_month', label: 'Last Month' },
              { id: 'all', label: 'All History' },
              { id: 'custom', label: 'Custom Range' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setPeriod(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer ${
                  period === tab.id
                    ? 'bg-gradient-to-r from-[#FF7628] to-[#FF9457] text-white shadow-md shadow-[#FF7628]/25'
                    : 'glass-panel-subtle text-slate-600 dark:text-[#9FA2AC] hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}

            {period === 'custom' && (
              <div className="flex items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0 sm:ml-auto">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="glass-input px-2.5 py-1 rounded-xl text-xs text-slate-900 dark:text-white"
                />
                <span className="text-xs text-slate-500 dark:text-[#9FA2AC]">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="glass-input px-2.5 py-1 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>
            )}
          </div>

          {/* Primary Period Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-panel p-5">
              <span className="text-xs font-semibold text-slate-500 dark:text-[#9FA2AC] uppercase">
                Total Spent in Period
              </span>
              <div className="text-2xl sm:text-3xl font-black text-[#FF7628] drop-shadow-[0_2px_10px_rgba(255,118,40,0.2)] mt-2">
                {currencySymbol}{totalExpenseAmount.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-[#9FA2AC] mt-1">Across {filteredExpenses.length} entries</p>
            </div>

            <div className="glass-panel p-5">
              <span className="text-xs font-semibold text-slate-500 dark:text-[#9FA2AC] uppercase">
                Average Spend / Log
              </span>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2">
                {currencySymbol}{filteredExpenses.length > 0 ? Math.round(totalExpenseAmount / filteredExpenses.length) : 0}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-[#9FA2AC] mt-1">Typical commute / expense amount</p>
            </div>

            <div className="glass-panel p-5">
              <span className="text-xs font-semibold text-slate-500 dark:text-[#9FA2AC] uppercase">
                Habit Check-ins
              </span>
              <div className="text-2xl sm:text-3xl font-black text-[#16A34A] dark:text-[#22C58B] mt-2">
                {relevantCompletions.length}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-[#9FA2AC] mt-1">Completed in timeframe</p>
            </div>
          </div>

          {/* Comparison Cards: Week vs Week and Month vs Month */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Week-over-Week Visual Card */}
            <div className="glass-panel p-5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/50 dark:border-white/5">
                <span className="text-xs font-bold text-slate-700 dark:text-white uppercase tracking-wider">
                  Past 7 Days vs Prior 7 Days
                </span>
                <span className={`flex items-center gap-1 text-xs font-bold ${
                  weekComp.diff > 0 ? 'text-amber-500' : 'text-[#16A34A] dark:text-[#22C58B]'
                }`}>
                  {weekComp.diff > 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  <span>{weekComp.lastWeekTotal > 0 ? `${weekComp.percentChange > 0 ? '+' : ''}${weekComp.percentChange}%` : 'Baseline'}</span>
                </span>
              </div>

              <div className="space-y-3 mt-4">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-500 dark:text-[#9FA2AC]">Past 7 Days:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{currencySymbol}{weekComp.thisWeekTotal.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-white/10 rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-2 rounded-full bg-gradient-to-r from-[#FF7628] to-[#FF9457]"
                      style={{ 
                        width: `${Math.min(100, Math.round((weekComp.thisWeekTotal / Math.max(weekComp.thisWeekTotal, weekComp.lastWeekTotal, 1)) * 100))}%` 
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-500 dark:text-[#9FA2AC]">Prior 7 Days:</span>
                    <span className="font-bold text-slate-500 dark:text-[#9FA2AC]">{currencySymbol}{weekComp.lastWeekTotal.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-white/10 rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-2 rounded-full bg-slate-400 dark:bg-white/30"
                      style={{ 
                        width: `${Math.min(100, Math.round((weekComp.lastWeekTotal / Math.max(weekComp.thisWeekTotal, weekComp.lastWeekTotal, 1)) * 100))}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Month-over-Month Visual Card */}
            <div className="glass-panel p-5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/50 dark:border-white/5">
                <span className="text-xs font-bold text-slate-700 dark:text-white uppercase tracking-wider">
                  Current Month vs Last Month
                </span>
                <span className={`flex items-center gap-1 text-xs font-bold ${
                  monthComp.diff > 0 ? 'text-amber-500' : 'text-[#16A34A] dark:text-[#22C58B]'
                }`}>
                  {monthComp.diff > 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  <span>{monthComp.lastMonthTotal > 0 ? `${monthComp.percentChange > 0 ? '+' : ''}${monthComp.percentChange}%` : 'Baseline'}</span>
                </span>
              </div>

              <div className="space-y-3 mt-4">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-500 dark:text-[#9FA2AC]">Current Month:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{currencySymbol}{monthComp.thisMonthTotal.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-white/10 rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-2 rounded-full bg-gradient-to-r from-[#FF7628] to-[#FF9457]"
                      style={{ 
                        width: `${Math.min(100, Math.round((monthComp.thisMonthTotal / Math.max(monthComp.thisMonthTotal, monthComp.lastMonthTotal, 1)) * 100))}%` 
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-500 dark:text-[#9FA2AC]">Last Month:</span>
                    <span className="font-bold text-slate-500 dark:text-[#9FA2AC]">{currencySymbol}{monthComp.lastMonthTotal.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-white/10 rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-2 rounded-full bg-slate-400 dark:bg-white/30"
                      style={{ 
                        width: `${Math.min(100, Math.round((monthComp.lastMonthTotal / Math.max(monthComp.thisMonthTotal, monthComp.lastMonthTotal, 1)) * 100))}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 7-Day Spending Volume Bar Chart */}
          <div className="glass-panel p-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#FF7628]" />
              <span>Daily Spending Trajectory (Last 7 Days)</span>
            </h3>

            <div className="grid grid-cols-7 gap-2 items-end h-32 pt-4">
              {last7DaysTrend.map((t) => {
                const heightPercent = Math.max(8, Math.round((t.amount / maxTrendDay) * 100));
                const isToday = t.date === todayStr;
                return (
                  <div key={t.date} className="flex flex-col items-center justify-end h-full group">
                    <span className="text-[10px] font-black text-[#FF7628] mb-1 opacity-0 group-hover:opacity-100 transition truncate">
                      {currencySymbol}{t.amount}
                    </span>
                    <div className="w-full max-w-[32px] bg-slate-200 dark:bg-white/10 rounded-t-lg overflow-hidden flex items-end h-20">
                      <div
                        className={`w-full rounded-t-lg transition-all duration-500 ${
                          isToday 
                            ? 'bg-[#FF7628]' 
                            : t.amount > 0 
                              ? 'bg-[#FF7628]/60 group-hover:bg-[#FF7628]' 
                              : 'bg-transparent'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                    <span className={`text-[10px] font-bold mt-1.5 ${
                      isToday ? 'text-[#FF7628]' : 'text-slate-400 dark:text-[#9FA2AC]'
                    }`}>
                      {t.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Category Breakdown Table */}
          <div className="glass-panel p-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
              Spending Breakdown by Transport &amp; Category
            </h3>

            {categorySummary.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/70 dark:border-white/10 text-slate-500 dark:text-[#9FA2AC] uppercase text-[10px]">
                      <th className="pb-2">Category</th>
                      <th className="pb-2">Rides / Logs</th>
                      <th className="pb-2 text-right">Total Amount</th>
                      <th className="pb-2 text-right">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/50 dark:divide-white/5">
                    {categorySummary.map((c) => (
                      <tr key={c.category} className="hover:bg-slate-100/50 dark:hover:bg-white/5 transition">
                        <td className="py-2.5 font-bold text-slate-900 dark:text-white">{c.category}</td>
                        <td className="py-2.5 text-slate-500 dark:text-[#9FA2AC]">{c.count} trips</td>
                        <td className="py-2.5 text-right font-black text-[#FF7628]">
                          {currencySymbol}{c.total.toLocaleString()}
                        </td>
                        <td className="py-2.5 text-right font-semibold text-slate-700 dark:text-white/80">{c.percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-500 dark:text-[#9FA2AC]">
                No expenses found for this selected period.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: DATA EXPORT */}
      {activeTab === 'export' && (
        <div className="space-y-6">
          <div className="glass-panel p-6 shadow-xl">
            <h3 className="text-base font-black text-slate-900 dark:text-white mb-2">
              RFC 4180 Certified CSV Data Export
            </h3>
            <p className="text-xs text-slate-600 dark:text-[#9FA2AC] leading-relaxed mb-6">
              Export pristine CSV spreadsheets with standard quote escaping, multi-line notes preservation, and UTF-8 Byte Order Mark (BOM). Fully compatible with Microsoft Excel, Google Sheets, Apple Numbers, and LibreOffice with native Bengali and currency symbol rendering.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl border border-[#FF7628]/30 glass-panel-subtle flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Expenses Export
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#FF7628]/15 text-[#FF7628] text-[10px] font-bold">
                      {expenses.length} Records
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-[#9FA2AC] mt-2">
                    Exports ID, Date, Time, Category, Amount, Currency, Origin, Destination, Notes, and Sync Status.
                  </p>
                </div>

                <button
                  onClick={exportExpensesCSV}
                  className="mt-5 w-full py-2.5 rounded-xl bg-gradient-to-r from-[#FF7628] to-[#FF9457] text-white font-bold text-xs shadow-md shadow-[#FF7628]/25 hover:brightness-110 transition active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Expenses CSV</span>
                </button>
              </div>

              <div className="p-5 rounded-2xl border border-[#22C58B]/30 glass-panel-subtle flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Habits &amp; Check-ins Export
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#22C58B]/15 text-[#22C58B] text-[10px] font-bold">
                      {completions.length} Completions
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-[#9FA2AC] mt-2">
                    Exports Habit Name, Category, Target Days, Active Status, Date, Timestamp, and Notes.
                  </p>
                </div>

                <button
                  onClick={exportHabitsCSV}
                  className="mt-5 w-full py-2.5 rounded-xl bg-gradient-to-r from-[#22C58B] to-[#34D399] text-white font-bold text-xs shadow-md shadow-[#22C58B]/25 hover:brightness-110 transition active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Habits CSV</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
