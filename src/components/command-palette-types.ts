import { Pill, Activity, Shield, Plus, Wine, Search, CornerDownLeft, ChevronUp, ChevronDown } from 'lucide-react'

export type ResultKind = 'substance' | 'history' | 'guide' | 'action'

export interface PaletteResult {
  id: string
  kind: ResultKind
  title: string
  subtitle?: string
  /** URL to navigate to, OR null for an action callback */
  href?: string
  action?: () => void
  icon: typeof Pill
  /** Optional category dot color for substances */
  dotClass?: string
}

export const CATEGORY_DOTS: Record<string, string> = {
  stimulants: 'bg-amber-500',
  depressants: 'bg-indigo-500',
  hallucinogens: 'bg-purple-500',
  dissociatives: 'bg-cyan-500',
  empathogens: 'bg-pink-500',
  cannabinoids: 'bg-green-500',
  opioids: 'bg-red-500',
  deliriants: 'bg-slate-500',
  nootropics: 'bg-teal-500',
  other: 'bg-zinc-500',
}