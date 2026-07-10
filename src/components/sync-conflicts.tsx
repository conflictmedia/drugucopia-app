'use client'

import { AlertTriangle, X, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSync, type DoseConflict } from '@/contexts/sync-context'
import { format } from 'date-fns'
import { formatDoseAmount } from '@/lib/utils'

/**
 * D2 — Pending sync conflicts banner + per-conflict resolution UI.
 *
 * Renders above the dose history list when one or more conflicts are
 * pending. Each conflict shows the local version vs. the remote version
 * side by side, plus three resolution buttons:
 *
 *   - Keep mine (local wins, pushes to remote on next sync)
 *   - Keep theirs (remote wins, local changes discarded)
 *   - Keep both (remote stays, local version is duplicated with a new ID)
 *
 * The user can also dismiss a conflict without resolving — but the
 * conflict will re-surface on the next sync if both sides still differ.
 */
export function SyncConflicts() {
  const { pendingConflicts, resolveConflict, dismissConflict } = useSync()

  if (pendingConflicts.length === 0) return null

  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-300">
            {pendingConflicts.length} sync conflict{pendingConflicts.length !== 1 ? 's' : ''} need{pendingConflicts.length === 1 ? 's' : ''} review
          </h3>
          <p className="text-xs text-amber-700/80 dark:text-amber-300/80 mt-0.5">
            Two devices edited the same dose since the last sync. Pick which version to keep — the other will be discarded (or pick &ldquo;keep both&rdquo; to duplicate).
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {pendingConflicts.map((c) => (
          <ConflictRow
            key={c.id}
            conflict={c}
            onResolve={(choice) => resolveConflict(c.id, choice)}
            onDismiss={() => dismissConflict(c.id)}
          />
        ))}
      </div>
    </div>
  )
}

function ConflictRow({
  conflict,
  onResolve,
  onDismiss,
}: {
  conflict: DoseConflict
  onResolve: (choice: 'local' | 'remote' | 'both') => void
  onDismiss: () => void
}) {
  const { local, remote } = conflict
  return (
    <div className="rounded-md border border-amber-500/30 bg-base-100/60 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium truncate">{local.substanceName}</span>
        <button
          type="button"
          onClick={onDismiss}
          className="text-neutral-content/60 hover:text-base-content transition-colors shrink-0"
          aria-label="Dismiss this conflict"
          title="Dismiss (will re-surface on next sync if unresolved)"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-2 items-stretch">
        <VersionCard label="Your version" dose={local} accent="local" />
        <div className="hidden sm:flex items-center justify-center">
          <ArrowRight className="h-4 w-4 text-neutral-content/60" />
        </div>
        <VersionCard label="Synced version" dose={remote} accent="remote" />
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => onResolve('local')}
        >
          Keep mine
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => onResolve('remote')}
        >
          Keep theirs
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => onResolve('both')}
        >
          Keep both (duplicate)
        </Button>
      </div>
    </div>
  )
}

function VersionCard({
  label,
  dose,
  accent,
}: {
  label: string
  dose: import('@/types').DoseLog
  accent: 'local' | 'remote'
}) {
  const formatted = formatDoseAmount(dose.amount, dose.unit)
  const accentClass =
    accent === 'local'
      ? 'border-primary/30 bg-primary/5'
      : 'border-blue-500/30 bg-blue-500/5'
  return (
    <div className={`rounded-md border p-2 text-xs space-y-1 ${accentClass}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-[10px] uppercase tracking-wider text-neutral-content">
          {label}
        </span>
        <span className="text-[10px] text-neutral-content/70 tabular-nums">
          {format(new Date(dose.updatedAt || dose.createdAt), 'MMM d, h:mm a')}
        </span>
      </div>
      <div className="text-sm font-medium">
        {formatted.amount} {formatted.unit} · {dose.route}
      </div>
      <div className="text-neutral-content text-[11px]">
        {dose.mood && <span className="mr-2">Mood: {dose.mood}</span>}
        {dose.setting && <span>Setting: {dose.setting}</span>}
        {!dose.mood && !dose.setting && <span className="italic opacity-60">No mood/setting</span>}
      </div>
      {dose.notes && (
        <p className="text-[11px] text-base-content/80 leading-relaxed whitespace-pre-wrap break-words line-clamp-3">
          {dose.notes}
        </p>
      )}
    </div>
  )
}
