/**
 * Comprehensive Automated Test Suite for OMNI TRACKER
 * Tests:
 * 1. Analytics & Spending Intelligence (Categories, Routes, Forecast, Missing Days, Budget Guardian)
 * 2. Timezone & Streak Calculations
 * 3. CSV Generation with RFC 4180 & UTF-8 BOM
 * 4. Safe Backup Validation
 * 5. IndexedDB Persistence & Duplicate Prevention
 */

import 'fake-indexeddb/auto';
import { describe, it } from 'vitest';
import { 
  calculateCategoryBreakdown,
  calculateFrequentRoutes,
  calculateWeekComparison,
  calculateMonthComparison,
  calculateMostExpensiveDay,
  analyzeMissingDaysInMonth,
  calculateMonthForecast,
  calculateBudgetGuardian,
  generateRuleBasedInsights
} from '../src/utils/analyticsUtils';
import { 
  getLocalDateString, 
  getLocalMonthString, 
  getPreviousMonthString, 
  calculateHabitStreak, 
  isDateInPastDays 
} from '../src/utils/dateUtils';
import { generateCSV } from '../src/utils/csvUtils';
import { validateBackupJson } from '../src/utils/backupUtils';
import { calculateNextDueDate } from '../src/utils/recurringUtils';
import { db, addExpense, toggleHabitCompletion, setMonthlyBudget, getMonthlyBudget } from '../src/database/db';
import type { Expense, Habit, HabitCompletion } from '../src/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`TEST FAILED: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runTests() {
  console.log('\n--- 1. Testing Analytics & Spending Intelligence ---');

  const mockExpenses: Expense[] = [
    {
      id: 'e1',
      amount: 120,
      currency: 'BDT',
      category: 'Rickshaw',
      fromLocation: 'Dhanmondi',
      toLocation: 'Gulshan',
      date: '2026-10-01',
      time: '09:00',
      timestamp: 1,
      createdAt: '2026-10-01T09:00:00Z',
      updatedAt: '2026-10-01T09:00:00Z',
      syncStatus: 'synced',
    },
    {
      id: 'e2',
      amount: 150,
      currency: 'BDT',
      category: 'Rickshaw',
      fromLocation: 'Dhanmondi',
      toLocation: 'Gulshan',
      date: '2026-10-02',
      time: '09:15',
      timestamp: 2,
      createdAt: '2026-10-02T09:15:00Z',
      updatedAt: '2026-10-02T09:15:00Z',
      syncStatus: 'synced',
    },
    {
      id: 'e3',
      amount: 400,
      currency: 'BDT',
      category: 'CNG',
      fromLocation: 'Gulshan',
      toLocation: 'Uttara',
      date: '2026-10-03',
      time: '18:00',
      timestamp: 3,
      createdAt: '2026-10-03T18:00:00Z',
      updatedAt: '2026-10-03T18:00:00Z',
      syncStatus: 'synced',
    },
    {
      id: 'e4',
      amount: 0, // Confirmed zero spending
      currency: 'BDT',
      category: 'Walking',
      note: 'Wrote zero expense on rest day',
      date: '2026-10-04',
      time: '12:00',
      timestamp: 4,
      createdAt: '2026-10-04T12:00:00Z',
      updatedAt: '2026-10-04T12:00:00Z',
      syncStatus: 'synced',
    },
  ];

  // Category breakdown test
  const catSummary = calculateCategoryBreakdown(mockExpenses);
  assert(catSummary.length === 3, 'Calculated 3 unique categories');
  assert(catSummary[0].category === 'CNG' && catSummary[0].total === 400, 'CNG is highest spending category at ৳400');
  assert(catSummary[1].category === 'Rickshaw' && catSummary[1].total === 270, 'Rickshaw total is ৳270 across 2 rides');

  // Frequent routes test
  const routes = calculateFrequentRoutes(mockExpenses);
  assert(routes.length === 2, 'Identified 2 unique routes');
  assert(routes[0].routeKey === 'Dhanmondi → Gulshan', 'Top route is Dhanmondi → Gulshan');
  assert(routes[0].count === 2, 'Route frequency is 2 trips');
  assert(routes[0].totalCost === 270, 'Route total cost is ৳270');
  assert(routes[0].avgCost === 135, 'Route avg cost is ৳135');

  // Peak expense day
  const peakDay = calculateMostExpensiveDay(mockExpenses);
  assert(peakDay?.date === '2026-10-03' && peakDay.total === 400, 'Most expensive day is 2026-10-03 (৳400)');

  // Missing days vs confirmed zero spending
  const missingAnalysis = analyzeMissingDaysInMonth(mockExpenses, '2026-10', '2026-10-06');
  assert(missingAnalysis.activeSpendingDays === 3, 'Active spending on 3 days (Oct 1, 2, 3)');
  assert(missingAnalysis.confirmedZeroDays === 1, 'Confirmed zero spend on 1 day (Oct 4)');
  assert(missingAnalysis.unrecordedDays === 2, 'Unrecorded missing days on 2 days (Oct 5, 6)');

  // Month-end Forecast test
  const forecast = calculateMonthForecast(mockExpenses, '2026-10', new Date(2026, 9, 10)); // Oct 10
  assert(forecast.canForecast === true, 'Forecast succeeds with sufficient data');
  assert(forecast.spentSoFar === 670, 'Spent so far is ৳670');
  assert(forecast.daysElapsed === 10, '10 days elapsed');
  assert(forecast.daysInMonth === 31, '31 days in October');
  assert(forecast.projectedTotal === Math.round((670 / 10) * 31), 'Projected month-end correctly calculated');

  // Guard against insufficient forecast data
  const earlyForecast = calculateMonthForecast(mockExpenses, '2026-10', new Date(2026, 9, 1)); // Oct 1
  assert(earlyForecast.canForecast === false, 'Forecast correctly rejects when days elapsed < 2 to prevent misleading user');

  // Budget Guardian tests
  const guardianUnder = calculateBudgetGuardian(10000, 2000, 20);
  assert(guardianUnder.statusLevel === 'healthy', 'Budget at 20% is healthy');
  assert(guardianUnder.recommendedDailyLimit === Math.round(8000 / 20), 'Recommended daily limit is ৳400/day');

  const guardianWarn = calculateBudgetGuardian(10000, 7800, 10);
  assert(guardianWarn.statusLevel === 'warning', 'Budget at 78% triggers caution warning (>= 75%)');

  const guardianCritical = calculateBudgetGuardian(10000, 9200, 5);
  assert(guardianCritical.statusLevel === 'critical', 'Budget at 92% triggers critical alert (>= 90%)');

  const guardianOver = calculateBudgetGuardian(10000, 11500, 5);
  assert(guardianOver.statusLevel === 'over', 'Budget over 100% triggers overspent status');
  assert(guardianOver.isOverBudget === true, 'isOverBudget is true');
  assert(guardianOver.overspentAmount === 1500, 'Overspent amount is ৳1,500');
  assert(guardianOver.recommendedDailyLimit === 0, 'Safe limit is 0 when overspent');

  // Rule-based insights generation test
  const insights = generateRuleBasedInsights(mockExpenses, [], [], 10000, '৳', '2026-10-10');
  assert(insights.length >= 3, 'Generated multiple rule-based insights');
  assert(insights.some(i => i.type === 'category'), 'Includes category insight');

  console.log('\n--- 2. Testing Date & Habit Streak Utilities ---');

  // Timezone safe streak
  const streak3Days = calculateHabitStreak(['2026-10-08', '2026-10-09', '2026-10-10'], '2026-10-10');
  assert(streak3Days.currentStreak === 3, '3-day consecutive streak calculated correctly');
  assert(streak3Days.longestStreak === 3, 'Longest streak is 3');
  assert(streak3Days.isCompletedToday === true, 'Completed today is true');

  // Streak maintained from yesterday
  const streakFromYesterday = calculateHabitStreak(['2026-10-08', '2026-10-09'], '2026-10-10');
  assert(streakFromYesterday.currentStreak === 2, 'Streak is preserved if completed yesterday');
  assert(streakFromYesterday.isCompletedToday === false, 'Completed today is false');

  // Broken streak
  const brokenStreak = calculateHabitStreak(['2026-10-01', '2026-10-02'], '2026-10-10');
  assert(brokenStreak.currentStreak === 0, 'Current streak resets to 0 if last completion was over 1 day ago');
  assert(brokenStreak.longestStreak === 2, 'Longest historical streak remains 2');

  console.log('\n--- 3. Testing CSV Export (RFC 4180 & Bengali Unicode) ---');

  const headers = ['Category', 'From', 'To', 'Amount', 'Note'];
  const csvRows = [
    [
      'Rickshaw',
      'ধানমন্ডি (Dhanmondi)',
      'গুলশান (Gulshan)',
      '৳১২০',
      'Rainy day, paid with 20% "bonus"',
    ]
  ];

  const csvOutput = generateCSV(headers, csvRows);

  assert(csvOutput.charCodeAt(0) === 0xFEFF, 'CSV starts with UTF-8 BOM (\\uFEFF) for Excel compatibility');
  assert(csvOutput.includes('ধানমন্ডি (Dhanmondi)'), 'Bengali characters preserved in CSV');
  assert(csvOutput.includes('"Rainy day, paid with 20% ""bonus"""'), 'RFC 4180 quotation marks properly escaped with double quotes');

  console.log('\n--- 4. Testing Backup Validation ---');

  const validBackup = {
    version: '1.0.0',
    exportedAt: '2026-10-10T12:00:00Z',
    appName: 'OMNI TRACKER',
    data: {
      expenses: mockExpenses,
      habits: [],
      habitCompletions: [],
      budgets: [],
      quickRoutes: [],
      settings: {},
    }
  };

  const validationRes = validateBackupJson(JSON.stringify(validBackup));
  assert(validationRes.isValid === true, 'Valid backup passes strict schema validation');
  assert(validationRes.parsedBackup?.data.expenses.length === 4, 'Parsed 4 expenses in backup');

  const invalidJson = JSON.stringify({ version: 1, somethingElse: true });
  const invalidRes = validateBackupJson(invalidJson);
  assert(invalidRes.isValid === false, 'Corrupted backup is rejected before touching IndexedDB');

  console.log('\n--- 5. Testing IndexedDB Dexie Operations ---');

  // Test adding expense
  const savedExp = await addExpense({
    amount: 250,
    currency: 'BDT',
    category: 'Bus',
    date: '2026-10-10',
    time: '14:30',
    fromLocation: 'Motijheel',
    toLocation: 'Dhanmondi',
    timestamp: Date.now(),
  });
  assert(Boolean(savedExp.id), 'Expense saved to IndexedDB with unique ID');

  const readExp = await db.expenses.get(savedExp.id);
  assert(readExp?.amount === 250, 'Expense persisted in IndexedDB accurately');

  // Test habit completion toggle & duplicate prevention
  const testHabitId = 'habit_test_123';
  const testDate = '2026-10-10';

  // First toggle: completes habit
  const toggled1 = await toggleHabitCompletion(testHabitId, testDate);
  assert(toggled1 === true, 'First toggle completed habit');

  const comp1 = await db.habitCompletions.where(['habitId', 'date']).equals([testHabitId, testDate]).toArray();
  assert(comp1.length === 1, 'Exactly 1 completion record exists for date');

  // Second toggle: undoes completion (prevents duplicates)
  const toggled2 = await toggleHabitCompletion(testHabitId, testDate);
  assert(toggled2 === false, 'Second toggle undid completion');

  const comp2 = await db.habitCompletions.where(['habitId', 'date']).equals([testHabitId, testDate]).toArray();
  assert(comp2.length === 0, 'Completion cleanly removed on undo');

  // Test budget persistence by month without overwriting past months
  await setMonthlyBudget('2026-09', 20000, 'BDT');
  await setMonthlyBudget('2026-10', 30000, 'BDT');

  const sepBudget = await getMonthlyBudget('2026-09');
  const octBudget = await getMonthlyBudget('2026-10');
  assert(sepBudget?.budgetAmount === 20000, 'September budget is ৳20,000');
  assert(octBudget?.budgetAmount === 30000, 'October budget is ৳30,000');

  console.log('\n--- 6. Testing Phase 3: Quick Log, Recurring Automation & Reminders ---');

  // Test Recurring calculation: Daily, Workdays, Weekly, Monthly
  const nextDaily = calculateNextDueDate('2026-10-10', 'daily');
  assert(nextDaily === '2026-10-11', 'Daily increment advances +1 day');

  const nextFriday = '2026-10-16'; // Friday
  const nextWorkday = calculateNextDueDate(nextFriday, 'workdays');
  assert(nextWorkday === '2026-10-19', 'Workday increment from Friday advances to Monday (skips Sat & Sun)');

  const nextWeekly = calculateNextDueDate('2026-10-10', 'weekly');
  assert(nextWeekly === '2026-10-17', 'Weekly increment advances +7 days');

  const nextMonthly = calculateNextDueDate('2026-01-31', 'monthly');
  assert(nextMonthly === '2026-02-28', 'Monthly increment clamps to end of month when necessary (Jan 31 -> Feb 28)');

  // Test Recurring Expense persistence & Zero-Duplicate Rule
  const { 
    addRecurringExpense, 
    processDueRecurringExpenses, 
    getRecentDistinctExpenses,
    addExpenseTemplate,
    getExpenseTemplates,
    deleteExpenseTemplate,
    addHabitReminder,
    getHabitReminders,
    updateHabitReminder,
    deleteHabitReminder
  } = await import('../src/database/db');

  const createdRec = await addRecurringExpense({
    title: 'Daily Metro Train',
    amount: 60,
    currency: '৳',
    category: 'Train',
    frequency: 'daily',
    active: true,
    autoLog: true,
    nextDueDate: '2026-10-10',
  });
  assert(createdRec.id.startsWith('rec_'), 'Recurring expense created with ID');

  // Run processDueRecurringExpenses for today
  const run1 = await processDueRecurringExpenses('2026-10-10');
  assert(run1.generatedCount === 1, 'First run generated 1 transaction for due recurring rule');
  assert(run1.generatedExpenses[0].amount === 60, 'Generated expense amount is 60');

  // Immediate re-run on app reopen / refresh: must NOT duplicate transactions
  const run2 = await processDueRecurringExpenses('2026-10-10');
  assert(run2.generatedCount === 0, 'Second run on reopen generated 0 transactions (ZERO duplicate guarantee passed)');

  // Test getRecentDistinctExpenses
  const recents = await getRecentDistinctExpenses(5);
  assert(recents.length > 0, `Retrieved ${recents.length} distinct recent expenses for 1-tap logging`);

  // Test Expense Templates
  const tpl = await addExpenseTemplate({
    title: 'Office CNG Commute',
    amount: 250,
    category: 'CNG',
    fromLocation: 'Mirpur',
    toLocation: 'Dhanmondi',
    note: 'Fast commute'
  });
  assert(tpl.title === 'Office CNG Commute', 'Expense template saved to IndexedDB');
  const allTpls = await getExpenseTemplates();
  assert(allTpls.some(t => t.id === tpl.id), 'Expense template retrieved from table');
  await deleteExpenseTemplate(tpl.id);
  const afterDelTpls = await getExpenseTemplates();
  assert(!afterDelTpls.some(t => t.id === tpl.id), 'Expense template cleanly deleted');

  // Test Habit Reminders
  const rem = await addHabitReminder({
    habitId: 'habit_test_123',
    time: '21:00',
    enabled: true,
    daysOfWeek: [1, 2, 3, 4, 5]
  });
  assert(rem.time === '21:00', 'Habit reminder saved to IndexedDB');
  await updateHabitReminder(rem.id, { enabled: false });
  const allRems = await getHabitReminders();
  const updatedRem = allRems.find(r => r.id === rem.id);
  assert(updatedRem?.enabled === false, 'Habit reminder enabled toggle updated successfully');
  await deleteHabitReminder(rem.id);
  const finalRems = await getHabitReminders();
  assert(!finalRems.some(r => r.id === rem.id), 'Habit reminder cleanly deleted');

  console.log('\n=======================================');
  console.log('ALL TESTS EXECUTED AND PASSED SUCCESSFULLY!');
  console.log('=======================================\n');
}

describe('OMNI TRACKER Analytics & Reliability', () => {
  it('passes all analytics and Dexie tests', async () => {
    await runTests();
  });
});
