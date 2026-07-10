'use client'

import * as React from "react"
import { cn } from "@/lib/utils"

/* ─── Dropdown Menu Context ─── */
const DropdownContext = React.createContext<{
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  triggerRef: React.RefObject<HTMLButtonElement | null>
  contentRef: React.RefObject<HTMLDivElement | null>
}>({
  open: false,
  setOpen: () => { },
  triggerRef: { current: null },
  contentRef: { current: null },
})

function DropdownMenu({
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const [open, setOpen] = React.useState(false)
  // E2 — keep refs to the trigger and content so we can manage focus
  // and restore it to the trigger when the menu closes (Esc or click).
  const triggerRef = React.useRef<HTMLButtonElement | null>(null)
  const contentRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // Close on any outside click. The content wrapper has class
      // "dropdown-content"; clicks inside it (or the trigger) stay open.
      if (
        !target.closest(".dropdown-content") &&
        !target.closest("[data-dropdown-trigger]")
      ) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  return (
    <DropdownContext.Provider value={{ open, setOpen, triggerRef, contentRef }}>
      <div className="relative" {...props}>
        {children}
      </div>
    </DropdownContext.Provider>
  )
}

function DropdownMenuTrigger({
  asChild,
  children,
  onClick,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const { open, setOpen, triggerRef } = React.useContext(DropdownContext)

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setOpen(!open)
    onClick?.(e)
  }

  // E2 — keyboard: open the menu with ArrowDown or Enter/Space (native
  // buttons already do Enter/Space, but ArrowDown is the standard "open
  // menu" key in the WAI-ARIA menu pattern).
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown" && !open) {
      e.preventDefault()
      setOpen(true)
    }
    if (e.key === "Escape" && open) {
      e.preventDefault()
      setOpen(false)
    }
    props.onKeyDown?.(e)
  }

  const ariaProps = {
    "aria-haspopup": "menu" as const,
    "aria-expanded": open,
  }

  if (asChild && React.isValidElement(children)) {
    // E2 — Note: we deliberately do NOT spread `...props` here (the
    // original behavior). The child element (usually a <Button>) owns
    // its own className; we only inject trigger-specific behavior.
    return React.cloneElement(children as React.ReactElement<any>, {
      ref: triggerRef,
      onClick: handleClick,
      onKeyDown: handleKeyDown,
      "data-dropdown-trigger": true,
      ...ariaProps,
    })
  }

  return (
    <button
      type="button"
      ref={triggerRef}
      className={className}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      data-dropdown-trigger
      {...ariaProps}
      {...props}
    >
      {children}
    </button>
  )
}

function DropdownMenuContent({
  className,
  sideOffset = 4,
  align = "end",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  sideOffset?: number
  align?: "start" | "center" | "end"
}) {
  const { open, contentRef, triggerRef, setOpen } = React.useContext(DropdownContext)

  // E2 — when the menu opens, focus the first menuitem so the user can
  // immediately navigate with ArrowUp/Down. When it closes via Escape,
  // restore focus to the trigger so the keyboard user doesn't get
  // stranded.
  React.useEffect(() => {
    if (!open) return
    const content = contentRef.current
    if (!content) return

    // Defer focus to next tick so the content is in the DOM
    const t = window.setTimeout(() => {
      const firstItem = content.querySelector<HTMLElement>("[role='menuitem']")
      firstItem?.focus()
    }, 0)
    return () => window.clearTimeout(t)
  }, [open, contentRef])

  // Restore focus to the trigger on close
  React.useEffect(() => {
    if (open) return
    // If focus was inside the menu, put it back on the trigger
    const active = document.activeElement
    if (active && contentRef.current?.contains(active)) {
      triggerRef.current?.focus()
    }
  }, [open, contentRef, triggerRef])

  if (!open) return null

  return (
    <div
      ref={contentRef}
      role="menu"
      aria-orientation="vertical"
      className={cn(
        "dropdown-content absolute z-50 min-w-[8rem] overflow-hidden rounded-md border border-base-300 bg-base-100 p-1 shadow-md",
        align === "end" && "right-0",
        align === "start" && "left-0",
        className
      )}
      style={{ top: `${sideOffset + 100}%` }}
      onKeyDown={(e) => {
        // E2 — keyboard navigation inside the menu:
        //   ArrowDown / ArrowUp: move between items
        //   Home / End: jump to first / last
        //   Escape: close and return to trigger
        const items = Array.from(
          e.currentTarget.querySelectorAll<HTMLElement>("[role='menuitem']"),
        )
        if (items.length === 0) return
        const currentIndex = items.findIndex(
          (it) => it === document.activeElement,
        )
        if (e.key === "ArrowDown") {
          e.preventDefault()
          const next = currentIndex < 0 ? 0 : (currentIndex + 1) % items.length
          items[next].focus()
        } else if (e.key === "ArrowUp") {
          e.preventDefault()
          const prev =
            currentIndex <= 0 ? items.length - 1 : currentIndex - 1
          items[prev].focus()
        } else if (e.key === "Home") {
          e.preventDefault()
          items[0].focus()
        } else if (e.key === "End") {
          e.preventDefault()
          items[items.length - 1].focus()
        } else if (e.key === "Escape") {
          e.preventDefault()
          setOpen(false)
          triggerRef.current?.focus()
        } else if (e.key === "Tab") {
          // Tab closes the menu and lets the browser move focus naturally
          setOpen(false)
        }
      }}
      {...props}
    >
      <ul className="menu bg-base-100 text-base-content p-0 rounded-md [&_li>a]:rounded-sm [&_li>a]:text-sm [&_li>a]:flex [&_li>a]:items-center [&_li>a]:gap-2 [&_li>a]:px-2 [&_li>a]:py-1.5 [&_li>a]:cursor-pointer [&_li>a]:hover:bg-base-200 [&_li>a]:hover:text-base-content">
        {children}
      </ul>
    </div>
  )
}

function DropdownMenuItem({
  className,
  onClick,
  children,
  ...props
}: React.HTMLAttributes<HTMLAnchorElement>) {
  const { setOpen } = React.useContext(DropdownContext)

  return (
    <li>
      <a
        role="menuitem"
        tabIndex={-1}
        className={cn("", className)}
        onClick={(e) => {
          onClick?.(e)
          setOpen(false)
        }}
        onKeyDown={(e) => {
          // Enter / Space activate the item (browsers do this on <a>
          // already for Enter, but Space needs explicit handling).
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault()
              ; (e.currentTarget as HTMLElement).click()
          }
        }}
        {...(props as any)}
      >
        {children}
      </a>
    </li>
  )
}

function DropdownMenuSeparator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  // Separators in ARIA menus have role="separator"
  return <div role="separator" className={cn("divider my-1 -mx-1", className)} {...props} />
}

/* ─── Stubs for unused sub-components ─── */
function DropdownMenuGroup({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props}>{children}</div>
}

function DropdownMenuLabel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-2 py-1.5 text-sm font-medium", className)} {...props} />
}

function DropdownMenuPortal({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}

function DropdownMenuCheckboxItem(props: any) { return null }
function DropdownMenuRadioGroup(props: any) { return null }
function DropdownMenuRadioItem(props: any) { return null }
function DropdownMenuShortcut(props: any) { return null }
function DropdownMenuSub(props: any) { return null }
function DropdownMenuSubTrigger(props: any) { return null }
function DropdownMenuSubContent(props: any) { return null }

export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
}
