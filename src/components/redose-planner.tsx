'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { CalendarDays, Brain } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDoseStore } from '@/store/dose-store'
import { useReminderStore } from '@/store/reminder-store'
import { toast } from '@/hooks/use-toast'
import { formatIntervalMinutes } from '@/lib/notification-utils'
import { format } from 'date-fns'
import type { DoseLog, Duration, ReminderSchedule } from '@/types'

// ─── Duration parsing helpers ───────────────────────────────────────────────

function parseDurationStringToMinutes(input: string): number | null {
  if (!input || input.toLowerCase() === 'unknown') return null
  const match = input.match(/(\d+(?:\.\d+)?)\s*(?:-\s*(\d+(?:\.\d+)?))?\s*(minutes?|hours?|hrs?|min|m|h)/i)
  if (!match) return null
  const min = parseFloat(match[1])
  const max = match[2] ? parseFloat(match[2]) : min
  const avg = (min + max) / 2
  const unit = match[3].toLowerCase()
  const multiplier = unit.startsWith('h') ? 60 : 1
  return Math.round(avg * multiplier)
}

function calculateComedownReminderInterval(duration: Duration | null | undefined): number | null {
  if (!duration) return null

  const onset = parseDurationStringToMinutes(duration.onset)
  const comeup = parseDurationStringToMinutes(duration.comeup)
  const peak = parseDurationStringToMinutes(duration.peak)
  const offset = parseDurationStringToMinutes(duration.offset)
  const total = parseDurationStringToMinutes(duration.total)

  if (offset !== null) {
    const preOffset = (onset ?? 0) + (comeup ?? 0) + (peak ?? 0)
    const fullTimeline = preOffset + offset

    if (total !== null && Math.abs(fullTimeline - total) <= Math.max(30, total * 0.25)) {
      return preOffset + Math.round(offset / 2)
    }

    if (total !== null && offset <= total) {
      return Math.max(0, total - Math.round(offset / 2))
    }

    return Math.round(offset / 2)
  }

  if (total !== null) return Math.round(total / 2)
  return null
}

interface RedosePlannerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  substance: {
    id: string
    name: string
    categories: string[]
  }
  baseAmount: number
  baseUnit: string
  route: string
  duration?: Duration | null
  notes?: string | null
  mood?: string | null
  setting?: string | null
  intensity?: number | null
  timestamp?: string
  logInitialDose?: boolean
  onPlanCreated?: () => void
  standalone?: boolean
}

