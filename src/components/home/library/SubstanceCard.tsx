'use client'

import { memo } from 'react'
import { ChevronRight } from 'lucide-react'
import type { Substance } from '@/lib/types'
import { categories } from '@/lib/categories'
import {
  categoryColors,
  riskLevelColors,
} from '../home-constants'
import {
  CategoryIcon,
  getPrimaryCategory,
  getSubstanceCategories,
} from '../home-utils'
import { cn } from '@/lib/utils'

interface SubstanceCardProps {
  substance: Substance
  onSelect: (s: Substance) => void
}

/**
 * SubstanceCard — Phase 3 simplified card for the library grid.
 *
 * Per plan §6.1 the grid card now shows only:
 *   - name + class
 *   - 1-line summary (clamped)
 *   - up to 2 category badges
 *   - risk badge
 *   - route count badge (only when > 1 route)
 *
 * Removed: glow classes, decorative card-transparent panel chrome, common-names
 * badges row, oversized icon tile. The card uses the standardized `<Card>`
 * primitive (variant="default") so transparency + spacing are consistent with
 * the rest of the app.
 *
 * Memoized — the grid can render 24+ cards and we don't want unrelated
 * re-renders (search query typing in a sibling component, etc.) to re-render
 * every card.
 */
export const SubstanceCard = memo(function SubstanceCard({
  substance,
  onSelect,
}: SubstanceCardProps) {
  const primary = getPrimaryCategory(substance)
  const cats = getSubstanceCategories(substance)
  const hasRouteData = substance.routeData && Object.keys(substance.routeData).length > 1

  return (
    <button
      type="button"
      onClick={() => onSelect(substance)}
      className={cn(
        // Standardized Card surface (Phase 2)
        'card card-lift bg-base-100/80 text-base-content border border-base-300/70 shadow-sm backdrop-blur-sm',
        // Lift on hover, but only on devices that actually have hover
        'transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md',
        'active:border-primary/40',
        // Make the whole card a button
        'cursor-pointer text-left',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        // Content visibility for performance on long lists
        'content-visibility-auto contain-intrinsic-size-[200px]',
      )}
    >
      <div className="card-body gap-3 p-4 md:p-5">
        {/* Header: icon + name/class + chevron */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            {primary && (
              <div
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                  categoryColors[primary],
                )}
              >
                <CategoryIcon substance={substance} className="h-4 w-4" />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="card-title text-base font-semibold leading-tight">
                {substance.name}
              </h3>
              <p className="truncate text-xs text-neutral-content">{substance.class}</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-neutral-content" />
        </div>

        {/* Summary — single clamped line per the plan */}
        <p className="line-clamp-2 text-sm text-neutral-content">{substance.description}</p>

        {/* Footer: category badges + risk/routes */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            {cats.slice(0, 2).map((cat) => {
              const info = categories.find((c) => c.id === cat)
              return (
                <span
                  key={cat}
                  className={cn(
                    'badge badge-outline badge-sm text-xs',
                    categoryColors[cat] ?? '',
                  )}
                >
                  {info?.name ?? cat}
                </span>
              )
            })}
            {cats.length > 2 && (
              <span className="badge badge-outline badge-sm text-xs text-neutral-content">
                +{cats.length - 2}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {hasRouteData && (
              <span className="badge badge-outline badge-sm border-primary/30 text-xs text-primary/80">
                {Object.keys(substance.routeData!).length} routes
              </span>
            )}
            <span
              className={cn(
                'badge badge-outline badge-sm text-xs capitalize',
                riskLevelColors[substance.riskLevel],
              )}
            >
              {substance.riskLevel.replace('-', ' ')}
            </span>
          </div>
        </div>
      </div>
    </button>
  )
})
