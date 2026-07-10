'use client'

import { useState, useCallback, type ReactNode } from 'react'
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Info,
  MinusCircle,
  Shield,
  Sparkles,
  XCircle,
} from 'lucide-react'
import type { Substance, SubstanceCategory } from '@/lib/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DosageDurationPanel } from './DosageDurationPanel'
import { cn } from '@/lib/utils'

interface SubstanceDetailTabsProps {
  substance: Substance
  onRouteChange: (route: string | null) => void
  onCategoryClick?: (category: SubstanceCategory) => void
}

/**
 * SubstanceDetailTabs — Phase 3 unified tab group for the substance detail
 * page.
 *
 * Per plan §6.1 the detail page uses a single tab system:
 *   - Overview  → description, history, quick stats inline
 *   - Dosage    → DosageDurationPanel (route selector + dosage/duration cards
 *                 + comparison table)
 *   - Effects   → positive / neutral / negative effect lists (sub-tabbed)
 *   - Harm reduction → harm-reduction tips + deep link to /harm-reduction
 *   - Interactions   → dangerous / unsafe / uncertain / cross-tolerances
 *
 * One component, one tab style, no duplicated mobile/desktop branches.
 */
export function SubstanceDetailTabs({
  substance,
  onRouteChange,
}: SubstanceDetailTabsProps) {
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null)
  const handleRouteChange = useCallback(
    (r: string | null) => {
      setSelectedRoute(r)
      onRouteChange(r)
    },
    [onRouteChange],
  )

  return (
    <div className="card border border-base-300/70 bg-base-100/70 backdrop-blur-sm shadow-sm">
      <Tabs defaultValue="overview" className="gap-0">
        <div className="border-b border-base-300/70 p-2 md:p-3">
          <TabsList className="w-full justify-center gap-1 overflow-x-auto scrollbar-none">
            <TabsTrigger value="overview" className="gap-1.5">
              <Info className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="dosage" className="gap-1.5">
              <Sparkles className="h-4 w-4" />
              Dosage
            </TabsTrigger>
            <TabsTrigger value="effects" className="gap-1.5">
              <Activity className="h-4 w-4" />
              Effects
            </TabsTrigger>
            <TabsTrigger value="harm" className="gap-1.5">
              <Shield className="h-4 w-4" />
              Harm reduction
            </TabsTrigger>
            <TabsTrigger value="interactions" className="gap-1.5">
              <AlertTriangle className="h-4 w-4" />
              Interactions
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="card-body p-4 md:p-6">
          <TabsContent value="overview" className="mt-0 space-y-4">
            <OverviewTab substance={substance} />
          </TabsContent>

          <TabsContent value="dosage" className="mt-0">
            <DosageDurationPanel
              substance={substance}
              onRouteChange={handleRouteChange}
            />
          </TabsContent>

          <TabsContent value="effects" className="mt-0">
            <EffectsTab substance={substance} />
          </TabsContent>

          <TabsContent value="harm" className="mt-0">
            <HarmReductionTab substance={substance} />
          </TabsContent>

          <TabsContent value="interactions" className="mt-0">
            <InteractionsTab substance={substance} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

// ─── Overview tab ──────────────────────────────────────────────────────────

function OverviewTab({ substance }: { substance: Substance }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-neutral-content">
          Description
        </h3>
        <p className="text-sm leading-relaxed md:text-base">{substance.description}</p>
      </div>

      {substance.history && (
        <div>
          <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-neutral-content">
            History
          </h3>
          <p className="text-sm leading-relaxed text-neutral-content">{substance.history}</p>
        </div>
      )}
    </div>
  )
}

// ─── Effects tab (sub-tabbed positive/neutral/negative) ───────────────────

function EffectsTab({ substance }: { substance: Substance }) {
  return (
    <Tabs defaultValue="positive">
      <TabsList className="w-full grid-cols-3">
        <TabsTrigger value="positive" className="text-success">
          Positive
        </TabsTrigger>
        <TabsTrigger value="neutral" className="text-warning">
          Neutral
        </TabsTrigger>
        <TabsTrigger value="negative" className="text-error">
          Negative
        </TabsTrigger>
      </TabsList>

      <TabsContent value="positive" className="mt-4">
        <EffectList
          items={substance.effects.positive}
          icon={<CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-success" />}
          emptyText="No positive effects documented."
        />
      </TabsContent>
      <TabsContent value="neutral" className="mt-4">
        <EffectList
          items={substance.effects.neutral}
          icon={<MinusCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />}
          emptyText="No neutral effects documented."
        />
      </TabsContent>
      <TabsContent value="negative" className="mt-4">
        <EffectList
          items={substance.effects.negative}
          icon={<XCircle className="mt-0.5 h-4 w-4 shrink-0 text-error" />}
          emptyText="No negative effects documented."
        />
      </TabsContent>
    </Tabs>
  )
}

function EffectList({
  items,
  icon,
  emptyText,
}: {
  items: string[]
  icon: ReactNode
  emptyText: string
}) {
  if (items.length === 0) {
    return <p className="text-sm text-neutral-content">{emptyText}</p>
  }
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm">
          {icon}
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

// ─── Harm reduction tab ────────────────────────────────────────────────────

function HarmReductionTab({ substance }: { substance: Substance }) {
  if (substance.harmReduction.length === 0) {
    return (
      <p className="text-sm text-neutral-content">
        No harm-reduction notes documented for this substance.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {substance.harmReduction.map((tip, i) => (
          <li
            key={i}
            className="alert alert-warning items-start py-3"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="text-sm leading-relaxed">{tip}</span>
          </li>
        ))}
      </ul>

      <a
        href={`/harm-reduction/?substance=${substance.id}`}
        className="btn btn-outline btn-sm w-full gap-2"
      >
        <Shield className="h-3.5 w-3.5" />
        View full harm reduction for {substance.name}
        <ChevronRight className="h-3.5 w-3.5" />
      </a>
    </div>
  )
}

// ─── Interactions tab ─────────────────────────────────────────────────────

const interactionGroups = [
  { key: 'dangerous', label: 'Dangerous', icon: AlertTriangle, color: 'text-error' },
  { key: 'unsafe', label: 'Unsafe', icon: AlertTriangle, color: 'text-warning' },
  { key: 'uncertain', label: 'Uncertain', icon: Info, color: 'text-info' },
  { key: 'crossTolerances', label: 'Cross-tolerances', icon: Activity, color: 'text-secondary' },
] as const

function InteractionsTab({ substance }: { substance: Substance }) {
  const hasAny = interactionGroups.some(
    (g) => (substance.interactions[g.key as keyof typeof substance.interactions] ?? []).length > 0,
  )

  if (!hasAny) {
    return (
      <p className="text-sm text-neutral-content">
        No documented interactions for this substance.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {interactionGroups.map((group) => {
        const items = substance.interactions[group.key as keyof typeof substance.interactions] ?? []
        if (items.length === 0) return null
        const Icon = group.icon
        return (
          <div key={group.key}>
            <p
              className={cn(
                'mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide',
                group.color,
              )}
            >
              <Icon className="h-3 w-3" />
              {group.label}
            </p>
            <div className="flex flex-wrap gap-2">
              {items.map((item, i) => (
                <span
                  key={i}
                  className={cn(
                    'badge badge-outline text-xs',
                    group.key === 'dangerous' && 'border-error/30 text-error',
                    group.key === 'unsafe' && 'border-warning/30 text-warning',
                    group.key === 'uncertain' && 'border-info/30 text-info',
                    group.key === 'crossTolerances' && 'border-secondary/30 text-secondary',
                  )}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
