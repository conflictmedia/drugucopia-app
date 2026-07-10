'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { Clock, Droplets, Info, Route as RouteIcon, Syringe } from 'lucide-react'
import type { RouteDosageDuration, Substance } from '@/lib/types'
import { routeDangerColors } from '../home-constants'
import { getRouteIcon } from '../home-utils'
import { cn } from '@/lib/utils'

interface DosageDurationPanelProps {
  substance: Substance
  onRouteChange?: (route: string | null) => void
}

/**
 * DosageDurationPanel — Phase 3 cleaned-up version of the dosage + duration
 * + routes-comparison block from the old home-content.tsx.
 *
 * Uses standardized daisyUI cards (no more `card-transparent`) and reserves
 * color for severity (route danger, dose level) instead of decoration.
 */
export function DosageDurationPanel({
  substance,
  onRouteChange,
}: DosageDurationPanelProps) {
  const hasRouteData = substance.routeData && Object.keys(substance.routeData).length > 0
  const initialRoute = hasRouteData ? Object.keys(substance.routeData!)[0] : null
  const [selectedRoute, setSelectedRoute] = useState<string | null>(initialRoute)
  const prevIdRef = useRef(substance.id)

  useEffect(() => {
    onRouteChange?.(selectedRoute)
  }, [selectedRoute, onRouteChange])

  useEffect(() => {
    if (prevIdRef.current !== substance.id) {
      prevIdRef.current = substance.id
      setSelectedRoute(hasRouteData ? Object.keys(substance.routeData!)[0] : null)
    }
  }, [substance.id, hasRouteData, substance.routeData])

  const currentDosage = useMemo(() => {
    if (selectedRoute && substance.routeData?.[selectedRoute]) {
      return substance.routeData[selectedRoute].dosage ?? {}
    }
    return {}
  }, [selectedRoute, substance])

  const currentDuration = useMemo(() => {
    if (selectedRoute && substance.routeData?.[selectedRoute]) {
      return substance.routeData[selectedRoute].duration ?? {}
    }
    return {}
  }, [selectedRoute, substance])

  const currentNotes = useMemo(() => {
    if (selectedRoute && substance.routeData?.[selectedRoute]) {
      return substance.routeData[selectedRoute].notes
    }
    return null
  }, [selectedRoute, substance])

  if (!hasRouteData) {
    return (
      <p className="py-2 text-center text-xs text-neutral-content opacity-70">
        Route-specific data not available for this substance.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {/* Route selector */}
      <div className="card border border-base-300/70 bg-base-100/70 backdrop-blur-sm shadow-sm">
        <div className="card-body gap-3 p-4 md:p-5">
          <h3 className="card-title flex items-center gap-2 text-base">
            <Syringe className="h-4 w-4" />
            Route of administration
          </h3>
          <p className="text-xs text-neutral-content">
            Dosage and duration vary significantly by route.
          </p>

          <div className="scrollbar-none -mx-1 mt-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {Object.keys(substance.routeData!).map((route) => {
              const isSelected = selectedRoute === route
              const dangerClass = routeDangerColors[route] ?? ''
              return (
                <button
                  key={route}
                  type="button"
                  onClick={() => setSelectedRoute(route)}
                  className={cn(
                    'btn btn-sm shrink-0 gap-1',
                    isSelected ? 'btn-primary' : 'btn-ghost border border-base-300 hover:bg-base-200',
                    !isSelected && dangerClass,
                  )}
                >
                  <span aria-hidden="true">{getRouteIcon(route)}</span>
                  {route}
                </button>
              )
            })}
          </div>

          {currentNotes && (
            <div className="alert alert-info mt-2 py-2">
              <Info className="h-4 w-4 shrink-0" />
              <span className="text-xs leading-relaxed">{currentNotes}</span>
            </div>
          )}
        </div>
      </div>

      {/* Dosage + Duration grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        <DosageCard dosage={currentDosage} route={selectedRoute} />
        <DurationCard duration={currentDuration} route={selectedRoute} />
      </div>

      {/* Routes comparison table (only when > 1 route) */}
      {Object.keys(substance.routeData!).length > 1 && (
        <div className="card border border-base-300/70 bg-base-100/70 backdrop-blur-sm shadow-sm">
          <div className="card-body gap-3 p-4 md:p-5">
            <h3 className="card-title flex items-center gap-2 text-base">
              <RouteIcon className="h-4 w-4" />
              Routes comparison
            </h3>
            <div className="overflow-x-auto">
              <table className="table table-xs">
                <thead>
                  <tr>
                    <th>Route</th>
                    <th>Common dose</th>
                    <th>Onset</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(Object.entries(substance.routeData!) as [string, RouteDosageDuration][]).map(
                    ([route, data]) => (
                      <tr
                        key={route}
                        className={cn(
                          'cursor-pointer hover',
                          selectedRoute === route && 'active',
                        )}
                        onClick={() => setSelectedRoute(route)}
                      >
                        <td className="font-medium">
                          <span className="flex items-center gap-1">
                            <span aria-hidden="true">{getRouteIcon(route)}</span>
                            <span>{route}</span>
                            {selectedRoute === route && (
                              <span className="text-xs text-primary">●</span>
                            )}
                          </span>
                        </td>
                        <td className="font-mono text-neutral-content">{data.dosage.common}</td>
                        <td className="font-mono text-neutral-content">{data.duration.onset}</td>
                        <td className="font-mono text-neutral-content">{data.duration.total}</td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sub-cards ─────────────────────────────────────────────────────────────

const dosageLevelColors: Record<string, string> = {
  threshold: 'text-blue-500 bg-blue-500/10',
  light: 'text-green-500 bg-green-500/10',
  common: 'text-yellow-500 bg-yellow-500/10',
  strong: 'text-orange-500 bg-orange-500/10',
  heavy: 'text-red-500 bg-red-500/10',
}

function DosageCard({
  dosage,
  route,
}: {
  dosage: Record<string, string>
  route: string | null
}) {
  return (
    <div className="card border border-base-300/70 bg-base-100/70 backdrop-blur-sm shadow-sm">
      <div className="card-body gap-2 p-4 md:p-5">
        <h3 className="card-title flex items-center gap-2 text-base">
          <Droplets className="h-4 w-4" />
          Dosage
          {route && (
            <span className="badge badge-outline ml-auto text-xs font-normal">
              {getRouteIcon(route)} {route}
            </span>
          )}
        </h3>
        <div className="space-y-1">
          {Object.entries(dosage).map(([level, amount]) => (
            <div
              key={level}
              className="flex items-center justify-between border-b border-base-300 py-2 last:border-0"
            >
              <span
                className={cn(
                  'rounded px-2 py-0.5 text-xs font-medium capitalize',
                  dosageLevelColors[level] ?? '',
                )}
              >
                {level}
              </span>
              <span className="badge badge-secondary font-mono text-xs">{amount}</span>
            </div>
          ))}
          {Object.keys(dosage).length === 0 && (
            <p className="py-2 text-xs text-neutral-content">No dosage data for this route.</p>
          )}
        </div>
      </div>
    </div>
  )
}

const durationPhaseColors: Record<string, string> = {
  onset: 'text-blue-500 bg-blue-500/10',
  comeup: 'text-amber-500 bg-amber-500/10',
  peak: 'text-purple-500 bg-purple-500/10',
  offset: 'text-cyan-500 bg-cyan-500/10',
  total: 'text-green-500 bg-green-500/10',
}

function DurationCard({
  duration,
  route,
}: {
  duration: Record<string, string>
  route: string | null
}) {
  return (
    <div className="card border border-base-300/70 bg-base-100/70 backdrop-blur-sm shadow-sm">
      <div className="card-body gap-2 p-4 md:p-5">
        <h3 className="card-title flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" />
          Duration
          {route && (
            <span className="badge badge-outline ml-auto text-xs font-normal">
              {getRouteIcon(route)} {route}
            </span>
          )}
        </h3>
        <div className="space-y-1">
          {Object.entries(duration).map(([phase, time]) => (
            <div
              key={phase}
              className="flex items-center justify-between border-b border-base-300 py-2 last:border-0"
            >
              <span
                className={cn(
                  'rounded px-2 py-0.5 text-xs font-medium capitalize',
                  durationPhaseColors[phase] ?? '',
                )}
              >
                {phase}
              </span>
              <span className="badge badge-secondary max-w-[160px] whitespace-normal text-right font-mono text-xs">
                {time}
              </span>
            </div>
          ))}
          {Object.keys(duration).length === 0 && (
            <p className="py-2 text-xs text-neutral-content">No duration data for this route.</p>
          )}
        </div>
      </div>
    </div>
  )
}
