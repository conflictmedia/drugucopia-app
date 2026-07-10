'use client'

import { useState, useEffect, useMemo } from 'react'
import { format } from 'date-fns'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { Loader2, Pencil } from 'lucide-react'
import { formatUnit } from './dose-logger-modal'
import { substances } from '@/lib/substances/index'
import { toast } from '@/hooks/use-toast'
import { useDoseStore } from '@/store/dose-store'
import { DoseLog, Duration } from '@/types'
import { getDurationForRoute } from '@/lib/duration-interpolation'
import { DurationOverrideFields } from '@/components/duration-override-fields'

interface EditDoseModalProps {
  dose: DoseLog
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: (updated: DoseLog) => void
}

const moodOptions: ComboboxOption[] = [
  { value: 'happy', label: 'Happy' }, { value: 'relaxed', label: 'Relaxed' },
  { value: 'anxious', label: 'Anxious' }, { value: 'stressed', label: 'Stressed' },
  { value: 'sad', label: 'Sad' }, { value: 'energetic', label: 'Energetic' },
  { value: 'curious', label: 'Curious' }, { value: 'neutral', label: 'Neutral' },
  { value: 'excited', label: 'Excited' }, { value: 'bored', label: 'Bored' },
  { value: 'tired', label: 'Tired' }, { value: 'focused', label: 'Focused' },
]

const settingOptions: ComboboxOption[] = [
  { value: 'home', label: 'Home' }, { value: 'friends', label: 'With Friends' },
  { value: 'party', label: 'Party/Event' }, { value: 'nature', label: 'Nature' },
  { value: 'festival', label: 'Festival' }, { value: 'work', label: 'Work' },
  { value: 'gym', label: 'Gym' }, { value: 'concert', label: 'Concert' },
  { value: 'bar', label: 'Bar/Club' }, { value: 'travel', label: 'Traveling' },
  { value: 'other', label: 'Other' },
]

const unitOptions: ComboboxOption[] = [
  { value: 'mg', label: 'mg (milligrams)' }, { value: 'g', label: 'g (grams)' },
  { value: 'μg', label: 'μg (micrograms)' }, { value: 'ml', label: 'ml (milliliters)' },
  { value: 'drop', label: 'drop' }, { value: 'puff', label: 'puff' },
  { value: 'tab', label: 'tab' }, { value: 'capsule', label: 'capsule' },
  { value: 'hit', label: 'hit' }, { value: 'line', label: 'line' },
  { value: 'drink', label: 'drink' }, { value: 'shot', label: 'shot' },
  { value: 'joint', label: 'joint' }, { value: 'blunt', label: 'blunt' },
  { value: 'bowl', label: 'bowl' }, { value: 'blinker', label: 'blinker' },
]

const defaultRouteOptions: ComboboxOption[] = [
  { value: 'oral', label: 'Oral' }, { value: 'insufflation', label: 'Insufflation' },
  { value: 'inhalation', label: 'Inhalation' }, { value: 'sublingual', label: 'Sublingual' },
  { value: 'rectal', label: 'Rectal' }, { value: 'intramuscular', label: 'Intramuscular' },
  { value: 'transdermal', label: 'Transdermal' }, { value: 'intravenous', label: 'Intravenous' },
  { value: 'smoked', label: 'Smoked' }, { value: 'vaped', label: 'Vaped' },
]

/* ------------------------------------------------------------------ */
/*  Smart amount+unit parsing                                          */
/* ------------------------------------------------------------------ */

const KNOWN_UNITS = unitOptions.map(u => u.value)

const UNIT_ALIASES: Record<string, string> = {
  'micrograms': 'μg', 'microgram': 'μg', 'mcg': 'μg', 'ug': 'μg',
  'milligrams': 'mg', 'milligram': 'mg',
  'grams': 'g', 'gram': 'g',
  'milliliters': 'ml', 'milliliter': 'ml', 'mls': 'ml',
  'drops': 'drop', 'puffs': 'puff', 'tabs': 'tab', 'tablets': 'tab',
  'capsules': 'capsule', 'pills': 'capsule', 'hits': 'hit',
  'lines': 'line', 'drinks': 'drink', 'shots': 'shot',
  'joints': 'joint', 'blunts': 'blunt', 'bowls': 'bowl', 'blinkers': 'blinker',
}

const UNIT_TO_ROUTE: Record<string, string> = {
  'joint': 'smoked',
  'blunt': 'smoked',
  'bowl': 'smoked',
  'bong': 'smoked',
  'dab': 'smoked',
  'blinker': 'smoked',
  'puff': 'smoked',
  'pill': 'oral',
  'capsule': 'oral',
  'tablet': 'oral',
  'line': 'insufflated',
}

