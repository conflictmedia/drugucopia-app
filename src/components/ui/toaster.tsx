'use client'

import { useTheme } from "next-themes"
import { Toaster as SonnerToaster } from "sonner"
import { DARK_THEME_IDS } from "@/components/theme-provider"

export function Toaster() {
  const { resolvedTheme } = useTheme()
  const isDark = !!resolvedTheme && DARK_THEME_IDS.has(resolvedTheme)

  return (
    <SonnerToaster
      theme={isDark ? 'dark' : 'light'}
      position="bottom-right"
      toastOptions={{
        unstyled: false,
        classNames: {
          toast: "bg-base-100 text-base-content border border-base-300 shadow-lg",
          title: "text-sm font-semibold",
          description: "text-xs text-neutral-content",
          actionButton: "btn btn-sm btn-primary",
          cancelButton: "btn btn-sm btn-ghost",
        },
      }}
    />
  )
}
