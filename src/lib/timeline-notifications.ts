/**
 * Timeline Live Notification Engine
 *
 * Maintains a swipeable notification for each active dose on Android,
 * updated when the phase changes. Notifications can be swiped away
 * and will reappear after a configurable cooldown.
 *
 * On Tauri Android, calls a native Rust command that creates notifications
 * via the Android NotificationManager with setOngoing(false).
 * On web, falls back to the browser Notification API with tagged replacement.
 */

import { useDoseStore } from "@/store/dose-store";
import { useTimelineNotificationStore } from "@/store/timeline-notification-store";
import {
  parseDurationToMinutes,
  calculatePhaseTimings,
  intensityAt,
} from "@/components/dose-timeline/dose-timeline-utils";
import {
  isTauri,
  sendGenericNotification,
  requestNotificationPermission,
  checkNotificationPermission,
} from "./tauri-bridge";
import { showBrowserNotification } from "./notification-utils";
import type { DoseLog } from "@/types";
import type { PhaseTimings } from "@/components/dose-timeline/dose-timeline-types";

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = "onset" | "comeup" | "peak" | "offset" | "ended";

/** DoseLog with extra timing fields used only inside the notification engine */
interface NotifDose extends DoseLog {
  _timings: PhaseTimings;
  _elapsed: number;
}

// ─── State ────────────────────────────────────────────────────────────────────

let intervalId: ReturnType<typeof setInterval> | null = null;
let doseUnsub: (() => void) | null = null;
let visibilityHandler: (() => void) | null = null;

/** Last known phase per substance key — used to detect phase transitions */
const lastPhase = new Map<string, Phase>();

/** Last notification sent timestamp per substance key (for cooldown) */
const lastNotificationSent = new Map<string, number>();

/** Notification count per substance per hour (for spam protection) */
const notificationCountPerHour = new Map<
  string,
  { count: number; windowStart: number }
>();

/**
 * Whether the engine has completed its initial "priming" pass.
 *
 * PRIMING: On the very first `checkAndUpdate` call after the module loads
 * (i.e. on every full page reload), we observe the current phase of every
 * active substance and store it in `lastPhase` WITHOUT sending any
 * notifications. Without this, the first check would see
 * `prevPhase = undefined` for every substance, treat that as a "phase
 * change" (undefined → current), and fire a notification for every active
 * dose on every page navigation — which is the spam the user reported.
 *
 * After priming, subsequent checks (interval, visibility, dose-store
 * subscription) compare against the primed `lastPhase` and only fire on
 * REAL phase changes.
 */
let hasPrimed = false;

/**
 * localStorage keys for persisting notification state across page reloads.
 *
 * On a static-export Next.js app (and especially on Tauri Android), every
 * full page reload re-evaluates the JS module and wipes module-level state.
 * Without persistence, the cooldown timer resets on every navigation, so
 * the user gets a notification every time they browse to a new page even
 * if they just got one seconds ago.
 *
 * `lastNotificationSent` is persisted to localStorage (not sessionStorage)
 * so the cooldown survives app close/reopen on mobile. We prune entries
 * older than 1 hour on load to prevent unbounded growth.
 */
const COOLDOWN_STORAGE_KEY = "drugucopia-timeline-cooldown";

/** Prune cooldown entries older than this (1 hour) on load. */
const COOLDOWN_MAX_AGE_MS = 60 * 60 * 1000;

/** Load persisted cooldown timestamps from localStorage. */
function loadCooldownState(): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(COOLDOWN_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, number>;
    const now = Date.now();
    let changed = false;
    for (const [key, ts] of Object.entries(parsed)) {
      if (typeof ts === "number" && now - ts < COOLDOWN_MAX_AGE_MS) {
        lastNotificationSent.set(key, ts);
      } else {
        changed = true; // stale entry, will be pruned on next save
      }
    }
    if (changed) persistCooldownState();
  } catch {
    // ignore parse errors
  }
}

