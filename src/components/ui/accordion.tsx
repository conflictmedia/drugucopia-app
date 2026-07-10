'use client'

import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Accordion — thin adapter over daisyUI `.collapse.collapse-arrow`.
 *
 * Phase 2 design-system primitive. Keeps the React Context API (Accordion /
 * AccordionItem / AccordionTrigger / AccordionContent) for controlled open
 * state, but renders daisyUI's native `.collapse` DOM so the visual language
 * is unified across the app.
 *
 * Variant:  arrow (default) | plus | none
 * Type:     single (default) | multiple
 *
 * The trigger is a real <button> with proper aria-expanded/aria-controls for
 * AT support; the daisyUI checkbox hack is not used (it doesn't carry
 * semantics).
 */

type AccordionVariant = "arrow" | "plus" | "none"

const variantClass: Record<AccordionVariant, string> = {
  arrow: "collapse-arrow",
  plus: "collapse-plus",
  none: "",
}

const AccordionContext = React.createContext<{
  openItems: Set<string>
  toggleItem: (value: string) => void
  type: "single" | "multiple"
}>({ openItems: new Set(), toggleItem: () => {}, type: "single" })

const AccordionItemContext = React.createContext<{
  value: string
  triggerId: string
  contentId: string
}>({ value: "", triggerId: "", contentId: "" })

function Accordion({
  type = "single",
  defaultValue,
  variant = "arrow",
  className,
  children,
  ...props
}: {
  type?: "single" | "multiple"
  defaultValue?: string | string[]
  variant?: AccordionVariant
  className?: string
  children?: React.ReactNode
} & React.HTMLAttributes<HTMLDivElement>) {
  const [openItems, setOpenItems] = React.useState<Set<string>>(() => {
    if (!defaultValue) return new Set()
    if (Array.isArray(defaultValue)) return new Set(defaultValue)
    return new Set([defaultValue])
  })

  const toggleItem = React.useCallback(
    (value: string) => {
      setOpenItems((prev) => {
        const next = new Set(prev)
        if (next.has(value)) {
          next.delete(value)
        } else {
          if (type === "single") next.clear()
          next.add(value)
        }
        return next
      })
    },
    [type]
  )

  return (
    <AccordionContext.Provider value={{ openItems, toggleItem, type }}>
      <div
        className={cn(
          "join join-vertical bg-transparent border border-base-300 rounded-box divide-y divide-base-300",
          className
        )}
        data-variant={variant}
        {...props}
      >
        {React.Children.map(children, (child) => {
          if (!React.isValidElement(child)) return child
          // Inject variant as a prop into each AccordionItem so children don't
          // have to repeat it.
          const childProps = child.props as { variant?: AccordionVariant }
          if (childProps.variant) return child
          return React.cloneElement(child, { variant } as Record<string, unknown>)
        })}
      </div>
    </AccordionContext.Provider>
  )
}

function AccordionItem({
  value,
  variant = "arrow",
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  value: string
  variant?: AccordionVariant
}) {
  const reactId = React.useId()
  const triggerId = `acc-trigger-${reactId}`
  const contentId = `acc-content-${reactId}`
  const isOpen = React.useContext(AccordionContext).openItems.has(value)

  return (
    <AccordionItemContext.Provider value={{ value, triggerId, contentId }}>
      <div
        data-state={isOpen ? "open" : "closed"}
        className={cn(
          "collapse join-item",
          variantClass[variant],
          className
        )}
        {...props}
      >
        {children}
      </div>
    </AccordionItemContext.Provider>
  )
}

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { openItems, toggleItem } = React.useContext(AccordionContext)
  const { value, triggerId, contentId } = React.useContext(AccordionItemContext)
  const isOpen = openItems.has(value)

  return (
    <button
      type="button"
      id={triggerId}
      onClick={() => toggleItem(value)}
      aria-expanded={isOpen}
      aria-controls={contentId}
      className={cn(
        "collapse-title text-left text-sm font-medium min-h-0 py-3.5 px-4 cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { triggerId, contentId, value } = React.useContext(AccordionItemContext)
  const isOpen = React.useContext(AccordionContext).openItems.has(value)

  return (
    <div
      id={contentId}
      role="region"
      aria-labelledby={triggerId}
      aria-hidden={!isOpen}
      className={cn("collapse-content", className)}
      {...props}
    >
      <div className="px-4 pb-4 pt-0 text-sm text-base-content/80">
        {children}
      </div>
    </div>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
