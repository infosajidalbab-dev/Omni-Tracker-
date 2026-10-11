import React, { useState, useEffect } from 'react';
import { 
  PieChart, 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar, 
  Edit3, 
  Check, 
  X,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Sparkles,
  ShieldAlert,
  Sliders,
  History,
  HelpCircle,
  ChevronDown,
  Info
} from 'lucide-react';
import { db, setMonthlyBudget, getMonthlyBudget } from '../../database/db';
import { getLocalDateString, getLocalMonthString, getPreviousMonthString } from '../../utils/dateUtils';
import { calculateMonthForecast, calculateBudgetGuardian, type MonthForecastResult } from '../../utils/analyticsUtils';
import type { Expense, MonthlyBudget } from '../../types';

interface BudgetViewProps {
  currencySymbol: string;
  theme: 'dark' | 'light';
}

export const BudgetView: React.FC<BudgetViewProps> = ({ currencySymbol, theme }) => {
  const now = new Date();
  const currentActualMonthStr = getLocalMonthString(now); // Current real month YYYY-MM
  
  const [selectedMonthStr, setSelectedMonthStr] = useState<string>(currentActualMonthStr);
  const [currentBudgetAmount, setCurrentBudgetAmount] = useState<number>(25000);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [allBudgets, setAllBudgets] = useState<MonthlyBudget[]>([]);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [newBudgetValue, setNewBudgetValue] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  // Configurable Warning Thresholds (Default 75%, 90%, 100%)
  const [showThresholdConfig, setShowThresholdConfig] = useState(false);
  const [warningThreshold, setWarningThreshold] = useState<number>(75);
  const [criticalThreshold, setCriticalThreshold] = useState<number>(90);

  // Load available budget history and all expenses
  const loadData = async () => {
    const budgetsList = await db.budgets.toArray();
    setAllBudgets(budgetsList);

    const targetBudget = await getMonthlyBudget(selectedMonthStr);
    if (targetBudget) {
      setCurrentBudgetAmount(targetBudget.budgetAmount);
      setNewBudgetValue(targetBudget.budgetAmount.toString());
    } else {
      // Default initial budget fallback
      setCurrentBudgetAmount(25000);
      setNewBudgetValue('25000');
    }

    const allExpenses = await db.expenses.toArray();
    setExpenses(allExpenses);
  };

  useEffect(() => {
    loadData();
  }, [selectedMonthStr]);

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(newBudgetValue.trim());
    if (isNaN(val) || val <= 0) return;

    await setMonthlyBudget(selectedMonthStr, val, currencySymbol);
    setCurrentBudgetAmount(val);
    setIsEditingBudget(false);
    setStatusMessage(`Budget for ${selectedMonthStr} saved successfully`);
    setTimeout(() => setStatusMessage(''), 3000);
    await loadData();
  };

  // Month date calculations
  const [selYearStr, selMonthNumStr] = selectedMonthStr.split('-');
  const selYear = parseInt(selYearStr, 10);
  const selMonth = parseInt(selMonthNumStr, 10);
  const daysInSelectedMonth = new Date(selYear, selMonth, 0).getDate();
  const isSelectedCurrentMonth = selectedMonthStr === currentActualMonthStr;
  
  const currentDay = isSelectedCurrentMonth ? now.getDate() : daysInSelectedMonth;
  const daysRemaining = isSelectedCurrentMonth ? Math.max(daysInSelectedMonth - currentDay, 0) : 0;

  // Previous month string
  const prevMonthStr = getPreviousMonthString(selectedMonthStr);

  // Calculations from actual data
  const thisMonthExpenses = expenses.filter(e => e.date?.startsWith(selectedMonthStr));
  const spentThisMonth = thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

  const prevMonthExpenses = expenses.filter(e => e.date?.startsWith(prevMonthStr));
  const spentPrevMonth = prevMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Budget Guardian calculation
  const guardian = calculateBudgetGuardian(
    currentBudgetAmount,
    spentThisMonth,
    daysRemaining,
    { warning: warningThreshold, critical: criticalThreshold, limit: 100 }
  );

  const budgetRemaining = guardian.budgetRemaining;
  const percentUsed = guardian.percentUsed;

  // Daily statistics
  const currentDailyAvg = currentDay > 0 ? Math.round(spentThisMonth / currentDay) : 0;
  const recommendedDailyAllowance = guardian.recommendedDailyLimit;

  // Month-end Forecast calculation
  const forecast: MonthForecastResult = calculateMonthForecast(expenses, selectedMonthStr, now);

  // Month-over-month change
  const momDiff = spentThisMonth - spentPrevMonth;
  const momPercent = spentPrevMonth > 0 ? Math.round((momDiff / spentPrevMonth) * 100) : 0;

  // Categorical spending breakdown
  const categoryMap: Record<string, number> = {};
  thisMonthExpenses.forEach(e => {
    categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount;
  });
  const sortedCategories = Object.entries(categoryMap).sort(([, a], [, b]) => b - a);

  // Available months list for history explorer (unique set of months in expenses + budgets)
  const availableMonthsSet = new Set<string>();
  availableMonthsSet.add(currentActualMonthStr);
  availableMonthsSet.add(getPreviousMonthString(currentActualMonthStr));
  expenses.forEach(e => {
    if (e.date && e.date.length >= 7) availableMonthsSet.add(e.date.substring(0, 7));
  });
  allBudgets.forEach(b => {
    if (b.month) availableMonthsSet.add(b.month);
  });
  const availableMonths = Array.from(availableMonthsSet).sort().reverse();

  // Forecast delta vs budget
  const forecastDelta = forecast.canForecast ? forecast.projectedTotal - currentBudgetAmount : 0;

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header with History Month Selector & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white">
              Budget Guardian &amp; Pacing
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-[#FF7628]/15 text-[#FF7628] text-[10px] font-bold">
              Active Protection
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-[#9FA2AC]">
            Guards spending limits, alerts on pace overrun, and transparently projects month-end outcome
          </p>
        </div>

        {/* Controls: Month Selector & Configure Thresholds */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Month Selector for History */}
          <div className="relative">
            <select
              value={selectedMonthStr}
              onChange={(e) => setSelectedMonthStr(e.target.value)}
              className="glass-input pl-3 pr-8 py-2 rounded-xl text-xs font-bold text-slate-900 dark:text-white appearance-none cursor-pointer focus:outline-none"
            >
              {availableMonths.map((m) => {
                const [y, mon] = m.split('-');
                const label = new Date(parseInt(y, 10), parseInt(mon, 10) - 1, 1).toLocaleDateString('en-US', {
                  month: 'short',
                  year: 'numeric',
                });
                return (
                  <option key={m} value={m} className="bg-slate-900 text-white">
                    {label} {m === currentActualMonthStr ? '(Current)' : ''}
                  </option>
                );
              })}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            onClick={() => setShowThresholdConfig(!showThresholdConfig)}
            className="flex items-center gap-1.5 py-2 px-3 rounded-xl glass-panel-subtle hover:border-[#FF7628]/40 text-slate-700 dark:text-white font-semibold text-xs transition cursor-pointer active:scale-95"
            title="Configure warning thresholds"
          >
            <Sliders className="w-3.5 h-3.5 text-[#FF7628]" />
            <span className="hidden sm:inline">Alert Rules</span>
          </button>

          <button
            onClick={() => setIsEditingBudget(!isEditingBudget)}
            className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl glass-panel-subtle hover:border-[#FF7628]/40 text-slate-700 dark:text-white font-semibold text-xs transition cursor-pointer active:scale-95"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#FF7628]" />
            <span>{isEditingBudget ? 'Cancel' : 'Set Budget'}</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-[#22C58B]/15 border border-[#22C58B]/30 text-[#16A34A] dark:text-[#22C58B] text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Threshold Configuration Panel (Collapsible) */}
      {showThresholdConfig && (
        <div className="glass-panel p-4 border-[#FF7628]/40 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/50 dark:border-white/10 mb-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#FF7628]" />
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Configurable Warning Thresholds
              </h4>
            </div>
            <button
              onClick={() => setShowThresholdConfig(false)}
              className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-[#9FA2AC] mb-1">
                Caution Alert ({warningThreshold}%)
              </label>
              <input
                type="range"
                min="50"
                max="85"
                step="5"
                value={warningThreshold}
                onChange={(e) => setWarningThreshold(Number(e.target.value))}
                className="w-full accent-[#FF7628]"
              />
              <span className="text-[10px] text-amber-500 font-bold block mt-0.5">Triggers at {warningThreshold}% spend</span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-[#9FA2AC] mb-1">
                Critical Alert ({criticalThreshold}%)
              </label>
              <input
                type="range"
                min="80"
                max="98"
                step="2"
                value={criticalThreshold}
                onChange={(e) => setCriticalThreshold(Number(e.target.value))}
                className="w-full accent-[#FF7628]"
              />
              <span className="text-[10px] text-rose-500 font-bold block mt-0.5">Triggers at {criticalThreshold}% spend</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 text-[11px] text-slate-600 dark:text-[#9FA2AC]">
              <span className="font-bold text-slate-900 dark:text-white block mb-0.5">Limit Exceeded (100%)</span>
              Automatic hard limit alert activates the moment spending crosses 100%.
            </div>
          </div>
        </div>
      )}

      {/* Inline Edit Form */}
      {isEditingBudget && (
        <form onSubmit={handleSaveBudget} className="glass-panel p-4 border-[#FF7628]/50 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-500 dark:text-[#9FA2AC] uppercase mb-1">
                Monthly Budget for {selectedMonthStr} ({currencySymbol})
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-[#FF7628]">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={newBudgetValue}
                  onChange={(e) => setNewBudgetValue(e.target.value)}
                  className="glass-input w-full pl-9 pr-4 py-2.5 rounded-xl text-slate-900 dark:text-white font-bold text-base focus:outline-none"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-[#FF7628] to-[#FF9457] text-white font-bold text-xs shadow-md shadow-[#FF7628]/25 hover:brightness-110 transition active:scale-95 cursor-pointer"
              >
                Save Budget
              </button>
              <button
                type="button"
                onClick={() => setIsEditingBudget(false)}
                className="py-2.5 px-4 rounded-xl glass-panel-subtle text-slate-600 dark:text-white text-xs font-semibold hover:bg-slate-200 dark:hover:bg-white/10 transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Main Budget Progress Card */}
      <div className="glass-panel p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#9FA2AC]">
              <Calendar className="w-4 h-4 text-[#FF7628]" />
              <span>
                {new Date(selYear, selMonth - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Budget Plan
              </span>
            </div>
            
            <div className="flex items-baseline gap-3 mt-2">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
                {currencySymbol}{spentThisMonth.toLocaleString()}
              </span>
              <span className="text-sm font-semibold text-slate-500 dark:text-[#9FA2AC]">
                of {currencySymbol}{currentBudgetAmount.toLocaleString()} limit
              </span>
            </div>

            {/* Dynamic Status Callout Badge based on Thresholds */}
            <div className="mt-3 flex items-center gap-2">
              {guardian.statusLevel === 'over' ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-500 dark:text-rose-400 text-xs font-bold border border-rose-500/30">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Budget Exceeded by {currencySymbol}{guardian.overspentAmount.toLocaleString()}!</span>
                </div>
              ) : guardian.statusLevel === 'critical' ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 text-rose-500 dark:text-rose-400 text-xs font-bold border border-rose-500/30">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Critical: {percentUsed}% used (≥ {criticalThreshold}%)</span>
                </div>
              ) : guardian.statusLevel === 'warning' ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold border border-amber-500/30">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Approaching Limit: {percentUsed}% used (≥ {warningThreshold}%)</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#22C58B]/15 text-[#16A34A] dark:text-[#22C58B] text-xs font-bold border border-[#22C58B]/30">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Healthy Spending ({percentUsed}% used)</span>
                </div>
              )}
            </div>
          </div>

          {/* Large Remaining Allowance / Overspent Callout */}
          <div className="flex flex-col items-start md:items-end">
            <span className="text-xs font-semibold text-slate-500 dark:text-[#9FA2AC] uppercase">
              {guardian.isOverBudget ? 'Overspent Balance' : 'Remaining Allowance'}
            </span>
            <div className={`text-3xl sm:text-4xl font-black mt-1 ${
              guardian.isOverBudget ? 'text-rose-500 dark:text-rose-400' : 'text-[#16A34A] dark:text-[#22C58B]'
            }`}>
              {guardian.isOverBudget 
                ? `-${currencySymbol}${guardian.overspentAmount.toLocaleString()}` 
                : `${currencySymbol}${budgetRemaining.toLocaleString()}`}
            </div>
            <span className="text-[11px] text-slate-500 dark:text-[#9FA2AC] mt-0.5">
              {isSelectedCurrentMonth ? `${daysRemaining} days remaining in month` : `Closed month record`}
            </span>
          </div>
        </div>

        {/* Progress Bar with Overspend Handling */}
        <div className="w-full bg-slate-200 dark:bg-white/10 rounded-full h-3 mt-6 overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all duration-700 ${
              guardian.isOverBudget 
                ? 'bg-rose-500' 
                : percentUsed >= criticalThreshold
                  ? 'bg-rose-400'
                  : percentUsed >= warningThreshold 
                    ? 'bg-amber-400' 
                    : 'bg-gradient-to-r from-[#FF7628] to-[#22C58B]'
            }`}
            style={{ width: `${Math.min(percentUsed, 100)}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-xs text-slate-500 dark:text-[#9FA2AC] mt-2 font-medium">
          <span>0%</span>
          <span className="font-bold text-slate-900 dark:text-white">
            {percentUsed}% {guardian.isOverBudget ? 'utilized (Exceeded)' : 'utilized'}
          </span>
          <span>100%</span>
        </div>
      </div>

      {/* Transparent Month-End Spending Forecast Card */}
      <div className="glass-panel p-6 shadow-xl border-[#FF7628]/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/70 dark:border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#FF7628]" />
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                Month-End Spending Forecast
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 text-[10px] font-black uppercase tracking-wider">
                Estimate
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-[#9FA2AC] mt-0.5">
              Transparent projection calculated exclusively from actual month-to-date records
            </p>
          </div>

          {forecast.canForecast && (
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider ${
                forecast.confidence === 'high' 
                  ? 'bg-[#22C58B]/15 text-[#22C58B]' 
                  : forecast.confidence === 'medium' 
                    ? 'bg-amber-500/15 text-amber-500' 
                    : 'bg-[#38BDF8]/15 text-[#38BDF8]'
              }`}>
                {forecast.confidence} Confidence ({forecast.daysElapsed} days analyzed)
              </span>
            </div>
          )}
        </div>

        {forecast.canForecast ? (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-100 dark:bg-white/5">
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-[#9FA2AC] block">
                  Projected Month-End Spend
                </span>
                <div className="text-2xl font-black text-[#FF7628] mt-1">
                  {currencySymbol}{forecast.projectedTotal.toLocaleString()}
                </div>
                <span className="text-[11px] text-slate-500 dark:text-[#9FA2AC] block mt-0.5">
                  At current pace of {currencySymbol}{forecast.dailyRunRate}/day
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-100 dark:bg-white/5">
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-[#9FA2AC] block">
                  Projected vs Budget Delta
                </span>
                <div className={`text-2xl font-black mt-1 ${
                  forecastDelta > 0 ? 'text-rose-500' : 'text-[#16A34A] dark:text-[#22C58B]'
                }`}>
                  {forecastDelta > 0 
                    ? `+${currencySymbol}${forecastDelta.toLocaleString()} (Over)` 
                    : `-${currencySymbol}${Math.abs(forecastDelta).toLocaleString()} (Under)`}
                </div>
                <span className="text-[11px] text-slate-500 dark:text-[#9FA2AC] block mt-0.5">
                  {forecastDelta > 0 ? 'Projected to exceed budget' : 'Projected to finish within budget'}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-100 dark:bg-white/5">
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-[#9FA2AC] block">
                  Calculation Formula
                </span>
                <div className="text-xs font-mono font-bold text-slate-800 dark:text-white mt-1">
                  (Spent ÷ Elapsed) × {forecast.daysInMonth}
                </div>
                <span className="text-[11px] text-slate-500 dark:text-[#9FA2AC] block mt-0.5">
                  Linear run-rate model
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200/50 dark:border-white/5 text-xs text-slate-600 dark:text-[#9FA2AC] flex items-start gap-2.5">
              <Info className="w-4 h-4 text-[#FF7628] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 dark:text-white">Explanation: </span>
                <span>{forecast.formulaExplanation}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center">
            <p className="text-xs text-amber-500 font-semibold mb-1">
              {forecast.reason || 'Insufficient data to compute a reliable projection.'}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-[#9FA2AC]">
              OMNI TRACKER requires at least 2 recorded days in the month to avoid deceptive forecasts.
            </p>
          </div>
        )}
      </div>

      {/* Daily Run-rate & Month Comparison Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* Daily Run Rate & Safe Allowance */}
        <div className="glass-panel p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-[#9FA2AC] uppercase">
              Daily Safe Spending Allowance
            </span>
            <Wallet className="w-4 h-4 text-[#FF7628]" />
          </div>

          <div className="mt-3 space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-500 dark:text-[#9FA2AC]">Current Daily Average:</span>
              <span className="text-base font-bold text-slate-900 dark:text-white">
                {currencySymbol}{currentDailyAvg} / day
              </span>
            </div>

            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-500 dark:text-[#9FA2AC]">Recommended Safe Limit:</span>
              <span className={`text-base font-bold ${
                guardian.isOverBudget 
                  ? 'text-rose-500' 
                  : recommendedDailyAllowance < currentDailyAvg 
                    ? 'text-amber-500 dark:text-amber-400' 
                    : 'text-[#16A34A] dark:text-[#22C58B]'
              }`}>
                {guardian.isOverBudget ? `${currencySymbol}0 / day (Exceeded)` : `${currencySymbol}${recommendedDailyAllowance} / day`}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-[#9FA2AC] mt-3 pt-3 border-t border-slate-200/70 dark:border-white/5">
            {guardian.isOverBudget
              ? 'Budget already exceeded. All further expenses represent overspend.'
              : `Spending up to ${currencySymbol}${recommendedDailyAllowance}/day keeps you strictly within your limit.`}
          </p>
        </div>

        {/* Month-over-Month Comparison */}
        <div className="glass-panel p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-[#9FA2AC] uppercase">
              Month-over-Month Comparison
            </span>
            {momDiff > 0 ? (
              <ArrowUpRight className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-[#16A34A] dark:text-[#22C58B]" />
            )}
          </div>

          <div className="mt-3 space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-500 dark:text-[#9FA2AC]">
                Previous Month ({prevMonthStr}):
              </span>
              <span className="text-base font-bold text-slate-900 dark:text-white">
                {currencySymbol}{spentPrevMonth.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-500 dark:text-[#9FA2AC]">Delta:</span>
              <span className={`text-base font-bold ${
                momDiff > 0 ? 'text-amber-500 dark:text-amber-400' : 'text-[#16A34A] dark:text-[#22C58B]'
              }`}>
                {momDiff >= 0 ? `+${currencySymbol}${momDiff.toLocaleString()}` : `-${currencySymbol}${Math.abs(momDiff).toLocaleString()}`}
                {spentPrevMonth > 0 && ` (${momPercent}%)`}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-[#9FA2AC] mt-3 pt-3 border-t border-slate-200/70 dark:border-white/5">
            {momDiff > 0
              ? 'Higher spending pace compared to the previous month.'
              : 'Disciplined spending pace compared to the previous month.'}
          </p>
        </div>

      </div>

      {/* Category Breakdown for selected month */}
      <div className="glass-panel p-5">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
          Spending Breakdown by Category ({selectedMonthStr})
        </h3>

        {sortedCategories.length > 0 ? (
          <div className="space-y-3">
            {sortedCategories.map(([cat, total]) => {
              const catPercent = Math.round((total / (spentThisMonth || 1)) * 100);
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-900 dark:text-white">{cat}</span>
                    <span className="text-[#FF7628]">
                      {currencySymbol}{total.toLocaleString()} ({catPercent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-1.5 rounded-full bg-[#FF7628]"
                      style={{ width: `${catPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-500 dark:text-[#9FA2AC] italic">No expenses logged for this month yet.</p>
        )}
      </div>

    </div>
  );
};
