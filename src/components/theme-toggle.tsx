'use client'

import { useSyncExternalStore } from 'react'
import { Check, Palette, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AVAILABLE_THEMES, type ThemeId } from '@/components/theme-provider'
import { cn } from '@/lib/utils'

/**
 * A 4-segment color swatch that previews a theme's primary / secondary /
 * accent / info colors. The `data-theme` attribute on the wrapper makes
 * daisyUI's theme-scoped CSS variables apply to the inner spans, so
 * `bg-primary` / `bg-secondary` / `bg-accent` / `bg-info` resolve to
 * that theme's palette. Adding the 4th segment (info) makes themes
 * whose primary/secondary happen to look similar (e.g. `black`) much
 * easier to tell apart in the picker.
 */
function ThemeSwatch({
  themeId,
  className,
}: {
  themeId: ThemeId
  className?: string
}) {
  if (themeId === 'system') {
    return (
      <span
        className={cn(
          'flex shrink-0 overflow-hidden rounded-full border border-base-300',
          className,
        )}
        aria-hidden
      >
        <span data-theme="drugucopia-light" className="flex-1 bg-primary" />
        <span data-theme="drugucopia" className="flex-1 bg-primary" />
      </span>
    )
  }
  return (
    <span
      data-theme={themeId}
      className={cn(
        'flex shrink-0 overflow-hidden rounded-full border border-base-300',
        className,
      )}
      aria-hidden
    >
      <span className="flex-1 bg-primary" />
      <span className="flex-1 bg-secondary" />
      <span className="flex-1 bg-accent" />
      <span className="flex-1 bg-info" />
    </span>
  )
}

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  )

  // Coerce to one of the known ids; treat unknown/undefined as 'system'.
  const knownIds = AVAILABLE_THEMES.map((t) => t.id) as readonly string[]
  const current = (
    theme && knownIds.includes(theme) ? theme : 'system'
  ) as ThemeId
  const isDark = resolvedTheme !== 'drugucopia-light'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          suppressHydrationWarning
          aria-label="Change theme"
          title="Change theme"
          className="min-h-[44px] min-w-[44px]"
        >
          {mounted ? (
            current === 'system' ? (
              isDark ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )
            ) : (
              <Palette className="h-5 w-5" />
            )
          ) : (
            <Sun className="h-5 w-5" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[14rem]">
        <DropdownMenuLabel className="text-[11px] uppercase tracking-[0.18em] text-neutral-content">
          Theme
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {AVAILABLE_THEMES.map((t) => {
          const isActive = current === t.id
          return (
            <DropdownMenuItem
              key={t.id}
              onClick={() => setTheme(t.id)}
              className="flex items-center gap-2"
              // Keep focus on the trigger after selection so the keyboard
              // user can quickly try multiple themes without re-opening.
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setTheme(t.id)
                }
              }}
            >
              <ThemeSwatch themeId={t.id} className="h-3 w-7" />
              <span className="flex flex-col">
                <span className="text-sm font-medium leading-tight">
                  {t.label}
                </span>
                <span className="text-[11px] leading-tight text-neutral-content">
                  {t.description}
                </span>
              </span>
              {isActive && (
                <Check className="ml-auto h-3.5 w-3.5 text-primary" />
              )}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
