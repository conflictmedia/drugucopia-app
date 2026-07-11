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

/** Track visibility state to pause notifications when app is backgrounded */
let isVisible = true;

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

  // 1. ALWAYS send a VISIBLE standard notification first (same path as reminders)
  try {
    await sendGenericNotification(title, body);
    console.log(
      "[timeline-notif] ✅ sent VISIBLE notification via sendGenericNotification:",
      title,
      body,
    );
  } catch (e) {
    console.warn("[timeline-notif] sendGenericNotification failed:", e);
  }

  // 2. Additionally send the Android timeline notification (swipeable, low-importance)
  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("show_ongoing_notification", { id, title, body });
      console.log("[timeline-notif] sent timeline notification (Android):", id);
    } catch (e) {
      console.warn("[timeline-notif] ongoing invoke failed (non-fatal):", e);
    }
  }

  // 3. Extra web direct fallback (in case SW not ready)
  if (
    !isTauri() &&
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted"
  ) {
    try {
      new Notification(title, {
        body,
        tag: `drugucopia-timeline-${id}`,
        icon: "/logo.png",
        renotify: true,
        silent: false,
      } as any);
      console.log("[timeline-notif] web direct Notification sent");
    } catch (e) {
      console.warn("[timeline-notif] direct web notif failed:", e);
    }
  }
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
    const doses = ds.doses;

    console.log(
      "[timeline-notif] checkAndUpdate running — force=",
      force,
      "doses in store:",
      doses.length,
      "isLoaded:",
      ds.isLoaded,
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

      // === CRITICAL: On force (new dose, startup, foreground) we ALSO
      // send using the *exact same visible path* that reminders use.
      // This is what actually makes the popup / shade notification appear.
      if (force || isForegroundEvent) {
        try {
          const { sendGenericNotification } = await import("./tauri-bridge");
          await sendGenericNotification(title, body);
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

  // Clear any stale phase memory so the very first run always emits
  lastPhase.clear();
  lastNotificationSent.clear();
  notificationCountPerHour.clear();

  // Request permission early (same as reminders)
  ensureNotificationPermission().catch(() => {});

  // Initial check: clear phase memory so first run evaluates fresh
  // but don't force-send - respect cooldown/phase logic
  checkAndUpdate(false);

  // Delayed re-check in case store hydrates late (very common)
  setTimeout(() => {
    console.log("[timeline-notif] delayed re-check after start");
    checkAndUpdate(false).catch(() => {});
  }, 1500);

  setTimeout(() => {
    checkAndUpdate(false).catch(() => {});
  }, 4500);

  // Handle visibility changes to pause notifications when app is backgrounded
  visibilityHandler = () => {
    const wasHidden = !isVisible;
    isVisible = !document.hidden;
    if (!wasHidden && isVisible) {
      // App came back to foreground — force an immediate update (may be new phases)
      console.log("[timeline-notif] foreground → forcing check");
      checkAndUpdate(true).catch(() => {});
    }
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
          await sendGenericNotification(
            d.substanceName,
            `🔸 Active dose (${mins}m ago) — timeline running`,
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