function resolveUnitFuzzy(typed: string): string | null {
  const lower = typed.toLowerCase().trim()
  if (!lower || lower.length < 2) return null

  if (KNOWN_UNITS.includes(lower)) return lower
  if (UNIT_ALIASES[lower]) return UNIT_ALIASES[lower]

  const prefixMatches = KNOWN_UNITS.filter(u => u.startsWith(lower))
  if (prefixMatches.length === 1) {
    return prefixMatches[0]
  }
  if (prefixMatches.length > 1) {
    prefixMatches.sort((a, b) => a.length - b.length)
    return prefixMatches[0]
  }

  for (const [alias, canonical] of Object.entries(UNIT_ALIASES)) {
    if (alias.startsWith(lower)) {
      return canonical
    }
  }

  return null
}

function parseAmountUnit(input: string): { amount: string; unit: string | null } {
  const trimmed = input.trim()
  if (!trimmed) return { amount: '', unit: null }

  const match = trimmed.match(/^([\-\+]?\d*\.?\d+)(?:\s*([a-zA-Zμ]+))?$/)
  if (match) {
    const amountStr = match[1]
    const unitStr = match[2]
    if (!unitStr) return { amount: amountStr, unit: null }

    const lower = unitStr.toLowerCase()

    if (KNOWN_UNITS.includes(lower)) return { amount: amountStr, unit: lower }
    if (UNIT_ALIASES[lower]) return { amount: amountStr, unit: UNIT_ALIASES[lower] }

    const fuzzyMatch = resolveUnitFuzzy(lower)
    if (fuzzyMatch) return { amount: amountStr, unit: fuzzyMatch }

    return { amount: amountStr, unit: lower }
  }

  return { amount: trimmed, unit: null }
}

/* ------------------------------------------------------------------ */
/*  Validation Schema                                                  */
/* ------------------------------------------------------------------ */

const doseSchema = z.object({
  substanceId: z.string().optional(),
  substanceName: z.string().min(1, 'Substance name is required'),
  amount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: 'Amount must be a positive number',
  }),
  unit: z.string().min(1, 'Unit is required'),
  route: z.string().min(1, 'Route of administration is required'),
  timestamp: z.string().min(1, 'Date & time are required'),
  notes: z.string().optional(),
  mood: z.string().optional(),
  setting: z.string().optional(),
})

type DoseFormValues = z.infer<typeof doseSchema>

