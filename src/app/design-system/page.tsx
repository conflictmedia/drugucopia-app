'use client'

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@/components/ui/field"
import {
  Fieldset,
  FieldsetLegend,
  FieldsetDescription,
} from "@/components/ui/fieldset"
import { AVAILABLE_THEMES } from "@/components/theme-provider"

/**
 * /design-system — Phase 2 showcase + smoke test.
 *
 * This route exists to:
 *   1. Verify every standardized primitive renders without runtime errors.
 *   2. Serve as a visual reference for future page migrations.
 *   3. Document the canonical variant names consumers should use.
 *
 * Not linked from the main nav — visit /design-system directly.
 */
export default function DesignSystemPage() {
  const [tab, setTab] = React.useState("overview")
  const [selectVal, setSelectVal] = React.useState("")

  return (
    <div className="min-h-[100dvh] bg-base-100 text-base-content">
      <div className="mx-auto max-w-5xl space-y-10 px-4 py-8 md:px-8 md:py-12">
        <header className="space-y-2">
          <Badge variant="outline" size="sm">Phase 2</Badge>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Drugucopia Design System
          </h1>
          <p className="text-sm text-neutral-content max-w-2xl">
            Shared primitives standardized around daisyUI. Every component on
            this page is a thin adapter over daisyUI classes — see the source
            in <code className="kbd kbd-sm">src/components/ui/</code>.
          </p>
        </header>

        {/* ─── Buttons ─── */}
        <Section
          title="Buttons"
          description="Thin adapter over .btn. Use default (primary) for the single most important action in a region."
        >
          <div className="flex flex-wrap items-center gap-3">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="soft">Soft</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
            <Button variant="destructive">Destructive</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
            <Button size="icon" aria-label="icon button">★</Button>
          </div>
        </Section>

        {/* ─── Cards ─── */}
        <Section
          title="Cards"
          description="Default surface is base-100 + border + shadow-sm. Use elevated for tool panels and ghost for transparent overlays."
        >
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Default</CardTitle>
                <CardDescription>base-100 + border + shadow</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-neutral-content">
                  Standard content card. Padding is responsive: p-4 on mobile, p-5 on desktop.
                </p>
              </CardContent>
              <CardFooter>
                <Button size="sm" variant="outline">Action</Button>
              </CardFooter>
            </Card>

            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Elevated</CardTitle>
                <CardDescription>base-200 background</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-neutral-content">
                  Use for tool panels and grouped form regions that need to feel lifted from the page.
                </p>
              </CardContent>
            </Card>

            <Card variant="outline">
              <CardHeader>
                <CardTitle>Outline</CardTitle>
                <CardDescription>border, no shadow</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-neutral-content">
                  Flat card with a border. Useful in dense grids where shadow stacking would be noisy.
                </p>
              </CardContent>
            </Card>

            <Card variant="flat">
              <CardHeader>
                <CardTitle>Flat</CardTitle>
                <CardDescription>base-200, no border</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-neutral-content">
                  Subtle grouped region without chrome. Good for nested sections inside an elevated card.
                </p>
              </CardContent>
            </Card>

            <Card variant="ghost">
              <CardHeader>
                <CardTitle>Ghost</CardTitle>
                <CardDescription>transparent, no border</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-neutral-content">
                  Transparent wrapper. Use when the surrounding container already provides the surface.
                </p>
              </CardContent>
            </Card>
          </div>
        </Section>

        {/* ─── Badges ─── */}
        <Section
          title="Badges"
          description="One semantic badge system. For category data colors, pass a Tailwind color directly via className (rare exception)."
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default">Default</Badge>
            <Badge variant="primary">Primary</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="accent">Accent</Badge>
            <Badge variant="info">Info</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="error">Error</Badge>
            <Badge variant="destructive">Destructive (alias)</Badge>
            <Badge variant="outline">Outline</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge size="xs">xs</Badge>
            <Badge size="sm">sm (default)</Badge>
            <Badge size="md">md</Badge>
            <Badge size="lg">lg</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-neutral-content">Data-color example (substance category):</span>
            <Badge className="badge bg-purple-500 text-white border-0">Dissociative</Badge>
            <Badge className="badge bg-emerald-500 text-white border-0">Psychedelic</Badge>
            <Badge className="badge bg-amber-500 text-white border-0">Stimulant</Badge>
          </div>
        </Section>

        {/* ─── Alerts ─── */}
        <Section
          title="Alerts"
          description="One severity language: info (tip), success (safe), warning (caution), error (danger). Use soft for non-emergency contexts."
        >
          <div className="space-y-3">
            <Alert variant="info">
              <AlertTitle>Heads up</AlertTitle>
              <AlertDescription>
                Educational tip — neutral information the user might find useful.
              </AlertDescription>
            </Alert>
            <Alert variant="success">
              <AlertTitle>All good</AlertTitle>
              <AlertDescription>
                Safe or complete state — e.g. dose successfully logged.
              </AlertDescription>
            </Alert>
            <Alert variant="warning">
              <AlertTitle>Start low, go slow</AlertTitle>
              <AlertDescription>
                Caution — reminder content that doesn&apos;t indicate danger but warrants care.
              </AlertDescription>
            </Alert>
            <Alert variant="error">
              <AlertTitle>Dangerous combination</AlertTitle>
              <AlertDescription>
                Dangerous combos, emergencies, or irreversible actions. Reserved for safety content only.
              </AlertDescription>
            </Alert>
            <Alert variant="warning" soft>
              <AlertTitle>Soft variant</AlertTitle>
              <AlertDescription>
                Same severity, less aggressive styling. Recommended default for non-emergency alerts.
              </AlertDescription>
            </Alert>
          </div>
        </Section>

        {/* ─── Tabs ─── */}
        <Section
          title="Tabs"
          description="Single tab style: tabs tabs-box. React Context API preserved (Tabs / TabsList / TabsTrigger / TabsContent)."
        >
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="dosage">Dosage & Routes</TabsTrigger>
              <TabsTrigger value="effects">Effects</TabsTrigger>
              <TabsTrigger value="interactions">Interactions</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <Card variant="flat">
                <CardContent>
                  <p className="text-sm text-neutral-content">
                    Overview tab content. Switch tabs to verify the active state.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="dosage">
              <Card variant="flat">
                <CardContent>
                  <p className="text-sm text-neutral-content">Dosage & Routes content.</p>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="effects">
              <Card variant="flat">
                <CardContent>
                  <p className="text-sm text-neutral-content">Effects content.</p>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="interactions">
              <Card variant="flat">
                <CardContent>
                  <p className="text-sm text-neutral-content">Interactions content.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </Section>

        {/* ─── Accordion ─── */}
        <Section
          title="Accordion / Collapse"
          description="Thin adapter over .collapse.collapse-arrow. Single and multiple open modes supported."
        >
          <Accordion type="single" defaultValue="guide-1">
            <AccordionItem value="guide-1">
              <AccordionTrigger>What is harm reduction?</AccordionTrigger>
              <AccordionContent>
                Harm reduction is a set of practical strategies aimed at reducing negative consequences associated with drug use. This includes education, dosage guidelines, and emergency resources.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="guide-2">
              <AccordionTrigger>How do I use the dose log?</AccordionTrigger>
              <AccordionContent>
                The dose log records every substance you take, along with route, dose, and timestamp. Use it to track active sessions and review historical patterns.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="guide-3">
              <AccordionTrigger>Why are some combinations flagged?</AccordionTrigger>
              <AccordionContent>
                Combinations are flagged based on pharmacological interactions documented in peer-reviewed sources. Red flags indicate contraindicated combos; amber flags indicate caution.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Section>

        {/* ─── Form fields ─── */}
        <Section
          title="Form fields"
          description="Field for single inputs; Fieldset for grouped sections with a legend."
        >
          <div className="grid gap-6 md:grid-cols-2">
            <Fieldset>
              <FieldsetLegend>Dose details</FieldsetLegend>
              <FieldsetDescription>
                All fields are required for accurate tracking.
              </FieldsetDescription>

              <Field>
                <FieldLabel htmlFor="ds-substance">Substance</FieldLabel>
                <Input id="ds-substance" placeholder="e.g. Caffeine" />
                <FieldDescription>Search by substance name or alias.</FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="ds-route">Route of administration</FieldLabel>
                <Select
                  id="ds-route"
                  value={selectVal}
                  onChange={(e) => setSelectVal(e.target.value)}
                >
                  <option value="">Pick a route…</option>
                  <option value="oral">Oral</option>
                  <option value="sublingual">Sublingual</option>
                  <option value="insufflated">Insufflated</option>
                  <option value="inhaled">Inhaled</option>
                </Select>
              </Field>

              <Field state="error">
                <FieldLabel htmlFor="ds-amount">Amount (mg)</FieldLabel>
                <Input id="ds-amount" type="number" inputMode="decimal" placeholder="0" />
                <FieldError>Amount must be greater than zero.</FieldError>
              </Field>

              <Field>
                <FieldLabel htmlFor="ds-notes">Notes</FieldLabel>
                <Textarea id="ds-notes" placeholder="Optional context (set, setting, etc.)" rows={3} />
              </Field>
            </Fieldset>

            <Fieldset>
              <FieldsetLegend>State variants</FieldsetLegend>
              <FieldsetDescription>
                Field state drives the description tone automatically.
              </FieldsetDescription>

              <Field state="default">
                <FieldLabel>Default state</FieldLabel>
                <Input placeholder="Default" />
                <FieldDescription>Neutral helper text.</FieldDescription>
              </Field>

              <Field state="success">
                <FieldLabel>Success state</FieldLabel>
                <Input placeholder="Success" className="input-success" />
                <FieldDescription tone="success">Looks good.</FieldDescription>
              </Field>

              <Field state="warning">
                <FieldLabel>Warning state</FieldLabel>
                <Input placeholder="Warning" className="input-warning" />
                <FieldDescription tone="warning">Double-check this value.</FieldDescription>
              </Field>

              <Field state="error">
                <FieldLabel>Error state</FieldLabel>
                <Input placeholder="Error" className="input-error" />
                <FieldDescription tone="error">This field has a problem.</FieldDescription>
              </Field>
            </Fieldset>
          </div>
        </Section>

        {/* ─── Severity ladder reference ─── */}
        <Section
          title="Severity language"
          description="One canonical mapping from intent → color, used everywhere across the app."
        >
          <Card variant="flat">
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <Badge variant="info">info</Badge>
                  <p className="text-sm text-neutral-content">
                    Neutral educational tips. No action required.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Badge variant="success">success</Badge>
                  <p className="text-sm text-neutral-content">
                    Safe / complete state. Confirm an action succeeded.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Badge variant="warning">warning</Badge>
                  <p className="text-sm text-neutral-content">
                    Caution / reminder. &quot;Start low&quot; content, redose timers.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Badge variant="error">error</Badge>
                  <p className="text-sm text-neutral-content">
                    Dangerous combos, emergencies, irreversible actions.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Section>

        {/* ─── Theme Gallery ─── */}
        <Section
          title="Theme gallery"
          description={`Every theme below is defined as an idiomatic daisyUI 5 \`@plugin "daisyui/theme"\` block in globals.css. All themes share a neutral-dark base canvas so the milkdrop background shows through; each theme's personality is carried by primary / secondary / accent / info / success / warning / error only.`}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {AVAILABLE_THEMES.filter((t) => t.id !== "system").map((t) => (
              <ThemePreviewCard key={t.id} themeId={t.id} label={t.label} description={t.description} />
            ))}
          </div>
          <p className="text-xs text-neutral-content">
            Tip: open the theme picker in the top bar to apply any of these to
            the whole app. The swatches above are scoped previews — each card
            sets <code className="kbd kbd-xs">data-theme</code> on its wrapper
            so daisyUI's theme-scoped CSS variables apply inside it.
          </p>
        </Section>

        <footer className="border-t border-base-300 pt-6">
          <p className="text-xs text-neutral-content">
            Phase 2 — Shared design primitives. See <code className="kbd kbd-sm">daisyui-redesign-plan.md</code> §10.
          </p>
        </footer>
      </div>
    </div>
  )
}

