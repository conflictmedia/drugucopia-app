/**
 * Sound utility for playing reminder notification sounds.
 * Uses the Web Audio API with a cached Audio instance for low-latency playback.
 */

let audioInstance: HTMLAudioElement | null = null

/**
 * Get or create the cached Audio instance for the notification sound.
 * The instance is reused across calls to avoid re-downloading the file.
 */
function getAudioInstance(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null

  if (!audioInstance) {
    audioInstance = new Audio('/notification.wav')
    // Preload so playback starts with minimal delay
    audioInstance.preload = 'auto'
    // Allow overlapping playback if multiple reminders fire at once
    audioInstance.addEventListener('ended', () => {
      // Reset currentTime so the sound can be replayed immediately
      if (audioInstance) audioInstance.currentTime = 0
    })
  }

  return audioInstance
}

/**
 * Play the reminder notification sound.
 * Safe to call from any context — silently no-ops if audio is unavailable
 * or if the user hasn't interacted with the page yet (autoplay policy).
 *
 * @param volume - Playback volume from 0.0 to 1.0 (default 0.7)
 */
export async function playReminderSound(volume = 0.7): Promise<void> {
  const audio = getAudioInstance()
  if (!audio) return

  try {
    audio.volume = Math.max(0, Math.min(1, volume))
    audio.currentTime = 0
    await audio.play()
  } catch (err) {
    // Autoplay blocked by browser policy — this is expected if the user
    // hasn't interacted with the page yet. The browser notification
    // (with its system sound) serves as the fallback.
    if (err instanceof DOMException && err.name === 'NotAllowedError') {
      // Silently ignore — the browser notification sound is the fallback
    } else {
      console.warn('Failed to play reminder sound:', err)
    }
  }
}

/**
 * Preload the notification sound so it's ready for immediate playback
 * when a reminder fires. Call this on the first user interaction.
 */
export function preloadReminderSound(): void {
  getAudioInstance()?.load()
}

/**
 * Test the notification sound (for the settings UI preview button).
 * Uses a slightly lower volume to avoid startling the user.
 */
export async function previewReminderSound(): Promise<void> {
  await playReminderSound(0.5)
}
