import { create } from 'zustand'
import { ReminderSchedule, ActiveReminder, DoseLog } from '../types'
import { showBrowserNotification } from '@/lib/notification-utils'
import { playReminderSound } from '@/lib/sound-utils'
import { shouldPlayWebSound } from '@/lib/tauri-bridge'

const SCHEDULES_KEY = 'drugucopia-reminder-schedules'
const ACTIVE_KEY = 'drugucopia-reminder-active'
const SETTINGS_KEY = 'drugucopia-reminder-settings'
const DELETED_SCHEDULES_KEY = 'drugucopia-deleted-schedule-ids'

interface ReminderSettings {
  autoStartEnabled: boolean
  soundEnabled: boolean
  notificationPermission: NotificationPermission | 'default'
}

interface ReminderState {
  schedules: ReminderSchedule[]
  activeReminders: ActiveReminder[]
  deletedScheduleIds: Set<string>
  notificationPermission: NotificationPermission | 'default'
  autoStartEnabled: boolean
  soundEnabled: boolean
  isLoaded: boolean

  initialize: () => (() => void) | void
  addSchedule: (schedule: ReminderSchedule) => void
  updateSchedule: (id: string, patch: Partial<ReminderSchedule>) => void
  removeSchedule: (id: string) => void
  startTimer: (dose: DoseLog) => void
  dismissReminder: (id: string) => void
  snoozeReminder: (id: string, minutes: number) => void
  dismissAllFired: () => void
  tick: () => void
  setNotificationPermission: (p: NotificationPermission) => void
  setAutoStartEnabled: (enabled: boolean) => void
  setSoundEnabled: (enabled: boolean) => void
  setRemindersFromSync: (
    schedules: ReminderSchedule[],
    activeReminders: ActiveReminder[],
    deletedScheduleIds: Set<string>,
    settings?: Partial<Pick<ReminderState, 'autoStartEnabled' | 'soundEnabled'>>,
  ) => void
}

function persistSchedules(schedules: ReminderSchedule[]) {
  localStorage.setItem(SCHEDULES_KEY, JSON.stringify(schedules))
}

function persistActive(active: ActiveReminder[]) {
  localStorage.setItem(ACTIVE_KEY, JSON.stringify(active))
}

