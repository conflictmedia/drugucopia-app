import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Input — thin adapter over daisyUI `.input`.
 *
 * Phase 2 design-system primitive. Default to `input-bordered w-full` for
 * consistency. For inline label + input groups use the daisyUI `.input`
 * parent pattern (see daisyUI's label component docs).
 *
 * Sizes: native daisyUI sizes via className (`input-sm`, `input-lg`).
 * Colors: native daisyUI colors via className (`input-error`, `input-warning`).
 */
const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn("input input-bordered w-full", className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
