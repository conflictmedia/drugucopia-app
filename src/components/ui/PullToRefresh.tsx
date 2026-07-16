'use client'

import { useCallback, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
  threshold?: number
  className?: string
}

/** Find the element that actually owns vertical scrolling.
 *
 * PullToRefresh used to make its wrapper a second `overflow-y-auto` region.
 * In the Android WebView that nested scroller captured touch gestures while
 * the app shell's <main> element owned the real scroll position. The wrapper's
 * scrollTop consequently stayed at zero and almost every downward gesture was
 * misread as pull-to-refresh.
 */
function findScrollParent(element: HTMLElement | null): HTMLElement | null {
  let parent = element?.parentElement ?? null

  while (parent) {
    const { overflowY } = window.getComputedStyle(parent)
    if (overflowY === 'auto' || overflowY === 'scroll') return parent
    parent = parent.parentElement
  }

  return document.scrollingElement instanceof HTMLElement
    ? document.scrollingElement
    : document.documentElement
}

export function PullToRefresh({
  onRefresh,
  children,
  threshold = 60,
  className,
}: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const startY = useRef<number | null>(null)
  const trackingPull = useRef(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const triggerRefresh = useCallback(async () => {
    if (isRefreshing) return

    setIsRefreshing(true)
    setPullDistance(0)
    trackingPull.current = false

    try {
      await onRefresh()

      const haptics = (window as Window & {
        __TAURI_HAPTICS__?: { success?: () => void }
      }).__TAURI_HAPTICS__
      haptics?.success?.()
    } catch (error) {
      console.error('Pull to refresh failed:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [isRefreshing, onRefresh])

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (isRefreshing || event.touches.length !== 1) return

    const scrollParent = findScrollParent(containerRef.current)
    if (scrollParent && scrollParent.scrollTop > 0) return

    startY.current = event.touches[0].clientY
    trackingPull.current = true
  }

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!trackingPull.current || startY.current === null || isRefreshing) return

    const scrollParent = findScrollParent(containerRef.current)
    if (scrollParent && scrollParent.scrollTop > 0) {
      trackingPull.current = false
      startY.current = null
      setPullDistance(0)
      return
    }

    const distance = event.touches[0].clientY - startY.current
    if (distance <= 0) {
      // An upward finger movement is ordinary downward page scrolling.
      // Stop tracking it immediately and leave the browser in full control.
      trackingPull.current = false
      startY.current = null
      setPullDistance(0)
      return
    }

    // Apply resistance so the indicator does not chase the finger one-to-one.
    setPullDistance(Math.min(distance * 0.5, threshold * 1.5))
  }

  const finishPull = () => {
    if (!trackingPull.current || isRefreshing) return

    const shouldRefresh = pullDistance >= threshold
    trackingPull.current = false
    startY.current = null
    setPullDistance(0)

    if (shouldRefresh) void triggerRefresh()
  }

  const indicatorHeight = isRefreshing ? threshold : pullDistance

  return (
    <div
      ref={containerRef}
      className={cn('min-w-0 touch-pan-y', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={finishPull}
      onTouchCancel={finishPull}
    >
      <div
        className={cn(
          'flex items-center justify-center overflow-hidden transition-[height,opacity] duration-150',
          isRefreshing && 'animate-pulse',
        )}
        style={{
          height: indicatorHeight,
          opacity: indicatorHeight > 0 ? 1 : 0,
        }}
        role="status"
        aria-live="polite"
        aria-label={isRefreshing ? 'Refreshing...' : 'Pull to refresh'}
      >
        {isRefreshing ? (
          <>
            <span className="loading loading-spinner loading-sm text-primary" />
            <span className="ml-2 text-sm">Refreshing...</span>
          </>
        ) : pullDistance > 0 ? (
          <>
            <svg
              className={cn(
                'h-5 w-5 text-neutral-content transition-transform duration-150',
                pullDistance >= threshold && 'rotate-180',
              )}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
            <span className="ml-2 text-sm">
              {pullDistance >= threshold ? 'Release to refresh' : 'Pull to refresh'}
            </span>
          </>
        ) : null}
      </div>

      {children}
    </div>
  )
}
