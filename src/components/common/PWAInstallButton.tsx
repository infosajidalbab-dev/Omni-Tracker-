import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running standalone or not available, hide
  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className={`flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#FF7628] to-[#FF8C42] text-white font-medium shadow-md shadow-[#FF7628]/20 hover:brightness-110 active:scale-95 transition-all ${
          compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
        }`}
        title="Install OMNI TRACKER on your home screen"
      >
        <Download className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 text-[#F7F7F8] hover:bg-white/10 active:scale-95 transition-all ${
            compact ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-xs font-medium'
          }`}
        >
          <Smartphone className={compact ? 'w-3.5 h-3.5 text-[#FF7628]' : 'w-4 h-4 text-[#FF7628]'} />
          <span>Install iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[#18191D] border border-white/10 p-6 text-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-[#FF7628]" />
                  <h3 className="text-base font-semibold">Install on iPhone / iPad</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg hover:bg-white/10 text-[#A0A2AA]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-sm text-[#A0A2AA]">
                <p className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#FF7628]/20 text-[#FF7628] font-bold flex items-center justify-center text-xs">
                    1
                  </span>
                  <span>Tap the <strong>Share</strong> button (box with upward arrow) in the Safari toolbar.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#FF7628]/20 text-[#FF7628] font-bold flex items-center justify-center text-xs">
                    2
                  </span>
                  <span>Scroll down and select <strong>Add to Home Screen</strong>.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#FF7628]/20 text-[#FF7628] font-bold flex items-center justify-center text-xs">
                    3
                  </span>
                  <span>Tap <strong>Add</strong> to use OMNI TRACKER offline like a native app.</span>
                </p>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full rounded-xl bg-white/10 py-2.5 text-sm font-medium hover:bg-white/15 transition"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
