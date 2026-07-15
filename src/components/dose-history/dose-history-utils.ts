'use client'

import { format } from 'date-fns'
import { useMemo } from 'react'
import { parseDurationToMinutes } from '@/components/dose-timeline/dose-timeline-utils'
import { formatDoseAmount } from '@/lib/utils'
import type { DoseLog } from '@/types'

/** Color palette helpers for substance categories in the history table. */
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
  if (categories.length === 0) return '#71717a'
  return CATEGORY_HEX_COLORS[categories[0]] ?? '#71717a'
}

/** Format a timestamp into a compact date/time string for table cells. */
export function formatTimestamp(ts: string): string {
  const d = new Date(ts)
  return isNaN(d.getTime()) ? '—' : format(d, 'MMM d, yyyy h:mm a')
}

/** Format a dose's duration into a compact string. */
export function formatDuration(duration: DoseLog['duration']): string {
  if (!duration) return '—'
  const parts: string[] = []
  if (duration.onset) parts.push(`Onset: ${duration.onset}`)
  if (duration.comeup) parts.push(`Comeup: ${duration.comeup}`)
  if (duration.peak) parts.push(`Peak: ${duration.peak}`)
  if (duration.offset) parts.push(`Offset: ${duration.offset}`)
  if (duration.total) parts.push(`Total: ${duration.total}`)
  if (duration.afterglow) parts.push(`Afterglow: ${duration.afterglow}`)
  return parts.length ? parts.join(' · ') : '—'
}

/** Parse total duration string into minutes for sorting/filtering. */
export function totalDurationMinutes(duration: DoseLog['duration']): number {
  return duration ? parseDurationToMinutes(duration.total ?? '') : 0
}

/** Compute a human-readable dose label with amount, unit, and substance. */
export function getDoseLabel(dose: DoseLog): string {
  const formatted = formatDoseAmount(dose.amount, dose.unit)
  return `${dose.substanceName} · ${formatted.amount} ${formatted.unit} (${dose.route})`
}

/** Extract all unique categories from a dose list for filter dropdowns. */
export function getAllCategories(doses: DoseLog[]): string[] {
  const cats = new Set<string>()
  for (const d of doses) {
    d.categories?.forEach(c => cats.add(c))
  }
  return Array.from(cats).sort()
}

/** Extract all unique routes from a dose list. */
export function getAllRoutes(doses: DoseLog[]): string[] {
  const routes = new Set<string>()
  for (const d of doses) {
    if (d.route) routes.add(d.route)
  }
  return Array.from(routes).sort()
}

/** Extract all unique substance names from a dose list. */
export function getAllSubstances(doses: DoseLog[]): string[] {
  const subs = new Set<string>()
  for (const d of doses) {
    subs.add(d.substanceName)
  }
  return Array.from(subs).sort()
}

/** Filter doses by multiple criteria. Used by the history table. */
export interface HistoryFilter {
  substance?: string
  category?: string
  route?: string
  dateFrom?: Date
  dateTo?: Date
  search?: string
}

/** Apply history filters to a dose list. */
export function applyHistoryFilters(doses: DoseLog[], filters: HistoryFilter): DoseLog[] {
  return doses.filter(d => {
    if (filters.substance && d.substanceName.toLowerCase() !== filters.substance.toLowerCase()) return false
    if (filters.category && !d.categories?.some(c => c.toLowerCase() === filters.category!.toLowerCase())) return false
    if (filters.route && d.route.toLowerCase() !== filters.route.toLowerCase()) return false
    if (filters.dateFrom) {
      const doseDate = new Date(d.timestamp)
      if (isNaN(doseDate.getTime()) || doseDate < filters.dateFrom) return false
    }
    if (filters.dateTo) {
      const doseDate = new Date(d.timestamp)
      if (isNaN(doseDate.getTime()) || doseDate > filters.dateTo) return false
    }
    if (filters.search) {
      const search = filters.search.toLowerCase()
      const haystack = [
        d.substanceName,
        d.route,
        d.unit,
        d.notes ?? '',
        d.mood ?? '',
        d.setting ?? '',
      ].join(' ').toLowerCase()
      if (!haystack.includes(search)) return false
    }
    return true
  })
}

/** Group doses by day for the "Today / Yesterday / Older" sections. */
export function groupDosesByDay(doses: DoseLog[]): { label: string; date: string; doses: DoseLog[] }[] {
  const byDay = new Map<string, DoseLog[]>()
  for (const d of doses) {
    const dateStr = d.timestamp.slice(0, 10)
    if (!byDay.has(dateStr)) byDay.set(dateStr, [])
    byDay.get(dateStr)!.push(d)
  }

  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)

  const result: { label: string; date: string; doses: DoseLog[] }[] = []
  for (const [dateStr, dayDoses] of byDay) {
    const sorted = [...dayDoses].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    let label = format(new Date(dateStr + 'T00:00:00'), 'EEEE, MMM d, yyyy')
    if (dateStr === today) label = 'Today'
    else if (dateStr === yesterday) label = 'Yesterday'
    result.push({ label, date: dateStr, doses: sorted })
  }

  // Sort: Today first, then Yesterday, then older descending
  result.sort((a, b) => {
    const aToday = a.date === today
    const bToday = b.date === today
    const aYesterday = a.date === yesterday
    const bYesterday = b.date === yesterday
    if (aToday && !bToday) return -1
    if (!aToday && bToday) return 1
    if (aYesterday && !bYesterday) return -1
    if (!aYesterday && bYesterday) return 1
    return b.date.localeCompare(a.date)
  })

  return result
}