'use client'

import React, { useSyncExternalStore, useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useDoseStore } from '@/store/dose-store'
import {
  dailyCounts,
  weeklyCounts,
  monthlyCounts,
  substanceBreakdown,
  categoryBreakdown,
  estimateTolerance,
  computeStreakInsights,
  pieColor,
} from '@/lib/analytics'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Activity,
  Calendar,
  TrendingUp,
  Flame,
  Clock,
  Target,
  AlertTriangle,
  BarChart3,
  PieChart as PieIcon,
  Brain,
  Trophy,
  CalendarDays,
} from 'lucide-react'

// ─── Range selector ────────────────────────────────────────────────────────

type RangeKey = '7d' | '30d' | '90d' | '1y'

const RANGE_OPTIONS: { key: RangeKey; label: string; days: number }[] = [
  { key: '7d', label: '7 days', days: 7 },
  { key: '30d', label: '30 days', days: 30 },
  { key: '90d', label: '90 days', days: 90 },
  { key: '1y', label: '1 year', days: 365 },
]

// ─── Tolerance levels (semantic mapping) ───────────────────────────────────
// Maps the tolerance level to a daisyUI semantic color token + a hex used for
// the radial-progress ring. Semantic tokens drive the label/badge styling; the
// hex is only used inside the SVG-style radial fill where daisyUI tokens don't
// apply cleanly.

const TOLERANCE_LEVELS: Record<
  string,
  { badge: string; text: string; label: string; hex: string }
> = {
  baseline: {
    badge: 'badge-success',
    text: 'text-success',
    label: 'Baseline',
    hex: 'var(--color-success)',
  },
  low: {
    badge: 'badge-info',
    text: 'text-info',
    label: 'Low',
    hex: 'var(--color-info)',
  },
  moderate: {
    badge: 'badge-warning',
    text: 'text-warning',
    label: 'Moderate',
    hex: 'var(--color-warning)',
  },
  high: {
    badge: 'badge-warning',
    text: 'text-warning',
    label: 'High',
    hex: 'var(--color-warning)',
  },
  'very-high': {
    badge: 'badge-error',
    text: 'text-error',
    label: 'Very High',
    hex: 'var(--color-error)',
  },
}

export default function AnalyticsPage() {
  const doses = useDoseStore((s) => s.doses)
  const isLoaded = useDoseStore((s) => s.isLoaded)
  const [range, setRange] = useState<RangeKey>('30d')
  // mounted + isMobile — prevents ResponsiveContainer from rendering inside
  // hidden (display:none) containers which trigger 0×0 warnings. We detect
  // mobile via useSyncExternalStore (same pattern as LayoutClient) so we avoid
  // setState-in-effect cascading renders.
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  )
  const isMobile = useSyncExternalStore(
    (callback) => {
      window.addEventListener('resize', callback)
      return () => window.removeEventListener('resize', callback)
    },
    () => window.innerWidth < 768,
    () => false,
  )

  const rangeDays = RANGE_OPTIONS.find((r) => r.key === range)!.days

  // ── Compute all the things ──
  const daily = useMemo(() => dailyCounts(doses, Math.min(rangeDays, 90)), [doses, rangeDays])
  const weekly = useMemo(
    () => weeklyCounts(doses, Math.min(Math.ceil(rangeDays / 7), 52)),
    [doses, rangeDays],
  )
  const monthly = useMemo(
    () => monthlyCounts(doses, Math.min(Math.ceil(rangeDays / 30), 12)),
    [doses, rangeDays],
  )
  const subs = useMemo(() => substanceBreakdown(doses), [doses])
  const cats = useMemo(() => categoryBreakdown(doses), [doses])
  const tolerance = useMemo(() => estimateTolerance(doses), [doses])
  const streaks = useMemo(() => computeStreakInsights(doses), [doses])

  if (!isLoaded || !mounted) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="loading loading-spinner loading-lg text-primary" />
      </div>
    )
  }

  if (doses.length === 0) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-10">
        <EmptyState />
      </div>
    )
  }

  // Single responsive layout — using isMobile for the compact prop instead
  // of rendering two separate hidden/visible containers (which caused 0×0
  // ResponsiveContainer warnings from the display:none side).
  return (
    <div
      className={
        isMobile
          ? 'space-y-5 px-4 pb-8 pt-4'
          : 'container mx-auto max-w-7xl space-y-6 px-4 py-6 lg:px-6 lg:py-10'
      }
    >
      <AnalyticsHero range={range} onRangeChange={setRange} />
      <KpiStatsRow insights={streaks} />
      <UsageChartsRow daily={daily} weekly={weekly} monthly={monthly} range={range} compact={isMobile} />
      <BreakdownsRow substances={subs} categories={cats} compact={isMobile} />
      <ToleranceSection tolerance={tolerance} compact={isMobile} />
    </div>
  )
}

