'use client'

import React, { useState, useMemo, useCallback, useEffect, Suspense } from 'react'
import {
  Leaf,
  Scale,
  Droplets,
  AlertTriangle,
  Info,
  Calculator,
  Shield,
  Clock,
  Heart,
  Skull,
  ArrowLeftRight,
  Beaker,
  FlaskConical,
  Copy,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Check,
  Plus,
  CalendarDays,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useDoseStore } from '@/store/dose-store'
import { toast } from '@/hooks/use-toast'
import { kratom } from '@/lib/substances/opioids/kratom'
import { RedosePlanner } from '@/components/redose-planner'
import type { DoseLog } from '@/types'
import { ErrorBoundary, CalculatorErrorFallback } from '@/components/error-boundary'
import { BottomSheet } from '@/components/ui/BottomSheet'

// ─── Constants ──────────────────────────────────────────────────────────────

/** Approximate mitragynine content of raw kratom leaf powder (%) */
const DEFAULT_MITRAGYNINE_PCT = 1.5
const MAX_SAFE_LEAF_DOSE = 12

// ─── Types ──────────────────────────────────────────────────────────────────

type InputMode = 'percent' | 'ratio'

interface DoseTier {
  name: string
  subtitle: string
  emoji: string
  rangeMin: number
  rangeMax: number
  color: string
  bgColor: string
  borderColor: string
  glowClass: string
  description: string
  effects: string[]
  duration: string
}

interface PresetExtract {
  label: string
  value: number
  mode: InputMode
}

// ─── Dose Tier Definitions (grams, oral, leaf powder) ──────────────────────

const doseTiers: DoseTier[] = [
  {
    name: 'Threshold',
    subtitle: 'Minimal Effects',
    emoji: '🌿',
    rangeMin: 1,
    rangeMax: 2,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    glowClass: 'glow-green',
    description:
      'At this level, users may notice very subtle stimulation and a slight increase in alertness. Physical sensations are minimal. Some individuals report mild anxiety relief, though effects can be inconsistent. This range is often used by those sensitive to kratom or microdosing for functional purposes throughout the day.',
    effects: ['Mild stimulation', 'Slight alertness', 'Minimal physical sensation', 'Possible mild anxiety relief'],
    duration: '1 – 2 hours',
  },
  {
    name: 'Light',
    subtitle: 'Gentle Stimulation',
    emoji: '⚡',
    rangeMin: 2,
    rangeMax: 4,
    color: 'text-lime-400',
    bgColor: 'bg-lime-500/10',
    borderColor: 'border-lime-500/30',
    glowClass: 'glow-green',
    description:
      'Light doses produce a noticeable but gentle stimulant effect, often described as similar to caffeine but smoother and longer-lasting. Users commonly experience improved focus, sociability, and a mild sense of well-being. Physical discomfort may be mildly reduced. This range is popular for daytime use as it rarely impairs functioning.',
    effects: ['Noticeable stimulation', 'Improved focus', 'Enhanced sociability', 'Mild euphoria', 'Reduced discomfort'],
    duration: '2 – 3 hours',
  },
  {
    name: 'Common',
    subtitle: 'Balanced Effects',
    emoji: '🌟',
    rangeMin: 3,
    rangeMax: 6,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    glowClass: 'glow-amber',
    description:
      'This is the most commonly reported range, offering a blend of mild stimulation and relaxation that shifts depending on the strain. Users often describe a sense of calm, warmth, and contentment with reduced anxiety and physical tension. At the higher end, sedation begins to overtake stimulation. This range provides the most balanced experience.',
    effects: ['Calm contentment', 'Reduced anxiety', 'Physical relaxation', 'Mild euphoria', 'Warmth', 'Strain-dependent stimulation or sedation'],
    duration: '3 – 5 hours',
  },
  {
    name: 'Strong',
    subtitle: 'Sedation & Analgesia',
    emoji: '🌊',
    rangeMin: 6,
    rangeMax: 8,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    glowClass: 'glow-amber',
    description:
      'Strong doses produce significant opioid-like effects including pronounced analgesia, heavy sedation, and euphoria. Stimulation fades entirely at this level. Users may experience “the wobbles” — nausea and difficulty focusing the eyes. Cognitive impairment becomes noticeable. This range should only be used by experienced individuals with established tolerance.',
    effects: ['Strong analgesia', 'Heavy sedation', 'Euphoria', 'Possible nausea (“wobbles”)', 'Cognitive impairment', 'Relaxation'],
    duration: '4 – 6 hours',
  },
  {
    name: 'Heavy',
    subtitle: 'Deep Sedation',
    emoji: '💤',
    rangeMin: 8,
    rangeMax: 12,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    glowClass: 'glow-red',
    description:
      'Heavy doses produce profound sedation, near-total pain relief, and intense euphoria that can border on delirium at the upper end. Motor coordination is significantly impaired, and users often feel compelled to lie down. The risk of nausea, vomiting, and respiratory depression increases substantially. This range carries meaningful overdose risk and should be approached with extreme caution.',
    effects: ['Profound sedation', 'Intense euphoria', 'Near-total analgesia', 'Motor impairment', 'High nausea risk', 'Respiratory depression risk'],
    duration: '5 – 8 hours',
  },
]

// ─── Preset Extract Strengths ──────────────────────────────────────────────

const presetPercents: PresetExtract[] = [
  { label: '10%', value: 10, mode: 'percent' },
  { label: '15%', value: 15, mode: 'percent' },
  { label: '20%', value: 20, mode: 'percent' },
  { label: '28%', value: 28, mode: 'percent' },
  { label: '45%', value: 45, mode: 'percent' },
  { label: '50%', value: 50, mode: 'percent' },
]

const presetRatios: PresetExtract[] = [
  { label: '5×', value: 5, mode: 'ratio' },
  { label: '10×', value: 10, mode: 'ratio' },
  { label: '15×', value: 15, mode: 'ratio' },
  { label: '20×', value: 20, mode: 'ratio' },
  { label: '50×', value: 50, mode: 'ratio' },
]

const LEAF_PRESETS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
const EXTRACT_PRESETS = [0.1, 0.25, 0.5, 1]

// ─── Conversion Helpers ────────────────────────────────────────────────────

function percentToRatio(percent: number, baseline: number): number {
  return percent / baseline
}

function ratioToPercent(ratio: number, baseline: number): number {
  return ratio * baseline
}

