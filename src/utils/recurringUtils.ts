import type { RecurringExpense, RecurringFrequency } from '../types';
import { getLocalDateString } from './dateUtils';

/**
 * Calculates the next due date following a given ISO date (YYYY-MM-DD) based on frequency.
 */
export function calculateNextDueDate(fromDateStr: string, frequency: RecurringFrequency): string {
  const [yearStr, monthStr, dayStr] = fromDateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1; // 0-indexed
  const day = parseInt(dayStr, 10);

  const d = new Date(year, month, day, 12, 0, 0, 0);

  if (frequency === 'daily') {
    d.setDate(d.getDate() + 1);
  } else if (frequency === 'workdays') {
    // 0 = Sun, 1 = Mon ... 5 = Fri, 6 = Sat
    // Workdays in most regions: Monday - Friday (or Sun-Thu in BD)
    // Common standard workdays: Monday to Friday
    do {
      d.setDate(d.getDate() + 1);
    } while (d.getDay() === 0 || d.getDay() === 6);
  } else if (frequency === 'weekly') {
    d.setDate(d.getDate() + 7);
  } else if (frequency === 'monthly') {
    // Jump 1 month forward, preserving day of month (or clamped to last day)
    const targetMonth = d.getMonth() + 1;
    d.setMonth(targetMonth);
    // If target month overflowed (e.g. Jan 31 -> Feb 28), clamp back
    if (d.getMonth() > (targetMonth % 12)) {
      d.setDate(0); // last day of previous month
    }
  }

  return getLocalDateString(d);
}

/**
 * Evaluates whether a recurring template is due today or past due.
 */
export function isRecurringExpenseDue(
  template: RecurringExpense,
  todayStr: string = getLocalDateString()
): boolean {
  if (!template.active) return false;
  if (template.lastGeneratedDate === todayStr) return false;
  return template.nextDueDate <= todayStr;
}

/**
 * Formats a user-friendly label for a frequency.
 */
export function getFrequencyLabel(frequency: RecurringFrequency): string {
  switch (frequency) {
    case 'daily':
      return 'Every Day';
    case 'workdays':
      return 'Workdays (Mon–Fri)';
    case 'weekly':
      return 'Every Week';
    case 'monthly':
      return 'Every Month';
    default:
      return frequency;
  }
}
