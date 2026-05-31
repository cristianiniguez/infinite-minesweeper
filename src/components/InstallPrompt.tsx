'use client';

import { useEffect, useState } from 'react';

const PROMPT_SEEN_KEY = 'ms:pwa-prompt-seen';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(PROMPT_SEEN_KEY)) return;

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const android = /Android/.test(navigator.userAgent);
    if (!ios && !android) return;

    setIsIOS(ios);
    setVisible(true);

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  function dismiss() {
    localStorage.setItem(PROMPT_SEEN_KEY, '1');
    setVisible(false);
  }

  async function nativeInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    dismiss();
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/80 p-4">
      <div className="w-full max-w-sm rounded-xl bg-gray-800 p-6 shadow-xl">
        <h2 className="mb-2 text-xl font-bold text-white">Install for the best experience</h2>
        <p className="mb-4 text-sm text-gray-300">
          Play offline, launch from your home screen, and get a full-screen experience — no browser
          chrome in the way.
        </p>

        {isIOS ? (
          <ol className="mb-5 space-y-2 text-sm text-gray-300">
            <li>
              <span className="font-semibold text-white">1.</span> Tap the Share icon{' '}
              <span className="font-mono text-blue-400">□↑</span> at the bottom of Safari
            </li>
            <li>
              <span className="font-semibold text-white">2.</span> Scroll down and tap{' '}
              <span className="font-semibold text-white">Add to Home Screen</span>
            </li>
            <li>
              <span className="font-semibold text-white">3.</span> Tap{' '}
              <span className="font-semibold text-white">Add</span>
            </li>
          </ol>
        ) : (
          <ol className="mb-5 space-y-2 text-sm text-gray-300">
            <li>
              <span className="font-semibold text-white">1.</span> Tap the menu{' '}
              <span className="font-mono text-blue-400">⋮</span> in the top-right of Chrome
            </li>
            <li>
              <span className="font-semibold text-white">2.</span> Tap{' '}
              <span className="font-semibold text-white">Add to Home screen</span>
            </li>
          </ol>
        )}

        <div className="flex gap-3">
          {deferredPrompt && (
            <button
              onClick={nativeInstall}
              className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Install
            </button>
          )}
          <button
            onClick={dismiss}
            className="flex-1 rounded-lg bg-gray-700 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-600"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
