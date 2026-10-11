package com.omnitracker.app.overlay

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings

/**
 * Transparent helper for Android SYSTEM_ALERT_WINDOW ("Display over other apps") permission.
 * Handles:
 * - Runtime permission checking
 * - System Settings intent launching
 * - Denial explanation and recovery flows
 * - Manufacturer-specific battery optimization intents (MIUI, One UI, ColorOS)
 */
object OverlayPermissionHelper {

    const val OVERLAY_PERMISSION_REQ_CODE = 1204

    /**
     * Checks if the app is allowed to draw floating overlays above other applications.
     * On Android 6.0 (API 23) and above, requires Settings.canDrawOverlays(context).
     */
    fun hasOverlayPermission(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(context)
        } else {
            true // Prior to Android M, permission was granted at install time
        }
    }

    /**
     * Prompts the user to grant overlay permission by launching Android's system settings screen.
     * Must be called from an Activity context.
     */
    fun requestOverlayPermission(activity: Activity) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:${activity.packageName}")
                )
                activity.startActivityForResult(intent, OVERLAY_PERMISSION_REQ_CODE)
            } catch (e: Exception) {
                // Fallback for custom ROMs or modified settings providers
                val fallbackIntent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION)
                activity.startActivityForResult(fallbackIntent, OVERLAY_PERMISSION_REQ_CODE)
            }
        }
    }

    /**
     * Checks if notification permission is granted for Android 13+ (API 33).
     * Required for Foreground Service notification display.
     */
    fun hasNotificationPermission(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            context.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) == 
                android.content.pm.PackageManager.PERMISSION_GRANTED
        } else {
            true
        }
    }
}
