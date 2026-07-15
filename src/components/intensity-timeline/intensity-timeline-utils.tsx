'use client'

import { format } from 'date-fns'
import { phaseColors, phaseIcons, PHASE_BANDS, ENDED_DOSE_RETENTION_MINS, ROUTE_PALETTE, NOW_INDICATOR } from '@/components/dose-timeline/dose-timeline-constants'
import type { EnrichedDose, PhaseName, RouteGroup, SubstanceGroup } from '@/components/dose-timeline/dose-timeline-types'
import { parseDurationToMinutes, calculatePhaseTimings, calculateDoseScaledTimings, intensityAt, phaseNameAt, getPhaseStatus, combinedIntensityAt, formatMinutes, formatPhaseName, phaseStart, phaseEnd, getPhaseBandRanges, getDoseCategories } from '@/components/dose-timeline/dose-timeline-utils'
import { classifyDose } from '@/lib/dose-classification'
import { formatDoseAmount } from '@/lib/utils'
import type { Substance } from '@/lib/substances/types'
import { substances } from '@/lib/substances/index'

// ─── Category → hex color map ──────────────────────────────────────────────
// The Tailwind `categoryColors` from `@/lib/categories` returns class strings
// (e.g. "text-amber-500 bg-amber-500/10 border-amber-500/20") which can't be
// used as inline `style={{ backgroundColor }}` values. This hex map is used
// wherever we need a real color value (header dots, substance toggle chips).

const CATEGORY_HEX_COLORS: Record<string, string> = {
  stimulants: '#f59e0b', // amber-500
  depressants: '#6366f1', // indigo-500
  hallucinogens: '#a855f7', // purple-500
  dissociatives: '#06b6d4', // cyan-500
  empathogens: '#ec4899', // pink-500
  cannabinoids: '#22c55e', // green-500
  opioids: '#ef4444', // red-500
  deliriants: '#64748b', // slate-500
  nootropics: '#14b8a6', // teal-500
  other: '#71717a', // zinc-500
  medications: '#10b981', // emerald-500
}

/** Resolve a substance's primary category to a hex color for inline styles. */
export function categoryHexColor(categories: string[]): string {
  if (categories.length === 0) return '#71717a' // zinc-500 fallback
  return CATEGORY_HEX_COLORS[categories[0]] ?? '#71717a'
}

// ─── Substance lookup map (module-level — built once, not per-render) ──────
// Fix 3.1: hoisted out of computeGroups so it isn't rebuilt on every dose change.

const SUBSTANCE_BY_NAME: Map<string, Substance> = (() => {
  const map = new Map<string, Substance>()
  for (const s of substances) {
    map.set(s.name.toLowerCase(), s)
  }
  return map
})()

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ChartDataPoint {
  t: number // timestamp in ms
  [doseKey: string]: number
}

export interface DoseSeries {
  dose: EnrichedDose
  route: RouteGroup
  dataKey: string
  palette: { stroke: string; fill: string }
  isEnded: boolean
  /** Dose-relative height = userDose / avgCommonDose. Curves are scaled by
   *  this so heavier doses visually tower over lighter ones. */
  doseHeight: number
}

export interface PhaseBandConfig {
  phase: PhaseName
  startMs: number
  endMs: number
}

export interface ChartConfig {
  data: ChartDataPoint[]
  series: DoseSeries[]
  phaseBands: PhaseBandConfig[]
  windowStartMs: number
  windowEndMs: number
}

/** Compute the dose-height-scaled intensity (0–100, clamped) for a single
 *  dose at a given timestamp. Used by the chart sampler, the tooltip, and
 *  the header combined-intensity badge so they all agree on the same value.
 *
 *  Fix 1.2: multiplies raw intensityAt() by doseHeight (userDose / avgCommon).
 *  Fix 5.2: edge fade removed — it was an SVG rendering nicety that caused
 *  the tooltip's reported intensity to disagree with the conceptual model.
 *  Recharts renders smooth area fills, so the fade isn't needed.
 */
