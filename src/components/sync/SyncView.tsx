import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  CheckCircle2, 
  AlertCircle, 
  FileSpreadsheet, 
  Cloud, 
  Key, 
  ExternalLink, 
  Clock, 
  RotateCcw,
  Check,
  ShieldCheck,
  Layers,
  ChevronRight,
  Database,
  Sparkles,
  Lock,
  LogOut,
  Info,
  Server,
  Terminal
} from 'lucide-react';
import { 
  syncService, 
  getStoredMsConfig, 
  saveStoredMsConfig, 
  type MicrosoftSyncConfig 
} from '../../services/syncService';
import type { SyncLogEntry } from '../../types';

interface SyncViewProps {
  theme: 'dark' | 'light';
}

export const SyncView: React.FC<SyncViewProps> = ({ theme }) => {
  const [isOnline, setIsOnline] = useState(syncService.isOnline());
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [queueCounts, setQueueCounts] = useState<{ pending: number; failed: number }>({ pending: 0, failed: 0 });
  const [logs, setLogs] = useState<SyncLogEntry[]>([]);
  const [msConfig, setMsConfig] = useState<MicrosoftSyncConfig>(getStoredMsConfig());
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [authMode, setAuthMode] = useState<'oauth' | 'token' | 'mock'>('oauth');
  const [clientIdInput, setClientIdInput] = useState(msConfig.clientId || '');
  const [tenantIdInput, setTenantIdInput] = useState(msConfig.tenantId || 'common');
  const [tokenInput, setTokenInput] = useState(msConfig.accessToken || '');
  const [statusFeedback, setStatusFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : '/auth/callback';

  const refreshState = async () => {
    setIsOnline(syncService.isOnline());
    const counts = await syncService.getQueueCounts();
    setQueueCounts(counts);
    const recentLogs = await syncService.getRecentLogs(8);
    setLogs(recentLogs);
    setMsConfig(getStoredMsConfig());
  };

  useEffect(() => {
    refreshState();
    const unsubscribe = syncService.subscribe(() => {
      refreshState();
    });
    return unsubscribe;
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    setStatusFeedback(null);
    try {
      const result = await syncService.processQueue();
      if (result.success) {
        setStatusFeedback({ type: 'success', message: result.message });
      } else {
        setStatusFeedback({ type: 'info', message: result.message });
      }
    } catch (e: any) {
      setStatusFeedback({ type: 'error', message: e.message || 'Sync failed' });
    } finally {
      setIsSyncing(false);
      await refreshState();
    }
  };

  const handleRetryFailed = async () => {
    setIsSyncing(true);
    await syncService.retryFailedItems();
    setIsSyncing(false);
    await refreshState();
  };

  const handleStartOAuth = async () => {
    if (!clientIdInput.trim()) {
      setStatusFeedback({
        type: 'error',
        message: 'Please provide a valid Microsoft Azure Application (Client) ID below before starting sign-in.',
      });
      return;
    }

    setIsConnecting(true);
    setStatusFeedback({
      type: 'info',
      message: 'Opening Microsoft identity popup window. Complete sign-in to connect OneDrive...',
    });

    const res = await syncService.startMicrosoftOAuthPopup(clientIdInput.trim(), tenantIdInput.trim());
    setIsConnecting(false);

    if (!res.success) {
      setStatusFeedback({ type: 'error', message: res.message });
    }
  };

  const handleConnectWithToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      setStatusFeedback({ type: 'error', message: 'Please provide a Microsoft Graph Access Token to connect.' });
      return;
    }

    setIsConnecting(true);
    setStatusFeedback(null);

    const res = await syncService.connectWithToken(
      tokenInput.trim(), 
      false, 
      clientIdInput.trim()
    );
    setIsConnecting(false);

    if (res.success) {
      setShowConfigForm(false);
      setStatusFeedback({ type: 'success', message: res.message });
    } else {
      setStatusFeedback({ type: 'error', message: res.message });
    }
    await refreshState();
  };

  const handleStartMockSimulation = async () => {
    setIsConnecting(true);
    setStatusFeedback(null);

    const mockToken = 'mock_demo_token_' + Date.now();
    const res = await syncService.connectWithToken(mockToken, true);
    setIsConnecting(false);

    if (res.success) {
      setShowConfigForm(false);
      setStatusFeedback({ 
        type: 'success', 
        message: 'Connected to Microsoft Graph Simulation (Demo Mode). You can now test syncing your local records!' 
      });
    } else {
      setStatusFeedback({ type: 'error', message: res.message });
    }
    await refreshState();
  };

  const handleDisconnect = () => {
    syncService.disconnectMicrosoftAccount();
    setTokenInput('');
    setStatusFeedback({ 
      type: 'info', 
      message: 'Microsoft account disconnected. Local records remain 100% safe in IndexedDB.' 
    });
    refreshState();
  };

  // Determine Overall Sync Status Badge
  const getOverallStatus = () => {
    if (!msConfig.isConnected) return { label: 'Not Connected', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' };
    if (isSyncing) return { label: 'Syncing...', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse' };
    if (queueCounts.failed > 0) return { label: 'Sync Failed', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' };
    if (queueCounts.pending > 0) return { label: 'Pending Sync', color: 'bg-[#FF7628]/20 text-[#FF7628] border-[#FF7628]/30' };
    return { label: 'Synced', color: 'bg-[#22C58B]/20 text-[#22C58B] border-[#22C58B]/30' };
  };

  const overallStatus = getOverallStatus();

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white">
              Microsoft Excel & OneDrive Cloud Sync
            </h2>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${overallStatus.color}`}>
              {overallStatus.label}
            </span>
            {msConfig.isMockMode && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                Demo Mode
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-[#9FA2AC] mt-0.5">
            Real idempotent synchronization to an Excel workbook on Microsoft OneDrive with zero data loss
          </p>
        </div>

        {/* Manual Sync Trigger */}
        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#FF7628] to-[#FF9457] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#FF7628]/25 hover:brightness-110 active:scale-95 transition disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Synchronizing...' : 'Sync Now'}</span>
        </button>
      </div>

      {statusFeedback && (
        <div className={`flex items-start gap-2.5 p-3.5 rounded-2xl border text-xs font-semibold ${
          statusFeedback.type === 'success'
            ? 'bg-[#22C58B]/15 border-[#22C58B]/30 text-[#16A34A] dark:text-[#22C58B]'
            : statusFeedback.type === 'error'
              ? 'bg-rose-500/15 border-rose-500/30 text-rose-500 dark:text-rose-400'
              : 'glass-panel-subtle text-slate-900 dark:text-white'
        }`}>
          {statusFeedback.type === 'success' && <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />}
          {statusFeedback.type === 'error' && <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
          {statusFeedback.type === 'info' && <Database className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#FF7628]" />}
          <span className="leading-relaxed">{statusFeedback.message}</span>
        </div>
      )}

      {/* Sync Queue Health Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {/* Network Connection */}
        <div className="glass-panel p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-[#9FA2AC] uppercase">Network</span>
            {isOnline ? (
              <Wifi className="w-4 h-4 text-[#16A34A] dark:text-[#22C58B]" />
            ) : (
              <WifiOff className="w-4 h-4 text-amber-500" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-[#22C58B] animate-pulse shadow-sm shadow-[#22C58B]/50' : 'bg-amber-400'}`} />
            <span className="text-base font-bold text-slate-900 dark:text-white">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-[#9FA2AC] mt-1 truncate">
            {isOnline ? 'Network ready for sync' : 'Saved in local IndexedDB'}
          </p>
        </div>

        {/* Local Sync Queue Pending */}
        <div className="glass-panel p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-[#9FA2AC] uppercase">Pending Sync</span>
            <Layers className="w-4 h-4 text-[#FF7628]" />
          </div>
          <div className="text-xl font-black text-[#FF7628] drop-shadow-[0_2px_10px_rgba(255,118,40,0.2)] mt-2">
            {queueCounts.pending} items
          </div>
          <p className="text-[10px] text-slate-500 dark:text-[#9FA2AC] mt-1">
            {queueCounts.pending === 0 
              ? 'All local data synchronized' 
              : 'Safely buffered in local queue'}
          </p>
        </div>

        {/* Failed queue items */}
        <div className="glass-panel p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-[#9FA2AC] uppercase">Failed Items</span>
            {queueCounts.failed > 0 && (
              <button
                onClick={handleRetryFailed}
                className="text-xs text-[#FF7628] hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            )}
          </div>
          <div className={`text-xl font-black mt-2 ${queueCounts.failed > 0 ? 'text-rose-500 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
            {queueCounts.failed} items
          </div>
          <p className="text-[10px] text-slate-500 dark:text-[#9FA2AC] mt-1">
            {queueCounts.failed === 0 ? '0 network retry errors' : 'Actionable retry available'}
          </p>
        </div>

        {/* Last Successful Sync */}
        <div className="glass-panel p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-[#9FA2AC] uppercase">Last Sync</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-sm font-bold text-slate-900 dark:text-white mt-2 truncate">
            {msConfig.lastSyncTimestamp ? new Date(msConfig.lastSyncTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
          </div>
          <p className="text-[10px] text-slate-500 dark:text-[#9FA2AC] mt-1 truncate">
            {msConfig.lastSyncTimestamp ? new Date(msConfig.lastSyncTimestamp).toLocaleDateString() : 'Awaiting first remote sync'}
          </p>
        </div>
      </div>

      {/* Microsoft OneDrive & Excel Integration Card */}
      <div className="glass-panel p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/70 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-[#16A34A] dark:text-emerald-400 flex items-center justify-center flex-shrink-0 shadow-xs">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  OneDrive Excel Integration
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  msConfig.isConnected
                    ? 'bg-[#22C58B]/20 text-[#16A34A] dark:text-[#22C58B]'
                    : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-[#9FA2AC]'
                }`}>
                  {msConfig.isConnected ? (msConfig.isMockMode ? 'Connected (Demo)' : 'Connected (Live)') : 'Not Connected'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-[#9FA2AC] mt-0.5">
                Automatically updates your OneDrive workbook: <strong className="text-slate-900 dark:text-white">{msConfig.workbookName || 'OmniTracker_Data.xlsx'}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {msConfig.isConnected ? (
              <button
                onClick={handleDisconnect}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 text-rose-500 dark:text-rose-400 hover:bg-rose-500/20 text-xs font-semibold transition cursor-pointer active:scale-95"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            ) : (
              <button
                onClick={() => setShowConfigForm(!showConfigForm)}
                className="px-4 py-2 rounded-xl glass-panel-subtle hover:border-[#FF7628]/40 text-slate-900 dark:text-white text-xs font-semibold transition cursor-pointer active:scale-95"
              >
                {showConfigForm ? 'Close Setup' : 'Configure Integration'}
              </button>
            )}
          </div>
        </div>

        {/* 3 Worksheets Architecture Documentation */}
        <div className="mt-4">
          <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-[#FF7628]" />
            <span>Supported Excel Worksheets (Idempotent Architecture)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-500 dark:text-[#9FA2AC]">
            <div className="glass-panel-subtle p-3 rounded-xl border border-slate-200/50 dark:border-white/5">
              <span className="font-bold text-slate-900 dark:text-white block mb-1 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                1. Expenses Worksheet
              </span>
              <p className="text-[11px] leading-relaxed">
                Table: <code>ExpensesTable</code><br />
                Columns: <em>Record ID, Date, Time, Amount, Currency, Category, Origin, Destination, Note, Status, Created At, Last Modified At, Synced At</em>.
              </p>
            </div>

            <div className="glass-panel-subtle p-3 rounded-xl border border-slate-200/50 dark:border-white/5">
              <span className="font-bold text-slate-900 dark:text-white block mb-1 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                2. Habits Worksheet
              </span>
              <p className="text-[11px] leading-relaxed">
                Table: <code>HabitsTable</code><br />
                Columns: <em>Habit ID, Title, Category, Target Days/Wk, Active, Created At, Last Modified At, Synced At</em>.
              </p>
            </div>

            <div className="glass-panel-subtle p-3 rounded-xl border border-slate-200/50 dark:border-white/5">
              <span className="font-bold text-slate-900 dark:text-white block mb-1 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                3. Daily Summary Worksheet
              </span>
              <p className="text-[11px] leading-relaxed">
                Table: <code>DailySummaryTable</code><br />
                Columns: <em>Date, Total Expenses, Expense Count, Top Category, Habits Completed, Completion Rate %, Calculated At, Synced At</em>.
              </p>
            </div>
          </div>
        </div>

        {/* Configuration Setup Form */}
        {showConfigForm && (
          <div className="mt-5 p-4 rounded-2xl glass-panel-subtle border border-slate-200/70 dark:border-white/10 space-y-4">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Connect Microsoft OneDrive Account
              </h4>
              <p className="text-xs text-slate-500 dark:text-[#9FA2AC] mt-1 leading-relaxed">
                Choose an authentication method. No client secrets are needed (Public SPA OAuth with PKCE).
              </p>
            </div>

            {/* Mode Selector Tabs */}
            <div className="flex gap-2 p-1 rounded-xl bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/5">
              <button
                type="button"
                onClick={() => setAuthMode('oauth')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition ${
                  authMode === 'oauth'
                    ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-[#9FA2AC] hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                OAuth PKCE (Popup)
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('token')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition ${
                  authMode === 'token'
                    ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-[#9FA2AC] hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Bearer Token
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('mock')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition ${
                  authMode === 'mock'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-purple-400 hover:text-purple-300'
                }`}
              >
                Simulation (Demo)
              </button>
            </div>

            {/* OAuth Mode */}
            {authMode === 'oauth' && (
              <div className="space-y-3.5">
                {/* Azure Registration Instructions */}
                <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-black/25 border border-slate-200 dark:border-white/5 space-y-1.5 text-[11px] text-slate-600 dark:text-[#9FA2AC]">
                  <span className="font-bold text-slate-900 dark:text-white block flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#22C58B]" />
                    Azure Entra ID App Registration Details:
                  </span>
                  <p>1. Open <a href="https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade" target="_blank" rel="noreferrer" className="text-[#FF7628] hover:underline inline-flex items-center gap-0.5">Azure Portal App Registrations <ExternalLink className="w-2.5 h-2.5" /></a>.</p>
                  <p>2. Select: <em>Accounts in any organizational directory and personal Microsoft accounts</em>.</p>
                  <p>3. Under <em>Authentication</em> &gt; <em>Add a platform</em> &gt; choose <strong>Single-page application (SPA)</strong>.</p>
                  <p>4. Redirect URI: <code className="bg-slate-200 dark:bg-white/10 px-1 py-0.5 rounded text-[#22C58B]">{redirectUri}</code></p>
                  <p>5. Under <em>API permissions</em>: Add delegated <code className="text-[#22C58B]">Files.ReadWrite</code>, <code className="text-[#22C58B]">User.Read</code>, <code className="text-[#22C58B]">offline_access</code>.</p>
                  <p className="text-amber-500 font-medium">Notice: Never enter a client secret. SPAs use public PKCE flow with no secret required.</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-[#9FA2AC] mb-1">
                    Azure Application (Client) ID *
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-[#9FA2AC]" />
                    <input
                      type="text"
                      placeholder="e.g. 00000000-0000-0000-0000-000000000000"
                      value={clientIdInput}
                      onChange={(e) => setClientIdInput(e.target.value)}
                      className="glass-input w-full pl-9 pr-3 py-2 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#9FA2AC]/50 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowConfigForm(false)}
                    className="px-3.5 py-2 rounded-xl glass-panel-subtle text-xs text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isConnecting}
                    onClick={handleStartOAuth}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF7628] to-[#FF9457] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-[#FF7628]/25 hover:brightness-110 cursor-pointer disabled:opacity-50"
                  >
                    {isConnecting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Opening Microsoft Popup...</span>
                      </>
                    ) : (
                      <>
                        <Cloud className="w-3.5 h-3.5" />
                        <span>Sign In with Microsoft (PKCE)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Token Mode */}
            {authMode === 'token' && (
              <form onSubmit={handleConnectWithToken} className="space-y-3.5">
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-black/25 border border-slate-200 dark:border-white/5 text-[11px] text-slate-600 dark:text-[#9FA2AC]">
                  <p>You can paste a temporary Access Token obtained from <a href="https://developer.microsoft.com/en-us/graph/graph-explorer" target="_blank" rel="noreferrer" className="text-[#FF7628] hover:underline inline-flex items-center gap-0.5">Microsoft Graph Explorer <ExternalLink className="w-2.5 h-2.5" /></a> to test immediate synchronization without configuring an Azure app registration.</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-[#9FA2AC] mb-1">
                    Microsoft Graph Access Token (Bearer) *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-[#9FA2AC]" />
                    <input
                      type="password"
                      required
                      placeholder="Paste Bearer Token (EwB...)"
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      className="glass-input w-full pl-9 pr-3 py-2 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#9FA2AC]/50 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowConfigForm(false)}
                    className="px-3.5 py-2 rounded-xl glass-panel-subtle text-xs text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isConnecting}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#22C58B] to-[#34D399] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-[#22C58B]/25 hover:brightness-110 cursor-pointer disabled:opacity-50"
                  >
                    {isConnecting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying Token...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Verify & Connect</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Simulation / Mock Demo Mode */}
            {authMode === 'mock' && (
              <div className="space-y-3.5">
                <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-[11px] text-purple-300 space-y-1.5">
                  <span className="font-bold text-white block flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    Microsoft Graph Simulation Mode (For Immediate Testing):
                  </span>
                  <p>Runs a full mock implementation of Microsoft Graph Excel API directly in your browser session. Test idempotent row upserts, daily summary aggregation, duplicate prevention, and offline retries with zero configuration.</p>
                  <p className="text-purple-400">Notice: This is clearly labeled as Demo Mode and operates independently of live Microsoft accounts.</p>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowConfigForm(false)}
                    className="px-3.5 py-2 rounded-xl glass-panel-subtle text-xs text-slate-700 dark:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isConnecting}
                    onClick={handleStartMockSimulation}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-purple-500/25 hover:brightness-110 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Enable Simulation / Demo Mode</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Connected Account Summary or Fallback Notice */}
        <div className="mt-4 p-3.5 rounded-2xl glass-panel-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          {msConfig.isConnected ? (
            <div className="flex items-center gap-2.5 text-[#16A34A] dark:text-[#22C58B]">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <div>
                <span className="font-bold text-slate-900 dark:text-white block">
                  {msConfig.displayName || 'Microsoft User'} ({msConfig.userEmail})
                  {msConfig.isMockMode && <span className="ml-2 text-purple-400 font-normal">[Simulation Mode]</span>}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-[#9FA2AC]">
                  Target OneDrive Workbook: <strong>{msConfig.workbookName || 'OmniTracker_Data.xlsx'}</strong>
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-amber-500">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-[11px] text-slate-600 dark:text-[#9FA2AC]">
                <strong>Status: Not Connected.</strong> All expense and habit records remain 100% saved in your device's IndexedDB.
              </span>
            </div>
          )}

          <div className="text-[10px] text-slate-500 dark:text-[#9FA2AC] sm:text-right flex-shrink-0">
            Last remote sync: {msConfig.lastSyncTimestamp ? new Date(msConfig.lastSyncTimestamp).toLocaleString() : 'Never'}
          </div>
        </div>
      </div>

      {/* Sync Activity Log */}
      <div className="glass-panel p-5">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Sync Event History</h3>

        {logs.length > 0 ? (
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start justify-between p-3 rounded-xl glass-panel-subtle text-xs text-slate-800 dark:text-white/90"
              >
                <div className="flex items-start gap-2.5">
                  {log.status === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-[#16A34A] dark:text-[#22C58B] flex-shrink-0 mt-0.5" />
                  ) : log.status === 'pending' ? (
                    <Clock className="w-4 h-4 text-[#FF7628] flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white block">{log.details}</span>
                    <span className="text-[10px] text-slate-500 dark:text-[#9FA2AC]">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  log.status === 'success' 
                    ? 'bg-[#22C58B]/20 text-[#16A34A] dark:text-[#22C58B]' 
                    : log.status === 'pending' 
                      ? 'bg-[#FF7628]/20 text-[#FF7628]' 
                      : 'bg-rose-500/20 text-rose-500 dark:text-rose-400'
                }`}>
                  {log.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-slate-500 dark:text-[#9FA2AC]">
            No sync operations logged yet.
          </div>
        )}
      </div>
    </div>
  );
};
