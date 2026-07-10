'use client'

import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Tabs — thin adapter over daisyUI `.tabs.tabs-box`.
 *
 * Phase 2 design-system primitive. Replaces the previous custom Radix-style
 * tab chrome with native daisyUI tabs. The React Context API (Tabs /
 * TabsList / TabsTrigger / TabsContent) is preserved so existing call sites
 * keep working — only the underlying DOM/CSS changes.
 *
 * Style: `tabs tabs-box` (single, system-wide).
 * Sizes: default | sm | lg
 * Variant: default | border | lift  (defaults to box; `border` and `lift`
 *          are available for special layouts but discouraged for new code.)
 */

type TabsVariant = "box" | "border" | "lift"
type TabsSize = "default" | "sm" | "lg"

const variantClass: Record<TabsVariant, string> = {
  box: "tabs-box",
  border: "tabs-border",
  lift: "tabs-lift",
}

const sizeClass: Record<TabsSize, string> = {
  default: "tabs-md",
  sm: "tabs-sm",
  lg: "tabs-lg",
}

const TabsContext = React.createContext<{
  value?: string
  onValueChange?: (value: string) => void
}>({})

function Tabs({
  value: controlledValue,
  defaultValue,
  onValueChange,
  variant = "box",
  size = "default",
  className,
  children,
  ...props
}: {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  variant?: TabsVariant
  size?: TabsSize
} & React.HTMLAttributes<HTMLDivElement>) {
  const [internalValue, setInternalValue] = React.useState(defaultValue || "")
  const value = controlledValue ?? internalValue

  const handleChange = React.useCallback(
    (newValue: string) => {
      if (controlledValue === undefined) {
        setInternalValue(newValue)
      }
      onValueChange?.(newValue)
    },
    [controlledValue, onValueChange]
  )

  return (
    <TabsContext.Provider value={{ value, onValueChange: handleChange }}>
      <div className={cn("flex flex-col gap-3", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

function TabsList({
  variant = "box",
  size = "default",
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: TabsVariant
  size?: TabsSize
}) {
  // The Tabs container needs variant/size on the parent as well, so we read
  // them from props here. If the consumer set them on <Tabs>, those win.
  return (
    <div
      role="tablist"
      className={cn(
        "tabs",
        variantClass[variant],
        sizeClass[size],
        "w-fit",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function TabsTrigger({
  value,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) {
  const ctx = React.useContext(TabsContext)
  const isActive = ctx.value === value

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      data-state={isActive ? "active" : "inactive"}
      onClick={() => ctx.onValueChange?.(value)}
      className={cn("tab", isActive && "tab-active", className)}
      {...props}
    >
      {children}
    </button>
  )
}

function TabsContent({
  value,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { value: string }) {
  const ctx = React.useContext(TabsContext)
  if (ctx.value !== value) return null

  return (
    <div
      role="tabpanel"
      data-state={ctx.value === value ? "active" : "inactive"}
      className={cn("flex-1 outline-none", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
