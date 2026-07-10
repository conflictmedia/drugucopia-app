import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Button — thin adapter over daisyUI `.btn`.
 *
 * Phase 2 design-system primitive. Maps the project's semantic variant names
 * to daisyUI classes 1:1. Use `<Button />` (no variant) for the default
 * neutral button — reserve `default` (primary) for the single most important
 * action in a region.
 *
 * Variants:
 *   - default     → btn btn-primary   (one per region, per design plan §3)
 *   - secondary   → btn btn-secondary
 *   - destructive → btn btn-error
 *   - outline     → btn btn-outline
 *   - soft        → btn btn-soft      (low-emphasis tinted)
 *   - ghost       → btn btn-ghost     (no chrome, hover only)
 *   - link        → btn btn-link
 *
 * Sizes: default | sm | lg | icon
 */
const variantClasses = {
  default: "btn btn-primary",
  secondary: "btn btn-secondary",
  destructive: "btn btn-error",
  outline: "btn btn-outline",
  soft: "btn btn-soft",
  ghost: "btn btn-ghost",
  link: "btn btn-link",
} as const

const sizeClasses = {
  default: "",
  sm: "btn-sm",
  lg: "btn-lg",
  icon: "btn-square btn-sm",
} as const

export type ButtonVariant = keyof typeof variantClasses
export type ButtonSize = keyof typeof sizeClasses

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(variantClasses[variant], sizeClasses[size], className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, variantClasses as buttonVariants }
