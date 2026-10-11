import React, { useState, useEffect } from 'react';
import { 
  X, 
  Wallet, 
  CheckCircle2, 
  ArrowRight, 
  RotateCcw, 
  Sparkles, 
  MapPin, 
  Check, 
  Clock, 
  Plus
} from 'lucide-react';
import { getRecentDistinctExpenses, addExpense } from '../../database/db';
import { getLocalDateString, getLocalTimeString } from '../../utils/dateUtils';
import type { Expense } from '../../types';

interface QuickLogSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAddExpense: () => void;
  onSelectCompleteHabit: () => void;
  onSelectRepeatExpense?: (expense: Expense) => void;
  currencySymbol?: string;
  theme?: 'dark' | 'light';
}

export const QuickLogSheet: React.FC<QuickLogSheetProps> = ({
  isOpen,
  onClose,
  onSelectAddExpense,
  onSelectCompleteHabit,
  onSelectRepeatExpense,
  currencySymbol = '৳',
  theme = 'dark',
}) => {
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [showRepeatPicker, setShowRepeatPicker] = useState(false);
  const [repeatSuccessMessage, setRepeatSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setShowRepeatPicker(false);
      setRepeatSuccessMessage(null);
      getRecentDistinctExpenses(4).then(setRecentExpenses);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 1-Tap Quick Repeat directly into IndexedDB
  const handleOneTapRepeat = async (exp: Expense) => {
    try {
      const todayStr = getLocalDateString();
      const timeStr = getLocalTimeString();
      const timestamp = Date.now();

      await addExpense({
        amount: exp.amount,
        currency: exp.currency || currencySymbol,
        category: exp.category,
        fromLocation: exp.fromLocation || '',
        toLocation: exp.toLocation || '',
        note: exp.note ? `(Repeat) ${exp.note}` : `(Repeat ${exp.category})`,
        date: todayStr,
        time: timeStr,
        timestamp,
      });

      // Haptic feedback if supported
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate(35); } catch {}
      }

      setRepeatSuccessMessage(`Logged ${currencySymbol}${exp.amount} ${exp.category} instantly!`);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('Failed 1-tap repeat:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-md p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      {/* Backdrop click dismiss */}
      <div className="fixed inset-0 -z-10" onClick={onClose} />

      <div className="glass-panel w-full sm:max-w-md rounded-t-[2.2rem] sm:rounded-[2rem] p-5 pb-8 sm:pb-6 space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-200 select-none">
        
        {/* Grab Handle Bar */}
        <div className="w-12 h-1.5 rounded-full mx-auto -mt-1 mb-2 bg-slate-300 dark:bg-white/20" />

        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/70 dark:border-white/10">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF7628] animate-pulse shadow-sm shadow-[#FF7628]/50" />
              <span>Quick Action Menu</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-[#9FA2AC]">
              Fast mobile logger for daily expenses and habits
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:text-[#9FA2AC] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition active:scale-90"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success toast after 1-tap repeat */}
        {repeatSuccessMessage && (
          <div className="p-3 rounded-2xl bg-[#22C58B]/20 border border-[#22C58B]/40 text-[#22C58B] text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{repeatSuccessMessage}</span>
          </div>
        )}

        {/* 3 Core Working Action Cards */}
        <div className="space-y-3 pt-1">
          
          {/* Action 1: Add Expense */}
          <button
            onClick={() => {
              onClose();
              onSelectAddExpense();
            }}
            className="glass-panel-subtle w-full flex items-center justify-between p-3.5 rounded-2xl transition-all text-left group active:scale-98 shadow-xs hover:border-[#FF7628]/50 hover:bg-[#FF7628]/10 cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#FF7628] to-[#FF9457] text-white flex items-center justify-center font-black text-xl shadow-lg shadow-[#FF7628]/35 flex-shrink-0 group-hover:scale-105 transition-transform">
                {currencySymbol}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#FF7628] transition-colors">
                    Add Expense
                  </span>
                  <span className="text-[10px] font-bold text-[#FF7628] uppercase">
                    · Keypad
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-[#9FA2AC] mt-0.5 truncate">
                  Log commute, rickshaw, meals or personal spend
                </p>
              </div>
            </div>

            <div className="w-8 h-8 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ml-2 bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-[#9FA2AC] group-hover:bg-[#FF7628] group-hover:text-white shadow-xs">
              <ArrowRight className="w-4 h-4 stroke-[2.2]" />
            </div>
          </button>

          {/* Action 2: Complete Habit */}
          <button
            onClick={() => {
              onClose();
              onSelectCompleteHabit();
            }}
            className="glass-panel-subtle w-full flex items-center justify-between p-3.5 rounded-2xl transition-all text-left group active:scale-98 shadow-xs hover:border-[#22C58B]/50 hover:bg-[#22C58B]/10 cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#22C58B] to-[#34D399] text-white flex items-center justify-center shadow-lg shadow-[#22C58B]/35 flex-shrink-0 group-hover:scale-105 transition-transform">
                <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#16A34A] dark:group-hover:text-[#22C58B] transition-colors">
                    Complete Habit
                  </span>
                  <span className="text-[10px] font-bold text-[#16A34A] dark:text-[#22C58B] uppercase">
                    · 1-Tap
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-[#9FA2AC] mt-0.5 truncate">
                  Check off today's habits and maintain streaks
                </p>
              </div>
            </div>

            <div className="w-8 h-8 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ml-2 bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-[#9FA2AC] group-hover:bg-[#22C58B] group-hover:text-white shadow-xs">
              <ArrowRight className="w-4 h-4 stroke-[2.2]" />
            </div>
          </button>

          {/* Action 3: Repeat Recent Expense */}
          <div className="space-y-2">
            <button
              onClick={() => setShowRepeatPicker(!showRepeatPicker)}
              className="glass-panel-subtle w-full flex items-center justify-between p-3.5 rounded-2xl transition-all text-left group active:scale-98 shadow-xs hover:border-[#6366F1]/50 hover:bg-[#6366F1]/10 cursor-pointer"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#818CF8] text-white flex items-center justify-center shadow-lg shadow-[#6366F1]/35 flex-shrink-0 group-hover:scale-105 transition-transform">
                  <RotateCcw className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#6366F1] transition-colors">
                      Repeat Recent Expense
                    </span>
                    <span className="text-[10px] font-bold text-[#6366F1] uppercase">
                      · Instant
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-[#9FA2AC] mt-0.5 truncate">
                    {recentExpenses.length > 0 
                      ? `${recentExpenses.length} frequent trips ready for 1-tap re-log`
                      : 'Repeats your recent commutes or frequent payments'}
                  </p>
                </div>
              </div>

              <div className="w-8 h-8 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ml-2 bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-[#9FA2AC] group-hover:bg-[#6366F1] group-hover:text-white shadow-xs">
                <ArrowRight className={`w-4 h-4 stroke-[2.2] transition-transform ${showRepeatPicker ? 'rotate-90' : ''}`} />
              </div>
            </button>

            {/* Expanded Instant Repeat List */}
            {showRepeatPicker && (
              <div className="p-2.5 rounded-2xl bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/10 space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between px-2 pt-1 pb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#9FA2AC]">
                    Tap to log today:
                  </span>
                  <span className="text-[10px] text-slate-400">1-tap saves to DB</span>
                </div>

                {recentExpenses.length > 0 ? (
                  recentExpenses.map((exp) => (
                    <div
                      key={exp.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white/70 dark:bg-black/30 border border-slate-200/50 dark:border-white/5 hover:border-[#6366F1]/50 transition-all text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                          <span className="text-[#FF7628]">{exp.category}</span>
                          <span>·</span>
                          <span className="text-emerald-500">{currencySymbol}{exp.amount}</span>
                        </div>
                        {(exp.fromLocation || exp.toLocation) && (
                          <div className="text-[11px] text-slate-500 dark:text-[#9FA2AC] truncate flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 flex-shrink-0 text-slate-400" />
                            <span>{exp.fromLocation || 'Start'} → {exp.toLocation || 'End'}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* 1-Tap Quick Log */}
                        <button
                          onClick={() => handleOneTapRepeat(exp)}
                          title="Log immediately for today"
                          className="px-2.5 py-1.5 rounded-lg bg-[#22C58B]/20 hover:bg-[#22C58B] text-[#16A34A] dark:text-[#22C58B] hover:text-white font-bold text-[11px] transition active:scale-95 flex items-center gap-1"
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>Log</span>
                        </button>

                        {/* Edit & Customize */}
                        {onSelectRepeatExpense && (
                          <button
                            onClick={() => {
                              onClose();
                              onSelectRepeatExpense(exp);
                            }}
                            title="Edit before saving"
                            className="p-1.5 rounded-lg bg-slate-200/60 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300 text-[11px] font-semibold transition active:scale-95"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-center text-xs text-slate-500 dark:text-[#9FA2AC]">
                    No past expenses found yet. Log an expense and it will appear here for fast repeat!
                  </div>
                )}
              </div>
            )}

          </div>

        </div>

        {/* Cancel Button */}
        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-xs font-semibold transition active:scale-98 bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-white/10 dark:hover:bg-white/15 dark:text-[#9FA2AC] dark:hover:text-white"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
};
