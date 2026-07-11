package com.drugucopia.app

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat

/**
 * Creates and manages TIMELINE notifications for the
 * Drugucopia timeline feature. Notifications are posted on a dedicated
 * low-importance channel so they never produce sound or vibration —
 * they act as silent status indicators.
 *
 * Unlike the previous "ongoing" implementation, these notifications are
 * swipeable (setOngoing=false). The JavaScript timeline engine handles
 * re-appearing them after a configurable cooldown when swiped away.
 *
 * Called from Rust via JNI (see lib.rs show_ongoing_notification command).
 */
object OngoingNotificationHelper {
    private const val CHANNEL_ID = "drugucopia_timeline"
    private const val CHANNEL_NAME = "Active Timelines"

    @Volatile
    private var channelCreated = false

    /** Create the notification channel (idempotent). */
    private fun ensureChannel(appContext: Context) {
        if (channelCreated) {
            // Double-check channel still exists (user may have deleted it in settings)
            try {
                val manager = appContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                if (manager.getNotificationChannel(CHANNEL_ID) == null) {
                    channelCreated = false
                } else {
                    return
                }
            } catch (_: Exception) {
                channelCreated = false
            }
        }
        try {
            val manager = appContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            // Only create if it doesn't already exist
            if (manager.getNotificationChannel(CHANNEL_ID) != null) {
                channelCreated = true
                return
            }

            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_LOW   // low = no sound
            ).apply {
                description = "Live timeline status for active doses"
                setSound(null, null)
                enableVibration(false)
                setShowBadge(false)
                lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
            }
            manager.createNotificationChannel(channel)
            channelCreated = true
        } catch (e: Exception) {
            android.util.Log.e("OngoingNotif", "ensureChannel failed", e)
            // Don't crash — notification will fail gracefully below
        }
    }

    private fun resolveSmallIcon(ctx: Context): Int {
        // Try app launcher icon first, fall back through safe system icons
        val candidates = listOf(
            "ic_launcher", "ic_launcher_foreground", "ic_notification",
            "ic_stat_notify", "sym_def_app_icon"
        )
        for (name in candidates) {
            val resId = ctx.resources.getIdentifier(name, "mipmap", ctx.packageName)
                .takeIf { it != 0 }
                ?: ctx.resources.getIdentifier(name, "drawable", ctx.packageName).takeIf { it != 0 }
            if (resId != null && resId != 0) return resId
        }
        // Last resort: guaranteed system icon (API 1+)
        return android.R.drawable.stat_notify_sync_noanim
    }

    /**
     * Show (or update) a timeline notification.
     *
     * @param context  Android context (Activity)
     * @param id       Stable notification ID (from substance name hash)
     * @param title    Substance name
     * @param body     e.g. "⚡ 72% intensity · Peak"
     */
    @JvmStatic
    fun show(context: Context, id: Int, title: String, body: String) {
        try {
            // Always use applicationContext — Activity context can be destroyed
            // during lifecycle transitions, causing WindowManager / BadToken crashes.
            val appContext = context.applicationContext ?: context

            // Android 13+ (API 33) requires POST_NOTIFICATIONS runtime permission.
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                if (ContextCompat.checkSelfPermission(appContext, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                    return
                }
            }

            ensureChannel(appContext)

            val manager = try {
                appContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            } catch (e: Exception) {
                android.util.Log.e("OngoingNotif", "getSystemService failed", e)
                return
            }

            // Sanitize inputs — prevent TransactionTooLarge / bad parcel crashes
            val safeTitle = title.take(45).ifBlank { "Active dose" }
            val safeBody = body.take(90).ifBlank { "Timeline active" }
            val safeId = id.coerceIn(1000, 19999)

            val smallIcon = try {
                resolveSmallIcon(appContext)
            } catch (_: Exception) {
                android.R.drawable.stat_notify_sync_noanim
            }

            val notification = try {
                NotificationCompat.Builder(appContext, CHANNEL_ID)
                    .setContentTitle(safeTitle)
                    .setContentText(safeBody)
                    .setSmallIcon(smallIcon)
                    .setOngoing(false)           // ← swipeable!
                    .setAutoCancel(true)         // ← swipe to dismiss
                    .setSound(null)
                    .setVibrate(longArrayOf(0L))
                    .setOnlyAlertOnce(true)      // no sound/vibration on updates
                    .setPriority(NotificationCompat.PRIORITY_LOW)
                    .setCategory(NotificationCompat.CATEGORY_STATUS)
                    .setShowWhen(false)
                    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                    .setLocalOnly(true)          // don't bridge to wear / auto unnecessarily
                    .build()
            } catch (e: Exception) {
                android.util.Log.e("OngoingNotif", "Builder failed", e)
                return
            }

            try {
                manager.notify(safeId, notification)
            } catch (se: SecurityException) {
                // POST_NOTIFICATIONS revoked between check and notify — swallow
                android.util.Log.w("OngoingNotif", "notify SecurityException (permission revoked?)", se)
            } catch (e: Exception) {
                android.util.Log.e("OngoingNotif", "notify failed", e)
            }
        } catch (t: Throwable) {
            // Absolute last resort — NEVER let a notification crash the app
            try {
                android.util.Log.e("OngoingNotif", "FATAL show() caught", t)
            } catch (_: Throwable) {
                // logging itself failed — swallow
            }
        }
    }

    /**
     * Cancel a timeline notification.
     *
     * @param context  Android context
     * @param id       Notification ID to cancel
     */
    @JvmStatic
    fun cancel(context: Context, id: Int) {
        try {
            val appContext = context.applicationContext ?: context
            val manager = appContext.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
                ?: return
            val safeId = id.coerceIn(1000, 19999)
            manager.cancel(safeId)
        } catch (t: Throwable) {
            try {
                android.util.Log.w("OngoingNotif", "cancel failed (non-critical)", t)
            } catch (_: Throwable) {}
        }
    }

    /** Cancel ALL timeline notifications — emergency cleanup */
    @JvmStatic
    fun cancelAll(context: Context) {
        try {
            val appContext = context.applicationContext ?: context
            val manager = appContext.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
                ?: return
            // Cancel the known ID range 1000-10999
            for (i in 1000..10999) {
                try { manager.cancel(i) } catch (_: Exception) {}
            }
        } catch (_: Throwable) {}
    }
}
