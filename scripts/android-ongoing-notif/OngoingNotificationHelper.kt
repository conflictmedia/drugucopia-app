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

    /** Create the notification channel (idempotent and thread-safe). */
    private fun ensureChannel(context: Context) {
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        // Fast path: channel already exists
        if (manager.getNotificationChannel(CHANNEL_ID) != null) {
            return
        }

        // Create channel - catch race where another thread created it first
        val channel = NotificationChannel(
            CHANNEL_ID,
            CHANNEL_NAME,
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Live timeline status for active doses"
            setSound(null, null)
            enableVibration(false)
            setShowBadge(false)
            lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
        }
        try {
            manager.createNotificationChannel(channel)
        } catch (e: IllegalArgumentException) {
            // Channel was created by another thread between check and create - ignore
        }
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
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
                return
            }
        }

        ensureChannel(context)
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(body)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setOngoing(false)           // ← swipeable!
            .setAutoCancel(true)         // ← swipe to dismiss
            .setSound(null)
            .setOnlyAlertOnce(true)      // no sound/vibration on updates
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_STATUS)
            .setShowWhen(false)
            .build()

        manager.notify(id, notification)
    }

    /**
     * Cancel a timeline notification.
     *
     * @param context  Android context
     * @param id       Notification ID to cancel
     */
    @JvmStatic
    fun cancel(context: Context, id: Int) {
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.cancel(id)
    }
}

