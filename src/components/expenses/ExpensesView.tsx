import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Edit3, 
  RotateCcw, 
  ArrowUpDown, 
  Calendar, 
  MapPin, 
  ArrowRight, 
  Clock, 
  Bike, 
  Bus, 
  Car, 
  Navigation, 
  Footprints, 
  Utensils, 
  ShoppingBag, 
  HelpCircle,
  FileDown,
  X,
  AlertCircle,
  Repeat
} from 'lucide-react';
import { db, deleteExpense } from '../../database/db';
import { getLocalDateString, getLocalMonthString, isDateInPastDays } from '../../utils/dateUtils';
import { exportExpensesToCSV } from '../../utils/csvUtils';
import type { Expense, TransportType } from '../../types';

interface ExpensesViewProps {
  onAddExpense: () => void;
  onEditExpense: (expense: Expense) => void;
  onRepeatExpense: (expense: Expense) => void;
  onOpenRecurring?: () => void;
  currencySymbol: string;
  theme: 'dark' | 'light';
}

const TRANSPORT_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  Rickshaw: { icon: Bike, color: '#FF7628' },
  Bus: { icon: Bus, color: '#38BDF8' },
  CNG: { icon: Car, color: '#22C58B' },
  Bike: { icon: Navigation, color: '#A855F7' },
  Walking: { icon: Footprints, color: '#EAB308' },
  Food: { icon: Utensils, color: '#F43F5E' },
  Shopping: { icon: ShoppingBag, color: '#EC4899' },
  Other: { icon: HelpCircle, color: '#94A3B8' },
};

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  onAddExpense,
  onEditExpense,
  onRepeatExpense,
  onOpenRecurring,
  currencySymbol,
  theme,
}) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  const todayStr = getLocalDateString();
  const currentMonthStr = getLocalMonthString();

  const loadExpenses = async () => {
    const list = await db.expenses.orderBy('timestamp').reverse().toArray();
    setExpenses(list);
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  const handleDeleteConfirm = async () => {
    if (!expenseToDelete) return;
    await deleteExpense(expenseToDelete.id);
    setExpenseToDelete(null);
    await loadExpenses();
  };

  // Filter & Sort Logic
  const filteredExpenses = expenses.filter((e) => {
    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCat = e.category.toLowerCase().includes(q);
      const matchFrom = e.fromLocation?.toLowerCase().includes(q);
      const matchTo = e.toLocation?.toLowerCase().includes(q);
      const matchNote = e.note?.toLowerCase().includes(q);
      const matchAmount = e.amount.toString().includes(q);
      if (!matchCat && !matchFrom && !matchTo && !matchNote && !matchAmount) {
        return false;
      }
    }

    // Category filter
    if (selectedCategory !== 'all' && e.category !== selectedCategory) {
      return false;
    }

    // Date range filter
    if (dateFilter === 'today') {
      if (e.date !== todayStr) return false;
    } else if (dateFilter === 'week') {
      if (!isDateInPastDays(e.date, 7, todayStr)) return false;
    } else if (dateFilter === 'month') {
      if (!e.date.startsWith(currentMonthStr)) return false;
    }

    return true;
  });

  // Sorting
  filteredExpenses.sort((a, b) => {
    if (sortBy === 'date_desc') return b.timestamp - a.timestamp;
    if (sortBy === 'date_asc') return a.timestamp - b.timestamp;
    if (sortBy === 'amount_desc') return b.amount - a.amount;
    if (sortBy === 'amount_asc') return a.amount - b.amount;
    return 0;
  });

  // Totals for filtered list
  const totalFilteredAmount = filteredExpenses.reduce((acc, cur) => acc + cur.amount, 0);

  const handleExportFilteredCSV = () => {
    if (filteredExpenses.length === 0) return;
    exportExpensesToCSV(
      filteredExpenses,
      currencySymbol,
      `omni_expenses_filtered_${dateFilter}_${todayStr}.csv`
    );
  };

  return (
    <div className="space-y-5 pb-20 md:pb-8">
      {/* Top Banner & Quick Add */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white">
            Daily Expense Records
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#9FA2AC]">
            Track rickshaw, CNG, bus, commute fares and daily expenses
          </p>
        </div>

        <div className="flex items-center gap-2">
          {filteredExpenses.length > 0 && (
            <button
              onClick={handleExportFilteredCSV}
              title="Export visible list to CSV (UTF-8, Excel & Sheets compatible)"
              className="flex items-center justify-center gap-1.5 py-2.5 px-3.5 rounded-xl glass-panel-subtle hover:border-[#22C58B]/50 text-slate-700 dark:text-slate-200 font-bold text-xs transition cursor-pointer active:scale-95"
            >
              <FileDown className="w-4 h-4 text-[#22C58B]" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          )}

          {onOpenRecurring && (
            <button
              onClick={onOpenRecurring}
              title="Manage predictable recurring expense templates"
              className="flex items-center justify-center gap-1.5 py-2.5 px-3.5 rounded-xl glass-panel-subtle hover:border-[#6366F1]/50 text-slate-700 dark:text-slate-200 font-bold text-xs transition cursor-pointer active:scale-95"
            >
              <Repeat className="w-4 h-4 text-[#6366F1]" />
              <span className="hidden sm:inline">Recurring</span>
            </button>
          )}

          <button
            onClick={onAddExpense}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#FF7628] to-[#FF8C42] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#FF7628]/25 hover:brightness-110 active:scale-95 transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Bar for currently filtered view */}
      <div className="glass-panel p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#9FA2AC]">
            Filtered Spending Total
          </span>
          <div className="text-2xl sm:text-3xl font-black text-[#FF7628] drop-shadow-[0_2px_10px_rgba(255,118,40,0.2)] mt-0.5">
            {currencySymbol}{totalFilteredAmount.toLocaleString()}
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-[#9FA2AC]">
          <div>
            <span className="block font-bold text-slate-900 dark:text-white text-base">{filteredExpenses.length}</span>
            <span>Records</span>
          </div>
          <div className="w-px h-8 bg-slate-200 dark:bg-white/10" />
          <div>
            <span className="block font-bold text-slate-900 dark:text-white text-base">
              {filteredExpenses.length > 0 
                ? `${currencySymbol}${Math.round(totalFilteredAmount / filteredExpenses.length)}` 
                : `${currencySymbol}0`}
            </span>
            <span>Avg / Log</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="glass-panel p-4 space-y-3">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-[#9FA2AC]" />
          <input
            type="text"
            placeholder="Search by route, note, category or amount..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="glass-input w-full pl-10 pr-9 py-2.5 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#9FA2AC]/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-900 dark:text-[#9FA2AC] dark:hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Date Filter & Category & Sort Row */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          {/* Date Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {(['all', 'today', 'week', 'month'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setDateFilter(filter)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition active:scale-95 ${
                  dateFilter === filter
                    ? 'bg-[#FF7628] text-white shadow-xs'
                    : 'glass-panel-subtle text-slate-600 dark:text-[#9FA2AC] hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {filter === 'all' ? 'All Time' : filter === 'today' ? 'Today' : filter === 'week' ? 'This Week' : 'This Month'}
              </button>
            ))}
          </div>

          {/* Sort Dropdown & Category select */}
          <div className="flex items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label="Filter by transport category"
              className="glass-input py-1.5 px-2.5 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="all">All Categories</option>
              <option value="Rickshaw">Rickshaw</option>
              <option value="Bus">Bus</option>
              <option value="CNG">CNG</option>
              <option value="Bike">Bike</option>
              <option value="Walking">Walking</option>
              <option value="Food">Food / Tea</option>
              <option value="Shopping">Shopping</option>
              <option value="Other">Other</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              aria-label="Sort expenses"
              className="glass-input py-1.5 px-2.5 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="amount_desc">Highest Amount</option>
              <option value="amount_asc">Lowest Amount</option>
            </select>
          </div>
        </div>
      </div>

      {/* Expenses Records List */}
      <div className="space-y-2.5">
        {filteredExpenses.length > 0 ? (
          filteredExpenses.map((expense) => {
            const meta = TRANSPORT_ICONS[expense.category] || TRANSPORT_ICONS.Other;
            const Icon = meta.icon;
            return (
              <div
                key={expense.id}
                className="glass-panel-subtle p-3.5 transition group hover:border-[#FF7628]/35"
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left: Category Icon & Details */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs"
                      style={{ backgroundColor: `${meta.color}20` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: meta.color }} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                          {expense.category}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                          expense.syncStatus === 'synced'
                            ? 'bg-[#22C58B]/15 text-[#16A34A] dark:text-[#22C58B]'
                            : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-[#9FA2AC]'
                        }`}>
                          {expense.syncStatus === 'synced' ? 'Synced' : 'Local'}
                        </span>
                      </div>

                      {/* Route */}
                      {expense.fromLocation && expense.toLocation && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-800 dark:text-white/90 mt-1 font-medium truncate">
                          <MapPin className="w-3.5 h-3.5 text-[#FF7628] flex-shrink-0" />
                          <span>{expense.fromLocation}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400 dark:text-[#9FA2AC] flex-shrink-0" />
                          <span>{expense.toLocation}</span>
                        </div>
                      )}

                      {/* Note */}
                      {expense.note && (
                        <p className="text-xs text-slate-500 dark:text-[#9FA2AC] mt-1 truncate">
                          "{expense.note}"
                        </p>
                      )}

                      {/* Date & Time */}
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-[#9FA2AC] mt-1.5">
                        <Calendar className="w-3 h-3" />
                        <span>{expense.date}</span>
                        <span>·</span>
                        <Clock className="w-3 h-3" />
                        <span>{expense.time || '12:00'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount & Actions */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <div className="text-base sm:text-lg font-black text-[#FF7628]">
                      {currencySymbol}{expense.amount}
                    </div>

                    {/* Quick action buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onRepeatExpense(expense)}
                        title="Repeat expense"
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-[#FF7628]/20 text-slate-400 dark:bg-white/5 dark:text-[#9FA2AC] hover:text-[#FF7628] transition active:scale-95"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onEditExpense(expense)}
                        title="Edit expense"
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-400 dark:bg-white/5 dark:text-[#9FA2AC] dark:hover:text-white transition active:scale-95"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setExpenseToDelete(expense)}
                        title="Delete expense"
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-red-500/20 text-slate-400 dark:bg-white/5 dark:text-[#9FA2AC] hover:text-red-500 transition active:scale-95"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="glass-panel py-16 text-center p-6 flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-[#FF7628]/15 text-[#FF7628] flex items-center justify-center mb-3 shadow-xs">
              <Search className="w-6 h-6 stroke-[2.2]" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">No expenses matched your filter</h3>
            <p className="text-xs text-slate-500 dark:text-[#9FA2AC] max-w-xs mt-1 mb-4">
              Try adjusting your search query, date filter, or record a new expense.
            </p>
            <button
              onClick={onAddExpense}
              className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#FF7628] to-[#FF8C42] text-white font-bold text-xs shadow-md shadow-[#FF7628]/25 hover:brightness-110 transition active:scale-95 cursor-pointer"
            >
              + Add New Expense
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {expenseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-4 animate-in fade-in">
          <div className="glass-panel w-full max-w-sm p-5 text-slate-900 dark:text-white shadow-2xl">
            <div className="flex items-center gap-3 text-red-500 mb-3">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Expense Record?</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-[#9FA2AC] mb-4 leading-relaxed">
              Are you sure you want to delete this {expenseToDelete.category} expense of{' '}
              <strong className="text-slate-900 dark:text-white">{currencySymbol}{expenseToDelete.amount}</strong> ({expenseToDelete.date})?
              All dashboard totals and charts will recalculate automatically.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setExpenseToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/10 dark:hover:bg-white/15 text-xs font-semibold dark:text-white transition active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-bold text-white shadow-md transition active:scale-95 cursor-pointer"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
