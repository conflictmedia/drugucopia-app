import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Card — thin adapter over daisyUI `.card`.
 *
 * Phase 2 design-system primitive. Standardizes:
 *   - Surface: `bg-base-100` default; `bg-base-200` for elevated regions;
 *     `bg-transparent` (no border) for `ghost`.
 *   - Border: `border border-base-300` for default and elevated.
 *   - Shadow: subtle `shadow-sm` only on default/elevated.
 *   - Padding: `card-body` mobile = `p-4`, desktop = `md:p-5`.
 *
 * Variants:
 *   - default  → base-100 + border + shadow-sm
 *   - elevated → base-200 + border + shadow-sm
 *   - outline  → base-100 + border, no shadow
 *   - ghost    → transparent, no border, no shadow
 *   - flat     → base-200, no border, no shadow
 *
 * NOTE: `.card-transparent` (legacy glass effect) is preserved in globals.css
 * as a deprecated alias that maps to the standard `default` card. New code
 * should use `<Card />` or `<Card variant="elevated" />` instead.
 */
const variantClasses = {
  default: "card bg-base-100 text-base-content border border-base-300 shadow-sm",
  elevated: "card bg-base-200 text-base-content border border-base-300 shadow-sm",
  outline: "card bg-base-100 text-base-content border border-base-300",
  ghost: "card bg-transparent text-base-content",
  flat: "card bg-base-200 text-base-content",
} as const

export type CardVariant = keyof typeof variantClasses

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { variant?: CardVariant }
>(({ className, variant = "default", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(variantClasses[variant], className)}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("card-body gap-1.5 p-4 pb-0 md:p-5 md:pb-0", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("card-title text-base font-semibold", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-neutral-content", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("card-body p-4 pt-4 md:p-5 md:pt-4", className)}
    {...props}
  />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("card-actions p-4 pt-0 md:p-5 md:pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
}
