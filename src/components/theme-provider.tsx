'use client'

import type { ReactNode } from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'

/**
 * Curated set of daisyUI themes exposed in the theme picker.
 *
 * Every theme listed here is defined as an idiomatic daisyUI 5
 * `@plugin "daisyui/theme"` block in `src/app/globals.css`. All themes
 * share a neutral-dark base-100/200/300 so the milkdrop WebGL
 * background shows through consistently; each theme's personality is
 * carried by its primary / secondary / accent / info / success /
 * warning / error colors only.
 *
 * The `id` MUST match a theme registered in the `@plugin "daisyui"`
 * block in `src/app/globals.css`.
 *
 * `drugucopia-light` is intentionally NOT in the picker — it is the
 * hidden fallback the `system` virtual theme resolves to when the OS
 * is in light mode. It uses a low-tint dark base so the milkdrop
 * doesn't clash.
 */
export const AVAILABLE_THEMES = [
  { id: 'system', label: 'System', description: 'Match OS' },
  { id: 'drugucopia', label: 'Drugucopia', description: 'Default warm-white' },
  // ─── Curated daisyUI dark themes ───
  { id: 'dracula', label: 'Dracula', description: 'Pink & purple' },
  { id: 'night', label: 'Night', description: 'Blue & magenta' },
  { id: 'black', label: 'Black', description: 'Pure monochrome' },
  { id: 'dim', label: 'Dim', description: 'Soft pastels' },
  { id: 'sunset', label: 'Sunset', description: 'Warm orange & red' },
  { id: 'synthwave', label: 'Synthwave', description: 'Neon retro' },
  { id: 'halloween', label: 'Halloween', description: 'Orange & purple' },
  { id: 'aqua', label: 'Aqua', description: 'Cyan & magenta' },
  { id: 'forest', label: 'Forest', description: 'Deep green' },
  { id: 'luxury', label: 'Luxury', description: 'White & gold' },
  { id: 'business', label: 'Business', description: 'Corporate blue' },
  { id: 'coffee', label: 'Coffee', description: 'Warm brown' },
] as const

export type ThemeId = (typeof AVAILABLE_THEMES)[number]['id']

/** Concrete theme ids (excludes the virtual `system` id). */
export const THEME_IDS = AVAILABLE_THEMES.filter((t) => t.id !== 'system').map(
  (t) => t.id,
)

/**
 * Themes that are visually "dark" — used to tell the milkdrop shader
 * whether to apply light-mode desaturation.  All registered themes
 * (except the hidden `drugucopia-light` fallback) are dark.
 */
export const DARK_THEME_IDS = new Set<string>([
  'drugucopia',
  'dracula',
  'night',
  'black',
  'dim',
  'sunset',
  'synthwave',
  'halloween',
  'aqua',
  'forest',
  'luxury',
  'business',
  'coffee',
])

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="drugucopia"
      enableSystem
      disableTransitionOnChange
      themes={THEME_IDS}
    >
      {children}
    </NextThemesProvider>
  )
}
