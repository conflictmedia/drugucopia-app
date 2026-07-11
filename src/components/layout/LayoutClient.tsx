'use client'

import { AlertTriangle } from 'lucide-react'
import { useState, useEffect, useSyncExternalStore, type ReactNode } from 'react'
import { AppSidebar } from './AppSidebar'
import { TopBar } from './TopBar'
import { Toaster } from '@/components/ui/toaster'
import { VisualizerControls } from '@/components/visualizer-controls'
import { MilkdropBackgroundWrapper } from '@/components/milkdrop-background-wrapper'
import { SyncProvider } from '@/contexts/sync-context'
import { ReminderProvider } from '@/components/reminder-provider'
import { CommandPalette } from '@/components/command-palette'
import { DoseLoggerModal } from '@/components/dose-logger-modal'
import { useUIStore } from '@/store/ui-store'

interface LayoutClientProps {
  children: ReactNode
}

const DRAWER_ID = 'app-shell-drawer'

export function LayoutClient({ children }: LayoutClientProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [sidebarExpanded, setSidebarExpanded] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem('drugucopia-sidebar-expanded') === 'true'
  })
  const { doseLoggerOpen, doseLoggerPreselect, closeDoseLogger } = useUIStore()
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  )
  const isMobile = useSyncExternalStore(
    (callback) => {
      window.addEventListener('resize', callback)
      return () => window.removeEventListener('resize', callback)
    },
    () => window.innerWidth < 768,
    () => false,
  )

  // ── Android back button: close drawer / dose logger when open ──
  useEffect(() => {
    const handlePopState = () => {
      // If the drawer is open, close it and consume the back navigation
      if (drawerOpen) {
        setDrawerOpen(false)
        return
      }
      // If the dose logger modal is open, close it
      if (doseLoggerOpen) {
        closeDoseLogger()
        return
      }
    }

    // Push a history entry when the drawer/modal opens so the back
    // button has something to pop. When it closes, we don't push.
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [drawerOpen, doseLoggerOpen, closeDoseLogger])

  // Push a history entry when drawer opens (so Android back can pop it)
  useEffect(() => {
    if (drawerOpen) {
      window.history.pushState({ drawerOpen: true }, '')
    }
  }, [drawerOpen])

  // Push a history entry when dose logger opens
  useEffect(() => {
    if (doseLoggerOpen) {
      window.history.pushState({ doseLoggerOpen: true }, '')
    }
  }, [doseLoggerOpen])

  if (!mounted) {
    return (
      <div className="min-h-[100dvh] bg-transparent">
        <div className="flex h-[100dvh] items-center justify-center">
          <div className="loading loading-spinner loading-lg text-primary" />
        </div>
      </div>
    )
  }

  const toggleSidebar = () => {
    const next = !sidebarExpanded
    setSidebarExpanded(next)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('drugucopia-sidebar-expanded', String(next))
    }
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
  }

  return (
    <SyncProvider>
      <ReminderProvider>
        <div className="min-h-[100dvh] bg-transparent">
          <MilkdropBackgroundWrapper />

          {isMobile ? (
            <div className="drawer">
              <input
                id={DRAWER_ID}
                type="checkbox"
                className="drawer-toggle"
                checked={drawerOpen}
                onChange={(event) => setDrawerOpen(event.target.checked)}
              />

              <div className="drawer-content flex min-h-[100dvh] flex-col">
                <TopBar
                  onMenuClick={() => setDrawerOpen(true)}
                />

                <main className="relative flex-1 pb-[env(safe-area-inset-bottom,0px)]">
                  {children}
                </main>
              </div>

              <div className="drawer-side z-40 pb-[env(safe-area-inset-bottom,0px)]">
                {/* Click overlay closes drawer — using a div instead of
                    a <label> so we have full control and can also prevent
                    the click from toggling the checkbox unexpectedly */}
                <div
                  aria-label="close navigation"
                  className="drawer-overlay"
                  onClick={closeDrawer}
                  onKeyDown={(e) => { if (e.key === 'Escape') closeDrawer() }}
                  role="button"
                  tabIndex={-1}
                />
                <AppSidebar
                  expanded
                  onNavigate={closeDrawer}
                  onToggle={toggleSidebar}
                />
              </div>
            </div>
          ) : (
            <div className="flex min-h-[100dvh]">
              <AppSidebar
                expanded={sidebarExpanded}
                onToggle={toggleSidebar}
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <TopBar
                  onMenuClick={() => setDrawerOpen(true)}
                />
                <main className="relative flex-1 pb-[env(safe-area-inset-bottom,0px)]">
                  {children}
                </main>
              </div>
            </div>
          )}

          {!isMobile && (
            <div
              className={[
                'pointer-events-none fixed bottom-0 right-0 z-30 hidden border-t border-warning/20 bg-base-100/95 backdrop-blur-sm md:block',
                sidebarExpanded ? 'left-60' : 'left-16',
              ].join(' ')}
            >
              <div className="flex items-center justify-center gap-2 px-4 py-1.5 text-xs text-warning">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>Educational and harm reduction purposes only. Always consult medical professionals.</span>
              </div>
            </div>
          )}

          <DoseLoggerModal
            open={doseLoggerOpen}
            onOpenChange={(open) => !open && closeDoseLogger()}
            preselectedSubstanceId={doseLoggerPreselect?.substanceId}
            preselectedSubstanceName={doseLoggerPreselect?.substanceName}
            preselectedCategory={doseLoggerPreselect?.category}
            preselectedRoute={doseLoggerPreselect?.route}
          />
          <CommandPalette />
          {!isMobile && <VisualizerControls />}
          <Toaster />
        </div>
      </ReminderProvider>
    </SyncProvider>
  )
}
