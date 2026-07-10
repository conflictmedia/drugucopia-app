import { useReminderStore } from '@/store/reminder-store'
import { requestNotificationPermission } from './notification-utils'
// Note: requestNotificationPermission already delegates to tauri-bridge
// which uses @tauri-apps/plugin-notification when running in Tauri.

let intervalId: ReturnType<typeof setInterval> | null = null

/**
 * Start the reminder engine — call once on app mount.
 * Ticks every 1 second for smooth countdown display and accurate timer detection.
 */
export function startReminderEngine(): void {
  if (intervalId) return // Already running

  intervalId = setInterval(() => {
    useReminderStore.getState().tick()
  }, 1000)
}

/**
 * Stop the reminder engine — call on app unmount.
 */
export function stopReminderEngine(): void {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
}

/**
 * Request notification permission from the user and update the store.
 */
export async function askNotificationPermission(): Promise<NotificationPermission> {
  const result = await requestNotificationPermission()
  useReminderStore.getState().setNotificationPermission(result)
  return result
}

