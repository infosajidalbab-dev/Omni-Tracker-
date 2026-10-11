import Dexie, { type Table } from 'dexie';
import type { 
  Expense, 
  Habit, 
  HabitCompletion, 
  MonthlyBudget, 
  SyncQueueItem, 
  QuickRoute, 
  SyncLogEntry,
  RecurringExpense,
  HabitReminder,
  ExpenseTemplate
} from '../types';
import { calculateNextDueDate } from '../utils/recurringUtils';
import { getLocalDateString, getLocalTimeString } from '../utils/dateUtils';

export class OmniDatabase extends Dexie {
  expenses!: Table<Expense, string>;
  habits!: Table<Habit, string>;
  habitCompletions!: Table<HabitCompletion, string>;
  budgets!: Table<MonthlyBudget, string>;
  syncQueue!: Table<SyncQueueItem, string>;
  quickRoutes!: Table<QuickRoute, string>;
  syncLogs!: Table<SyncLogEntry, string>;
  recurringExpenses!: Table<RecurringExpense, string>;
  habitReminders!: Table<HabitReminder, string>;
  expenseTemplates!: Table<ExpenseTemplate, string>;

  constructor() {
    super('OmniTrackerDB');

    this.version(1).stores({
      expenses: 'id, date, category, syncStatus, timestamp, createdAt',
      habits: 'id, active, category, createdAt',
      habitCompletions: 'id, habitId, date, [habitId+date], syncStatus',
      budgets: 'month',
      syncQueue: 'id, entityType, entityId, status, createdAt',
      quickRoutes: 'id, fromLocation, toLocation, usageCount',
      syncLogs: 'id, timestamp, status'
    });

    this.version(2).stores({
      recurringExpenses: 'id, active, frequency, nextDueDate',
      habitReminders: 'id, habitId, enabled, time',
      expenseTemplates: 'id, usageCount, category'
    });
  }
}

export const db = new OmniDatabase();

// Default starter habits for new installations
export const DEFAULT_HABITS: Omit<Habit, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'habit-water',
    title: 'Drink 2.5L Water',
    description: 'Stay hydrated throughout the day',
    category: 'health',
    icon: 'Droplets',
    color: '#38BDF8',
    active: true,
    targetDaysPerWeek: 7,
  },
  {
    id: 'habit-exercise',
    title: 'Daily Exercise / Walk',
    description: 'At least 30 mins workout or walking',
    category: 'fitness',
    icon: 'Activity',
    color: '#22C58B',
    active: true,
    targetDaysPerWeek: 5,
  },
  {
    id: 'habit-read',
    title: 'Read 15 Pages',
    description: 'Read non-fiction or tech literature',
    category: 'learning',
    icon: 'BookOpen',
    color: '#A855F7',
    active: true,
    targetDaysPerWeek: 6,
  },
  {
    id: 'habit-study',
    title: 'Study / Upskill',
    description: 'Focused coding or professional work',
    category: 'learning',
    icon: 'Code',
    color: '#FF7628',
    active: true,
    targetDaysPerWeek: 5,
  },
  {
    id: 'habit-sleep',
    title: 'Sleep Before 11:30 PM',
    description: 'Ensure 7-8 hours quality rest',
    category: 'routine',
    icon: 'Moon',
    color: '#6366F1',
    active: true,
    targetDaysPerWeek: 7,
  },
];

// Initialize database with default habits if none exist
export async function initializeDatabase(): Promise<void> {
  try {
    const habitCount = await db.habits.count();
    if (habitCount === 0) {
      const now = new Date().toISOString();
      const initialHabits: Habit[] = DEFAULT_HABITS.map(h => ({
        ...h,
        createdAt: now,
        updatedAt: now,
      }));
      await db.habits.bulkAdd(initialHabits);
    }

    // Default quick routes for Dhaka commute if empty
    const routesCount = await db.quickRoutes.count();
    if (routesCount === 0) {
      await db.quickRoutes.bulkAdd([
        {
          id: 'route-1',
          fromLocation: 'Home',
          toLocation: 'Office / Campus',
          category: 'Rickshaw',
          typicalAmount: 60,
          usageCount: 5,
        },
        {
          id: 'route-2',
          fromLocation: 'Dhanmondi',
          toLocation: 'Gulshan',
          category: 'CNG',
          typicalAmount: 350,
          usageCount: 3,
        },
        {
          id: 'route-3',
          fromLocation: 'Mirpur 10',
          toLocation: 'Farmgate',
          category: 'Bus',
          typicalAmount: 30,
          usageCount: 4,
        },
      ]);
    }
  } catch (error) {
    console.error('Failed to initialize default database records:', error);
  }
}