function getConcentrationFactor(mode: InputMode, value: number, baseline: number): number {
  if (value <= 0) return 0
  return mode === 'percent' ? percentToRatio(value, baseline) : value
}

function leafToExtract(leafGrams: number, concentrationFactor: number): number {
  if (concentrationFactor <= 0) return 0
  return leafGrams / concentrationFactor
}

function extractToLeaf(extractGrams: number, concentrationFactor: number): number {
  return extractGrams * concentrationFactor
}

function formatGrams(g: number): string {
  if (g >= 1) return g.toFixed(1)
  if (g >= 0.1) return g.toFixed(2)
  return g.toFixed(3)
}

function classifyLeafDose(grams: number): DoseTier | null {
  for (let i = doseTiers.length - 1; i >= 0; i--) {
    if (grams >= doseTiers[i].rangeMin) return doseTiers[i]
  }
  return null
}

function getTierSpectrumPercent(tier: DoseTier): number {
  return ((tier.rangeMax - tier.rangeMin) / MAX_SAFE_LEAF_DOSE) * 100
}

function getTierStartPercent(tier: DoseTier): number {
  return (tier.rangeMin / MAX_SAFE_LEAF_DOSE) * 100
}

function getSpectrumPosition(grams: number): number {
  return Math.min((grams / MAX_SAFE_LEAF_DOSE) * 100, 105)
}

function getTierSpectrumColor(tier: DoseTier): string {
  // More opaque, saturated colors for the spectrum bar so text is readable
  switch (tier.name) {
    case 'Threshold': return 'bg-emerald-500/50'
    case 'Light': return 'bg-lime-500/50'
    case 'Common': return 'bg-amber-500/50'
    case 'Strong': return 'bg-orange-500/50'
    case 'Heavy': return 'bg-red-500/50'
    default: return 'bg-base-300'
  }
}

// ─── Reusable Collapsible Section Component ─────────────────────────────────

