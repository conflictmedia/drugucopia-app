'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
  threshold?: number
  className?: string
}

export function PullToRefresh({
  onRefresh,
  children,
  threshold = 60,
  className,
}: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const indicatorRef = useRef<HTMLDivElement>(null)
  const [isPulling, setIsPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startY = useRef<number | null>(null)
  const observer = useRef<IntersectionObserver | null>(null)

  // Create a sentinel element at the top to detect overscroll
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    const sentinel = sentinelRef.current
    if (!container || !sentinel) return

    observer.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0) {
          // Sentinel is visible = user has pulled down past threshold
          setIsPulling(true)
        } else if (isPulling && !isRefreshing) {
          // Sentinel hidden = user released, trigger refresh
          triggerRefresh()
        }
      },
      {
        root: container,
        rootMargin: `${threshold}px 0px 0px 0px`,
        threshold: 0,
      }
    )

    observer.current.observe(sentinel)

    return () => {
      observer.current?.disconnect()
    }
  }, [threshold, isPulling, isRefreshing])

  const triggerRefresh = useCallback(async () => {
    if (isRefreshing) return
    setIsRefreshing(true)
    setIsPulling(false)
    setPullDistance(0)

    try {
      await onRefresh()
      // Haptic feedback on refresh complete
      if (typeof window !== 'undefined' && 'navigator' in window) {
        const haptics = (window as any).__TAURI_HAPTICS__
        if (haptics?.success) {
          haptics.success()
        }
      }
    } catch (error) {
      console.error('Pull to refresh failed:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [onRefresh, isRefreshing])

  // Touch handling for more precise control
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isRefreshing) return
    const container = containerRef.current
    if (!container || container.scrollTop > 0) return
    startY.current = e.touches[0].clientY
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isRefreshing || startY.current === null) return
    const container = containerRef.current
    if (!container || container.scrollTop > 0) return

    const currentY = e.touches[0].clientY
    const distance = currentY - startY.current

    if (distance > 0) {
      setPullDistance(Math.min(distance, threshold * 1.5))
      setIsPulling(true)
    }
  }

  const handleTouchEnd = () => {
    if (isRefreshing || !isPulling) return
    if (pullDistance >= threshold) {
      triggerRefresh()
    } else {
      setIsPulling(false)
      setPullDistance(0)
    }
    startY.current = null
  }

  const indicatorStyle: React.CSSProperties = {
    height: Math.max(pullDistance, isRefreshing ? threshold : 0),
    opacity: isPulling || isRefreshing ? 1 : 0,
    transition: 'height 0.15s ease-out, opacity 0.2s ease-out',
  }

  return (
    <div
      ref={containerRef}
      className={cn('overflow-y-auto', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ overscrollBehavior: 'none' }}
    >
      {/* Sentinel element for IntersectionObserver */}
      <div
        ref={sentinelRef}
        style={{ height: '1px', marginTop: `-${threshold}px` }}
        aria-hidden="true"
      />

      {/* Refresh indicator */}
      <div
        ref={indicatorRef}
        className={cn(
          'pull-indicator flex items-center justify-center transition-all duration-150',
          isRefreshing && 'animate-pulse'
        )}
        style={indicatorStyle}
        role="status"
        aria-live="polite"
        aria-label={isRefreshing ? 'Refreshing...' : 'Pull to refresh'}
      >
        {isRefreshing ? (
          <>
            <svg
              className="animate-spin h-5 w-5 text-primary"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="ml-2 text-sm">Refreshing...</span>
          </>
        ) : pullDistance > 0 ? (
          <>
            <svg
              className={cn(
                'h-5 w-5 text-neutral-content transition-transform duration-150',
                pullDistance >= threshold && 'rotate-180'
              )}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
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