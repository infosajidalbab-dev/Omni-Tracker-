import type { HabitReminder, Habit } from '../types';
import { getLocalDateString, getLocalTimeString } from './dateUtils';
import { db } from '../database/db';

type NotificationStatus = 'supported_granted' | 'supported_denied' | 'supported_default' | 'unsupported';

export class ReminderService {
  private checkIntervalId: any = null;
  private lastAlertedKeys = new Set<string>();

  public getNotificationStatus(): NotificationStatus {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    if (Notification.permission === 'granted') {
      return 'supported_granted';
    }
    if (Notification.permission === 'denied') {
      return 'supported_denied';
    }
    return 'supported_default';
  }

  public async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    try {
      const res = await Notification.requestPermission();
      return res === 'granted';
    } catch {
      return false;
    }
  }

  public startListener(onInAppReminder?: (habit: Habit, reminder: HabitReminder) => void) {
    if (this.checkIntervalId) return;

    // Check once immediately, then every 25 seconds
    this.checkReminders(onInAppReminder);
    this.checkIntervalId = setInterval(() => {
      this.checkReminders(onInAppReminder);
    }, 25000);
  }

  public stopListener() {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
  }

  public async checkReminders(onInAppReminder?: (habit: Habit, reminder: HabitReminder) => void) {
    try {
      const todayStr = getLocalDateString();
      const nowTimeStr = getLocalTimeString().slice(0, 5); // HH:mm
      const currentDayOfWeek = new Date().getDay(); // 0 = Sun, 1 = Mon ...

      const reminders = await db.habitReminders.toArray();
      const activeReminders = reminders.filter(r => r.enabled);

      if (activeReminders.length === 0) return;

      const habits = await db.habits.toArray();
      const habitMap = new Map(habits.map(h => [h.id, h]));

      // Check if already completed today
      const todayCompletions = await db.habitCompletions.where('date').equals(todayStr).toArray();
      const completedHabitIds = new Set(todayCompletions.map(c => c.habitId));

      for (const reminder of activeReminders) {
        // Match time
        if (reminder.time !== nowTimeStr) continue;

        // Match day of week if specified
        if (reminder.daysOfWeek && reminder.daysOfWeek.length > 0) {
          if (!reminder.daysOfWeek.includes(currentDayOfWeek)) continue;
        }

        // Skip if habit already completed today
        if (completedHabitIds.has(reminder.habitId)) continue;

        const habit = habitMap.get(reminder.habitId);
        if (!habit || habit.active === false) continue;

        // Deduplication key: reminderId + date + time
        const alertKey = `${reminder.id}_${todayStr}_${nowTimeStr}`;
        if (this.lastAlertedKeys.has(alertKey)) continue;
        this.lastAlertedKeys.add(alertKey);

        // Trigger notification
        this.triggerAlert(habit, reminder, onInAppReminder);
      }
    } catch (e) {
      console.warn('Reminder check failed:', e);
    }
  }

  private triggerAlert(habit: Habit, reminder: HabitReminder, onInAppReminder?: (habit: Habit, reminder: HabitReminder) => void) {
    // 1. In-app callback
    if (onInAppReminder) {
      onInAppReminder(habit, reminder);
    }

    // 2. System Browser Notification if granted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const notif = new Notification(`Reminder: ${habit.title}`, {
          body: habit.description || `It's time for your ${habit.title} habit streak!`,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: `habit_${habit.id}`,
          silent: false,
        });

        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      } catch (err) {
        console.warn('Could not launch system notification:', err);
      }
    }
  }
}

export const reminderService = new ReminderService();
