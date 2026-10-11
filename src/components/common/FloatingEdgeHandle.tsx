import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  CheckSquare, 
  Smartphone, 
  ChevronLeft, 
  ChevronRight, 
  X,
  Wallet,
  CheckCircle2,
  HelpCircle,
  GripVertical,
  EyeOff
} from 'lucide-react';

interface FloatingEdgeHandleProps {
  onAddExpense: () => void;
  onOpenHabits: () => void;
  onOpenOverlayGuide: () => void;
  isModalOpen?: boolean;
}

export const FloatingEdgeHandle: React.FC<FloatingEdgeHandleProps> = ({
  onAddExpense,
  onOpenHabits,
  onOpenOverlayGuide,
  isModalOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('omni_edge_handle_dismissed') === 'true';
    }
    return false;
  });

  const [topPercent, setTopPercent] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('omni_edge_handle_top');
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val >= 15 && val <= 75) return val;
      }
    }
    return 42;
  });

  const [side, setSide] = useState<'right' | 'left'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('omni_edge_handle_side') as 'right' | 'left') || 'right';
    }
    return 'right';
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const initialTop = useRef(topPercent);
  const hasMoved = useRef(false);

  // Save preferences
  useEffect(() => {
    localStorage.setItem('omni_edge_handle_top', topPercent.toString());
    localStorage.setItem('omni_edge_handle_side', side);
    localStorage.setItem('omni_edge_handle_dismissed', isDismissed.toString());
  }, [topPercent, side, isDismissed]);

  // Handle drag gesture on the tab
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartY.current = clientY;
    initialTop.current = topPercent;
    hasMoved.current = false;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const deltaY = clientY - dragStartY.current;

    if (Math.abs(deltaY) > 6) {
      hasMoved.current = true;
    }

    const windowHeight = window.innerHeight;
    const newPercent = Math.max(16, Math.min(76, initialTop.current + (deltaY / windowHeight) * 100));
    setTopPercent(newPercent);
  };

  const handleTouchEnd = () => {
    if (isDragging) {
      setIsDragging(false);
      if (!hasMoved.current) {
        // Simple tap: toggle menu
        setIsOpen(!isOpen);
      }
    }
  };

  const handleDismiss = () => {
    setIsOpen(false);
    setIsDismissed(true);
  };

  // If a modal/bottom sheet is open or handle was dismissed, hide handle
  if (isModalOpen || isDismissed) return null;

  const isRight = side === 'right';

  return (
    <>
      {/* Backdrop when menu is open */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-150"
        />
      )}

      {/* Draggable Edge Handle & Menu Container */}
      <div 
        style={{ top: `${topPercent}%` }}
        className={`fixed ${isRight ? 'right-0' : 'left-0'} -translate-y-1/2 z-40 flex items-center select-none touch-none transition-transform duration-75`}
      >
        {/* Expanded Popup Menu */}
        {isOpen && (
          <div className={`glass-panel ${isRight ? 'mr-3' : 'ml-3 order-last'} w-72 p-4 shadow-2xl text-slate-900 dark:text-white animate-in ${isRight ? 'slide-in-from-right-4' : 'slide-in-from-left-4'} duration-200 border-[#FF7628]/40`}>
            
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200/70 dark:border-white/10">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FF7628] animate-ping" />
                <span className="text-[11px] font-bold tracking-wider text-[#FF7628] uppercase">
                  Quick Capture Dock
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleDismiss}
                  title="Hide Edge Handle (can restore in Settings)"
                  className="p-1 rounded-lg text-slate-400 dark:text-[#9FA2AC] hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-white transition"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  aria-label="Close Quick Capture Dock"
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 dark:text-[#9FA2AC] hover:text-slate-900 dark:hover:text-white transition active:scale-90"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {/* Option 1: Record Expense */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  onAddExpense();
                }}
                className="glass-panel-subtle w-full flex items-center gap-3 p-2.5 rounded-2xl text-left transition group active:scale-95 shadow-xs hover:border-[#FF7628]/50 hover:bg-[#FF7628]/10 cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF7628] to-[#FF9457] text-white flex items-center justify-center font-black shadow-md shadow-[#FF7628]/25 flex-shrink-0">
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#FF7628] transition-colors">
                    Record Expense
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-[#9FA2AC] truncate">
                    One-tap commute & fares log
                  </div>
                </div>
              </button>

              {/* Option 2: Habit Checklist */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenHabits();
                }}
                className="glass-panel-subtle w-full flex items-center gap-3 p-2.5 rounded-2xl text-left transition group active:scale-95 shadow-xs hover:border-[#22C58B]/50 hover:bg-[#22C58B]/10 cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#22C58B] to-[#34D399] text-white flex items-center justify-center shadow-md shadow-[#22C58B]/25 flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#16A34A] dark:group-hover:text-[#22C58B] transition-colors">
                    Habit Checklist
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-[#9FA2AC] truncate">
                    Check today's active streaks
                  </div>
                </div>
              </button>

              {/* Option 3: Switch Edge Dock */}
              <button
                onClick={() => setSide(isRight ? 'left' : 'right')}
                className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-[#9FA2AC] hover:text-slate-900 dark:hover:text-white transition text-xs cursor-pointer"
              >
                <span>Dock to {isRight ? 'Left' : 'Right'} Edge</span>
                <span className="text-[10px] font-bold text-[#FF7628]">Switch</span>
              </button>

              {/* Option 4: Android Native Overlay Specs */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenOverlayGuide();
                }}
                className="w-full flex items-center gap-2.5 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-left transition text-slate-600 dark:text-[#9FA2AC] hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <Smartphone className="w-4 h-4 text-[#FF7628] flex-shrink-0" />
                <span className="text-[11px] font-semibold truncate">
                  Android Native Overlay Blueprint
                </span>
              </button>
            </div>

            {/* In-app distinction disclaimer */}
            <p className="mt-2.5 pt-2 border-t border-slate-200/70 dark:border-white/10 text-[9px] text-slate-500 dark:text-[#9FA2AC] leading-relaxed">
              <strong>In-app web handle:</strong> Drag tab up/down to reposition. To float over third-party Android apps (Maps, Rides), tap the Android Blueprint.
            </p>
          </div>
        )}

        {/* Edge Trigger Tab */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleTouchStart}
          onMouseMove={handleTouchMove}
          onMouseUp={handleTouchEnd}
          role="button"
          tabIndex={0}
          aria-label="Drag or tap OMNI Quick Capture Edge Handle"
          className={`group flex items-center justify-center h-16 w-9 ${
            isRight ? 'rounded-l-2xl border-l border-y' : 'rounded-r-2xl border-r border-y'
          } bg-gradient-to-b from-[#FF7628] to-[#FF9457] text-white shadow-xl shadow-[#FF7628]/40 border-white/30 backdrop-blur-xl transition-all hover:w-10 active:scale-95 touch-none cursor-grab active:cursor-grabbing ${
            isOpen ? 'brightness-125' : 'opacity-95 hover:opacity-100'
          }`}
          title="Drag up/down to reposition. Tap to open Quick Capture."
        >
          {isOpen ? (
            isRight ? <ChevronRight className="w-5 h-5 stroke-[2.5]" /> : <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
          ) : (
            <div className="flex flex-col items-center gap-1">
              <GripVertical className="w-3.5 h-3.5 opacity-80" />
              <div className="w-1.5 h-3.5 rounded-full bg-white/95 shadow-xs" />
            </div>
          )}
        </div>
      </div>
    </>
  );
};