function persistSettings(settings: ReminderSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

function persistDeletedScheduleIds(deleted: Set<string>) {
  localStorage.setItem(DELETED_SCHEDULES_KEY, JSON.stringify([...deleted]))
}

export const useReminderStore = create<ReminderState>((set, get) => ({
  schedules: [],
  activeReminders: [],
  deletedScheduleIds: new Set(),
  notificationPermission: 'default',
  autoStartEnabled: true,
  soundEnabled: true,
  isLoaded: false,

  initialize: () => {
    if (get().isLoaded) return

    try {
      const schedules = JSON.parse(localStorage.getItem(SCHEDULES_KEY) || '[]')
      const active = JSON.parse(localStorage.getItem(ACTIVE_KEY) || '[]')
      const deletedScheduleIds = new Set<string>(
        JSON.parse(localStorage.getItem(DELETED_SCHEDULES_KEY) || '[]'),
      )
      const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')

      // Check current notification permission
      // Use the Tauri-aware check which works on both web and native
      let perm: NotificationPermission | 'default' = 'default'
      if (typeof window !== 'undefined') {
        if ('Notification' in window) {
          perm = Notification.permission
        }
        // Note: For Tauri, the permission check is async. We'll do a
        // follow-up check after initialization. The sync check above
        // works for the initial render; the async check in
        // checkNotificationPermissionStatus() will correct it if needed.
      }

      set({
        schedules,
        activeReminders: active,
        deletedScheduleIds,
        notificationPermission: perm,
        autoStartEnabled: settings.autoStartEnabled ?? true,
        soundEnabled: settings.soundEnabled ?? true,
        isLoaded: true,
      })
    } catch (e) {
      console.error('Failed to load reminder state', e)
      set({ isLoaded: true })
    }

    // Cross-tab sync via storage event
    const onStorage = (e: StorageEvent) => {
      if (e.key === SCHEDULES_KEY && e.newValue) {
        try {
          set({ schedules: JSON.parse(e.newValue) })
        } catch {}
      }
      if (e.key === ACTIVE_KEY && e.newValue) {
        try {
          set({ activeReminders: JSON.parse(e.newValue) })
        } catch {}
      }
      if (e.key === DELETED_SCHEDULES_KEY && e.newValue) {
        try {
          set({ deletedScheduleIds: new Set(JSON.parse(e.newValue)) })
        } catch {}
      }
      if (e.key === SETTINGS_KEY && e.newValue) {
        try {
          const s = JSON.parse(e.newValue)
          set({
            autoStartEnabled: s.autoStartEnabled ?? true,
            soundEnabled: s.soundEnabled ?? true,
          })
        } catch {}
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  },

  addSchedule: (schedule) => {
    set((state) => {
      const updated = [...state.schedules, schedule]
      persistSchedules(updated)
      return { schedules: updated }
    })
  },

  updateSchedule: (id, patch) => {
    set((state) => {
      const updated = state.schedules.map((s) =>
        s.id === id ? { ...s, ...patch, updatedAt: new Date().toISOString() } : s,
      )
      persistSchedules(updated)
      return { schedules: updated }
    })
  },

  removeSchedule: (id) => {
    set((state) => {
      const updated = state.schedules.filter((s) => s.id !== id)
      const updatedDeleted = new Set(state.deletedScheduleIds).add(id)
      persistSchedules(updated)
      persistDeletedScheduleIds(updatedDeleted)
      // Also remove active timers for this schedule
      const activeUpdated = state.activeReminders.filter(
        (r) => r.scheduleId !== id,
      )
      persistActive(activeUpdated)
      return { schedules: updated, deletedScheduleIds: updatedDeleted, activeReminders: activeUpdated }
    })
  },

  startTimer: (dose) => {
    const { schedules } = get()
    const schedule = schedules.find(
      (s) =>
        s.enabled &&
        s.substanceName.toLowerCase() === dose.substanceName.toLowerCase(),
    )
    if (!schedule) return

    // Check maxDosesPerDay — count actual doses logged today from localStorage
    // This prevents creating a reminder after the last dose of the day.
    // e.g. NAC 2x daily: dose #1 → create reminder, dose #2 → no reminder needed
    if (schedule.maxDosesPerDay > 0) {
      try {
        const allDoses: DoseLog[] = JSON.parse(localStorage.getItem('drugucopia-dose-logs') || '[]')
        const today = new Date().toISOString().slice(0, 10)
        const dosesToday = allDoses.filter(
          (d) =>
            d.substanceName.toLowerCase() === schedule.substanceName.toLowerCase() &&
            d.timestamp.slice(0, 10) === today,
        ).length
        // If the user has already logged maxDosesPerDay doses today (including
        // the current one which just got persisted), don't start another timer.
        if (dosesToday >= schedule.maxDosesPerDay) return
      } catch {
        // If we can't read dose logs, fall through and create the timer
      }
    }

    const doseTime = new Date(dose.timestamp)
    const firesAt = new Date(
      doseTime.getTime() + schedule.intervalMinutes * 60_000,
    )
    const today = new Date().toISOString().slice(0, 10)

    const timer: ActiveReminder = {
      id: crypto.randomUUID(),
      scheduleId: schedule.id,
      substanceName: dose.substanceName,
      sourceDoseId: dose.id,
      startedAt: dose.timestamp,
      firesAt: firesAt.toISOString(),
      intervalMs: schedule.intervalMinutes * 60_000,
      status: 'running',
      dosesRemindedToday: 0,
      remindedDate: today,
    }

    set((state) => {
      // Cancel any existing timers for the same substance — the user just
      // took a dose, so the old countdown/notification is stale and the
      // new timer should replace it from the current dose time.
      // This covers running, snoozed, AND fired (un-dismissed) reminders.
      const nameLower = dose.substanceName.toLowerCase()
      const filtered = state.activeReminders.filter(
        (r) => r.substanceName.toLowerCase() !== nameLower,
      )
      const updated = [...filtered, timer]
      persistActive(updated)
      return { activeReminders: updated }
    })
  },

  dismissReminder: (id) => {
    set((state) => {
      const updated = state.activeReminders.filter((r) => r.id !== id)
      persistActive(updated)
      return { activeReminders: updated }
    })
  },

  snoozeReminder: (id, minutes) => {
    set((state) => {
      const updated = state.activeReminders.map((r) =>
        r.id === id
          ? {
              ...r,
              status: 'snoozed' as const,
              snoozedUntil: new Date(
                Date.now() + minutes * 60_000,
              ).toISOString(),
            }
          : r,
      )
      persistActive(updated)
      return { activeReminders: updated }
    })
  },

  dismissAllFired: () => {
    set((state) => {
      const updated = state.activeReminders.filter(
        (r) => r.status !== 'fired',
      )
      persistActive(updated)
      return { activeReminders: updated }
    })
  },

  tick: () => {
    const now = Date.now()
    const { activeReminders, schedules } = get()
    let changed = false

    const updated = activeReminders.map((r) => {
      if (
        r.status === 'running' &&
        new Date(r.firesAt).getTime() <= now
      ) {
        changed = true
        return {
          ...r,
          status: 'fired' as const,
          dosesRemindedToday: r.dosesRemindedToday + 1,
        }
      }
      if (
        r.status === 'snoozed' &&
        r.snoozedUntil &&
        new Date(r.snoozedUntil).getTime() <= now
      ) {
        changed = true
        return {
          ...r,
          status: 'fired' as const,
          snoozedUntil: undefined,
          dosesRemindedToday: r.dosesRemindedToday + 1,
        }
      }
      return r
    })

    if (changed) {
      // Fire browser notifications for newly-fired reminders
      const newlyFired = updated.filter(
        (r, i) =>
          r.status === 'fired' && activeReminders[i]?.status !== 'fired',
      )
      for (const r of newlyFired) {
        const schedule = schedules.find((s) => s.id === r.scheduleId)
        showBrowserNotification(r, schedule?.customMessage)
        // Play notification sound if enabled (web only; Tauri uses OS sound)
        if (get().soundEnabled && shouldPlayWebSound()) {
          playReminderSound()
        }
      }

      // Cleanup: remove dismissed and old fired reminders (> 2 hours)
      const cleaned = updated.filter((r) => {
        if (r.status === 'dismissed') return false
        if (
          r.status === 'fired' &&
          now - new Date(r.firesAt).getTime() > 2 * 60 * 60_000
        )
          return false
        return true
      })

      persistActive(cleaned)
      set({ activeReminders: cleaned })
    }
  },

  setNotificationPermission: (p) => {
    set({ notificationPermission: p })
    persistSettings({
      autoStartEnabled: get().autoStartEnabled,
      soundEnabled: get().soundEnabled,
      notificationPermission: p,
    })
  },

  setAutoStartEnabled: (enabled) => {
    set({ autoStartEnabled: enabled })
    persistSettings({
      autoStartEnabled: enabled,
      soundEnabled: get().soundEnabled,
      notificationPermission: get().notificationPermission,
    })
  },

  setSoundEnabled: (enabled) => {
    set({ soundEnabled: enabled })
    persistSettings({
      autoStartEnabled: get().autoStartEnabled,
      soundEnabled: enabled,
      notificationPermission: get().notificationPermission,
    })
  },

  setRemindersFromSync: (schedules, activeReminders, deletedScheduleIds, settings) => {
    persistSchedules(schedules)
    persistActive(activeReminders)
    persistDeletedScheduleIds(deletedScheduleIds)
    const stateUpdate: Partial<ReminderState> = {
      schedules,
      activeReminders,
      deletedScheduleIds,
    }
    if (settings?.autoStartEnabled !== undefined) {
      stateUpdate.autoStartEnabled = settings.autoStartEnabled
    }
    if (settings?.soundEnabled !== undefined) {
      stateUpdate.soundEnabled = settings.soundEnabled
    }
    // Also persist settings if they came from sync
    if (settings) {
      persistSettings({
        autoStartEnabled: settings.autoStartEnabled ?? get().autoStartEnabled,
        soundEnabled: settings.soundEnabled ?? get().soundEnabled,
        notificationPermission: get().notificationPermission,
      })
    }
    set(stateUpdate)
  },
}))
