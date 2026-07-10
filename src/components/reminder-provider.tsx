'use client'

import { useEffect } from 'react'
import { useReminderStore } from '@/store/reminder-store'
import { startReminderEngine, stopReminderEngine } from '@/lib/reminder-engine'
import { preloadReminderSound } from '@/lib/sound-utils'
import { shouldRegisterServiceWorker, shouldPlayWebSound } from '@/lib/tauri-bridge'

/**
 * Client-only provider that initializes the reminder store,
 * starts the engine tick loop, and registers the Service Worker.
 * When running in Tauri, skips SW registration (not needed) and
 * web audio preloading (native OS sound is used instead).
 * Wrap your app (or just the main content) with this provider.
 */
export function ReminderProvider({ children }: { children: React.ReactNode }) {
  const initialize = useReminderStore((s) => s.initialize)

  useEffect(() => {
    // 1. Initialize store from localStorage
    const cleanup = initialize()

    // 2. Start the reminder engine (1-second tick loop)
    startReminderEngine()

    // 2b. Async: check Tauri native notification permission and update store
    //     This corrects the initial sync check done in the store's initialize().
    if (typeof window !== 'undefined') {
      import('@/lib/notification-utils').then(({ checkNotificationPermissionStatus }) =>
        checkNotificationPermissionStatus()
      ).then((perm) => {
        if (perm && perm !== useReminderStore.getState().notificationPermission) {
          useReminderStore.getState().setNotificationPermission(perm)
        }
      }).catch(() => {
        // Non-critical — the sync check is sufficient for web
      })
    }

    // 3. Register Service Worker for background notifications (web only)
    if (shouldRegisterServiceWorker()) {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
          // SW registration failure is non-critical — in-app reminders still work
          console.warn('SW registration failed (reminders still work in-app):', err?.message)
        })
      }
    }

    // 4. Preload notification sound on first user interaction (web only)
    //    In Tauri, the OS notification system plays its own sound.
    if (shouldPlayWebSound()) {
      const onFirstInteraction = () => {
        preloadReminderSound()
        document.removeEventListener('click', onFirstInteraction)
        document.removeEventListener('keydown', onFirstInteraction)
      }
      document.addEventListener('click', onFirstInteraction)
      document.addEventListener('keydown', onFirstInteraction)
    }

    return () => {
      stopReminderEngine()
      cleanup?.()
    }
  }, [initialize])

  return <>{children}</>
}