export function scaledIntensityAt(dose: EnrichedDose, t: number): number {
  const elapsedMins = (t - dose.doseTime.getTime()) / 60_000
  if (elapsedMins < 0 || elapsedMins > dose.timings.totalDuration) return 0
  const progress = (elapsedMins / dose.timings.totalDuration) * 100
  // Dose-height scaling — heavier doses rise above 100 (visual cue),
  // but clamp the *visible curve* at 100 so it stays in the chart bounds.
  const val = intensityAt(progress, dose.timings) * dose.doseHeight
  return Math.max(0, Math.min(100, val))
}

// ─── Helpers ───────────────────────────────────────────────────────────────

export function safeDate(s: string): Date {
  const d = new Date(s)
  return isNaN(d.getTime()) ? new Date(0) : d
}

/** Check if a dose's duration data is incomplete (has onset + total but is
 *  missing comeup/peak/offset). When true, the timeline curve was inferred
 *  from partial data and an "Est. timeline" badge is shown. (1.4) */
export function hasIncompletePhases(
  duration: { onset?: string; comeup?: string; peak?: string; offset?: string; total?: string } | null | undefined,
): boolean {
  if (!duration) return false
  const hasOnset = duration.onset && duration.onset.trim() !== '' && duration.onset !== '—'
  const hasTotal = duration.total && duration.total.trim() !== '' && duration.total !== '—'
  const hasComeup = duration.comeup && duration.comeup.trim() !== '' && duration.comeup !== '—'
  const hasPeak = duration.peak && duration.peak.trim() !== '' && duration.peak !== '—'
  const hasOffset = duration.offset && duration.offset.trim() !== '' && duration.offset !== '—'
  if (hasOnset && hasTotal && (!hasComeup || !hasPeak || !hasOffset)) return true
  return false
}

/** Compute afterglow duration in minutes for a dose (1.5). Returns 0 if no
 *  afterglow phase exists. */
export function afterglowDurationMins(d: EnrichedDose): number {
  const afterglowEnd = d.timings.afterglowEnd
  const offsetEnd = d.timings.offsetEnd
  return afterglowEnd > offsetEnd ? afterglowEnd - offsetEnd : 0
}

/** Export the Recharts SVG for a given group as a PNG download (2.7).
 *  Finds the chart's <svg> inside the group's card, serializes it, draws it
 *  to a canvas, and triggers a PNG download. No external deps — uses native
 *  browser canvas + XMLSerializer APIs. */
export function exportChartPng(groupKey: string, substanceName: string) {
  if (typeof window === 'undefined') return
  // The chart's SVG lives inside a .recharts-surface or the ResponsiveContainer.
  // Find the card by looking for the svg within a container that has data-group-key.
  const svgs = document.querySelectorAll('svg.recharts-surface')
  if (!svgs.length) return
  // Find the SVG whose parent card contains this group's gradients
  let targetSvg: SVGSVGElement | null = null
  for (const svg of Array.from(svgs)) {
    const container = svg.closest('div')
    if (container?.querySelector(`linearGradient[id^="grad-${groupKey}-"]`)) {
      targetSvg = svg as SVGSVGElement
      break
    }
  }
  if (!targetSvg) return

  const serializer = new XMLSerializer()
  let svgStr = serializer.serializeToString(targetSvg)
  // Ensure XML namespace
  if (!svgStr.includes('xmlns=')) {
    svgStr = svgStr.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
  }

  const width = targetSvg.clientWidth || 800
  const height = targetSvg.clientHeight || 280
  const canvas = document.createElement('canvas')
  canvas.width = width * 2 // 2x for retina
  canvas.height = height * 2
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.scale(2, 2)
  // Fill background (transparent SVG → dark bg)
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, 0, width, height)

  const img = new Image()
  const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  img.onload = () => {
    ctx.drawImage(img, 0, 0, width, height)
    URL.revokeObjectURL(url)
    canvas.toBlob((pngBlob) => {
      if (!pngBlob) return
      const pngUrl = URL.createObjectURL(pngBlob)
      const a = document.createElement('a')
      a.href = pngUrl
      a.download = `${substanceName}-timeline-${format(new Date(), 'yyyy-MM-dd-HHmm')}.png`
      a.click()
      URL.revokeObjectURL(pngUrl)
    })
  }
  img.onerror = () => URL.revokeObjectURL(url)
  img.src = url
}