/** Persist cooldown timestamps to localStorage. */
function persistCooldownState(): void {
  if (typeof window === "undefined") return;
  try {
    const obj: Record<string, number> = {};
    const now = Date.now();
    for (const [key, ts] of lastNotificationSent) {
      if (now - ts < COOLDOWN_MAX_AGE_MS) {
        obj[key] = ts;
      }
    }
    localStorage.setItem(COOLDOWN_STORAGE_KEY, JSON.stringify(obj));
  } catch {
    // ignore quota errors
  }
}

/** Track visibility state to pause notifications when app is backgrounded */
let isVisible = true;

/**
 * Timestamp when app was last hidden (for ignoring quick navigation transitions).
 *
 * Initialized to `Date.now()` rather than `0` so that the 2-second threshold
 * in the visibilitychange handler works correctly from the very first event.
 * With `0`, `Date.now() - 0` is ~1.7 trillion ms, which always exceeds the
 * threshold — meaning the "ignore quick transitions" guard never suppressed
 * spurious events during Next.js client-side navigation, causing notification
 * spam on every page change.
 */
let hiddenAt = Date.now();

/**
 * Previous `document.hidden` value, used to detect ACTUAL visibility state
 * transitions. The `visibilitychange` event can fire spuriously on some
 * platforms (notably Tauri Android during Next.js client-side navigation)
 * WITHOUT `document.hidden` actually changing. By comparing the previous
 * and current values, we can ignore those spurious events entirely.
 */
let prevDocumentHidden = false;

/**
 * Previous dose IDs — used by the dose-store subscription to detect actual
 * additions/removals instead of firing on every store update.
 *
 * NOTE: This used to be a `useRef` inside `startTimelineNotifications()`, but
 * that violated the Rules of Hooks (calling a hook inside a non-component
 * function) and threw React error #321 ("Invalid hook call. Hooks can only
 * be called inside of the body of a function component."), which crashed
 * the app on every launch and produced a remount loop. It is now a plain
 * module-level variable, which is the correct pattern for state that lives
 * outside React's render cycle.
 */
let prevDoseIds: string[] = [];

const PHASE_DISPLAY: Record<Phase, string> = {
  onset: "Onset",
  comeup: "Come-up",
  peak: "Peak",
  offset: "Offset",
  ended: "Ended",
};