export function EditDoseModal({ dose, open, onOpenChange, onSaved }: EditDoseModalProps) {
  const updateDose = useDoseStore(s => s.updateDose)
  const [loading, setLoading] = useState(false)

  // Duration override — initialise from existing dose duration
  const [durationOverride, setDurationOverride] = useState<Duration | null>(dose.duration ?? null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<DoseFormValues>({
    resolver: zodResolver(doseSchema),
    defaultValues: {
      substanceId: dose.substanceId,
      substanceName: dose.substanceName,
      amount: String(dose.amount),
      unit: dose.unit,
      route: dose.route,
      timestamp: format(new Date(dose.timestamp), "yyyy-MM-dd'T'HH:mm"),
      notes: dose.notes ?? '',
      mood: dose.mood ?? '',
      setting: dose.setting ?? '',
    },
  })

  // Watch fields for reactivity
  const substanceId = watch('substanceId')
  const substanceName = watch('substanceName')
  const amount = watch('amount')
  const unit = watch('unit')
  const route = watch('route')
  const timestamp = watch('timestamp')
  const notes = watch('notes')
  const mood = watch('mood')
  const setting = watch('setting')

  useEffect(() => {
    reset({
      substanceId: dose.substanceId,
      substanceName: dose.substanceName,
      amount: String(dose.amount),
      unit: dose.unit,
      route: dose.route,
      timestamp: format(new Date(dose.timestamp), "yyyy-MM-dd'T'HH:mm"),
      notes: dose.notes ?? '',
      mood: dose.mood ?? '',
      setting: dose.setting ?? '',
    })
    setDurationOverride(dose.duration ?? null)
  }, [dose, reset])

  const substanceOptions: ComboboxOption[] = useMemo(() => substances.map(s => ({ value: s.id, label: s.name })), [substances])
  const selectedSubstance = substances.find(s => s.id === substanceId)

  const estimatedDuration = useMemo(
    () => getDurationForRoute(selectedSubstance ?? null, route),
    [selectedSubstance, route]
  )

  useEffect(() => {
    if (route !== dose.route || substanceId !== dose.substanceId) {
      setDurationOverride(null)
    }
  }, [route, substanceId, dose.route, dose.substanceId])

  const resolvedDuration: Duration | null = useMemo(() => {
    if (durationOverride) return durationOverride
    if (estimatedDuration) {
      const { isEstimated, sourceRoute, estimationNote, ...plain } = estimatedDuration
      return plain
    }
    return null
  }, [durationOverride, estimatedDuration])

  const fieldBaseDuration = useMemo(() => {
    if (durationOverride) {
      return { ...durationOverride, isEstimated: false as const }
    }
    return estimatedDuration
  }, [durationOverride, estimatedDuration])

  const handleSubstanceChange = (value: string) => {
    const found = substances.find(s => s.id === value)
    if (found) {
      setValue('substanceId', found.id)
      setValue('substanceName', found.name)
    } else {
      setValue('substanceId', `custom-${Date.now()}`)
      setValue('substanceName', value)
    }
    setDurationOverride(null)
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    const parsed = parseAmountUnit(raw)
    setValue('amount', parsed.amount, { shouldValidate: true })
    if (parsed.unit) {
      setValue('unit', parsed.unit, { shouldValidate: true })
      if (UNIT_TO_ROUTE[parsed.unit]) {
        setValue('route', UNIT_TO_ROUTE[parsed.unit], { shouldValidate: true })
      }
    }
  }

  const handleSave = async (values: DoseFormValues) => {
    setLoading(true)
    await new Promise(r => setTimeout(r, 150))

    try {
      const parsedAmount = parseFloat(values.amount)
      const updated: DoseLog = {
        ...dose,
        substanceId: values.substanceId,
        substanceName: values.substanceName,
        amount: parsedAmount,
        unit: values.unit,
        route: values.route,
        timestamp: new Date(values.timestamp).toISOString(),
        duration: resolvedDuration,
        notes: values.notes || null,
        mood: values.mood || null,
        setting: values.setting || null,
        updatedAt: new Date().toISOString(),
      }

      updateDose(updated)

      toast({
        title: 'Dose updated',
        description: `${values.amount} ${formatUnit(values.unit, parsedAmount)} of ${values.substanceName}`,
      })

      if (onSaved) onSaved(updated)
      onOpenChange(false)
    } catch {
      toast({ title: 'Error', description: 'Failed to save changes.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            Edit Dose Log
          </DialogTitle>
          <DialogDescription>Correct any details for this dose entry.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleSave)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Substance</Label>
              <Combobox
                options={substanceOptions}
                value={substanceId || ''}
                onChange={handleSubstanceChange}
                placeholder="Select from list or type custom..."
                allowCustom
              />
              {errors.substanceName && (
                <p className="text-xs text-red-500">{errors.substanceName.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="grid gap-2">
                <Label>Amount</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  step="0.1"
                  placeholder="e.g., 100 or 5 mg"
                  value={amount}
                  onChange={handleAmountChange}
                  className="text-base"
                />
                <p className="text-xs text-neutral-content font-light leading-snug">Type a unit after the amount (e.g. &quot;5 mg&quot;) to auto-select it</p>
                {errors.amount && (
                  <p className="text-xs text-red-500">{errors.amount.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label>Unit</Label>
                <Combobox
                  options={unitOptions}
                  value={unit}
                  onChange={(val) => setValue('unit', val, { shouldValidate: true })}
                  placeholder="Select or type custom..."
                  allowCustom
                />
                {errors.unit && (
                  <p className="text-xs text-red-500">{errors.unit.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Route of Administration</Label>
              <Combobox
                options={selectedSubstance?.routeData
                  ? Object.keys(selectedSubstance.routeData).map(r => ({ value: r, label: r }))
                  : defaultRouteOptions}
                value={route}
                onChange={(val) => setValue('route', val, { shouldValidate: true })}
                placeholder="Select or type custom..."
                allowCustom
              />
              {errors.route && (
                <p className="text-xs text-red-500">{errors.route.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label>Date &amp; Time</Label>
              <Input
                type="datetime-local"
                value={timestamp}
                onChange={(e) => setValue('timestamp', e.target.value, { shouldValidate: true })}
                className="text-base"
              />
              {errors.timestamp && (
                <p className="text-xs text-red-500">{errors.timestamp.message}</p>
              )}
            </div>

            {/* ── Duration section ─────────────────────────────────────── */}
            <div className="grid gap-2 rounded-lg border border-base-300/60 bg-base-200/20 p-3">
              <DurationOverrideFields
                baseDuration={fieldBaseDuration}
                onChange={setDurationOverride}
                defaultExpanded={true}
              />
            </div>

            <div className="grid gap-2">
              <Label>Mood (optional)</Label>
              <Combobox
                options={moodOptions}
                value={mood || ''}
                onChange={(val) => setValue('mood', val)}
                placeholder="Select or type custom..."
                allowCustom
              />
            </div>

            <div className="grid gap-2">
              <Label>Setting (optional)</Label>
              <Combobox
                options={settingOptions}
                value={setting || ''}
                onChange={(val) => setValue('setting', val)}
                placeholder="Select or type custom..."
                allowCustom
              />
            </div>

            <div className="grid gap-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Any additional notes..."
                value={notes}
                onChange={(e) => setValue('notes', e.target.value)}
                rows={3}
                className="text-base"
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
