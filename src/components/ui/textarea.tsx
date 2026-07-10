import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Textarea — thin adapter over daisyUI `.textarea`.
 *
 * Phase 2 design-system primitive. Default to `textarea-bordered w-full`.
 */
const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn("textarea textarea-bordered w-full", className)}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
