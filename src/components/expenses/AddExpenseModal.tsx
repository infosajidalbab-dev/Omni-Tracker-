import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Check, 
  MapPin, 
  Calendar, 
  Clock, 
  FileText, 
  Sparkles, 
  Bike, 
  Bus, 
  Car, 
  Footprints, 
  Navigation, 
  ShoppingBag, 
  Utensils, 
  HelpCircle,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Delete,
  Bookmark,
  Trash2,
  ChevronDown,
  ChevronUp,
  Layers
} from 'lucide-react';
import { 
  addExpense, 
  updateExpense, 
  db, 
  getExpenseTemplates, 
  addExpenseTemplate, 
  deleteExpenseTemplate, 
  incrementExpenseTemplateUsage 
} from '../../database/db';
import { getLocalDateString, getLocalTimeString } from '../../utils/dateUtils';
import type { Expense, QuickRoute, TransportType, ExpenseTemplate } from '../../types';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialExpense?: Expense | null;
  currencySymbol?: string;
  repeatExpense?: Expense | null;
  theme?: 'dark' | 'light';
}

const TRANSPORT_CATEGORIES: Array<{
  id: TransportType;
  label: string;
  icon: React.ElementType;
  color: string;
}> = [
  { id: 'Rickshaw', label: 'Rickshaw', icon: Bike, color: '#FF7628' },
  { id: 'Bus', label: 'Bus', icon: Bus, color: '#38BDF8' },
  { id: 'CNG', label: 'CNG', icon: Car, color: '#22C58B' },
  { id: 'Bike', label: 'Bike', icon: Navigation, color: '#A855F7' },
  { id: 'Walking', label: 'Walking', icon: Footprints, color: '#EAB308' },
  { id: 'Food', label: 'Food', icon: Utensils, color: '#F43F5E' },
  { id: 'Shopping', label: 'Shopping', icon: ShoppingBag, color: '#EC4899' },
  { id: 'Other', label: 'Other', icon: HelpCircle, color: '#94A3B8' },
];

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  initialExpense,
  repeatExpense,
  currencySymbol = '৳',
  theme = 'dark',
}) => {
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<TransportType>('Rickshaw');
  const [fromLocation, setFromLocation] = useState<string>('');
  const [toLocation, setToLocation] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [quickRoutes, setQuickRoutes] = useState<QuickRoute[]>([]);
  const [templates, setTemplates] = useState<ExpenseTemplate[]>([]);
  const [showKeypad, setShowKeypad] = useState(true);
  const [showSaveTemplateInput, setShowSaveTemplateInput] = useState(false);
  const [templateTitle, setTemplateTitle] = useState('');
  const [showDetailsSection, setShowDetailsSection] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Debounce protection against rapid double clicks
  const lastSubmitTimestampRef = useRef<number>(0);

  // Initialize form state
  useEffect(() => {
    if (!isOpen) return;

    const dateStr = getLocalDateString();
    const timeStr = getLocalTimeString();

    if (initialExpense) {
      setAmount(initialExpense.amount.toString());
      setCategory(initialExpense.category);
      setFromLocation(initialExpense.fromLocation || '');
      setToLocation(initialExpense.toLocation || '');
      setNote(initialExpense.note || '');
      setDate(initialExpense.date || dateStr);
      setTime(initialExpense.time || timeStr);
      setShowDetailsSection(true);
      setShowKeypad(false);
    } else if (repeatExpense) {
      setAmount(repeatExpense.amount.toString());
      setCategory(repeatExpense.category);
      setFromLocation(repeatExpense.fromLocation || '');
      setToLocation(repeatExpense.toLocation || '');
      setNote(repeatExpense.note ? `(Repeat) ${repeatExpense.note}` : '');
      setDate(dateStr);
      setTime(timeStr);
      setShowDetailsSection(Boolean(repeatExpense.fromLocation || repeatExpense.toLocation || repeatExpense.note));
      setShowKeypad(true);
    } else {
      setAmount('');
      setCategory('Rickshaw');
      setFromLocation('');
      setToLocation('');
      setNote('');
      setDate(dateStr);
      setTime(timeStr);
      setShowDetailsSection(false);
      setShowKeypad(true);
    }

    setErrorMessage('');
    setShowSuccessToast(false);
    setShowSaveTemplateInput(false);
    setTemplateTitle('');

    // Fetch frequent routes & saved templates
    db.quickRoutes.orderBy('usageCount').reverse().limit(4).toArray().then(setQuickRoutes);
    getExpenseTemplates().then(setTemplates);
  }, [isOpen, initialExpense, repeatExpense]);

  if (!isOpen) return null;

  // Keypad Handlers
  const handleKeypadPress = (val: string) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(15); } catch {}
    }

    if (val === 'C') {
      setAmount('');
      return;
    }

    if (val === 'BACK') {
      setAmount(prev => prev.slice(0, -1));
      return;
    }

    if (val === '.') {
      if (amount.includes('.')) return;
      setAmount(prev => (prev === '' ? '0.' : prev + '.'));
      return;
    }

    // Limit length to realistic maximum
    if (amount.length >= 8) return;
    setAmount(prev => prev + val);
  };

  const addQuickChip = (chipAmount: number) => {
    const cur = parseFloat(amount) || 0;
    setAmount((cur + chipAmount).toString());
  };

  const handleSelectRoute = (route: QuickRoute) => {
    setFromLocation(route.fromLocation);
    setToLocation(route.toLocation);
    setCategory(route.category);
    if (route.typicalAmount && !amount) {
      setAmount(route.typicalAmount.toString());
    }
    setShowDetailsSection(true);
  };

  const handleApplyTemplate = async (tpl: ExpenseTemplate) => {
    setAmount(tpl.amount.toString());
    setCategory(tpl.category);
    setFromLocation(tpl.fromLocation || '');
    setToLocation(tpl.toLocation || '');
    setNote(tpl.note || '');
    setShowDetailsSection(true);
    await incrementExpenseTemplateUsage(tpl.id);
  };

  const handleSaveAsTemplate = async () => {
    const parsedAmount = parseFloat(amount.trim());
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Please enter a valid amount before saving template');
      return;
    }
    const title = templateTitle.trim() || `${category} (${fromLocation || 'Commute'})`;
    try {
      await addExpenseTemplate({
        title,
        amount: parsedAmount,
        category,
        fromLocation: fromLocation.trim(),
        toLocation: toLocation.trim(),
        note: note.trim(),
      });
      const updated = await getExpenseTemplates();
      setTemplates(updated);
      setShowSaveTemplateInput(false);
      setTemplateTitle('');
    } catch (e: any) {
      console.warn('Failed saving template:', e);
    }
  };

  const handleDeleteTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteExpenseTemplate(id);
    const updated = await getExpenseTemplates();
    setTemplates(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent duplicate rapid submissions
    const now = Date.now();
    if (isSubmitting || now - lastSubmitTimestampRef.current < 1500) {
      return;
    }
    lastSubmitTimestampRef.current = now;

    const parsedAmount = parseFloat(amount.trim());
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Please enter a valid expense amount greater than 0');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const timestamp = new Date(`${date}T${time || '12:00'}`).getTime() || Date.now();

      if (initialExpense) {
        await updateExpense(initialExpense.id, {
          amount: parsedAmount,
          category,
          fromLocation: fromLocation.trim(),
          toLocation: toLocation.trim(),
          note: note.trim(),
          date,
          time,
          timestamp,
        });
      } else {
        await addExpense({
          amount: parsedAmount,
          currency: currencySymbol,
          category,
          fromLocation: fromLocation.trim(),
          toLocation: toLocation.trim(),
          note: note.trim(),
          date,
          time,
          timestamp,
        });
      }

      // Haptic confirmation
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate([25, 40, 25]); } catch {}
      }

      setShowSuccessToast(true);
      setTimeout(() => {
        setIsSubmitting(false);
        onSaved();
        onClose();
      }, 400);
    } catch (err: any) {
      console.error('Failed saving expense:', err);
      setErrorMessage(err.message || 'Storage error while saving record');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-md p-0 sm:p-4 overflow-y-auto">
      <div className="glass-panel w-full sm:max-w-lg rounded-t-[2.2rem] sm:rounded-[2rem] shadow-2xl max-h-[94vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
        
        {/* Grab Handle for Android bottom sheet */}
        <div className="sm:hidden w-12 h-1.5 rounded-full mx-auto mt-2.5 bg-slate-300 dark:bg-white/20" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-3 pb-3 border-b border-slate-200/70 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FF7628]/20 text-[#FF7628] flex items-center justify-center font-black shadow-xs">
              {currencySymbol}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {initialExpense ? 'Edit Expense Record' : 'Quick Expense Entry'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-[#9FA2AC]">
                {initialExpense ? 'Update commute or spending details' : 'Fast one-handed mobile capture'}
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

        {/* Success Banner Overlay */}
        {showSuccessToast && (
          <div className="px-5 py-2.5 bg-[#22C58B]/20 border-b border-[#22C58B]/40 text-[#22C58B] text-xs font-bold flex items-center justify-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Saved to local storage successfully!</span>
          </div>
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-500 dark:text-red-400 text-xs font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Repeat Expense Templates Bar */}
          {templates.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#9FA2AC] flex items-center gap-1">
                  <Bookmark className="w-3 h-3 text-[#FF7628]" />
                  <span>Favorite Templates</span>
                </span>
                <span className="text-[10px] text-slate-400">1-tap auto-fill</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    onClick={() => handleApplyTemplate(tpl)}
                    className="glass-panel-subtle flex items-center gap-1.5 px-3 py-1.5 rounded-xl cursor-pointer hover:border-[#FF7628]/40 text-xs whitespace-nowrap active:scale-95 transition-all text-slate-800 dark:text-white group"
                  >
                    <span className="font-semibold">{tpl.title}</span>
                    <span className="text-[10px] text-emerald-500 font-bold">
                      {currencySymbol}{tpl.amount}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteTemplate(tpl.id, e)}
                      title="Remove template"
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400 transition"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Amount Display & Input Target */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#9FA2AC]">
                Amount ({currencySymbol}) *
              </label>
              <button
                type="button"
                onClick={() => setShowKeypad(!showKeypad)}
                className="text-[11px] font-semibold text-[#FF7628] hover:underline"
              >
                {showKeypad ? 'Use Keyboard' : 'Open Touch Keypad'}
              </button>
            </div>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-[#FF7628]">
                {currencySymbol}
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                placeholder="0"
                readOnly={showKeypad}
                onChange={(e) => setAmount(e.target.value)}
                onClick={() => { if (!showKeypad) {} }}
                className="glass-input w-full pl-11 pr-4 py-3 rounded-2xl text-3xl font-black text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/20 select-all"
              />
              {amount && (
                <button
                  type="button"
                  onClick={() => setAmount('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick Increment Chips */}
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-0.5 no-scrollbar">
              <span className="text-[10px] font-semibold text-slate-400 dark:text-[#9FA2AC] flex-shrink-0">
                + Quick:
              </span>
              {[20, 30, 50, 100, 200, 500].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => addQuickChip(chip)}
                  className="glass-panel-subtle px-2.5 py-1 text-xs font-bold rounded-lg text-slate-700 dark:text-slate-200 active:scale-95 transition hover:border-[#FF7628]/40 flex-shrink-0 cursor-pointer"
                >
                  +{chip}
                </button>
              ))}
            </div>
          </div>

          {/* Tactile Mobile Numeric Keypad */}
          {showKeypad && (
            <div className="glass-panel-subtle p-2.5 rounded-2xl space-y-1.5 animate-in fade-in duration-150">
              <div className="grid grid-cols-4 gap-1.5">
                {['1', '2', '3', '+20'].map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => k.startsWith('+') ? addQuickChip(parseInt(k.slice(1))) : handleKeypadPress(k)}
                    className={`py-3 rounded-xl font-bold text-base transition active:scale-90 cursor-pointer flex items-center justify-center ${
                      k.startsWith('+')
                        ? 'bg-[#FF7628]/15 text-[#FF7628] hover:bg-[#FF7628]/25 text-xs'
                        : 'bg-white/80 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 text-slate-900 dark:text-white shadow-xs'
                    }`}
                  >
                    {k}
                  </button>
                ))}

                {['4', '5', '6', '+50'].map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => k.startsWith('+') ? addQuickChip(parseInt(k.slice(1))) : handleKeypadPress(k)}
                    className={`py-3 rounded-xl font-bold text-base transition active:scale-90 cursor-pointer flex items-center justify-center ${
                      k.startsWith('+')
                        ? 'bg-[#FF7628]/15 text-[#FF7628] hover:bg-[#FF7628]/25 text-xs'
                        : 'bg-white/80 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 text-slate-900 dark:text-white shadow-xs'
                    }`}
                  >
                    {k}
                  </button>
                ))}

                {['7', '8', '9', 'C'].map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => handleKeypadPress(k)}
                    className={`py-3 rounded-xl font-bold text-base transition active:scale-90 cursor-pointer flex items-center justify-center ${
                      k === 'C'
                        ? 'bg-red-500/15 text-red-500 hover:bg-red-500/25 text-sm font-black'
                        : 'bg-white/80 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 text-slate-900 dark:text-white shadow-xs'
                    }`}
                  >
                    {k}
                  </button>
                ))}

                {['.', '0', '00', 'BACK'].map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => handleKeypadPress(k)}
                    className={`py-3 rounded-xl font-bold text-base transition active:scale-90 cursor-pointer flex items-center justify-center ${
                      k === 'BACK'
                        ? 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white text-sm'
                        : 'bg-white/80 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 text-slate-900 dark:text-white shadow-xs'
                    }`}
                  >
                    {k === 'BACK' ? <Delete className="w-5 h-5" /> : k}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 1-Tap Transport Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-500 dark:text-[#9FA2AC]">
              Select Transport *
            </label>
            <div className="grid grid-cols-4 gap-2">
              {TRANSPORT_CATEGORIES.map((item) => {
                const Icon = item.icon;
                const isSelected = category === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setCategory(item.id);
                      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                        try { navigator.vibrate(12); } catch {}
                      }
                    }}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition active:scale-95 cursor-pointer ${
                      isSelected
                        ? 'border-[#FF7628] bg-[#FF7628]/20 text-[#FF7628] font-bold shadow-md shadow-[#FF7628]/20 ring-1 ring-[#FF7628]'
                        : 'glass-panel-subtle text-slate-600 dark:text-[#9FA2AC] hover:text-slate-950 dark:hover:text-white hover:border-slate-300 dark:hover:border-white/20'
                    }`}
                  >
                    <Icon
                      className="w-5 h-5 mb-1"
                      style={{ color: isSelected ? '#FF7628' : item.color }}
                    />
                    <span className="text-[11px] font-semibold truncate w-full">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Frequent Commute Routes */}
          {quickRoutes.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#9FA2AC]">
                  Frequent Routes
                </span>
                <span className="text-[10px] text-[#FF7628] font-medium">Tap to fill</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {quickRoutes.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleSelectRoute(r)}
                    className="glass-panel-subtle flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-xl active:scale-95 transition hover:border-[#FF7628]/40 text-slate-800 dark:text-white cursor-pointer"
                  >
                    <MapPin className="w-3 h-3 text-[#FF7628]" />
                    <span>{r.fromLocation}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                    <span>{r.toLocation}</span>
                    {r.typicalAmount && (
                      <span className="text-[10px] text-emerald-500 font-bold">
                        ({currencySymbol}{r.typicalAmount})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Optional Origin, Destination, & Note Accordion Toggle */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowDetailsSection(!showDetailsSection)}
              className="w-full flex items-center justify-between p-2.5 rounded-xl glass-panel-subtle text-xs font-semibold text-slate-700 dark:text-[#9FA2AC] hover:text-slate-950 dark:hover:text-white cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#FF7628]" />
                <span>
                  {showDetailsSection ? 'Hide Origin, Destination & Note' : 'Add Route / Origin, Destination & Note'}
                </span>
                {(fromLocation || toLocation || note) && (
                  <span className="w-2 h-2 rounded-full bg-[#FF7628]" />
                )}
              </span>
              {showDetailsSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {/* Expandable Details Form */}
          {showDetailsSection && (
            <div className="space-y-3 p-3 rounded-2xl bg-slate-100/70 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/10 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold mb-1 text-slate-600 dark:text-[#9FA2AC]">
                    From (Origin)
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. Dhanmondi, Home"
                      value={fromLocation}
                      onChange={(e) => setFromLocation(e.target.value)}
                      className="glass-input w-full pl-8 pr-3 py-2 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold mb-1 text-slate-600 dark:text-[#9FA2AC]">
                    To (Destination)
                  </label>
                  <div className="relative">
                    <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. Gulshan 1, Office"
                      value={toLocation}
                      onChange={(e) => setToLocation(e.target.value)}
                      className="glass-input w-full pl-8 pr-3 py-2 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold mb-1 text-slate-600 dark:text-[#9FA2AC]">
                  Optional Note
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="e.g. Shared CNG, Rain fare, Snack with team"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="glass-input w-full pl-8 pr-3 py-2 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400"
                  />
                </div>
              </div>

              {/* Save as Repeat Template Option */}
              <div className="pt-1">
                {showSaveTemplateInput ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Template title (e.g. Daily Metro Ride)"
                      value={templateTitle}
                      onChange={(e) => setTemplateTitle(e.target.value)}
                      className="glass-input flex-1 px-3 py-1.5 rounded-xl text-xs text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={handleSaveAsTemplate}
                      className="px-3 py-1.5 rounded-xl bg-[#FF7628] text-white text-xs font-bold hover:brightness-110 active:scale-95 transition"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSaveTemplateInput(false)}
                      className="p-1.5 text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowSaveTemplateInput(true)}
                    className="text-[11px] text-[#FF7628] hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Bookmark className="w-3 h-3" />
                    <span>Save this entry as a fast template</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Date & Time Selection */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <div>
              <label className="block text-[11px] font-semibold mb-1 text-slate-600 dark:text-[#9FA2AC]">
                Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="glass-input w-full pl-8 pr-2 py-1.5 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold mb-1 text-slate-600 dark:text-[#9FA2AC]">
                Time
              </label>
              <div className="relative">
                <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="time"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="glass-input w-full pl-8 pr-2 py-1.5 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 pb-1 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl font-semibold text-xs transition active:scale-98 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#FF7628] to-[#FF8C42] text-white font-bold text-xs shadow-lg shadow-[#FF7628]/35 hover:brightness-110 active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{initialExpense ? 'Save Changes' : 'Log Expense Now'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
