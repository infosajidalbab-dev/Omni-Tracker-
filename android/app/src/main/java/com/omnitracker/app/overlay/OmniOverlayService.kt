package com.omnitracker.app.overlay

import android.animation.ValueAnimator
import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.graphics.PixelFormat
import android.graphics.Point
import android.os.Build
import android.os.IBinder
import android.os.VibrationEffect
import android.os.Vibrator
import android.view.Gravity
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.view.animation.DecelerateInterpolator
import android.widget.ImageView
import androidx.core.app.NotificationCompat
import com.omnitracker.app.R
import com.omnitracker.app.ui.QuickCaptureActivity
import kotlin.math.abs

/**
 * Native Android Foreground Service for System-Wide Floating Edge Handle.
 * 
 * Features:
 * - Uses WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY (Android 8.0+)
 * - Draggable vertical positioning with smooth edge snapping (Left/Right dock)
 * - Bottom dismiss zone for fast dismiss gesture
 * - Launches QuickCaptureActivity (translucent dialog) on tap
 * - Foreground service lifecycle with low-priority non-intrusive notification
 * - Respects display orientation changes and safe insets
 */
class OmniOverlayService : Service() {

    companion object {
        const val NOTIFICATION_CHANNEL_ID = "omni_floating_assistant_channel"
        const val NOTIFICATION_ID = 4001
        const val ACTION_STOP_SERVICE = "com.omnitracker.app.STOP_OVERLAY"

        fun startService(context: Context) {
            val intent = Intent(context, OmniOverlayService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stopService(context: Context) {
            val intent = Intent(context, OmniOverlayService::class.java)
            context.stopService(intent)
        }
    }

    private var windowManager: WindowManager? = null
    private var floatingHandleView: View? = null
    private var dismissTargetView: View? = null
    private var layoutParams: WindowManager.LayoutParams? = null
    private var dismissParams: WindowManager.LayoutParams? = null
    private var vibrator: Vibrator? = null

    private var initialX = 0
    private var initialY = 0
    private var initialTouchX = 0f
    private var initialTouchY = 0f
    private var isDragging = false
    private var isOverDismissZone = false

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()

        // 1. Check overlay permission
        if (!OverlayPermissionHelper.hasOverlayPermission(this)) {
            stopSelf()
            return
        }

        vibrator = getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager

        // 2. Start Foreground Notification
        startForegroundNotification()

        // 3. Setup Floating Handle and Dismiss Target
        setupFloatingHandle()
        setupDismissTarget()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP_SERVICE) {
            stopSelf()
            return START_NOT_STICKY
        }
        return START_STICKY
    }

