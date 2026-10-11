/**
 * OMNI TRACKER — Smart Analytics & Spending Intelligence Engine
 * 
 * Provides pure, zero-API, local calculations:
 * - Transport category breakdown & highest spending
 * - Daily averages and pacing
 * - Week-over-week and month-over-month comparisons
 * - Most expensive day detection
 * - Frequent routes with total expenditure
 * - Missing days vs confirmed zero spending detection
 * - Transparent month-end forecast with confidence ratings
 * - Budget Guardian status and configurable alert levels
 * - Concise, truthful rule-based insight generation
 */

import type { Expense, Habit, HabitCompletion, MonthlyBudget, TransportType } from '../types';
import { getLocalDateString, getLocalMonthString, getPreviousMonthString, isDateInPastDays } from './dateUtils';

export interface CategorySummary {
  category: TransportType;
  total: number;
  count: number;
  percentage: number;
}

export interface RouteSummary {
  routeKey: string;
  fromLocation: string;
  toLocation: string;
  category: TransportType;
  count: number;
  totalCost: number;
  avgCost: number;
}

export interface WeekComparison {
  thisWeekTotal: number;
  lastWeekTotal: number;
  diff: number;
  percentChange: number; // positive = increased spending
  thisWeekCount: number;
  lastWeekCount: number;
}

export interface MonthComparison {
  thisMonthTotal: number;
  lastMonthTotal: number;
  diff: number;
  percentChange: number;
  thisMonthCount: number;
  lastMonthCount: number;
}

export interface DayExpenseRecord {
  date: string;
  total: number;
  count: number;
  expenses: Expense[];
  status: 'missing' | 'zero' | 'active'; // missing = no record, zero = confirmed 0 amount, active = spending
}

export interface MissingDaysAnalysis {
  daysInMonthSoFar: number;
  activeSpendingDays: number;
  confirmedZeroDays: number;
  unrecordedDays: number;
  unrecordedDates: string[];
  confirmedZeroDates: string[];
}

export interface MonthForecastResult {
  canForecast: boolean;
  reason?: string;
  spentSoFar: number;
  daysElapsed: number;
  daysRemaining: number;
  daysInMonth: number;
  dailyRunRate: number;
  projectedTotal: number;
  confidence: 'high' | 'medium' | 'preliminary' | 'insufficient';
  formulaExplanation: string;
  targetMonth: string;
}

export interface BudgetGuardianStatus {
  monthlyBudget: number;
  spentThisMonth: number;
  budgetRemaining: number;
  percentUsed: number;
  isOverBudget: boolean;
  overspentAmount: number;
  daysRemaining: number;
  recommendedDailyLimit: number;
  currentDailyAverage: number;
  statusLevel: 'healthy' | 'warning' | 'critical' | 'over';
  statusMessage: string;
  thresholds: {
    warning: number;  // default 75%
    critical: number; // default 90%
    limit: number;    // default 100%
  };
}

export interface RuleBasedInsight {
  id: string;
  type: 'category' | 'budget' | 'trend' | 'route' | 'habits' | 'timing';
  severity: 'info' | 'positive' | 'warning' | 'urgent';
  title: string;
  description: string;
  stat?: string;
  metricLabel?: string;
}

// ---------------- 1. Category & Route Insights ----------------

export function calculateCategoryBreakdown(expenses: Expense[]): CategorySummary[] {
  if (expenses.length === 0) return [];

  const map: Record<string, { total: number; count: number }> = {};
  let overallTotal = 0;

  for (const exp of expenses) {
    if (!map[exp.category]) {
      map[exp.category] = { total: 0, count: 0 };
    }
    map[exp.category].total += exp.amount;
    map[exp.category].count += 1;
    overallTotal += exp.amount;
  }

  const results: CategorySummary[] = Object.entries(map).map(([cat, val]) => ({
    category: cat as TransportType,
    total: val.total,
    count: val.count,
    percentage: overallTotal > 0 ? Math.round((val.total / overallTotal) * 100) : 0,
  }));

  return results.sort((a, b) => b.total - a.total);
}

