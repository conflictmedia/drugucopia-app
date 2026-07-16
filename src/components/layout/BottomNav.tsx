'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import { NAV_ITEMS, isNavItemActive } from './navigation'
import { cn } from '@/lib/utils'

interface BottomNavProps {
  /** Fired when the user taps the "More" button to open the full nav drawer. */
  onMoreClick?: () => void
}

export function BottomNav({ onMoreClick }: BottomNavProps) {
  const pathname = usePathname()

  // Keep the four most-used destinations as primary tabs; everything
  // else (Calculators, Custom Substances, Medications, Changelog, …)
  // lives behind the "More" button which opens the drawer.
  const bottomNavIds = ['library', 'track', 'analytics', 'safety'] as const

  return (
    <nav
      className="mobile-nav hidden md:flex"
      role="navigation"
      aria-label="Main navigation"
    >
      {NAV_ITEMS.filter(item => bottomNavIds.includes(item.id as typeof bottomNavIds[number])).map((item) => {
        const isActive = isNavItemActive(item, pathname)
        const Icon = item.icon

        return (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              'mobile-nav-item',
              isActive && 'active'
            )}
            aria-current={isActive ? 'page' : undefined}
            aria-label={item.label}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        )
      })}

      {/* "More" button — opens the drawer (AppSidebar) which lists
          every nav item including Calculators, Custom Substances,
          Medications, Interactions, and Changelog. */}
      <button
        type="button"
        className={cn('mobile-nav-item')}
        onClick={onMoreClick}
        aria-label="More navigation"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
        <span>More</span>
      </button>
    </nav>
  )
}