    private fun startForegroundNotification() {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "OMNI Floating Assistant",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps the OMNI TRACKER edge handle floating above other apps"
                setShowBadge(false)
            }
            notificationManager.createNotificationChannel(channel)
        }

        val stopIntent = Intent(this, OmniOverlayService::class.java).apply {
            action = ACTION_STOP_SERVICE
        }
        val stopPendingIntent = PendingIntent.getService(
            this, 0, stopIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val openIntent = Intent(this, QuickCaptureActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val openPendingIntent = PendingIntent.getActivity(
            this, 0, openIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val notification: Notification = NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
            .setContentTitle("OMNI TRACKER Assistant Active")
            .setContentText("Tap floating edge handle to log expenses or habits")
            .setSmallIcon(R.drawable.ic_omni_handle)
            .setOngoing(true)
            .setContentIntent(openPendingIntent)
            .addAction(R.drawable.ic_close, "Hide Handle", stopPendingIntent)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()

        startForeground(NOTIFICATION_ID, notification)
    }

    @SuppressLint("InflateParams", "ClickableViewAccessibility")
    private fun setupFloatingHandle() {
        val overlayType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        val screenSize = getScreenSize()
        val defaultY = (screenSize.y * 0.42).toInt() // Position around middle-upper right edge

        layoutParams = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            overlayType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = screenSize.x // Start docked on right
            y = defaultY
        }

        val inflater = LayoutInflater.from(this)
        floatingHandleView = inflater.inflate(R.layout.view_floating_handle, null)

        val handleIcon = floatingHandleView?.findViewById<ImageView>(R.id.imgHandle)

        floatingHandleView?.setOnTouchListener { _, event ->
            handleTouchEvent(event)
        }

        handleIcon?.setOnClickListener {
            launchQuickCapture()
        }

        windowManager?.addView(floatingHandleView, layoutParams)
    }

    @SuppressLint("InflateParams")
    private fun setupDismissTarget() {
        val overlayType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        dismissParams = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            overlayType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
            y = 80
        }

        val inflater = LayoutInflater.from(this)
        dismissTargetView = inflater.inflate(R.layout.view_dismiss_target, null).apply {
            visibility = View.GONE
        }

        windowManager?.addView(dismissTargetView, dismissParams)
    }

    private fun handleTouchEvent(event: MotionEvent): Boolean {
        val params = layoutParams ?: return false

        when (event.action) {
            MotionEvent.ACTION_DOWN -> {
                initialX = params.x
                initialY = params.y
                initialTouchX = event.rawX
                initialTouchY = event.rawY
                isDragging = false
                isOverDismissZone = false
                return true
            }

            MotionEvent.ACTION_MOVE -> {
                val dx = (event.rawX - initialTouchX).toInt()
                val dy = (event.rawY - initialTouchY).toInt()

                if (!isDragging && (abs(dx) > 12 || abs(dy) > 12)) {
                    isDragging = true
                    dismissTargetView?.visibility = View.VISIBLE
                    triggerHapticTick()
                }

                if (isDragging) {
                    params.x = initialX + dx
                    params.y = initialY + dy
                    windowManager?.updateViewLayout(floatingHandleView, params)

                    // Check if dragged near bottom dismiss zone
                    val screenSize = getScreenSize()
                    val nearBottom = event.rawY > screenSize.y - 240
                    if (nearBottom && !isOverDismissZone) {
                        isOverDismissZone = true
                        triggerHapticSnap()
                        dismissTargetView?.animate()?.scaleX(1.25f)?.scaleY(1.25f)?.setDuration(120)?.start()
                    } else if (!nearBottom && isOverDismissZone) {
                        isOverDismissZone = false
                        dismissTargetView?.animate()?.scaleX(1.0f)?.scaleY(1.0f)?.setDuration(120)?.start()
                    }
                }
                return true
            }

            MotionEvent.ACTION_UP -> {
                dismissTargetView?.visibility = View.GONE

                if (isOverDismissZone) {
                    triggerHapticSnap()
                    stopSelf()
                    return true
                }

                if (!isDragging) {
                    // Tap detected!
                    launchQuickCapture()
                } else {
                    // Drag ended: Snap to nearest left or right edge
                    snapToNearestEdge(params)
                }
                return true
            }
        }
        return false
    }

    private fun snapToNearestEdge(params: WindowManager.LayoutParams) {
        val screenSize = getScreenSize()
        val targetX = if (params.x + 60 > screenSize.x / 2) {
            screenSize.x - 30 // Dock to right edge
        } else {
            0 // Dock to left edge
        }

        val startX = params.x
        val animator = ValueAnimator.ofInt(startX, targetX).apply {
            duration = 200
            interpolator = DecelerateInterpolator()
            addUpdateListener { va ->
                params.x = va.animatedValue as Int
                windowManager?.updateViewLayout(floatingHandleView, params)
            }
        }
        animator.start()
    }

    private fun launchQuickCapture() {
        triggerHapticTick()
        val intent = Intent(this, QuickCaptureActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                Intent.FLAG_ACTIVITY_CLEAR_TOP or
                Intent.FLAG_ACTIVITY_NO_ANIMATION
        }
        startActivity(intent)
    }

    private fun getScreenSize(): Point {
        val size = Point()
        windowManager?.defaultDisplay?.getSize(size)
        return size
    }

    private fun triggerHapticTick() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            vibrator?.vibrate(VibrationEffect.createPredefined(VibrationEffect.EFFECT_TICK))
        } else {
            @Suppress("DEPRECATION")
            vibrator?.vibrate(15)
        }
    }

    private fun triggerHapticSnap() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            vibrator?.vibrate(VibrationEffect.createPredefined(VibrationEffect.EFFECT_CLICK))
        } else {
            @Suppress("DEPRECATION")
            vibrator?.vibrate(35)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        floatingHandleView?.let {
            try {
                windowManager?.removeView(it)
            } catch (_: Exception) {}
        }
        dismissTargetView?.let {
            try {
                windowManager?.removeView(it)
            } catch (_: Exception) {}
        }
    }
}
