import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldCheck, Download, RefreshCw, AlertTriangle, ChevronDown } from 'lucide-react';
import { exportDatabaseBackup } from '../../database/db';
import { getLocalDateString } from '../../utils/dateUtils';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isExporting: boolean;
  exportSuccess: boolean;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    isExporting: false,
    exportSuccess: false,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('OMNI TRACKER Caught UI Exception:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleExportBackup = async () => {
    try {
      this.setState({ isExporting: true });
      const jsonBackup = await exportDatabaseBackup();
      const blob = new Blob([jsonBackup], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `omni_tracker_recovery_backup_${getLocalDateString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.setState({ isExporting: false, exportSuccess: true });
    } catch (e) {
      console.error('Failed to export emergency backup:', e);
      this.setState({ isExporting: false });
      alert('Could not export recovery data directly. Please reload the page.');
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#101114] text-[#F7F7F8] flex items-center justify-center p-4">
          <div className="w-full max-w-lg p-6 sm:p-8 rounded-3xl bg-white/[0.04] border border-white/10 backdrop-blur-2xl shadow-2xl space-y-6">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#FF7628]/15 border border-[#FF7628]/30 flex items-center justify-center text-[#FF7628] flex-shrink-0">
                <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-black text-white">Something went wrong</h1>
                <p className="text-xs text-[#22C58B] font-semibold flex items-center gap-1 mt-0.5">
                  <span>Your local data is 100% safe in IndexedDB</span>
                </p>
              </div>
            </div>

            <p className="text-xs text-[#9FA2AC] leading-relaxed">
              OMNI TRACKER ran into an unexpected view error. Your private tracking records, expenses, habits, and budgets have not been altered or lost.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={this.handleExportBackup}
                disabled={this.state.isExporting}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#FF7628] to-[#FF8C42] hover:brightness-110 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#FF7628]/25 transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{this.state.exportSuccess ? 'Backup Downloaded!' : 'Export my data'}</span>
              </button>

              <button
                onClick={this.handleReload}
                className="py-3 px-5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload app</span>
              </button>
            </div>

            <div className="border-t border-white/5 pt-4">
              <button
                onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                className="text-[11px] text-[#9FA2AC] hover:text-white flex items-center gap-1 cursor-pointer font-medium"
              >
                <span>Technical diagnostic info</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${this.state.showDetails ? 'rotate-180' : ''}`} />
              </button>

              {this.state.showDetails && (
                <div className="mt-2 p-3 rounded-xl bg-black/40 border border-white/5 text-[11px] font-mono text-red-400 overflow-x-auto max-h-40 whitespace-pre-wrap">
                  {this.state.error?.toString()}
                  {this.state.errorInfo?.componentStack}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