function SectionToggle({
  title,
  icon: Icon,
  isOpen,
  onToggle,
  children,
}: {
  title: string
  icon: React.ElementType
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="card card-transparent mb-4 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full card-body flex-row items-center justify-between p-4 text-left hover:bg-base-200/20 transition-colors"
        aria-expanded={isOpen}
      >
        <h2 className="card-title text-base flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {title}
        </h2>
        {isOpen ? <ChevronUp className="h-4 w-4 text-neutral-content" /> : <ChevronDown className="h-4 w-4 text-neutral-content" />}
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Page Component ────────────────────────────────────────────────────────

function KratomCalculatorContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const addDose = useDoseStore(s => s.addDose)

  // ─── Inputs ──────────────────────────────────────────────────────────────
  // B1 — Persist calculator inputs across sessions.
  // Priority on first load: URL param (shared links win) → localStorage
  // (last-used values) → default. After that, every change writes back
  // to localStorage so a fresh visit / page reload restores the user's
  // last extract strength, leaf dose, direction, etc. without re-entry.
  const KRATOM_SETTINGS_KEY = 'drugucopia-kratom-settings'

  type KratomSettings = {
    inputMode?: InputMode
    extractValue?: string
    leafDose?: string
    extractAmountInput?: string
    calcDirection?: 'leaf-to-extract' | 'extract-to-leaf'
    extractUnit?: 'g' | 'mg'
    isEnhanced?: boolean
    leafBaseline?: number
  }
  function loadKratomSettings(): KratomSettings {
    if (typeof window === 'undefined') return {}
    try {
      const raw = localStorage.getItem(KRATOM_SETTINGS_KEY)
      if (!raw) return {}
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') return parsed as KratomSettings
    } catch {
      /* ignore corrupt entry */
    }
    return {}
  }
  const savedKratom = loadKratomSettings()

  const [inputMode, setInputMode] = useState<InputMode>(() => {
    const m = searchParams.get('mode')
    if (m === 'percent' || m === 'ratio') return m
    return savedKratom.inputMode ?? 'percent'
  })
  const [extractValue, setExtractValue] = useState<string>(() => {
    const v = searchParams.get('strength')
    if (v !== null) return v
    return savedKratom.extractValue ?? ''
  })
  const [leafDose, setLeafDose] = useState<string>(() => {
    const v = searchParams.get('leaf')
    if (v !== null) return v
    return savedKratom.leafDose ?? ''
  })
  const [extractAmountInput, setExtractAmountInput] = useState<string>(() => {
    const v = searchParams.get('extract')
    if (v !== null) return v
    return savedKratom.extractAmountInput ?? ''
  })
  const [calcDirection, setCalcDirection] = useState<'leaf-to-extract' | 'extract-to-leaf'>(() => {
    const d = searchParams.get('direction')
    if (d === 'leaf-to-extract' || d === 'extract-to-leaf') return d
    return savedKratom.calcDirection ?? 'leaf-to-extract'
  })
  const [extractUnit, setExtractUnit] = useState<'g' | 'mg'>(() => {
    const u = searchParams.get('unit')
    if (u === 'g' || u === 'mg') return u
    return savedKratom.extractUnit ?? 'g'
  })
  const [isEnhanced, setIsEnhanced] = useState<boolean>(() => {
    const e = searchParams.get('enhanced')
    if (e === 'true') return true
    if (e === 'false') return false
    return savedKratom.isEnhanced ?? false
  })
  const [leafBaseline, setLeafBaseline] = useState<number>(() => {
    const b = searchParams.get('baseline')
    const v = b ? parseFloat(b) : NaN
    if (!isNaN(v) && v > 0) return v
    if (typeof savedKratom.leafBaseline === 'number' && savedKratom.leafBaseline > 0) {
      return savedKratom.leafBaseline
    }
    return DEFAULT_MITRAGYNINE_PCT
  })
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    pharmacology: false,
    harmReduction: false,
    quickRef: false,
    emergency: false,
  })
  const [copied, setCopied] = useState(false)
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false)
  const [isPlanSheetOpen, setIsPlanSheetOpen] = useState(false)

  // B1 — Save inputs to localStorage whenever they change so the next
  // visit restores them.
  useEffect(() => {
    try {
      localStorage.setItem(
        KRATOM_SETTINGS_KEY,
        JSON.stringify({
          inputMode,
          extractValue,
          leafDose,
          extractAmountInput,
          calcDirection,
          extractUnit,
          isEnhanced,
          leafBaseline,
        }),
      )
    } catch {
      /* ignore quota errors */
    }
  }, [inputMode, extractValue, leafDose, extractAmountInput, calcDirection, extractUnit, isEnhanced, leafBaseline])

  // Sync URL when inputs change (replace, no scroll)
  useEffect(() => {
    const params = new URLSearchParams()
    if (inputMode !== 'percent') params.set('mode', inputMode)
    if (extractValue) params.set('strength', extractValue)
    if (calcDirection !== 'leaf-to-extract') params.set('direction', calcDirection)
    if (leafDose) params.set('leaf', leafDose)
    if (extractAmountInput) params.set('extract', extractAmountInput)
    if (extractUnit !== 'g') params.set('unit', extractUnit)
    if (isEnhanced) params.set('enhanced', 'true')
    if (leafBaseline !== DEFAULT_MITRAGYNINE_PCT) params.set('baseline', String(leafBaseline))

    const query = params.toString()
    const newUrl = query ? `${pathname}?${query}` : pathname
    router.replace(newUrl, { scroll: false })
  }, [inputMode, extractValue, calcDirection, leafDose, extractAmountInput, extractUnit, isEnhanced, leafBaseline, pathname, router])

  // ─── Derived values ──────────────────────────────────────────────────────
  const extractNumber = useMemo(() => parseFloat(extractValue), [extractValue])
  const concentrationFactor = useMemo(() => {
    if (isNaN(extractNumber) || extractNumber <= 0) return 0
    return getConcentrationFactor(inputMode, extractNumber, leafBaseline)
  }, [extractNumber, inputMode, leafBaseline])

  const leafGrams = useMemo(() => {
    const v = parseFloat(leafDose)
    return isNaN(v) || v <= 0 ? 0 : v
  }, [leafDose])

  const extractAmountGrams = useMemo(() => {
    const v = parseFloat(extractAmountInput)
    if (isNaN(v) || v <= 0) return 0
    return extractUnit === 'mg' ? v / 1000 : v
  }, [extractAmountInput, extractUnit])

  const hasValidExtract = concentrationFactor > 0
  const hasValidLeaf = leafGrams > 0
  const hasValidExtractAmount = extractAmountGrams > 0

  // Custom dose conversion
  const customResult = useMemo(() => {
    if (!hasValidExtract || !hasValidLeaf) return null
    return {
      extractDose: leafToExtract(leafGrams, concentrationFactor),
      leafDose: leafGrams,
    }
  }, [concentrationFactor, leafGrams, hasValidExtract, hasValidLeaf])

  const reverseResult = useMemo(() => {
    if (!hasValidExtract || !hasValidExtractAmount) return null
    return {
      leafEquivalent: extractToLeaf(extractAmountGrams, concentrationFactor),
      extractDose: extractAmountGrams,
    }
  }, [concentrationFactor, extractAmountGrams, hasValidExtract, hasValidExtractAmount])

  const activeLeafDose = useMemo(() => {
    if (calcDirection === 'leaf-to-extract') return customResult?.leafDose ?? 0
    return reverseResult?.leafEquivalent ?? 0
  }, [calcDirection, customResult, reverseResult])

  const activeExtractDose = useMemo(() => {
    if (calcDirection === 'leaf-to-extract') return customResult?.extractDose ?? 0
    return reverseResult?.extractDose ?? 0
  }, [calcDirection, customResult, reverseResult])

  const activeTier = useMemo(() => classifyLeafDose(activeLeafDose), [activeLeafDose])
  const isOverdose = activeLeafDose > MAX_SAFE_LEAF_DOSE

  // ─── Warnings / validation ───────────────────────────────────────────────
  const inputWarnings = useMemo(() => {
    const warnings: string[] = []
    if (inputMode === 'percent' && extractNumber > 100) {
      warnings.push('Mitragynine content above 100% is not physically possible.')
    }
    if (inputMode === 'ratio' && extractNumber > 100) {
      warnings.push('Extract ratios above 100× are implausible for most products.')
    }
    if (activeLeafDose > MAX_SAFE_LEAF_DOSE) {
      warnings.push(`Equivalent leaf dose exceeds ${MAX_SAFE_LEAF_DOSE}g — dangerous territory.`)
    }
    if (isEnhanced && hasValidExtract) {
      warnings.push('Enhanced/fortified extracts may be significantly stronger than the label suggests.')
    }
    return warnings
  }, [inputMode, extractNumber, activeLeafDose, isEnhanced, hasValidExtract])

  // ─── Handlers ────────────────────────────────────────────────────────────
  const toggleSection = useCallback((key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const handleReset = useCallback(() => {
    setExtractValue('')
    setLeafDose('')
    setExtractAmountInput('')
    setIsEnhanced(false)
    setExtractUnit('g')
    setCopied(false)
  }, [])

  const handleCopyResult = useCallback(() => {
    if (!activeLeafDose || !activeExtractDose) return
    const strengthLabel = inputMode === 'percent' ? `${extractValue}% mitragynine` : `${extractValue}× extract`
    const text =
      calcDirection === 'leaf-to-extract'
        ? `${formatGrams(activeLeafDose)}g kratom leaf ≈ ${formatGrams(activeExtractDose)}g extract (${strengthLabel})`
        : `${formatGrams(activeExtractDose)}g extract (${strengthLabel}) ≈ ${formatGrams(activeLeafDose)}g kratom leaf`
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [activeLeafDose, activeExtractDose, calcDirection, extractValue, inputMode])

  const handleLogDose = useCallback(() => {
    if (!activeExtractDose || activeExtractDose <= 0) return
    // Ensure store is loaded from localStorage before appending a new dose
    useDoseStore.getState().initialize()
    const now = new Date().toISOString()
    const duration = kratom.routeData?.oral?.duration ?? null
    const notes = [
      'Calculated via Kratom Extract Dose Calculator.',
      `Direction: ${calcDirection === 'leaf-to-extract' ? 'leaf → extract' : 'extract → leaf'}.`,
      `Extract strength: ${inputMode === 'percent' ? `${extractValue}% mitragynine` : `${extractValue}× ratio`}.`,
      `Leaf equivalent: ${formatGrams(activeLeafDose)}g.`,
      `Leaf baseline: ${leafBaseline}% mitragynine.`,
      isEnhanced ? 'Extract marked as enhanced/fortified.' : '',
    ].filter(Boolean).join(' ')

    const newLog: DoseLog = {
      id: `dose_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      substanceId: kratom.id,
      substanceName: kratom.name,
      categories: kratom.categories,
      amount: activeExtractDose,
      unit: 'g',
      route: 'oral',
      timestamp: now,
      duration,
      notes: notes || null,
      mood: null,
      setting: null,
      intensity: null,
      createdAt: now,
      updatedAt: now,
    }

    addDose(newLog)
    toast({
      title: 'Dose logged',
      description: `${formatGrams(activeExtractDose)}g kratom extract logged (${inputMode === 'percent' ? `${extractValue}% mitragynine` : `${extractValue}× ratio`}).`,
    })
  }, [activeExtractDose, activeLeafDose, calcDirection, extractValue, inputMode, leafBaseline, isEnhanced, addDose])

  const activePresets = inputMode === 'percent' ? presetPercents : presetRatios

  return (
    <div className="min-h-screen px-4 pt-8 pb-8 lg:px-8 max-w-5xl mx-auto max-md:safe-area-pb-min">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 glow-green">
            <Leaf className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">Kratom Extract Dose Calculator</h1>
            <p className="text-sm text-neutral-content">
              Convert between kratom extract percentages/ratios and equivalent leaf powder doses
            </p>
          </div>
        </div>
        <div className="alert alert-warning text-xs mt-4">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            This calculator is for <strong>harm reduction purposes only</strong>. Kratom carries risks of
            dependence, withdrawal, and potentially serious adverse effects at high doses. Always start
            low and research thoroughly. Not medical advice.
          </span>
        </div>
      </header>

      {/* ─── Step Guide ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        {[
          { step: '1', text: 'Enter your extract strength (% or ratio)' },
          { step: '2', text: 'Input your leaf dose or planned extract amount' },
          { step: '3', text: 'Read the equivalent and start with a test dose' },
        ].map((item) => (
          <div
            key={item.step}
            className="flex items-center gap-3 p-3 rounded-xl bg-base-200/50 border border-base-300/50"
          >
            <div className="w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-sm font-bold">
              {item.step}
            </div>
            <span className="text-sm text-neutral-content">{item.text}</span>
          </div>
        ))}
      </div>

      {/* ─── Extract Strength Input ──────────────────────────────────────── */}
      <section className="card card-transparent mb-6">
        <div className="card-body">
          <h2 className="card-title text-base flex items-center gap-2 mb-4">
            <Beaker className="h-5 w-5" />
            Extract Strength
          </h2>

          {/* Mode Toggle */}
          <div className="mb-4 flex rounded-lg border border-base-300 overflow-hidden">
            <button
              onClick={() => setInputMode('percent')}
              className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${inputMode === 'percent'
                  ? 'bg-primary text-primary-content'
                  : 'bg-base-200 text-neutral-content hover:bg-base-300'
                }`}
            >
              Extract % (Mitragynine)
            </button>
            <button
              onClick={() => setInputMode('ratio')}
              className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${inputMode === 'ratio'
                  ? 'bg-primary text-primary-content'
                  : 'bg-base-200 text-neutral-content hover:bg-base-300'
                }`}
            >
              Extract Ratio (e.g. 10×)
            </button>
          </div>

          {/* Extract value input */}
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium text-neutral-content text-center">
              {inputMode === 'percent' ? 'Mitragynine Content (%)' : 'Extract Ratio (×)'}
            </label>
            <div className="relative max-w-xs mx-auto">
              <Input
                type="number"
                min="0.1"
                step="1"
                placeholder={inputMode === 'percent' ? 'e.g. 20' : 'e.g. 10'}
                value={extractValue}
                onChange={(e) => setExtractValue(e.target.value)}
                className="bg-base-200 border-base-300/50 text-lg h-12 font-mono pr-10"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-content pointer-events-none">
                {inputMode === 'percent' ? '%' : '×'}
              </div>
            </div>
          </div>

          {/* Preset buttons */}
          <div className="flex flex-wrap gap-2 mb-4 justify-center">
            {activePresets.map((p) => (
              <button
                key={p.label}
                onClick={() => {
                  setInputMode(p.mode)
                  setExtractValue(String(p.value))
                }}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors min-h-[44px] ${extractNumber === p.value && inputMode === p.mode
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                    : 'border-base-300 bg-base-200/50 text-neutral-content hover:bg-base-300'
                  }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Enhanced extract warning toggle */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <input
              id="enhanced-extract"
              type="checkbox"
              checked={isEnhanced}
              onChange={(e) => setIsEnhanced(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-base-300 text-amber-500 focus:ring-amber-500/20"
            />
            <div>
              <label htmlFor="enhanced-extract" className="text-sm font-medium text-amber-400 cursor-pointer">
                Enhanced / fortified extract (contains added 7-OH or isolated alkaloids)
              </label>
              <p className="text-xs text-neutral-content mt-1 leading-relaxed">
                Many commercial extracts are spiked with 7-hydroxymitragynine or isolated mitragynine, making them
                significantly stronger than the stated percentage. If unsure, check this box and treat the result as
                a lower bound.
              </p>
            </div>
          </div>

          {/* Advanced: leaf baseline % */}
          <div className="mt-4">
            <button
              onClick={() => setShowAdvanced((s) => !s)}
              className="flex items-center gap-1.5 text-xs text-neutral-content hover:text-base-content transition-colors"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {showAdvanced ? 'Hide advanced options' : 'Show advanced options'}
            </button>
            <AnimatePresence initial={false}>
              {showAdvanced && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-3 max-w-xs mx-auto">
                    <label className="mb-1.5 block text-xs font-medium text-neutral-content text-center">
                      Leaf baseline mitragynine (%)
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0.1"
                        max="5"
                        step="0.1"
                        value={leafBaseline}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value)
                          setLeafBaseline(isNaN(v) || v <= 0 ? DEFAULT_MITRAGYNINE_PCT : v)
                        }}
                        className="bg-base-200 border-base-300/50 pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-content">%</span>
                    </div>
                    <p className="text-xs text-neutral-content/70 mt-1">
                      Typical leaf ranges 0.8–2.0%. Default is {DEFAULT_MITRAGYNINE_PCT}%.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Conversion info */}
          <AnimatePresence initial={false} mode="wait">
            {hasValidExtract && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-content font-mono"
              >
                <span>
                  Concentration: <span className="font-semibold text-base-content">{concentrationFactor.toFixed(1)}×</span>
                </span>
                {inputMode === 'percent' && (
                  <span>
                    {'≈'} <span className="font-semibold text-base-content">{concentrationFactor.toFixed(1)}× extract</span>
                  </span>
                )}
                {inputMode === 'ratio' && !isNaN(extractNumber) && (
                  <span>
                    {'≈'} <span className="font-semibold text-base-content">{ratioToPercent(extractNumber, leafBaseline).toFixed(1)}% mitragynine</span>
                  </span>
                )}
                <span className="text-neutral-content/50">
                  (base leaf {'≈'} {leafBaseline}% mitragynine)
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ─── Calculator Direction & Dose Input ───────────────────────────── */}
      <AnimatePresence initial={false}>
        {hasValidExtract && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mb-6"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <button
                onClick={() => setCalcDirection('leaf-to-extract')}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${calcDirection === 'leaf-to-extract'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                    : 'border-base-300 bg-base-200/50 text-neutral-content hover:bg-base-300'
                  }`}
              >
                <Leaf className="h-4 w-4" />
                Leaf → Extract
              </button>
              <ArrowLeftRight className="h-4 w-4 text-neutral-content" />
              <button
                onClick={() => setCalcDirection('extract-to-leaf')}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${calcDirection === 'extract-to-leaf'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                    : 'border-base-300 bg-base-200/50 text-neutral-content hover:bg-base-300'
                  }`}
              >
                <FlaskConical className="h-4 w-4" />
                Extract → Leaf
              </button>
            </div>

            <div className="card card-transparent">
              <div className="card-body">
                {calcDirection === 'leaf-to-extract' ? (
                  <>
                    <h2 className="card-title text-base flex items-center gap-2 mb-4">
                      <Scale className="h-5 w-5" />
                      Leaf Powder Dose → Extract Equivalent
                    </h2>
                    <label className="mb-1.5 block text-xs font-medium text-neutral-content text-center">
                      Leaf Powder Dose (grams)
                    </label>
                    <div className="relative max-w-xs mx-auto mb-4">
                      <Input
                        type="number"
                        min="0.1"
                        step="0.5"
                        placeholder="e.g. 5"
                        value={leafDose}
                        onChange={(e) => setLeafDose(e.target.value)}
                        className="bg-base-200 border-base-300/50 text-lg h-12 font-mono pr-10"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-content pointer-events-none">g</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-2 justify-center">
                      {LEAF_PRESETS.map((g) => (
                        <button
                          key={g}
                          onClick={() => setLeafDose(String(g))}
                          className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors min-h-[36px] ${leafGrams === g
                              ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                              : 'border-base-300 bg-base-200/50 text-neutral-content hover:bg-base-300'
                            }`}
                        >
                          {g}g
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="card-title text-base flex items-center gap-2 mb-4">
                      <FlaskConical className="h-5 w-5" />
                      Extract Amount → Leaf Powder Equivalent
                    </h2>
                    <label className="mb-1.5 block text-xs font-medium text-neutral-content text-center">
                      Extract Amount
                    </label>
                    <div className="flex gap-3 items-end mb-4 max-w-xs mx-auto">
                      <div className="relative flex-1">
                        <Input
                          type="number"
                          min="0.01"
                          step="0.1"
                          placeholder="e.g. 0.5"
                          value={extractAmountInput}
                          onChange={(e) => setExtractAmountInput(e.target.value)}
                          className="bg-base-200 border-base-300/50 text-lg h-12 font-mono pr-10"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-content pointer-events-none">
                          {extractUnit === 'g' ? 'g' : 'mg'}
                        </span>
                      </div>
                      <div className="flex rounded-lg border border-base-300 overflow-hidden h-12">
                        <button
                          onClick={() => {
                            if (extractUnit === 'mg') {
                              const v = parseFloat(extractAmountInput)
                              if (!isNaN(v)) {
                                setExtractAmountInput(formatGrams(v / 1000))
                              }
                            }
                            setExtractUnit('g')
                          }}
                          className={`px-3 text-sm font-medium transition-colors ${extractUnit === 'g' ? 'bg-primary text-primary-content' : 'bg-base-200 text-neutral-content hover:bg-base-300'
                            }`}
                        >
                          g
                        </button>
                        <button
                          onClick={() => {
                            if (extractUnit === 'g') {
                              const v = parseFloat(extractAmountInput)
                              if (!isNaN(v)) {
                                setExtractAmountInput(String(Math.round(v * 1000)))
                              }
                            }
                            setExtractUnit('mg')
                          }}
                          className={`px-3 text-sm font-medium transition-colors ${extractUnit === 'mg' ? 'bg-primary text-primary-content' : 'bg-base-200 text-neutral-content hover:bg-base-300'
                            }`}
                        >
                          mg
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-2 justify-center">
                      {EXTRACT_PRESETS.map((g) => (
                        <button
                          key={g}
                          onClick={() => {
                            setExtractUnit('g')
                            setExtractAmountInput(String(g))
                          }}
                          className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors min-h-[36px] ${extractAmountGrams === g
                              ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                              : 'border-base-300 bg-base-200/50 text-neutral-content hover:bg-base-300'
                            }`}
                        >
                          {g}g
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ─── Validation Warnings ─────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {inputWarnings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="alert alert-warning text-xs mb-6"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <ul className="list-disc list-inside space-y-1">
              {inputWarnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Hero Result Card ─────────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {activeLeafDose > 0 && activeExtractDose > 0 && (
          <motion.section
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="card card-transparent border-emerald-500/30 glow-green mb-6"
            aria-live="polite"
          >
            <div className="card-body">
              <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
                <h2 className="card-title text-base flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Your Result
                </h2>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopyResult} className="h-8 px-3 text-xs">
                    {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleLogDose} className="h-8 px-3 text-xs">
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Log dose
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setIsPlanSheetOpen(true)} className="h-8 px-3 text-xs min-h-[44px]">
                    <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
                    Plan redoses
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleReset} className="h-8 px-3 text-xs">
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                    Reset
                  </Button>
                </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 mb-4">
                <div className="flex items-baseline gap-3 flex-wrap">
                  {calcDirection === 'leaf-to-extract' ? (
                    <>
                      <span className="text-sm text-neutral-content">{formatGrams(activeLeafDose)}g leaf</span>
                      <ArrowLeftRight className="h-4 w-4 text-emerald-400" />
                      <span className="text-3xl font-bold font-mono text-emerald-400">
                        {formatGrams(activeExtractDose)}g
                      </span>
                      <span className="text-sm text-neutral-content">extract</span>
                    </>
                  ) : (
                    <>
                      <span className="text-sm text-neutral-content">{formatGrams(activeExtractDose)}g extract</span>
                      <ArrowLeftRight className="h-4 w-4 text-emerald-400" />
                      <span className="text-3xl font-bold font-mono text-emerald-400">
                        {formatGrams(activeLeafDose)}g
                      </span>
                      <span className="text-sm text-neutral-content">leaf equivalent</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {activeTier && (
                    <Badge variant="outline" className={`${activeTier.color} ${activeTier.bgColor} border-current/30 text-xs px-2 py-1`}>
                      <span className="mr-1">{activeTier.emoji}</span> {activeTier.name} Dose
                    </Badge>
                  )}
                  <span className="text-xs text-neutral-content">
                    {inputMode === 'percent' ? `${extractValue}% mitragynine` : `${extractValue}× ratio`}
                  </span>
                </div>
              </div>

              {/* Recommendation box */}
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 mb-3">
                <p className="text-sm text-neutral-content leading-relaxed">
                  <strong className="text-emerald-400">Start low:</strong> Try{' '}
                  <span className="font-mono font-semibold text-base-content">
                    {formatGrams(activeExtractDose * 0.25)}g – {formatGrams(activeExtractDose * 0.5)}g
                  </span>{' '}
                  extract as a first test dose, especially with a new product or batch.
                </p>
              </div>

              {isEnhanced && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-400 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Enhanced extracts may be significantly stronger than this calculation suggests. Consider starting at the bottom of the range above or lower.
                  </span>
                </div>
              )}

              {isOverdose && (
                <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-400 flex items-start gap-2">
                  <Skull className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    This equivalent exceeds the heavy dose range ({MAX_SAFE_LEAF_DOSE}g leaf). Exercise extreme caution and consider this a dangerous dose.
                  </span>
                </div>
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ─── Dose Spectrum Bar ────────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {hasValidExtract && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mb-6"
          >
            <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
              <Droplets className="h-4 w-4" />
              Dose Spectrum
            </h2>
            <div className="relative rounded-xl overflow-hidden border border-base-300 h-10">
              {doseTiers.map((tier, i) => (
                <div
                  key={i}
                  className={`absolute top-0 h-full ${getTierSpectrumColor(tier)} ${tier.borderColor} border-r flex items-center justify-center text-[10px] font-medium ${tier.color} transition-all duration-300`}
                  style={{
                    left: `${getTierStartPercent(tier)}%`,
                    width: `${getTierSpectrumPercent(tier)}%`,
                  }}
                  title={`${tier.name}: ${tier.rangeMin}–${tier.rangeMax}g leaf`}
                >
                  <span className="hidden sm:inline truncate px-1">{tier.name}</span>
                </div>
              ))}
              <div
                className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] z-10 transition-all duration-300"
                style={{ left: `${getSpectrumPosition(activeLeafDose)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-neutral-content mt-1 px-1">
              <span>0g</span>
              <span>{MAX_SAFE_LEAF_DOSE}g+</span>
            </div>
            {activeLeafDose > 0 && (
              <p className="text-xs text-neutral-content mt-2 text-center">
                Your dose is equivalent to <span className="font-semibold text-base-content">{formatGrams(activeLeafDose)}g</span> leaf powder
              </p>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      {/* ─── Active Tier Detail Card ──────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {activeTier && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className={`card card-transparent card-lift border ${activeTier.borderColor} ${activeTier.glowClass} mb-6`}
          >
            <div className="card-body">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-lg">{activeTier.emoji}</span>
                    <span className={`text-xl font-bold ${activeTier.color}`}>{activeTier.name}</span>
                    <Badge variant="outline" className={`${activeTier.color} ${activeTier.bgColor} border-current/30 text-xs`}>
                      {activeTier.subtitle}
                    </Badge>
                  </div>
                  <p className="text-sm text-neutral-content leading-relaxed">{activeTier.description}</p>
                </div>
                <div className="text-right shrink-0 bg-base-200/40 rounded-xl p-3 border border-base-300/30">
                  <div className={`text-2xl font-bold font-mono ${activeTier.color}`}>
                    {activeTier.rangeMin}–{activeTier.rangeMax}g
                  </div>
                  <div className="text-[10px] text-neutral-content uppercase tracking-wider mt-0.5">leaf powder</div>
                </div>
              </div>

              <div className="mt-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 p-3">
                <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 mb-1.5">
                  <FlaskConical className="h-3.5 w-3.5" />
                  Extract Equivalent ({inputMode === 'percent' ? `${extractValue}% mitragynine` : `${extractValue}× ratio`})
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-mono font-semibold text-base-content">
                    {formatGrams(leafToExtract(activeTier.rangeMin, concentrationFactor))}g
                  </span>
                  <span className="text-neutral-content">to</span>
                  <span className="font-mono font-semibold text-base-content">
                    {formatGrams(leafToExtract(activeTier.rangeMax, concentrationFactor))}g
                  </span>
                  <span className="text-xs text-neutral-content">extract</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-neutral-content mt-3">
                <Clock className="h-3 w-3" />
                <span>Duration: <span className="font-medium text-base-content">{activeTier.duration}</span></span>
              </div>

              <Separator className="my-3" />

              <div className="flex flex-wrap gap-1.5">
                {activeTier.effects.map((effect, i) => (
                  <span key={i} className={`badge badge-outline text-xs ${activeTier.color} ${activeTier.bgColor}`}>
                    {effect}
                  </span>
                ))}
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ─── Compact Tier Reference ───────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {hasValidExtract && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="mb-6"
          >
            <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
              <Leaf className="h-4 w-4" />
              All Dose Tiers
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {doseTiers.map((tier, idx) => {
                const isActive = activeTier?.name === tier.name
                return (
                  <div
                    key={idx}
                    className={`card card-transparent p-3 border transition-all ${isActive ? `${tier.borderColor} ${tier.glowClass}` : 'border-base-300/50 opacity-70 hover:opacity-100'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-semibold text-sm ${tier.color}`}>
                        {tier.emoji} {tier.name}
                      </span>
                      <span className="text-xs text-neutral-content">{tier.rangeMin}–{tier.rangeMax}g</span>
                    </div>
                    <div className="text-xs text-neutral-content mb-2">{tier.subtitle}</div>
                    <div className="text-xs font-mono text-base-content">
                      {formatGrams(leafToExtract(tier.rangeMin, concentrationFactor))}–
                      {formatGrams(leafToExtract(tier.rangeMax, concentrationFactor))}g extract
                    </div>
                  </div>
                )
              })}
              <div className={`card card-transparent p-3 border border-red-500/30 ${isOverdose ? 'glow-red' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm text-red-400">
                    <Skull className="inline h-3 w-3 mr-1" />
                    Danger
                  </span>
                  <span className="text-xs text-neutral-content">&gt;{MAX_SAFE_LEAF_DOSE}g</span>
                </div>
                <div className="text-xs text-red-400">Exceeds heavy range</div>
                <div className="text-xs font-mono text-base-content mt-1">
                  &gt;{formatGrams(leafToExtract(MAX_SAFE_LEAF_DOSE, concentrationFactor))}g extract
                </div>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ─── Empty State ──────────────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {!hasValidExtract && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="card card-transparent mb-8"
          >
            <div className="card-body flex flex-col items-center py-12 text-center">
              <Scale className="h-12 w-12 text-neutral-content/30 mb-4" />
              <h3 className="text-lg font-semibold text-neutral-content mb-1">Enter an extract strength to begin</h3>
              <p className="text-sm text-neutral-content/70 max-w-sm mb-4">
                Select or input your extract&apos;s mitragynine percentage or concentration ratio to see dose conversions.
              </p>
              <button
                onClick={() => {
                  setInputMode('percent')
                  setExtractValue('20')
                }}
                className="rounded-lg border border-emerald-500 bg-emerald-500/10 text-emerald-400 px-4 py-2 text-sm font-medium transition-colors hover:bg-emerald-500/20"
              >
                Start with 20% example
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Collapsible Pharmacological Notes ────────────────────────────── */}
      <SectionToggle
        title="Important Pharmacological Notes"
        icon={Info}
        isOpen={expandedSections.pharmacology}
        onToggle={() => toggleSection('pharmacology')}
      >
        <div className="space-y-3 text-sm text-neutral-content leading-relaxed">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
            <Info className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-emerald-400 mb-1">Mitragynine vs. 7-Hydroxymitragynine</p>
              <p className="text-xs leading-relaxed">
                Raw kratom leaf contains approximately 1–1.5% mitragynine by weight, which is the primary
                alkaloid responsible for opioid receptor activity. 7-Hydroxymitragynine (7-OH), present in trace
                amounts in raw leaf (~0.01%), is significantly more potent at mu-opioid receptors. Many commercial
                extracts are enriched or spiked with 7-OH, which dramatically changes the potency and character
                of effects beyond what the mitragynine percentage alone would suggest. Always check whether an
                extract contains added 7-OH.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-amber-400 mb-1">Bioavailability Differences</p>
              <p className="text-xs leading-relaxed">
                Extracts may have different absorption profiles compared to raw leaf powder. The plant matrix in
                whole leaf acts as a natural buffer, slowing absorption and moderating peak plasma concentrations.
                Extracts, especially liquids and tinctures, can absorb much faster, leading to a sharper onset
                and higher peak effects. This means the same equivalent dose of extract may feel subjectively
                stronger than leaf powder, even after accounting for alkaloid concentration. Start significantly
                lower than calculated.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-orange-500/5 border border-orange-500/20">
            <AlertTriangle className="h-4 w-4 text-orange-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-orange-400 mb-1">Full-Spectrum vs. Enhanced Extracts</p>
              <p className="text-xs leading-relaxed">
                Full-spectrum extracts attempt to preserve the complete alkaloid profile of the leaf, which may
                provide a more balanced experience. Enhanced or &ldquo;fortified&rdquo; extracts add isolated mitragynine
                or 7-OH to boost potency beyond what the extraction process alone would yield. The calculations
                in this tool assume standard extracts where the stated percentage reflects the total mitragynine
                content. Enhanced products may be significantly more potent than labeled. Source verification
                is critical.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/20">
            <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-red-400 mb-1">Tolerance and Dependency</p>
              <p className="text-xs leading-relaxed">
                Regular kratom use leads to rapid tolerance development, requiring escalating doses to achieve
                the same effects. Extracts accelerate this process significantly due to their higher alkaloid
                concentrations. Physical dependence can develop within weeks of daily use, and withdrawal
                symptoms (anxiety, insomnia, muscle aches, irritability, diarrhea) can be severe. Using extracts
                frequently dramatically increases dependency risk. Tolerance breaks of 2–4 weeks are recommended
                between cycles of use.
              </p>
            </div>
          </div>
        </div>
      </SectionToggle>

      {/* ─── Collapsible Harm Reduction Guidelines ─────────────────────────── */}
      <SectionToggle
        title="Harm Reduction Guidelines"
        icon={Shield}
        isOpen={expandedSections.harmReduction}
        onToggle={() => toggleSection('harmReduction')}
      >
        <ul className="space-y-3">
          {[
            'Always start with a dose well below the calculated equivalent when trying a new extract. Individual sensitivity varies enormously, and extracts can absorb faster than raw leaf. A test dose of 25–50% of the calculated amount is recommended.',
            'Never mix kratom (especially extracts) with other CNS depressants including alcohol, benzodiazepines, opioids, or gabapentinoids. The combination significantly increases the risk of respiratory depression, which can be fatal.',
            'If using extracts regularly, track your usage carefully. Tolerance to extracts builds faster than to raw leaf powder, and the margin of safety narrows as doses increase. Consider setting a maximum weekly total.',
            'Stay hydrated and maintain adequate nutrition. Kratom suppresses appetite and can contribute to dehydration, especially at higher doses. These effects compound with extract use.',
            'Store extracts securely and clearly labeled. Because extract doses are much smaller by weight than leaf powder, accidental overdose is easier. A digital milligram scale (0.001g precision) is strongly recommended.',
            'Be aware of the legal status of kratom and its extracts in your jurisdiction. Kratom is regulated or banned in several countries and US states. Possession of concentrated extracts may carry additional legal risk.',
            'If you experience signs of excessive opioid effects — extreme drowsiness, slow or shallow breathing, confusion, or loss of consciousness — seek emergency medical care immediately. Naloxone may be partially effective for kratom overdose.',
            'Plan for withdrawal if using regularly. Tapering gradually over 2–4 weeks is preferred over abrupt cessation. Consider consulting a medical professional for a tapering schedule, especially if using concentrated extracts.',
          ].map((tip, i) => (
            <li
              key={i}
              className="flex items-start gap-3 p-3 rounded-xl bg-orange-500/5 border border-orange-500/20"
            >
              <AlertTriangle className="h-4 w-4 text-orange-400 mt-0.5 shrink-0" />
              <span className="text-sm leading-relaxed">{tip}</span>
            </li>
          ))}
        </ul>
      </SectionToggle>

      {/* ─── Collapsible Dynamic Quick Reference Table ─────────────────────── */}
      <SectionToggle
        title="Quick Reference — Extract Equivalents"
        icon={Calculator}
        isOpen={expandedSections.quickRef}
        onToggle={() => toggleSection('quickRef')}
      >
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Tier</th>
                <th>Leaf (g)</th>
                <th>
                  Extract Equivalent
                  <br />
                  <span className="text-[10px] font-normal text-neutral-content">
                    ({inputMode === 'percent' ? `${extractValue}% mitragynine` : `${extractValue}× ratio`})
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {doseTiers.map((tier, i) => (
                <tr key={i}>
                  <td>
                    <span className={`font-semibold ${tier.color}`}>
                      {tier.emoji} {tier.name}
                    </span>
                  </td>
                  <td className="font-mono">{tier.rangeMin}–{tier.rangeMax}g</td>
                  <td className="font-mono text-xs">
                    {formatGrams(leafToExtract(tier.rangeMin, concentrationFactor))}–
                    {formatGrams(leafToExtract(tier.rangeMax, concentrationFactor))}g
                  </td>
                </tr>
              ))}
              <tr className="text-red-400">
                <td className="font-semibold">
                  <Skull className="inline h-3 w-3 mr-1" />
                  Danger
                </td>
                <td className="font-mono">&gt;{MAX_SAFE_LEAF_DOSE}g</td>
                <td className="font-mono text-xs">&gt;{formatGrams(leafToExtract(MAX_SAFE_LEAF_DOSE, concentrationFactor))}g</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-neutral-content mt-3">
          Leaf powder assumed to contain ~{leafBaseline}% mitragynine. Actual content varies by strain, source, and age (typically 0.8–2.0%).
        </p>
      </SectionToggle>

      {/* ─── Collapsible Emergency Resources ──────────────────────────────── */}
      <SectionToggle
        title="Emergency Resources"
        icon={Heart}
        isOpen={expandedSections.emergency}
        onToggle={() => toggleSection('emergency')}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20">
            <p className="text-xs font-medium text-red-400 mb-1">Poison Control (US)</p>
            <p className="text-lg font-bold font-mono text-base-content">1-800-222-1222</p>
            <p className="text-[10px] text-neutral-content mt-1">Available 24/7, free, confidential</p>
          </div>
          <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20">
            <p className="text-xs font-medium text-red-400 mb-1">Emergency Services</p>
            <p className="text-lg font-bold font-mono text-base-content">911</p>
            <p className="text-[10px] text-neutral-content mt-1">Call immediately if someone is unresponsive or in distress</p>
          </div>
        </div>
      </SectionToggle>

      {/* ─── Redose Planner Bottom Sheet (Mobile) ─────────────────────────────── */}
      <BottomSheet
        open={isPlanSheetOpen}
        onClose={() => setIsPlanSheetOpen(false)}
        title="Plan Redoses"
        description="Plan your redose schedule based on the calculated dose"
        maxHeight="90dvh"
      >
        <RedosePlanner
          open={true}
          onOpenChange={() => setIsPlanSheetOpen(false)}
          standalone={true}
          substance={kratom}
          baseAmount={activeExtractDose}
          baseUnit="g"
          route="oral"
          duration={kratom.routeData?.oral?.duration ?? null}
          notes={`Calculated via Kratom Extract Dose Calculator. Direction: ${calcDirection === 'leaf-to-extract' ? 'leaf → extract' : 'extract → leaf'}. Extract strength: ${inputMode === 'percent' ? `${extractValue}% mitragynine` : `${extractValue}× ratio`}. Leaf equivalent: ${formatGrams(activeLeafDose)}g. Leaf baseline: ${leafBaseline}% mitragynine. ${isEnhanced ? 'Extract marked as enhanced/fortified.' : ''}`}
          logInitialDose={true}
        />
      </BottomSheet>

      {/* ─── Redose Planner Dialog (Desktop) ───────────────────────────────── */}
      <RedosePlanner
        open={isPlanDialogOpen}
        onOpenChange={setIsPlanDialogOpen}
        substance={kratom}
        baseAmount={activeExtractDose}
        baseUnit="g"
        route="oral"
        duration={kratom.routeData?.oral?.duration ?? null}
        notes={`Calculated via Kratom Extract Dose Calculator. Direction: ${calcDirection === 'leaf-to-extract' ? 'leaf → extract' : 'extract → leaf'}. Extract strength: ${inputMode === 'percent' ? `${extractValue}% mitragynine` : `${extractValue}× ratio`}. Leaf equivalent: ${formatGrams(activeLeafDose)}g. Leaf baseline: ${leafBaseline}% mitragynine. ${isEnhanced ? 'Extract marked as enhanced/fortified.' : ''}`}
        logInitialDose={true}
      />

      <footer className="text-center py-6 text-xs text-neutral-content/50 space-y-1">
        <p>
          Information sourced from{' '}
          <a href="https://psychonautwiki.org" target="_blank" rel="noopener noreferrer" className="underline hover:text-neutral-content">
            PsychonautWiki
          </a>
          ,{' '}
          <a href="https://erowid.org" target="_blank" rel="noopener noreferrer" className="underline hover:text-neutral-content">
            Erowid
          </a>
          , and peer-reviewed pharmacological literature.
        </p>
        <p>This tool is intended for harm reduction and educational purposes only. It is not medical advice.</p>
      </footer>
    </div>
  )
}

export default function KratomCalculatorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen px-4 py-8 lg:px-8 max-w-5xl mx-auto flex items-center justify-center">
          <div className="text-center">
            <Leaf className="h-10 w-10 text-emerald-400 animate-pulse mx-auto mb-3" />
            <p className="text-sm text-neutral-content">Loading calculator...</p>
          </div>
        </div>
      }
    >
      <ErrorBoundary fallback={<CalculatorErrorFallback />} name="KratomCalculator">
        <KratomCalculatorContent />
      </ErrorBoundary>
    </Suspense>
  )
}
