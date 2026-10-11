import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  AlertCircle,
  Sparkles,
  Plus,
  Eye,
  Info
} from 'lucide-react';
import type { Expense, Habit, HabitCompletion } from '../../types';
import { getLocalDateString } from '../../utils/dateUtils';

interface CalendarHeatmapProps {
  expenses: Expense[];
  habits: Habit[];
  completions: HabitCompletion[];
  currencySymbol: string;
  theme: 'dark' | 'light';
  onQuickAddForDate?: (dateStr: string) => void;
}

export const CalendarHeatmap: React.FC<CalendarHeatmapProps> = ({
  expenses,
  habits,
  completions,
  currencySymbol,
  theme,
  onQuickAddForDate,
}) => {
  const todayStr = getLocalDateString();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const targetMonthStr = `${year}-${(month + 1).toString().padStart(2, '0')}`;

  // Month navigation
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleGoToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDateStr(getLocalDateString(now));
  };

  // Pre-aggregate month data
  // Map of dateStr -> { expenses: Expense[], total: number, completions: HabitCompletion[] }
  const monthData: Record<string, {
    expenses: Expense[];
    total: number;
    completions: HabitCompletion[];
    hasExplicitZero: boolean;
  }> = {};

  // Find max single-day spend in month for intensity scaling
  let maxDaySpend = 1;

  for (const exp of expenses) {
    if (exp.date.startsWith(targetMonthStr)) {
      if (!monthData[exp.date]) {
        monthData[exp.date] = { expenses: [], total: 0, completions: [], hasExplicitZero: false };
      }
      monthData[exp.date].expenses.push(exp);
      monthData[exp.date].total += exp.amount;
      if (exp.amount === 0) monthData[exp.date].hasExplicitZero = true;
      if (monthData[exp.date].total > maxDaySpend) {
        maxDaySpend = monthData[exp.date].total;
      }
    }
  }

  for (const comp of completions) {
    if (comp.date.startsWith(targetMonthStr)) {
      if (!monthData[comp.date]) {
        monthData[comp.date] = { expenses: [], total: 0, completions: [], hasExplicitZero: false };
      }
      monthData[comp.date].completions.push(comp);
    }
  }

  // Days in month calculation
  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // Starting day index (0 = Monday, 6 = Sunday)
  let startingDayOfWeek = firstDayOfMonth.getDay() - 1;
  if (startingDayOfWeek === -1) startingDayOfWeek = 6; // Sunday adjusted to index 6

  // Days array
  const calendarCells: Array<{ dayNum: number; dateStr: string } | null> = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarCells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = `${targetMonthStr}-${d.toString().padStart(2, '0')}`;
    calendarCells.push({ dayNum: d, dateStr: dStr });
  }

  // Selected date records
  const selectedDayData = monthData[selectedDateStr] || {
    expenses: [],
    total: 0,
    completions: [],
    hasExplicitZero: false,
  };

  const isSelectedDateInFuture = selectedDateStr > todayStr;
  const isSelectedDateToday = selectedDateStr === todayStr;

  // Selected date formatted
  const selectedDateObj = new Date(selectedDateStr + 'T12:00:00');
  const selectedFormatted = selectedDateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="space-y-5">
      {/* Calendar Header with Navigation */}
      <div className="glass-panel p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#FF7628]/15 border border-[#FF7628]/30 flex items-center justify-center text-[#FF7628]">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>{monthName}</span>
              {todayStr.startsWith(targetMonthStr) && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#22C58B]/20 text-[#16A34A] dark:text-[#22C58B]">
                  Current
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#9FA2AC]">
              Tap any date to inspect full expense details and habit check-ins
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            onClick={handleGoToday}
            className="px-3 py-1.5 rounded-xl glass-panel-subtle text-xs font-bold text-slate-700 dark:text-white hover:border-[#FF7628]/40 transition active:scale-95 cursor-pointer"
          >
            Today
          </button>
          <button
            onClick={handlePrevMonth}
            aria-label="Previous month"
            className="p-2 rounded-xl glass-panel-subtle text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition active:scale-90 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNextMonth}
            aria-label="Next month"
            className="p-2 rounded-xl glass-panel-subtle text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition active:scale-90 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="glass-panel p-4 sm:p-6 shadow-xl">
        {/* Days of Week */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2 text-center">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <div key={day} className="text-[11px] font-bold text-slate-400 dark:text-[#9FA2AC] uppercase tracking-wider py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Cells */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {calendarCells.map((cell, idx) => {
            if (!cell) {
              return <div key={`empty-${idx}`} className="h-16 sm:h-20 rounded-xl opacity-0" />;
            }

            const { dayNum, dateStr } = cell;
            const data = monthData[dateStr];
            const hasData = Boolean(data && data.expenses.length > 0);
            const total = data ? data.total : 0;
            const completionsCount = data ? data.completions.length : 0;
            const isConfirmedZero = Boolean(data && (data.hasExplicitZero || (hasData && total === 0)));
            const isMissing = !hasData && !isConfirmedZero;
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDateStr;
            const isFuture = dateStr > todayStr;

            // Intensity ratio 0..1 for heat styling
            const intensity = maxDaySpend > 0 && total > 0 ? Math.min(total / maxDaySpend, 1) : 0;

            // Background & text styles based on status
            let cellBg = 'bg-slate-100/60 dark:bg-white/[0.03] border-slate-200/50 dark:border-white/5';
            if (isConfirmedZero) {
              cellBg = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400';
            } else if (hasData && total > 0) {
              if (intensity > 0.65) {
                cellBg = 'bg-[#FF7628]/35 border-[#FF7628]/60 text-slate-900 dark:text-white shadow-sm shadow-[#FF7628]/20';
              } else if (intensity > 0.3) {
                cellBg = 'bg-[#FF7628]/20 border-[#FF7628]/40 text-slate-900 dark:text-white';
              } else {
                cellBg = 'bg-[#FF7628]/10 border-[#FF7628]/25 text-slate-900 dark:text-white';
              }
            }

            if (isSelected) {
              cellBg += ' ring-2 ring-[#FF7628] scale-[1.02] z-10';
            }

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDateStr(dateStr)}
                className={`h-16 sm:h-20 p-1 sm:p-2 rounded-xl sm:rounded-2xl border text-left flex flex-col justify-between transition-all duration-150 cursor-pointer active:scale-95 relative overflow-hidden ${cellBg}`}
              >
                {/* Top Row: Day Number & Today indicator */}
                <div className="flex items-center justify-between w-full">
                  <span className={`text-xs sm:text-sm font-bold ${
                    isToday ? 'w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#FF7628] text-white flex items-center justify-center font-black shadow-xs' : 'text-slate-800 dark:text-white'
                  }`}>
                    {dayNum}
                  </span>

                  {/* Habit Completion Dot indicator */}
                  {completionsCount > 0 && (
                    <span 
                      title={`${completionsCount} habits checked`}
                      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#22C58B]/20 text-[#16A34A] dark:text-[#22C58B] text-[9px] font-black"
                    >
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span className="hidden sm:inline">{completionsCount}</span>
                    </span>
                  )}
                </div>

                {/* Bottom Row: Expense Amount or Status Pill */}
                <div className="w-full mt-auto">
                  {hasData && total > 0 ? (
                    <div className="text-[10px] sm:text-xs font-black truncate text-[#FF7628] dark:text-[#FFA675]">
                      {currencySymbol}{total >= 1000 ? `${(total / 1000).toFixed(1)}k` : total}
                    </div>
                  ) : isConfirmedZero ? (
                    <div className="text-[9px] sm:text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      {currencySymbol}0
                    </div>
                  ) : isFuture ? (
                    <div className="text-[9px] text-slate-300 dark:text-white/20 select-none">
                      —
                    </div>
                  ) : (
                    <div className="text-[8px] sm:text-[9px] text-slate-400 dark:text-[#9FA2AC]/60 truncate">
                      No logs
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-5 pt-4 border-t border-slate-200/70 dark:border-white/5 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500 dark:text-[#9FA2AC]">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-slate-700 dark:text-white">Legend:</span>
            
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-[#FF7628]/15 border border-[#FF7628]/30" />
              <span>Light Spend</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-[#FF7628]/45 border border-[#FF7628]/70" />
              <span>Heavy Spend</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-emerald-500/20 border border-emerald-500/40" />
              <span>Confirmed {currencySymbol}0</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-slate-200/60 dark:bg-white/5 border border-slate-300/60 dark:border-white/10" />
              <span>No Records</span>
            </div>

            <div className="flex items-center gap-1.5 text-[#16A34A] dark:text-[#22C58B] font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Habit Check-in</span>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Day Record Inspector */}
      <div className="glass-panel p-5 shadow-lg border-[#FF7628]/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200/70 dark:border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                {selectedFormatted}
              </h4>
              {isSelectedDateToday && (
                <span className="px-2 py-0.5 rounded-full bg-[#FF7628]/15 text-[#FF7628] font-bold text-[10px]">
                  Today
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-[#9FA2AC] mt-0.5">
              Detailed breakdown of expenditure and habits completed on this date
            </p>
          </div>

          <div className="flex items-center gap-2">
            {selectedDayData.expenses.length > 0 ? (
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-[#9FA2AC] block">
                  Total Spent
                </span>
                <span className="text-lg sm:text-xl font-black text-[#FF7628]">
                  {currencySymbol}{selectedDayData.total.toLocaleString()}
                </span>
              </div>
            ) : selectedDayData.hasExplicitZero ? (
              <span className="px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                Confirmed {currencySymbol}0 Spent
              </span>
            ) : (
              <span className="px-3 py-1 rounded-xl bg-slate-200/60 dark:bg-white/10 text-slate-500 dark:text-[#9FA2AC] text-xs font-semibold">
                No Logged Expenses
              </span>
            )}

            {onQuickAddForDate && (
              <button
                onClick={() => onQuickAddForDate(selectedDateStr)}
                className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-gradient-to-r from-[#FF7628] to-[#FF9457] text-white font-bold text-xs hover:brightness-110 transition active:scale-95 cursor-pointer ml-2"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Expense</span>
              </button>
            )}
          </div>
        </div>

        {/* Content: Expenses on Date */}
        <div className="mt-4 space-y-4">
          <div>
            <h5 className="text-xs font-bold text-slate-700 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>Expenses</span>
              <span className="text-slate-400">({selectedDayData.expenses.length})</span>
            </h5>

            {selectedDayData.expenses.length > 0 ? (
              <div className="space-y-2">
                {selectedDayData.expenses.map((e) => (
                  <div
                    key={e.id}
                    className="p-3 rounded-xl glass-panel-subtle flex items-center justify-between gap-3 hover:border-[#FF7628]/30 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-[#FF7628]/15 border border-[#FF7628]/30 flex items-center justify-center font-bold text-xs text-[#FF7628]">
                        {e.category.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">{e.category}</span>
                          {e.time && (
                            <span className="text-[10px] text-slate-400 dark:text-[#9FA2AC] flex items-center gap-0.5">
                              <Clock className="w-3 h-3" />
                              {e.time}
                            </span>
                          )}
                        </div>
                        {e.fromLocation && e.toLocation && (
                          <div className="text-[11px] text-slate-500 dark:text-[#9FA2AC] flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-[#FF7628]" />
                            <span>{e.fromLocation} → {e.toLocation}</span>
                          </div>
                        )}
                        {e.note && (
                          <p className="text-[11px] text-slate-500 dark:text-[#9FA2AC] italic mt-0.5">
                            "{e.note}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-black text-[#FF7628]">
                        {currencySymbol}{e.amount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : selectedDayData.hasExplicitZero ? (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 italic">
                Confirmed zero spending logged for this date.
              </p>
            ) : (
              <p className="text-xs text-slate-400 dark:text-[#9FA2AC] italic">
                No expense entries recorded for this date.
              </p>
            )}
          </div>

          {/* Habits Checked on Date */}
          <div className="pt-3 border-t border-slate-200/50 dark:border-white/5">
            <h5 className="text-xs font-bold text-slate-700 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>Habits Completed</span>
              <span className="text-slate-400">({selectedDayData.completions.length})</span>
            </h5>

            {selectedDayData.completions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedDayData.completions.map((comp) => {
                  const habit = habits.find((h) => h.id === comp.habitId);
                  return (
                    <div
                      key={comp.id}
                      className="px-3 py-1.5 rounded-xl bg-[#22C58B]/15 border border-[#22C58B]/30 flex items-center gap-2 text-xs font-bold text-[#16A34A] dark:text-[#22C58B]"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{habit ? habit.title : 'Habit completed'}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 dark:text-[#9FA2AC] italic">
                No habit completions logged for this date.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
