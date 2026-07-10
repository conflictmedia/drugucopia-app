import {
  Brain,
  FlaskConical,
  Ghost,
  Heart,
  Leaf,
  Moon as MoonIcon,
  Pill,
  Shield,
  Sparkles,
  Split,
  Zap,
} from 'lucide-react'
import type React from 'react'
import type { SubstanceCategory } from '@/lib/substances/index'

export const categoryIcons: Record<SubstanceCategory, React.ElementType> = {
  stimulants: Zap,
  depressants: MoonIcon,
  hallucinogens: Sparkles,
  dissociatives: Split,
  empathogens: Heart,
  cannabinoids: Leaf,
  opioids: Pill,
  deliriants: Ghost,
  nootropics: Brain,
  other: FlaskConical,
  medications: Shield,
}

export const categoryColors: Record<SubstanceCategory, string> = {
  stimulants: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  depressants: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
  hallucinogens: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
  dissociatives: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20',
  empathogens: 'text-pink-500 bg-pink-500/10 border-pink-500/20',
  cannabinoids: 'text-green-500 bg-green-500/10 border-green-500/20',
  opioids: 'text-red-500 bg-red-500/10 border-red-500/20',
  deliriants: 'text-slate-500 bg-slate-500/10 border-slate-500/20',
  nootropics: 'text-teal-500 bg-teal-500/10 border-teal-500/20',
  other: 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20',
  medications: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
}

export const categoryDotColors: Record<SubstanceCategory, string> = {
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
  medications: 'bg-emerald-500',
}

export const categoryGlowClasses: Record<SubstanceCategory, string> = {
  stimulants: 'hover:glow-amber',
  depressants: 'hover:glow-indigo',
  hallucinogens: 'hover:glow-purple',
  dissociatives: 'hover:glow-cyan',
  empathogens: 'hover:glow-pink',
  cannabinoids: 'hover:glow-green',
  opioids: 'hover:glow-red',
  deliriants: 'hover:glow-slate',
  nootropics: 'hover:glow-teal-cat',
  other: 'hover:glow-zinc',
  medications: 'hover:glow-green',
}

export const riskLevelColors = {
  low: 'bg-green-500/20 text-green-400 border-green-500/30',
  moderate: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'very-high': 'bg-red-500/20 text-red-400 border-red-500/30',
}

export const routeIconMap: Record<string, string> = {
  Oral: '💊',
  Sublingual: '👅',
  Inhalation: '💨',
  Insufflation: '👃',
  Intravenous: '💉',
  Intramuscular: '💉',
  Transdermal: '🩹',
  Rectal: '⬇️',
  Nasal: '👃',
  Smoking: '🔥',
  'Lemon Tek': '🍋',
  Tea: '🍵',
  Topical: '🤲',
}

export const routeDangerColors: Record<string, string> = {
  Intravenous: 'border-red-500/40 bg-red-500/5',
  Intramuscular: 'border-orange-500/40 bg-orange-500/5',
  Smoking: 'border-orange-500/30 bg-orange-500/5',
}

export const GITHUB_NEW_SUBSTANCE_URL =
  'https://github.com/drugucopia/substances/issues/new?template=new-substance-request.md'
export const GITHUB_INFO_CHANGE_URL =
  'https://github.com/drugucopia/substances/issues/new?template=change-substance-info.md'
export const GITHUB_FEEDBACK_URL = 'https://github.com/drugucopia/substances/issues/new'
export const GITHUB_MAIN_URL = 'https://github.com/drugucopia/drugucopia'

export type MobileTab = 'substances' | 'timeline' | 'log' | 'history'