// ─── Hero ──────────────────────────────────────────────────────────────────

function AnalyticsHero({
  range,
  onRangeChange,
}: {
  range: RangeKey
  onRangeChange: (r: RangeKey) => void
}) {
  return (
    <section className="hero rounded-box border border-base-300 bg-base-200/60 shadow-sm">
      <div className="hero-content w-full flex-col items-start gap-4 p-4 md:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl space-y-2">
          <span className="badge badge-outline badge-sm">Analytics</span>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Usage &amp; Tolerance</h1>
          <p className="text-sm text-neutral-content md:text-base">
            Track usage patterns, tolerance, and streaks. Heuristics only — for harm-reduction
            awareness.
          </p>
        </div>

        {/* Range selector as a daisyUI `tabs tabs-box` — one standardized
            control instead of custom pill buttons. */}
        <div
          role="tablist"
          aria-label="Time range"
          className="tabs tabs-boxed tabs-sm"
        >
          {RANGE_OPTIONS.map((o) => (
            <button
              key={o.key}
              type="button"
              role="tab"
              aria-selected={range === o.key}
              onClick={() => onRangeChange(o.key)}
              className={`tab ${range === o.key ? 'tab-active' : ''}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Empty state ────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <BarChart3 className="mb-4 h-16 w-16 text-neutral-content opacity-30" />
      <h2 className="mb-2 text-xl font-semibold">No dose data yet</h2>
      <p className="max-w-md text-sm text-neutral-content">
        Log your first dose from the Substances page to unlock analytics: usage charts, tolerance
        estimation, and streak insights.
      </p>
    </div>
  )
}

// ─── KPI Stats Row ──────────────────────────────────────────────────────────
// Replaces the four hard-coded-palette mini-cards with a single daisyUI
// `stats` block. Semantic tokens only; category/streak identity is carried by
// the figure icon color, not background tints.

function KpiStatsRow({
  insights,
}: {
  insights: ReturnType<typeof computeStreakInsights>
}) {
  const items = [
    {
      icon: Flame,
      title: 'Current Streak',
      value: `${insights.currentStreak}d`,
      desc: insights.currentStreak === 0 ? 'No active day streak' : 'Active days in a row',
      figure: 'text-warning',
    },
    {
      icon: Trophy,
      title: 'Longest Streak',
      value: `${insights.longestStreak}d`,
      desc: 'Personal record',
      figure: 'text-secondary',
    },
    {
      icon: Calendar,
      title: 'Rest Day Streak',
      value: `${insights.currentRestStreak}d`,
      desc: 'Days since last dose',
      figure: 'text-success',
    },
    {
      icon: Target,
      title: 'Avg / Active Day',
      value: `${insights.avgDosesPerActiveDay30d}`,
      desc: 'Last 30 days',
      figure: 'text-info',
    },
  ]

  return (
    <div className="stats stats-vertical w-full border border-base-300 bg-base-100 shadow-sm sm:stats-horizontal">
      {items.map((it) => {
        const Icon = it.icon
        return (
          <div className="stat" key={it.title}>
            <div className={`stat-figure ${it.figure}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div className="stat-title">{it.title}</div>
            <div className="stat-value text-2xl">{it.value}</div>
            <div className="stat-desc">{it.desc}</div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Usage Charts Row ───────────────────────────────────────────────────────

function UsageChartsRow({
  daily,
  weekly,
  monthly,
  range,
  compact,
}: {
  daily: ReturnType<typeof dailyCounts>
  weekly: ReturnType<typeof weeklyCounts>
  monthly: ReturnType<typeof monthlyCounts>
  range: RangeKey
  compact?: boolean
}) {
  // Choose which series to highlight based on the selected range
  const showWeekly = range === '90d'
  const showMonthly = range === '1y'

  return (
    <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Daily Usage
          </CardTitle>
          <CardDescription>Doses logged per day</CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ width: '100%', height: compact ? 180 : 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(127,127,127,0.15)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: 'currentColor' }}
                  stroke="currentColor"
                  interval={compact ? Math.floor(daily.length / 4) : 'preserveStartEnd'}
                  minTickGap={16}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'currentColor' }}
                  stroke="currentColor"
                  width={28}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-base-100)',
                    border: '1px solid var(--color-base-300)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: 'currentColor' }}
                  cursor={{ fill: 'rgba(127,127,127,0.08)' }}
                />
                <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {showWeekly ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              Weekly Usage
            </CardTitle>
            <CardDescription>Doses logged per week (Sunday-start)</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ width: '100%', height: compact ? 180 : 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekly} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(127,127,127,0.15)" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'currentColor' }} stroke="currentColor" />
                  <YAxis tick={{ fontSize: 10, fill: 'currentColor' }} stroke="currentColor" width={28} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: 'var(--color-base-100)', border: '1px solid var(--color-base-300)', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: 'currentColor' }}
                    cursor={{ fill: 'rgba(127,127,127,0.08)' }}
                  />
                  <Bar dataKey="count" fill="var(--color-secondary)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : showMonthly ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              Monthly Usage
            </CardTitle>
            <CardDescription>Doses logged per month</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ width: '100%', height: compact ? 180 : 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthly} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(127,127,127,0.15)" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'currentColor' }} stroke="currentColor" />
                  <YAxis tick={{ fontSize: 10, fill: 'currentColor' }} stroke="currentColor" width={28} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: 'var(--color-base-100)', border: '1px solid var(--color-base-300)', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: 'currentColor' }}
                  />
                  <Line type="monotone" dataKey="count" stroke="var(--color-success)" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : (
        <PatternInsightsCard />
      )}

      {/* Pattern insights card — show alongside when there's room */}
      {(showWeekly || showMonthly) && !compact && <PatternInsightsCard />}
    </div>
  )
}

