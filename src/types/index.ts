export interface Duration {
  onset: string
  comeup: string
  peak: string
  offset: string
  total: string
  afterglow?: string
}

export interface DoseLog {
  id: string
  substanceId?: string
  substanceName: string
  categories: string[]
  amount: number
  unit: string
  route: string
  timestamp: string
  duration: Duration | null
  durationIsEstimated?: boolean
  durationSourceRoute?: string
  notes: string | null
  mood: string | null
  setting: string | null
  intensity?: number | null
  createdAt: string
  updatedAt?: string
}
// ─── Reminder System Types ────────────────────────────────────────────────

/** User-configured reminder schedule for a specific substance */
export interface ReminderSchedule {
  /** Unique ID for this schedule config */
  id: string
  /** Substance name this schedule applies to (matched case-insensitive) */
  substanceName: string
  /** Optional substance ID for faster matching */
  substanceId?: string
  /** Interval between doses in minutes (e.g., 240 = 4 hours) */
  intervalMinutes: number
  /** Max number of reminders per day (0 = unlimited) */
  maxDosesPerDay: number
  /** Whether this schedule is active */
  enabled: boolean
  /** Custom notification message; defaults to "Time for your next dose of {substance}" */
  customMessage?: string
  /** ISO timestamp of creation */
  createdAt: string
  /** ISO timestamp of last update (used for sync conflict resolution) */
  updatedAt?: string
}

/** A running countdown timer instance spawned from a ReminderSchedule */
export interface ActiveReminder {
  /** Unique ID */
  id: string
  /** The ReminderSchedule ID this was spawned from */
  scheduleId: string
  /** Substance name (denormalized for fast display) */
  substanceName: string
  /** The DoseLog.id that triggered this reminder */
  sourceDoseId: string
  /** ISO timestamp when the timer was started (= dose timestamp) */
  startedAt: string
  /** ISO timestamp when the timer will fire */
  firesAt: string
  /** Interval in ms (cached from schedule for persistence) */
  intervalMs: number
  /** Current state of this timer */
  status: 'running' | 'fired' | 'dismissed' | 'snoozed'
  /** How many times this substance has been reminded today (for maxDosesPerDay) */
  dosesRemindedToday: number
  /** If snoozed, when the snooze ends */
  snoozedUntil?: string
  /** Last date used for dosesRemindedToday tracking (YYYY-MM-DD) */
  remindedDate?: string
}
