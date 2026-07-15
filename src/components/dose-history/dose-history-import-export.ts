'use client'

import { DoseLog } from '@/types'
import { toast } from '@/hooks/use-toast'
import { format } from 'date-fns'

export type ImportResult =
  | { ok: true; doses: DoseLog[] }
  | { ok: false; error: string }

export type ConflictStrategy = 'skip' | 'overwrite'

export interface ImportPreview {
  doses: DoseLog[]
  fileName: string
  duplicateCount: number
  newCount: number
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote inside a quoted field
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  fields.push(current)
  return fields
}

/** Parse a CSV export file produced by exportToCSV. */
function parseCSV(text: string) {
  // Normalise line endings
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter((l) => l.trim())

  if (lines.length < 2) {
    return { ok: false, error: 'CSV file must have a header row and at least one data row.' }
  }

  const headers = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase())

  // Column index lookup — tolerant of extra/missing optional columns
  const col = (name: string) => headers.indexOf(name)

  const requiredHeaders = ['date', 'time', 'substance', 'amount', 'unit', 'route']
  const missing = requiredHeaders.filter((h) => col(h) === -1)
  if (missing.length > 0) {
    return { ok: false, error: `CSV is missing required column(s): ${missing.join(', ')}` }
  }

  const doses: DoseLog[] = []

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i])
    const get = (name: string) => (col(name) !== -1 ? (fields[col(name)] ?? '').trim() : '')

    const dateStr = get('date')
    const timeStr = get('time')
    const timestampStr = `${dateStr}T${timeStr || '00:00:00'}`

    const raw: Record<string, string | string[]> = {
      // id is not in the CSV export so always generate a fresh one
      id: crypto.randomUUID(),
      timestamp: timestampStr,
      substanceName: get('substance'),
      amount: get('amount'),
      unit: get('unit'),
      route: get('route'),
      // categories column uses "; " as separator (matches exportToCSV)
      categories: get('category')
        .split(';')
        .map((c) => c.trim())
        .filter(Boolean),
      mood: get('mood'),
      setting: get('setting'),
      notes: get('notes'),
    }

    try {
      // We'll validate with validateDose inline
      const requiredString = (key: string) => {
        const v = raw[key as keyof typeof raw]
        if (typeof v !== 'string' || v.trim() === '') {
          throw new Error(`Row ${i}: "${key}" must be a non-empty string (got ${JSON.stringify(v)})`)
        }
        return v.trim()
      }

      const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : crypto.randomUUID()
      const timestamp = requiredString('timestamp')
      if (isNaN(Date.parse(timestamp))) {
        throw new Error(`Row ${i}: "timestamp" is not a valid date ("${timestamp}")`)
      }

      const amount = Number(raw.amount)
      if (isNaN(amount) || amount <= 0) {
        throw new Error(`Row ${i}: "amount" must be a positive number (got ${JSON.stringify(raw.amount)})`)
      }

      doses.push({
        id,
        timestamp,
        substanceName: requiredString('substanceName'),
        amount,
        unit: requiredString('unit'),
        route: requiredString('route'),
        categories: Array.isArray(raw.categories)
          ? (raw.categories as unknown[]).map(String)
          : typeof raw.categories === 'string' && raw.categories.trim()
            ? raw.categories.split(';').map((c) => c.trim()).filter(Boolean)
            : [],
        duration: null,
        mood: null,
        setting: null,
        notes: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  }

  if (doses.length === 0) {
    return { ok: false, error: 'No valid dose rows found in the CSV file.' }
  }

  return { ok: true, doses }
}

/** Build an import preview with duplicate detection. */
export function buildPreview(
  parsed: { doses: DoseLog[] },
  fileName: string,
  existingDoses: DoseLog[]
): ImportPreview {
  const existingIds = new Set(existingDoses.map((d) => d.id))
  const duplicateCount = parsed.doses.filter((d) => existingIds.has(d.id)).length
  return {
    doses: parsed.doses,
    fileName,
    duplicateCount,
    newCount: parsed.doses.length - duplicateCount,
  }
}

/** Export all doses to CSV format. */
export function exportToCSV(doses: DoseLog[]) {
  if (doses.length === 0) return toast({ title: 'Nothing to export', variant: 'destructive' })
  const headers = ['Date', 'Time', 'Substance', 'Category', 'Amount', 'Unit', 'Route', 'Total Duration', 'Mood', 'Setting', 'Notes']
  const escapeCSV = (value: unknown) => value == null ? '""' : `"${String(value).replace(/"/g, '""')}"`
  const rows = doses.map((d) => {
    const dateObj = new Date(d.timestamp)
    return [
      format(dateObj, 'yyyy-MM-dd'), format(dateObj, 'HH:mm:ss'),
      d.substanceName, (d.categories || []).join('; '),
      d.amount, d.unit, d.route, d.duration?.total || '',
      d.mood || '', d.setting || '', d.notes || '',
    ].map(escapeCSV).join(',')
  })
  const blob = new Blob([[headers.map(escapeCSV).join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `dose-history-${format(new Date(), 'yyyy-MM-dd')}.csv`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  toast({ title: 'CSV exported', description: `${doses.length} dose(s) exported.` })
}

/** Export all doses to JSON format. */
export function exportToJSON(doses: DoseLog[]) {
  if (doses.length === 0) return toast({ title: 'Nothing to export', variant: 'destructive' })
  const exportData = {
    exportedAt: new Date().toISOString(),
    exportedAtFormatted: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
    totalDoses: doses.length,
    doses: doses.map((d) => ({
      id: d.id,
      timestamp: d.timestamp,
      timestampFormatted: format(new Date(d.timestamp), 'yyyy-MM-dd HH:mm:ss'),
      substanceName: d.substanceName,
      categories: d.categories ?? [],
      amount: d.amount,
      unit: d.unit,
      route: d.route,
      duration: d.duration ?? null,
      mood: d.mood ?? null,
      setting: d.setting ?? null,
      notes: d.notes ?? null,
      createdAt: d.createdAt ?? null,
      updatedAt: d.updatedAt ?? null,
    })),
  }
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `dose-history-${format(new Date(), 'yyyy-MM-dd')}.json`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  toast({ title: 'JSON exported', description: `${doses.length} dose(s) exported.` })
}

/** Confirm and execute the import with the chosen conflict strategy. */
export async function confirmImport(
  strategy: ConflictStrategy,
  options: {
    importPreview: ImportPreview
    doses: DoseLog[]
    addDoses: (doses: DoseLog[]) => void
    replaceDoses: (doses: DoseLog[]) => void
    pushToSync: () => void
    setIsImporting: (v: boolean) => void
    setImportPreview: (v: ImportPreview | null) => void
  }
): Promise<void> {
  if (!options.importPreview) return
  options.setIsImporting(true)

  const existingIds = new Set(options.doses.map((d) => d.id))
  let added = 0
  let skipped = 0
  let overwritten = 0

  for (const dose of options.importPreview.doses) {
    if (existingIds.has(dose.id)) {
      if (strategy === 'skip') {
        skipped++
        continue
      }
      overwritten++
    }
    added++
  }

  // Stamp all imported doses with a fresh updatedAt so they win last-writer-wins
  const nowIso = new Date().toISOString()
  const stampedDoses = options.importPreview.doses.map(d => ({
    ...d,
    updatedAt: nowIso,
    createdAt: d.createdAt ?? nowIso,
  }))
  const toAdd = stampedDoses.filter(d => !existingIds.has(d.id) || strategy === 'overwrite')

  if (strategy === 'overwrite') {
    // replaceDoses handles removing old versions of incoming IDs
    options.replaceDoses(stampedDoses)
  } else {
    options.addDoses(toAdd)
  }

  options.setIsImporting(false)
  options.setImportPreview(null)

  const parts: string[] = []
  if (added > 0) parts.push(`${added} added`)
  if (overwritten > 0) parts.push(`${overwritten} overwritten`)
  if (skipped > 0) parts.push(`${skipped} skipped`)

  toast({
    title: 'Import complete',
    description: parts.join(', ') + '.',
  })

  // Explicitly trigger sync pushes for bulk operations
  options.pushToSync()
  setTimeout(() => { options.pushToSync() }, 3500)
}

/** Handle bulk deletion of all doses. */
export async function handleDeleteAll(
  doses: DoseLog[],
  clearAllDoses: () => void,
  pushToSync: () => void,
  setIsDeletingAll: (v: boolean) => void,
  setShowDeleteAllDialog: (v: boolean) => void,
  setDeleteConfirmText: (v: string) => void
): Promise<void> {
  const doseCount = doses.length
  setIsDeletingAll(true)

  clearAllDoses()

  setIsDeletingAll(false)
  setShowDeleteAllDialog(false)
  setDeleteConfirmText('')

  toast({
    title: 'All doses deleted',
    description: `${doseCount} dose${doseCount !== 1 ? 's' : ''} permanently deleted.`,
  })

  pushToSync()
  setTimeout(() => { pushToSync() }, 3500)
}