const PHASE_EMOJI: Record<Phase, string> = {
  onset: "🔸",
  comeup: "📈",
  peak: "⚡",
  offset: "📉",
  ended: "✅",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCurrentPhase(
  elapsedMins: number,
  timings: ReturnType<typeof calculatePhaseTimings>,
): Phase {
  if (elapsedMins >= timings.offsetEnd) return "ended";
  if (elapsedMins >= timings.peakEnd) return "offset";
  if (elapsedMins >= timings.comeupEnd) return "peak";
  if (elapsedMins >= timings.onsetEnd) return "comeup";
  return "onset";
}

/** Generate a stable notification ID from a substance name */
function substanceId(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  return (Math.abs(hash) % 10000) + 1000; // 1000–10999 range
}

/** Safely parse duration string, handling non-string values */
function safeParseDurationToMinutes(val: unknown): number {
  if (typeof val === "string") return parseDurationToMinutes(val);
  if (typeof val === "number" && isFinite(val)) return val;
  return 0;
}

/** Check if we can send a notification for this substance (cooldown + spam protection) */
function canSendNotification(
  key: string,
  settings: ReturnType<
    typeof useTimelineNotificationStore.getState
  >["settings"],
): boolean {
  const now = Date.now();
  const cooldownMs = settings.notificationCooldownMinutes * 60_000;

  // Cooldown check
  const lastSent = lastNotificationSent.get(key);
  if (lastSent && now - lastSent < cooldownMs) {
    console.log(
      `[timeline-notif] Cooldown active for ${key} (${Math.round((cooldownMs - (now - lastSent)) / 1000)}s remaining)`,
    );
    return false;
  }

  // Spam protection: max 3 notifications per hour per substance
  const hourly = notificationCountPerHour.get(key);
  if (hourly) {
    if (now - hourly.windowStart < 60 * 60_000) {
      if (hourly.count >= 3) {
        console.warn(
          `[timeline-notif] SPAM PROTECTION: Max 3 notifications/hour reached for ${key}`,
        );
        return false;
      }
    } else {
      // Reset window
      notificationCountPerHour.set(key, { count: 0, windowStart: now });
    }
  } else {
    notificationCountPerHour.set(key, { count: 0, windowStart: now });
  }

  return true;
}

/** Record that a notification was sent for this substance */
function recordNotificationSent(key: string): void {
  const now = Date.now();
  lastNotificationSent.set(key, now);

  const hourly = notificationCountPerHour.get(key);
  if (hourly) {
    hourly.count += 1;
  }

  // Persist to localStorage so the cooldown survives page reloads.
  // Without this, navigating to a new page resets the cooldown and the
  // user gets another notification immediately.
  persistCooldownState();
}

// ─── Permission helper ────────────────────────────────────────────────────────

let permissionEnsured = false;

async function ensureNotificationPermission(): Promise<boolean> {
  if (permissionEnsured) return true;

  try {
    const current = await checkNotificationPermission().catch(
      () => "default" as any,
    );

    if (current === "granted") {
      permissionEnsured = true;
      return true;
    }

    const result = await requestNotificationPermission().catch(
      () => "denied" as any,
    );
    permissionEnsured = result === "granted";
    console.log("[timeline-notif] permission result:", result);
    return permissionEnsured;
  } catch (e) {
    console.warn("[timeline-notif] permission check/request failed:", e);
    return false;
  }
}

// ─── Notification dispatchers ─────────────────────────────────────────────────

async function sendOngoingNotification(
  id: number,
  title: string,
  body: string,
): Promise<void> {
  const hasPerm = await ensureNotificationPermission();
  if (!hasPerm) {
    console.warn(
      "[timeline-notif] no permission — skipping notification",
      title,
    );
    return;
  }

  // Stable per-substance tag so the OS / browser REPLACES the prior
  // notification instead of stacking a new one. Without this, every phase
  // check spawns a brand-new notification entry — which the user perceives
  // as "spam on every page navigation" because the buggy visibilitychange
  // handler was firing checkAndUpdate on every route change, and each
  // successful send created a fresh notification rather than updating the
  // existing one.
  const stableTag = `drugucopia-timeline-${id}`;

  // 1. VISIBLE standard notification (same path as reminders).
  //    On Tauri: native notification (with OS sound).
  //    On web:   SW showNotification (requireInteraction) or direct Notification.
  //    The stable tag ensures this REPLACES the previous notification for
  //    the same substance instead of stacking.
  try {
    await sendGenericNotification(title, body, stableTag);
    console.log(
      "[timeline-notif] ✅ sent VISIBLE notification via sendGenericNotification:",
      title,
      body,
    );
  } catch (e) {
    console.warn("[timeline-notif] sendGenericNotification failed:", e);
  }

  // 2. Additionally send the Android timeline notification (swipeable, low-importance).
  //    This is a SEPARATE notification channel from #1 — it lives in the
  //    notification shade as an "ongoing" indicator. It uses the same
  //    numeric id across calls so subsequent sends UPDATE the existing
  //    notification rather than stacking.
  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("show_ongoing_notification", { id, title, body });
      console.log("[timeline-notif] sent timeline notification (Android):", id);
    } catch (e) {
      console.warn("[timeline-notif] ongoing invoke failed (non-fatal):", e);
    }
  }

  // NOTE: A previous "step 3" here called `new Notification(...)` directly
  // with `renotify: true, silent: false`. That was redundant with step 1
  // (which already covers the web path) AND `renotify: true` caused the
  // user to be re-alerted every time the notification body was updated —
  // compounding the spam. Removed.
}

async function cancelOngoingNotification(id: number): Promise<void> {
  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("cancel_ongoing_notification", { id });
      return;
    } catch {
      // ignore
    }
  }
  // Web: no way to programmatically close a notification by tag
}

// ─── Core ─────────────────────────────────────────────────────────────────────

