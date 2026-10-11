/**
 * Automated Test Suite for OMNI TRACKER Phase 1: Core Reliability and Data Safety
 * Tests:
 * 1. Timezone-safe date arithmetic and local string generation
 * 2. Habit streak calculations (consecutive days, broken streaks, longest streak, DST noon anchor)
 * 3. Habit duplicate completion prevention
 * 4. CSV export generation with RFC 4180 escaping, Unicode, Bengali text, and UTF-8 BOM
 * 5. Safe JSON backup validation, version warnings, schema corruption detection, and restoration strategies
 */

import { 
  getLocalDateString, 
  getLocalMonthString, 
  getPreviousMonthString,
  isDateInPastDays, 
  calculateHabitStreak, 
  parseLocalDateNoon,
  formatHumanDate
} from '../src/utils/dateUtils';

import { 
  generateCSV, 
  escapeCSVCell 
} from '../src/utils/csvUtils';

import { 
  validateBackupJson, 
  type OmniBackupData 
} from '../src/utils/backupUtils';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Test failed: ${message}`);
  }
  passedTests++;
  console.log(`✅ PASS: ${message}`);
}

async function runTests() {
  console.log('--- STARTING OMNI TRACKER PHASE 1 VERIFICATION TESTS ---\n');

  // ==========================================
  // Test 1: Date & Timezone Utilities
  // ==========================================
  console.log('Testing Date & Timezone Utilities...');

  const dateNoon = parseLocalDateNoon('2026-10-10');
  assert(dateNoon.getHours() === 12, 'parseLocalDateNoon anchors at 12:00 PM noon');
  assert(getLocalDateString(dateNoon) === '2026-10-10', 'getLocalDateString returns YYYY-MM-DD');

  assert(getLocalMonthString('2026-10-10') === '2026-10', 'getLocalMonthString extracts YYYY-MM');
  assert(getPreviousMonthString('2026-10-10') === '2026-09', 'getPreviousMonthString for October is September');
  assert(getPreviousMonthString('2026-01-15') === '2025-12', 'getPreviousMonthString wraps January to previous year December');

  assert(isDateInPastDays('2026-10-10', 7, '2026-10-10') === true, 'Today is within past 7 days');
  assert(isDateInPastDays('2026-10-04', 7, '2026-10-10') === true, '6 days ago is within past 7 days');
  assert(isDateInPastDays('2026-10-03', 7, '2026-10-10') === false, '8 days ago is outside past 7 days');
  assert(isDateInPastDays('2026-10-12', 7, '2026-10-10') === false, 'Future date is not in past days');

  // ==========================================
  // Test 2: Habit Consecutive-Day Streak Calculations
  // ==========================================
  console.log('\nTesting Habit Streak Calculations...');

  // Empty completions
  const emptyStreak = calculateHabitStreak([], '2026-10-10');
  assert(emptyStreak.currentStreak === 0 && emptyStreak.longestStreak === 0, 'Empty completions have 0 streak');

  // Completed today only
  const todayOnly = calculateHabitStreak(['2026-10-10'], '2026-10-10');
  assert(todayOnly.currentStreak === 1 && todayOnly.completedToday === true, 'Completed today has 1 current streak');

  // Completed yesterday only (active streak preserved, but not completed today)
  const yesterdayOnly = calculateHabitStreak(['2026-10-09'], '2026-10-10');
  assert(yesterdayOnly.currentStreak === 1 && yesterdayOnly.completedToday === false, 'Completed yesterday keeps 1-day active streak alive before logging today');

  // Missed yesterday and today (streak broken)
  const streakBroken = calculateHabitStreak(['2026-10-08', '2026-10-07', '2026-10-06'], '2026-10-10');
  assert(streakBroken.currentStreak === 0, 'Missed yesterday and today breaks streak to 0');
  assert(streakBroken.longestStreak === 3, 'Historical longest streak of 3 is preserved when current streak breaks');

  // Consecutive 5 days ending today
  const fiveDays = calculateHabitStreak(
    ['2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10'],
    '2026-10-10'
  );
  assert(fiveDays.currentStreak === 5 && fiveDays.longestStreak === 5, '5 consecutive days ending today gives 5 streak');

  // Duplicate dates in completions array (ensure robust de-duplication)
  const withDuplicates = calculateHabitStreak(
    ['2026-10-09', '2026-10-09', '2026-10-10', '2026-10-10', '2026-10-10'],
    '2026-10-10'
  );
  assert(withDuplicates.currentStreak === 2, 'Duplicate date records are safely de-duplicated without inflating streak');

  // ==========================================
  // Test 3: CSV Generation, Quotes, Bengali & Unicode Characters
  // ==========================================
  console.log('\nTesting CSV Generation, Unicode, Bengali and RFC 4180 Escaping...');

  assert(escapeCSVCell('Plain text') === '"Plain text"', 'Plain text wrapped in quotes');
  assert(escapeCSVCell('Text, with comma') === '"Text, with comma"', 'Comma handled correctly');
  assert(escapeCSVCell('Text with "quotes"') === '"Text with ""quotes"""', 'Quotes escaped by doubling (" -> "")');
  assert(escapeCSVCell('Line 1\nLine 2') === '"Line 1\nLine 2"', 'Newlines safely enclosed');

  // Bengali text and currency symbol
  const bengaliText = 'মিরপুর ১০ থেকে ধানমন্ডি ২৭, রিকশা ভাড়া "৳ ১২০"';
  const escapedBengali = escapeCSVCell(bengaliText);
  assert(escapedBengali === '"মিরপুর ১০ থেকে ধানমন্ডি ২৭, রিকশা ভাড়া ""৳ ১২০"""', 'Bengali text with commas and quotes properly escaped');

  const headers = ['ID', 'Date', 'Location', 'Amount', 'Currency'];
  const rows = [
    ['exp-1', '2026-10-10', 'মিরপুর ১০', 60, '৳'],
    ['exp-2', '2026-10-10', 'ফার্মগেট, তেজগাঁও', 150, '৳'],
  ];
  const csvOutput = generateCSV(headers, rows);

  // Check UTF-8 BOM (\uFEFF)
  assert(csvOutput.startsWith('\uFEFF'), 'CSV output begins with UTF-8 BOM (\\uFEFF) for Excel/Sheets compatibility');
  assert(csvOutput.includes('মিরপুর ১০'), 'CSV contains Bengali text unmodified');
  assert(csvOutput.includes('"ফার্মগেট, তেজগাঁও"'), 'CSV quotes cell containing Bengali comma');

  // ==========================================
  // Test 4: JSON Backup Schema Validation & Safety
  // ==========================================
  console.log('\nTesting Backup Validation & Data Safety...');

  // 4.1 Empty or invalid JSON string
  const emptyValidation = validateBackupJson('');
  assert(emptyValidation.isValid === false, 'Rejects empty backup string');

  const corruptJsonValidation = validateBackupJson('{ not valid json ');
  assert(corruptJsonValidation.isValid === false, 'Rejects corrupt JSON syntax with informative error');

  // 4.2 Missing "data" section
  const missingDataValidation = validateBackupJson(JSON.stringify({ appName: 'OMNI TRACKER' }));
  assert(missingDataValidation.isValid === false, 'Rejects backup with missing "data" container');

  // 4.3 Malformed expense items (missing amount or date)
  const malformedExpenseBackup = JSON.stringify({
    appName: 'OMNI TRACKER',
    version: '1.0.0',
    data: {
      expenses: [{ id: 'bad-1', category: 'Bus' }], // missing amount & date
      habits: [],
    },
  });
  const malformedExpResult = validateBackupJson(malformedExpenseBackup);
  assert(malformedExpResult.isValid === false, 'Detects malformed expense records missing required fields');

  // 4.4 Valid complete backup
  const validBackupObj: OmniBackupData = {
    appName: 'OMNI TRACKER',
    version: '1.0.0',
    schemaVersion: 1,
    exportedAt: '2026-10-10T12:00:00.000Z',
    recordCounts: {
      expenses: 2,
      habits: 1,
      completions: 1,
      budgets: 1,
      quickRoutes: 1,
    },
    data: {
      expenses: [
        {
          id: 'exp-valid-1',
          date: '2026-10-10',
          time: '12:00',
          amount: 80,
          currency: '৳',
          category: 'Rickshaw',
          fromLocation: 'ধানমন্ডি',
          toLocation: 'কারওয়ান বাজার',
          timestamp: Date.now(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          syncStatus: 'synced',
        },
      ],
      habits: [
        {
          id: 'habit-water',
          title: 'Drink 2.5L Water',
          category: 'health',
          icon: 'Droplets',
          color: '#38BDF8',
          active: true,
          targetDaysPerWeek: 7,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      completions: [
        {
          id: 'comp-1',
          habitId: 'habit-water',
          date: '2026-10-10',
          completedAt: new Date().toISOString(),
          syncStatus: 'synced',
        },
      ],
      budgets: [
        {
          month: '2026-10',
          budgetAmount: 25000,
          currency: '৳',
          updatedAt: new Date().toISOString(),
        },
      ],
      quickRoutes: [
        {
          id: 'route-1',
          fromLocation: 'Home',
          toLocation: 'Office',
          category: 'Rickshaw',
          typicalAmount: 80,
          usageCount: 12,
        },
      ],
    },
  };

  const validValidation = validateBackupJson(JSON.stringify(validBackupObj));
  assert(validValidation.isValid === true, 'Successfully validates complete OMNI TRACKER backup snapshot');
  assert(validValidation.parsedBackup?.data.expenses.length === 1, 'Correctly preserves expense count');
  assert(validValidation.parsedBackup?.data.habits.length === 1, 'Correctly preserves habit count');

  // 4.5 Future version warning check
  const futureVersionBackup = {
    ...validBackupObj,
    version: '3.2.0',
  };
  const futureValidation = validateBackupJson(JSON.stringify(futureVersionBackup));
  assert(futureValidation.isValid === true, 'Allows future version backup');
  assert(futureValidation.warnings.length > 0, 'Issues compatibility warning for higher major version');

  console.log(`\n🎉 ALL TESTS PASSED! (${passedTests} / ${totalTests} assertions passed)`);
}

runTests().catch(err => {
  console.error('\nTest runner failed:', err);
  process.exit(1);
});
