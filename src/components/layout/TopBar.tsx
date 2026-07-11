'use client'

import { Cloud, CloudOff, Loader2, Menu, Plus, AlertCircle } from 'lucide-react'
import { useUIStore } from '@/store/ui-store'
import { formatDistanceToNow } from 'date-fns'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { type MouseEvent, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useSync } from '@/contexts/sync-context'
import { ThemeToggle } from '@/components/theme-toggle'
import { SubstanceSearch } from './SubstanceSearch'
import { getPageTitle } from './navigation'

interface TopBarProps {
  onMenuClick: () => void
}

function SyncStatusButton() {
  const router = useRouter()
  const { syncStatus, lastSyncedAt } = useSync()
  const [, setTick] = useState(0)

  useEffect(() => {
    if (syncStatus !== 'synced') return
    const id = window.setInterval(() => setTick((tick) => tick + 1), 30_000)
    return () => window.clearInterval(id)
  }, [syncStatus])

  const label =
    syncStatus === 'synced'
      ? lastSyncedAt
        ? `Synced ${formatDistanceToNow(new Date(lastSyncedAt), {
          addSuffix: true,
        })}`
        : 'Synced'
      : syncStatus === 'connecting'
        ? 'Connecting to sync…'
        : syncStatus === 'error'
          ? 'Sync error'
          : 'Sync off'

return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        'relative min-h-[44px] min-w-[44px]',
        syncStatus === 'synced' && 'text-success',
        syncStatus === 'connecting' && 'text-warning',
        syncStatus === 'error' && 'text-error',
        syncStatus === 'idle' && 'text-neutral-content',
      )}
      onClick={() => router.push('/dose-log')}
      aria-label={label}
      title={label}
    >
      {syncStatus === 'synced' && <Cloud className="h-4 w-4" />}
      {syncStatus === 'connecting' && <Loader2 className="h-4 w-4 animate-spin" />}
      {syncStatus === 'error' && <AlertCircle className="h-4 w-4" />}
      {syncStatus === 'idle' && <CloudOff className="h-4 w-4" />}
      {syncStatus === 'synced' && (
        <span
          aria-hidden="true"
          className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-success"
        />
      )}
    </Button>
  )
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const queryParam = searchParams.get('q') ?? ''
  const title = getPageTitle(pathname)
  const openDoseLogger = useUIStore((state) => state.openDoseLogger)

  const handleDoseLogClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    openDoseLogger()
  }

  // Clicking the brand title navigates to the Library view (bare `/`).
  // Track is now its own page (/dose-log), so Library↔Track are always
  // cross-page navigations — `router.push` works reliably and the
  // same-pathname `window.location` workaround is no longer needed.
  const handleTitleClick = () => {
    if (pathname === '/') return
    router.push('/')
  }

  return (
    <header className="sticky top-0 z-30 border-b border-base-300 bg-base-100/90 backdrop-blur pt-[env(safe-area-inset-top,0px)]">
      <div className="navbar min-h-16 gap-2 px-3 sm:px-4 lg:px-5">
        <div className="navbar-start min-w-0 gap-2">
          <button
            type="button"
            className="btn btn-ghost btn-square lg:hidden min-h-[44px] min-w-[44px]"
            onClick={onMenuClick}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={handleTitleClick}
            className="btn btn-ghost btn-sm gap-0 px-2 -ml-1 h-auto py-1 normal-case font-normal min-w-0 min-h-[44px]"
            aria-label="Go to Library"
            title="Go to Library"
          >
            <div className="min-w-0 text-left">
              <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-content">
                Drugucopia
              </div>
              <h1 className="truncate text-lg font-semibold leading-tight">{title}</h1>
            </div>
          </button>
        </div>

        <div className="navbar-center hidden w-full max-w-xl lg:flex">
          <SubstanceSearch
            key={`desktop-search-${pathname}-${queryParam}`}
            showShortcutHint
          />
        </div>

        <div className="navbar-end gap-1 sm:gap-2">
          <Button
            type="button"
            variant="default"
            size="sm"
            className="gap-1.5 min-h-[44px]"
            onClick={handleDoseLogClick}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Log Dose</span>
            <span className="sm:hidden">Log</span>
          </Button>
          <SyncStatusButton />
          <ThemeToggle />
        </div>
      </div>

      {/* Mobile-only search row. The Library/Track toggle that used to
          live here has been removed — Library↔Track navigation is now
          handled by the sidebar / bottom nav, and Track is its own page
          at /dose-log. */}
      <div className="border-t border-base-300/70 px-3 py-3 sm:px-4 lg:hidden">
        <SubstanceSearch key={`mobile-search-${pathname}-${queryParam}`} mobile />
      </div>
    </header>
  )
}