export function RedosePlanner({
  open,
  onOpenChange,
  substance,
  baseAmount,
  baseUnit,
  route,
  duration,
  notes,
  mood,
  setting,
  intensity,
  timestamp,
  logInitialDose = true,
  onPlanCreated,
  standalone = false,
}: RedosePlannerProps) {
  const smartInterval = useMemo(() => calculateComedownReminderInterval(duration), [duration])
  const hasSmartInterval = smartInterval !== null && smartInterval > 0

  const [useSmartTiming, setUseSmartTiming] = useState(hasSmartInterval)
  const [intervalHours, setIntervalHours] = useState(() =>
    hasSmartInterval ? Math.floor(smartInterval / 60) : 4,
  )
  const [intervalMinutes, setIntervalMinutes] = useState(() =>
    hasSmartInterval ? smartInterval % 60 : 0,
  )
  const [totalDoses, setTotalDoses] = useState(3)
  const [shouldLogInitialDose, setShouldLogInitialDose] = useState(logInitialDose)

  useEffect(() => {
    if (open && smartInterval !== null) {
      setIntervalHours(Math.floor(smartInterval / 60))
      setIntervalMinutes(smartInterval % 60)
    }
  }, [open, smartInterval])

  const effectiveIntervalMinutes = useMemo(() => {
    if (useSmartTiming && smartInterval !== null) return smartInterval
    return intervalHours * 60 + intervalMinutes
  }, [useSmartTiming, smartInterval, intervalHours, intervalMinutes])

  const plannedTimes = useMemo(() => {
    if (effectiveIntervalMinutes <= 0 || totalDoses <= 0) return []
    return Array.from({ length: totalDoses }, (_, i) =>
      new Date(Date.now() + i * effectiveIntervalMinutes * 60_000)
    )
  }, [effectiveIntervalMinutes, totalDoses])

  const initialDose: DoseLog | null = useMemo(() => {
    if (!logInitialDose || baseAmount <= 0) return null
    const now = new Date().toISOString()
    return {
      id: `dose_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      substanceId: substance.id,
      substanceName: substance.name,
      categories: substance.categories,
      amount: baseAmount,
      unit: baseUnit,
      route,
      timestamp: now,
      duration: duration ?? null,
      notes: notes || null,
      mood: mood || null,
      setting: setting || null,
      intensity: intensity ?? null,
      createdAt: now,
      updatedAt: now,
    }
  }, [
    logInitialDose,
    baseAmount,
    substance.id,
    substance.name,
    substance.categories,
    route,
    duration,
    notes,
    mood,
    setting,
    intensity,
  ])

  const reminderStore = useReminderStore.getState()
  const doseStore = useDoseStore.getState()

  const existingSchedule = useMemo(
    () =>
      reminderStore.schedules.find(
        (s) => s.substanceId === substance.id && s.enabled && s.intervalMinutes === effectiveIntervalMinutes,
      ),
    [reminderStore.schedules, substance.id, effectiveIntervalMinutes],
  )

  const handleCreatePlan = useCallback(() => {
    if (effectiveIntervalMinutes <= 0) {
      toast({ title: 'Invalid interval', description: 'Please set a valid interval', variant: 'destructive' })
      return
    }

    if (shouldLogInitialDose && initialDose) {
      doseStore.addDose(initialDose)
    }

    const scheduleData: Omit<ReminderSchedule, 'id' | 'createdAt' | 'updatedAt'> = {
      substanceName: substance.name,
      substanceId: substance.id,
      intervalMinutes: effectiveIntervalMinutes,
      maxDosesPerDay: totalDoses,
      enabled: true,
      customMessage: `Time for your next dose of ${substance.name} (${baseAmount} ${baseUnit})`,
    }

    if (existingSchedule) {
      reminderStore.updateSchedule(existingSchedule.id, {
        ...scheduleData,
        updatedAt: new Date().toISOString(),
      })
    } else {
      reminderStore.addSchedule({
        id: crypto.randomUUID(),
        ...scheduleData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }

    if (initialDose) {
      reminderStore.startTimer(initialDose)
    }

    const timingLabel = useSmartTiming && smartInterval !== null
      ? `smart comedown timing (~50% intensity, ${formatIntervalMinutes(effectiveIntervalMinutes)})`
      : `every ${formatIntervalMinutes(effectiveIntervalMinutes)}`

    toast({
      title: 'Redose plan created',
      description: `${totalDoses} doses of ${baseAmount} ${baseUnit} ${substance.name} planned, ${timingLabel}. Next redose${plannedTimes.length > 1 ? 's' : ''}: ${plannedTimes.slice(0, 3).join(', ')}${plannedTimes.length > 3 ? '...' : ''}.`,
    })

    onPlanCreated?.()
    onOpenChange(false)
  }, [
    baseAmount,
    baseUnit,
    duration,
    effectiveIntervalMinutes,
    intensity,
    mood,
    notes,
    onOpenChange,
    onPlanCreated,
    plannedTimes,
    route,
    setting,
    shouldLogInitialDose,
    smartInterval,
    substance,
    timestamp,
    totalDoses,
    useSmartTiming,
  ])

  // Render the content that's shared between standalone and dialog modes
  const renderContent = () => (
    <>
      {/* Smart timing toggle */}
      {hasSmartInterval && (
        <div className="flex items-start gap-3 p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
          <input
            id="smart-timing"
            type="checkbox"
            checked={useSmartTiming}
            onChange={(e) => {
              const checked = e.target.checked
              setUseSmartTiming(checked)
              if (checked && smartInterval !== null) {
                setIntervalHours(Math.floor(smartInterval / 60))
                setIntervalMinutes(smartInterval % 60)
              }
            }}
            className="mt-0.5 h-4 w-4 rounded border-base-300 text-indigo-500 focus:ring-indigo-500/20"
          />
          <div>
            <label htmlFor="smart-timing" className="text-sm font-medium text-indigo-400 cursor-pointer flex items-center gap-1.5">
              <Brain className="h-3.5 w-3.5" />
              Smart comedown timing
            </label>
            <p className="text-xs text-neutral-content">
              Remind around 50% intensity during the comedown phase
              {smartInterval !== null && ` (~${formatIntervalMinutes(smartInterval)})`}.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-xs font-medium text-neutral-content">
          {useSmartTiming && hasSmartInterval ? 'Interval (smart estimate)' : 'Interval between doses'}
        </Label>
        <div className="flex items-center justify-center gap-3">
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              min={0}
              max={24}
              step={1}
              value={intervalHours}
              onChange={(e) => {
                setIntervalHours(Math.min(24, Math.max(0, parseInt(e.target.value) || 0)))
                setUseSmartTiming(false)
              }}
              disabled={useSmartTiming && hasSmartInterval}
              className="w-20 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-xs text-neutral-content">hr</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              min={0}
              max={59}
              step={1}
              value={intervalMinutes}
              onChange={(e) => {
                setIntervalMinutes(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))
                setUseSmartTiming(false)
              }}
              disabled={useSmartTiming && hasSmartInterval}
              className="w-20 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-xs text-neutral-content">min</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium text-neutral-content">Total doses today</Label>
        <div className="flex items-center justify-center gap-2">
          <Input
            type="number"
            min={1}
            max={24}
            step={1}
            value={totalDoses}
            onChange={(e) => setTotalDoses(Math.min(24, Math.max(1, parseInt(e.target.value) || 1)))}
            className="w-20 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="text-xs text-neutral-content">
            {totalDoses === 1 ? 'dose' : 'doses'}
          </span>
        </div>
      </div>

      {effectiveIntervalMinutes > 0 && totalDoses > 0 && (
        <div className="rounded-xl border border-base-300/50 bg-base-200/30 p-3">
          <p className="text-xs font-medium text-neutral-content mb-2 text-center">Planned times</p>
          <div className="flex flex-wrap justify-center gap-2">
            {plannedTimes.map((time, i) => (
              <span
                key={i}
                className={`text-xs px-2 py-1 rounded-full border ${
                  i === 0
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : 'border-base-300 bg-base-200 text-neutral-content'
                }`}
              >
                {i === 0 ? 'Now' : `+${i}`} · {format(time, 'h:mm a')}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-start gap-3 p-3 rounded-xl bg-base-200/50 border border-base-300/50">
        <input
          id="log-initial-dose"
          type="checkbox"
          checked={shouldLogInitialDose}
          onChange={(e) => setShouldLogInitialDose(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-base-300 text-emerald-500 focus:ring-emerald-500/20"
        />
        <div>
          <label htmlFor="log-initial-dose" className="text-sm font-medium text-base-content cursor-pointer">
            Log initial dose now
          </label>
          <p className="text-xs text-neutral-content">
            Records the base dose in your dose history and starts the first reminder timer.
          </p>
        </div>
      </div>
    </>
  )

  if (standalone) {
    return (
      <div className="sm:max-w-[420px]">
        <div className="mb-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <CalendarDays className="h-5 w-5 text-emerald-400" />
            Plan redoses for today
          </h2>
          <p className="text-sm text-neutral-content mt-1">
            Set up a reminder schedule for {substance.name} redoses.
          </p>
        </div>
        <div className="space-y-4 py-2">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
            <p className="text-xs text-neutral-content mb-1">Base dose</p>
            <p className="text-lg font-bold font-mono text-emerald-400">
              {baseAmount} {baseUnit}
            </p>
            <p className="text-xs text-neutral-content">
              {substance.name} · {route}
            </p>
          </div>
          {renderContent()}
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-emerald-400" />
            Plan redoses for today
          </DialogTitle>
          <DialogDescription>
            Set up a reminder schedule for {substance.name} redoses.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
            <p className="text-xs text-neutral-content mb-1">Base dose</p>
            <p className="text-lg font-bold font-mono text-emerald-400">
              {baseAmount} {baseUnit}
            </p>
            <p className="text-xs text-neutral-content">
              {substance.name} · {route}
            </p>
          </div>

          {renderContent()}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleCreatePlan} className="w-full sm:w-auto gap-2">
              <CalendarDays className="h-4 w-4" />
              Create plan
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}