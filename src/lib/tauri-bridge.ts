/**
 * Tauri Notification Bridge
 *
 * Detects whether the app is running inside Tauri and provides a unified
 * notification interface. When running in Tauri (mobile or desktop), it
 * uses the native @tauri-apps/plugin-notification APIs. When running as
 * a regular web app (PWA), it falls back to the browser Notification API.
 *
 * This module is the single source of truth for:
 *   - Detecting the Tauri runtime
 *   - Requesting notification permission
 *   - Showing notifications
 *   - Playing notification sounds (Tauri delegates to the OS; web uses Audio)
 */

import type { ActiveReminder } from "@/types";

// ─── Tauri runtime detection ──────────────────────────────────────────────────

/** True when running inside a Tauri webview (desktop or mobile) */
export function isTauri(): boolean {
  return !!(
    typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__
  );
}

// ─── Tauri plugin lazily-loaded modules ───────────────────────────────────────

// We lazy-load the Tauri plugin modules so the web build doesn't break
// when @tauri-apps/* packages aren't installed (regular PWA deployment).
let _tauriNotification:
  typeof import("@tauri-apps/plugin-notification") | null = null;
let _tauriNotificationLoadPromise: Promise<
  typeof import("@tauri-apps/plugin-notification") | null
> | null = null;

async function loadTauriNotification() {
  if (_tauriNotification) return _tauriNotification;
  if (_tauriNotificationLoadPromise) return _tauriNotificationLoadPromise;

  _tauriNotificationLoadPromise = import("@tauri-apps/plugin-notification")
    .then((mod) => {
      _tauriNotification = mod;
      return mod;
    })
    .catch(() => {
      // @tauri-apps/plugin-notification not available — web fallback
      console.warn(
        "[tauri-bridge] @tauri-apps/plugin-notification not available",
      );
      return null;
    });

  return _tauriNotificationLoadPromise;
}

// ─── Unified notification API ─────────────────────────────────────────────────

export type NotificationPermissionStatus = "granted" | "denied" | "default";

/**
 * Request notification permission.
 * Uses Tauri's native permission request on mobile, or the browser API on web.
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionStatus> {
  if (isTauri()) {
    const mod = await loadTauriNotification();
    if (mod) {
      try {
        const permission = await mod.requestPermission();
        // Tauri returns 'granted' | 'denied' | 'default' — same strings
        return permission as NotificationPermissionStatus;
      } catch (e) {
        console.error("[tauri-bridge] requestPermission failed:", e);
        return "denied";
      }
    }
  }

  // Web fallback
  if (typeof window === "undefined" || !("Notification" in window))
    return "denied";
  return Notification.requestPermission() as unknown as NotificationPermissionStatus;
}

/**
 * Check if notification permission is currently granted.
 */
export async function checkNotificationPermission(): Promise<NotificationPermissionStatus> {
  if (isTauri()) {
    const mod = await loadTauriNotification();
    if (mod) {
      try {
        const granted = await mod.isPermissionGranted();
        return granted ? "granted" : "default";
      } catch {
        return "default";
      }
    }
  }

  // Web fallback
  if (typeof window === "undefined" || !("Notification" in window))
    return "denied";
  return Notification.permission as NotificationPermissionStatus;
}

/**
 * Show a notification with an arbitrary title and body.
 * Uses Tauri's native notification on mobile, or browser Notification API on web.
 *
 * `tag` — optional stable notification tag. When the same tag is reused
 * across calls, the OS / browser REPLACES the prior notification instead
 * of stacking a new one. This is critical for timeline updates: without a
 * stable tag, every phase check spawns a brand-new notification that
 * piles up in the shade (perceived as "spam" on every page navigation).
 * When omitted, a unique tag is generated (legacy behavior).
 */
export async function sendGenericNotification(
  title: string,
  body: string,
  tag?: string,
): Promise<void> {
  if (isTauri()) {
    const mod = await loadTauriNotification();
    if (mod) {
      try {
        // Tauri's plugin-notification uses an `id` for replacement on
        // Android. We pass the tag through as the notification identifier
        // so subsequent sends with the same tag update the existing one
        // instead of stacking. When no tag is provided, fall back to the
        // default (always-new) behavior.
        const payload: { title: string; body: string; id?: number } = {
          title,
          body,
        };
        if (tag) {
          // Hash the string tag into a numeric id for Tauri.
          let hash = 0;
          for (let i = 0; i < tag.length; i++) {
            hash = ((hash << 5) - hash + tag.charCodeAt(i)) | 0;
          }
          payload.id = Math.abs(hash) % 100000;
        }
        mod.sendNotification(payload);
        return;
      } catch (e) {
        console.error("[tauri-bridge] sendNotification failed:", e);
      }
    }
  }

  // Web fallback
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const notifTag = tag || `timeline-${Date.now()}`;
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: "SHOW_NOTIFICATION",
      payload: {
        title,
        body,
        tag: notifTag,
        icon: "/logo.png",
      },
    });
  } else {
    try {
      // `renotify: false` so an updated notification doesn't re-alert the
      // user; the body/title change is enough. `tag` causes replacement.
      new Notification(title, {
        body,
        tag: notifTag,
        icon: "/logo.png",
      } as NotificationOptions);
    } catch {
      // Notification API may not be available
    }
  }
}

/**
 * Show a notification for a fired reminder.
 * Uses Tauri's native notification on mobile (with system sound),
 * or the browser Notification API on web.
 */
export async function showNotification(
  reminder: ActiveReminder,
  customMessage?: string,
): Promise<void> {
  const title = `${reminder.substanceName} Reminder`;
  const body =
    customMessage || `Time for your next dose of ${reminder.substanceName}`;

  if (isTauri()) {
    const mod = await loadTauriNotification();
    if (mod) {
      try {
        mod.sendNotification({
          title,
          body,
        });
        return;
      } catch (e) {
        console.error("[tauri-bridge] sendNotification failed:", e);
        // Fall through to web fallback
      }
    }
  }

  // Web fallback — try Service Worker first, then direct Notification API
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: "SHOW_NOTIFICATION",
      payload: {
        title,
        body,
        tag: `reminder-${reminder.id}`,
        icon: "/logo.png",
        data: { reminderId: reminder.id },
      },
    });
  } else {
    try {
      new Notification(title, {
        body,
        tag: `reminder-${reminder.id}`,
        icon: "/logo.png",
      });
    } catch {
      // Notification API may not be available in all contexts
    }
  }
}

/**
 * Whether the app should use its own sound playback.
 * In Tauri, the OS notification system plays its own sound, so we skip
 * the web Audio playback. In the browser, we use the custom sound.
 */
export function shouldPlayWebSound(): boolean {
  return !isTauri();
}

/**
 * Whether the app should attempt Service Worker registration.
 * In Tauri, the app runs as a native binary — no SW needed.
 */
export function shouldRegisterServiceWorker(): boolean {
  return !isTauri();
}
