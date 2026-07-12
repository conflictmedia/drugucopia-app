'use client'

import { usePathname } from 'next/navigation'
import { FlaskConical, Activity, BarChart3, Shield } from 'lucide-react'
import { NAV_ITEMS, isNavItemActive } from './navigation'
import { cn } from '@/lib/utils'

export function BottomNav() {
  const pathname = usePathname()

  const bottomNavIds = ['library', 'track', 'analytics', 'safety']

  return (
    <nav
      className="mobile-nav hidden md:flex"
      role="navigation"
      aria-label="Main navigation"
    >
      {NAV_ITEMS.filter(item => bottomNavIds.includes(item.id)).map((item) => {
        const isActive = isNavItemActive(item, pathname)
        const Icon = item.icon

        return (
          <a
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
          </a>
        )
      })}
    </nav>
  )
}