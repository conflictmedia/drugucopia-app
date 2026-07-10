'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDoseStore } from '@/store/dose-store'
import { useUIStore } from '@/store/ui-store'
import {
  searchSubstancesRanked,
  substances,
} from '@/lib/substances/index'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * G1 — Global cmd-K search palette.
 *
 * Opens with Cmd/Ctrl+K (or "/" when not in an input). Searches across:
 *   - Substances (name, aliases, common names)
 *   - Dose history (substance name + notes)
 *   - Harm reduction guides (title + content)
 *   - Quick actions (Log a dose, Check interactions, etc.)
 *
 * Keyboard:
 *   ↑/↓   navigate
 *   Enter activate
 *   Esc   close
 *   Tab   noop (we handle nav ourselves)
 */

type ResultKind = 'substance' | 'history' | 'guide' | 'action'

interface PaletteResult {
  id: string
  kind: ResultKind
  title: string
  subtitle?: string
  /** URL to navigate to, OR null for an action callback */
  href?: string
  action?: () => void
  icon: typeof Pill
  /** Optional category dot color for substances */
  dotClass?: string
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const doses = useDoseStore((s) => s.doses)
  const openDoseLogger = useUIStore((s) => s.openDoseLogger)

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
  const results = useMemo<PaletteResult[]>(() => {
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
    if (!q) {
      out.push(...actions)
    } else {
      const filtered = actions.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          (a.subtitle?.toLowerCase().includes(q) ?? false),
      )
      out.push(...filtered)
    }

    // Substances — only search when there's a query (otherwise the list
    // is huge and not useful in a palette context).
    if (q) {
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
    if (q && doses.length > 0) {
      const matches = doses
        .filter(
          (d) =>
            d.substanceName.toLowerCase().includes(q) ||
            (d.notes?.toLowerCase().includes(q) ?? false),
        )
        .slice(0, 5)
      for (const d of matches) {
        out.push({
          id: `hist-${d.id}`,
          kind: 'history',
          title: d.substanceName,
          subtitle: `${format(new Date(d.timestamp), 'MMM d, yyyy, h:mm a')} · ${d.amount} ${d.unit} · ${d.route}`,
          href: `/?view=dose-log`,
          icon: Activity,
        })
      }
    }

    // Harm reduction guides — match title + content
    if (q) {
      const guideMatches = generalGuides
        .filter(
          (g) =>
            g.title.toLowerCase().includes(q) ||
            g.content.toLowerCase().includes(q),
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
  }, [query, doses, openDoseLogger])

  const activate = useCallback(
    (r?: PaletteResult) => {
      if (!r) return
      closePalette()
      if (r.action) {
        r.action()
      } else if (r.href) {
        router.push(r.href)
      }
    },
    [closePalette, router],
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

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4"
      onClick={closePalette}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Palette */}
      <div
        className="relative w-full max-w-xl rounded-xl border border-base-300 bg-base-100 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-base-300">
          <Search className="h-4 w-4 text-neutral-content shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActiveIndex(0)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search substances, doses, guides, or actions…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-neutral-content/60"
            aria-label="Search"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-base-300 text-[10px] font-mono text-neutral-content">
            esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto p-2">
          {results.length === 0 ? (
            <div className="py-8 text-center text-sm text-neutral-content">
              No matches for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <>
              {/* Group label per kind, in order */}
              {groupResults(results).map(({ label, items }) => (
                <div key={label} className="mb-2">
                  <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-neutral-content/60">
                    {label}
                  </div>
                  {items.map((r) => {
                    const idx = results.indexOf(r)
                    const isActive = idx === activeIndex
                    const Icon = r.icon
                    return (
                      <button
                        key={r.id}
                        type="button"
                        data-idx={idx}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => activate(r)}
                        className={cn(
                          'w-full flex items-center gap-3 px-2.5 py-2 rounded-md text-left text-sm transition-colors',
                          isActive ? 'bg-accent text-accent-content' : 'hover:bg-base-200',
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0 opacity-70" />
                        {r.dotClass && (
                          <span className={cn('w-2 h-2 rounded-full shrink-0', r.dotClass)} />
                        )}
                        <span className="flex-1 min-w-0">
                          <span className="block truncate font-medium">{r.title}</span>
                          {r.subtitle && (
                            <span className="block truncate text-xs text-neutral-content">
                              {r.subtitle}
                            </span>
                          )}
                        </span>
                        {isActive && (
                          <CornerDownLeft className="h-3.5 w-3.5 shrink-0 opacity-60" />
                        )}
                      </button>
                    )
                  })}
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-base-300 text-[10px] text-neutral-content">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded border border-base-300 font-mono">
                <ChevronUp className="h-2.5 w-2.5 inline" />
                <ChevronDown className="h-2.5 w-2.5 inline" />
              </kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded border border-base-300 font-mono">↵</kbd>
              select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded border border-base-300 font-mono">esc</kbd>
              close
            </span>
          </div>
          <span className="hidden sm:flex items-center gap-1">
            <ArrowRight className="h-2.5 w-2.5" />
            Drugucopia
          </span>
        </div>
      </div>
    </div>
  )
}

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

function groupResults(results: PaletteResult[]): { label: string; items: PaletteResult[] }[] {
  const order: ResultKind[] = ['action', 'substance', 'history', 'guide']
  const labels: Record<ResultKind, string> = {
    action: 'Quick actions',
    substance: 'Substances',
    history: 'Your dose history',
    guide: 'Harm reduction guides',
  }
  return order
    .map((kind) => ({
      label: labels[kind],
      items: results.filter((r) => r.kind === kind),
    }))
    .filter((g) => g.items.length > 0)
}

