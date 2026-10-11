import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  X, 
  Plus, 
  Check, 
  Flame, 
  Sparkles, 
  ArrowRight,
  Droplets,
  Activity,
  BookOpen,
  Code,
  Moon,
  AlertCircle
} from 'lucide-react';
import { db, toggleHabitCompletion, addHabit } from '../../database/db';
import { getLocalDateString, formatHumanDate, calculateHabitStreak } from '../../utils/dateUtils';
import type { Habit, HabitCompletion } from '../../types';

interface QuickHabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFullHabits: () => void;
  onHabitUpdated?: () => void;
  theme: 'dark' | 'light';
}

const ICON_MAP: Record<string, React.ElementType> = {
  Droplets,
  Activity,
  BookOpen,
  Code,
  Moon,
  Sparkles,
};

export const QuickHabitModal: React.FC<QuickHabitModalProps> = ({
  isOpen,
  onClose,
  onOpenFullHabits,
  onHabitUpdated,
  theme,
}) => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<HabitCompletion[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [showAddInput, setShowAddInput] = useState(false);
  const [togglingHabitId, setTogglingHabitId] = useState<string | null>(null);

  const todayStr = getLocalDateString();

  const loadData = async () => {
    const all = await db.habits.toArray();
    const activeHabits = all.filter(h => h.active !== false);
    const allCompletions = await db.habitCompletions.toArray();
    setHabits(activeHabits);
    setCompletions(allCompletions);
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      setShowAddInput(false);
      setNewTitle('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const todayCompletions = completions.filter(c => c.date === todayStr);
  const completedSet = new Set(todayCompletions.map(c => c.habitId));
  const completedCount = habits.filter(h => completedSet.has(h.id)).length;
  const progressPercent = habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0;

  const handleToggle = async (habitId: string) => {
    if (togglingHabitId === habitId) return; // Prevent double tap glitch
    setTogglingHabitId(habitId);

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(25); } catch {}
    }

    try {
      await toggleHabitCompletion(habitId, todayStr);
      await loadData();
      onHabitUpdated?.();
    } finally {
      setTogglingHabitId(null);
    }
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    await addHabit({
      title: newTitle.trim(),
      category: 'health',
      icon: 'Sparkles',
      color: '#22C58B',
      targetDaysPerWeek: 7,
      active: true,
    });

    setNewTitle('');
    setShowAddInput(false);
    await loadData();
    onHabitUpdated?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-md p-0 sm:p-4 overflow-y-auto">
      <div className="glass-panel w-full sm:max-w-md rounded-t-[2.2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200 max-h-[92vh] flex flex-col">
        
        {/* Grab Handle for Android bottom sheet */}
        <div className="sm:hidden w-12 h-1.5 rounded-full mx-auto mt-2.5 bg-slate-300 dark:bg-white/20" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-3 pb-3 border-b border-slate-200/70 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#22C58B]/20 text-[#16A34A] dark:text-[#22C58B] flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Quick Habit Checklist</h2>
              <p className="text-[11px] text-slate-500 dark:text-[#9FA2AC]">
                {formatHumanDate(todayStr)} · {completedCount} of {habits.length} done ({progressPercent}%)
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

        {/* Progress Bar */}
        <div className="w-full h-1.5 overflow-hidden bg-slate-200 dark:bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-[#22C58B] transition-all duration-300 shadow-xs"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Habit List */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1">
          {habits.length > 0 ? (
            habits.map((habit) => {
              const isDone = completedSet.has(habit.id);
              const Icon = ICON_MAP[habit.icon] || Sparkles;

              // Calculate habit streak info
              const habitDates = completions.filter(c => c.habitId === habit.id).map(c => c.date);
              const streak = calculateHabitStreak(habitDates, todayStr);

              return (
                <button
                  key={habit.id}
                  onClick={() => handleToggle(habit.id)}
                  disabled={togglingHabitId === habit.id}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all active:scale-98 min-h-[54px] cursor-pointer ${
                    isDone
                      ? 'bg-[#22C58B]/15 border-[#22C58B]/45 text-slate-900 dark:text-white shadow-sm shadow-[#22C58B]/20'
                      : 'glass-panel-subtle text-slate-600 dark:text-[#9FA2AC] hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                      isDone 
                        ? 'bg-[#22C58B] text-white shadow-sm ring-2 ring-[#22C58B]/30' 
                        : 'border-2 border-slate-300 dark:border-white/20 bg-transparent'
                    }`}>
                      {isDone ? (
                        <Check className="w-4 h-4 stroke-[3]" />
                      ) : (
                        <Icon className="w-3.5 h-3.5 text-slate-400 dark:text-white/50" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs sm:text-sm font-semibold truncate block ${
                          isDone 
                            ? 'line-through opacity-75' 
                            : 'text-slate-900 dark:text-white'
                        }`}>
                          {habit.title}
                        </span>
                      </div>
                      {habit.description && (
                        <span className="text-[10px] truncate block text-slate-500 dark:text-[#9FA2AC]">
                          {habit.description}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right badges: Streak Fire & Category Pill */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {streak.currentStreak > 0 && (
                      <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-500 border border-amber-500/30">
                        <Flame className="w-3 h-3 fill-amber-500" />
                        <span>{streak.currentStreak}</span>
                      </span>
                    )}
                    <span
                      className="w-2.5 h-2.5 rounded-full shadow-xs"
                      style={{ backgroundColor: habit.color || '#22C58B' }}
                    />
                  </div>
                </button>
              );
            })
          ) : (
            <div className="py-8 text-center text-xs text-slate-500 dark:text-[#9FA2AC]">
              No active habits found. Add your first habit below!
            </div>
          )}

          {/* Quick Add Form Inline */}
          {showAddInput ? (
            <form onSubmit={handleQuickAdd} className="mt-3 p-3 rounded-2xl border flex gap-2 glass-panel-subtle border-[#22C58B]/40">
              <input
                type="text"
                autoFocus
                placeholder="e.g. Read 15 mins, Meditate..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="glass-input flex-1 px-3 py-2 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/40"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-xl bg-[#22C58B] text-white font-bold text-xs hover:brightness-110 active:scale-95 transition shadow-sm cursor-pointer"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setShowAddInput(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:text-[#9FA2AC] dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <button
              onClick={() => setShowAddInput(true)}
              className="w-full mt-2 py-2.5 px-3 rounded-2xl border border-dashed border-slate-300 dark:border-white/15 text-slate-500 dark:text-[#9FA2AC] hover:border-[#22C58B]/50 hover:text-[#16A34A] dark:hover:text-[#22C58B] text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add Quick Habit</span>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200/70 dark:border-white/10 flex items-center justify-between">
          <button
            onClick={() => {
              onClose();
              onOpenFullHabits();
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#16A34A] dark:text-[#22C58B] hover:underline cursor-pointer"
          >
            <span>View Full Streaks & Calendar</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-white dark:hover:bg-white/15 transition active:scale-95 cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
