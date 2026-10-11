import React, { useState } from 'react';
import { 
  Zap, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  X,
  Compass,
  FileSpreadsheet,
  TrendingUp
} from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose, theme = 'dark' }) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const screens = [
    {
      badge: 'Step 1 of 3 · Offline First',
      title: 'Track Everything, Zero Lag',
      subtitle: 'Log commute fares (Rickshaw, CNG, Bus, Bike) and daily meals in seconds. Everything runs client-side with instant persistence, completely offline.',
      icon: Zap,
      iconColor: '#FF7628',
      features: [
        { label: 'Instant Numeric Keypad', desc: 'Log expenses in under 3 taps with Dhaka commute presets' },
        { label: 'Daily Habit Streaks', desc: 'Build consecutive routine streaks with noon timezone anchoring' },
        { label: 'Reliable IndexedDB Engine', desc: 'Permanent browser storage with zero cloud dependencies required' },
      ],
    },
    {
      badge: 'Step 2 of 3 · Privacy First',
      title: 'Your Data Stays on Your Device',
      subtitle: 'All your finances and routines remain 100% private in your device storage. We never harvest your data, run ads, or send telemetry.',
      icon: ShieldCheck,
      iconColor: '#22C58B',
      features: [
        { label: 'Client-Side Sandbox', desc: 'Data never leaves your phone or browser without your command' },
        { label: 'Weekly One-Tap Backups', desc: 'Export full JSON snapshots anytime to keep your history protected' },
        { label: 'Optional OneDrive Sync', desc: 'Optionally mirror your data directly to an Excel sheet in your Microsoft account' },
      ],
    },
    {
      badge: 'Step 3 of 3 · Intelligence',
      title: 'Smart Analytics & Budget Guardian',
      subtitle: 'Protect your monthly savings with predictive pacing, safe daily allowances, and commute route intelligence.',
      icon: Sparkles,
      iconColor: '#A855F7',
      features: [
        { label: 'Budget Guardian Pacing', desc: 'Dynamic safe spending allowance recalculated each morning' },
        { label: 'Spending Forecast', desc: 'Mathematical projection of your month-end total based on actual run-rates' },
        { label: 'RFC 4180 CSV Export', desc: 'Pristine spreadsheets with UTF-8 BOM for Microsoft Excel and Google Sheets' },
      ],
    },
  ];

  const handleNext = () => {
    if (currentStep < screens.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(s => s - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('omni_onboarding_completed', 'true');
    onClose();
  };

  const screen = screens[currentStep];
  const Icon = screen.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-lg p-6 sm:p-8 rounded-3xl text-slate-900 dark:text-white shadow-2xl relative border border-white/15 overflow-hidden">
        {/* Ambient Top Glow */}
        <div 
          className="absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-36 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ backgroundColor: screen.iconColor }}
        />

        {/* Skip button top right */}
        <button
          onClick={handleComplete}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-semibold px-2 py-1 rounded-lg hover:bg-white/5 transition"
        >
          Skip
        </button>

        {/* Header Icon & Step Badge */}
        <div className="flex items-center gap-3 mb-4">
          <div 
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg"
            style={{ backgroundColor: `${screen.iconColor}20`, border: `1px solid ${screen.iconColor}40` }}
          >
            <Icon className="w-6 h-6 stroke-[2.2]" style={{ color: screen.iconColor }} />
          </div>
          <div>
            <span 
              className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${screen.iconColor}15`, color: screen.iconColor }}
            >
              {screen.badge}
            </span>
            <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
              {screen.title}
            </h2>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-[#9FA2AC] leading-relaxed mb-6">
          {screen.subtitle}
        </p>

        {/* Feature Cards */}
        <div className="space-y-2.5 mb-8">
          {screen.features.map((feat, idx) => (
            <div 
              key={idx}
              className="glass-panel-subtle p-3 rounded-2xl flex items-start gap-3 border border-white/5"
            >
              <div 
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ backgroundColor: `${screen.iconColor}20`, color: screen.iconColor }}
              >
                <Check className="w-3 h-3 stroke-[3]" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">{feat.label}</h4>
                <p className="text-[11px] text-slate-500 dark:text-[#9FA2AC] mt-0.5 leading-snug">{feat.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200/50 dark:border-white/10">
          {/* Step dots */}
          <div className="flex items-center gap-2">
            {screens.map((_, idx) => (
              <div
                key={idx}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentStep 
                    ? 'w-6 bg-[#FF7628]' 
                    : 'w-2 bg-slate-300 dark:bg-white/20'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={handleBack}
                className="py-2.5 px-3.5 rounded-xl glass-panel-subtle text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-white transition active:scale-95"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={handleNext}
              className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-[#FF7628] to-[#FF8C42] hover:brightness-110 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-[#FF7628]/25 transition active:scale-95 cursor-pointer"
            >
              <span>{currentStep === screens.length - 1 ? 'Get Started' : 'Next'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
