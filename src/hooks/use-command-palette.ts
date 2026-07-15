'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useDoseStore } from '@/store/dose-store'
import { useUIStore } from '@/store/ui-store'
import { searchSubstancesRanked, substances } from '@/lib/substances/index'
import { generalGuides } from '@/lib/harm-reduction-data'
import { format } from 'date-fns'
import {
  Search,
  Pill,
  Activity,
  Shield,
  Plus,
  ArrowRight,
  CornerDownLeft,
  ChevronUp,
  ChevronDown,
  Wine,
} from 'lucide-react'
import type { PaletteResult, ResultKind } from '../components/command-palette-types'

const CATEGORY_DOTS: Record<string, string> = {
  stimulants: 'bg-amber-500',
  depressants: 'bg-indigo-500',
  hallucinogens: 'bg-purple-500',
  dissociatives: 'bg-cyan-500',
  empathogens: 'bg-pink-500',
  cannabinoids: 'bg-green-500',
  opioids: 'bg-red-500',
  deliriants: 'bg-slate-500',
  nootropics: 'bg-teal-500',
  other: 'bg-zinc-500',
}

interface UseCommandPaletteOptions {
  openDoseLogger: () => void
}

export function useCommandPalette({ openDoseLogger }: UseCommandPaletteOptions) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const doses = useDoseStore((s) => s.doses)

  const openPalette = useCallback(() => {
    setQuery('')
    setActiveIndex(0)
    setOpen(true)
  }, [])

  const closePalette = useCallback(() => {
    setOpen(false)
  }, [])

  // Open palette on Cmd/Ctrl+K, or "/" when not focused in an input.
  // Close on Escape (handled by the input itself too).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (open) {
          closePalette()
        } else {
          openPalette()
        }
        return
      }
      // Don't intercept "/" when typing in a form field
      const target = e.target as HTMLElement | null
      const isEditable =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      if (e.key === '/' && !isEditable) {
        e.preventDefault()
        openPalette()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [closePalette, open, openPalette])

  // Focus input when opening.
  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 0)
      return () => window.clearTimeout(t)
    }
  }, [open])

  // Build the results list. Memoized so we don't re-search on every render.
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const out: PaletteResult[] = []

    // Quick actions — always show the most useful ones at the top, even
    // with no query. If there's a query, filter them.
    const actions: PaletteResult[] = [
      {
        id: 'action-log-dose',
        kind: 'action',
        title: 'Log a dose',
        subtitle: 'Open the dose logger',
        icon: Plus,
        action: () => {
          openDoseLogger()
        },
      },
      {
        id: 'action-interactions',
        kind: 'action',
        title: 'Check interactions',
        subtitle: 'Open the interaction checker',
        icon: Activity,
        href: '/interactions/',
      },
      {
        id: 'action-dxm',
        kind: 'action',
        title: 'DXM calculator',
        subtitle: 'Calculate DXM plateau doses',
        icon: Pill,
        href: '/dxm-calculator/',
      },
      {
        id: 'action-kratom',
        kind: 'action',
        title: 'Kratom calculator',
        subtitle: 'Convert leaf ↔ extract',
        icon: Pill,
        href: '/kratom-calculator/',
      },
      {
        id: 'action-alcohol',
        kind: 'action',
        title: 'Alcohol calculator',
        subtitle: 'Convert shots ↔ grams of ethanol',
        icon: Wine,
        href: '/calculators/alcohol/',
      },
      {
        id: 'action-harm-reduction',
        kind: 'action',
        title: 'Harm reduction guides',
        subtitle: 'Testing, dosing, emergencies',
        icon: Shield,
        href: '/harm-reduction/',
      },
      {
        id: 'action-history',
        kind: 'action',
        title: 'Track',
        subtitle: 'Open dose history, reminders, and stats',
        icon: Activity,
        href: '/?view=dose-log',
      },
    ]
    if (!query) {
      out.push(...actions)
    } else {
      const filtered = actions.filter(
        (a) =>
          a.title.toLowerCase().includes(query) ||
          (a.subtitle?.toLowerCase().includes(query) ?? false),
      )
      out.push(...filtered)
    }

    // Substances — only search when there's a query (otherwise the list
    // is huge and not useful in a palette context).
    if (query) {
      const subs = searchSubstancesRanked(query, { limit: 6 })
      for (const r of subs) {
        const s = r.substance
        out.push({
          id: `sub-${s.id}`,
          kind: 'substance',
          title: s.name,
          subtitle: [s.class, ...(s.categories || [])].filter(Boolean).join(' · '),
          href: `/?substance=${s.id}`,
          icon: Pill,
          dotClass: CATEGORY_DOTS[s.categories?.[0] || ''] || 'bg-zinc-500',
        })
      }
    }

    // Dose history — match substance name + notes. Show the most recent
    // 5 matches so the user can quickly jump back to a logged session.
    if (query && doses.length > 0) {
      const matches = doses
        .filter(
          (d) =>
            d.substanceName.toLowerCase().includes(query) ||
            (d.notes?.toLowerCase().includes(query) ?? false),
        )
        .slice(0, 5)
      for (const d of matches) {
        out.push({
          id: `hist-${d.id}`,
          kind: 'history',
          title: d.substanceName,
          subtitle: `${format(new Date(d.timestamp), 'MMM d, yyyy, h:mm a')} · ${d.amount} ${d.unit} · ${d.route}`,
          href: '/?view=dose-log',
          icon: Activity,
        })
      }
    }

    // Harm reduction guides — match title + content
    if (query) {
      const guideMatches = generalGuides
        .filter(
          (g) =>
            g.title.toLowerCase().includes(query) ||
            g.content.toLowerCase().includes(query),
        )
        .slice(0, 4)
      for (const g of guideMatches) {
        out.push({
          id: `guide-${g.id}`,
          kind: 'guide',
          title: g.title,
          subtitle: 'Harm reduction guide',
          href: `/harm-reduction/#${g.id}`,
          icon: Shield,
        })
      }
    }

    return out.slice(0, 20)
  }, [query, doses])

  const activate = useCallback(
    (r?: PaletteResult) => {
      if (!r) return
      if (r.action) {
        r.action()
      } else if (r.href) {
        router.push(r.href)
      }
    },
    [router],
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i < results.length - 1 ? i + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i > 0 ? i - 1 : results.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      activate(results[activeIndex])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      closePalette()
    }
  }

  // Scroll active item into view
  useEffect(() => {
    if (!open) return
    const container = listRef.current
    if (!container) return
    const el = container.querySelector<HTMLElement>(`[data-idx="${activeIndex}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open])

  return {
    open,
    setOpen,
    query,
    setQuery,
    activeIndex,
    setActiveIndex,
    inputRef,
    listRef,
    results,
    handleKeyDown,
    closePalette,
    activate,
  }
}