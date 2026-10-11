import React, { useState } from 'react';
import { 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  Database, 
  Layers, 
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Info
} from 'lucide-react';
import type { BackupInspectionReport, RestoreMode, RestoreExecutionResult } from '../../utils/backupUtils';
import { executeBackupRestore } from '../../utils/backupUtils';
import { formatHumanDate } from '../../utils/dateUtils';

interface BackupPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: BackupInspectionReport | null;
  onRestoreCompleted: (result: RestoreExecutionResult) => void;
  theme: 'dark' | 'light';
}

export const BackupPreviewModal: React.FC<BackupPreviewModalProps> = ({
  isOpen,
  onClose,
  report,
  onRestoreCompleted,
  theme,
}) => {
  const [selectedMode, setSelectedMode] = useState<RestoreMode>('merge');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || !report) return null;

  const totalDuplicates = 
    report.entities.expenses.duplicateCount + 
    report.entities.habits.duplicateCount + 
    report.entities.completions.duplicateCount;

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      const result = await executeBackupRestore(report.parsedBackup, selectedMode);
      onRestoreCompleted(result);
      onClose();
    } catch (e: any) {
      onRestoreCompleted({
        success: false,
        message: e.message || 'Unexpected restore failure',
        mode: selectedMode,
        restoredCounts: {
          expensesAdded: 0,
          expensesUpdated: 0,
          habitsAdded: 0,
          habitsUpdated: 0,
          completionsAdded: 0,
          completionsUpdated: 0,
          budgetsCount: 0,
          routesCount: 0,
        },
      });
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="fixed inset-0 -z-10" onClick={() => !isProcessing && onClose()} />

      <div className="glass-panel w-full max-w-xl rounded-3xl p-5 sm:p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150 border-white/15">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/50 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#22C58B]/15 border border-[#22C58B]/30 flex items-center justify-center text-[#22C58B]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Backup Inspection & Restore</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#FF7628]/20 text-[#FF7628] border border-[#FF7628]/30">
                  v{report.version}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#9FA2AC]">
                Exported: {formatHumanDate(report.exportedAt.substring(0, 10))} • {new Date(report.exportedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:text-[#9FA2AC] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warnings & Integrity notice */}
        {report.warnings.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Safety Notices:</span>
            </div>
            {report.warnings.map((w, idx) => (
              <p key={idx} className="pl-5 text-[11px] leading-relaxed">• {w}</p>
            ))}
          </div>
        )}

        {/* Entities Breakdown Cards */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
            <span>Incoming Data Breakdown</span>
            <span className="text-[11px] text-slate-500 dark:text-[#9FA2AC] font-normal">
              Validated {report.entities.expenses.totalInBackup + report.entities.habits.totalInBackup + report.entities.completions.totalInBackup} total items
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {/* Expenses */}
            <div className="glass-panel-subtle p-3 rounded-2xl">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-[#9FA2AC] mb-1">Expenses</div>
              <div className="text-base font-black text-slate-900 dark:text-white">
                {report.entities.expenses.totalInBackup}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-[#9FA2AC] mt-0.5">
                {report.entities.expenses.newCount} new • {report.entities.expenses.duplicateCount} existing
              </div>
            </div>

            {/* Habits */}
            <div className="glass-panel-subtle p-3 rounded-2xl">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-[#9FA2AC] mb-1">Habits</div>
              <div className="text-base font-black text-slate-900 dark:text-white">
                {report.entities.habits.totalInBackup}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-[#9FA2AC] mt-0.5">
                {report.entities.habits.newCount} new • {report.entities.habits.duplicateCount} existing
              </div>
            </div>

            {/* Completions */}
            <div className="glass-panel-subtle p-3 rounded-2xl">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-[#9FA2AC] mb-1">Completions</div>
              <div className="text-base font-black text-slate-900 dark:text-white">
                {report.entities.completions.totalInBackup}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-[#9FA2AC] mt-0.5">
                {report.entities.completions.newCount} new • {report.entities.completions.duplicateCount} existing
              </div>
            </div>

            {/* Budgets */}
            <div className="glass-panel-subtle p-3 rounded-2xl">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-[#9FA2AC] mb-1">Monthly Budgets</div>
              <div className="text-base font-black text-slate-900 dark:text-white">
                {report.entities.budgets.totalInBackup}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-[#9FA2AC] mt-0.5">
                {report.entities.budgets.totalInBackup} month plans
              </div>
            </div>

            {/* Routes */}
            <div className="glass-panel-subtle p-3 rounded-2xl col-span-2 sm:col-span-2">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-[#9FA2AC] mb-1">Commute Quick Routes</div>
              <div className="text-base font-black text-slate-900 dark:text-white">
                {report.entities.quickRoutes.totalInBackup}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-[#9FA2AC] mt-0.5">
                Saved origins, destinations & fares
              </div>
            </div>
          </div>
        </div>

        {/* Restore Strategy Selection */}
        <div className="space-y-2 pt-1">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
            Choose Restore Strategy:
          </label>

          <div className="space-y-2">
            {/* Merge Option */}
            <label
              className={`flex items-start gap-3 p-3 rounded-2xl border transition cursor-pointer select-none ${
                selectedMode === 'merge'
                  ? 'border-[#22C58B] bg-[#22C58B]/10 shadow-sm'
                  : 'glass-panel-subtle hover:border-slate-300 dark:hover:border-white/20'
              }`}
            >
              <input
                type="radio"
                name="restoreMode"
                value="merge"
                checked={selectedMode === 'merge'}
                onChange={() => setSelectedMode('merge')}
                className="mt-1 accent-[#22C58B]"
              />
              <div className="flex-1">
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>Merge & Preserve Existing</span>
                  <span className="text-[10px] font-medium px-2 py-0.2 rounded-full bg-[#22C58B]/20 text-[#22C58B]">
                    Safest
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-[#9FA2AC] mt-0.5 leading-snug">
                  Adds only brand new records. If any records already exist in your local database with matching IDs, your current local copies will remain untouched.
                </p>
              </div>
            </label>

            {/* Overwrite Option */}
            <label
              className={`flex items-start gap-3 p-3 rounded-2xl border transition cursor-pointer select-none ${
                selectedMode === 'overwrite'
                  ? 'border-[#FF7628] bg-[#FF7628]/10 shadow-sm'
                  : 'glass-panel-subtle hover:border-slate-300 dark:hover:border-white/20'
              }`}
            >
              <input
                type="radio"
                name="restoreMode"
                value="overwrite"
                checked={selectedMode === 'overwrite'}
                onChange={() => setSelectedMode('overwrite')}
                className="mt-1 accent-[#FF7628]"
              />
              <div className="flex-1">
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Update & Overwrite Matching IDs
                </div>
                <p className="text-[11px] text-slate-500 dark:text-[#9FA2AC] mt-0.5 leading-snug">
                  Adds new records and updates any records sharing identical IDs with the backup copy.
                </p>
              </div>
            </label>

            {/* Clean Option */}
            <label
              className={`flex items-start gap-3 p-3 rounded-2xl border transition cursor-pointer select-none ${
                selectedMode === 'clean'
                  ? 'border-red-500 bg-red-500/10 shadow-sm'
                  : 'glass-panel-subtle hover:border-slate-300 dark:hover:border-white/20'
              }`}
            >
              <input
                type="radio"
                name="restoreMode"
                value="clean"
                checked={selectedMode === 'clean'}
                onChange={() => setSelectedMode('clean')}
                className="mt-1 accent-red-500"
              />
              <div className="flex-1">
                <div className="text-xs font-bold text-red-500 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Clean Replace (Wipe & Restore)</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-[#9FA2AC] mt-0.5 leading-snug">
                  Completely replaces current local database with this backup file snapshot.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200/50 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2.5 rounded-xl glass-panel-subtle text-xs font-bold text-slate-600 dark:text-[#9FA2AC] hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isProcessing}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#22C58B] to-[#16A34A] text-white text-xs font-bold shadow-lg shadow-[#22C58B]/25 hover:opacity-95 transition flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {isProcessing ? (
              <span>Restoring Data...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Execute Safe Restore</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
