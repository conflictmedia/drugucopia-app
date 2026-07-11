'use client'

import { useEffect } from 'react'
import { useReminderStore } from '@/store/reminder-store'
import { startReminderEngine, stopReminderEngine } from '@/lib/reminder-engine'
import { startTimelineNotifications, stopTimelineNotifications } from '@/lib/timeline-notifications'
import { preloadReminderSound } from '@/lib/sound-utils'
import { shouldRegisterServiceWorker, shouldPlayWebSound, isTauri } from '@/lib/tauri-bridge'

/** Whether we've already prompted for notification permission this session */
let permissionPrompted = false

/**
 * Client-only provider that initializes the reminder store,
 * starts the engine tick loop, and registers the Service Worker.
 * When running in Tauri, skips SW registration (not needed) and
 * web audio preloading (native OS sound is used instead).
 *
 * Also requests native notification permission on first launch
 * when running inside Tauri (Android/iOS require an explicit prompt).
 * Wrap your app (or just the main content) with this provider.
 */
export function ReminderProvider({ children }: { children: React.ReactNode }) {
  const initialize = useReminderStore((s) => s.initialize)

  useEffect(() => {
    // 1. Initialize store from localStorage
    const cleanup = initialize()

    // 2. Start the reminder engine (1-second tick loop)
    startReminderEngine()

    // 2c. Start the timeline phase notification engine (checks every 30s)
    startTimelineNotifications()

    // 2b. Async: check Tauri native notification permission and update store.
    //     Also request permission if not yet decided (Android/iOS need an
    //     explicit prompt — the browser "default" state doesn't exist on mobile).
    if (typeof window !== 'undefined') {
      import('@/lib/notification-utils').then(async ({ checkNotificationPermissionStatus, requestNotificationPermission }) => {
        const currentPerm = await checkNotificationPermissionStatus()

        // Update store with the real permission state
        if (currentPerm && currentPerm !== useReminderStore.getState().notificationPermission) {
          useReminderStore.getState().setNotificationPermission(currentPerm)
        }

        // In Tauri (mobile), auto-request permission on first launch if not decided.
        // On Android, the OS shows a system dialog — this is the only way to get
        // "granted" status. On web, browsers require a user gesture, so we skip
        // auto-request there (the Reminder Settings button handles it).
        if (isTauri() && currentPerm === 'default' && !permissionPrompted) {
          permissionPrompted = true
          try {
            const result = await requestNotificationPermission()
            useReminderStore.getState().setNotificationPermission(result)
          } catch {
            // User denied or prompt failed — non-critical
          }
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
      stopTimelineNotifications()
      cleanup?.()
    }
  }, [initialize])

  return <>{children}</>
}
