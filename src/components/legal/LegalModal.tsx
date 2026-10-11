import React from 'react';
import { X, ShieldCheck, FileText, Info, Lock, ExternalLink, HardDrive, CheckCircle2 } from 'lucide-react';

export type LegalDocType = 'privacy' | 'terms' | 'about';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: LegalDocType;
  theme?: 'dark' | 'light';
}

export const LegalModal: React.FC<LegalModalProps> = ({ isOpen, onClose, type, theme = 'dark' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl text-slate-900 dark:text-white shadow-2xl relative border border-white/15 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-200/50 dark:border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF7628]/15 text-[#FF7628] flex items-center justify-center flex-shrink-0">
              {type === 'privacy' && <ShieldCheck className="w-5 h-5 stroke-[2.2]" />}
              {type === 'terms' && <FileText className="w-5 h-5 stroke-[2.2]" />}
              {type === 'about' && <Info className="w-5 h-5 stroke-[2.2]" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                {type === 'privacy' && 'Privacy Policy'}
                {type === 'terms' && 'Terms of Use'}
                {type === 'about' && 'About OMNI TRACKER'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-[#9FA2AC]">
                {type === 'privacy' && 'Last updated: October 2026 · Client-side privacy guarantee'}
                {type === 'terms' && 'Effective date: October 2026 · Standard user terms'}
                {type === 'about' && 'Version 1.0.0 · Track Everything. Improve Every Day.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/15 text-slate-500 dark:text-[#9FA2AC] hover:text-white flex items-center justify-center transition active:scale-95 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs text-slate-600 dark:text-[#9FA2AC] leading-relaxed">
          {type === 'privacy' && (
            <>
              {/* Highlight Callout */}
              <div className="p-4 rounded-2xl bg-[#22C58B]/10 border border-[#22C58B]/30 text-slate-900 dark:text-white flex items-start gap-3">
                <HardDrive className="w-5 h-5 text-[#22C58B] flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs text-[#16A34A] dark:text-[#22C58B]">
                    Strict Zero-Cloud Data Boundary
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-white/80 mt-1">
                    <strong>All data stays strictly on your personal device</strong> unless you explicitly choose to connect Microsoft OneDrive. OMNI TRACKER does not collect, sell, or transmit your records to any central server.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">1. Offline Storage Architecture</h3>
                <p>
                  OMNI TRACKER is built as a true Offline-First Progressive Web Application. All expenses, transport fares, categories, recurring templates, habit records, streaks, and monthly budgets are stored in your device browser’s local IndexedDB database.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">2. Microsoft OneDrive Synchronization (Optional)</h3>
                <p>
                  If you decide to connect Microsoft OneDrive, synchronization occurs directly between your web browser and the Microsoft Graph API using the official OAuth 2.0 PKCE flow.
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-[11px]">
                  <li>Access and refresh tokens are kept strictly in memory and temporary session storage, never in permanent local storage.</li>
                  <li>No intermediary servers or analytics services ever see your Microsoft authentication credentials.</li>
                  <li>Your data is synced directly to an Excel spreadsheet named <code>OmniTracker_Data.xlsx</code> in your personal OneDrive.</li>
                  <li>You can disconnect your Microsoft account at any time with one tap in Settings or Cloud Sync.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">3. Zero Telemetry &amp; Ad Trackers</h3>
                <p>
                  OMNI TRACKER does not include any third-party marketing pixels, advertising networks, or telemetry trackers. We believe your daily commute routes, spending habits, and personal routines are your private business.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">4. Data Portability &amp; Deletion</h3>
                <p>
                  You hold 100% ownership of your records. You can download a complete JSON backup snapshot or an RFC 4180 CSV export at any moment. You can also wipe the entire local IndexedDB database in the Danger Zone in Settings.
                </p>
              </div>
            </>
          )}

          {type === 'terms' && (
            <>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">1. Acceptance of Terms</h3>
                <p>
                  By launching and utilizing OMNI TRACKER, you agree to these Terms of Use. If you do not agree with any portion of these terms, please discontinue using the application.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">2. Purpose of the Software</h3>
                <p>
                  OMNI TRACKER is provided as a personal expense management and habit productivity tracker. The financial forecasts, budget pacing, and commute calculations are mathematical estimations designed to assist personal budgeting and should not be considered certified accounting or financial advice.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">3. Local Data Responsibility</h3>
                <p>
                  Because OMNI TRACKER preserves data in your browser's local sandbox rather than a centralized cloud database, clearing your browser history or deleting website data may remove local records unless you have exported a JSON backup or connected OneDrive. We provide automated weekly backup reminders to help protect your data.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">4. Intellectual Property &amp; Open Standards</h3>
                <p>
                  OMNI TRACKER incorporates standard open web specifications, RFC 4180 CSV generation, and modern privacy conventions. All your personal logged data remains your exclusive property.
                </p>
              </div>
            </>
          )}

          {type === 'about' && (
            <>
              <div className="p-4 rounded-2xl glass-panel-subtle border border-[#FF7628]/30 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#FF7628] to-[#FF9457] flex items-center justify-center text-white font-black text-xl shadow-lg shadow-[#FF7628]/25">
                  Ω
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">OMNI TRACKER v1.0.0</h3>
                  <p className="text-xs text-[#FF7628] font-bold">Track Everything. Improve Every Day.</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">Engineered for Rapid Daily Life</h3>
                <p>
                  Designed originally for the vibrant streets of Dhaka and modern commuters everywhere, OMNI TRACKER eliminates the friction of recording micro-expenses. Whether it’s an 80 Taka rickshaw ride from Dhanmondi to Gulshan or daily water habit tracking, OMNI TRACKER captures it in seconds without loading spinners or login walls.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">Technology Stack</h3>
                <ul className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <li className="p-2.5 rounded-xl glass-panel-subtle flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#22C58B]" />
                    <span>React 19 &amp; Vite 8</span>
                  </li>
                  <li className="p-2.5 rounded-xl glass-panel-subtle flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#22C58B]" />
                    <span>Dexie IndexedDB Engine</span>
                  </li>
                  <li className="p-2.5 rounded-xl glass-panel-subtle flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#22C58B]" />
                    <span>Tailwind CSS Liquid Glass</span>
                  </li>
                  <li className="p-2.5 rounded-xl glass-panel-subtle flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#22C58B]" />
                    <span>Microsoft Graph API PKCE</span>
                  </li>
                  <li className="p-2.5 rounded-xl glass-panel-subtle flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#22C58B]" />
                    <span>RFC 4180 CSV Engine</span>
                  </li>
                  <li className="p-2.5 rounded-xl glass-panel-subtle flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#22C58B]" />
                    <span>Service Worker PWA</span>
                  </li>
                </ul>
              </div>

              <div className="pt-2 text-[11px] text-slate-500 dark:text-[#9FA2AC]">
                Proudly crafted with privacy, precision, and performance.
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200/50 dark:border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-[#FF7628] to-[#FF8C42] hover:brightness-110 text-white font-bold text-xs transition active:scale-95 cursor-pointer shadow-md shadow-[#FF7628]/25"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
