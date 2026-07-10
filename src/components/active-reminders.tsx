'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, BellRing, Clock, Timer, X, Coffee, AlarmClock } from 'lucide-react'
import { useReminderStore } from '@/store/reminder-store'
import { formatRemainingTime } from '@/lib/notification-utils'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * ActiveReminders — displays running countdown timers and fired notifications.
 * Shows above/below the ActiveDosesTimeline in the sidebar and in the mobile timeline tab.
 */
export function ActiveReminders() {
  const activeReminders = useReminderStore((s) => s.activeReminders)
  const schedules = useReminderStore((s) => s.schedules)
  const dismissReminder = useReminderStore((s) => s.dismissReminder)
  const snoozeReminder = useReminderStore((s) => s.snoozeReminder)
  const dismissAllFired = useReminderStore((s) => s.dismissAllFired)

  // Force re-render every second for live countdown
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const now = Date.now()

  const running = useMemo(
    () => activeReminders.filter((r) => r.status === 'running'),
    [activeReminders, tick],
  )
  const snoozed = useMemo(
    () => activeReminders.filter((r) => r.status === 'snoozed'),
    [activeReminders, tick],
  )
  const fired = useMemo(
    () => activeReminders.filter((r) => r.status === 'fired'),
    [activeReminders],
  )

  if (activeReminders.length === 0) return null

  return (
    <Card className="py-3 gap-2">
      <CardHeader className="pb-1">
        <CardTitle className="text-lg flex items-center gap-2">
          <BellRing className="h-5 w-5 text-amber-500" />
          Dose Reminders
          {fired.length > 0 && (
            <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-500">
              {fired.length} due
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {running.length + snoozed.length} timer{running.length + snoozed.length !== 1 ? 's' : ''} active
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-2">
        <AnimatePresence mode="popLayout">
          {/* ── Fired reminders (need action) ── */}
          {fired.map((r) => {
            const schedule = schedules.find((s) => s.id === r.scheduleId)
            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <AlarmClock className="h-4 w-4 text-amber-500 shrink-0" />
                      <span className="font-medium text-sm">{r.substanceName}</span>
                    </div>
                    <p className="text-xs text-neutral-content mt-1">
                      {schedule?.customMessage || `Time for your next dose of ${r.substanceName}`}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="tap-sm h-7 w-7 shrink-0 min-h-0 p-0"
                    onClick={() => dismissReminder(r.id)}
                    aria-label="Dismiss reminder"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="tap-sm h-7 min-h-0 text-xs gap-1 px-2"
                    onClick={() => dismissReminder(r.id)}
                  >
                    <Bell className="h-3 w-3" />
                    Dismiss
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="tap-sm h-7 min-h-0 text-xs gap-1 px-2"
                    onClick={() => snoozeReminder(r.id, 15)}
                  >
                    <Coffee className="h-3 w-3" />
                    Snooze 15m
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="tap-sm h-7 min-h-0 text-xs gap-1 px-2"
                    onClick={() => snoozeReminder(r.id, 60)}
                  >
                    <Timer className="h-3 w-3" />
                    Snooze 1h
                  </Button>
                </div>
              </motion.div>
            )
          })}

          {/* ── Running timers ── */}
          {running.map((r) => {
            const remaining = new Date(r.firesAt).getTime() - now
            const progress = Math.max(
              0,
              Math.min(
                100,
                ((r.intervalMs - remaining) / r.intervalMs) * 100,
              ),
            )
            const isUrgent = remaining > 0 && remaining < 5 * 60_000 // < 5 min

            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="rounded-lg border border-base-300 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Clock
                      className={`h-4 w-4 shrink-0 ${isUrgent ? 'text-amber-500' : 'text-blue-500'}`}
                    />
                    <span className="font-medium text-sm truncate">
                      {r.substanceName}
                    </span>
                  </div>
                  <span
                    className={`text-sm font-mono tabular-nums shrink-0 ${isUrgent ? 'text-amber-500 font-bold' : 'text-neutral-content'}`}
                  >
                    {formatRemainingTime(remaining)}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="mt-2 h-1.5 rounded-full bg-base-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${isUrgent ? 'bg-amber-500' : 'bg-blue-500'}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-xs text-neutral-content">
                    Started{' '}
                    {new Date(r.startedAt).toLocaleTimeString([], {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="tap-sm h-6 min-h-0 text-xs text-neutral-content hover:text-error px-1"
                    onClick={() => dismissReminder(r.id)}
                  >
                    Cancel
                  </Button>
                </div>
              </motion.div>
            )
          })}

          {/* ── Snoozed timers ── */}
          {snoozed.map((r) => {
            const remaining = r.snoozedUntil
              ? new Date(r.snoozedUntil).getTime() - now
              : 0

            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Coffee className="h-4 w-4 text-purple-500 shrink-0" />
                    <span className="font-medium text-sm truncate">
                      {r.substanceName}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-xs border-purple-500/30 text-purple-400"
                    >
                      Snoozed
                    </Badge>
                  </div>
                  <span className="text-sm font-mono tabular-nums text-purple-400 shrink-0">
                    {formatRemainingTime(remaining)}
                  </span>
                </div>
                <div className="flex items-center justify-end mt-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="tap-sm h-6 min-h-0 text-xs text-neutral-content hover:text-error px-1"
                    onClick={() => dismissReminder(r.id)}
                  >
                    Cancel
                  </Button>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {/* Dismiss All button when there are fired reminders */}
        {fired.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-neutral-content"
            onClick={dismissAllFired}
          >
            Dismiss All ({fired.length})
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * MobileActiveReminders — compact version for mobile bottom nav timeline tab.
 *
 * Fixes applied:
 * - Substance names are truncated so remaining time is always visible on narrow screens
 * - Running reminders show a progress bar and urgency indicator (matching desktop)
 * - Snoozed reminders are now displayed (were missing entirely)
 * - Icons added to snooze buttons for consistency with desktop
 */
export function MobileActiveReminders() {
  const activeReminders = useReminderStore((s) => s.activeReminders)
  const schedules = useReminderStore((s) => s.schedules)
  const dismissReminder = useReminderStore((s) => s.dismissReminder)
  const snoozeReminder = useReminderStore((s) => s.snoozeReminder)

  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const now = Date.now()

  if (activeReminders.length === 0) return null

  const fired = activeReminders.filter((r) => r.status === 'fired')
  const running = activeReminders.filter((r) => r.status === 'running')
  const snoozed = activeReminders.filter((r) => r.status === 'snoozed')

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <BellRing className="h-4 w-4 text-amber-500" />
        <h3 className="text-sm font-semibold">Reminders</h3>
        {fired.length > 0 && (
          <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-500">
            {fired.length} due
          </Badge>
        )}
      </div>

      <div className="space-y-2">
        {/* ── Fired reminders ── */}
        {fired.map((r) => (
          <div
            key={r.id}
            className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <AlarmClock className="h-4 w-4 text-amber-500 shrink-0" />
                <span className="font-medium text-sm truncate">{r.substanceName}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="tap-sm h-7 min-h-0 text-xs shrink-0 px-2"
                onClick={() => dismissReminder(r.id)}
              >
                Dismiss
              </Button>
            </div>
            <p className="text-xs text-neutral-content mt-1">
              {schedules.find((s) => s.id === r.scheduleId)?.customMessage ||
                `Time for your next dose of ${r.substanceName}`}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                className="tap-sm h-7 min-h-0 text-xs gap-1 px-2"
                onClick={() => snoozeReminder(r.id, 15)}
              >
                <Coffee className="h-3 w-3" />
                Snooze 15m
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="tap-sm h-7 min-h-0 text-xs gap-1 px-2"
                onClick={() => snoozeReminder(r.id, 60)}
              >
                <Timer className="h-3 w-3" />
                Snooze 1h
              </Button>
            </div>
          </div>
        ))}

        {/* ── Running timers (with progress bar + urgency) ── */}
        {running.map((r) => {
          const remaining = new Date(r.firesAt).getTime() - now
          const progress = Math.max(
            0,
            Math.min(
              100,
              ((r.intervalMs - remaining) / r.intervalMs) * 100,
            ),
          )
          const isUrgent = remaining > 0 && remaining < 5 * 60_000

          return (
            <div
              key={r.id}
              className="rounded-lg border border-base-300 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Clock className={`h-4 w-4 shrink-0 ${isUrgent ? 'text-amber-500' : 'text-blue-500'}`} />
                  <span className="font-medium text-sm truncate">{r.substanceName}</span>
                </div>
                <span className={`text-sm font-mono tabular-nums shrink-0 ${isUrgent ? 'text-amber-500 font-bold' : 'text-neutral-content'}`}>
                  {formatRemainingTime(remaining)}
                </span>
              </div>
              {/* Progress bar */}
              <div className="mt-2 h-1.5 rounded-full bg-base-200 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${isUrgent ? 'bg-amber-500' : 'bg-blue-500'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-xs text-neutral-content">
                  Started{' '}
                  {new Date(r.startedAt).toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="tap-sm h-6 min-h-0 text-xs text-neutral-content hover:text-error px-1"
                  onClick={() => dismissReminder(r.id)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )
        })}

        {/* ── Snoozed timers ── */}
        {snoozed.map((r) => {
          const remaining = r.snoozedUntil
            ? new Date(r.snoozedUntil).getTime() - now
            : 0

          return (
            <div
              key={r.id}
              className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Coffee className="h-4 w-4 text-purple-500 shrink-0" />
                  <span className="font-medium text-sm truncate">{r.substanceName}</span>
                  <Badge
                    variant="outline"
                    className="text-xs border-purple-500/30 text-purple-400"
                  >
                    Snoozed
                  </Badge>
                </div>
                <span className="text-sm font-mono tabular-nums text-purple-400 shrink-0">
                  {formatRemainingTime(remaining)}
                </span>
              </div>
              <div className="flex items-center justify-end mt-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="tap-sm h-6 min-h-0 text-xs text-neutral-content hover:text-error px-1"
                  onClick={() => dismissReminder(r.id)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
