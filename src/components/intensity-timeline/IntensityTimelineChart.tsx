'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { format } from 'date-fns'
import Link from 'next/link'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
} from 'recharts'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Activity, Layers, Loader2, Clock, Timer, ChevronDown, ChevronUp,
  FlaskConical, Pill, Sparkles, Download,
} from 'lucide-react'
import { useDoseStore } from '@/store/dose-store'
import { useReminderStore } from '@/store/reminder-store'
import { substances } from '@/lib/substances/index'
import { classifyDose } from '@/lib/dose-classification'
import { formatDoseAmount } from '@/lib/utils'
import { EstimatedDurationBadge } from '@/components/estimated-duration-badge'
import {
  parseDurationToMinutes,
  calculatePhaseTimings,
  calculateDoseScaledTimings,
  intensityAt,
  phaseNameAt,
  getPhaseStatus,
  combinedIntensityAt,
  formatMinutes,
  formatPhaseName,
  getDoseCategories,
  getPhaseBandRanges,
  phaseStart,
  phaseEnd,
} from '@/components/dose-timeline/dose-timeline-utils'
import {
  phaseColors,
  phaseIcons,
  markerHex,
  ROUTE_PALETTE,
  PHASE_BANDS,
  NOW_INDICATOR,
  ENDED_DOSE_RETENTION_MINS,
} from '@/components/dose-timeline/dose-timeline-constants'
import type {
  EnrichedDose, RouteGroup, SubstanceGroup,
  PhaseTimings, PhaseName,
} from '@/components/dose-timeline/dose-timeline-types'
import type { DoseSeries, ChartDataPoint } from './intensity-timeline-utils'
import {
  safeDate,
  hasIncompletePhases,
  afterglowDurationMins,
  exportChartPng,
  PhaseSparkline,
  scaledIntensityAt,
  categoryHexColor,
  WINDOW_OPTIONS,
  type WindowHours,
  computeGroups,
  buildChartConfig,
} from './intensity-timeline-utils'

// ─── Main Component ────────────────────────────────────────────────────────

