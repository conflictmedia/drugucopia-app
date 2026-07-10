'use client'

import { Shield } from 'lucide-react'
import type { SubstanceCategory } from '@/lib/types'
import type { categories as categoriesType } from '@/lib/categories'

interface LibraryHeroProps {
  selectedCategory: SubstanceCategory | 'all'
  categories: typeof categoriesType
  /** Optional count to show in the hero stat */
  totalCount?: number
}

/**
 * LibraryHero — top summary band for the substance library.
 *
 * Phase 3 redesign (plan §6.1). Replaces the abrupt "All Substances" heading
 * with a proper daisyUI `hero` containing:
 *   - page title
 *   - one-line harm-reduction framing copy
 *   - a single `stats` row showing total substance count + active filter
 *
 * The hero is intentionally restrained — no gradients, no glow. The library
 * is a reference surface, not a marketing page.
 */
export function LibraryHero({ selectedCategory, categories, totalCount }: LibraryHeroProps) {
  const activeCategoryInfo =
    selectedCategory === 'all'
      ? null
      : categories.find((c) => c.id === selectedCategory) ?? null

  const title = activeCategoryInfo ? activeCategoryInfo.name : 'Substance Library'
  const description = activeCategoryInfo
    ? activeCategoryInfo.description
    : 'Browse psychoactive substances with routes, effects, interactions, and harm-reduction notes.'

  return (
    <section className="mb-6">
      <div className="hero rounded-box border border-base-300/70 bg-base-100/70 backdrop-blur-sm shadow-sm">
        <div className="hero-content w-full flex-col items-start gap-4 p-5 md:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-2">
            <div className="badge badge-outline gap-1 text-xs">
              <Shield className="h-3 w-3" />
              Harm reduction reference
            </div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
            <p className="text-sm text-neutral-content leading-relaxed md:text-base">
              {description}
            </p>
          </div>

          {typeof totalCount === 'number' && (
            <div className="stats stats-horizontal border border-base-300/70 bg-base-200/60 shadow-sm">
              <div className="stat">
                <div className="stat-title text-xs">
                  {activeCategoryInfo ? 'In category' : 'Substances'}
                </div>
                <div className="stat-value text-2xl">{totalCount}</div>
                <div className="stat-desc text-xs">
                  {selectedCategory === 'all' ? 'Total documented' : 'Documented here'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
