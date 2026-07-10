'use client'

import {
  BookOpen,
  ExternalLink,
  FlaskConical,
  Route as RouteIcon,
  Scale,
  Shuffle,
} from 'lucide-react'
import type { Substance } from '@/lib/types'
import { categories } from '@/lib/categories'
import { categoryColors } from '../home-constants'
import { getRouteIcon, getSubstanceCategories } from '../home-utils'
import { cn } from '@/lib/utils'

interface SubstanceQuickFactsProps {
  substance: Substance
  /** Router push callback for the "Full interaction checker" CTA */
  onOpenInteractions: () => void
}

/**
 * SubstanceQuickFacts — right-rail quick-reference card.
 *
 * Phase 3 redesign (plan §6.1 "right rail on desktop only for quick actions,
 * log dose, external links"). Renders a single card with:
 *   - categories (with category color chips)
 *   - chemical class
 *   - routes of administration
 *   - legal status
 *   - "Full interaction checker" CTA
 *   - external PsychonautWiki link
 *
 * On mobile this card stacks below the tab group; on desktop it lives in the
 * right rail (lg:col-span-1).
 */
export function SubstanceQuickFacts({ substance, onOpenInteractions }: SubstanceQuickFactsProps) {
  const cats = getSubstanceCategories(substance)
  const routes = substance.routeData ? Object.keys(substance.routeData) : []

  return (
    <aside className="space-y-4">
      <div className="card border border-base-300/70 bg-base-100/70 backdrop-blur-sm shadow-sm">
        <div className="card-body gap-4 p-4 md:p-5">
          <h2 className="card-title text-base">Quick facts</h2>

          <dl className="space-y-3 text-sm">
            {/* Categories */}
            <div className="flex items-start gap-3">
              <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-neutral-content" />
              <div className="min-w-0 flex-1">
                <dt className="text-xs text-neutral-content">
                  {cats.length > 1 ? 'Categories' : 'Category'}
                </dt>
                <dd className="mt-1 flex flex-wrap gap-1">
                  {cats.map((cat) => {
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
                </dd>
              </div>
            </div>

            {/* Class */}
            <div className="flex items-center gap-3">
              <FlaskConical className="h-4 w-4 shrink-0 text-neutral-content" />
              <div>
                <dt className="text-xs text-neutral-content">Class</dt>
                <dd className="font-medium">{substance.class}</dd>
              </div>
            </div>

            {/* Routes */}
            {routes.length > 0 && (
              <div className="flex items-start gap-3">
                <RouteIcon className="mt-0.5 h-4 w-4 shrink-0 text-neutral-content" />
                <div className="min-w-0 flex-1">
                  <dt className="text-xs text-neutral-content">
                    Routes ({routes.length})
                  </dt>
                  <dd className="mt-1 flex flex-wrap gap-1">
                    {routes.map((route) => (
                      <span
                        key={route}
                        className="inline-flex items-center gap-1 rounded bg-base-200 px-2 py-0.5 text-xs"
                      >
                        <span aria-hidden="true">{getRouteIcon(route)}</span>
                        {route}
                      </span>
                    ))}
                  </dd>
                </div>
              </div>
            )}

            {/* Legality */}
            <div className="flex items-start gap-3">
              <Scale className="mt-0.5 h-4 w-4 shrink-0 text-neutral-content" />
              <div>
                <dt className="text-xs text-neutral-content">Legality</dt>
                <dd className="text-sm font-medium">{substance.legality}</dd>
              </div>
            </div>

            {/* Formula */}
            <div className="flex items-start gap-3">
              <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-neutral-content" />
              <div>
                <dt className="text-xs text-neutral-content">Formula</dt>
                <dd className="font-mono text-sm">{substance.chemistry.formula}</dd>
              </div>
            </div>
          </dl>

          <div className="divider my-0" />

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={onOpenInteractions}
              className="btn btn-outline btn-sm gap-2"
            >
              <Shuffle className="h-3.5 w-3.5" />
              Full interaction checker
            </button>

            {substance.psychonautWikiUrl && (
              <a
                href={substance.psychonautWikiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm gap-2"
              >
                <BookOpen className="h-4 w-4" />
                PsychonautWiki
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}
