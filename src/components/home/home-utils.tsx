import { categories } from '@/lib/categories'
import type { Substance, SubstanceCategory } from '@/lib/substances/index'
import { categoryColors, categoryIcons, routeIconMap } from './home-constants'

export function getRouteIcon(route: string) {
  return routeIconMap[route] || '•'
}

export function getSubstanceCategories(substance: Substance): SubstanceCategory[] {
  return substance.categories ?? []
}

export function getPrimaryCategory(substance: Substance): SubstanceCategory | null {
  return getSubstanceCategories(substance)[0] ?? null
}

export function substanceBelongsToCategory(
  substance: Substance,
  filter: SubstanceCategory | 'all'
): boolean {
  if (filter === 'all') return true
  return getSubstanceCategories(substance).includes(filter)
}

export function CategoryBadges({ substance, className = '' }: { substance: Substance; className?: string }) {
  const cats = getSubstanceCategories(substance)
  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {cats.map((cat) => {
        const info = categories.find((c) => c.id === cat)
        return (
          <span key={cat} className={`badge badge-outline ${categoryColors[cat] ?? ''}`}>
            {info?.name ?? cat}
          </span>
        )
      })}
    </div>
  )
}

export function CategoryIcon({ substance, className = '' }: { substance: Substance; className?: string }) {
  const primary = getPrimaryCategory(substance)
  if (!primary) return null
  const Icon = categoryIcons[primary]
  return <Icon className={className} />
}
