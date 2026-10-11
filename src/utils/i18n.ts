import { useState, useEffect } from 'react';

export type Language = 'en' | 'bn';

const LANGUAGE_STORAGE_KEY = 'omni_language';

export const translations = {
  // Navigation tabs
  dashboard: { en: 'Dashboard', bn: 'ড্যাশবোর্ড' },
  expenses: { en: 'Expenses', bn: 'খরচসমূহ' },
  habits: { en: 'Habits', bn: 'অভ্যাসসমূহ' },
  budget: { en: 'Budget', bn: 'বাজেট' },
  reports: { en: 'Reports', bn: 'প্রতিবেদন' },
  sync: { en: 'Cloud Sync', bn: 'ক্লাউড সিঙ্ক' },
  settings: { en: 'Settings', bn: 'সেটিংস' },

  // Quick actions
  addExpense: { en: 'Add Expense', bn: 'খরচ যোগ করুন' },
  quickLog: { en: 'Quick Log', bn: 'দ্রুত রেকর্ড' },
  completeHabit: { en: 'Complete Habit', bn: 'অভ্যাস সম্পন্ন' },
  syncNow: { en: 'Sync Now', bn: 'এখনই সিঙ্ক করুন' },
  exportBackup: { en: 'Export Backup', bn: 'ব্যাকআপ ডাউনলোড' },
  importBackup: { en: 'Restore Backup', bn: 'ব্যাকআপ পুনরুদ্ধার' },

  // Dashboard & Metric labels
  todaySpending: { en: "Today's Spending", bn: 'আজকের মোট খরচ' },
  thisMonthSpending: { en: 'Spent This Month', bn: 'চলতি মাসের মোট খরচ' },
  monthlyBudgetLabel: { en: 'Monthly Budget', bn: 'মাসিক বাজেট' },
  budgetRemaining: { en: 'Remaining Allowance', bn: 'অবশিষ্ট বরাদ্দ' },
  habitConsistency: { en: 'Habit Consistency', bn: 'অভ্যাসের ধারাবাহিকতা' },
  activeStreaks: { en: 'Active Streaks', bn: 'সক্রিয় স্ট্রিক' },
  recentExpenses: { en: 'Recent Expenses', bn: 'সাম্প্রতিক খরচসমূহ' },
  todaysHabits: { en: "Today's Habits", bn: 'আজকের অভ্যাসসমূহ' },
  allHistory: { en: 'All History', bn: 'সকল হিস্ট্রি' },
  streaks: { en: 'Streaks', bn: 'স্ট্রিকসমূহ' },

  // Transport categories
  rickshaw: { en: 'Rickshaw', bn: 'রিকশা' },
  cng: { en: 'CNG', bn: 'সিএনজি' },
  bus: { en: 'Bus', bn: 'বাস' },
  bike: { en: 'Bike / Pathao', bn: 'বাইক / পাঠাও' },
  metro: { en: 'Metro Rail', bn: 'মেট্রোরেল' },
  walking: { en: 'Walking', bn: 'হাঁটা' },
  food: { en: 'Food / Meals', bn: 'খাবার / নাস্তা' },
  groceries: { en: 'Groceries / Bazar', bn: 'বাজার' },
  other: { en: 'Other', bn: 'অন্যান্য' },

  // Status & Badges
  online: { en: 'Online', bn: 'অনলাইন' },
  offline: { en: 'Offline (Local Safe)', bn: 'অফলাইন (স্থানীয় নিরাপদ)' },
  synced: { en: 'Synced', bn: 'সিঙ্ক সম্পন্ন' },
  pending: { en: 'Pending Sync', bn: 'সিঙ্ক অপেক্ষমাণ' },
  failed: { en: 'Failed', bn: 'ব্যর্থ' },
  notConnected: { en: 'Not Connected', bn: 'সংযুক্ত নয়' },

  // Empty state texts
  noExpensesYet: { en: 'No expenses recorded yet', bn: 'এখনও কোনো খরচ যুক্ত হয়নি' },
  noExpensesDesc: { en: 'Tap below to record your first rickshaw, bus, CNG, or meal expense in seconds.', bn: 'আপনার প্রথম রিকশা, বাস, সিএনজি বা খাবারের খরচ দ্রুত রেকর্ড করতে নিচে চাপুন।' },
  logFirstExpense: { en: '+ Log First Expense', bn: '+ প্রথম খরচ রেকর্ড করুন' },
  noHabitsYet: { en: 'No active habits configured', bn: 'কোনো সক্রিয় অভ্যাস তৈরি করা হয়নি' },
  noHabitsDesc: { en: 'Build productive routines and maintain consecutive day streaks.', bn: 'প্রতিদিনের নিয়ম তৈরি করুন এবং একটানা স্ট্রিক ধরে রাখুন।' },
  createNewHabit: { en: '+ Create New Habit', bn: '+ নতুন অভ্যাস তৈরি করুন' },

  // Settings
  language: { en: 'Language', bn: 'ভাষা' },
  english: { en: 'English', bn: 'English' },
  bangla: { en: 'Bangla (বাংলা)', bn: 'বাংলা (Bangla)' },
  theme: { en: 'Theme', bn: 'থিম' },
  darkMode: { en: 'Dark Mode', bn: 'ডার্ক মোড' },
  lightMode: { en: 'Light Mode', bn: 'লাইট মোড' },
  currency: { en: 'Currency', bn: 'মুদ্রা' },
  backupData: { en: 'Local Data & Backups', bn: 'স্থানীয় ডেটা ও ব্যাকআপ' },
  dangerZone: { en: 'Danger Zone', bn: 'সতর্কতামূলক এলাকা' },

  // Legal
  privacyPolicy: { en: 'Privacy Policy', bn: 'গোপনীয়তা নীতি' },
  termsOfUse: { en: 'Terms of Use', bn: 'ব্যবহারের শর্তাবলী' },
  aboutOmni: { en: 'About OMNI TRACKER', bn: 'অমনি ট্র্যাকার পরিচিতি' },
  onboardingGuide: { en: 'View Onboarding Guide', bn: 'পরিচিতি গাইড দেখুন' },

  // Banner
  weeklyBackupTitle: { en: 'Back up your tracking data', bn: 'আপনার ডেটার সাপ্তাহিক ব্যাকআপ নিন' },
  weeklyBackupDesc: { en: 'Your data stays on this device. Download a quick JSON snapshot to safeguard your records.', bn: 'আপনার সমস্ত ডেটা এই ডিভাইসেই সংরক্ষিত থাকে। নিরাপদ রাখতে একটি দ্রুত JSON ব্যাকআপ ডাউনলোড করে রাখুন।' },
  oneTapExport: { en: 'One-Tap Export', bn: 'এক-ট্যাপে ব্যাকআপ' },
  dismiss: { en: 'Dismiss', bn: 'বাদ দিন' },
} as const;

export type TranslationKey = keyof typeof translations;

export function getStoredLanguage(): Language {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === 'bn' || saved === 'en') return saved;
  }
  return 'en';
}

export function setStoredLanguage(lang: Language): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    window.dispatchEvent(new CustomEvent('omni_language_change', { detail: lang }));
  }
}

export function t(key: TranslationKey, lang?: Language): string {
  const currentLang = lang || getStoredLanguage();
  const entry = translations[key];
  if (!entry) return key;
  return entry[currentLang] || entry['en'];
}

export function useTranslation() {
  const [lang, setLang] = useState<Language>(getStoredLanguage);

  useEffect(() => {
    const handleLangChange = (e: Event) => {
      const customEvent = e as CustomEvent<Language>;
      if (customEvent.detail) {
        setLang(customEvent.detail);
      } else {
        setLang(getStoredLanguage());
      }
    };

    window.addEventListener('omni_language_change', handleLangChange);
    return () => {
      window.removeEventListener('omni_language_change', handleLangChange);
    };
  }, []);

  const changeLanguage = (newLang: Language) => {
    setStoredLanguage(newLang);
    setLang(newLang);
  };

  const translate = (key: TranslationKey): string => t(key, lang);

  return { lang, changeLanguage, t: translate };
}
