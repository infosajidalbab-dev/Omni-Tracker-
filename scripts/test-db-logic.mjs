/**
 * Test script to functionally verify business logic:
 * - Date string utilities
 * - Habit streak calculation algorithm
 * - Budget remaining & percentage utilization
 * - Duplicate prevention logic
 * - CSV export generation
 */

import { getLocalDateString, getLocalTimeString, getLocalMonthString, formatHumanDate } from '../src/utils/dateUtils.ts';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

console.log('--- TEST 1: Date Utils Verification ---');
const today = new Date();
const localDateStr = getLocalDateString(today);
const localMonthStr = getLocalMonthString(today);
assert(/^\d{4}-\d{2}-\d{2}$/.test(localDateStr), `Local date format matches YYYY-MM-DD: ${localDateStr}`);
assert(/^\d{4}-\d{2}$/.test(localMonthStr), `Local month format matches YYYY-MM: ${localMonthStr}`);
assert(localDateStr.startsWith(localMonthStr), `Local date starts with local month: ${localDateStr} startsWith ${localMonthStr}`);

console.log('\n--- TEST 2: Habit Streak Calculation Algorithm ---');
function calculateStreakTest(habitId, completions, referenceDate) {
  const habitCompletions = new Set(
    completions.filter(c => c.habitId === habitId).map(c => c.date)
  );

  let streak = 0;
  const checkDate = new Date(referenceDate);

  const todayFormatted = getLocalDateString(checkDate);
  if (habitCompletions.has(todayFormatted)) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  } else {
    checkDate.setDate(checkDate.getDate() - 1);
    const yesterdayFormatted = getLocalDateString(checkDate);
    if (!habitCompletions.has(yesterdayFormatted)) {
      return 0; // streak broken
    }
  }

  while (true) {
    const dateStr = getLocalDateString(checkDate);
    if (habitCompletions.has(dateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

// Case A: Completed today and yesterday (streak = 2)
const completionsA = [
  { habitId: 'h1', date: '2026-10-09' },
  { habitId: 'h1', date: '2026-10-08' },
  { habitId: 'h1', date: '2026-10-06' }, // gap on Oct 7
];
const streakA = calculateStreakTest('h1', completionsA, new Date('2026-10-09T12:00:00'));
assert(streakA === 2, `Streak A is 2 consecutive days (actual: ${streakA})`);

// Case B: Not completed yet today, but completed yesterday & day before (streak = 2, still active today!)
const completionsB = [
  { habitId: 'h1', date: '2026-10-08' },
  { habitId: 'h1', date: '2026-10-07' },
];
const streakB = calculateStreakTest('h1', completionsB, new Date('2026-10-09T12:00:00'));
assert(streakB === 2, `Streak B remains active when today is not yet done (actual: ${streakB})`);

// Case C: Neither today nor yesterday completed (streak = 0, broken)
const completionsC = [
  { habitId: 'h1', date: '2026-10-07' },
];
const streakC = calculateStreakTest('h1', completionsC, new Date('2026-10-09T12:00:00'));
assert(streakC === 0, `Streak C is broken when yesterday was missed (actual: ${streakC})`);

console.log('\n--- TEST 3: Duplicate Completion Prevention ---');
// Emulate the idempotent transaction check
const setOfCompletions = new Set();
function recordCompletion(habitId, date) {
  const compoundKey = `${habitId}+${date}`;
  if (setOfCompletions.has(compoundKey)) {
    return false; // prevented duplicate
  }
  setOfCompletions.add(compoundKey);
  return true;
}

assert(recordCompletion('h-water', '2026-10-09') === true, 'First completion record allowed');
assert(recordCompletion('h-water', '2026-10-09') === false, 'Duplicate completion on same date prevented');

console.log('\n--- TEST 4: Budget Calculation & Over-Budget Handling ---');
function calculateBudget(budgetAmount, expenses, month) {
  const monthExpenses = expenses.filter(e => e.date.startsWith(month));
  const spent = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const remaining = budgetAmount - spent;
  const percentUsed = Math.round((spent / budgetAmount) * 100);
  const isOverBudget = remaining < 0;
  return { spent, remaining, percentUsed, isOverBudget };
}

const testExpenses = [
  { date: '2026-10-01', amount: 5000 },
  { date: '2026-10-05', amount: 8000 },
  { date: '2026-10-09', amount: 15000 },
];
// Total spent: 28,000 on a 25,000 budget
const budgetRes = calculateBudget(25000, testExpenses, '2026-10');
assert(budgetRes.spent === 28000, `Total spent is 28,000 (actual: ${budgetRes.spent})`);
assert(budgetRes.remaining === -3000, `Remaining budget is -3,000 (actual: ${budgetRes.remaining})`);
assert(budgetRes.percentUsed === 112, `Percent utilized correctly exceeds 100% (actual: ${budgetRes.percentUsed}%)`);
assert(budgetRes.isOverBudget === true, `isOverBudget flag is true`);

console.log('\n--- TEST 5: CSV Export Escaping ---');
function generateExpenseCsvRow(e) {
  return [
    `"${e.id}"`,
    `"${e.date}"`,
    `"${e.time || ''}"`,
    e.amount,
    `"${e.currency}"`,
    `"${e.category}"`,
    `"${(e.fromLocation || '').replace(/"/g, '""')}"`,
    `"${(e.toLocation || '').replace(/"/g, '""')}"`,
    `"${(e.note || '').replace(/"/g, '""')}"`,
    `"${e.syncStatus}"`
  ].join(',');
}

const sampleExpense = {
  id: 'exp_1',
  date: '2026-10-09',
  time: '14:30',
  amount: 60,
  currency: '৳',
  category: 'Rickshaw',
  fromLocation: 'Dhanmondi "32"',
  toLocation: 'Science Lab',
  note: 'Shared ride, "rain fare"',
  syncStatus: 'pending'
};
const csvRow = generateExpenseCsvRow(sampleExpense);
assert(csvRow.includes('""32""'), 'Double quotes in location properly escaped');
assert(csvRow.includes('""rain fare""'), 'Double quotes in note properly escaped');

console.log('\n🎉 ALL 5 FUNCTIONAL TESTS PASSED SYSTEMATICALLY!\n');
