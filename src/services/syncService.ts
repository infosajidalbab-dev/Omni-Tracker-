/**
 * OMNI TRACKER Synchronisation Service
 * Phase 4: Real Microsoft Excel & OneDrive Integration
 * 
 * Features:
 * 1. Microsoft Identity PKCE OAuth & Graph API client integration
 * 2. 3 Required Worksheets: Expenses, Habits, Daily Summary
 * 3. Stable Record IDs and Idempotent upsert strategy (zero duplicate rows)
 * 4. Conflict-aware timestamp checking
 * 5. Offline Queue preservation with IndexedDB
 * 6. Actionable error reporting and retries
 * 7. Security: Tokens are never logged or exposed
 * 8. Mock/Test Simulation Engine for reliable offline validation
 */

import { db } from '../database/db';
import type { Expense, Habit, HabitCompletion, SyncLogEntry, SyncQueueItem } from '../types';
import { 
  MicrosoftGraphExcelClient, 
  mockGraphEngine, 
  fetchUserProfile, 
  createPkcePair,
  buildMicrosoftAuthUrl,
  exchangeCodeForTokens,
  refreshMicrosoftAccessToken,
  type DailySummaryRow 
} from './microsoftGraph';

export interface MicrosoftSyncConfig {
  clientId: string;
  tenantId?: string;
  isConnected: boolean;
  isMockMode?: boolean; // Clearly distinguishes simulation/mock tests from real accounts
  userEmail?: string;
  displayName?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: number;
  workbookId?: string;
  workbookName?: string;
  lastSyncTimestamp?: string;
}

const MS_CONFIG_KEY = 'omni_ms_config_v2';
const memoryStore: Record<string, string> = {};

interface SessionTokens {
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: number;
}

let inMemoryTokens: SessionTokens = {};

function getSessionTokens(): SessionTokens {
  if (inMemoryTokens.accessToken || inMemoryTokens.refreshToken) {
    return inMemoryTokens;
  }
  if (typeof sessionStorage !== 'undefined') {
    try {
      const raw = sessionStorage.getItem('omni_ms_session_tokens');
      if (raw) {
        inMemoryTokens = JSON.parse(raw);
        return inMemoryTokens;
      }
    } catch {
      // ignore
    }
  }
  return inMemoryTokens;
}

function saveSessionTokens(tokens: SessionTokens): void {
  inMemoryTokens = { ...tokens };
  if (typeof sessionStorage !== 'undefined') {
    try {
      if (tokens.accessToken || tokens.refreshToken) {
        sessionStorage.setItem('omni_ms_session_tokens', JSON.stringify(tokens));
      } else {
        sessionStorage.removeItem('omni_ms_session_tokens');
      }
    } catch {
      // ignore
    }
  }
}

function getLocalItem(key: string): string | null {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(key);
  }
  return memoryStore[key] || null;
}

function setLocalItem(key: string, val: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(key, val);
  } else {
    memoryStore[key] = val;
  }
}

export function getStoredMsConfig(): MicrosoftSyncConfig {
  let baseConfig: MicrosoftSyncConfig = {
    clientId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MS_CLIENT_ID) || '',
    tenantId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MS_TENANT_ID) || 'common',
    isConnected: false,
    isMockMode: false,
    workbookName: 'OmniTracker_Data.xlsx',
  };

  try {
    const raw = getLocalItem(MS_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure tokens are removed if previously in localStorage
      delete parsed.accessToken;
      delete parsed.refreshToken;
      delete parsed.tokenExpiresAt;
      baseConfig = { ...baseConfig, ...parsed };
    }
  } catch (e) {
    console.error('Failed reading MS config', e);
  }

  const sessionTokens = getSessionTokens();
  return {
    ...baseConfig,
    accessToken: sessionTokens.accessToken,
    refreshToken: sessionTokens.refreshToken,
    tokenExpiresAt: sessionTokens.tokenExpiresAt,
  };
}

export function saveStoredMsConfig(config: MicrosoftSyncConfig): void {
  // Move access/refresh tokens out of localStorage into memory + sessionStorage
  saveSessionTokens({
    accessToken: config.accessToken,
    refreshToken: config.refreshToken,
    tokenExpiresAt: config.tokenExpiresAt,
  });

  const safeConfig = { ...config };
  delete safeConfig.accessToken;
  delete safeConfig.refreshToken;
  delete safeConfig.tokenExpiresAt;

  try {
    setLocalItem(MS_CONFIG_KEY, JSON.stringify(safeConfig));
  } catch (e) {
    console.error('Failed saving MS config', e);
  }
}

