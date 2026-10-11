/**
 * Utility functions for local dates, times, and timezone-safe date arithmetic.
 * Avoids UTC mismatch bugs where new Date().toISOString() returns yesterday or tomorrow's UTC date.
 */

export function getLocalDateString(input?: Date | string | number): string {
  let date: Date;
  if (!input) {
    date = new Date();
  } else if (input instanceof Date) {
    date = input;
  } else if (typeof input === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      return input;
    }
    date = new Date(input);
  } else {
    date = new Date(input);
  }

  if (isNaN(date.getTime())) {
    date = new Date();
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getLocalTimeString(date: Date = new Date()): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function getLocalMonthString(input?: Date | string | number): string {
  let date: Date;
  if (!input) {
    date = new Date();
  } else if (input instanceof Date) {
    date = input;
  } else if (typeof input === 'string') {
    if (/^\d{4}-\d{2}/.test(input)) {
      return input.substring(0, 7);
    }
    date = new Date(input);
  } else {
    date = new Date(input);
  }

  if (isNaN(date.getTime())) {
    date = new Date();
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function getPreviousMonthString(input?: Date | string | number): string {
  let date: Date;
  if (!input) {
    date = new Date();
  } else if (input instanceof Date) {
    date = input;
  } else if (typeof input === 'string' && /^\d{4}-\d{2}/.test(input)) {
    const [y, m] = input.substring(0, 7).split('-').map(Number);
    date = new Date(y, m - 1, 1);
  } else {
    date = new Date(input);
  }

  const prev = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  return getLocalMonthString(prev);
}

/**
 * Parses YYYY-MM-DD into a local Date object anchored at 12:00 PM (noon).
 * Anchoring at noon prevents Daylight Saving Time (DST) 1-hour shifts
 * from changing the calendar date when adding/subtracting days.
 */
export function parseLocalDateNoon(dateStr: string): Date {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date();
  }
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function formatHumanDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = parseLocalDateNoon(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

/**
 * Checks if a YYYY-MM-DD date is within the past N calendar days.
 * Timezone-safe: uses date string comparisons and noon-anchored steps.
 */
export function isDateInPastDays(dateStr: string, days: number = 7, referenceDateStr?: string): boolean {
  if (!dateStr) return false;
  const todayStr = referenceDateStr || getLocalDateString();
  if (dateStr > todayStr) return false;

  const refDate = parseLocalDateNoon(todayStr);
  refDate.setDate(refDate.getDate() - (days - 1));
  const pastCutoffStr = getLocalDateString(refDate);

  return dateStr >= pastCutoffStr;
}

/**
 * Calculates consecutive-day streak and all-time longest streak for a habit.
 * Fully timezone-safe: uses local date strings and noon anchoring.
 */
export function calculateHabitStreak(
  completedDateStrings: string[],
  todayStr: string = getLocalDateString()
): { currentStreak: number; longestStreak: number; completedToday: boolean; isCompletedToday: boolean } {
  if (!completedDateStrings || completedDateStrings.length === 0) {
    return { currentStreak: 0, longestStreak: 0, completedToday: false, isCompletedToday: false };
  }

  // De-duplicate dates
  const dateSet = new Set(completedDateStrings.filter(Boolean));
  const completedToday = dateSet.has(todayStr);

  // Calculate current streak
  let currentStreak = 0;
  const checkDate = parseLocalDateNoon(todayStr);

  if (completedToday) {
    currentStreak = 1;
    checkDate.setDate(checkDate.getDate() - 1);
  } else {
    // If not completed today, check if yesterday was completed
    checkDate.setDate(checkDate.getDate() - 1);
    const yesterdayStr = getLocalDateString(checkDate);
    if (dateSet.has(yesterdayStr)) {
      currentStreak = 1;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      currentStreak = 0;
    }
  }

  if (currentStreak > 0) {
    while (true) {
      const dateStr = getLocalDateString(checkDate);
      if (dateSet.has(dateStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Calculate longest streak across all completed dates
  const sortedDates = Array.from(dateSet).sort();
  let longestStreak = 0;
  let tempStreak = 0;
  let previousDate: Date | null = null;

  for (const dStr of sortedDates) {
    const curDate = parseLocalDateNoon(dStr);
    if (!previousDate) {
      tempStreak = 1;
    } else {
      const expectedNext = new Date(previousDate);
      expectedNext.setDate(expectedNext.getDate() + 1);
      const expectedNextStr = getLocalDateString(expectedNext);

      if (dStr === expectedNextStr) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    }
    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }
    previousDate = curDate;
  }

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    completedToday,
    isCompletedToday: completedToday,
  };
}

