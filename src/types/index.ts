export type TransportType = 
  | 'Rickshaw' 
  | 'Bus' 
  | 'CNG' 
  | 'Bike' 
  | 'Walking' 
  | 'Uber/Ride'
  | 'Train'
  | 'Food'
  | 'Groceries'
  | 'Shopping'
  | 'Bills'
  | 'Other';

export type SyncStatus = 'pending' | 'synced' | 'failed';

export interface Expense {
  id: string;
  amount: number;
  currency: string;
  category: TransportType;
  fromLocation?: string;
  toLocation?: string;
  note?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  timestamp: number;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
}

export interface Habit {
  id: string;
  title: string;
  description?: string;
  category: 'health' | 'fitness' | 'learning' | 'mindset' | 'routine';
  icon: string;
  color: string;
  active: boolean;
  targetDaysPerWeek: number;
  createdAt: string;
  updatedAt: string;
}

export interface HabitCompletion {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD
  completedAt: string;
  note?: string;
  syncStatus: SyncStatus;
}

export interface MonthlyBudget {
  id?: number;
  month: string; // YYYY-MM
  budgetAmount: number;
  currency: string;
  updatedAt: string;
}

export interface SyncQueueItem {
  id: string;
  entityType: 'expense' | 'habit' | 'habitCompletion';
  entityId: string;
  action: 'create' | 'update' | 'delete';
  payload: any;
  status: SyncStatus;
  retryCount: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SyncLogEntry {
  id: string;
  timestamp: string;
  status: 'success' | 'failed' | 'in_progress' | 'pending';
  recordsSynced: number;
  details: string;
}

export interface QuickRoute {
  id: string;
  fromLocation: string;
  toLocation: string;
  category: TransportType;
  typicalAmount?: number;
  usageCount: number;
}

export type RecurringFrequency = 'daily' | 'workdays' | 'weekly' | 'monthly';

export interface RecurringExpense {
  id: string;
  title: string;
  amount: number;
  currency: string;
  category: TransportType;
  fromLocation?: string;
  toLocation?: string;
  note?: string;
  frequency: RecurringFrequency;
  active: boolean;
  autoLog: boolean;
  lastGeneratedDate?: string; // YYYY-MM-DD
  nextDueDate: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
}

export interface HabitReminder {
  id: string;
  habitId: string;
  time: string; // HH:mm
  enabled: boolean;
  daysOfWeek: number[]; // 0=Sun, 1=Mon, ..., 6=Sat (empty means every day)
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseTemplate {
  id: string;
  title: string;
  amount: number;
  category: TransportType;
  fromLocation?: string;
  toLocation?: string;
  note?: string;
  usageCount: number;
  createdAt: string;
}

export interface UserSettings {
  theme: 'dark' | 'light';
  currency: string;
  monthlyBudget: number;
  userName: string;
  hapticFeedback: boolean;
  msConfig: {
    isConnected: boolean;
    clientId: string;
    tenantId?: string;
    userEmail?: string;
    targetWorkbookName?: string;
    lastSyncTimestamp?: string;
  };
}

export type ActiveTab = 
  | 'dashboard' 
  | 'expenses' 
  | 'habits' 
  | 'budget' 
  | 'reports' 
  | 'sync' 
  | 'settings';
