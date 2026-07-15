'use client'

import { useState, useCallback, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Shuffle,
  AlertTriangle,
  Zap,
  Users,
} from 'lucide-react'
import { InteractionSubstanceSelector } from '@/components/interaction-substance-selector'
import { InteractionResults } from '@/components/interaction-results'
import { checkInteractions, checkSingleSubstanceInteractions } from '@/lib/interaction-checker'
import type { InteractionCheckResult } from '@/lib/interaction-checker'
import { PullToRefresh } from '@/components/ui/PullToRefresh'

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────

export default function InteractionsPage() {
  return (
    <Suspense>
      <InteractionsPageInner />
    </Suspense>
  )
}

function InteractionsPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const handleRefresh = useCallback(async () => {
    router.refresh()
  }, [router])

  // Lazy initialization - parse URL params once on mount
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    const subsParam = searchParams.get('substances')
    if (subsParam) {
      const ids = subsParam
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
      if (ids.length > 0) return ids
    }
    return []
  })
  const [result, setResult] = useState<InteractionCheckResult | null>(null)

  // Run interaction check whenever selection changes (with debounce-like behavior)
  // eslint-disable-next-line react-hooks/set-state-in-effect -- debounced check on selection change
  useEffect(() => {
    if (selectedIds.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset on empty selection
      setResult(null)
      return
    }

    const timer = setTimeout(() => {
      if (selectedIds.length === 1) {
        const checkResult = checkSingleSubstanceInteractions(selectedIds[0])
        setResult(checkResult)
      } else {
        const checkResult = checkInteractions(selectedIds)
        setResult(checkResult)
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [selectedIds])

  const handleSelectionChange = useCallback((ids: string[]) => {
    setSelectedIds(ids)
  }, [])

  return (
    <PullToRefresh onRefresh={handleRefresh} threshold={60}>
      <div className="min-h-screen flex flex-col">
        {/* ── Unified Responsive Content ── */}
        <div className="flex-1 overflow-y-auto safe-area-pb-min">
          {/* Hero */}
          <div className="px-4 pt-4 pb-3 border-b border-base-300/70 md:px-0 md:border-none md:py-6 lg:py-10">
            <div className="mx-auto max-w-5xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10">
                  <Shuffle className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold tracking-tight gradient-text">Interaction Checker</h2>
                  <p className="text-neutral-content mt-1">
                    Check for drug interactions. Select one substance to see all known
                    interactions, or select two or more to check pairwise combinations
                    and cross-tolerance information.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="divider mx-auto max-w-5xl hidden md:block" />

          {/* Content Grid - Single column on mobile, two-column on desktop */}
          <div className="mx-auto max-w-5xl px-4 md:grid md:grid-cols-12 md:gap-6 md:px-0">
            {/* Left: Selector - Full width on mobile, 1/3 on desktop */}
            <div className="md:col-span-4">
              <div className="sticky top-20 md:sticky top-20 card card-transparent p-4 md:p-4 lg:p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-base-content">Substances</h3>
                </div>
                <InteractionSubstanceSelector
                  selectedIds={selectedIds}
                  onSelectionChange={handleSelectionChange}
                />

                {/* Quick-add popular combos */}
                <div className="mt-6">
                  <p className="text-xs text-neutral-content mb-2 font-medium">Quick check:</p>
                  <div className="flex flex-wrap gap-1.5">
                    <QuickCombo
                      label="Alcohol + MDMA"
                      ids={['alcohol', 'mdma']}
                      onClick={handleSelectionChange}
                    />
                    <QuickCombo
                      label="Alcohol + Benzos"
                      ids={['alcohol', 'diazepam']}
                      onClick={handleSelectionChange}
                    />
                    <QuickCombo
                      label="Cocaine + Alcohol"
                      ids={['cocaine', 'alcohol']}
                      onClick={handleSelectionChange}
                    />
                    <QuickCombo
                      label="Ketamine + Cocaine"
                      ids={['ketamine', 'cocaine']}
                      onClick={handleSelectionChange}
                    />
                    <QuickCombo
                      label="LSD + Cannabis"
                      ids={['lsd', 'cannabis']}
                      onClick={handleSelectionChange}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Results - Full width on mobile, 2/3 on desktop */}
            <div className="md:col-span-8 mt-6 md:mt-0">
              <InteractionResults
                result={result}
                selectedCount={selectedIds.length}
              />
            </div>
          </div>
        </div>
      </div>
    </PullToRefresh>
  )
}

// ─── QUICK COMBO BUTTON ─────────────────────────────────────────────────────

function QuickCombo({
  label,
  ids,
  onClick,
}: {
  label: string
  ids: string[]
  onClick: (ids: string[]) => void
}) {
  return (
    <button
      onClick={() => onClick(ids)}
      className="btn btn-sm btn-ghost border border-base-300 hover:border-primary/30 gap-1 text-xs text-neutral-content hover:text-base-content card-lift min-h-[44px]"
    >
      <Zap className="h-3 w-3" />
      {label}
    </button>
  )
}