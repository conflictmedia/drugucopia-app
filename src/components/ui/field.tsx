'use client'

import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Field — vertical form-field grouping (label + control + description/error).
 *
 * Phase 2 design-system primitive. Use everywhere a single input needs a
 * label, hint, or validation message. For grouping multiple fields under a
 * titled section, use <Fieldset> instead.
 *
 * Layout:
 *   ┌─────────────────────────────┐
 *   │ Label                       │
 *   │ <input / select / textarea> │
 *   │ description / error         │
 *   └─────────────────────────────┘
 *
 * The control slot accepts any element. If you pass a string className on
 * <Field>, it's applied to the outer wrapper.
 */

export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Visual / validation state — drives the description color. */
  state?: "default" | "error" | "warning" | "success"
}

export function Field({
  className,
  state = "default",
  children,
  ...props
}: FieldProps) {
  return (
    <FieldStateContext.Provider value={state}>
      <div
        className={cn("flex flex-col gap-1.5", className)}
        data-state={state}
        {...props}
      >
        {children}
      </div>
    </FieldStateContext.Provider>
  )
}

const FieldStateContext = React.createContext<"default" | "error" | "warning" | "success">("default")

export function FieldLabel({
  className,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("label justify-start text-sm font-medium pb-0.5", className)}
      {...props}
    >
      {children}
    </label>
  )
}

export function FieldDescription({
  className,
  children,
  tone,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement> & {
  /** Override tone; defaults to inheriting from <Field state>. */
  tone?: "default" | "error" | "warning" | "success"
}) {
  const fieldState = React.useContext(FieldStateContext)
  const effective = tone ?? fieldState

  const toneClass = {
    default: "text-neutral-content",
    error: "text-error",
    warning: "text-warning",
    success: "text-success",
  }[effective]

  return (
    <p
      className={cn("text-xs leading-relaxed", toneClass, className)}
      {...props}
    >
      {children}
    </p>
  )
}

// Alias for backwards-compat with shadcn naming.
export const FieldMessage = FieldDescription
export const FieldError = (props: React.HTMLAttributes<HTMLParagraphElement>) => (
  <FieldDescription tone="error" {...props} />
)
