'use client'

import { useRef, useCallback } from 'react'
import { Search, Plus, Activity, Shield, Wine, CornerDownLeft, ChevronUp, ChevronDown, Pill, Activity as ActivityIcon, Shield as ShieldIcon, Plus as PlusIcon, Wine as WineIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useDoseStore } from '@/store/dose-store'
import { useUIStore } from '@/store/ui-store'
import { searchSubstancesRanked, substances } from '@/lib/substances/index'
import { generalGuides } from '@/lib/harm-reduction-data'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { useCommandPalette } from '@/hooks/use-command-palette'
import { PaletteResult, ResultKind } from '@/components/command-palette-types'

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

export function CommandPalette() {
  const { open, setOpen, query, setQuery, activeIndex, setActiveIndex, inputRef, listRef, results, handleKeyDown, closePalette, activate } = useCommandPalette({
    openDoseLogger: useUIStore.getState().openDoseLogger,
  })

  const doses = useDoseStore((s) => s.doses)
  const openDoseLogger = useUIStore((s) => s.openDoseLogger)
  const router = useRouter()

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
            <CornerDownLeft className="h-2.5 w-2.5" />
            Drugucopia
          </span>
        </div>
      </div>
    </div>
  )
}