/**
 * Scoped theme preview card. The outer <div> sets `data-theme` so all
 * daisyUI semantic colors inside resolve to that theme's palette. The
 * card surface itself uses an opaque `bg-base-100` so the parent
 * theme doesn't bleed through.
 */
function ThemePreviewCard({
  themeId,
  label,
  description,
}: {
  themeId: string
  label: string
  description: string
}) {
  return (
    <div
      data-theme={themeId}
      className="card bg-base-100 text-base-content border border-base-300 shadow-sm overflow-hidden"
    >
      <div className="card-body gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-tight">{label}</span>
            <span className="text-[11px] leading-tight text-neutral-content">
              {description}
            </span>
          </div>
          <code className="kbd kbd-xs text-[10px]">{themeId}</code>
        </div>

        {/* Semantic color swatches — 7 segments, no gaps, rounded */}
        <div className="flex h-6 w-full overflow-hidden rounded-md border border-base-300">
          <span className="flex-1 bg-primary" title="primary" />
          <span className="flex-1 bg-secondary" title="secondary" />
          <span className="flex-1 bg-accent" title="accent" />
          <span className="flex-1 bg-info" title="info" />
          <span className="flex-1 bg-success" title="success" />
          <span className="flex-1 bg-warning" title="warning" />
          <span className="flex-1 bg-error" title="error" />
        </div>

        {/* Live component preview using that theme's tokens */}
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn btn-primary btn-xs">Primary</button>
          <button className="btn btn-secondary btn-xs">Secondary</button>
          <button className="btn btn-accent btn-xs">Accent</button>
          <span className="badge badge-info badge-sm">info</span>
          <span className="badge badge-success badge-sm">success</span>
          <span className="badge badge-warning badge-sm">warning</span>
          <span className="badge badge-error badge-sm">error</span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 text-[11px]">
          <div className="flex items-center justify-between rounded bg-base-200 px-2 py-1">
            <span className="text-neutral-content">base-100</span>
            <span className="font-mono">bg-base-100</span>
          </div>
          <div className="flex items-center justify-between rounded bg-base-200 px-2 py-1">
            <span className="text-neutral-content">base-200</span>
            <span className="font-mono">bg-base-200</span>
          </div>
          <div className="flex items-center justify-between rounded bg-base-300 px-2 py-1">
            <span className="text-neutral-content">base-300</span>
            <span className="font-mono">bg-base-300</span>
          </div>
          <div className="flex items-center justify-between rounded bg-neutral px-2 py-1">
            <span className="text-neutral-content">neutral</span>
            <span className="font-mono text-neutral-content">bg-neutral</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="text-sm text-neutral-content max-w-2xl">{description}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  )
}