export class SyncService {
  private static instance: SyncService;
  private isSyncing = false;
  private listeners: Array<() => void> = [];

  private constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.notifyListeners();
        this.processQueue();
      });
      window.addEventListener('offline', () => {
        this.notifyListeners();
      });

      // Listen for OAuth postMessage callback from popup
      window.addEventListener('message', async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) {
          return;
        }
        if (event.data?.type === 'MS_OAUTH_CALLBACK') {
          await this.handleOAuthPopupMessage(event.data);
        }
      });
    }
  }

  public static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(cb => cb());
  }

  public isOnline(): boolean {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      return navigator.onLine;
    }
    return true;
  }

  public getSyncState() {
    return {
      isOnline: this.isOnline(),
      isSyncing: this.isSyncing,
    };
  }

  public async getQueueCounts(): Promise<{ pending: number; failed: number }> {
    const pending = await db.syncQueue.where('status').equals('pending').count();
    const failed = await db.syncQueue.where('status').equals('failed').count();
    return { pending, failed };
  }

  public async getRecentLogs(limit = 10): Promise<SyncLogEntry[]> {
    return await db.syncLogs.orderBy('timestamp').reverse().limit(limit).toArray();
  }

  // ---------------- Authentication Operations ----------------

  /**
   * Initiates Microsoft OAuth PKCE popup flow
   */
  public async startMicrosoftOAuthPopup(clientIdOverride?: string, tenantIdOverride?: string): Promise<{ success: boolean; message: string }> {
    if (typeof window === 'undefined') {
      return { success: false, message: 'Window not available' };
    }

    const currentConfig = getStoredMsConfig();
    const clientId = (clientIdOverride || currentConfig.clientId || '').trim();
    const tenantId = (tenantIdOverride || currentConfig.tenantId || 'common').trim();

    if (!clientId) {
      return {
        success: false,
        message: 'Microsoft Azure Application (Client) ID is required. Please provide it in setup.',
      };
    }

    try {
      const { codeVerifier, codeChallenge } = await createPkcePair();
      const state = 'state_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);

      // Save PKCE verifier in sessionStorage for exchange
      sessionStorage.setItem('omni_ms_pkce_verifier', codeVerifier);
      sessionStorage.setItem('omni_ms_pkce_state', state);
      sessionStorage.setItem('omni_ms_client_id', clientId);
      sessionStorage.setItem('omni_ms_tenant_id', tenantId);

      const redirectUri = `${window.location.origin}/auth/callback`;
      const authUrl = buildMicrosoftAuthUrl({
        clientId,
        tenantId,
        redirectUri,
        codeChallenge,
        state,
      });

      // Open OAuth provider directly in popup as per OAuth skill guidelines
      const popup = window.open(
        authUrl,
        'ms_oauth_popup',
        'width=600,height=720,status=no,toolbar=no,menubar=no'
      );

      if (!popup) {
        return {
          success: false,
          message: 'Popup was blocked by your browser. Please allow popups for this site and try again.',
        };
      }

      return {
        success: true,
        message: 'Microsoft login window opened. Please sign in and grant workbook permissions.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Failed to initialize Microsoft OAuth flow',
      };
    }
  }

  /**
   * Handles incoming OAuth callback message from popup
   */
  public async handleOAuthPopupMessage(data: {
    code?: string;
    state?: string;
    accessToken?: string;
    error?: string;
    errorDescription?: string;
  }): Promise<{ success: boolean; message: string }> {
    if (data.error) {
      const msg = `Microsoft login canceled or failed: ${data.errorDescription || data.error}`;
      this.notifyListeners();
      return { success: false, message: msg };
    }

    if (data.accessToken) {
      // Direct token returned
      return await this.connectWithToken(data.accessToken, false);
    }

    if (!data.code) {
      return { success: false, message: 'No authorization code received from Microsoft' };
    }

    const savedState = sessionStorage.getItem('omni_ms_pkce_state');
    const codeVerifier = sessionStorage.getItem('omni_ms_pkce_verifier');
    const clientId = sessionStorage.getItem('omni_ms_client_id') || '';
    const tenantId = sessionStorage.getItem('omni_ms_tenant_id') || 'common';

    if (!savedState || !data.state || savedState !== data.state) {
      return { success: false, message: 'OAuth state missing or mismatch (potential CSRF). Authentication rejected.' };
    }

    if (!codeVerifier) {
      return { success: false, message: 'Missing PKCE code verifier in session. Please retry login.' };
    }

    try {
      const redirectUri = `${window.location.origin}/auth/callback`;
      const tokens = await exchangeCodeForTokens({
        code: data.code,
        codeVerifier,
        clientId,
        tenantId,
        redirectUri,
      });

      // Clean up session PKCE secrets
      sessionStorage.removeItem('omni_ms_pkce_verifier');
      sessionStorage.removeItem('omni_ms_pkce_state');

      return await this.connectWithToken(tokens.accessToken, false, clientId, tokens.refreshToken, tokens.expiresIn);
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Failed to exchange Microsoft authorization code for tokens',
      };
    }
  }

  /**
   * Connects Microsoft account using verified Bearer token (real or mock)
   */
  public async connectWithToken(
    token: string, 
    isMock = false, 
    clientId = '', 
    refreshToken?: string, 
    expiresIn?: number
  ): Promise<{ success: boolean; message: string }> {
    try {
      let user: { displayName: string; mail: string; userPrincipalName: string };

      if (isMock) {
        user = await mockGraphEngine.verifyToken(token);
      } else {
        user = await fetchUserProfile(token);
      }

      const current = getStoredMsConfig();
      const expiresAt = expiresIn ? Date.now() + (expiresIn * 1000) : undefined;

      const updated: MicrosoftSyncConfig = {
        ...current,
        clientId: clientId.trim() || current.clientId,
        accessToken: token.trim(),
        refreshToken: refreshToken || current.refreshToken,
        tokenExpiresAt: expiresAt,
        isConnected: true,
        isMockMode: isMock,
        userEmail: user.mail || user.userPrincipalName,
        displayName: user.displayName,
        workbookName: current.workbookName || 'OmniTracker_Data.xlsx',
        lastSyncTimestamp: current.lastSyncTimestamp,
      };

      saveStoredMsConfig(updated);
      this.notifyListeners();

      // Trigger automatic queue processing upon connection
      await this.processQueue();

      const modeText = isMock ? ' (Demo Simulation Mode)' : '';
      return {
        success: true,
        message: `Connected to Microsoft account: ${user.displayName} (${user.mail || user.userPrincipalName})${modeText}`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Microsoft authentication failed. Local tracking data remains safe in IndexedDB.',
      };
    }
  }

  /**
   * Disconnects Microsoft account cleanly
   */
  public disconnectMicrosoftAccount(): void {
    saveSessionTokens({});
    const current = getStoredMsConfig();
    const cleared: MicrosoftSyncConfig = {
      clientId: current.clientId,
      tenantId: current.tenantId || 'common',
      isConnected: false,
      isMockMode: false,
      workbookName: current.workbookName || 'OmniTracker_Data.xlsx',
      lastSyncTimestamp: current.lastSyncTimestamp,
    };
    saveStoredMsConfig(cleared);
    this.notifyListeners();
  }

  /**
   * Ensures an active, unexpired token, performing silent refresh if needed
   */
  public async ensureValidToken(): Promise<string | null> {
    const config = getStoredMsConfig();
    if (!config.isConnected) return null;
    if (config.isMockMode) return config.accessToken || 'mock_token';

    const now = Date.now();
    const isExpiredOrClose = config.tokenExpiresAt && (config.tokenExpiresAt - now < 60000);

    if ((!config.accessToken || isExpiredOrClose) && config.refreshToken && config.clientId) {
      try {
        const refreshed = await refreshMicrosoftAccessToken({
          refreshToken: config.refreshToken,
          clientId: config.clientId,
          tenantId: config.tenantId,
        });

        const newExpiresAt = refreshed.expiresIn ? Date.now() + (refreshed.expiresIn * 1000) : undefined;
        saveSessionTokens({
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken || config.refreshToken,
          tokenExpiresAt: newExpiresAt,
        });

        return refreshed.accessToken;
      } catch (err) {
        console.warn('Silent token refresh failed:', err);
        return config.accessToken || null;
      }
    }

    return config.accessToken || null;
  }

  /**
   * Retries all failed queue items
   */
  public async retryFailedItems(): Promise<void> {
    const failed = await db.syncQueue.where('status').equals('failed').toArray();
    for (const item of failed) {
      await db.syncQueue.update(item.id, {
        status: 'pending',
        errorMessage: undefined,
      });
    }
    await this.processQueue();
  }

  // ---------------- Core Idempotent Sync Pipeline ----------------

  /**
   * Main sync processor
   * Handles:
   * 1. Offline checks & pending queue item buffering
   * 2. Honest status reporting when credentials are missing
   * 3. Idempotent upsert & conflict-aware updates
   * 4. 3 Worksheets: Expenses, Habits, Daily Summary
   * 5. Confirmation before marking synced
   */
  public async processQueue(): Promise<{ success: boolean; syncedCount: number; message: string }> {
    if (this.isSyncing) {
      return { success: false, syncedCount: 0, message: 'Sync already in progress' };
    }

    if (!this.isOnline()) {
      return {
        success: false,
        syncedCount: 0,
        message: 'Device is offline. All records remain safely stored in local IndexedDB.',
      };
    }

    this.isSyncing = true;
    this.notifyListeners();

    const startTime = new Date().toISOString();
    const msConfig = getStoredMsConfig();

    try {
      const pendingItems = await db.syncQueue
        .where('status')
        .equals('pending')
        .toArray();

      if (pendingItems.length === 0) {
        this.isSyncing = false;
        this.notifyListeners();
        return { success: true, syncedCount: 0, message: 'All local records are up to date' };
      }

      // Check if remote cloud adapter is active and ensure valid token with silent refresh
      const validToken = await this.ensureValidToken();
      if (!msConfig.isConnected || !validToken) {
        // Honest sync reporting: records remain in local IndexedDB safely
        const logEntry: SyncLogEntry = {
          id: 'log_' + Date.now(),
          timestamp: startTime,
          status: 'pending',
          recordsSynced: 0,
          details: `Local storage saved. Remote sync queued (${pendingItems.length} records pending). Microsoft OneDrive account not connected.`,
        };
        await db.syncLogs.add(logEntry);

        this.isSyncing = false;
        this.notifyListeners();
        return {
          success: false,
          syncedCount: 0,
          message: `${pendingItems.length} records safely queued in local storage. Connect Microsoft OneDrive to enable Excel sync.`,
        };
      }

      // 1. Initialize Client (Real or Mock)
      const isMock = Boolean(msConfig.isMockMode);
      const graphClient = new MicrosoftGraphExcelClient(
        validToken,
        msConfig.workbookName || 'OmniTracker_Data.xlsx'
      );

      if (!isMock) {
        // Ensure workbook & worksheets (Expenses, Habits, Daily Summary) exist
        try {
          await graphClient.ensureWorkbookStructure();
        } catch (setupErr: any) {
          console.warn('Workbook structure check notice:', setupErr.message);
        }
      }

      // 2. Fetch existing remote row maps for idempotent deduplication
      let existingExpenses = new Map();
      let existingHabits = new Map();

      if (!isMock) {
        try {
          existingExpenses = await graphClient.getExistingExpenses();
          existingHabits = await graphClient.getExistingHabits();
        } catch (fetchErr) {
          console.warn('Existing rows fetch note:', fetchErr);
        }
      }

      // 3. Process items idempotently
      let successCount = 0;
      let failureCount = 0;

      for (const item of pendingItems) {
        try {
          if (item.entityType === 'expense') {
            const exp = item.payload as Expense;
            if (isMock) {
              await mockGraphEngine.upsertExpense(exp, item.action);
            } else {
              await graphClient.upsertExpense(exp, item.action, existingExpenses);
            }
          } else if (item.entityType === 'habit') {
            const habit = item.payload as Habit;
            if (isMock) {
              await mockGraphEngine.upsertHabit(habit, item.action);
            } else {
              await graphClient.upsertHabit(habit, item.action, existingHabits);
            }
          } else if (item.entityType === 'habitCompletion') {
            // Habit completion maps to habit record timestamp update
            const comp = item.payload as HabitCompletion;
            const parentHabit = await db.habits.get(comp.habitId);
            if (parentHabit) {
              if (isMock) {
                await mockGraphEngine.upsertHabit(parentHabit, 'update');
              } else {
                await graphClient.upsertHabit(parentHabit, 'update', existingHabits);
              }
            }
          }

          // Mark item as synced in database ONLY AFTER remote call succeeded
          await this.markItemSynced(item);
          successCount++;
        } catch (itemErr: any) {
          failureCount++;
          // Never log raw tokens or private keys
          console.error(`Sync error for item ${item.id}:`, itemErr.message || itemErr);
          await db.syncQueue.update(item.id, {
            status: 'failed',
            retryCount: (item.retryCount || 0) + 1,
            errorMessage: itemErr.message || 'Network / Microsoft Graph API error',
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // 4. Update Daily Summary Worksheet
      try {
        await this.updateDailySummarySheet(graphClient, isMock);
      } catch (sumErr) {
        console.warn('Daily summary update note:', sumErr);
      }

      // 5. Update last successful sync timestamp
      const finishTime = new Date().toISOString();
      if (successCount > 0) {
        const updatedConfig = { ...msConfig, lastSyncTimestamp: finishTime };
        saveStoredMsConfig(updatedConfig);
      }

      // 6. Record sync log
      const logStatus: 'success' | 'failed' | 'pending' = failureCount === 0 ? 'success' : successCount > 0 ? 'pending' : 'failed';
      const logEntry: SyncLogEntry = {
        id: 'log_' + Date.now(),
        timestamp: finishTime,
        status: logStatus,
        recordsSynced: successCount,
        details: isMock
          ? `[Mock Demo] Processed ${successCount} records into simulated OneDrive workbook.`
          : `Synchronized ${successCount} of ${pendingItems.length} records to OneDrive (${msConfig.workbookName || 'OmniTracker_Data.xlsx'}).`,
      };
      await db.syncLogs.add(logEntry);

      this.isSyncing = false;
      this.notifyListeners();

      if (failureCount > 0) {
        return {
          success: false,
          syncedCount: successCount,
          message: `Synchronized ${successCount} items. ${failureCount} items failed and are saved for retry.`,
        };
      }

      return {
        success: true,
        syncedCount: successCount,
        message: `Successfully synchronized ${successCount} items to OneDrive.`,
      };
    } catch (err: any) {
      console.error('Sync queue processor error:', err.message || err);
      const logEntry: SyncLogEntry = {
        id: 'log_' + Date.now(),
        timestamp: new Date().toISOString(),
        status: 'failed',
        recordsSynced: 0,
        details: `Sync failed: ${err.message || 'Unknown network error'}. Local data remains 100% safe.`,
      };
      await db.syncLogs.add(logEntry);

      this.isSyncing = false;
      this.notifyListeners();
      return {
        success: false,
        syncedCount: 0,
        message: err.message || 'Sync failed. Local data remains safe in IndexedDB.',
      };
    }
  }

  /**
   * Computes and upserts Daily Summary worksheet row
   */
  private async updateDailySummarySheet(graphClient: MicrosoftGraphExcelClient, isMock: boolean): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const todayExpenses = await db.expenses.where('date').equals(today).toArray();
    const totalExpenses = todayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const expenseCount = todayExpenses.length;

    // Top category calculation
    const categoryTotals: Record<string, number> = {};
    for (const exp of todayExpenses) {
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + (exp.amount || 0);
    }
    let topCategory = 'None';
    let topCatAmount = 0;
    for (const [cat, amt] of Object.entries(categoryTotals)) {
      if (amt > topCatAmount) {
        topCategory = cat;
        topCatAmount = amt;
      }
    }

    const activeHabits = await db.habits.where('active').equals(1).toArray();
    const todayCompletions = await db.habitCompletions.where('date').equals(today).toArray();
    const habitsCompleted = todayCompletions.length;
    const completionRatePercent = activeHabits.length > 0 
      ? Math.round((habitsCompleted / activeHabits.length) * 100) 
      : 0;

    const summaryRow: DailySummaryRow = {
      date: today,
      totalExpenses,
      expenseCount,
      topCategory,
      habitsCompleted,
      completionRatePercent,
      calculatedAt: new Date().toISOString(),
      syncedAt: new Date().toISOString(),
    };

    if (isMock) {
      await mockGraphEngine.upsertDailySummary(summaryRow);
    } else {
      await graphClient.upsertDailySummary(summaryRow);
    }
  }

  /**
   * Marks item synced in local IndexedDB only after remote update succeeds
   */
  private async markItemSynced(item: SyncQueueItem): Promise<void> {
    await db.transaction('rw', db.syncQueue, db.expenses, db.habitCompletions, async () => {
      await db.syncQueue.delete(item.id);

      if (item.entityType === 'expense' && item.action !== 'delete') {
        const exp = await db.expenses.get(item.entityId);
        if (exp) {
          await db.expenses.update(item.entityId, { syncStatus: 'synced' });
        }
      } else if (item.entityType === 'habitCompletion' && item.action !== 'delete') {
        const comp = await db.habitCompletions.get(item.entityId);
        if (comp) {
          await db.habitCompletions.update(item.entityId, { syncStatus: 'synced' });
        }
      }
    });
  }
}

export const syncService = SyncService.getInstance();