// ---------------- Database Helper Operations ----------------

export async function addExpense(expenseData: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>): Promise<Expense> {
  const now = new Date().toISOString();
  const id = 'exp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  
  const expense: Expense = {
    ...expenseData,
    id,
    createdAt: now,
    updatedAt: now,
    syncStatus: 'pending',
  };

  await db.transaction('rw', db.expenses, db.quickRoutes, db.syncQueue, async () => {
    await db.expenses.add(expense);

    // Update quick route frequency if origin & destination provided
    if (expense.fromLocation?.trim() && expense.toLocation?.trim()) {
      const from = expense.fromLocation.trim();
      const to = expense.toLocation.trim();
      const existing = await db.quickRoutes
        .where('fromLocation')
        .equalsIgnoreCase(from)
        .and(r => r.toLocation.toLowerCase() === to.toLowerCase())
        .first();

      if (existing) {
        await db.quickRoutes.update(existing.id, {
          usageCount: existing.usageCount + 1,
          typicalAmount: expense.amount,
          category: expense.category,
        });
      } else {
        await db.quickRoutes.add({
          id: 'route_' + Date.now(),
          fromLocation: from,
          toLocation: to,
          category: expense.category,
          typicalAmount: expense.amount,
          usageCount: 1,
        });
      }
    }

    // Queue for sync
    await db.syncQueue.add({
      id: 'sync_' + id,
      entityType: 'expense',
      entityId: id,
      action: 'create',
      payload: expense,
      status: 'pending',
      retryCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  });

  return expense;
}

export async function updateExpense(id: string, updates: Partial<Omit<Expense, 'id' | 'createdAt'>>): Promise<void> {
  const now = new Date().toISOString();
  const existing = await db.expenses.get(id);
  if (!existing) throw new Error('Expense not found');

  const updated: Expense = {
    ...existing,
    ...updates,
    updatedAt: now,
    syncStatus: 'pending',
  };

  await db.transaction('rw', db.expenses, db.syncQueue, async () => {
    await db.expenses.put(updated);
    await db.syncQueue.add({
      id: 'sync_' + id + '_' + Date.now(),
      entityType: 'expense',
      entityId: id,
      action: 'update',
      payload: updated,
      status: 'pending',
      retryCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  });
}

export async function deleteExpense(id: string): Promise<void> {
  const now = new Date().toISOString();
  await db.transaction('rw', db.expenses, db.syncQueue, async () => {
    await db.expenses.delete(id);
    await db.syncQueue.add({
      id: 'sync_del_' + id + '_' + Date.now(),
      entityType: 'expense',
      entityId: id,
      action: 'delete',
      payload: { id },
      status: 'pending',
      retryCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  });
}

export async function toggleHabitCompletion(habitId: string, date: string, note?: string): Promise<boolean> {
  const now = new Date().toISOString();
  let completed = false;

  await db.transaction('rw', db.habitCompletions, db.syncQueue, async () => {
    // Check inside transaction to prevent race conditions & duplicate records
    const existing = await db.habitCompletions
      .where('[habitId+date]')
      .equals([habitId, date])
      .first();

    if (existing) {
      // Undo completion
      await db.habitCompletions.delete(existing.id);
      await db.syncQueue.add({
        id: 'sync_hcomp_del_' + existing.id + '_' + Date.now(),
        entityType: 'habitCompletion',
        entityId: existing.id,
        action: 'delete',
        payload: { id: existing.id, habitId, date },
        status: 'pending',
        retryCount: 0,
        createdAt: now,
        updatedAt: now,
      });
      completed = false;
    } else {
      // Add completion
      const id = 'hcomp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const completion: HabitCompletion = {
        id,
        habitId,
        date,
        completedAt: now,
        note,
        syncStatus: 'pending',
      };

      await db.habitCompletions.add(completion);
      await db.syncQueue.add({
        id: 'sync_' + id,
        entityType: 'habitCompletion',
        entityId: id,
        action: 'create',
        payload: completion,
        status: 'pending',
        retryCount: 0,
        createdAt: now,
        updatedAt: now,
      });
      completed = true;
    }
  });

  return completed;
}

export async function addHabit(habitData: Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>): Promise<Habit> {
  const now = new Date().toISOString();
  const id = 'habit_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const habit: Habit = {
    ...habitData,
    id,
    createdAt: now,
    updatedAt: now,
  };

  await db.transaction('rw', db.habits, db.syncQueue, async () => {
    await db.habits.add(habit);
    await db.syncQueue.add({
      id: 'sync_' + id,
      entityType: 'habit',
      entityId: id,
      action: 'create',
      payload: habit,
      status: 'pending',
      retryCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  });

  return habit;
}

export async function updateHabit(id: string, updates: Partial<Omit<Habit, 'id' | 'createdAt'>>): Promise<void> {
  const now = new Date().toISOString();
  const existing = await db.habits.get(id);
  if (!existing) throw new Error('Habit not found');

  const updated: Habit = {
    ...existing,
    ...updates,
    updatedAt: now,
  };

  await db.transaction('rw', db.habits, db.syncQueue, async () => {
    await db.habits.put(updated);
    await db.syncQueue.add({
      id: 'sync_' + id + '_' + Date.now(),
      entityType: 'habit',
      entityId: id,
      action: 'update',
      payload: updated,
      status: 'pending',
      retryCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  });
}

export async function archiveHabit(id: string): Promise<void> {
  await updateHabit(id, { active: false });
}

export async function unarchiveHabit(id: string): Promise<void> {
  await updateHabit(id, { active: true });
}

export async function getActiveHabits(): Promise<Habit[]> {
  const all = await db.habits.toArray();
  return all.filter(h => h.active !== false);
}

export async function getAllHabits(): Promise<Habit[]> {
  return await db.habits.toArray();
}

export async function deleteHabit(id: string): Promise<void> {
  // Archive by default or delete
  await db.transaction('rw', db.habits, db.habitCompletions, db.syncQueue, async () => {
    await db.habits.delete(id);
    await db.habitCompletions.where('habitId').equals(id).delete();
    await db.syncQueue.add({
      id: 'sync_del_' + id,
      entityType: 'habit',
      entityId: id,
      action: 'delete',
      payload: { id },
      status: 'pending',
      retryCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });
}

export async function getMonthlyBudget(month: string): Promise<MonthlyBudget | undefined> {
  return await db.budgets.where('month').equals(month).first();
}

export async function setMonthlyBudget(month: string, budgetAmount: number, currency = 'BDT'): Promise<void> {
  const existing = await db.budgets.where('month').equals(month).first();
  const now = new Date().toISOString();

  if (existing) {
    await db.budgets.update(month, { budgetAmount, currency, updatedAt: now });
  } else {
    await db.budgets.put({
      month,
      budgetAmount,
      currency,
      updatedAt: now,
    });
  }
}

// Full JSON Backup Export
export async function exportDatabaseBackup(): Promise<string> {
  const expenses = await db.expenses.toArray();
  const habits = await db.habits.toArray();
  const completions = await db.habitCompletions.toArray();
  const budgets = await db.budgets.toArray();
  const quickRoutes = await db.quickRoutes.toArray();
  const recurringExpenses = await db.recurringExpenses.toArray();
  const habitReminders = await db.habitReminders.toArray();
  const expenseTemplates = await db.expenseTemplates.toArray();

  const backupData = {
    appName: 'OMNI TRACKER',
    version: '1.0.0',
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    recordCounts: {
      expenses: expenses.length,
      habits: habits.length,
      completions: completions.length,
      budgets: budgets.length,
      quickRoutes: quickRoutes.length,
      recurringExpenses: recurringExpenses.length,
      habitReminders: habitReminders.length,
      expenseTemplates: expenseTemplates.length,
    },
    data: {
      expenses,
      habits,
      completions,
      budgets,
      quickRoutes,
      recurringExpenses,
      habitReminders,
      expenseTemplates,
    },
  };

  return JSON.stringify(backupData, null, 2);
}

// Restore Database from JSON
export async function importDatabaseBackup(jsonString: string): Promise<{ success: boolean; message: string; count: number }> {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed.data || (!Array.isArray(parsed.data.expenses) && !Array.isArray(parsed.data.habits))) {
      throw new Error('Invalid OMNI TRACKER backup format');
    }

    let count = 0;
    await db.transaction('rw', [
      db.expenses, 
      db.habits, 
      db.habitCompletions, 
      db.budgets, 
      db.quickRoutes,
      db.recurringExpenses,
      db.habitReminders,
      db.expenseTemplates
    ], async () => {
      if (Array.isArray(parsed.data.expenses) && parsed.data.expenses.length > 0) {
        await db.expenses.bulkPut(parsed.data.expenses);
        count += parsed.data.expenses.length;
      }
      if (Array.isArray(parsed.data.habits) && parsed.data.habits.length > 0) {
        await db.habits.bulkPut(parsed.data.habits);
        count += parsed.data.habits.length;
      }
      if (Array.isArray(parsed.data.completions) && parsed.data.completions.length > 0) {
        await db.habitCompletions.bulkPut(parsed.data.completions);
        count += parsed.data.completions.length;
      }
      if (Array.isArray(parsed.data.budgets) && parsed.data.budgets.length > 0) {
        await db.budgets.bulkPut(parsed.data.budgets);
      }
      if (Array.isArray(parsed.data.quickRoutes) && parsed.data.quickRoutes.length > 0) {
        await db.quickRoutes.bulkPut(parsed.data.quickRoutes);
      }
      if (Array.isArray(parsed.data.recurringExpenses) && parsed.data.recurringExpenses.length > 0) {
        await db.recurringExpenses.bulkPut(parsed.data.recurringExpenses);
      }
      if (Array.isArray(parsed.data.habitReminders) && parsed.data.habitReminders.length > 0) {
        await db.habitReminders.bulkPut(parsed.data.habitReminders);
      }
      if (Array.isArray(parsed.data.expenseTemplates) && parsed.data.expenseTemplates.length > 0) {
        await db.expenseTemplates.bulkPut(parsed.data.expenseTemplates);
      }
    });

    return { success: true, message: 'Database successfully imported', count };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to import backup', count: 0 };
  }
}

// Safe database wipe
export async function resetDatabase(): Promise<void> {
  await db.transaction('rw', [
    db.expenses, 
    db.habits, 
    db.habitCompletions, 
    db.budgets, 
    db.syncQueue, 
    db.quickRoutes, 
    db.syncLogs,
    db.recurringExpenses,
    db.habitReminders,
    db.expenseTemplates
  ], async () => {
    await db.expenses.clear();
    await db.habits.clear();
    await db.habitCompletions.clear();
    await db.budgets.clear();
    await db.syncQueue.clear();
    await db.quickRoutes.clear();
    await db.syncLogs.clear();
    await db.recurringExpenses.clear();
    await db.habitReminders.clear();
    await db.expenseTemplates.clear();
  });
  await initializeDatabase();
}

// --- Phase 3: Quick Log, Distinct Expenses, Recurring & Reminders ---

/**
 * Returns distinct recent expenses for fast 1-tap repeats.
 */
export async function getRecentDistinctExpenses(limit = 6): Promise<Expense[]> {
  const all = await db.expenses.orderBy('timestamp').reverse().limit(40).toArray();
  const seen = new Set<string>();
  const distinct: Expense[] = [];

  for (const exp of all) {
    const key = `${exp.category}_${exp.fromLocation || ''}_${exp.toLocation || ''}_${exp.amount}`;
    if (!seen.has(key)) {
      seen.add(key);
      distinct.push(exp);
      if (distinct.length >= limit) break;
    }
  }
  return distinct;
}

/**
 * Recurring Expenses Management
 */
export async function addRecurringExpense(
  data: Omit<RecurringExpense, 'id' | 'createdAt' | 'updatedAt'>
): Promise<RecurringExpense> {
  const now = new Date().toISOString();
  const id = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const item: RecurringExpense = {
    ...data,
    id,
    createdAt: now,
    updatedAt: now,
  };
  await db.recurringExpenses.put(item);
  return item;
}

export async function updateRecurringExpense(
  id: string,
  updates: Partial<RecurringExpense>
): Promise<void> {
  const now = new Date().toISOString();
  await db.recurringExpenses.update(id, {
    ...updates,
    updatedAt: now,
  });
}

export async function deleteRecurringExpense(id: string): Promise<void> {
  await db.recurringExpenses.delete(id);
}

export async function getRecurringExpenses(): Promise<RecurringExpense[]> {
  return await db.recurringExpenses.toArray();
}

/**
 * Executes due recurring entries while strictly preventing duplicates upon app reopen.
 */
export async function processDueRecurringExpenses(
  todayStr: string = getLocalDateString()
): Promise<{ generatedCount: number; generatedExpenses: Expense[] }> {
  const allRecurring = await db.recurringExpenses.toArray();
  const activeList = allRecurring.filter(r => r.active);
  const generatedExpenses: Expense[] = [];

  for (const rec of activeList) {
    // Check if nextDueDate is reached or passed, and not already generated today
    if (rec.nextDueDate <= todayStr && rec.lastGeneratedDate !== todayStr) {
      const marker = `[REC:${rec.id}]`;
      const alreadyLogged = await db.expenses
        .where('date')
        .equals(todayStr)
        .filter(e => (e.note || '').includes(marker))
        .first();

      if (alreadyLogged) {
        // Already created for this cycle, bump dates cleanly
        const nextDue = calculateNextDueDate(todayStr, rec.frequency);
        await db.recurringExpenses.update(rec.id, {
          lastGeneratedDate: todayStr,
          nextDueDate: nextDue,
          updatedAt: new Date().toISOString(),
        });
        continue;
      }

      // Generate the actual expense
      const timeStr = getLocalTimeString();
      const timestamp = Date.now();
      const generatedExp = await addExpense({
        amount: rec.amount,
        currency: rec.currency || '৳',
        category: rec.category,
        fromLocation: rec.fromLocation,
        toLocation: rec.toLocation,
        note: rec.note ? `${rec.note} ${marker}` : `${rec.title} ${marker}`,
        date: todayStr,
        time: timeStr,
        timestamp,
      });

      const nextDue = calculateNextDueDate(todayStr, rec.frequency);
      await db.recurringExpenses.update(rec.id, {
        lastGeneratedDate: todayStr,
        nextDueDate: nextDue,
        updatedAt: new Date().toISOString(),
      });

      generatedExpenses.push(generatedExp);
    }
  }

  return { generatedCount: generatedExpenses.length, generatedExpenses };
}

/**
 * Habit Reminders Management
 */
export async function addHabitReminder(
  data: Omit<HabitReminder, 'id' | 'createdAt' | 'updatedAt'>
): Promise<HabitReminder> {
  const now = new Date().toISOString();
  const id = `rem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const item: HabitReminder = {
    ...data,
    id,
    createdAt: now,
    updatedAt: now,
  };
  await db.habitReminders.put(item);
  return item;
}

export async function updateHabitReminder(
  id: string,
  updates: Partial<HabitReminder>
): Promise<void> {
  const now = new Date().toISOString();
  await db.habitReminders.update(id, {
    ...updates,
    updatedAt: now,
  });
}

export async function deleteHabitReminder(id: string): Promise<void> {
  await db.habitReminders.delete(id);
}

export async function getHabitReminders(): Promise<HabitReminder[]> {
  return await db.habitReminders.toArray();
}

/**
 * Quick Expense Templates
 */
export async function addExpenseTemplate(
  data: Omit<ExpenseTemplate, 'id' | 'createdAt' | 'usageCount'>
): Promise<ExpenseTemplate> {
  const now = new Date().toISOString();
  const id = `tpl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const item: ExpenseTemplate = {
    ...data,
    id,
    usageCount: 1,
    createdAt: now,
  };
  await db.expenseTemplates.put(item);
  return item;
}

export async function getExpenseTemplates(): Promise<ExpenseTemplate[]> {
  return await db.expenseTemplates.orderBy('usageCount').reverse().toArray();
}

export async function incrementExpenseTemplateUsage(id: string): Promise<void> {
  const tpl = await db.expenseTemplates.get(id);
  if (tpl) {
    await db.expenseTemplates.update(id, { usageCount: (tpl.usageCount || 0) + 1 });
  }
}

export async function deleteExpenseTemplate(id: string): Promise<void> {
  await db.expenseTemplates.delete(id);
}

