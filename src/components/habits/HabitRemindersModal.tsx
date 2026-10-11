import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  BellOff, 
  Plus, 
  X, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Info, 
  Sparkles,
  Volume2,
  Calendar
} from 'lucide-react';
import { 
  db, 
  getHabitReminders, 
  addHabitReminder, 
  updateHabitReminder, 
  deleteHabitReminder 
} from '../../database/db';
import { reminderService } from '../../utils/reminderService';
import type { Habit, HabitReminder } from '../../types';

interface HabitRemindersModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'dark' | 'light';
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const HabitRemindersModal: React.FC<HabitRemindersModalProps> = ({
  isOpen,
  onClose,
  theme = 'dark',
}) => {
  const [reminders, setReminders] = useState<HabitReminder[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [notifStatus, setNotifStatus] = useState<string>('unsupported');
  const [showAddForm, setShowAddForm] = useState(false);
  const [testSent, setTestSent] = useState(false);

  // New Reminder Form state
  const [selectedHabitId, setSelectedHabitId] = useState<string>('');
  const [reminderTime, setReminderTime] = useState<string>('08:30');
  const [selectedDays, setSelectedDays] = useState<number[]>([]); // empty = everyday

  const loadData = async () => {
    const allReminders = await getHabitReminders();
    const allHabits = await db.habits.toArray();
    setReminders(allReminders);
    setHabits(allHabits.filter(h => h.active !== false));
    if (allHabits.length > 0 && !selectedHabitId) {
      setSelectedHabitId(allHabits[0].id);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      setNotifStatus(reminderService.getNotificationStatus());
      setShowAddForm(false);
      setTestSent(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    const granted = await reminderService.requestPermission();
    setNotifStatus(reminderService.getNotificationStatus());
  };

  const handleToggleReminder = async (id: string, currentEnabled: boolean) => {
    await updateHabitReminder(id, { enabled: !currentEnabled });
    await loadData();
  };

  const handleDeleteReminder = async (id: string) => {
    await deleteHabitReminder(id);
    await loadData();
  };

  const handleToggleDay = (dayIndex: number) => {
    if (selectedDays.includes(dayIndex)) {
      setSelectedDays(selectedDays.filter(d => d !== dayIndex));
    } else {
      setSelectedDays([...selectedDays, dayIndex].sort());
    }
  };

  const handleSaveReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHabitId || !reminderTime) return;

    await addHabitReminder({
      habitId: selectedHabitId,
      time: reminderTime,
      enabled: true,
      daysOfWeek: selectedDays,
    });

    setShowAddForm(false);
    setSelectedDays([]);
    await loadData();
  };

  const handleSendTestNotification = () => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('OMNI TRACKER Habit Reminder', {
          body: 'This is how your daily habit alerts will appear!',
          icon: '/favicon.ico',
        });
        setTestSent(true);
        setTimeout(() => setTestSent(false), 3000);
      } catch (err) {
        console.warn('Test notification failed:', err);
      }
    }
  };

  const habitMap = new Map(habits.map(h => [h.id, h]));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-md p-0 sm:p-4 overflow-y-auto">
      <div className="glass-panel w-full sm:max-w-lg rounded-t-[2.2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200 max-h-[92vh] flex flex-col">
        
        {/* Grab Handle */}
        <div className="sm:hidden w-12 h-1.5 rounded-full mx-auto mt-2.5 bg-slate-300 dark:bg-white/20" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-3.5 pb-3 border-b border-slate-200/70 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shadow-xs">
              <Bell className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Habit Reminders</h2>
              <p className="text-[11px] text-slate-500 dark:text-[#9FA2AC]">
                Scheduled alerts for maintaining daily streaks
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:text-[#9FA2AC] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition active:scale-90"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* Notification Permission Card */}
          <div className="glass-panel-subtle p-3.5 rounded-2xl space-y-2 border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#9FA2AC] flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-purple-400" />
                <span>Browser Notification Status</span>
              </span>

              {notifStatus === 'supported_granted' ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#22C58B]/20 text-[#22C58B] border border-[#22C58B]/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Enabled</span>
                </span>
              ) : notifStatus === 'supported_denied' ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1">
                  <BellOff className="w-3 h-3" />
                  <span>Blocked</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Permission Needed</span>
                </span>
              )}
            </div>

            {notifStatus !== 'supported_granted' && (
              <div className="pt-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <p className="text-xs text-slate-600 dark:text-[#9FA2AC]">
                  Allow notifications so your device can alert you at your scheduled habit times.
                </p>
                <button
                  onClick={handleRequestPermission}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition active:scale-95 whitespace-nowrap cursor-pointer"
                >
                  Enable Notifications
                </button>
              </div>
            )}

            {notifStatus === 'supported_granted' && (
              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-slate-500 dark:text-[#9FA2AC] text-[11px]">
                  Notifications are authorized on this device.
                </span>
                <button
                  onClick={handleSendTestNotification}
                  className="text-purple-400 hover:text-purple-300 font-bold text-xs underline cursor-pointer"
                >
                  {testSent ? '✓ Notification Sent!' : 'Send Test Alert'}
                </button>
              </div>
            )}

            {/* Honest Platform Limitation Notice */}
            <div className="flex items-start gap-2 p-2 rounded-xl bg-slate-200/50 dark:bg-white/5 text-[11px] text-slate-500 dark:text-[#9FA2AC]">
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-purple-400" />
              <span>
                <strong>Platform Notice:</strong> Web notifications trigger while OMNI TRACKER is open in a browser tab or installed as an active Android PWA. When completely closed, background triggers depend on your operating system's Web Push & service worker scheduling.
              </span>
            </div>
          </div>

          {/* Existing Reminders List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#9FA2AC]">
                Active Habit Reminders ({reminders.length})
              </span>
              {!showAddForm && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center gap-1 text-xs font-bold text-purple-400 hover:text-purple-300 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>New Reminder</span>
                </button>
              )}
            </div>

            {reminders.length > 0 ? (
              reminders.map((r) => {
                const habit = habitMap.get(r.habitId);
                const habitTitle = habit ? habit.title : 'Habit';
                const daysText = r.daysOfWeek.length === 0 
                  ? 'Daily' 
                  : r.daysOfWeek.map(d => DAY_LABELS[d]).join(', ');

                return (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-3 rounded-2xl glass-panel-subtle border text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center font-bold flex-shrink-0">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white truncate">
                            {habitTitle}
                          </span>
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white font-mono text-[11px] font-bold">
                            {r.time}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-[#9FA2AC] block truncate mt-0.5">
                          {daysText}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Toggle On/Off */}
                      <button
                        type="button"
                        onClick={() => handleToggleReminder(r.id, r.enabled)}
                        title={r.enabled ? 'Disable reminder' : 'Enable reminder'}
                        className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                          r.enabled ? 'bg-purple-600' : 'bg-slate-300 dark:bg-white/20'
                        }`}
                      >
                        <span
                          className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-xs transition-transform ${
                            r.enabled ? 'left-5' : 'left-1'
                          }`}
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteReminder(r.id)}
                        title="Delete reminder"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-6 text-center text-xs text-slate-500 dark:text-[#9FA2AC] glass-panel-subtle rounded-2xl border">
                No reminders scheduled yet. Tap "New Reminder" to set your first alert.
              </div>
            )}
          </div>

          {/* Add Reminder Form */}
          {showAddForm && (
            <form onSubmit={handleSaveReminder} className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between pb-1 border-b border-purple-500/20">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>Schedule Habit Alert</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Habit Picker */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-[#9FA2AC] mb-1">
                  Select Habit *
                </label>
                <select
                  value={selectedHabitId}
                  onChange={(e) => setSelectedHabitId(e.target.value)}
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs text-slate-900 dark:text-white bg-slate-900"
                >
                  {habits.map((h) => (
                    <option key={h.id} value={h.id} className="bg-slate-900 text-white">
                      {h.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Time Picker */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-[#9FA2AC] mb-1">
                  Reminder Time (HH:mm) *
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
                  <input
                    type="time"
                    required
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="glass-input w-full pl-9 pr-3 py-2 rounded-xl text-xs text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Days of Week Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-[#9FA2AC]">
                    Days of the Week
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {selectedDays.length === 0 ? 'Every Day' : `${selectedDays.length} selected`}
                  </span>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {DAY_LABELS.map((label, idx) => {
                    const isSelected = selectedDays.includes(idx);
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => handleToggleDay(idx)}
                        className={`py-1.5 rounded-lg text-[10px] font-bold transition active:scale-95 cursor-pointer text-center ${
                          isSelected
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'bg-white/50 dark:bg-white/5 text-slate-600 dark:text-[#9FA2AC] hover:bg-purple-500/20'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md active:scale-95 transition cursor-pointer"
                >
                  Save Reminder
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200/70 dark:border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-white dark:hover:bg-white/15 transition active:scale-95 cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
