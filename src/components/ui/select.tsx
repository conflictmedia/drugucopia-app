import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Select — thin adapter over daisyUI `.select`.
 *
 * Phase 2 design-system primitive. Default to `select-bordered w-full`.
 *
 * Usage:
 *   <Select>
 *     <option value="">Pick one</option>
 *     <option value="a">A</option>
 *   </Select>
 *
 * For multi-select use the native `multiple` attribute — daisyUI's select
 * handles that case automatically.
 */
const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => {
  return (
    <select
      className={cn("select select-bordered w-full", className)}
      ref={ref}
      {...props}
    />
  )
})
Select.displayName = "Select"

export { Select }