export function calculateFrequentRoutes(expenses: Expense[]): RouteSummary[] {
  const map: Record<string, RouteSummary> = {};

  for (const exp of expenses) {
    const from = exp.fromLocation?.trim();
    const to = exp.toLocation?.trim();
    if (!from || !to) continue;

    const key = `${from.toLowerCase()} → ${to.toLowerCase()}`;
    if (!map[key]) {
      map[key] = {
        routeKey: `${from} → ${to}`,
        fromLocation: from,
        toLocation: to,
        category: exp.category,
        count: 0,
        totalCost: 0,
        avgCost: 0,
      };
    }

    map[key].count += 1;
    map[key].totalCost += exp.amount;
  }

  const routes = Object.values(map).map(r => ({
    ...r,
    avgCost: r.count > 0 ? Math.round(r.totalCost / r.count) : 0,
  }));

  // Sort by usage count then total cost
  return routes.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return b.totalCost - a.totalCost;
  });
}

// ---------------- 2. Time Comparisons ----------------

export function calculateWeekComparison(expenses: Expense[], refDateStr = getLocalDateString()): WeekComparison {
  // Current 7 days [refDate - 6 days .. refDate]
  // Previous 7 days [refDate - 13 days .. refDate - 7 days]
  let thisWeekTotal = 0;
  let thisWeekCount = 0;
  let lastWeekTotal = 0;
  let lastWeekCount = 0;

  for (const exp of expenses) {
    if (isDateInPastDays(exp.date, 7, refDateStr)) {
      thisWeekTotal += exp.amount;
      thisWeekCount += 1;
    } else if (isDateInPastDays(exp.date, 14, refDateStr)) {
      lastWeekTotal += exp.amount;
      lastWeekCount += 1;
    }
  }

  const diff = thisWeekTotal - lastWeekTotal;
  const percentChange = lastWeekTotal > 0 ? Math.round((diff / lastWeekTotal) * 100) : 0;

  return {
    thisWeekTotal,
    lastWeekTotal,
    diff,
    percentChange,
    thisWeekCount,
    lastWeekCount,
  };
}

export function calculateMonthComparison(expenses: Expense[], currentMonthStr = getLocalMonthString()): MonthComparison {
  const prevMonthStr = getPreviousMonthString(currentMonthStr);

  let thisMonthTotal = 0;
  let thisMonthCount = 0;
  let lastMonthTotal = 0;
  let lastMonthCount = 0;

  for (const exp of expenses) {
    if (exp.date.startsWith(currentMonthStr)) {
      thisMonthTotal += exp.amount;
      thisMonthCount += 1;
    } else if (exp.date.startsWith(prevMonthStr)) {
      lastMonthTotal += exp.amount;
      lastMonthCount += 1;
    }
  }

  const diff = thisMonthTotal - lastMonthTotal;
  const percentChange = lastMonthTotal > 0 ? Math.round((diff / lastMonthTotal) * 100) : 0;

  return {
    thisMonthTotal,
    lastMonthTotal,
    diff,
    percentChange,
    thisMonthCount,
    lastMonthCount,
  };
}

// ---------------- 3. Most Expensive Day & Day Aggregates ----------------

export function calculateMostExpensiveDay(expenses: Expense[]): { date: string; total: number; count: number } | null {
  if (expenses.length === 0) return null;

  const dayMap: Record<string, { total: number; count: number }> = {};
  for (const exp of expenses) {
    if (!dayMap[exp.date]) {
      dayMap[exp.date] = { total: 0, count: 0 };
    }
    dayMap[exp.date].total += exp.amount;
    dayMap[exp.date].count += 1;
  }

  let topDay: { date: string; total: number; count: number } | null = null;
  for (const [date, info] of Object.entries(dayMap)) {
    if (!topDay || info.total > topDay.total) {
      topDay = { date, total: info.total, count: info.count };
    }
  }

  return topDay;
}

// ---------------- 4. Missing vs Confirmed Zero Spending Days ----------------

