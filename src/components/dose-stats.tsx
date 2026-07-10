'use client'

import { useMemo } from 'react'
import { format, subDays, isAfter } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Activity, TrendingUp, Calendar, Clock } from 'lucide-react'
import { useDoseStore } from '@/store/dose-store'

/**
 * DoseStats — glanceable summary of the user's dose log.
 *
 * Phase 4 redesign: rebuilt around the daisyUI `stats` primitive with semantic
 * tokens (no hard-coded Tailwind palette colors). The "Most logged" and
 * "Categories" blocks use `card` + `badge` so the breakdown stays scannable
 * without competing with the KPI row.
 *
 * Reads directly from the Zustand store, which handles localStorage sync and
 * cross-tab updates via storage events — no props needed.
 */
export function DoseStats() {
  const doses = useDoseStore((s) => s.doses)
  const isLoaded = useDoseStore((s) => s.isLoaded)

  const stats = useMemo(() => {
    if (!doses.length) return null

    const now = new Date()
    const last7Days = doses.filter((d) => isAfter(new Date(d.timestamp), subDays(now, 7)))
    const last30Days = doses.filter((d) => isAfter(new Date(d.timestamp), subDays(now, 30)))

    // Most used substances
    const substanceCounts: Record<string, number> = {}
    doses.forEach((d) => {
      substanceCounts[d.substanceName] = (substanceCounts[d.substanceName] || 0) + 1
    })
    const topSubstances = Object.entries(substanceCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)

    // Most common category
    const categoryCounts: Record<string, number> = {}
    doses.forEach((d) => {
      const cats = Array.isArray(d.categories)
        ? d.categories
        : ((d as any).category && (d as any).category !== 'unknown'
          ? [(d as any).category as string]
          : [])
      cats.forEach((cat: string) => {
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
      })
    })
    const sortedCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])

    // Days since last dose
    const sortedDoses = [...doses].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    const lastDose = sortedDoses[0]
    const daysSinceLast = lastDose
      ? Math.floor(
        (now.getTime() - new Date(lastDose.timestamp).getTime()) / (1000 * 60 * 60 * 24),
      )
      : null

    // Rest days in the last 30 days
    const uniqueDaysWithDoses = new Set(
      last30Days.map((d) => format(new Date(d.timestamp), 'yyyy-MM-dd')),
    )
    const restDays = 30 - uniqueDaysWithDoses.size

    return {
      total: doses.length,
      last7Days: last7Days.length,
      last30Days: last30Days.length,
      daysSinceLast,
      restDays,
      activeDays: uniqueDaysWithDoses.size,
      topSubstances,
      sortedCategories,
    }
  }, [doses])

  if (!isLoaded || !stats) return null

  return (
    <div className="space-y-4">
      {/* KPI row — daisyUI `stats`, semantic tokens only. Responsive:
          vertical on mobile, horizontal on sm+. */}
      <div className="stats stats-vertical w-full border border-base-300 bg-base-100 shadow-sm sm:stats-horizontal">
        <div className="stat">
          <div className="stat-figure text-primary">
            <Activity className="h-6 w-6" />
          </div>
          <div className="stat-title">Total Logs</div>
          <div className="stat-value text-2xl">{stats.total}</div>
          <div className="stat-desc">{stats.last7Days} in the last 7 days</div>
        </div>

        <div className="stat">
          <div className="stat-figure text-secondary">
            <Calendar className="h-6 w-6" />
          </div>
          <div className="stat-title">Rest Days (30d)</div>
          <div className="stat-value text-2xl">{stats.restDays}</div>
          <div className="stat-desc">{stats.activeDays} active days</div>
        </div>

        <div className="stat">
          <div className="stat-figure text-accent">
            <Clock className="h-6 w-6" />
          </div>
          <div className="stat-title">Since Last Dose</div>
          <div className="stat-value text-2xl">{stats.daysSinceLast ?? '-'}</div>
          <div className="stat-desc">
            {stats.daysSinceLast === 0
              ? 'Today'
              : stats.daysSinceLast === 1
                ? 'Yesterday'
                : 'days ago'}
          </div>
        </div>

        <div className="stat">
          <div className="stat-figure text-info">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div className="stat-title">Last 30 Days</div>
          <div className="stat-value text-2xl">{stats.last30Days}</div>
          <div className="stat-desc">total logs</div>
        </div>
      </div>

      {/* Breakdown cards — `badge` chips keep category/substance identity
          without adding competing mini-panels. */}
      <div className="grid gap-4 sm:grid-cols-2">
        {stats.topSubstances.length > 0 && (
          <div className="card border border-base-300 bg-base-100 shadow-sm">
            <div className="card-body gap-2 p-4 md:p-5">
              <h3 className="card-title text-sm font-semibold">Most Logged</h3>
              <div className="flex flex-wrap gap-2">
                {stats.topSubstances.map(([name, count], i) => (
                  <Badge key={name} variant={i === 0 ? 'primary' : 'outline'}>
                    {name} ({count})
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {stats.sortedCategories.length > 0 && (
          <div className="card border border-base-300 bg-base-100 shadow-sm">
            <div className="card-body gap-2 p-4 md:p-5">
              <h3 className="card-title text-sm font-semibold">Categories</h3>
              <div className="flex flex-wrap gap-2">
                {stats.sortedCategories.map(([cat, count]) => (
                  <Badge key={cat} variant="outline" className="capitalize">
                    {cat} ({count})
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