// ─── Pattern insights ───────────────────────────────────────────────────────

function PatternInsightsCard() {
  const doses = useDoseStore((s) => s.doses)
  const insights = useMemo(() => computeStreakInsights(doses), [doses])

  const items: { icon: React.ElementType; label: string; value: string; color: string }[] = []

  if (insights.mostActiveDayOfWeek) {
    items.push({
      icon: Calendar,
      label: 'Most active day',
      value: insights.mostActiveDayOfWeek.label,
      color: 'text-secondary',
    })
  }

  if (insights.mostActiveHour) {
    const h = insights.mostActiveHour.hour
    const label = h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`
    items.push({
      icon: Clock,
      label: 'Most active hour',
      value: `${label} (${insights.mostActiveHour.count} doses)`,
      color: 'text-info',
    })
  }

  items.push({
    icon: Activity,
    label: 'Active vs rest days',
    value: `${insights.totalActiveDays} active / ${insights.totalRestDays} rest`,
    color: 'text-success',
  })

  items.push({
    icon: Target,
    label: 'Unique substances',
    value: `${insights.uniqueSubstances}`,
    color: 'text-accent',
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Usage Patterns
        </CardTitle>
        <CardDescription>Insights derived from your dose log</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((it, i) => {
          const Icon = it.icon
          return (
            <div key={i} className="flex items-center gap-3">
              <div className="shrink-0 rounded-lg bg-base-200 p-2">
                <Icon className={`h-4 w-4 ${it.color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-neutral-content">{it.label}</p>
                <p className={`truncate text-sm font-medium ${it.color}`}>{it.value}</p>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

// ─── Breakdowns Row ─────────────────────────────────────────────────────────

function BreakdownsRow({
  substances,
  categories,
  compact,
}: {
  substances: ReturnType<typeof substanceBreakdown>
  categories: ReturnType<typeof categoryBreakdown>
  compact?: boolean
}) {
  return (
    <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieIcon className="h-4 w-4 text-primary" />
            Substance Breakdown
          </CardTitle>
          <CardDescription>Dose count by substance</CardDescription>
        </CardHeader>
        <CardContent>
          {substances.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral-content">No data</p>
          ) : (
            <div className="flex flex-col items-center gap-4 md:flex-row">
              <div style={{ width: compact ? 160 : 200, height: compact ? 160 : 200 }} className="shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={substances}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius="80%"
                      innerRadius="45%"
                      paddingAngle={2}
                      isAnimationActive={false}
                    >
                      {substances.map((_, i) => (
                        <Cell key={i} fill={pieColor(i)} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: 'var(--color-base-100)', border: '1px solid var(--color-base-300)', borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: 'currentColor' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full min-w-0 flex-1 space-y-1.5">
                {substances.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-2 text-xs">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: pieColor(i) }} />
                    <span className="flex-1 truncate text-base-content/90">{s.name}</span>
                    <span className="font-mono text-neutral-content">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            Category Breakdown
          </CardTitle>
          <CardDescription>Dose count by psychoactive category</CardDescription>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral-content">No data</p>
          ) : (
            <div className="flex flex-col items-center gap-4 md:flex-row">
              <div style={{ width: compact ? 160 : 200, height: compact ? 160 : 200 }} className="shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categories}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius="80%"
                      innerRadius="45%"
                      paddingAngle={2}
                      isAnimationActive={false}
                    >
                      {categories.map((_, i) => (
                        <Cell key={i} fill={pieColor(i + 3)} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: 'var(--color-base-100)', border: '1px solid var(--color-base-300)', borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: 'currentColor' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full min-w-0 flex-1 space-y-1.5">
                {categories.map((c, i) => (
                  <div key={c.name} className="flex items-center gap-2 text-xs">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: pieColor(i + 3) }} />
                    <span className="flex-1 truncate capitalize text-base-content/90">{c.name}</span>
                    <span className="font-mono text-neutral-content">{c.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Tolerance Section ──────────────────────────────────────────────────────
// Phase 4 redesign: daisyUI `radial-progress` for the summary value (replaces
// the custom RadialBarChart gauge), `badge` with semantic severity, and a
// `collapse` (details/summary) for the per-substance computation explanation.

function ToleranceSection({
  tolerance,
  compact,
}: {
  tolerance: ReturnType<typeof estimateTolerance>
  compact?: boolean
}) {
  if (tolerance.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          Tolerance Estimation
        </CardTitle>
        <CardDescription>
          Heuristic model — exponential decay with substance-specific half-lives. For harm-reduction
          awareness only, not dosing guidance.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
          {tolerance.map((t) => {
            const lv = TOLERANCE_LEVELS[t.level]
            const pct = Math.round(t.currentLevel * 100)
            return (
              <div
                key={t.substanceName}
                className="rounded-lg border border-base-300 bg-base-200/50 p-4"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{t.substanceName}</p>
                    <p className="mt-0.5 text-xs text-neutral-content">
                      {t.dosesLast30Days} dose(s) in last 30d · last {t.daysSinceLast}d ago
                    </p>
                  </div>
                  <span className={`badge badge-sm shrink-0 ${lv.badge}`}>{lv.label}</span>
                </div>

                {/* Radial gauge — daisyUI radial-progress */}
                <div className="flex items-center gap-3">
                  <div
                    className={`radial-progress shrink-0 ${lv.text}`}
                    style={
                      {
                        '--value': pct,
                        '--size': '4rem',
                        '--thickness': '6px',
                      } as React.CSSProperties
                    }
                    role="progressbar"
                    aria-valuenow={pct}
                  >
                    {pct}%
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1">
                      <span className={`text-2xl font-bold ${lv.text}`}>{pct}%</span>
                      <span className="text-xs text-neutral-content">current</span>
                    </div>
                    <p className="mt-0.5 text-xs text-neutral-content">
                      {t.daysToBaseline > 0 ? `~${t.daysToBaseline}d to baseline` : 'At baseline'}
                    </p>
                  </div>
                </div>

                {/* Computation explanation in a collapse */}
                <details className="collapse collapse-arrow mt-3 min-h-0 rounded-md bg-base-100/60">
                  <summary className="collapse-title min-h-0 py-2 pr-8 text-xs font-normal text-neutral-content">
                    How this is computed
                  </summary>
                  <div className="collapse-content px-4 text-[11px] leading-relaxed text-neutral-content">
                    {t.explanation}
                  </div>
                </details>
              </div>
            )
          })}
        </div>

        {/* Severity disclaimer — semantic `alert alert-warning` */}
        <div role="alert" className="alert alert-warning mt-4">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <div className="text-xs leading-relaxed">
            <strong className="font-semibold">Disclaimer:</strong> Tolerance varies enormously
            between individuals, routes of administration, and dose sizes. This model uses simplified
            exponential decay with default half-lives per substance class. Always start low and
            consult harm-reduction resources when adjusting doses after a break.
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
