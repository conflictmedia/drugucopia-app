/**
 * Native Android haptics wrapper using @tauri-apps/plugin-haptics
 * Falls back to no-op on non-Android platforms
 */

type HapticType = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error'

interface HapticsModule {
  light: () => Promise<void>
  medium: () => Promise<void>
  heavy: () => Promise<void>
  selection: () => Promise<void>
  success: () => Promise<void>
  warning: () => Promise<void>
  error: () => Promise<void>
  isAvailable: () => Promise<boolean>
}

let hapticsModule: HapticsModule | null = null
let initPromise: Promise<void> | null = null

async function initHaptics(): Promise<void> {
  if (initPromise) return initPromise

  initPromise = (async () => {
    try {
      // Only load on client side
      if (typeof window === 'undefined') return

      // Check if Tauri is available
      const isTauri = '__TAURI__' in window

      if (!isTauri) {
        // Not in Tauri - create no-op module
        hapticsModule = createNoopModule()
        return
      }

      // Dynamic import of Tauri haptics plugin
      const { haptic } = await import('@tauri-apps/plugin-haptics')

      hapticsModule = {
        light: () => haptic.impact({ style: 'light' }),
        medium: () => haptic.impact({ style: 'medium' }),
        heavy: () => haptic.impact({ style: 'heavy' }),
        selection: () => haptic.selectionChanged(),
        success: () => haptic.notification({ type: 'success' }),
        warning: () => haptic.notification({ type: 'warning' }),
        error: () => haptic.notification({ type: 'error' }),
        isAvailable: async () => true,
      }

      // Expose to window for PullToRefresh to use
      ;(window as any).__TAURI_HAPTICS__ = hapticsModule
    } catch (error) {
      console.warn('Failed to initialize Tauri haptics:', error)
      hapticsModule = createNoopModule()
    }
  })()

  return initPromise
}

function createNoopModule(): HapticsModule {
  const noop = async () => {}
  return {
    light: noop,
    medium: noop,
    heavy: noop,
    selection: noop,
    success: noop,
    warning: noop,
    error: noop,
    isAvailable: async () => false,
  }
}

export async function getHaptics(): Promise<HapticsModule> {
  if (!hapticsModule) {
    await initHaptics()
  }
  return hapticsModule!
}

// Convenience functions
export async function hapticLight() {
  const h = await getHaptics()
  return h.light()
}

export async function hapticMedium() {
  const h = await getHaptics()
  return h.medium()
}

export async function hapticHeavy() {
  const h = await getHaptics()
  return h.heavy()
}

export async function hapticSelection() {
  const h = await getHaptics()
  return h.selection()
}

export async function hapticSuccess() {
  const h = await getHaptics()
  return h.success()
}

export async function hapticWarning() {
  const h = await getHaptics()
  return h.warning()
}

export async function hapticError() {
  const h = await getHaptics()
  return h.error()
}

// Initialize on import (client-side only)
if (typeof window !== 'undefined') {
  initHaptics()
}