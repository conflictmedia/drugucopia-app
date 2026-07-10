/**
 * Pure notification utility — no store dependencies.
 * Used by both reminder-store.ts and reminder-engine.ts to avoid circular imports.
 *
 * When running inside Tauri (mobile/desktop), delegates to the native
 * notification system via @tauri-apps/plugin-notification. When running
 * as a regular web app (PWA), falls back to the browser Notification API.
 */

import type { ActiveReminder } from '@/types'
import {
  showNotification as tauriShowNotification,
  requestNotificationPermission as tauriRequestPermission,
  checkNotificationPermission as tauriCheckPermission,
} from './tauri-bridge'

/**
 * Show a notification for a fired reminder.
 * Tries Tauri native notification first (when available), then
 * falls back to browser Notification API.
 */
export function showBrowserNotification(
  reminder: ActiveReminder,
  customMessage?: string,
): void {
  // tauriShowNotification is async but we keep the sync call signature
  // for backward compatibility. Errors are handled internally.
  tauriShowNotification(reminder, customMessage).catch(() => {
    // Silently ignore — the bridge already falls back to web notification
  })
}

/**
 * Request notification permission.
 * Uses Tauri's native permission request on mobile, or the browser API on web.
 * Returns the permission result.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  return tauriRequestPermission()
}

/**
 * Check current notification permission status.
 * Useful for initializing the store on app load.
 */
export async function checkNotificationPermissionStatus(): Promise<NotificationPermission> {
  return tauriCheckPermission()
}

/**
 * Format remaining time in a human-readable string.
 * e.g., "2h 34m", "45m", "30s"
 */
export function formatRemainingTime(ms: number): string {
  if (ms <= 0) return 'Now'

  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
}

/**
 * Format an interval (in minutes) into a human-readable string.
 * e.g., "4 hours", "30 minutes", "1h 30m"
 */
export function formatIntervalMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''}`
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  if (remaining === 0) return `${hours} hour${hours !== 1 ? 's' : ''}`
  return `${hours}h ${remaining}m`
}
