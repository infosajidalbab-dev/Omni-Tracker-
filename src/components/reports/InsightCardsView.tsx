import React from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  MapPin, 
  Calendar, 
  Compass, 
  ShieldAlert,
  Wallet,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Info
} from 'lucide-react';
import type { Expense, Habit, HabitCompletion } from '../../types';
import { 
  calculateCategoryBreakdown,
  calculateFrequentRoutes,
  calculateWeekComparison,
  calculateMonthComparison,
  calculateMostExpensiveDay,
  analyzeMissingDaysInMonth,
  generateRuleBasedInsights,
  type RuleBasedInsight
} from '../../utils/analyticsUtils';
import { getLocalDateString, getLocalMonthString } from '../../utils/dateUtils';

interface InsightCardsViewProps {
  expenses: Expense[];
  habits: Habit[];
  completions: HabitCompletion[];
  monthlyBudget: number;
  currencySymbol: string;
  theme: 'dark' | 'light';
}

export const InsightCardsView: React.FC<InsightCardsViewProps> = ({
  expenses,
  habits,
  completions,
  monthlyBudget,
  currencySymbol,
  theme,
}) => {
  const todayStr = getLocalDateString();
  const currentMonthStr = getLocalMonthString();

  // Pure calculations from actual stored data
  const insights: RuleBasedInsight[] = generateRuleBasedInsights(
    expenses,
    habits,
    completions,
    monthlyBudget,
    currencySymbol,
    todayStr
  );

  const categories = calculateCategoryBreakdown(expenses);
  const topCategory = categories[0] || null;

  const weekComparison = calculateWeekComparison(expenses, todayStr);
  const monthComparison = calculateMonthComparison(expenses, currentMonthStr);
  const mostExpensiveDay = calculateMostExpensiveDay(expenses);
  const frequentRoutes = calculateFrequentRoutes(expenses);
  const missingDays = analyzeMissingDaysInMonth(expenses, currentMonthStr, todayStr);

  // Month-to-date daily average
  const now = new Date();
  const currentDayNum = now.getDate();
  const thisMonthExpenses = expenses.filter(e => e.date.startsWith(currentMonthStr));
  const thisMonthSpent = thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const mtdDailyAverage = currentDayNum > 0 ? Math.round(thisMonthSpent / currentDayNum) : 0;

  return (
    <div className="space-y-6">
      {/* Smart Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Highest Transport Category */}
        <div className="glass-panel p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-[#9FA2AC] uppercase tracking-wider">
              Top Category
            </span>
            <span className="p-1.5 rounded-xl bg-[#FF7628]/15 text-[#FF7628]">
              <Compass className="w-4 h-4" />
            </span>
          </div>

          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white truncate">
              {topCategory ? topCategory.category : 'None yet'}
            </div>
            <div className="text-xs text-[#FF7628] font-bold mt-1">
              {topCategory 
                ? `${currencySymbol}${topCategory.total.toLocaleString()} (${topCategory.percentage}% of total)` 
                : 'No recorded expenses'}
            </div>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-[#9FA2AC]/70 mt-2">
            Highest cumulative expenditure
          </p>
        </div>

        {/* Average Daily Spend */}
        <div className="glass-panel p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-[#9FA2AC] uppercase tracking-wider">
              Daily Run-Rate
            </span>
            <span className="p-1.5 rounded-xl bg-[#22C58B]/15 text-[#22C58B]">
              <Wallet className="w-4 h-4" />
            </span>
          </div>

          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {currencySymbol}{mtdDailyAverage.toLocaleString()} <span className="text-xs font-semibold text-slate-400">/ day</span>
            </div>
            <div className="text-xs text-slate-500 dark:text-[#9FA2AC] font-medium mt-1">
              {currentDayNum} days elapsed this month
            </div>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-[#9FA2AC]/70 mt-2">
            Month-to-date average spending
          </p>
        </div>

        {/* Week vs Week */}
        <div className="glass-panel p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-[#9FA2AC] uppercase tracking-wider">
              Week vs Last Week
            </span>
            <span className={`p-1.5 rounded-xl ${
              weekComparison.diff > 0 
                ? 'bg-amber-500/15 text-amber-500' 
                : 'bg-[#22C58B]/15 text-[#22C58B]'
            }`}>
              {weekComparison.diff > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            </span>
          </div>

          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {weekComparison.diff >= 0 ? `+${currencySymbol}${weekComparison.diff.toLocaleString()}` : `-${currencySymbol}${Math.abs(weekComparison.diff).toLocaleString()}`}
            </div>
            <div className={`text-xs font-bold mt-1 ${
              weekComparison.diff > 0 ? 'text-amber-500' : 'text-[#16A34A] dark:text-[#22C58B]'
            }`}>
              {weekComparison.lastWeekTotal > 0 
                ? `${weekComparison.percentChange > 0 ? '+' : ''}${weekComparison.percentChange}% vs prior 7 days` 
                : `${currencySymbol}${weekComparison.thisWeekTotal.toLocaleString()} in past 7 days`}
            </div>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-[#9FA2AC]/70 mt-2">
            7-day rolling expenditure delta
          </p>
        </div>

        {/* Most Expensive Recorded Day */}
        <div className="glass-panel p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-[#9FA2AC] uppercase tracking-wider">
              Peak Expense Day
            </span>
            <span className="p-1.5 rounded-xl bg-purple-500/15 text-purple-400">
              <Calendar className="w-4 h-4" />
            </span>
          </div>

          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-[#FF7628]">
              {mostExpensiveDay ? `${currencySymbol}${mostExpensiveDay.total.toLocaleString()}` : 'None'}
            </div>
            <div className="text-xs text-slate-700 dark:text-white/80 font-bold mt-1 truncate">
              {mostExpensiveDay ? `${mostExpensiveDay.date} (${mostExpensiveDay.count} logs)` : 'No records yet'}
            </div>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-[#9FA2AC]/70 mt-2">
            Highest single-day expenditure
          </p>
        </div>
      </div>

      {/* Days Activity Audit Card (Distinguishes Missing vs Zero Spending) */}
      <div className="glass-panel p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/70 dark:border-white/10">
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#FF7628]" />
              <span>Current Month Logging Integrity Audit</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#9FA2AC] mt-0.5">
              Distinguishing days with confirmed zero spending from unlogged missing days
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-white">
            <span className="px-2.5 py-1 rounded-xl bg-[#FF7628]/15 text-[#FF7628]">
              {missingDays.daysInMonthSoFar} Days Checked
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <div className="p-4 rounded-xl bg-[#22C58B]/10 border border-[#22C58B]/20 text-center">
            <span className="text-[11px] uppercase font-bold text-[#16A34A] dark:text-[#22C58B]">
              Active Spending Days
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {missingDays.activeSpendingDays} <span className="text-xs font-semibold text-slate-400">days</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-[#9FA2AC] mt-1">Expenses &gt; {currencySymbol}0 logged</p>
          </div>

          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
            <span className="text-[11px] uppercase font-bold text-emerald-600 dark:text-emerald-400">
              Confirmed Zero Spend
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {missingDays.confirmedZeroDays} <span className="text-xs font-semibold text-slate-400">days</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-[#9FA2AC] mt-1">Explicitly recorded as {currencySymbol}0</p>
          </div>

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
            <span className="text-[11px] uppercase font-bold text-amber-600 dark:text-amber-400">
              Unlogged / Missing Days
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {missingDays.unrecordedDays} <span className="text-xs font-semibold text-slate-400">days</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-[#9FA2AC] mt-1">No expense records entered</p>
          </div>
        </div>
      </div>

      {/* Rule-Based Local Insight Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#FF7628]" />
            <span>Rule-Based Spending Intelligence</span>
          </h3>
          <span className="text-xs text-slate-400 font-semibold">100% Private &amp; Local</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((item) => {
            let borderClass = 'border-slate-200/70 dark:border-white/10';
            let iconEl = <Info className="w-4 h-4 text-[#38BDF8]" />;
            let pillClass = 'bg-[#38BDF8]/15 text-[#38BDF8]';

            if (item.severity === 'positive') {
              borderClass = 'border-[#22C58B]/40 bg-[#22C58B]/[0.03]';
              iconEl = <CheckCircle2 className="w-4 h-4 text-[#22C58B]" />;
              pillClass = 'bg-[#22C58B]/15 text-[#16A34A] dark:text-[#22C58B]';
            } else if (item.severity === 'warning') {
              borderClass = 'border-amber-500/40 bg-amber-500/[0.03]';
              iconEl = <AlertTriangle className="w-4 h-4 text-amber-500" />;
              pillClass = 'bg-amber-500/15 text-amber-600 dark:text-amber-400';
            } else if (item.severity === 'urgent') {
              borderClass = 'border-rose-500/40 bg-rose-500/[0.05]';
              iconEl = <ShieldAlert className="w-4 h-4 text-rose-500" />;
              pillClass = 'bg-rose-500/15 text-rose-600 dark:text-rose-400';
            }

            return (
              <div
                key={item.id}
                className={`glass-panel p-5 border ${borderClass} transition-all hover:scale-[1.01]`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/10">
                      {iconEl}
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      {item.title}
                    </h4>
                  </div>

                  {item.stat && (
                    <div className={`px-2.5 py-1 rounded-xl text-xs font-black shrink-0 ${pillClass}`}>
                      {item.stat}
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-600 dark:text-[#9FA2AC] mt-3 leading-relaxed">
                  {item.description}
                </p>

                {item.metricLabel && (
                  <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-[#9FA2AC]/70 mt-2">
                    {item.metricLabel}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Frequent Commute Routes & Cost Table */}
      <div className="glass-panel p-5 shadow-lg">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#FF7628]" />
          <span>Frequent Routes &amp; Cumulative Commute Costs</span>
        </h3>

        {frequentRoutes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200/70 dark:border-white/10 text-slate-500 dark:text-[#9FA2AC] uppercase text-[10px]">
                  <th className="pb-2.5">Route</th>
                  <th className="pb-2.5">Category</th>
                  <th className="pb-2.5 text-center">Frequency</th>
                  <th className="pb-2.5 text-right">Avg Cost</th>
                  <th className="pb-2.5 text-right">Total Spent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/50 dark:divide-white/5">
                {frequentRoutes.map((r) => (
                  <tr key={r.routeKey} className="hover:bg-slate-100/50 dark:hover:bg-white/5 transition">
                    <td className="py-2.5 font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span className="text-[#FF7628] font-black">•</span>
                      <span>{r.fromLocation} → {r.toLocation}</span>
                    </td>
                    <td className="py-2.5 text-slate-500 dark:text-[#9FA2AC]">{r.category}</td>
                    <td className="py-2.5 text-center font-bold text-slate-800 dark:text-white">{r.count} trips</td>
                    <td className="py-2.5 text-right text-slate-600 dark:text-white/80 font-semibold">
                      {currencySymbol}{r.avgCost}
                    </td>
                    <td className="py-2.5 text-right font-black text-[#FF7628]">
                      {currencySymbol}{r.totalCost.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-400 dark:text-[#9FA2AC] italic">
            No route origin/destination logs recorded yet. Add "From" and "To" locations when logging rides.
          </div>
        )}
      </div>
    </div>
  );
};
