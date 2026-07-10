import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Alert — thin adapter over daisyUI `.alert`.
 *
 * Phase 2 design-system primitive. One canonical severity language across
 * the app, per redesign plan §8.4:
 *
 *   - default     → alert (neutral)
 *   - info        → alert alert-info       (educational tips)
 *   - success     → alert alert-success    (safe / complete states)
 *   - warning     → alert alert-warning    (caution / "start low" content)
 *   - error       → alert alert-error      (dangerous combos, emergencies)
 *   - destructive → alias for error (back-compat)
 *
 * Soft mode: pass `soft` to use `alert-soft` instead of solid color blocks.
 * This is the recommended default for non-emergency informational alerts —
 * it reduces visual noise around safety-critical content (plan §3, §6.5).
 *
 * Direction: horizontal (default) | vertical — pass `sm:alert-horizontal`
 * via className for responsive layouts, per daisyUI docs.
 */

// Literal strings so Tailwind's content scanner always sees them.
const variantClasses = {
  default: "alert",
  info: "alert alert-info",
  success: "alert alert-success",
  warning: "alert alert-warning",
  error: "alert alert-error",
  destructive: "alert alert-error",
} as const

// Soft variants: daisyUI's `alert-soft` replaces the solid color block with
// a tinted background and matching text/border color.
const softVariantClasses = {
  default: "alert alert-soft",
  info: "alert alert-info alert-soft",
  success: "alert alert-success alert-soft",
  warning: "alert alert-warning alert-soft",
  error: "alert alert-error alert-soft",
  destructive: "alert alert-error alert-soft",
} as const

export type AlertVariant = keyof typeof variantClasses

interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant
  /** Use soft tinted style instead of solid color block. */
  soft?: boolean
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "default", soft = false, ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(
        soft ? softVariantClasses[variant] : variantClasses[variant],
        className
      )}
      {...props}
    />
  )
)
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("font-bold", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }
