import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Label — thin adapter over daisyUI `.label`.
 *
 * Phase 2 design-system primitive. Use inside <Field> or as a standalone
 * label. For floating labels use daisyUI's `floating-label` directly.
 */
const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn("label", className)}
    {...props}
  />
))
Label.displayName = "Label"

export { Label }