async function checkAndUpdate(force = false): Promise<void> {
  try {
    // Read settings from store
    const settings = useTimelineNotificationStore.getState().settings;

    // Master toggle
    if (!settings.enabled) {
      console.log("[timeline-notif] disabled via settings — skipping");
      return;
    }

    const ds = useDoseStore.getState();
    if (!ds.isLoaded && typeof ds.initialize === "function") {
      try {
        ds.initialize();
      } catch {}
    }
    // RE-READ the state after initialize() — zustand's getState() returns
    // a snapshot, not a live reference. Without this re-read, `doses`
    // would still be the old empty array even after initialization set
    // the real doses, causing the priming logic to defer indefinitely.
    const doses = useDoseStore.getState().doses;

    // ── PRIMING ──────────────────────────────────────────────────────────
    // On the very first check after module load (i.e. after every full
    // page reload), we PRIME the `lastPhase` map with the current phase
    // of every active substance WITHOUT sending any notifications.
    //
    // Why: on a page reload, all module-level state resets. `lastPhase`
    // is empty, so `prevPhase = undefined` for every substance. Without
    // priming, `phaseChanged = (undefined !== currentPhase) = true`,
    // which fires a notification for EVERY active dose on EVERY page
    // navigation. This is the root cause of the "notification fires every
    // time you browse a page" spam.
    //
    // After priming, the first real check (interval, visibility, or dose
    // store subscription) compares against the primed phases and only
    // fires on ACTUAL phase changes.
    //
    // Note: `force=true` (manual force / new dose) bypasses priming —
    // those are explicit user actions that SHOULD send notifications.
    if (!hasPrimed && !force) {
      // If the dose store hasn't hydrated yet, DON'T prime — just return
      // and let the next check (delayed re-check, subscription, or
      // interval) try again. Priming against an empty dose list would set
      // `hasPrimed = true` with an empty `lastPhase`, and when the store
      // later hydrates, every active dose would appear as a "phase change"
      // (undefined → current) and fire a notification — the exact spam
      // we're trying to prevent.
      const freshState = useDoseStore.getState();
      if (!freshState.isLoaded || doses.length === 0) {
        console.log(
          "[timeline-notif] PRIMING deferred — dose store not yet hydrated (isLoaded=",
          freshState.isLoaded,
          "doses=",
          doses.length,
          ")",
        );
        return;
      }

      console.log(
        "[timeline-notif] PRIMING — observing current phases without sending notifications",
      );
      hasPrimed = true;

      const now0 = Date.now();
      for (const dose of doses) {
        if (!dose.duration) continue;
        const totalMins = safeParseDurationToMinutes(dose.duration.total);
        if (totalMins <= 0) continue;
        const doseTime = new Date(dose.timestamp).getTime();
        const elapsedMins = (now0 - doseTime) / 60_000;
        if (elapsedMins < 0) continue;
        const timings = calculatePhaseTimings(dose.duration);
        if (!timings || timings.totalDuration <= 0) continue;
        const phase = getCurrentPhase(elapsedMins, timings);
        const key = dose.substanceName.toLowerCase();
        lastPhase.set(key, phase);
        console.log(`[timeline-notif] PRIMED "${key}" → ${phase}`);
      }

      // Also restore the cooldown state from localStorage so the
      // cooldown survives page reloads.
      loadCooldownState();

      // Schedule a real check after a short delay. This gives the dose
      // store time to fully hydrate before we do the "real" first check.
      // If phases haven't changed during that time, no notification fires
      // (which is the correct behavior — the user just navigated, the
      // phase didn't actually change).
      setTimeout(() => {
        checkAndUpdate(false).catch(() => {});
      }, 2000);

      return;
    }

    console.log(
      "[timeline-notif] checkAndUpdate running — force=",
      force,
      "doses in store:",
      doses.length,
      "isLoaded:",
      ds.isLoaded,
      "hasPrimed:",
      hasPrimed,
    );

    // On force, clear lastPhase for substances we are about to evaluate
    if (force && doses.length > 0) {
      for (const d of doses) {
        if (d.duration) lastPhase.delete(d.substanceName.toLowerCase());
      }
    }

    const now = Date.now();

    // Group active (non-ended) doses by substance
    const substanceGroups = new Map<
      string,
      { name: string; doses: NotifDose[] }
    >();

    for (const dose of doses) {
      if (!dose.duration) continue;
      const totalMins = safeParseDurationToMinutes(dose.duration.total);
      if (totalMins <= 0) continue;

      const doseTime = new Date(dose.timestamp).getTime();
      const elapsedMins = (now - doseTime) / 60_000;
      if (elapsedMins < 0) continue;

      const timings = calculatePhaseTimings(dose.duration);
      if (!timings || timings.totalDuration <= 0) continue;
      const isEnded = elapsedMins >= timings.offsetEnd;

      const key = dose.substanceName.toLowerCase();
      if (!substanceGroups.has(key)) {
        substanceGroups.set(key, { name: dose.substanceName, doses: [] });
      }
      if (!isEnded) {
        substanceGroups
          .get(key)!
          .doses.push({ ...dose, _timings: timings, _elapsed: elapsedMins });
      }
    }

    const currentKeys = new Set<string>();

    // ── Send/update notifications for active substances ──
    for (const [key, { name, doses: groupDoses }] of substanceGroups) {
      if (groupDoses.length === 0) {
        // All doses ended — cancel notification
        const prevPhase = lastPhase.get(key);
        if (prevPhase && prevPhase !== "ended") {
          lastPhase.set(key, "ended");
          const id = substanceId(key);
          await cancelOngoingNotification(id);
        }
        continue;
      }

      currentKeys.add(key);

      // Calculate combined intensity and dominant phase
      let maxIntensity = 0;
      let dominantPhase: Phase = "onset";

      for (const d of groupDoses) {
        const timings = d._timings;
        const elapsedMins = d._elapsed;
        if (!timings || timings.totalDuration <= 0) continue;
        const progress = (elapsedMins / timings.totalDuration) * 100;
        const rawIntensity = intensityAt(progress, timings);
        const phase = getCurrentPhase(elapsedMins, timings);

        if (rawIntensity > maxIntensity) {
          maxIntensity = rawIntensity;
          dominantPhase = phase;
        }
      }

      const prevPhase = lastPhase.get(key);
      const phaseChanged = prevPhase !== dominantPhase;

      // Determine if we should send a notification
      const isRegularInterval = !force;
      const shouldSend =
        force ||
        (settings.showOnPhaseChangeOnly && phaseChanged) ||
        (!settings.showOnPhaseChangeOnly && isRegularInterval);

      // On foreground, always send if setting enabled (respects cooldown)
      const isForegroundEvent = force && settings.showOnForeground;

      // If not a phase change or force event, only send if reappearAfterSwipe is enabled
      // This controls the "reappear after swipe" behavior on regular intervals
      if (isRegularInterval && !phaseChanged && !settings.reappearAfterSwipe) {
        continue;
      }

      if (!shouldSend && !isForegroundEvent) {
        continue;
      }

      // Check cooldown and spam protection
      if (
        !canSendNotification(
          key,
          useTimelineNotificationStore.getState().settings,
        )
      ) {
        console.log(
          `[timeline-notif] Skipping ${key} due to cooldown/spam protection`,
        );
        continue;
      }

      lastPhase.set(key, dominantPhase);

      const intensity = Math.round(maxIntensity);
      const emoji = PHASE_EMOJI[dominantPhase];
      const phaseLabel = PHASE_DISPLAY[dominantPhase];

      const id = substanceId(key);
      const title = name;
      const body = `${emoji} ${intensity}% intensity · ${phaseLabel}`;

      console.log(
        `[timeline-notif] ${force ? "FORCE " : ""}SENDING for "${key}": phase=${dominantPhase} (prev=${prevPhase}) doses=${groupDoses.length}`,
      );

      await sendOngoingNotification(id, title, body);

      // Record notification sent (for cooldown tracking)
      recordNotificationSent(key);

      // === CRITICAL: On TRUE force events (new dose, startup, manual force)
      // we ALSO send using the *exact same visible path* that reminders use.
      // This is what actually makes the popup / shade notification appear.
      // NOT on foreground events - those only update the swipeable timeline notification.
      const isTrueForceEvent = force && !isForegroundEvent;
      if (isTrueForceEvent) {
        // Use the same stable tag as sendOngoingNotification so the force
        // send REPLACES the existing timeline notification for this
        // substance rather than stacking a second one.
        const forceTag = `drugucopia-timeline-${id}`;
        try {
          const { sendGenericNotification } = await import("./tauri-bridge");
          await sendGenericNotification(title, body, forceTag);
          console.log(
            "[timeline-notif] ✅ FORCE visible notification sent via sendGenericNotification",
          );
        } catch (e) {
          console.warn("[timeline-notif] FORCE visible sendGeneric failed", e);
        }

        // Also send via the exact reminder helper (proven path)
        try {
          const fakeReminder = {
            id: `timeline-${id}`,
            substanceName: name,
            status: "fired" as const,
          } as any;
          showBrowserNotification(
            fakeReminder,
            `${emoji} ${intensity}% intensity · ${phaseLabel}`,
          );
          console.log(
            "[timeline-notif] ✅ FORCE sent via showBrowserNotification (reminder path)",
          );
        } catch (e) {
          console.warn(
            "[timeline-notif] showBrowserNotification fallback failed",
            e,
          );
        }

        // Also try the Android timeline one directly again on force (for status bar)
        if (isTauri()) {
          try {
            const { invoke } = await import("@tauri-apps/api/core");
            const oid = substanceId(key);
            await invoke("show_ongoing_notification", { id: oid, title, body });
            console.log("[timeline-notif] ✅ FORCE timeline notification sent");
          } catch {}
        }
      }
    }

    // ── Cancel notifications for substances that are no longer active ──
    for (const [key, phase] of lastPhase) {
      if (!currentKeys.has(key) && phase !== "ended") {
        lastPhase.set(key, "ended");
        const id = substanceId(key);
        await cancelOngoingNotification(id);
      }
    }
  } catch (err) {
    console.error("[timeline-notif] checkAndUpdate failed:", err);
  }
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Start timeline notifications with error handling.
 * The interval is wrapped in try-catch to prevent JNI crashes from killing the app.
 * Also listens to visibility changes to pause when app is backgrounded.
 * Subscribes to dose store so new doses trigger immediate notification check.
 */
export function startTimelineNotifications(): void {
  if (intervalId) return;

  // Check if enabled before starting
  const settings = useTimelineNotificationStore.getState().settings;
  if (!settings.enabled) {
    console.log("[timeline-notif] Not starting — disabled in settings");
    return;
  }

  console.log("[timeline-notif] starting timeline notification engine");

  // Sync visibility tracking to the CURRENT document state. Without this,
  // if the engine starts while the document is already hidden (e.g. the
  // page loaded in a background tab), `isVisible` and `prevDocumentHidden`
  // would be out of sync with reality, causing the first visibilitychange
  // event to be misclassified.
  if (typeof document !== "undefined") {
    isVisible = !document.hidden;
    prevDocumentHidden = document.hidden;
    // If we're already hidden when starting, record that as the hiddenAt
    // timestamp so the 2-second threshold works correctly when we later
    // come back to foreground.
    if (document.hidden) {
      hiddenAt = Date.now();
    }
  }

  // Only clear phase memory on FIRST start, not on restart.
  // This prevents spam on page navigation where visibilitychange fires.
  if (!lastPhase.size && !lastNotificationSent.size) {
    lastPhase.clear();
    lastNotificationSent.clear();
    notificationCountPerHour.clear();
  }

  // Request permission early (same as reminders)
  ensureNotificationPermission().catch(() => {});

  // Initial check: this triggers PRIMING (see checkAndUpdate). On the
  // first call after module load, it observes the current phase of every
  // active substance WITHOUT sending notifications, then schedules a
  // real check 2 seconds later. This is the critical anti-spam measure —
  // without it, every page navigation fires a notification because the
  // module state resets and `prevPhase = undefined` is treated as a
  // "phase change".
  checkAndUpdate(false);

  // Delayed re-check in case the dose store hydrates late (very common
  // on Tauri Android where localStorage reads are async-ish). By this
  // point, priming has already completed, so this is a REAL check that
  // only fires notifications on actual phase changes.
  setTimeout(() => {
    console.log("[timeline-notif] delayed re-check after start");
    checkAndUpdate(false).catch(() => {});
  }, 1500);

  setTimeout(() => {
    checkAndUpdate(false).catch(() => {});
  }, 4500);

  // Handle visibility changes to pause notifications when app is backgrounded.
  //
  // ── Why this matters ─────────────────────────────────────────────────
  // On Tauri Android (and some other webviews), `visibilitychange` fires
  // SPURIOUSLY during Next.js client-side route transitions — even though
  // `document.hidden` never actually becomes `true`. The previous version
  // of this handler had TWO bugs that turned those spurious events into
  // notification spam on every page navigation:
  //
  //   Bug 1 (inverted conditions): The branch labeled "App came back to
  //   foreground" used `!wasHidden && isVisible`, which actually matches
  //   "was visible AND is still visible" — i.e. NO transition. So the
  //   "foreground" code path fired on every spurious event while the
  //   document stayed visible. The correct condition is
  //   `wasHidden && isVisible` (was hidden, now visible).
  //
  //   Bug 2 (hiddenAt = 0): The 2-second threshold meant to suppress
  //   quick navigation transitions never worked because `hiddenAt` was
  //   initialized to `0`, making `Date.now() - 0` ≈ 1.7 trillion ms —
  //   always > 2000. Plus, because of Bug 1, the `else if` branch that
  //   sets `hiddenAt` never fired either, so it stayed at 0 forever.
  //
  // The fix below:
  //   • Tracks `prevDocumentHidden` so we can ignore events where
  //     `document.hidden` didn't actually change (defensive guard).
  //   • Uses the CORRECT conditions for foreground/background transitions.
  //   • Initializes `hiddenAt = Date.now()` (done at module scope above)
  //     so the 2-second threshold works from the very first event.
  visibilityHandler = () => {
    const nowHidden = document.hidden;
    const visibilityChanged = nowHidden !== prevDocumentHidden;
    prevDocumentHidden = nowHidden;

    // Defensive guard: if `document.hidden` didn't actually change, this
    // is a spurious event (Next.js navigation on Tauri Android fires
    // these). Ignore it entirely — no `checkAndUpdate`, no `hiddenAt`
    // update. This is the single most important fix for the spam.
    if (!visibilityChanged) {
      return;
    }

    const wasHidden = !isVisible;
    isVisible = !nowHidden;

    if (wasHidden && isVisible) {
      // CORRECT "came back to foreground" branch:
      // previous state was hidden, current state is visible.
      const now = Date.now();
      const hiddenDuration = now - hiddenAt;

      // Ignore quick transitions (< 2 seconds). These happen during
      // Next.js client-side navigation on some platforms even when
      // `document.hidden` did briefly flip. Only do a real check if
      // the app was actually backgrounded for a meaningful duration.
      if (hiddenDuration < 2000) {
        console.log(
          "[timeline-notif] foreground → ignoring quick transition (" +
            hiddenDuration +
            "ms)",
        );
        return;
      }

      // App came back to foreground after being backgrounded — do a
      // normal check (respects cooldown/phase change). Using force=true
      // here caused spam on every page navigation in Next.js.
      console.log(
        "[timeline-notif] foreground → checking (was hidden " +
          Math.round(hiddenDuration / 1000) +
          "s)",
      );
      checkAndUpdate(false).catch(() => {});
    } else if (!wasHidden && !isVisible) {
      // CORRECT "went to background" branch:
      // previous state was visible, current state is hidden.
      hiddenAt = Date.now();
    }
    // If neither branch matches, the state didn't transition in a way
    // we care about (e.g. hidden→hidden or visible→visible, which
    // shouldn't happen after the `visibilityChanged` guard, but we
    // handle it defensively by doing nothing).
  };

  document.addEventListener("visibilitychange", visibilityHandler);

  // Subscribe to dose changes for immediate reaction (e.g. right after logging a dose).
  // We compare the current set of dose IDs against the previously seen set so we
  // only trigger on actual additions/removals — not on every store hydration or
  // unrelated state change. The previous-IDs list is kept in a module-level
  // variable (`prevDoseIds`) because this function is NOT a React component and
  // cannot use `useRef` (doing so throws React error #321).
  try {
    doseUnsub = useDoseStore.subscribe((state) => {
      const currentDoses = (state.doses || []).map((d) => d.id).sort();

      // Check if doses actually changed (added or removed), not just hydration/loading
      const dosesChanged =
        currentDoses.length !== prevDoseIds.length ||
        currentDoses.some((id, i) => id !== prevDoseIds[i]);

      if (!dosesChanged) {
        return;
      }

      prevDoseIds = currentDoses;

      console.log(
        "[timeline-notif] dose store changed — checking (doses:",
        state.doses?.length || 0,
        ")",
      );
      // Fire check WITHOUT force - respect phase change / cooldown logic
      checkAndUpdate(false).catch((e) =>
        console.warn("[timeline-notif] subscribe check failed", e),
      );
    });
  } catch (e) {
    console.warn("[timeline-notif] could not subscribe to dose store", e);
  }

  // Use a safer interval that catches errors to prevent JNI crashes from propagating
  // 30 seconds is sufficient for phase change detection and reduces JNI call frequency
  intervalId = setInterval(() => {
    // Skip if app is in background - prevents JNI crashes when webview is not accessible
    if (!isVisible) {
      return;
    }

    try {
      checkAndUpdate();
    } catch (err) {
      console.error("[timeline-notif] Interval handler failed:", err);
      // Don't stop the interval on error - just log and continue
      // This prevents a single JNI failure from crashing the entire app
    }
  }, 30_000);
}

export function stopTimelineNotifications(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  if (doseUnsub) {
    doseUnsub();
    doseUnsub = null;
  }
  if (visibilityHandler) {
    document.removeEventListener("visibilitychange", visibilityHandler);
    visibilityHandler = null;
  }
}

export function resetTimelineNotifications(): void {
  lastPhase.clear();
  lastNotificationSent.clear();
  notificationCountPerHour.clear();
  hasPrimed = false;
  // Also clear the persisted cooldown so a manual reset actually resets
  // everything (not just the in-memory state).
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(COOLDOWN_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

/** Force an immediate check (useful after logging a dose or from outside) */
export async function forceTimelineCheck(): Promise<void> {
  try {
    // Make sure permission is fresh
    await ensureNotificationPermission().catch(() => {});

    await checkAndUpdate(true);

    // Belt-and-suspenders: directly send visible notifications for every currently active dose
    // using the exact same mechanism as reminders. This is the most reliable popup path.
    try {
      const ds = useDoseStore.getState();
      const active = (ds.doses || []).filter((d: any) => d.duration);
      if (active.length > 0) {
        const { sendGenericNotification } = await import("./tauri-bridge");
        for (const d of active.slice(0, 3)) {
          // limit to avoid spam
          const mins = Math.max(
            0,
            Math.round((Date.now() - new Date(d.timestamp).getTime()) / 60000),
          );
          // Use a stable per-substance tag so the direct force send
          // REPLACES the existing timeline notification rather than
          // stacking on top of it.
          const forceTag = `drugucopia-timeline-${substanceId(
            d.substanceName.toLowerCase(),
          )}`;
          await sendGenericNotification(
            d.substanceName,
            `🔸 Active dose (${mins}m ago) — timeline running`,
            forceTag,
          );
        }
        console.log(
          "[timeline-notif] ✅ direct visible notifications sent for",
          active.length,
          "active dose(s)",
        );
      }
    } catch (e) {
      console.warn("[timeline-notif] direct active visible send failed", e);
    }
  } catch (e) {
    console.warn("[timeline-notif] forceTimelineCheck failed", e);
  }
}
