/**
 * IndexedDB Integration Test Suite for OMNI TRACKER
 * Uses fake-indexeddb to run real Dexie transactions in Node.js
 */

import 'fake-indexeddb/auto';
import { 
  db, 
  initializeDatabase, 
  addExpense, 
  updateExpense, 
  deleteExpense, 
  toggleHabitCompletion, 
  addHabit, 
  getActiveHabits, 
  archiveHabit, 
  unarchiveHabit, 
  deleteHabit,
  setMonthlyBudget, 
  getMonthlyBudget, 
  exportDatabaseBackup 
} from '../src/database/db';

import { 
  validateBackupJson, 
  inspectBackupAgainstDatabase, 
  executeBackupRestore 
} from '../src/utils/backupUtils';

let passed = 0;
let total = 0;

function expect(condition: boolean, msg: string) {
  total++;
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
  passed++;
  console.log(`✅ PASSED: ${msg}`);
}

async function runIndexedDbTests() {
  console.log('--- STARTING INDEXEDDB INTEGRATION TESTS ---\n');

  // 1. Initialize Database
  console.log('Testing Database Initialization...');
  await initializeDatabase();
  const initialHabits = await db.habits.toArray();
  expect(initialHabits.length >= 5, `Database initialized with starter habits (count: ${initialHabits.length})`);
  const initialRoutes = await db.quickRoutes.toArray();
  expect(initialRoutes.length >= 3, `Database initialized with Dhaka commute routes (count: ${initialRoutes.length})`);

  // 2. Expense Lifecycle & Quick Route Frequency
  console.log('\nTesting Expense Lifecycle & Frequency Tracking...');
  const newExp = await addExpense({
    date: '2026-10-10',
    time: '14:30',
    amount: 120,
    currency: '৳',
    category: 'Rickshaw',
    fromLocation: 'Mirpur 10',
    toLocation: 'Farmgate',
    note: 'Office commute',
    timestamp: Date.now(),
  });
  expect(typeof newExp.id === 'string', 'Created expense with unique ID');

  const fetchedExp = await db.expenses.get(newExp.id);
  expect(fetchedExp?.amount === 120, 'Fetched expense matching amount 120');

  // Verify route usage count increased
  const matchingRoute = await db.quickRoutes
    .where('fromLocation')
    .equalsIgnoreCase('Mirpur 10')
    .and(r => r.toLocation.toLowerCase() === 'farmgate')
    .first();
  expect(matchingRoute !== undefined && matchingRoute.usageCount >= 5, 'Quick route usage count automatically incremented');

  // Verify sync queue item added
  const syncItem = await db.syncQueue.where('entityId').equals(newExp.id).first();
  expect(syncItem !== undefined && syncItem.status === 'pending', 'Expense safely queued for sync in local storage');

  // Update expense
  await updateExpense(newExp.id, { amount: 140, note: 'Updated with tip' });
  const updatedExp = await db.expenses.get(newExp.id);
  expect(updatedExp?.amount === 140 && updatedExp?.note === 'Updated with tip', 'Expense successfully updated in IndexedDB');

  // 3. Habit Lifecycle & Duplicate Prevention
  console.log('\nTesting Habit Lifecycle & Completion Uniqueness...');
  const customHabit = await addHabit({
    title: 'Evening Run',
    description: '3km park jog',
    category: 'fitness',
    icon: 'Activity',
    color: '#22C58B',
    active: true,
    targetDaysPerWeek: 4,
  });
  expect(customHabit.title === 'Evening Run', 'Created custom habit');

  const activeHabitsList = await getActiveHabits();
  expect(activeHabitsList.some(h => h.id === customHabit.id), 'getActiveHabits returns custom habit');

  // Toggle completion ON
  const completedToday = await toggleHabitCompletion(customHabit.id, '2026-10-10', 'Good pace');
  expect(completedToday === true, 'Toggled completion ON for 2026-10-10');

  const compCount = await db.habitCompletions
    .where('[habitId+date]')
    .equals([customHabit.id, '2026-10-10'])
    .count();
  expect(compCount === 1, 'Exactly 1 completion record exists for habitId + date');

  // Attempting second completion on same day toggles OFF (Undo)
  const undone = await toggleHabitCompletion(customHabit.id, '2026-10-10');
  expect(undone === false, 'Toggled completion OFF (Undo) for 2026-10-10');

  const compCountAfterUndo = await db.habitCompletions
    .where('[habitId+date]')
    .equals([customHabit.id, '2026-10-10'])
    .count();
  expect(compCountAfterUndo === 0, 'Completion record safely removed on undo');

  // Toggle back ON
  await toggleHabitCompletion(customHabit.id, '2026-10-10');

  // Archive habit
  await archiveHabit(customHabit.id);
  const activeAfterArchive = await getActiveHabits();
  expect(!activeAfterArchive.some(h => h.id === customHabit.id), 'Archived habit excluded from active list');

  // Unarchive habit
  await unarchiveHabit(customHabit.id);
  const activeAfterUnarchive = await getActiveHabits();
  expect(activeAfterUnarchive.some(h => h.id === customHabit.id), 'Unarchived habit restored to active list');

  // 4. Monthly Budgeting
  console.log('\nTesting Monthly Budget Persistence...');
  await setMonthlyBudget('2026-10', 30000, '৳');
  const budget = await getMonthlyBudget('2026-10');
  expect(budget?.budgetAmount === 30000 && budget?.currency === '৳', 'Saved and fetched October monthly budget of 30,000 ৳');

  // 5. JSON Backup Export & Inspection
  console.log('\nTesting Full JSON Backup Export & Inspection...');
  const jsonExport = await exportDatabaseBackup();
  const validation = validateBackupJson(jsonExport);
  expect(validation.isValid && validation.parsedBackup !== undefined, 'Exported database backup passes strict schema validation');
  expect(validation.parsedBackup!.data.expenses.length >= 1, 'Backup contains saved expenses');
  expect(validation.parsedBackup!.data.habits.length >= 5, 'Backup contains all habits');

  const inspectionReport = await inspectBackupAgainstDatabase(validation.parsedBackup!);
  expect(inspectionReport.entities.expenses.duplicateCount >= 1, 'Accurately detected matching local expense IDs in backup inspection');

  // 6. Restore Strategies (Merge vs Overwrite)
  console.log('\nTesting Restore Strategies...');

  // Create an artificial backup with 1 duplicate and 1 new expense
  const artificialBackup = JSON.parse(jsonExport);
  artificialBackup.data.expenses.push({
    id: 'exp_imported_new_99',
    date: '2026-10-09',
    amount: 55,
    currency: '৳',
    category: 'Bus',
    timestamp: Date.now(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    syncStatus: 'pending',
  });

  // Test Merge Mode (should add only the 1 new expense, not overwrite matching)
  const mergeResult = await executeBackupRestore(artificialBackup, 'merge');
  expect(mergeResult.success === true, 'Merge restore executed successfully');
  expect(mergeResult.restoredCounts.expensesAdded === 1, 'Merge mode added exactly 1 new expense and skipped duplicates');

  const importedExp = await db.expenses.get('exp_imported_new_99');
  expect(importedExp !== undefined && importedExp.amount === 55, 'Newly imported expense exists in database');

  // Clean up test expense
  await deleteExpense(newExp.id);
  const deletedCheck = await db.expenses.get(newExp.id);
  expect(deletedCheck === undefined, 'Deleted expense removed from IndexedDB');

  console.log(`\n🎉 ALL INDEXEDDB TESTS PASSED! (${passed} / ${total} assertions passed)`);
}

runIndexedDbTests().catch(err => {
  console.error('\nIndexedDB Test failed:', err);
  process.exit(1);
});