/** Mini SVG sparkline showing the intensity curve shape for a single phase (1.6).
 *  Width × height in px. Samples the phase's portion of the dose's intensity
 *  curve and renders it as a tiny polyline. */
export function PhaseSparkline({
  dose,
  phase,
  width = 48,
  height = 18,
}: {
  dose: EnrichedDose
  phase: PhaseName
  width?: number
  height?: number
}) {
  const pStart = phaseStart(phase, dose.timings)
  const pEnd = phaseEnd(phase, dose.timings)
  const pDuration = pEnd - pStart
  if (pDuration <= 0) return null

  // Sample 12 points across the phase
  const points: string[] = []
  for (let i = 0; i <= 12; i++) {
    const frac = i / 12
    const globalProgress = ((pStart + frac * pDuration) / dose.timings.totalDuration) * 100
    const intensity = intensityAt(globalProgress, dose.timings)
    const x = frac * width
    const y = height - (intensity / 100) * height
    points.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`)
  }

  return (
    <svg width={width} height={height} className="shrink-0" aria-hidden="true">
      <path
        d={points.join(' ')}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.6"
      />
    </svg>
  )
}

/** Window zoom options for the timeline. `null` = auto-fit (show all doses). */
export const WINDOW_OPTIONS = [
  { hours: 1, label: '1h' },
  { hours: 4, label: '4h' },
  { hours: 12, label: '12h' },
  { hours: 24, label: '24h' },
  { hours: null, label: 'All' },
] as const

export type WindowHours = number | null

/** Build enriched substance groups from raw doses — same logic as old component. */
export function computeGroups(doses: ReturnType<typeof import('@/store/dose-store').useDoseStore.getState>['doses']): SubstanceGroup[] {
  // Step 1: filter + enrich
  const baseDoses: EnrichedDose[] = doses
    .filter(d => {
      if (!d.duration) return false
      const totalMins = parseDurationToMinutes(d.duration.total ?? '')
      return totalMins > 0
    })
    .map(d => {
      const doseTime = safeDate(d.timestamp)
      const substanceEntry = SUBSTANCE_BY_NAME.get(d.substanceName.toLowerCase())
      const classification = substanceEntry
        ? classifyDose(d.amount, d.unit, substanceEntry, d.route)
        : null
      const horizontalWeight = classification?.horizontalWeight ?? 0.5
      // d.duration is non-null here (filtered above), but TS can't narrow
      // through .filter().map() — assert non-null.
      const duration = d.duration!
      const timings = classification
        ? calculateDoseScaledTimings(duration, horizontalWeight)
        : calculatePhaseTimings(duration)
      const status = getPhaseStatus(doseTime, timings)
      return {
        ...d,
        timings,
        status,
        doseTime,
        doseHeight: classification?.heightRelativeToCommon ?? 1,
        horizontalWeight,
        doseClass: classification?.doseClass,
      } as EnrichedDose
    })
    .sort((a, b) => a.doseTime.getTime() - b.doseTime.getTime())

  // Step 2: filter to active/recently-ended + group by substance → route
  const now = Date.now()
  const activeDoses = baseDoses.filter(d => {
    const elapsedMins = (now - d.doseTime.getTime()) / 60_000
    return elapsedMins < d.timings.offsetEnd + ENDED_DOSE_RETENTION_MINS
  })

  const bySubstance = new Map<string, EnrichedDose[]>()
  for (const d of activeDoses) {
    const key = d.substanceName.toLowerCase()
    if (!bySubstance.has(key)) bySubstance.set(key, [])
    bySubstance.get(key)!.push(d)
  }

  const result: SubstanceGroup[] = []
  for (const [, substanceDoses] of bySubstance) {
    const byRoute = new Map<string, EnrichedDose[]>()
    for (const d of substanceDoses) {
      const routeKey = d.route.toLowerCase()
      if (!byRoute.has(routeKey)) byRoute.set(routeKey, [])
      byRoute.get(routeKey)!.push(d)
    }

    const routes: RouteGroup[] = []
    let routeIdx = 0
    for (const [route, routeDoses] of byRoute) {
      const primary = routeDoses[0]
      const totalAmount = routeDoses.reduce((sum, d) => sum + d.amount, 0)
      const uniformUnit = routeDoses.every(d => d.unit === primary.unit)
      routes.push({
        route, doses: routeDoses, primary, totalAmount,
        unit: primary.unit, uniformUnit, paletteIndex: routeIdx,
      })
      routeIdx++
    }

    const earliest = substanceDoses[0]
    const latestEnd = substanceDoses.reduce((max, d) => {
      const end = d.doseTime.getTime() + d.timings.totalDuration * 60_000
      return Math.max(max, end)
    }, 0)
    const windowStart = new Date(earliest.doseTime.getTime() - 5 * 60_000)
    const windowEnd = new Date(latestEnd + 10 * 60_000)
    const windowDuration = (windowEnd.getTime() - windowStart.getTime()) / 60_000

    result.push({
      key: earliest.substanceName.toLowerCase(),
      substanceName: earliest.substanceName,
      categories: getDoseCategories(earliest),
      routes, primary: earliest, windowDuration, windowStart,
    })
  }

  result.sort((a, b) => a.primary.doseTime.getTime() - b.primary.doseTime.getTime())
  return result
}

/** Build Recharts chart data + series config for a single substance group.
 *
 *  Fix 3.2: this function is pure — it does NOT depend on `now`. The "now"
 *  line position is computed separately in GroupCard so the memoized chart
 *  config doesn't invalidate every 60 seconds.
 */
export function buildChartConfig(
  group: SubstanceGroup,
  visibleRoutes: RouteGroup[],
  sampleCount: number,
  windowOverride?: { startMs: number; endMs: number } | null,
): ChartConfig {
  // Use the override window (from the zoom selector) if provided, otherwise
  // fall back to the auto-fit window that covers all doses in the group.
  const windowStartMs = windowOverride?.startMs ?? group.windowStart.getTime()
  const windowEndMs = windowOverride?.endMs ?? (windowStartMs + group.windowDuration * 60_000)
  const sampleIntervalMs = (windowEndMs - windowStartMs) / sampleCount

  // Build dose series
  const series: DoseSeries[] = []
  for (const rg of visibleRoutes) {
    for (const d of rg.doses) {
      const doseId = String(d.id ?? d.doseTime.getTime())
      const dataKey = `dose_${doseId}`
      const palette = ROUTE_PALETTE[rg.paletteIndex % ROUTE_PALETTE.length]
      // isEnded is computed at render time in GroupCard (it depends on `now`),
      // but we need a snapshot here for initial opacity. Use a lazy getter
      // pattern instead — store the dose, let the consumer compute endedness.
      // For simplicity we set isEnded=false here and let the <Area opacity=...>
      // logic in GroupCard compute the real value from `now` directly.
      series.push({
        dose: d,
        route: rg,
        dataKey,
        palette,
        isEnded: false,
        doseHeight: d.doseHeight,
      })
    }
  }

  // Build data array — sample the dose-height-scaled intensity curve
  // (Fix 1.2: scaling applied via scaledIntensityAt)
  const data: ChartDataPoint[] = []
  for (let i = 0; i <= sampleCount; i++) {
    const t = windowStartMs + i * sampleIntervalMs
    const point: ChartDataPoint = { t }
    for (const s of series) {
      point[s.dataKey] = scaledIntensityAt(s.dose, t)
    }
    data.push(point)
  }

  // Phase bands from the band dose (first visible dose, or group primary)
  const bandDose = visibleRoutes[0]?.doses[0] ?? group.primary
  const bandOffsetMins = (bandDose.doseTime.getTime() - windowStartMs) / 60_000
  const phaseBands: PhaseBandConfig[] = getPhaseBandRanges(bandDose.timings).map(band => ({
    phase: band.phase,
    startMs: windowStartMs + (bandOffsetMins + band.startFrac * bandDose.timings.totalDuration) * 60_000,
    endMs: windowStartMs + (bandOffsetMins + band.endFrac * bandDose.timings.totalDuration) * 60_000,
  }))

  return { data, series, phaseBands, windowStartMs, windowEndMs }
}