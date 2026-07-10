/**
 * Timeline Live Notification Engine
 *
 * Maintains a persistent (ongoing/unswipeable) notification for each active
 * dose on Android, updated only when the phase changes (so no sound spam).
 *
 * On Tauri Android, calls a native Rust command that creates ongoing
 * notifications via the Android NotificationManager with setOngoing(true).
 * On web, falls back to the browser Notification API with tagged replacement.
 */

import { useDoseStore } from "@/store/dose-store";
import {
  parseDurationToMinutes,
  calculatePhaseTimings,
  intensityAt,
} from "@/components/dose-timeline/dose-timeline-utils";
import { isTauri } from "./tauri-bridge";
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

/** Last known phase per substance key — used to detect phase transitions */
const lastPhase = new Map<string, Phase>();

/** Track visibility state to pause notifications when app is backgrounded */
let isVisible = true;

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

// ─── Notification dispatchers ─────────────────────────────────────────────────

async function sendOngoingNotification(
  id: number,
  title: string,
  body: string,
): Promise<void> {
  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("show_ongoing_notification", { id, title, body });
      return;
    } catch (e) {
      console.warn(
        "[timeline-notif] invoke show_ongoing_notification failed:",
        e,
      );
      // Fall through to web fallback
    }
  }

  // Web fallback — tagged notification (replaces previous, no sound on update)
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, {
      body,
      tag: `drugucopia-timeline-${id}`,
      icon: "/logo.png",
      // @ts-expect-error renotify is supported in browsers but not in TS types
      renotify: true,
      silent: true,
    });
  } catch {
    // ignore
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

async function checkAndUpdate(): Promise<void> {
  try {
    const doses = useDoseStore.getState().doses;
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

      // Only send notification if the phase changed since last check
      const prevPhase = lastPhase.get(key);
      if (prevPhase === dominantPhase) continue; // no change → skip (no sound spam)

      lastPhase.set(key, dominantPhase);

      const intensity = Math.round(maxIntensity);
      const emoji = PHASE_EMOJI[dominantPhase];
      const phaseLabel = PHASE_DISPLAY[dominantPhase];

      const id = substanceId(key);
      const title = name;
      const body = `${emoji} ${intensity}% intensity · ${phaseLabel}`;

      await sendOngoingNotification(id, title, body);
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
 */
export function startTimelineNotifications(): void {
  if (intervalId) return;
  checkAndUpdate();
  
  // Handle visibility changes to pause notifications when app is backgrounded
  const handleVisibilityChange = () => {
    isVisible = !document.hidden;
  };
  
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
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
}

export function resetTimelineNotifications(): void {
  lastPhase.clear();
}