export function IntensityTimelineChart() {
  const doses = useDoseStore(s => s.doses)
  const isLoaded = useDoseStore(s => s.isLoaded)

  const [hiddenSubstances, setHiddenSubstances] = useState<Set<string>>(new Set())
  const [selectedRoutes, setSelectedRoutes] = useState<Record<string, string | null>>({})
  const [selectedDoses, setSelectedDoses] = useState<Record<string, string | null>>({})
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)
  // 2.1: window zoom selector. null = auto-fit (show all doses). When set to
  // a number, the chart clamps to [now - hours, now]. This lets users zoom
  // into recent activity instead of seeing a wide auto-fit window.
  const [windowHours, setWindowHours] = useState<WindowHours>(null)
  // Fix 3.2: nowTs is the ONLY thing that changes every 60s. It's passed down
  // as a prop so children can use it for the "now" line position and header
  // badges WITHOUT invalidating their memoized chart-data config.
  const [nowTs, setNowTs] = useState(() => Date.now())

  useEffect(() => {
    setNowTs(Date.now())
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
    const intervalMs = isMobile ? 30_000 : 60_000
    const id = setInterval(() => setNowTs(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [])

  const groups = useMemo(() => computeGroups(doses), [doses, nowTs])

  // Pass through to children as a stable callback. Returns a hex color
  // suitable for inline styles (the old version returned a Tailwind class
  // string which doesn't work as a backgroundColor value).
  const getCategoryColor = useCallback((categories: string[]): string => {
    return categoryHexColor(categories)
  }, [])

  const handleRouteClick = useCallback((groupKey: string, route: string) => {
    setSelectedRoutes(prev => ({
      ...prev,
      [groupKey]: prev[groupKey] === route ? null : route,
    }))
    setSelectedDoses(prev => ({ ...prev, [groupKey]: null }))
  }, [])

  const handleDoseChipClick = useCallback((groupKey: string, doseId: string) => {
    setSelectedDoses(prev => ({
      ...prev,
      [groupKey]: prev[groupKey] === doseId ? null : doseId,
    }))
    setSelectedRoutes(prev => ({ ...prev, [groupKey]: null }))
  }, [])

  if (!isLoaded) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-content" />
          <span className="ml-2 text-sm text-neutral-content">Loading active doses…</span>
        </CardContent>
      </Card>
    )
  }

  if (groups.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-purple-500" />
            Active Timeline
          </CardTitle>
          <CardDescription>No active doses to display</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8 text-neutral-content">
          <Layers className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm">Log a dose to see the intensity timeline</p>
        </CardContent>
      </Card>
    )
  }

  const visibleGroups = groups.filter(g => !hiddenSubstances.has(g.key))

  return (
    <div className="space-y-4">
      {/* Top toolbar: substance toggle chips + window zoom selector */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* Substance toggle chips (when >1 group) */}
        {groups.length > 1 ? (
          <div className="flex items-center gap-1.5 flex-wrap">
            {groups.map(g => {
              const hidden = hiddenSubstances.has(g.key)
              const color = getCategoryColor(g.categories)
              return (
                <button
                  key={g.key}
                  onClick={() => setHiddenSubstances(prev => {
                    const next = new Set(prev)
                    if (next.has(g.key)) next.delete(g.key)
                    else next.add(g.key)
                    return next
                  })}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all ${hidden ? 'opacity-30 border-base-300 line-through' : 'opacity-90 hover:opacity-100'
                    }`}
                  style={{ borderColor: hidden ? undefined : color, color }}
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color, opacity: hidden ? 0.3 : 1 }} />
                  {g.substanceName}
                </button>
              )
            })}
            {hiddenSubstances.size > 0 && (
              <button onClick={() => setHiddenSubstances(new Set())} className="text-[10px] text-neutral-content hover:text-base-content ml-0.5">
                Show all
              </button>
            )}
          </div>
        ) : (
          <div />
        )}

        {/* 2.1: Window zoom selector */}
        <div className="flex items-center gap-0.5 bg-base-200 rounded-lg p-0.5 shrink-0">
          {WINDOW_OPTIONS.map(opt => {
            const isActive = windowHours === opt.hours
            return (
              <button
                key={opt.label}
                onClick={() => setWindowHours(opt.hours)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all ${isActive
                  ? 'bg-primary text-primary-content'
                  : 'text-neutral-content hover:text-base-content hover:bg-base-300/50'
                  }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Per-substance chart cards */}
      {visibleGroups.map(group => (
        <GroupCard
          key={group.key}
          group={group}
          substanceName={group.substanceName}
          getCategoryColor={getCategoryColor}
          selectedRoute={selectedRoutes[group.key] ?? null}
          selectedDose={selectedDoses[group.key] ?? null}
          onRouteClick={(route) => handleRouteClick(group.key, route)}
          onDoseClick={(doseId) => handleDoseChipClick(group.key, doseId)}
          isExpanded={expandedGroup === group.key}
          onToggleExpand={() => setExpandedGroup(prev => prev === group.key ? null : group.key)}
          nowTs={nowTs}
          windowHours={windowHours}
        />
      ))}
    </div>
  )
}

// ─── Per-substance card ────────────────────────────────────────────────────

interface GroupCardProps {
  group: SubstanceGroup
  substanceName: string
  getCategoryColor: (cats: string[]) => string
  selectedRoute: string | null
  selectedDose: string | null
  onRouteClick: (route: string) => void
  onDoseClick: (doseId: string) => void
  isExpanded: boolean
  onToggleExpand: () => void
  /** Current time in ms — passed from parent so the 60s tick re-renders
   *  the now-line / phase badges WITHOUT recomputing chart data. */
  nowTs: number
  /** 2.1: Window zoom override. null = auto-fit. A number = [now - hours, now]. */
  windowHours: WindowHours
}

function GroupCard({
  group, getCategoryColor, selectedRoute, selectedDose,
  onRouteClick, onDoseClick, isExpanded, onToggleExpand, nowTs, windowHours,
}: GroupCardProps) {
  const [isMobile, setIsMobile] = useState(false)
  // mounted gate — prevents ResponsiveContainer from rendering before the
  // browser has computed the parent's layout (which triggers a 0×0 warning).
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Filter visible routes based on isolation
  const visibleRoutes: RouteGroup[] = useMemo(() => {
    if (selectedDose) {
      return group.routes
        .map(rg => ({
          ...rg,
          doses: rg.doses.filter(d => String(d.id ?? d.doseTime.getTime()) === selectedDose),
        }))
        .filter(rg => rg.doses.length > 0)
    }
    if (selectedRoute) {
      return group.routes.filter(r => r.route.toLowerCase() === selectedRoute)
    }
    return group.routes
  }, [group, selectedRoute, selectedDose])

  const sampleCount = isMobile ? 40 : 120
  // 2.1: compute the window override from the zoom selector. When windowHours
  // is set, clamp to [now - hours, now]. The override is memoized separately
  // from the chart config so the config memo only invalidates when the
  // override actually changes (not on every 60s tick).
  const windowOverride = useMemo(() => {
    if (windowHours === null) return null
    const endMs = nowTs
    const startMs = endMs - windowHours * 60 * 60 * 1000
    return { startMs, endMs }
  }, [windowHours, nowTs])

  // Fix 3.2: buildChartConfig is pure — it does NOT depend on nowTs, so this
  // memo is stable across the 60s tick. Only the now-line position (which
  // reads nowTs directly in JSX below) updates every minute.
  // Note: when windowHours is set, the override DOES depend on nowTs (the
  // window slides with time), so the config will recompute on each tick —
  // that's intentional and correct for a "last N hours" view.
  const config = useMemo(
    () => buildChartConfig(group, visibleRoutes, sampleCount, windowOverride),
    [group, visibleRoutes, sampleCount, windowOverride],
  )

  const now = nowTs
  const primaryDose = group.primary
  // Fix 5.1: use the shared getPhaseStatus() instead of a local re-implementation.
  const primaryPhase = getPhaseStatus(primaryDose.doseTime, primaryDose.timings).phase
  const allActive = group.routes.some(rg => rg.doses.some(d => (now - d.doseTime.getTime()) / 60_000 < d.timings.offsetEnd))
  const allEnded = group.routes.every(rg => rg.doses.every(d => (now - d.doseTime.getTime()) / 60_000 >= d.timings.offsetEnd))

  // Combined intensity right now — uses combinedIntensityAt (Fix 1.1) so
  // redosing visually stacks with soft log dampening above 100%, matching
  // the old SVG behaviour. Intensities are dose-height-scaled (Fix 1.2) so
  // a heavy dose contributes more to the combined value than a light one.
  // Display is clamped to 100% — values above 100 from stacking are not
  // shown to avoid confusion (the chart curves themselves also cap at 100).
  const currentCombinedIntensity = useMemo(() => {
    if (!allActive) return null
    const activeDoses = group.routes.flatMap(rg => rg.doses).filter(d => {
      const elapsed = (now - d.doseTime.getTime()) / 60_000
      return elapsed >= 0 && elapsed < d.timings.offsetEnd
    })
    if (activeDoses.length === 0) return null
    const intensities = activeDoses.map(d => scaledIntensityAt(d, now))
    const combined = combinedIntensityAt(intensities)
    return Math.round(Math.min(100, combined))
  }, [group, allActive, now])

  // Remaining time for primary dose
  const primaryRemaining = Math.max(0, primaryDose.timings.offsetEnd - (now - primaryDose.doseTime.getTime()) / 60_000)

  const catColor = getCategoryColor(group.categories)
  const isMultiRoute = group.routes.length > 1
  const totalDoses = group.routes.reduce((s, rg) => s + rg.doses.length, 0)

  // 1.4: check if the primary dose's duration data is incomplete (curve was
  // inferred from partial data — show an "Est. timeline" badge).
  const primaryHasIncompletePhases = hasIncompletePhases(primaryDose.duration)

  // 2.3: cumulative dose counter — total amount + count for today.
  // Only shown when there's more than one dose (single-dose is redundant
  // with the dose chip already shown above).
  const todayCumulative = useMemo(() => {
    const allDoses = group.routes.flatMap(rg => rg.doses)
    if (allDoses.length <= 1) return null
    const todayStr = new Date(now).toISOString().slice(0, 10)
    const todayDoses = allDoses.filter(d => d.timestamp.slice(0, 10) === todayStr)
    if (todayDoses.length === 0) return null
    // Sum amounts only when units are uniform (can't add mg + drops)
    const firstUnit = todayDoses[0].unit
    const uniform = todayDoses.every(d => d.unit === firstUnit)
    const totalAmount = uniform ? todayDoses.reduce((s, d) => s + d.amount, 0) : null
    return {
      count: todayDoses.length,
      totalAmount,
      unit: firstUnit,
    }
  }, [group, now])

  // 2.5: night-hour background bands — 10pm to 6am segments within the chart
  // window. Subtle shaded <ReferenceArea>s give temporal context ("did I dose
  // at 3am?").
  const nightBands = useMemo(() => {
    const bands: Array<{ startMs: number; endMs: number }> = []
    const start = new Date(config.windowStartMs)
    const end = new Date(config.windowEndMs)
    // Walk day-by-day from the window start
    const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    while (cursor.getTime() < end.getTime()) {
      // Night starts at 22:00 of the current day
      const nightStart = new Date(cursor)
      nightStart.setHours(22, 0, 0, 0)
      // Night ends at 06:00 of the next day
      const nightEnd = new Date(cursor)
      nightEnd.setDate(nightEnd.getDate() + 1)
      nightEnd.setHours(6, 0, 0, 0)
      // Clamp to window
      const ms1 = Math.max(nightStart.getTime(), config.windowStartMs)
      const ms2 = Math.min(nightEnd.getTime(), config.windowEndMs)
      if (ms1 < ms2) {
        bands.push({ startMs: ms1, endMs: ms2 })
      }
      cursor.setDate(cursor.getDate() + 1)
    }
    return bands
  }, [config.windowStartMs, config.windowEndMs])

  // 2.8: predictive projection — if a reminder schedule exists for this
  // substance, show a faded projected curve segment for the next scheduled
  // dose. Reads from the reminder store.
  const reminderSchedules = useReminderStore(s => s.schedules)
  const projectionSeries = useMemo(() => {
    if (!allActive) return null
    // Find a schedule for this substance
    const schedule = reminderSchedules.find(
      s => s.enabled && s.substanceName.toLowerCase() === group.substanceName.toLowerCase(),
    )
    if (!schedule) return null
    // Project the next dose at: last dose time + interval
    const lastDose = group.routes.flatMap(rg => rg.doses).reduce((latest, d) =>
      d.doseTime.getTime() > latest.doseTime.getTime() ? d : latest,
      group.routes[0].doses[0])
    const nextDoseTs = lastDose.doseTime.getTime() + schedule.intervalMinutes * 60_000
    if (nextDoseTs <= now || nextDoseTs > config.windowEndMs) return null
    // Use the last dose's timings as a template for the projected curve
    return {
      ts: nextDoseTs,
      dose: lastDose,
    }
  }, [reminderSchedules, group, allActive, now, config.windowEndMs])

  const PhaseIcon = phaseIcons[primaryPhase] || phaseIcons['onset']

  return (
    <Card>
      <CardHeader className="pb-2">
        {/* Header row */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: catColor }} />
            <h3 className="font-semibold text-base">
              <Link href={`/?substance=${group.substanceName}`} prefetch={false} className="hover:underline underline-offset-4">
                {group.substanceName}
              </Link>
            </h3>
            <Badge variant="outline" className={`${phaseColors[primaryPhase]?.border || ''} ${phaseColors[primaryPhase]?.text || ''} text-[10px] px-1.5 py-0`}>
              <PhaseIcon className="h-3 w-3 mr-0.5" />
              {formatPhaseName(primaryPhase)}
            </Badge>
            {/* 1.4: Estimated-duration badge — shown when the primary dose's
                duration data is incomplete (curve was inferred). */}
            {primaryHasIncompletePhases && (
              <EstimatedDurationBadge sourceRoute={primaryDose.durationSourceRoute} />
            )}
            {allActive && currentCombinedIntensity !== null && (
              <Badge variant="outline" className="text-xs font-mono">
                <Activity className="h-3 w-3 mr-1 text-purple-400" />
                {currentCombinedIntensity}%
              </Badge>
            )}
            {/* 2.3: Cumulative dose counter for today — e.g. "120mg today · 3" */}
            {todayCumulative && (
              <Badge variant="outline" className="text-[10px] font-mono">
                <Pill className="h-3 w-3 mr-0.5 text-blue-400" />
                {todayCumulative.totalAmount !== null
                  ? `${todayCumulative.totalAmount}${todayCumulative.unit} · ${todayCumulative.count} today`
                  : `${todayCumulative.count} today`}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {allActive && primaryRemaining > 0 && (
              <span className="text-xs text-neutral-content flex items-center gap-1">
                <Timer className="h-3 w-3" />
                {formatMinutes(primaryRemaining)} remaining
              </span>
            )}
            {allEnded && (
              <span className="text-xs text-neutral-content/60 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Ended
              </span>
            )}
          </div>
        </div>

        {/* Route pills */}
        {isMultiRoute && (
          <div className="flex items-center gap-1.5 flex-wrap mt-1">
            <span className="text-[10px] text-neutral-content mr-1">Routes:</span>
            {group.routes.map(rg => {
              const palette = ROUTE_PALETTE[rg.paletteIndex % ROUTE_PALETTE.length]
              const isSelected = selectedRoute === rg.route.toLowerCase()
              return (
                <button
                  key={rg.route}
                  onClick={() => onRouteClick(rg.route.toLowerCase())}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all ${isSelected ? 'ring-1 ring-offset-1 ring-offset-background' : 'opacity-60 hover:opacity-100'}`}
                  style={{ borderColor: palette.stroke, color: palette.stroke }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: palette.fill }} />
                  {rg.route}
                </button>
              )
            })}
            {selectedRoute && (
              <button onClick={() => onRouteClick(selectedRoute)} className="text-[10px] text-neutral-content hover:text-base-content ml-1">
                Show all
              </button>
            )}
          </div>
        )}

        {/* Dose chips */}
        <div className="flex items-center gap-1.5 flex-wrap mt-1">
          {group.routes.map(rg => {
            const palette = ROUTE_PALETTE[rg.paletteIndex % ROUTE_PALETTE.length]
            return rg.doses.map(d => {
              const doseId = String(d.id ?? d.doseTime.getTime())
              const isIsolated = selectedDose === doseId
              const formatted = formatDoseAmount(d.amount, d.unit)
              const elapsed = (now - d.doseTime.getTime()) / 60_000
              const isDoseActive = elapsed >= 0 && elapsed < d.timings.offsetEnd
              const isDoseEnded = elapsed >= d.timings.offsetEnd
              const doseProgress = (elapsed / d.timings.totalDuration) * 100
              return (
                <button
                  key={`${rg.route}-${doseId}`}
                  onClick={() => onDoseClick(doseId)}
                  className={`relative inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border transition-all overflow-hidden ${isIsolated
                    ? 'ring-2 ring-purple-500/50 border-purple-500/50 bg-purple-500/10'
                    : isDoseEnded
                      ? 'border-base-300/50 opacity-50'
                      : 'border-base-300 hover:border-base-300/80'
                    }`}
                  style={{ color: palette.stroke }}
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: palette.fill, opacity: isDoseActive ? 1 : 0.4 }} />
                  <span>{formatted.amount} {formatted.unit}</span>
                  <span className="text-neutral-content">{rg.route}</span>
                  {isDoseActive && (
                    <div className="absolute bottom-0 left-0 h-0.5 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, doseProgress))}%`, background: palette.stroke, opacity: 0.6 }} />
                  )}
                </button>
              )
            })
          })}
          {selectedDose && (
            <button onClick={() => onDoseClick(selectedDose)} className="text-[10px] text-neutral-content hover:text-base-content ml-1">
              Show all
            </button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* 2.4: Mobile phase strip — a compact at-a-glance bar showing the 4
            phases (onset/comeup/peak/offset) with proportional widths and a
            "now" marker. Only shown on mobile, above the full chart. Gives a
            quick "which phase am I in" read without needing to parse the chart. */}
        {isMobile && allActive && (
          <MobilePhaseStrip
            group={group}
            nowTs={nowTs}
            windowStartMs={config.windowStartMs}
            windowEndMs={config.windowEndMs}
          />
        )}

        {/* Phase labels row — 2-row greedy collision resolution (3.5).
            Labels that would overlap on row 0 get bumped to row 1. */}
        <div className="relative h-6 mb-0.5">
          {(() => {
            // Build label specs: { leftPct, widthPct, midPct, name, color }
            const labels = config.phaseBands.map(band => {
              const pb = PHASE_BANDS.find(b => b.phase === band.phase)
              if (!pb) return null
              const startPct = ((band.startMs - config.windowStartMs) / (config.windowEndMs - config.windowStartMs)) * 100
              const endPct = ((band.endMs - config.windowStartMs) / (config.windowEndMs - config.windowStartMs)) * 100
              const midPct = (startPct + endPct) / 2
              const widthPct = endPct - startPct
              if (widthPct < 4) return null // too narrow to label
              return { midPct, widthPct, name: pb.name, color: pb.labelColor, phase: band.phase }
            }).filter(Boolean) as Array<{ midPct: number; widthPct: number; name: string; color: string; phase: PhaseName }>

            // Estimate label width as a percentage of the container width.
            // ~0.7% per character at 9px font in a typical chart width.
            const CHAR_W_PCT = 0.7
            const LABEL_GAP_PCT = 1.5 // minimum gap between adjacent labels

            // Greedy 2-row placement
            const rowEnds = [-Infinity, -Infinity] // right edge of last label on each row
            return labels.map(l => {
              const labelW = l.name.length * CHAR_W_PCT
              const leftEdge = l.midPct - labelW / 2
              // Pick the first row where the label doesn't collide
              let row = 0
              if (leftEdge < rowEnds[0] + LABEL_GAP_PCT) row = 1
              // If row 1 also collides, push the label right (clamp)
              let adjustedLeft = leftEdge
              if (leftEdge < rowEnds[row] + LABEL_GAP_PCT) {
                adjustedLeft = rowEnds[row] + LABEL_GAP_PCT
              }
              rowEnds[row] = adjustedLeft + labelW
              return { ...l, leftPct: adjustedLeft + labelW / 2, row }
            }).map(l => (
              <span
                key={l.phase}
                className="absolute text-[9px] font-medium -translate-x-1/2"
                style={{
                  left: `${l.leftPct}%`,
                  top: `${l.row * 11}px`,
                  color: l.color,
                  opacity: 0.75,
                }}
              >
                {l.name}
              </span>
            ))
          })()}
        </div>

        {/* Recharts chart — deferred until mounted to avoid the 0×0
            ResponsiveContainer warning on first paint.
            Wrapped in a relative container so we can overlay dose markers
            (4.1) and the pulsing now-dot (4.2) positioned by percentage. */}
        <div className="relative">
          {/* 4.1: Dose start markers — small downward triangles below the
              chart at each dose's start time. Positioned to match the chart's
              plot area (accounting for Y-axis width + left margin offset).
              Only shown for doses whose start time falls within the window. */}
          {mounted && config.series.map(s => {
            const doseStartMs = s.dose.doseTime.getTime()
            if (doseStartMs < config.windowStartMs || doseStartMs > config.windowEndMs) return null
            // The chart's plot area is offset from the container by:
            //   left = YAxisWidth(32) + leftMargin(-12) = 20px
            //   right = containerWidth - rightMargin(8)
            // So plotAreaWidth = 100% - 20px - 8px = 100% - 28px
            // Position = plotAreaLeft + pct * plotAreaWidth
            //          = 20px + (pct/100) * (100% - 28px)
            const pct = ((doseStartMs - config.windowStartMs) / (config.windowEndMs - config.windowStartMs)) * 100
            return (
              <div
                key={`dose-marker-${s.dataKey}`}
                className="absolute pointer-events-none z-10"
                style={{
                  left: `calc(20px + ${pct / 100} * (100% - 28px))`,
                  bottom: 0,
                  transform: 'translateX(-50%)',
                }}
                title={`${s.dose.substanceName} ${formatDoseAmount(s.dose.amount, s.dose.unit).amount}${formatDoseAmount(s.dose.amount, s.dose.unit).unit} · ${format(new Date(doseStartMs), 'h:mm a')}`}
              >
                {/* Downward triangle */}
                <div
                  className="w-0 h-0"
                  style={{
                    borderLeft: '4px solid transparent',
                    borderRight: '4px solid transparent',
                    borderTop: `5px solid ${s.palette.stroke}`,
                    opacity: 0.8,
                  }}
                />
              </div>
            )
          })}

          {/* Chart container — tabIndex + onKeyDown enable keyboard navigation (1.7).
              Arrow Left/Right move the tooltip, Escape clears it. */}
          <div
            style={{ width: '100%', height: isMobile ? 200 : 280 }}
            tabIndex={0}
            role="application"
            aria-label={`Intensity timeline chart for ${group.substanceName}. Use arrow keys to navigate, Escape to clear.`}
            onKeyDown={(e) => {
              // 1.7: Keyboard navigation — dispatch synthetic mousemove events
              // to move Recharts' tooltip. Finds the chart's <svg> and computes
              // a new X based on the current cursor position (or center on first press).
              const svg = e.currentTarget.querySelector('svg.recharts-surface')
              if (!svg) return
              const rect = svg.getBoundingClientRect()
              // Track current cursor X on the element (fallback to center)
              const currentX = (svg as any).__cursorX ?? rect.width / 2
              if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault()
                const step = rect.width * 0.03 // 3% per press
                const nextX = Math.max(0, Math.min(rect.width, currentX + (e.key === 'ArrowRight' ? step : -step)))
                  ; (svg as any).__cursorX = nextX
                // Dispatch synthetic mousemove
                const mouseEvent = new MouseEvent('mousemove', {
                  bubbles: true,
                  clientX: rect.left + nextX,
                  clientY: rect.top + rect.height / 2,
                })
                svg.dispatchEvent(mouseEvent)
              } else if (e.key === 'Escape') {
                e.preventDefault()
                // Dispatch mouseout to clear the tooltip
                svg.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))
                  ; (svg as any).__cursorX = undefined
              }
            }}
            onMouseMove={(e) => {
              // Track cursor X for keyboard nav + 2.6 hover-snap
              const svg = e.currentTarget.querySelector('svg.recharts-surface')
              if (!svg) return
              const rect = svg.getBoundingClientRect()
              const x = e.clientX - rect.left
                ; (svg as any).__cursorX = x

              // 2.6: Hover-snap to dose events — if the cursor is within ~5% of
              // a dose start time, snap the tooltip to that dose's exact start.
              // Implemented by finding the nearest dose start and, if close
              // enough, dispatching a synthetic mousemove at that X.
              const snapThresholdPx = rect.width * 0.03 // 3% of chart width
              let nearestDoseX: number | null = null
              let nearestDist = Infinity
              for (const s of config.series) {
                const doseStartMs = s.dose.doseTime.getTime()
                if (doseStartMs < config.windowStartMs || doseStartMs > config.windowEndMs) continue
                const dosePct = (doseStartMs - config.windowStartMs) / (config.windowEndMs - config.windowStartMs)
                const doseX = dosePct * rect.width
                const dist = Math.abs(doseX - x)
                if (dist < nearestDist) {
                  nearestDist = dist
                  nearestDoseX = doseX
                }
              }
              if (nearestDoseX !== null && nearestDist < snapThresholdPx && Math.abs(nearestDoseX - x) > 1) {
                // Snap — dispatch a synthetic mousemove at the dose start X.
                // Only do this if we're not already very close (avoids infinite loops).
                svg.dispatchEvent(new MouseEvent('mousemove', {
                  bubbles: true,
                  clientX: rect.left + nearestDoseX,
                  clientY: e.clientY,
                }))
              }
            }}
          >
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={config.data} margin={{ top: 4, right: 8, left: -12, bottom: 4 }}>
                  <defs>
                    {config.series.map((s, i) => (
                      <linearGradient key={`grad-${i}`} id={`grad-${group.key}-${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={s.palette.fill} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={s.palette.fill} stopOpacity={0.02} />
                      </linearGradient>
                    ))}
                    {/* 4.5: Chart background gradient */}
                    <linearGradient id={`bg-grad-${group.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(255,255,255,0.02)" />
                      <stop offset="100%" stopColor="rgba(0,0,0,0.15)" />
                    </linearGradient>
                  </defs>

                  {/* 4.5: background fill */}
                  <rect x={0} y={0} width="100%" height="100%" fill={`url(#bg-grad-${group.key})`} fillOpacity={0.5} />

                  {/* Phase band backgrounds */}
                  {config.phaseBands.map(band => {
                    const pb = PHASE_BANDS.find(b => b.phase === band.phase)
                    if (!pb) return null
                    return (
                      <ReferenceArea
                        key={`band-${band.phase}`}
                        x1={band.startMs}
                        x2={band.endMs}
                        strokeOpacity={0}
                        fill={pb.fill}
                        fillOpacity={0.06}
                      />
                    )
                  })}

                  {/* 2.5: Night-hour background bands (10pm–6am) */}
                  {nightBands.map((nb, i) => (
                    <ReferenceArea
                      key={`night-${i}`}
                      x1={nb.startMs}
                      x2={nb.endMs}
                      strokeOpacity={0}
                      fill="#1e293b"
                      fillOpacity={0.15}
                    />
                  ))}

                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="t"
                    type="number"
                    domain={[config.windowStartMs, config.windowEndMs]}
                    scale="time"
                    tick={{ fontSize: 10, fill: 'currentColor' }}
                    stroke="currentColor"
                    tickFormatter={(ts) => format(new Date(ts), 'h:mm a')}
                    minTickGap={40}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: 'currentColor' }}
                    stroke="currentColor"
                    width={32}
                    tickFormatter={(v) => `${v}%`}
                    label={{ value: 'Intensity', angle: -90, position: 'insideLeft', fontSize: 9, fill: 'currentColor', opacity: 0.6, dy: 20 }}
                  />
                  <Tooltip
                    content={<ChartTooltip series={config.series} windowStartMs={config.windowStartMs} nowTs={nowTs} />}
                    cursor={{ stroke: 'rgba(255,255,255,0.3)', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />

                  {/* Now indicator — position comes from nowTs prop, NOT from
                  config (which is memoized and stable across ticks).
                  The pulsing dot is rendered as a custom SVG label inside
                  the ReferenceLine so it's in the same coordinate space as
                  the dashed line (guarantees perfect horizontal alignment).
                  Uses SVG <animate> instead of CSS (4.2). */}
                  {nowTs >= config.windowStartMs && nowTs <= config.windowEndMs && (
                    <ReferenceLine
                      x={nowTs}
                      stroke={NOW_INDICATOR.color}
                      strokeWidth={NOW_INDICATOR.strokeWidth}
                      strokeDasharray={NOW_INDICATOR.dashArray}
                      label={(props: { viewBox?: { x?: number; y?: number } }) => {
                        // Render the "NOW" text + a pulsing SVG circle at the top
                        // of the line. props.viewBox.x is the exact SVG x-coordinate
                        // of the line, so the dot is always centered on it.
                        const cx = props.viewBox?.x ?? 0
                        const cy = 4 // near the top of the chart
                        return (
                          <g>
                            <text
                              x={cx}
                              y={cy - 6}
                              textAnchor="middle"
                              fontSize={8}
                              fill={NOW_INDICATOR.color}
                              opacity={0.8}
                            >
                              NOW
                            </text>
                            <circle cx={cx} cy={cy} r={NOW_INDICATOR.dotRadius} fill={NOW_INDICATOR.color}>
                              <animate
                                attributeName="opacity"
                                values="1;0.3;1"
                                dur={`${NOW_INDICATOR.pulseDurationMs}ms`}
                                repeatCount="indefinite"
                              />
                              <animate
                                attributeName="r"
                                values={`${NOW_INDICATOR.dotRadius};${NOW_INDICATOR.dotRadius * 0.7};${NOW_INDICATOR.dotRadius}`}
                                dur={`${NOW_INDICATOR.pulseDurationMs}ms`}
                                repeatCount="indefinite"
                              />
                            </circle>
                          </g>
                        )
                      }}
                    />
                  )}

                  {/* One Area per dose. isEnded is computed fresh from nowTs so
                  ended doses fade out without re-sampling the chart data.
                  4.4: ended doses get a dashed stroke + reduced opacity to
                  make "this is over" more obvious.
                  dot=false + activeDot=false ensures Recharts doesn't render
                  default dots at data points (which would look like stray
                  markers at curve peaks and start/end points). */}
                  {config.series.map((s, i) => {
                    const doseEnded = (nowTs - s.dose.doseTime.getTime()) / 60_000 >= s.dose.timings.offsetEnd
                    return (
                      <Area
                        key={s.dataKey}
                        type="monotone"
                        dataKey={s.dataKey}
                        stroke={s.palette.stroke}
                        strokeWidth={i === 0 ? 2.5 : 1.5}
                        strokeDasharray={doseEnded ? '4 4' : undefined}
                        fill={`url(#grad-${group.key}-${i})`}
                        opacity={doseEnded ? 0.4 : 1}
                        isAnimationActive={false}
                        connectNulls
                        dot={false}
                        activeDot={false}
                      />
                    )
                  })}

                  {/* 2.8: Predictive projection — a faded dashed line showing where
                  the next scheduled dose's curve would fall, based on the
                  reminder schedule. Only renders if a schedule exists and the
                  projected dose time is within the chart window. Rendered as
                  a ReferenceLine at the projected dose time (simpler than
                  sampling a full curve). */}
                  {projectionSeries && (
                    <ReferenceLine
                      x={projectionSeries.ts}
                      stroke={ROUTE_PALETTE[0].stroke}
                      strokeWidth={1}
                      strokeDasharray="2 4"
                      opacity={0.4}
                      label={{ value: 'Next?', fontSize: 8, fill: ROUTE_PALETTE[0].stroke, position: 'top', opacity: 0.6 }}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-[10px] text-neutral-content mt-2 gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span>
              {visibleRoutes.length} route{visibleRoutes.length !== 1 ? 's' : ''} · {totalDoses} dose{totalDoses !== 1 ? 's' : ''}
            </span>
            {/* 4.3: Chart-native route legend — colored dots + route names.
                Only shown when multi-route (single-route is self-evident). */}
            {isMultiRoute && (
              <span className="flex items-center gap-1.5">
                {group.routes.map(rg => {
                  const palette = ROUTE_PALETTE[rg.paletteIndex % ROUTE_PALETTE.length]
                  return (
                    <span key={rg.route} className="inline-flex items-center gap-0.5">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: palette.fill }} />
                      <span className="capitalize">{rg.route}</span>
                    </span>
                  )
                })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* 2.7: Export chart as PNG */}
            <button
              onClick={() => exportChartPng(group.key, group.substanceName)}
              className="flex items-center gap-1 hover:text-base-content transition-colors"
              title="Download chart as PNG"
            >
              <Download className="h-3 w-3" />
            </button>
            <button onClick={onToggleExpand} className="flex items-center gap-1 hover:text-base-content transition-colors">
              {isExpanded ? (
                <><ChevronUp className="h-3 w-3" /> Less</>
              ) : (
                <><ChevronDown className="h-3 w-3" /> Phase details</>
              )}
            </button>
          </div>
        </div>

        {/* Expanded phase details */}
        {isExpanded && (
          <div className="mt-3 space-y-3 pt-3 border-t border-base-300/50">
            {visibleRoutes.map(rg => {
              const palette = ROUTE_PALETTE[rg.paletteIndex % ROUTE_PALETTE.length]
              return (
                <div key={rg.route} className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: palette.fill }} />
                    <span className="text-xs font-medium capitalize">{rg.route}</span>
                    {rg.uniformUnit && (
                      <span className="text-[10px] text-neutral-content">{rg.totalAmount}{rg.unit} total</span>
                    )}
                  </div>
                  {rg.doses.map(d => {
                    const doseId = String(d.id ?? d.doseTime.getTime())
                    const cPhase = getPhaseStatus(d.doseTime, d.timings).phase
                    const CPhaseIcon = phaseIcons[cPhase] || phaseIcons['onset']
                    const phases = [
                      { key: 'onset', end: d.timings.onsetEnd },
                      { key: 'comeup', end: d.timings.comeupEnd },
                      { key: 'peak', end: d.timings.peakEnd },
                      { key: 'offset', end: d.timings.offsetEnd },
                    ] as const
                    const phaseOrder = ['onset', 'comeup', 'peak', 'offset']
                    const currentIdx = phaseOrder.indexOf(cPhase)
                    const fmt = formatDoseAmount(d.amount, d.unit)
                    // 1.5: afterglow duration for the badge
                    const afterglowMins = afterglowDurationMins(d)
                    return (
                      <div key={doseId} className="ml-4 space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] text-neutral-content flex-wrap">
                          <span className="font-medium text-base-content">{fmt.amount} {fmt.unit}</span>
                          <span>·</span>
                          <span>{format(d.doseTime, 'h:mm a')}</span>
                          <span className={`inline-flex items-center gap-0.5 ${phaseColors[cPhase]?.text || ''}`}>
                            <CPhaseIcon className="h-3 w-3" />
                            {formatPhaseName(cPhase)}
                          </span>
                          {/* 1.5: Afterglow badge */}
                          {afterglowMins > 0 && (
                            <span className="inline-flex items-center gap-0.5 px-1 py-0 rounded text-[9px] bg-amber-500/20 text-amber-600 dark:text-amber-400">
                              <Sparkles className="h-2.5 w-2.5" />
                              {formatMinutes(afterglowMins)} afterglow
                            </span>
                          )}
                        </div>
                        {phases.map((p, pi) => {
                          const start = pi === 0 ? 0 : phases[pi - 1].end
                          const duration = Math.max(0, Math.round(p.end - start))
                          const isActive = cPhase === p.key
                          const isPast = cPhase !== 'not_started' && cPhase !== 'ended' ? currentIdx > pi : false
                          const phaseEndProgress = (p.end / d.timings.totalDuration) * 100
                          // Fix 1.2: scale phase-peak intensity by doseHeight so a heavy
                          // dose's peak phase shows >100% (matching the chart curve).
                          const phasePeakIntensity = Math.min(100, intensityAt(phaseEndProgress, d.timings) * d.doseHeight)
                          const PIcon = phaseIcons[p.key as PhaseName]
                          const pc = phaseColors[p.key as PhaseName]
                          return (
                            <div
                              key={p.key}
                              className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-all ${isActive ? 'ring-1 ring-purple-500/30 bg-purple-500/5' : isPast ? 'opacity-50' : 'opacity-30'
                                }`}
                            >
                              <PIcon className={`h-3.5 w-3.5 shrink-0 ${pc.text}`} />
                              <span className={`font-medium w-16 ${pc.text}`}>{formatPhaseName(p.key as PhaseName)}</span>
                              <span className="text-[10px] text-neutral-content">({formatMinutes(duration)})</span>
                              {/* 1.6: Mini sparkline showing the intensity curve shape for this phase */}
                              <PhaseSparkline dose={d} phase={p.key as PhaseName} />
                              <div className="flex-1 h-1 bg-base-200/50 rounded-full overflow-hidden max-w-[60px]">
                                <div className="h-full rounded-full transition-all" style={{ width: `${Math.round(phasePeakIntensity)}%`, backgroundColor: palette.fill, opacity: isActive ? 0.8 : 0.3 }} />
                              </div>
                              <span className="text-[10px] font-mono text-neutral-content w-8 text-right">{Math.round(phasePeakIntensity)}%</span>
                              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Mobile Phase Strip (2.4) ──────────────────────────────────────────────

interface MobilePhaseStripProps {
  group: SubstanceGroup
  nowTs: number
  windowStartMs: number
  windowEndMs: number
}

/**
 * Compact at-a-glance phase bar for mobile.
 *
 * Shows the 4 phases (onset/comeup/peak/offset) of the primary dose as
 * proportional colored segments, with a "now" marker showing where in the
 * timeline the user currently is. This gives a quick "which phase am I in"
 * read without needing to parse the full Recharts chart below it.
 *
 * Inspired by the old MobilePhaseBar's PhaseProgressBar, but simpler —
 * just the phase strip + now marker, no SVG curves (those are in the
 * Recharts chart below).
 */
function MobilePhaseStrip({ group, nowTs, windowStartMs, windowEndMs }: MobilePhaseStripProps) {
  const primaryDose = group.primary
  const { timings } = primaryDose
  const doseStartMs = primaryDose.doseTime.getTime()

  // Compute the "now" position as a percentage of the dose's total duration
  const elapsedMins = (nowTs - doseStartMs) / 60_000
  const nowPct = (elapsedMins / timings.totalDuration) * 100

  // Only show the strip if "now" is within the dose's active range
  if (nowPct < 0 || nowPct > 100) return null

  // Phase segments with proportional widths
  const phases = [
    { key: 'onset' as const, end: timings.onsetEnd, color: phaseColors.onset.bar },
    { key: 'comeup' as const, end: timings.comeupEnd, color: phaseColors.comeup.bar },
    { key: 'peak' as const, end: timings.peakEnd, color: phaseColors.peak.bar },
    { key: 'offset' as const, end: timings.offsetEnd, color: phaseColors.offset.bar },
  ]

  // Current phase for the label
  const currentPhase = getPhaseStatus(primaryDose.doseTime, timings).phase
  const remaining = Math.max(0, timings.offsetEnd - elapsedMins)

  return (
    <div className="mb-3">
      {/* Phase label + remaining time */}
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs font-medium ${phaseColors[currentPhase]?.text || ''}`}>
          {formatPhaseName(currentPhase)}
        </span>
        {remaining > 0 && (
          <span className="text-[10px] text-neutral-content flex items-center gap-0.5">
            <Timer className="h-2.5 w-2.5" />
            {formatMinutes(remaining)} left
          </span>
        )}
      </div>

      {/* Phase segments */}
      <div className="relative h-2 rounded-full overflow-hidden bg-base-200">
        {phases.map((p, i) => {
          const startPct = i === 0 ? 0 : (phases[i - 1].end / timings.totalDuration) * 100
          const endPct = (p.end / timings.totalDuration) * 100
          const widthPct = endPct - startPct
          if (widthPct <= 0) return null
          return (
            <div
              key={p.key}
              className="absolute top-0 h-full rounded-full transition-all duration-300"
              style={{
                left: `${startPct}%`,
                width: `${widthPct}%`,
                backgroundColor: p.color,
              }}
            />
          )
        })}

        {/* "Now" marker — vertical line + dot */}
        <div
          className="absolute top-0 bottom-0 w-px pointer-events-none"
          style={{
            left: `${nowPct}%`,
            transform: 'translateX(-50%)',
            backgroundColor: NOW_INDICATOR.color,
            opacity: 0.8,
          }}
        >
          <div
            className="absolute -top-1 w-2 h-2 rounded-full border-2"
            style={{
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: NOW_INDICATOR.color,
              borderColor: NOW_INDICATOR.color,
            }}
          />
        </div>
      </div>

      {/* Legend: 4 phase dots */}
      <div className="flex items-center justify-between text-[10px] text-neutral-content mt-1">
        {phases.map((p, i) => (
          <span key={p.key} className="flex items-center gap-1" style={{ color: p.color }}>
            <span className="w-1.5 h-1.5 rounded-full" />
            {PHASE_BANDS.find(b => b.phase === p.key)?.name}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Tooltip Component ────────────────────────────────────────────────────

interface ChartTooltipProps {
  series: DoseSeries[]
  windowStartMs: number
  nowTs: number
}

function ChartTooltip({ series, windowStartMs, nowTs }: ChartTooltipProps) {
  const [activePayload, setActivePayload] = useState<Array<{ dataKey: string; value: number; payload: ChartDataPoint }>>([])
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)

  if (!activePayload.length) return null

  // Find the hovered time from the first active payload's payload
  const t = activePayload[0]?.payload?.t ?? nowTs
  const timeStr = format(new Date(t), 'h:mm:ss a')

  // Collect active doses at this timestamp
  const activeSeries = series.filter(s => {
    const elapsed = (t - s.dose.doseTime.getTime()) / 60_000
    return elapsed >= 0 && elapsed < s.dose.timings.offsetEnd
  })

  return (
    <div className="bg-base-100/95 backdrop-blur-sm border border-base-300 rounded-lg shadow-lg p-3 min-w-[200px]">
      <div className="mb-2 flex items-center gap-2">
        <Clock className="h-4 w-4 text-neutral-content/60" />
        <span className="font-mono text-sm text-base-content">{timeStr}</span>
      </div>
      <div className="space-y-1.5">
        {activeSeries.map(s => {
          const elapsedMins = (t - s.dose.doseTime.getTime()) / 60_000
          const phase = getPhaseStatus(s.dose.doseTime, s.dose.timings).phase
          const PhaseIcon = phaseIcons[phase] || phaseIcons['onset']
          const pct = scaledIntensityAt(s.dose, t)
          const palette = s.palette
          return (
            <div key={s.dataKey} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: palette.fill }} />
              <span className="text-xs text-base-content">{s.dose.substanceName}</span>
              <span className="text-[10px] text-neutral-content">{format(s.dose.doseTime, 'h:mm a')}</span>
              <span className={`flex items-center gap-0.5 text-[10px] ${phaseColors[phase]?.text || ''}`}>
                <PhaseIcon className="h-3 w-3" />
                {formatPhaseName(phase)}
              </span>
              <span className="ml-auto font-mono font-medium text-sm text-base-content">{Math.round(pct)}%</span>
            </div>
          )
        })}
        {activeSeries.length === 0 && (
          <div className="text-xs text-neutral-content">No active doses at this time</div>
        )}
      </div>
    </div>
  )
}