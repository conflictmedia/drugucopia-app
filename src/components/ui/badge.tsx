import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Badge — thin adapter over daisyUI `.badge`.
 *
 * Phase 2 design-system primitive. Single badge system across the app.
 *
 * Variants (semantic — for UI state):
 *   - default     → badge (neutral)
 *   - secondary   → badge badge-secondary
 *   - primary     → badge badge-primary
 *   - accent      → badge badge-accent
 *   - info        → badge badge-info
 *   - success     → badge badge-success
 *   - warning     → badge badge-warning
 *   - error       → badge badge-error
 *   - destructive → alias for error (back-compat)
 *   - outline     → badge badge-outline
 *
 * Sizes: xs | sm (default) | md | lg
 *
 * For data-driven badges (substance categories that need stable identity
 * colors regardless of theme), pass a Tailwind color directly via className,
 * e.g. `<Badge className="badge bg-purple-500 text-white border-0">`. Per
 * the redesign plan §3 these are the only acceptable hard-coded colors.
 */
const variantClasses = {
  default: "badge",
  secondary: "badge badge-secondary",
  primary: "badge badge-primary",
  accent: "badge badge-accent",
  info: "badge badge-info",
  success: "badge badge-success",
  warning: "badge badge-warning",
  error: "badge badge-error",
  destructive: "badge badge-error",
  outline: "badge badge-outline",
} as const

const sizeClasses = {
  xs: "badge-xs",
  sm: "badge-sm",
  md: "badge-md",
  lg: "badge-lg",
} as const

export type BadgeVariant = keyof typeof variantClasses
export type BadgeSize = keyof typeof sizeClasses

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  size?: BadgeSize
}

function Badge({
  className,
  variant = "default",
  size = "sm",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(variantClasses[variant], sizeClasses[size], className)}
      {...props}
    />
  )
}

export { Badge, variantClasses as badgeVariants }