export function analyzeMissingDaysInMonth(
  expenses: Expense[],
  targetMonth = getLocalMonthString(),
  todayStr = getLocalDateString()
): MissingDaysAnalysis {
  const [yearStr, monthStr] = targetMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const daysInMonth = new Date(year, month, 0).getDate();
  const isCurrentMonth = todayStr.startsWith(targetMonth);
  const currentDayNum = isCurrentMonth ? parseInt(todayStr.slice(8, 10), 10) : daysInMonth;
  const daysToCheck = Math.min(daysInMonth, currentDayNum);

  // Group expenses by date for target month
  const dateMap: Record<string, Expense[]> = {};
  for (const exp of expenses) {
    if (exp.date.startsWith(targetMonth)) {
      if (!dateMap[exp.date]) dateMap[exp.date] = [];
      dateMap[exp.date].push(exp);
    }
  }

  let activeSpendingDays = 0;
  let confirmedZeroDays = 0;
  let unrecordedDays = 0;
  const unrecordedDates: string[] = [];
  const confirmedZeroDates: string[] = [];

  for (let d = 1; d <= daysToCheck; d++) {
    const dayStr = `${targetMonth}-${d.toString().padStart(2, '0')}`;
    const dayRecords = dateMap[dayStr];

    if (!dayRecords || dayRecords.length === 0) {
      unrecordedDays += 1;
      unrecordedDates.push(dayStr);
    } else {
      const sum = dayRecords.reduce((acc, curr) => acc + curr.amount, 0);
      if (sum === 0) {
        confirmedZeroDays += 1;
        confirmedZeroDates.push(dayStr);
      } else {
        activeSpendingDays += 1;
      }
    }
  }

  return {
    daysInMonthSoFar: daysToCheck,
    activeSpendingDays,
    confirmedZeroDays,
    unrecordedDays,
    unrecordedDates,
    confirmedZeroDates,
  };
}

// ---------------- 5. Transparent Month-End Forecast ----------------

export function calculateMonthForecast(
  expenses: Expense[],
  targetMonth = getLocalMonthString(),
  now = new Date()
): MonthForecastResult {
  const [yearStr, monthStr] = targetMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const daysInMonth = new Date(year, month, 0).getDate();
  const currentDay = now.getDate();
  const isCurrentMonth = getLocalMonthString(now) === targetMonth;

  const daysElapsed = isCurrentMonth ? currentDay : daysInMonth;
  const daysRemaining = Math.max(0, daysInMonth - daysElapsed);

  const monthExpenses = expenses.filter(e => e.date.startsWith(targetMonth));
  const spentSoFar = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Require at least 2 days elapsed and at least 1 record to build a valid estimate
  if (daysElapsed < 2 || monthExpenses.length === 0) {
    return {
      canForecast: false,
      reason: daysElapsed < 2 
        ? 'Insufficient data: month has just started. A projection requires at least 2 elapsed days.' 
        : 'No expenses have been recorded for this month yet to calculate a projection.',
      spentSoFar,
      daysElapsed,
      daysRemaining,
      daysInMonth,
      dailyRunRate: 0,
      projectedTotal: 0,
      confidence: 'insufficient',
      formulaExplanation: 'Projection formula: (Spent So Far ÷ Days Elapsed) × Total Days in Month.',
      targetMonth,
    };
  }

  const dailyRunRate = spentSoFar / daysElapsed;
  const projectedTotal = Math.round(dailyRunRate * daysInMonth);

  let confidence: MonthForecastResult['confidence'] = 'preliminary';
  if (daysElapsed >= 15) {
    confidence = 'high';
  } else if (daysElapsed >= 7) {
    confidence = 'medium';
  }

  const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long' });
  const formulaExplanation = `Projection based on actual pace: ৳${spentSoFar.toLocaleString()} spent across ${daysElapsed} days elapsed (~৳${Math.round(dailyRunRate).toLocaleString()}/day) projected over ${daysInMonth} total days in ${monthName}.`;

  return {
    canForecast: true,
    spentSoFar,
    daysElapsed,
    daysRemaining,
    daysInMonth,
    dailyRunRate: Math.round(dailyRunRate),
    projectedTotal,
    confidence,
    formulaExplanation,
    targetMonth,
  };
}

// ---------------- 6. Budget Guardian Status ----------------

export function calculateBudgetGuardian(
  monthlyBudget: number,
  spentThisMonth: number,
  daysRemaining: number,
  customThresholds = { warning: 75, critical: 90, limit: 100 }
): BudgetGuardianStatus {
  const budgetRemaining = monthlyBudget - spentThisMonth;
  const percentUsed = monthlyBudget > 0 ? Math.round((spentThisMonth / monthlyBudget) * 100) : 0;
  const isOverBudget = spentThisMonth > monthlyBudget;
  const overspentAmount = Math.max(0, spentThisMonth - monthlyBudget);

  const recommendedDailyLimit = (daysRemaining > 0 && budgetRemaining > 0)
    ? Math.round(budgetRemaining / daysRemaining)
    : 0;

  // Elapsed days so far (assuming 30-day base or dynamic)
  const now = new Date();
  const currentDay = now.getDate();
  const currentDailyAverage = currentDay > 0 ? Math.round(spentThisMonth / currentDay) : 0;

  let statusLevel: BudgetGuardianStatus['statusLevel'] = 'healthy';
  let statusMessage = `Spending is well-balanced (${percentUsed}% of budget used)`;

  if (percentUsed >= customThresholds.limit) {
    statusLevel = 'over';
    statusMessage = `Budget exceeded by ৳${overspentAmount.toLocaleString()} (${percentUsed}% spent)`;
  } else if (percentUsed >= customThresholds.critical) {
    statusLevel = 'critical';
    statusMessage = `Critical budget threshold crossed (${percentUsed}% used). Only ৳${budgetRemaining.toLocaleString()} remaining`;
  } else if (percentUsed >= customThresholds.warning) {
    statusLevel = 'warning';
    statusMessage = `Caution: ${percentUsed}% of budget reached with ${daysRemaining} days remaining`;
  }

  return {
    monthlyBudget,
    spentThisMonth,
    budgetRemaining,
    percentUsed,
    isOverBudget,
    overspentAmount,
    daysRemaining,
    recommendedDailyLimit,
    currentDailyAverage,
    statusLevel,
    statusMessage,
    thresholds: customThresholds,
  };
}

// ---------------- 7. Rule-Based Smart Insight Cards ----------------

