import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Plus, 
  Flame, 
  Calendar, 
  Trash2, 
  Edit3, 
  Archive, 
  Droplets, 
  Activity, 
  BookOpen, 
  Code, 
  Moon, 
  Sparkles,
  TrendingUp,
  X,
  Check,
  ChevronRight,
  Info,
  Bell
} from 'lucide-react';
import { 
  db, 
  toggleHabitCompletion, 
  addHabit, 
  updateHabit, 
  archiveHabit,
  unarchiveHabit,
  deleteHabit
} from '../../database/db';
import { getLocalDateString, calculateHabitStreak } from '../../utils/dateUtils';
import type { Habit, HabitCompletion } from '../../types';

interface HabitsViewProps {
  theme: 'dark' | 'light';
  onOpenReminders?: () => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Droplets,
  Activity,
  BookOpen,
  Code,
  Moon,
  Sparkles,
};

const COLOR_PALETTE = ['#38BDF8', '#22C58B', '#A855F7', '#FF7628', '#6366F1', '#EC4899', '#EAB308'];

export const HabitsView: React.FC<HabitsViewProps> = ({ theme, onOpenReminders }) => {
  const [activeHabits, setActiveHabits] = useState<Habit[]>([]);
  const [archivedHabits, setArchivedHabits] = useState<Habit[]>([]);
  const [tabFilter, setTabFilter] = useState<'active' | 'archived'>('active');
  const [completions, setCompletions] = useState<HabitCompletion[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [habitToDelete, setHabitToDelete] = useState<Habit | null>(null);

  // Form states
  const [habitTitle, setHabitTitle] = useState('');
  const [habitDesc, setHabitDesc] = useState('');
  const [habitCategory, setHabitCategory] = useState<'health' | 'fitness' | 'learning' | 'routine'>('health');
  const [habitIcon, setHabitIcon] = useState('Sparkles');
  const [habitColor, setHabitColor] = useState('#22C58B');
  const [targetDays, setTargetDays] = useState(7);

  const todayStr = getLocalDateString();

  const loadData = async () => {
    const all = await db.habits.toArray();
    const active = all.filter(h => h.active !== false);
    const archived = all.filter(h => h.active === false);
    const allCompletions = await db.habitCompletions.toArray();
    
    setActiveHabits(active);
    setArchivedHabits(archived);
    setCompletions(allCompletions);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggle = async (habitId: string, targetDate: string = todayStr) => {
    await toggleHabitCompletion(habitId, targetDate);
    await loadData();
  };

  // Calculate streak for a habit using tested timezone-safe utility
  const getHabitStreakInfo = (habitId: string) => {
    const habitDates = completions.filter(c => c.habitId === habitId).map(c => c.date);
    return calculateHabitStreak(habitDates, todayStr);
  };

  // Last 7 days dates for weekly calendar strip
  const last7Days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    last7Days.push(getLocalDateString(d));
  }

  // Open modal for add / edit
  const openEditModal = (h: Habit) => {
    setEditingHabit(h);
    setHabitTitle(h.title);
    setHabitDesc(h.description || '');
    setHabitCategory(h.category as any);
    setHabitIcon(h.icon || 'Sparkles');
    setHabitColor(h.color || '#22C58B');
    setTargetDays(h.targetDaysPerWeek || 7);
    setShowAddModal(true);
  };

  const openNewModal = () => {
    setEditingHabit(null);
    setHabitTitle('');
    setHabitDesc('');
    setHabitCategory('health');
    setHabitIcon('Sparkles');
    setHabitColor('#22C58B');
    setTargetDays(7);
    setShowAddModal(true);
  };

  const handleSaveHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!habitTitle.trim()) return;

    if (editingHabit) {
      await updateHabit(editingHabit.id, {
        title: habitTitle.trim(),
        description: habitDesc.trim(),
        category: habitCategory,
        icon: habitIcon,
        color: habitColor,
        targetDaysPerWeek: targetDays,
      });
    } else {
      await addHabit({
        title: habitTitle.trim(),
        description: habitDesc.trim(),
        category: habitCategory,
        icon: habitIcon,
        color: habitColor,
        targetDaysPerWeek: targetDays,
        active: true,
      });
    }

    setShowAddModal(false);
    await loadData();
  };

  const handleArchive = async (habitId: string) => {
    await archiveHabit(habitId);
    await loadData();
  };

  const handleUnarchive = async (habitId: string) => {
    await unarchiveHabit(habitId);
    await loadData();
  };

  const handleDeleteHabitConfirm = async () => {
    if (!habitToDelete) return;
    await deleteHabit(habitToDelete.id);
    setHabitToDelete(null);
    await loadData();
  };

  // Today metrics
  const completedTodaySet = new Set(
    completions.filter(c => c.date === todayStr).map(c => c.habitId)
  );
  const completedTodayCount = activeHabits.filter(h => completedTodaySet.has(h.id)).length;
  const todayPercentage = activeHabits.length > 0 ? Math.round((completedTodayCount / activeHabits.length) * 100) : 0;

  const currentDisplayList = tabFilter === 'active' ? activeHabits : archivedHabits;

  return (
    <div className="space-y-5 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white">
            Daily Habits & Streaks
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#9FA2AC]">
            Consistency compounds · Track daily routines and maintain consecutive streaks
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenReminders && (
            <button
              onClick={onOpenReminders}
              title="Configure habit notification reminders"
              className="flex items-center justify-center gap-1.5 py-2.5 px-3.5 rounded-xl glass-panel-subtle hover:border-purple-500/50 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm transition cursor-pointer active:scale-95"
            >
              <Bell className="w-4 h-4 text-purple-400" />
              <span className="hidden sm:inline">Reminders</span>
            </button>
          )}

          <button
            onClick={openNewModal}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#22C58B] to-[#34D399] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#22C58B]/25 hover:brightness-110 active:scale-95 transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New Habit</span>
          </button>
        </div>
      </div>

      {/* Hero Streak & Today Progress KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="glass-panel p-4 sm:p-5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#9FA2AC]">
            Today's Completion
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl sm:text-3xl font-black text-[#16A34A] dark:text-[#22C58B]">{todayPercentage}%</span>
            <span className="text-xs text-slate-500 dark:text-[#9FA2AC]">({completedTodayCount}/{activeHabits.length})</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-white/10 rounded-full h-1.5 mt-3 overflow-hidden">
            <div 
              className="h-1.5 rounded-full bg-gradient-to-r from-[#22C58B] to-[#34D399] transition-all duration-500" 
              style={{ width: `${todayPercentage}%` }} 
            />
          </div>
        </div>

        <div className="glass-panel p-4 sm:p-5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#9FA2AC]">
            Active Streaks
          </span>
          <div className="flex items-center gap-2 mt-2">
            <Flame className="w-6 h-6 text-[#FF7628] fill-[#FF7628]/30" />
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {activeHabits.filter(h => getHabitStreakInfo(h.id).currentStreak > 0).length} habits
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-[#9FA2AC] mt-2">Currently on active consecutive day streaks</p>
        </div>

        <div className="glass-panel p-4 sm:p-5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#9FA2AC]">
            Total Check-ins
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400">{completions.length}</span>
            <span className="text-xs text-slate-500 dark:text-[#9FA2AC]">recorded check-ins</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-[#9FA2AC] mt-2">All-time habit completions stored in IndexedDB</p>
        </div>
      </div>

      {/* Tabs: Active vs Archived */}
      <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTabFilter('active')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              tabFilter === 'active'
                ? 'bg-[#22C58B] text-white shadow-xs'
                : 'glass-panel-subtle text-slate-600 dark:text-[#9FA2AC] hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Active Habits ({activeHabits.length})
          </button>
          <button
            onClick={() => setTabFilter('archived')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              tabFilter === 'archived'
                ? 'bg-[#FF7628] text-white shadow-xs'
                : 'glass-panel-subtle text-slate-600 dark:text-[#9FA2AC] hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Archived ({archivedHabits.length})
          </button>
        </div>

        <span className="text-[11px] text-slate-500 dark:text-[#9FA2AC]">
          Tap circle to log today · Tap day dots for past week
        </span>
      </div>

      {/* Habits List */}
      <div className="space-y-3">
        {currentDisplayList.length > 0 ? (
          currentDisplayList.map((habit) => {
            const isCompletedToday = completedTodaySet.has(habit.id);
            const streakInfo = getHabitStreakInfo(habit.id);
            const Icon = ICON_MAP[habit.icon] || Sparkles;

            return (
              <div
                key={habit.id}
                className={`glass-panel-subtle p-4 transition group ${
                  isCompletedToday
                    ? 'border-[#22C58B]/45 bg-[#22C58B]/10 shadow-sm shadow-[#22C58B]/15'
                    : 'hover:border-slate-300 dark:hover:border-white/20'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  
                  {/* Left: Tap to Check / Uncheck + Habit info */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {tabFilter === 'active' ? (
                      <button
                        onClick={() => handleToggle(habit.id)}
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all active:scale-90 cursor-pointer ${
                          isCompletedToday
                            ? 'bg-[#22C58B] text-white shadow-lg shadow-[#22C58B]/35'
                            : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-400 dark:text-[#9FA2AC] border border-slate-300 dark:border-white/10'
                        }`}
                        title={isCompletedToday ? "Undo today's check" : "Mark completed today"}
                      >
                        {isCompletedToday ? (
                          <Check className="w-6 h-6 stroke-[3]" />
                        ) : (
                          <Icon className="w-5 h-5" style={{ color: habit.color }} />
                        )}
                      </button>
                    ) : (
                      <div className="w-11 h-11 rounded-2xl bg-slate-200/50 dark:bg-white/5 flex items-center justify-center flex-shrink-0 text-slate-400">
                        <Archive className="w-5 h-5" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className={`text-sm sm:text-base font-bold truncate ${
                          tabFilter === 'active' && isCompletedToday ? 'text-slate-700 dark:text-white/80 line-through' : 'text-slate-900 dark:text-white'
                        }`}>
                          {habit.title}
                        </h3>
                        {tabFilter === 'active' && streakInfo.currentStreak > 0 && (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FF7628]/15 text-[#FF7628] text-[10px] font-bold">
                            <Flame className="w-3 h-3 fill-[#FF7628]" />
                            <span>{streakInfo.currentStreak}d streak</span>
                          </div>
                        )}
                        {tabFilter === 'active' && streakInfo.longestStreak > streakInfo.currentStreak && (
                          <span className="text-[10px] text-slate-400 dark:text-[#9FA2AC] hidden sm:inline">
                            (Best: {streakInfo.longestStreak}d)
                          </span>
                        )}
                      </div>

                      {habit.description && (
                        <p className="text-xs text-slate-500 dark:text-[#9FA2AC] truncate mt-0.5">
                          {habit.description}
                        </p>
                      )}

                      <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500 dark:text-[#9FA2AC]">
                        <span className="capitalize">{habit.category}</span>
                        <span>·</span>
                        <span>Goal: {habit.targetDaysPerWeek} days/wk</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/70 dark:border-white/5">
                    
                    {tabFilter === 'active' ? (
                      <>
                        {/* 7 Days dot matrix */}
                        <div className="flex items-center gap-1.5">
                          {last7Days.map((dStr, idx) => {
                            const isDone = completions.some(c => c.habitId === habit.id && c.date === dStr);
                            const isToday = dStr === todayStr;
                            const dayLabel = new Date(dStr).toLocaleDateString('en-US', { weekday: 'narrow' });
                            return (
                              <div key={idx} className="flex flex-col items-center gap-1">
                                <span className="text-[9px] text-slate-400 dark:text-[#9FA2AC]">{dayLabel}</span>
                                <div
                                  onClick={() => handleToggle(habit.id, dStr)}
                                  title={`${dStr}: ${isDone ? 'Completed' : 'Missed'} (Tap to toggle)`}
                                  className={`w-6 h-6 rounded-lg flex items-center justify-center cursor-pointer transition active:scale-90 ${
                                    isDone 
                                      ? 'bg-[#22C58B] text-white shadow-xs' 
                                      : isToday 
                                        ? 'border border-dashed border-[#22C58B]/60 bg-[#22C58B]/10' 
                                        : 'bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10'
                                  }`}
                                >
                                  {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Edit & Archive */}
                        <div className="flex items-center gap-1 pl-2">
                          <button
                            onClick={() => openEditModal(habit)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 dark:bg-white/5 dark:hover:bg-white/15 dark:text-[#9FA2AC] dark:hover:text-white transition active:scale-95"
                            title="Edit habit details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleArchive(habit.id)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-amber-500/20 text-slate-500 dark:bg-white/5 dark:text-[#9FA2AC] hover:text-amber-500 transition active:scale-95"
                            title="Archive habit (preserves history)"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    ) : (
                      /* Archived Controls */
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUnarchive(habit.id)}
                          className="px-3 py-1.5 rounded-xl bg-[#22C58B]/15 border border-[#22C58B]/30 text-[#16A34A] dark:text-[#22C58B] text-xs font-bold hover:bg-[#22C58B]/25 transition cursor-pointer active:scale-95 flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Restore Habit</span>
                        </button>
                        <button
                          onClick={() => setHabitToDelete(habit)}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 transition cursor-pointer active:scale-95"
                          title="Delete habit permanently"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                  </div>

                </div>
              </div>
            );
          })
        ) : (
          <div className="glass-panel py-16 text-center p-6 flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-[#22C58B]/15 text-[#16A34A] dark:text-[#22C58B] flex items-center justify-center mb-3 shadow-xs">
              <Sparkles className="w-6 h-6 stroke-[2.2]" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {tabFilter === 'active' ? 'No active habits' : 'No archived habits'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#9FA2AC] max-w-xs mt-1 mb-4">
              {tabFilter === 'active' 
                ? 'Create your daily habits to stay disciplined and build productive streaks.'
                : 'Archived habits will be safely kept here with their complete history.'}
            </p>
            {tabFilter === 'active' && (
              <button
                onClick={openNewModal}
                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#22C58B] to-[#34D399] text-white font-bold text-xs shadow-md shadow-[#22C58B]/25 hover:brightness-110 transition active:scale-95 cursor-pointer"
              >
                + Create First Habit
              </button>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {habitToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-4 animate-in fade-in">
          <div className="glass-panel w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-500">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Delete Habit Permanently?</h3>
                <p className="text-xs text-slate-500 dark:text-[#9FA2AC]">
                  "{habitToDelete.title}" and its history will be deleted.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/50 dark:border-white/10">
              <button
                onClick={() => setHabitToDelete(null)}
                className="px-3.5 py-2 rounded-xl glass-panel-subtle text-xs font-bold text-slate-600 dark:text-[#9FA2AC]"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteHabitConfirm}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold shadow-md shadow-red-600/30 hover:bg-red-700 active:scale-95 transition cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Habit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-4 animate-in fade-in">
          <div className="glass-panel w-full max-w-md p-5 text-slate-900 dark:text-white shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-white/10">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingHabit ? 'Edit Habit' : 'Create New Habit'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:text-[#9FA2AC] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition active:scale-90"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveHabit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#9FA2AC] mb-1">
                  Habit Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Read 20 mins, Cold shower, Quran/Prayer"
                  value={habitTitle}
                  onChange={(e) => setHabitTitle(e.target.value)}
                  className="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#9FA2AC]/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-[#9FA2AC] mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Keep Kindle next to bed"
                  value={habitDesc}
                  onChange={(e) => setHabitDesc(e.target.value)}
                  className="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#9FA2AC]/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-[#9FA2AC] mb-1">
                    Category
                  </label>
                  <select
                    value={habitCategory}
                    onChange={(e) => setHabitCategory(e.target.value as any)}
                    className="glass-input w-full px-3 py-2.5 rounded-xl text-xs text-slate-900 dark:text-white"
                  >
                    <option value="health">Health & Body</option>
                    <option value="fitness">Fitness</option>
                    <option value="learning">Study & Books</option>
                    <option value="routine">Routine</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-[#9FA2AC] mb-1">
                    Target Days / Week
                  </label>
                  <select
                    value={targetDays}
                    onChange={(e) => setTargetDays(Number(e.target.value))}
                    className="glass-input w-full px-3 py-2.5 rounded-xl text-xs text-slate-900 dark:text-white"
                  >
                    <option value={7}>Daily (7 days)</option>
                    <option value={6}>6 days/week</option>
                    <option value={5}>5 days/week</option>
                    <option value={4}>4 days/week</option>
                    <option value={3}>3 days/week</option>
                  </select>
                </div>
              </div>

              {/* Color selection */}
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-[#9FA2AC] mb-1.5">
                  Color Tag
                </label>
                <div className="flex items-center gap-2">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setHabitColor(c)}
                      className={`w-7 h-7 rounded-full border-2 transition active:scale-90 ${
                        habitColor === c ? 'scale-110 border-white ring-2 ring-[#FF7628]' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-white dark:hover:bg-white/15 text-xs font-semibold transition active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#22C58B] text-white text-xs font-bold shadow-lg shadow-[#22C58B]/30 hover:brightness-110 transition active:scale-95 cursor-pointer"
                >
                  {editingHabit ? 'Save Changes' : 'Create Habit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
