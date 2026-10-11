import React, { useState } from 'react';
import { 
  Sun, 
  Moon, 
  DollarSign, 
  Wallet, 
  Download, 
  Upload, 
  Trash2, 
  Smartphone, 
  Cloud, 
  ShieldCheck, 
  Info, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Check,
  Languages,
  FileText,
  Compass
} from 'lucide-react';
import { 
  exportDatabaseBackup, 
  resetDatabase 
} from '../../database/db';
import { getLocalDateString } from '../../utils/dateUtils';
import { 
  validateBackupJson, 
  inspectBackupAgainstDatabase,
  type BackupInspectionReport,
  type RestoreExecutionResult 
} from '../../utils/backupUtils';
import { BackupPreviewModal } from './BackupPreviewModal';
import { LegalModal, type LegalDocType } from '../legal/LegalModal';
import { useTranslation, type Language } from '../../utils/i18n';
import type { ActiveTab } from '../../types';

interface SettingsViewProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  currencySymbol: string;
  onChangeCurrency: (sym: string) => void;
  onNavigateTab: (tab: ActiveTab) => void;
  onOpenOverlayGuide: () => void;
  onOpenOnboarding?: () => void;
}

const CURRENCIES = [
  { code: 'BDT', symbol: '৳', label: 'Bangladeshi Taka (৳)' },
  { code: 'USD', symbol: '$', label: 'US Dollar ($)' },
  { code: 'EUR', symbol: '€', label: 'Euro (€)' },
  { code: 'GBP', symbol: '£', label: 'British Pound (£)' },
  { code: 'INR', symbol: '₹', label: 'Indian Rupee (₹)' },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  theme,
  onToggleTheme,
  currencySymbol,
  onChangeCurrency,
  onNavigateTab,
  onOpenOverlayGuide,
  onOpenOnboarding,
}) => {
  const { lang, changeLanguage, t } = useTranslation();
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetInput, setResetInput] = useState('');

  // Legal modal state
  const [legalModalType, setLegalModalType] = useState<LegalDocType | null>(null);

  // Safe Backup Preview states
  const [backupReport, setBackupReport] = useState<BackupInspectionReport | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const triggerFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handleExportBackup = async () => {
    try {
      const jsonBackup = await exportDatabaseBackup();
      const blob = new Blob([jsonBackup], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `omni_tracker_backup_${getLocalDateString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      triggerFeedback('success', 'Complete JSON backup exported successfully with metadata.');
    } catch (e: any) {
      triggerFeedback('error', e.message || 'Backup export failed');
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        
        // 1. Strict validation
        const validation = validateBackupJson(text);
        if (!validation.isValid || !validation.parsedBackup) {
          triggerFeedback('error', validation.error || 'Invalid OMNI TRACKER backup file.');
          return;
        }

        // 2. Inspection against local database
        const report = await inspectBackupAgainstDatabase(validation.parsedBackup, validation.warnings);
        setBackupReport(report);
        setIsPreviewOpen(true);
      } catch (err: any) {
        triggerFeedback('error', err.message || 'Failed to inspect backup file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleRestoreCompleted = (result: RestoreExecutionResult) => {
    if (result.success) {
      triggerFeedback('success', result.message);
    } else {
      triggerFeedback('error', result.message);
    }
  };

  const handleConfirmReset = async () => {
    if (resetInput !== 'DELETE') return;
    await resetDatabase();
    setShowResetConfirm(false);
    setResetInput('');
    triggerFeedback('success', 'Database cleared and starter habits reinitialized.');
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8 max-w-3xl">
      {/* Header */}
      <div>
        <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
          Settings & Preferences
        </h2>
        <p className="text-xs text-[#A0A2AA]">
          Configure themes, currencies, local storage backups, and integrations
        </p>
      </div>

      {feedbackMessage && (
        <div className={`flex items-center gap-2 p-3.5 rounded-2xl border text-xs font-semibold ${
          feedbackMessage.type === 'success'
            ? 'bg-[#22C58B]/15 border-[#22C58B]/30 text-[#22C58B]'
            : 'bg-red-500/15 border-red-500/30 text-red-400'
        }`}>
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Appearance Section */}
      <div className="glass-panel p-5">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Theme & Appearance</h3>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-900 dark:text-white">Display Theme</div>
            <div className="text-[11px] text-slate-500 dark:text-[#9FA2AC]">
              Switch between High-Contrast Dark and Clean Light dashboards
            </div>
          </div>
          <button
            onClick={onToggleTheme}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl glass-panel-subtle hover:border-[#FF7628]/40 text-xs font-bold text-slate-900 dark:text-white transition cursor-pointer active:scale-95"
          >
            {theme === 'dark' ? <Moon className="w-4 h-4 text-[#FF7628]" /> : <Sun className="w-4 h-4 text-amber-500" />}
            <span>{theme === 'dark' ? 'Dark Theme' : 'Light Theme'}</span>
          </button>
        </div>
      </div>

      {/* Language Section (Bangla / English) */}
      <div className="glass-panel p-5">
        <div className="flex items-center gap-2 mb-2">
          <Languages className="w-4 h-4 text-[#FF7628]" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t('language')}</h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-[#9FA2AC] mb-3">
          Choose interface language (English or বাংলা). Preferences are saved locally on your device.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => changeLanguage('en')}
            className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition active:scale-95 cursor-pointer ${
              lang === 'en'
                ? 'bg-[#FF7628]/15 border-[#FF7628] text-slate-900 dark:text-white shadow-xs'
                : 'glass-panel-subtle text-slate-600 dark:text-[#9FA2AC] hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className="flex flex-col text-left">
              <span className="font-bold">English</span>
              <span className="text-[10px] text-slate-500 dark:text-[#9FA2AC]">Default</span>
            </div>
            {lang === 'en' && <Check className="w-4 h-4 text-[#FF7628]" />}
          </button>

          <button
            onClick={() => changeLanguage('bn')}
            className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition active:scale-95 cursor-pointer ${
              lang === 'bn'
                ? 'bg-[#FF7628]/15 border-[#FF7628] text-slate-900 dark:text-white shadow-xs'
                : 'glass-panel-subtle text-slate-600 dark:text-[#9FA2AC] hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className="flex flex-col text-left">
              <span className="font-bold">বাংলা (Bangla)</span>
              <span className="text-[10px] text-slate-500 dark:text-[#9FA2AC]">স্থানীয় ভাষা</span>
            </div>
            {lang === 'bn' && <Check className="w-4 h-4 text-[#FF7628]" />}
          </button>
        </div>
      </div>

      {/* Currency Section */}
      <div className="glass-panel p-5">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Default Currency</h3>
        <p className="text-xs text-slate-500 dark:text-[#9FA2AC] mb-3">
          Select primary currency for commute fares, expenses, and budget tracking.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {CURRENCIES.map((curr) => {
            const isSelected = currencySymbol === curr.symbol;
            return (
              <button
                key={curr.code}
                onClick={() => onChangeCurrency(curr.symbol)}
                className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition active:scale-95 cursor-pointer ${
                  isSelected
                    ? 'bg-[#FF7628]/15 border-[#FF7628] text-slate-900 dark:text-white shadow-xs'
                    : 'glass-panel-subtle text-slate-600 dark:text-[#9FA2AC] hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{curr.label}</span>
                {isSelected && <Check className="w-4 h-4 text-[#FF7628]" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Feature Shortcuts */}
      <div className="glass-panel p-5">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Feature Shortcuts</h3>
        <div className="space-y-2">
          <button
            onClick={() => onNavigateTab('budget')}
            className="glass-panel-subtle w-full flex items-center justify-between p-3 rounded-xl transition text-left cursor-pointer active:scale-98 hover:border-[#FF7628]/40"
          >
            <div className="flex items-center gap-3">
              <Wallet className="w-4 h-4 text-[#FF7628]" />
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">Monthly Budget Planner</div>
                <div className="text-[11px] text-slate-500 dark:text-[#9FA2AC]">Manage spending allowances and limits</div>
              </div>
            </div>
            <span className="text-xs text-[#FF7628] font-bold">Open</span>
          </button>

          <button
            onClick={() => onNavigateTab('sync')}
            className="glass-panel-subtle w-full flex items-center justify-between p-3 rounded-xl transition text-left cursor-pointer active:scale-98 hover:border-[#22C58B]/40"
          >
            <div className="flex items-center gap-3">
              <Cloud className="w-4 h-4 text-[#22C58B]" />
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">Microsoft OneDrive & Excel Cloud Sync</div>
                <div className="text-[11px] text-slate-500 dark:text-[#9FA2AC]">Configure Azure single-page app and sync queue</div>
              </div>
            </div>
            <span className="text-xs text-[#16A34A] dark:text-[#22C58B] font-bold">Open</span>
          </button>

          <button
            onClick={onOpenOverlayGuide}
            className="glass-panel-subtle w-full flex items-center justify-between p-3 rounded-xl transition text-left cursor-pointer active:scale-98 hover:border-purple-400/40"
          >
            <div className="flex items-center gap-3">
              <Smartphone className="w-4 h-4 text-purple-400" />
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">Android System Floating Overlay Guide</div>
                <div className="text-[11px] text-slate-500 dark:text-[#9FA2AC]">Native Kotlin service, WindowManager overlay &amp; bridge</div>
              </div>
            </div>
            <span className="text-xs text-purple-500 dark:text-purple-400 font-bold">View Blueprint</span>
          </button>

          {/* Reset Edge Handle visibility if dismissed */}
          <div className="glass-panel-subtle w-full flex items-center justify-between p-3 rounded-xl">
            <div className="flex items-center gap-3">
              <Smartphone className="w-4 h-4 text-[#FF7628]" />
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">In-App Floating Edge Dock</div>
                <div className="text-[11px] text-slate-500 dark:text-[#9FA2AC]">Quick draggable shortcut tab on right/left edge</div>
              </div>
            </div>
            <button
              onClick={() => {
                localStorage.setItem('omni_edge_handle_dismissed', 'false');
                triggerFeedback('success', 'In-app edge handle restored to screen');
                window.location.reload();
              }}
              className="px-3 py-1.5 rounded-lg bg-[#FF7628]/15 hover:bg-[#FF7628]/25 text-[#FF7628] font-bold text-xs transition cursor-pointer"
            >
              Reset Dock Position
            </button>
          </div>
        </div>
      </div>

      {/* Backup & Restore */}
      <div className="glass-panel p-5">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Local Data Backup & Restore</h3>
        <p className="text-xs text-slate-500 dark:text-[#9FA2AC] mb-4">
          Export an offline JSON snapshot of all your expenses, habits, routes, and budget records.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleExportBackup}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl glass-panel-subtle hover:border-[#FF7628]/40 text-slate-900 dark:text-white font-bold text-xs transition cursor-pointer active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Export JSON Backup</span>
          </button>

          <label className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl glass-panel-subtle hover:border-[#22C58B]/40 text-slate-900 dark:text-white font-bold text-xs transition cursor-pointer active:scale-95">
            <Upload className="w-4 h-4" />
            <span>Restore JSON Backup</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Legal, Privacy & About Section */}
      <div className="glass-panel p-5">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">Legal, Privacy & About</h3>
        <p className="text-xs text-slate-500 dark:text-[#9FA2AC] mb-3">
          OMNI TRACKER guarantees that your tracking records stay strictly on your device unless you connect OneDrive.
        </p>

        <div className="space-y-2">
          <button
            onClick={() => setLegalModalType('privacy')}
            className="glass-panel-subtle w-full flex items-center justify-between p-3 rounded-xl transition text-left cursor-pointer active:scale-98 hover:border-[#22C58B]/40"
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-4 h-4 text-[#22C58B]" />
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">{t('privacyPolicy')}</div>
                <div className="text-[11px] text-slate-500 dark:text-[#9FA2AC]">All data stays on device; zero telemetry</div>
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </button>

          <button
            onClick={() => setLegalModalType('terms')}
            className="glass-panel-subtle w-full flex items-center justify-between p-3 rounded-xl transition text-left cursor-pointer active:scale-98 hover:border-[#FF7628]/40"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-[#FF7628]" />
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">{t('termsOfUse')}</div>
                <div className="text-[11px] text-slate-500 dark:text-[#9FA2AC]">Open-source personal productivity terms</div>
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </button>

          <button
            onClick={() => setLegalModalType('about')}
            className="glass-panel-subtle w-full flex items-center justify-between p-3 rounded-xl transition text-left cursor-pointer active:scale-98 hover:border-purple-500/40"
          >
            <div className="flex items-center gap-3">
              <Info className="w-4 h-4 text-purple-400" />
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">{t('aboutOmni')}</div>
                <div className="text-[11px] text-slate-500 dark:text-[#9FA2AC]">Version 1.0.0 · Track Everything. Improve Every Day.</div>
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {onOpenOnboarding && (
            <button
              onClick={onOpenOnboarding}
              className="glass-panel-subtle w-full flex items-center justify-between p-3 rounded-xl transition text-left cursor-pointer active:scale-98 hover:border-sky-500/40"
            >
              <div className="flex items-center gap-3">
                <Compass className="w-4 h-4 text-sky-400" />
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">{t('onboardingGuide')}</div>
                  <div className="text-[11px] text-slate-500 dark:text-[#9FA2AC]">Review the 3-step feature tour</div>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* Dangerous Action: Reset Database */}
      <div className="glass-panel p-5 border-red-500/20 bg-red-500/5">
        <h3 className="text-sm font-bold text-red-500 dark:text-red-400 mb-1">Danger Zone</h3>
        <p className="text-xs text-slate-500 dark:text-[#9FA2AC] mb-3">
          Permanently clear all local expenses and habits records. Requires confirmation.
        </p>

        <button
          onClick={() => setShowResetConfirm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-500 dark:text-red-400 hover:text-white border border-red-500/30 font-bold text-xs transition cursor-pointer active:scale-95"
        >
          <Trash2 className="w-4 h-4" />
          <span>Wipe Database</span>
        </button>
      </div>

      {/* About Box */}
      <div className="glass-panel p-4 text-xs text-slate-500 dark:text-[#9FA2AC] space-y-1">
        <div className="font-bold text-slate-900 dark:text-white">OMNI TRACKER v1.0.0</div>
        <div>Tagline: <em>Track Everything. Improve Every Day.</em></div>
        <div>Built with React, TypeScript, Tailwind CSS, Dexie (IndexedDB), and Vite PWA.</div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#18191D] border border-red-500/40 p-5 text-white shadow-2xl">
            <div className="flex items-center gap-2.5 text-red-400 mb-2">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-base font-bold text-white">Confirm Total Wipe</h3>
            </div>
            <p className="text-xs text-[#A0A2AA] mb-3 leading-relaxed">
              This will permanently delete all stored expenses, habit logs, budgets, and sync queues from IndexedDB. This cannot be undone.
            </p>
            <p className="text-xs font-bold text-white mb-2">
              Type <span className="text-red-400">DELETE</span> to confirm:
            </p>
            <input
              type="text"
              placeholder="DELETE"
              value={resetInput}
              onChange={(e) => setResetInput(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#202126] border border-white/10 text-sm text-white mb-4 focus:outline-none focus:border-red-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl bg-white/10 text-xs font-semibold hover:bg-white/15"
              >
                Cancel
              </button>
              <button
                disabled={resetInput !== 'DELETE'}
                onClick={handleConfirmReset}
                className="px-4 py-2 rounded-xl bg-red-600 disabled:opacity-40 text-xs font-bold text-white hover:bg-red-700"
              >
                Wipe All Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safe Backup Inspection & Preview Modal */}
      <BackupPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        report={backupReport}
        onRestoreCompleted={handleRestoreCompleted}
        theme={theme}
      />

      {/* Legal & About Modal */}
      {legalModalType && (
        <LegalModal
          isOpen={Boolean(legalModalType)}
          onClose={() => setLegalModalType(null)}
          type={legalModalType}
          theme={theme}
        />
      )}
    </div>
  );
};
