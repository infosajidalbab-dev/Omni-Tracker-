/**
 * Production-grade CSV Export Utility.
 * Guarantees proper RFC-4180 compliance, quote escaping, comma handling,
 * and UTF-8 Byte Order Mark (BOM: \uFEFF) to ensure Microsoft Excel,
 * Google Sheets, LibreOffice, and mobile Android viewers correctly render
 * Bengali text (বাংলা লিপি), special symbols (৳, ৳/km), and Unicode strings.
 */

import type { Expense, Habit, HabitCompletion } from '../types';
import { getLocalDateString } from './dateUtils';

/**
 * Escapes a cell value according to RFC-4180.
 * Wraps in quotes if value contains comma, double quote, newline, or tab.
 * Double quotes inside the cell are doubled (" -> "").
 */
export function escapeCSVCell(value: any): string {
  if (value === null || value === undefined) {
    return '""';
  }

  const str = String(value);

  // If string contains quotes, commas, carriage returns or newlines, quote it properly
  if (/[",\r\n\t]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return `"${str}"`;
}

/**
 * Converts a table of headers and rows into a UTF-8 BOM CSV text string.
 */
export function generateCSV(headers: string[], rows: (string | number | undefined | null)[][]): string {
  const headerLine = headers.map(escapeCSVCell).join(',');
  const rowLines = rows.map(row => row.map(escapeCSVCell).join(','));

  // Prepend UTF-8 BOM (\uFEFF) to guarantee Excel / Sheets opens Unicode & Bengali characters cleanly
  return '\uFEFF' + [headerLine, ...rowLines].join('\r\n');
}

/**
 * Triggers browser download of CSV string.
 */
export function downloadCSVFile(csvContent: string, fileName: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports expenses array to CSV with Bengali character and special symbol support.
 */
export function exportExpensesToCSV(
  expenses: Expense[],
  currencySymbol: string = '৳',
  fileName?: string
): void {
  const todayStr = getLocalDateString();
  const name = fileName || `omni_expenses_${todayStr}.csv`;

  const headers = [
    'Expense ID',
    'Date (YYYY-MM-DD)',
    'Time',
    'Category',
    'Amount',
    'Currency',
    'From (Pickup / Route)',
    'To (Destination)',
    'Notes / Details',
    'Sync Status',
    'Created At',
  ];

  const rows = expenses.map(e => [
    e.id,
    e.date,
    e.time || '',
    e.category,
    e.amount,
    e.currency || currencySymbol,
    e.fromLocation || '',
    e.toLocation || '',
    e.note || '',
    e.syncStatus,
    e.createdAt,
  ]);

  const csv = generateCSV(headers, rows);
  downloadCSVFile(csv, name);
}

/**
 * Exports habits and habit completion logs to CSV.
 */
export function exportHabitsToCSV(
  habits: Habit[],
  completions: HabitCompletion[],
  fileName?: string
): void {
  const todayStr = getLocalDateString();
  const name = fileName || `omni_habits_log_${todayStr}.csv`;
  const habitMap = new Map(habits.map(h => [h.id, h]));

  const headers = [
    'Completion ID',
    'Habit ID',
    'Habit Name',
    'Category',
    'Target Days / Week',
    'Completion Date',
    'Completed Timestamp',
    'Status',
    'Notes',
  ];

  const rows = completions.map(c => {
    const habit = habitMap.get(c.habitId);
    return [
      c.id,
      c.habitId,
      habit?.title || 'Custom Habit',
      habit?.category || 'routine',
      habit?.targetDaysPerWeek ?? 7,
      c.date,
      c.completedAt || '',
      'Completed',
      c.note || '',
    ];
  });

  const csv = generateCSV(headers, rows);
  downloadCSVFile(csv, name);
}
