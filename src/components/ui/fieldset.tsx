import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Fieldset — thin adapter over daisyUI `.fieldset`.
 *
 * Phase 2 design-system primitive. Use to group related form fields under a
 * titled section with an optional description. Replaces ad-hoc
 * <fieldset>+<legend> + custom CSS patterns.
 *
 * Layout:
 *   <Fieldset>
 *     <FieldsetLegend>Dose details</FieldsetLegend>
 *     <Field>...</Field>
 *     <Field>...</Field>
 *     <FieldsetDescription>Optional helper text.</FieldsetDescription>
 *   </Fieldset>
 *
 * The daisyUI `.fieldset` class already provides vertical spacing between
 * children — no need to add `space-y-*`.
 */

const Fieldset = React.forwardRef<
  HTMLFieldSetElement,
  React.FieldsetHTMLAttributes<HTMLFieldSetElement>
>(({ className, ...props }, ref) => (
  <fieldset
    ref={ref}
    className={cn("fieldset border border-base-300 bg-base-200/40 rounded-box p-4 md:p-5", className)}
    {...props}
  />
))
Fieldset.displayName = "Fieldset"

const FieldsetLegend = React.forwardRef<
  HTMLLegendElement,
  React.HTMLAttributes<HTMLLegendElement>
>(({ className, ...props }, ref) => (
  <legend
    ref={ref}
    className={cn("fieldset-legend font-semibold text-sm", className)}
    {...props}
  />
))
FieldsetLegend.displayName = "FieldsetLegend"

const FieldsetDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("label text-neutral-content", className)}
    {...props}
  />
))
FieldsetDescription.displayName = "FieldsetDescription"

export { Fieldset, FieldsetLegend, FieldsetDescription }
