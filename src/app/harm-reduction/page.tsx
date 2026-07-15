'use client'

import React, { useState, useMemo, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Shield,
  AlertTriangle,
  Phone,
  Heart,
  Brain,
  Droplets,
  Syringe,
  GlassWater,
  AlertOctagon,
  Trees,
  TestTubes,
  Timer,
  ExternalLink,
  BookOpen,
  Shuffle,
  Search,
  X,
  type LucideIcon,
} from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  generalGuides,
  emergencyResources,
  dangerousInteractions,
  externalResources,
  quickPrinciples,
  type GuideSeverity,
  type DangerousInteraction,
} from '@/lib/harm-reduction-data'
import { substances } from '@/lib/substances/index'

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const categoryColors: Record<string, string> = {
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
}

const severityColors: Record<GuideSeverity, string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  important: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  recommended: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
}

const severityLabels: Record<GuideSeverity, string> = {
  critical: 'CRITICAL',
  important: 'IMPORTANT',
  recommended: 'RECOMMENDED',
}

const riskColors: Record<string, string> = {
  fatal: 'bg-red-600 text-neutral-100 border-red-600',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  moderate: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
}

const riskLabels: Record<string, string> = {
  fatal: 'FATAL',
  high: 'HIGH RISK',
  moderate: 'MODERATE',
}

const iconMap: Record<string, LucideIcon> = {
  Droplets,
  Trees,
  TestTubes,
  AlertOctagon,
  Syringe,
  GlassWater,
  Phone,
  Heart,
  Timer,
  Brain,
  BookOpen,
  Shield,
}

function getGuideIcon(name: string): LucideIcon {
  return iconMap[name] || Shield
}

// ─── COMPONENTS ──────────────────────────────────────────────────────────────

function EmergencyCard({ resource }: { resource: typeof emergencyResources[0] }) {
  return (
    <div className="card card-transparent border-red-500/20 bg-red-500/5 pulse-danger card-lift">
      <div className="card-body p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-red-500/10 shrink-0">
            <Phone className="h-4 w-4 text-red-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm">{resource.name}</p>
            <p className="text-lg font-mono font-bold text-red-400 mt-1">{resource.number}</p>
            <p className="text-xs text-neutral-content mt-1 leading-relaxed">{resource.description}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function PrincipleChip({ principle }: { principle: typeof quickPrinciples[0] }) {
  const iconComponent = getGuideIcon(principle.icon)
  return (
    <div className="card card-transparent card-lift">
      <div className="card-body flex-row items-start gap-3 p-4">
        <div className="p-2 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 shrink-0 border border-primary/10">
          {React.createElement(iconComponent, { className: 'h-4 w-4 text-primary' })}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm">{principle.title}</p>
          <p className="text-xs text-neutral-content mt-0.5 leading-relaxed">{principle.description}</p>
        </div>
      </div>
    </div>
  )
}

function InteractionRow({ interaction }: { interaction: DangerousInteraction }) {
  const riskColor = riskColors[interaction.risk] || riskColors.moderate
  const riskLabel = riskLabels[interaction.risk] || interaction.risk.toUpperCase()

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border border-base-300/70 bg-transparent hover:bg-base-200/50 transition-all card-lift">
      <div className="flex items-center gap-2 shrink-0 mt-0.5">
        <AlertTriangle className="h-4 w-4 text-red-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 mb-1">
          {interaction.substances.map((sub, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="text-neutral-content text-xs font-bold">+</span>}
              <span className="badge badge-outline text-xs font-medium">{sub}</span>
            </React.Fragment>
          ))}
        </div>
        <p className="text-xs text-neutral-content leading-relaxed">{interaction.description}</p>
        <div className="flex flex-wrap gap-1 mt-2">
          {interaction.category.map((cat) => (
            <span key={cat} className={`badge badge-outline text-[10px] ${categoryColors[cat] || ''}`}>
              {cat}
            </span>
          ))}
        </div>
      </div>
      <span className={`badge badge-outline shrink-0 text-[10px] font-bold ${riskColor}`}>
        {riskLabel}
      </span>
    </div>
  )
}

// ─── FALLBACK ────────────────────────────────────────────────────────────────

function HarmReductionFallback() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )
}

// ─── MAIN CONTENT ────────────────────────────────────────────────────────────

function HarmReductionContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // G3 — substance-specific deep link
  const substanceId = searchParams.get('substance')
  const targetedSubstance = useMemo(
    () => (substanceId ? substances.find((s) => s.id === substanceId) : undefined),
    [substanceId],
  )

  // G3 — dangerous interactions for targeted substance
  const targetedInteractions = useMemo(() => {
    if (!targetedSubstance) return []
    const keywords = [
      targetedSubstance.name,
      ...(targetedSubstance.aliases || []),
      ...(targetedSubstance.commonNames || []),
    ]
      .filter(Boolean)
      .map((s) => s.toLowerCase())
    return dangerousInteractions.filter((di) =>
      di.substances.some((sub) =>
        keywords.some((kw) => sub.toLowerCase().includes(kw) || kw.includes(sub.toLowerCase())),
      ),
    )
  }, [targetedSubstance])

  // H1 — search across guides
  const [guideSearch, setGuideSearch] = useState('')
  const filteredGuides = useMemo(() => {
    const q = guideSearch.trim().toLowerCase()
    if (!q) return generalGuides
    return generalGuides.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.content.toLowerCase().includes(q),
    )
  }, [guideSearch])

  // H1 — auto-expand on search
  const expandedOnSearch = useMemo(
    () => filteredGuides.map((g) => g.id),
    [filteredGuides, guideSearch],
  )

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Unified Content ── */}
      <div className="container mx-auto max-w-5xl flex-1 px-4 py-6 lg:px-6 lg:py-10">
        {/* Hero */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight gradient-text">Harm Reduction Resources</h2>
              <p className="text-neutral-content mt-1">
                Comprehensive harm reduction information to help you stay safe.
                Evidence-based, non-judgmental, and focused on reducing harm.
              </p>
            </div>
          </div>
        </div>

        {/* G3 — Substance-specific deep link */}
        {targetedSubstance && (
          <section className="mb-8">
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/15 shrink-0">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      Harm reduction for {targetedSubstance.name}
                    </h3>
                    <p className="text-xs text-neutral-content mt-0.5">
                      Personalized tips and dangerous combos for this substance.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => router.push('/harm-reduction/')}
                  className="btn btn-ghost btn-sm text-xs"
                  aria-label="Clear substance filter"
                >
                  <X className="h-3.5 w-3.5" />
                  Show all
                </button>
              </div>

              {targetedSubstance.harmReduction &&
                targetedSubstance.harmReduction.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-neutral-content">
                      Specific tips
                    </p>
                    <ul className="space-y-2">
                      {targetedSubstance.harmReduction.map((tip, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 p-2.5 rounded-lg bg-orange-500/5 border border-orange-500/15"
                        >
                          <AlertTriangle className="h-3.5 w-3.5 text-orange-500 mt-0.5 shrink-0" />
                          <span className="text-sm leading-relaxed">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {targetedInteractions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-neutral-content">
                    Dangerous combinations involving {targetedSubstance.name}
                  </p>
                  <div className="space-y-2">
                    {targetedInteractions.map((di, i) => (
                      <InteractionRow key={i} interaction={di} />
                    ))}
                  </div>
                </div>
              )}

              {(!targetedSubstance.harmReduction ||
                targetedSubstance.harmReduction.length === 0) &&
                targetedInteractions.length === 0 && (
                  <p className="text-sm text-neutral-content italic">
                    No substance-specific harm-reduction data recorded for {targetedSubstance.name}.
                    See the general guides below.
                  </p>
                )}
            </div>
          </section>
        )}

        {/* Emergency Resources */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <h3 className="text-xl font-semibold">Emergency Contacts</h3>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {emergencyResources.map((resource, i) => (
              <EmergencyCard key={i} resource={resource} />
            ))}
          </div>
        </section>

        <div className="divider" />

        {/* Quick Principles */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-semibold">Quick Reference Principles</h3>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {quickPrinciples.map((principle) => (
              <PrincipleChip key={principle.id} principle={principle} />
            ))}
          </div>
        </section>

        <div className="divider" />

        {/* Harm Reduction Guides */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <BookOpen className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-semibold">Harm Reduction Guides</h3>
            {/* H1 — search across guides */}
            <div className="relative ml-auto w-full sm:w-64 lg:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-content/60 pointer-events-none" />
              <input
                type="search"
                value={guideSearch}
                onChange={(e) => setGuideSearch(e.target.value)}
                placeholder="Search guides…"
                className="w-full bg-base-200/70 border border-base-300/50 rounded-md pl-8 pr-8 h-8 text-sm outline-none focus:border-primary/50 transition-colors"
                aria-label="Search harm reduction guides"
              />
              {guideSearch && (
                <button
                  type="button"
                  onClick={() => setGuideSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-content/60 hover:text-base-content"
                  aria-label="Clear guide search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="card card-transparent gradient-border">
            {filteredGuides.length === 0 ? (
              <div className="py-8 text-center text-sm text-neutral-content">
                No guides match &ldquo;{guideSearch}&rdquo;.
                <button
                  type="button"
                  onClick={() => setGuideSearch('')}
                  className="ml-2 text-primary hover:underline"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <Accordion
                type="multiple"
                className="w-full"
                defaultValue={guideSearch.trim() ? expandedOnSearch : undefined}
              >
                {filteredGuides.map((guide) => {
                  const GuideIcon = getGuideIcon(guide.icon)
                  return (
                    <AccordionItem key={guide.id} value={guide.id}>
                      <AccordionTrigger className="px-4 hover:no-underline">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 rounded-md bg-base-200 shrink-0">
                            <GuideIcon className="h-4 w-4 text-neutral-content" />
                          </div>
                          <span className="font-medium">{guide.title}</span>
                          <span
                            className={`badge badge-outline ml-2 text-[10px] font-bold shrink-0 ${severityColors[guide.severity]}`}
                          >
                            {severityLabels[guide.severity]}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4">
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          {guide.content.split('\n\n').map((paragraph, i) => {
                            const parts = paragraph.split(/(\*\*[^*]+\*\*)/g)
                            return (
                              <p key={i} className="text-sm text-neutral-content leading-relaxed mb-3 last:mb-0">
                                {parts.map((part, j) => {
                                  if (part.startsWith('**') && part.endsWith('**')) {
                                    return (
                                      <strong key={j} className="text-base-content font-semibold">
                                        {part.slice(2, -2)}
                                      </strong>
                                    )
                                  }
                                  return part
                                })}
                              </p>
                            )
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            )}
          </div>
        </section>

        <div className="divider" />

        {/* Dangerous Interactions */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <h3 className="text-xl font-semibold">Dangerous Interactions</h3>
            <span className="badge badge-outline bg-red-500/15 border-red-500/30 text-red-400 text-xs font-medium">
              {dangerousInteractions.length} known dangerous combos
            </span>
            <div className="ml-auto">
              <button
                className="btn btn-outline btn-primary btn-sm gap-1.5 text-xs"
                onClick={() => router.push('/interactions')}
              >
                <Shuffle className="h-3 w-3" />
                Full Checker
              </button>
            </div>
          </div>
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {dangerousInteractions.map((interaction, i) => (
              <InteractionRow key={i} interaction={interaction} />
            ))}
          </div>
        </section>

        <div className="divider" />

        {/* External Resources */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <ExternalLink className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-semibold">External Resources</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {externalResources.map((resource, i) => (
              <a
                key={i}
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <div className="card card-transparent hover:border-primary/50 transition-all h-full card-lift">
                  <div className="card-body p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm flex items-center gap-1.5">
                          {resource.name}
                          <ExternalLink className="h-3 w-3 text-neutral-content shrink-0" />
                        </p>
                        <p className="text-xs text-neutral-content mt-1 leading-relaxed">
                          {resource.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>

        <div className="divider" />

        {/* Disclaimer */}
        <section className="mb-8">
          <div className="alert alert-warning">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div>
              <h3 className="font-bold">Disclaimer</h3>
              <p className="text-xs leading-relaxed">
                This information is provided for educational and harm reduction purposes only.
                It is not medical advice, and should not replace professional medical guidance.
                Drugucopia does not encourage or condone the use of illegal substances.
                The information presented here is compiled from publicly available harm reduction
                resources and scientific literature, and while we strive for accuracy, we cannot
                guarantee its completeness or correctness. Always consult qualified healthcare
                professionals for medical advice, and always prioritize your health and safety.
                If you or someone you know is experiencing a medical emergency, call your local
                emergency services immediately.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default function HarmReductionPage() {
  return (
    <Suspense fallback={<HarmReductionFallback />}>
      <HarmReductionContent />
    </Suspense>
  )
}
