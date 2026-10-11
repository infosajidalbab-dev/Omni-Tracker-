import React, { useState, useEffect } from 'react';
import { 
  Repeat, 
  Plus, 
  X, 
  Trash2, 
  Edit3, 
  Check, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  Info, 
  AlertCircle,
  Play,
  MapPin,
  TrendingUp,
  RotateCcw
} from 'lucide-react';
import { 
  getRecurringExpenses, 
  addRecurringExpense, 
  updateRecurringExpense, 
  deleteRecurringExpense, 
  processDueRecurringExpenses 
} from '../../database/db';
import { getLocalDateString } from '../../utils/dateUtils';
import { getFrequencyLabel, calculateNextDueDate } from '../../utils/recurringUtils';
import type { RecurringExpense, RecurringFrequency, TransportType } from '../../types';

interface RecurringExpensesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currencySymbol?: string;
  theme?: 'dark' | 'light';
  onExpensesChanged?: () => void;
}

const FREQUENCY_OPTIONS: Array<{ id: RecurringFrequency; label: string; desc: string }> = [
  { id: 'daily', label: 'Daily', desc: 'Runs every day' },
  { id: 'workdays', label: 'Workdays (Mon–Fri)', desc: 'Skips weekends' },
  { id: 'weekly', label: 'Weekly', desc: 'Every 7 days' },
  { id: 'monthly', label: 'Monthly', desc: 'Same day each month' },
];

const CATEGORIES: TransportType[] = [
  'Rickshaw',
  'Bus',
  'CNG',
  'Bike',
  'Walking',
  'Food',
  'Groceries',
  'Bills',
  'Shopping',
  'Other'
];

export const RecurringExpensesModal: React.FC<RecurringExpensesModalProps> = ({
  isOpen,
  onClose,
  currencySymbol = '৳',
  theme = 'dark',
  onExpensesChanged,
}) => {
  const [items, setItems] = useState<RecurringExpense[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<RecurringExpense | null>(null);
  const [processFeedback, setProcessFeedback] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<TransportType>('Rickshaw');
  const [frequency, setFrequency] = useState<RecurringFrequency>('daily');
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [note, setNote] = useState('');
  const [nextDueDate, setNextDueDate] = useState(getLocalDateString());

  const loadData = async () => {
    const list = await getRecurringExpenses();
    setItems(list);
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      setShowForm(false);
      setEditingItem(null);
      setProcessFeedback(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOpenNew = () => {
    setEditingItem(null);
    setTitle('');
    setAmount('');
    setCategory('Rickshaw');
    setFrequency('daily');
    setFromLocation('');
    setToLocation('');
    setNote('');
    setNextDueDate(getLocalDateString());
    setShowForm(true);
  };

  const handleOpenEdit = (item: RecurringExpense) => {
    setEditingItem(item);
    setTitle(item.title);
    setAmount(item.amount.toString());
    setCategory(item.category);
    setFrequency(item.frequency);
    setFromLocation(item.fromLocation || '');
    setToLocation(item.toLocation || '');
    setNote(item.note || '');
    setNextDueDate(item.nextDueDate);
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount.trim());
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;
    if (!title.trim()) return;

    if (editingItem) {
      await updateRecurringExpense(editingItem.id, {
        title: title.trim(),
        amount: parsedAmount,
        category,
        frequency,
        fromLocation: fromLocation.trim(),
        toLocation: toLocation.trim(),
        note: note.trim(),
        nextDueDate,
      });
    } else {
      await addRecurringExpense({
        title: title.trim(),
        amount: parsedAmount,
        currency: currencySymbol,
        category,
        frequency,
        fromLocation: fromLocation.trim(),
        toLocation: toLocation.trim(),
        note: note.trim(),
        active: true,
        autoLog: true,
        nextDueDate: nextDueDate || getLocalDateString(),
      });
    }

    setShowForm(false);
    await loadData();
    onExpensesChanged?.();
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    await updateRecurringExpense(id, { active: !current });
    await loadData();
  };

  const handleDelete = async (id: string) => {
    await deleteRecurringExpense(id);
    await loadData();
  };

  const handleRunProcessNow = async () => {
    const res = await processDueRecurringExpenses();
    if (res.generatedCount > 0) {
      setProcessFeedback(`Generated ${res.generatedCount} due transaction(s) successfully. Zero duplicates created.`);
    } else {
      setProcessFeedback('All recurring rules are already up-to-date for today. No duplicate expenses created.');
    }
    await loadData();
    onExpensesChanged?.();
    setTimeout(() => setProcessFeedback(null), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-md p-0 sm:p-4 overflow-y-auto">
      <div className="glass-panel w-full sm:max-w-lg rounded-t-[2.2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200 max-h-[92vh] flex flex-col">
        
        {/* Grab Handle */}
        <div className="sm:hidden w-12 h-1.5 rounded-full mx-auto mt-2.5 bg-slate-300 dark:bg-white/20" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-3.5 pb-3 border-b border-slate-200/70 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#6366F1]/20 text-[#6366F1] flex items-center justify-center shadow-xs">
              <Repeat className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Recurring Expenses</h2>
              <p className="text-[11px] text-slate-500 dark:text-[#9FA2AC]">
                Automated templates for predictable commutes & daily costs
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
          
          {/* Feedback banner */}
          {processFeedback && (
            <div className="p-3 rounded-2xl bg-[#22C58B]/15 border border-[#22C58B]/30 text-[#22C58B] text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{processFeedback}</span>
            </div>
          )}

          {/* Quick Action Toolbar */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={handleRunProcessNow}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 text-xs font-semibold transition active:scale-95 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current text-emerald-500" />
              <span>Process Due Entries</span>
            </button>

            {!showForm && (
              <button
                onClick={handleOpenNew}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-bold transition active:scale-95 shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Add Template</span>
              </button>
            )}
          </div>

          {/* Explicit Rules Explanation */}
          <div className="p-3 rounded-2xl bg-slate-100/80 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/10 text-[11px] text-slate-500 dark:text-[#9FA2AC] space-y-1">
            <div className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-[#6366F1]" />
              <span>Automatic Generation Rules</span>
            </div>
            <p>• Due entries log automatically once when their next due date arrives.</p>
            <p>• Strict deduplication prevents double-logging if the app reopens or refreshes.</p>
            <p>• You can pause, edit amounts, or delete rules anytime.</p>
          </div>

          {/* List of Recurring Expenses */}
          <div className="space-y-2.5">
            {items.length > 0 ? (
              items.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl glass-panel-subtle border text-xs space-y-2 hover:border-[#6366F1]/40 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                          {item.title}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-[#6366F1]/15 text-[#6366F1] font-semibold text-[10px]">
                          {getFrequencyLabel(item.frequency)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 font-black text-emerald-500 text-sm mt-0.5">
                        <span>{currencySymbol}{item.amount}</span>
                        <span className="text-slate-400 font-normal text-xs">· {item.category}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Active toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleActive(item.id, item.active)}
                        title={item.active ? 'Pause rule' : 'Resume rule'}
                        className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                          item.active ? 'bg-[#6366F1]' : 'bg-slate-300 dark:bg-white/20'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-xs transition-transform ${
                            item.active ? 'left-4.5' : 'left-0.5'
                          }`}
                        />
                      </button>

                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Route & Dates detail */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-[#9FA2AC] pt-1 border-t border-slate-200/50 dark:border-white/5">
                    {(item.fromLocation || item.toLocation) ? (
                      <span className="flex items-center gap-1 truncate max-w-[200px]">
                        <MapPin className="w-3 h-3 text-[#FF7628] flex-shrink-0" />
                        <span>{item.fromLocation || 'Start'} → {item.toLocation || 'End'}</span>
                      </span>
                    ) : (
                      <span>{item.note || 'No notes'}</span>
                    )}

                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[#6366F1]" />
                      <span>Next: {item.nextDueDate}</span>
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-500 dark:text-[#9FA2AC] glass-panel-subtle rounded-2xl border">
                No recurring rules created yet. Tap "Add Template" to set up predictable daily expenses!
              </div>
            )}
          </div>

          {/* Form Modal / Inline Editor */}
          {showForm && (
            <form onSubmit={handleSave} className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between pb-1 border-b border-indigo-500/20">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {editingItem ? 'Edit Recurring Rule' : 'New Recurring Expense Template'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-[#9FA2AC] mb-1">
                  Template Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Daily Rickshaw to Office, Monthly WiFi"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-[#9FA2AC] mb-1">
                    Amount ({currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-[#9FA2AC] mb-1">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as TransportType)}
                    className="glass-input w-full px-2.5 py-2 rounded-xl text-xs text-slate-900 dark:text-white bg-slate-900"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c} className="bg-slate-900 text-white">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-[#9FA2AC] mb-1">
                    Repeat Frequency *
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
                    className="glass-input w-full px-2.5 py-2 rounded-xl text-xs text-slate-900 dark:text-white bg-slate-900"
                  >
                    {FREQUENCY_OPTIONS.map((f) => (
                      <option key={f.id} value={f.id} className="bg-slate-900 text-white">
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-[#9FA2AC] mb-1">
                    Next Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={nextDueDate}
                    onChange={(e) => setNextDueDate(e.target.value)}
                    className="glass-input w-full px-2.5 py-2 rounded-xl text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-[#9FA2AC] mb-1">
                    Origin (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Home"
                    value={fromLocation}
                    onChange={(e) => setFromLocation(e.target.value)}
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-[#9FA2AC] mb-1">
                    Destination (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Office"
                    value={toLocation}
                    onChange={(e) => setToLocation(e.target.value)}
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-[#9FA2AC] mb-1">
                  Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Morning commute, Shared ride"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl text-xs font-bold bg-[#6366F1] hover:bg-[#4F46E5] text-white shadow-md active:scale-95 transition cursor-pointer"
                >
                  {editingItem ? 'Save Changes' : 'Create Template'}
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