export function generateRuleBasedInsights(
  expenses: Expense[],
  habits: Habit[],
  completions: HabitCompletion[],
  budget: number,
  currencySymbol = '৳',
  todayStr = getLocalDateString()
): RuleBasedInsight[] {
  const insights: RuleBasedInsight[] = [];
  const curMonth = getLocalMonthString();
  const monthExpenses = expenses.filter(e => e.date.startsWith(curMonth));
  const totalMonthSpent = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

  // If completely empty database:
  if (expenses.length === 0) {
    insights.push({
      id: 'insight-empty',
      type: 'category',
      severity: 'info',
      title: 'Ready for Your Records',
      description: 'Log your daily commute rides or routine expenses to unlock real-time spending intelligence, category breakdowns, and pacing forecasts.',
    });
    return insights;
  }

  // 1. Top Transport/Expense Category
  const categories = calculateCategoryBreakdown(monthExpenses.length > 0 ? monthExpenses : expenses);
  if (categories.length > 0) {
    const topCat = categories[0];
    insights.push({
      id: 'insight-top-cat',
      type: 'category',
      severity: topCat.percentage > 45 ? 'warning' : 'info',
      title: `Top Spending Category: ${topCat.category}`,
      description: `${topCat.category} represents ${topCat.percentage}% of your logged expenditure (${currencySymbol}${topCat.total.toLocaleString()} across ${topCat.count} entries).`,
      stat: `${topCat.percentage}%`,
      metricLabel: 'of total expenditure',
    });
  }

  // 2. Budget Pacing / Overrun Insight
  if (budget > 0) {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysRemaining = Math.max(0, daysInMonth - now.getDate());
    const guardian = calculateBudgetGuardian(budget, totalMonthSpent, daysRemaining);

    if (guardian.isOverBudget) {
      insights.push({
        id: 'insight-budget-over',
        type: 'budget',
        severity: 'urgent',
        title: 'Monthly Budget Limit Exceeded',
        description: `You have crossed your ${currencySymbol}${budget.toLocaleString()} monthly limit by ${currencySymbol}${guardian.overspentAmount.toLocaleString()} (${guardian.percentUsed}% spent). Restrict discretionary expenses for the next ${daysRemaining} days.`,
        stat: `+${currencySymbol}${guardian.overspentAmount.toLocaleString()}`,
        metricLabel: 'over limit',
      });
    } else if (guardian.statusLevel === 'critical') {
      insights.push({
        id: 'insight-budget-critical',
        type: 'budget',
        severity: 'warning',
        title: 'Approaching Budget Ceiling',
        description: `You have consumed ${guardian.percentUsed}% of this month's budget. To finish the month without overspending, cap daily expenses at ${currencySymbol}${guardian.recommendedDailyLimit}/day.`,
        stat: `${currencySymbol}${guardian.recommendedDailyLimit}`,
        metricLabel: 'safe daily ceiling',
      });
    } else {
      insights.push({
        id: 'insight-budget-healthy',
        type: 'budget',
        severity: 'positive',
        title: 'Healthy Budget Trajectory',
        description: `At current pace, you have ${currencySymbol}${guardian.budgetRemaining.toLocaleString()} remaining (${guardian.percentUsed}% used). Safe daily allowance is ${currencySymbol}${guardian.recommendedDailyLimit}/day.`,
        stat: `${guardian.percentUsed}%`,
        metricLabel: 'utilized so far',
      });
    }
  }

  // 3. Week-over-Week Momentum
  const weekComp = calculateWeekComparison(expenses, todayStr);
  if (weekComp.lastWeekTotal > 0) {
    const isHigher = weekComp.diff > 0;
    insights.push({
      id: 'insight-wow',
      type: 'trend',
      severity: isHigher ? 'warning' : 'positive',
      title: isHigher ? 'Spending Accelerated This Week' : 'Lower Spending This Week',
      description: isHigher
        ? `You spent ${currencySymbol}${weekComp.thisWeekTotal.toLocaleString()} in the past 7 days, up ${Math.abs(weekComp.percentChange)}% compared to the prior 7 days (${currencySymbol}${weekComp.lastWeekTotal.toLocaleString()}).`
        : `Great financial control! Past 7 days expenditure (${currencySymbol}${weekComp.thisWeekTotal.toLocaleString()}) decreased by ${Math.abs(weekComp.percentChange)}% compared to previous week (${currencySymbol}${weekComp.lastWeekTotal.toLocaleString()}).`,
      stat: `${isHigher ? '+' : ''}${weekComp.percentChange}%`,
      metricLabel: 'vs prior 7 days',
    });
  }

  // 4. Frequent Route Analysis
  const routes = calculateFrequentRoutes(monthExpenses.length > 0 ? monthExpenses : expenses);
  if (routes.length > 0) {
    const topRoute = routes[0];
    if (topRoute.count >= 2) {
      insights.push({
        id: 'insight-top-route',
        type: 'route',
        severity: 'info',
        title: `Primary Commute: ${topRoute.routeKey}`,
        description: `This route accounts for ${topRoute.count} trips and ${currencySymbol}${topRoute.totalCost.toLocaleString()} total cost (averaging ${currencySymbol}${topRoute.avgCost} per trip via ${topRoute.category}).`,
        stat: `${topRoute.count} Trips`,
        metricLabel: `${currencySymbol}${topRoute.totalCost.toLocaleString()} total`,
      });
    }
  }

  // 5. Most Expensive Recorded Day
  const topDay = calculateMostExpensiveDay(monthExpenses.length > 0 ? monthExpenses : expenses);
  if (topDay && topDay.total > 0) {
    insights.push({
      id: 'insight-peak-day',
      type: 'timing',
      severity: 'info',
      title: `Peak Expense Day: ${topDay.date}`,
      description: `Highest single-day expenditure was ${currencySymbol}${topDay.total.toLocaleString()} across ${topDay.count} recorded items.`,
      stat: `${currencySymbol}${topDay.total.toLocaleString()}`,
      metricLabel: `${topDay.count} items`,
    });
  }

  // 6. Habit Discipline Link
  const activeHabits = habits.filter(h => h.active !== false);
  if (activeHabits.length > 0 && completions.length > 0) {
    // Recent 7-day completion count
    const recentComps = completions.filter(c => isDateInPastDays(c.date, 7, todayStr));
    const rate = Math.round((recentComps.length / (activeHabits.length * 7)) * 100);
    insights.push({
      id: 'insight-habits',
      type: 'habits',
      severity: rate >= 70 ? 'positive' : 'info',
      title: 'Habit Consistency Score',
      description: `You achieved ${recentComps.length} check-ins across ${activeHabits.length} active habits in the past 7 days (${Math.min(100, rate)}% execution rate).`,
      stat: `${Math.min(100, rate)}%`,
      metricLabel: '7-day habit score',
    });
  }

  return insights;
}
