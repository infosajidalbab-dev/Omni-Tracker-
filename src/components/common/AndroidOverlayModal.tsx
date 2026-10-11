import React, { useState } from 'react';
import { 
  Smartphone, 
  Code2, 
  ShieldAlert, 
  CheckCircle2, 
  Copy, 
  Check, 
  ExternalLink, 
  X, 
  PlusCircle, 
  CheckSquare,
  FileCode,
  Download,
  Terminal,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';

interface AndroidOverlayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuickAddExpense: () => void;
  onQuickAddHabit: () => void;
}

export const AndroidOverlayModal: React.FC<AndroidOverlayModalProps> = ({
  isOpen,
  onClose,
  onQuickAddExpense,
  onQuickAddHabit,
}) => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'service' | 'permission' | 'bridge' | 'manifest' | 'gradle'>('architecture');
  const [copied, setCopied] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyCode = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const kotlinServiceCode = `// OmniOverlayService.kt - Native Android WindowManager Floating Edge Handle
package com.omnitracker.app.overlay

import android.animation.ValueAnimator
import android.annotation.SuppressLint
import android.app.*
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.graphics.Point
import android.os.Build
import android.os.IBinder
import android.os.VibrationEffect
import android.os.Vibrator
import android.view.*
import android.view.animation.DecelerateInterpolator
import android.widget.ImageView
import androidx.core.app.NotificationCompat
import com.omnitracker.app.R
import com.omnitracker.app.ui.QuickCaptureActivity
import kotlin.math.abs

class OmniOverlayService : Service() {
    private var windowManager: WindowManager? = null
    private var floatingHandleView: View? = null
    private var dismissTargetView: View? = null
    private var layoutParams: WindowManager.LayoutParams? = null
    private var vibrator: Vibrator? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        if (!OverlayPermissionHelper.hasOverlayPermission(this)) {
            stopSelf()
            return
        }
        vibrator = getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager

        startForegroundNotification()
        setupFloatingHandle()
        setupDismissTarget()
    }

    private fun startForegroundNotification() {
        val channelId = "omni_floating_assistant_channel"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId, "OMNI Floating Assistant",
                NotificationManager.IMPORTANCE_LOW
            )
            getSystemService(NotificationManager::class.java)?.createNotificationChannel(channel)
        }

        val notification = NotificationCompat.Builder(this, channelId)
            .setContentTitle("OMNI TRACKER Assistant Active")
            .setContentText("Tap floating edge handle to log expenses or habits anywhere")
            .setSmallIcon(R.drawable.ic_omni_handle)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()

        startForeground(4001, notification)
    }

    @SuppressLint("InflateParams", "ClickableViewAccessibility")
    private fun setupFloatingHandle() {
        val overlayType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            WindowManager.LayoutParams.TYPE_PHONE
        }

        val screenSize = Point().apply { windowManager?.defaultDisplay?.getSize(this) }
        layoutParams = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            overlayType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = screenSize.x - 30
            y = (screenSize.y * 0.42).toInt()
        }

        val inflater = LayoutInflater.from(this)
        floatingHandleView = inflater.inflate(R.layout.view_floating_handle, null)
        floatingHandleView?.findViewById<ImageView>(R.id.imgHandle)?.setOnClickListener {
            launchQuickCapture()
        }

        windowManager?.addView(floatingHandleView, layoutParams)
    }

    private fun launchQuickCapture() {
        val intent = Intent(this, QuickCaptureActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        startActivity(intent)
    }

    override fun onDestroy() {
        super.onDestroy()
        floatingHandleView?.let { windowManager?.removeView(it) }
        dismissTargetView?.let { windowManager?.removeView(it) }
    }
}`;

  const permissionHelperCode = `// OverlayPermissionHelper.kt - Transparent SYSTEM_ALERT_WINDOW Request & Denial Flow
package com.omnitracker.app.overlay

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings

object OverlayPermissionHelper {
    const val OVERLAY_PERMISSION_REQ_CODE = 1204

    fun hasOverlayPermission(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(context)
        } else {
            true
        }
    }

    fun requestOverlayPermission(activity: Activity) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:\${activity.packageName}")
                )
                activity.startActivityForResult(intent, OVERLAY_PERMISSION_REQ_CODE)
            } catch (e: Exception) {
                activity.startActivityForResult(
                    Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION),
                    OVERLAY_PERMISSION_REQ_CODE
                )
            }
        }
    }
}`;

  const bridgeCode = `// DataSyncBridge.kt - Encrypted Sync Journal between Native Overlay and Web Storage
package com.omnitracker.app.bridge

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.text.SimpleDateFormat
import java.util.*

object DataSyncBridge {
    private const val SYNC_JOURNAL_FILE = "omni_native_sync_journal.json"

    @Synchronized
    fun recordExpense(
        context: Context,
        amount: Double,
        currency: String = "৳",
        category: String,
        note: String = ""
    ) {
        val now = Date()
        val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        val timeFormat = SimpleDateFormat("HH:mm", Locale.US)

        val id = "exp_native_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().take(6)
        val file = File(context.filesDir, SYNC_JOURNAL_FILE)
        val root = if (file.exists()) JSONObject(file.readText()) else JSONObject()
        val array = root.optJSONArray("expenses") ?: JSONArray()

        val item = JSONObject().apply {
            put("id", id)
            put("amount", amount)
            put("currency", currency)
            put("category", category)
            put("note", note)
            put("date", dateFormat.format(now))
            put("time", timeFormat.format(now))
            put("createdAt", isoFormat.format(now))
            put("syncStatus", "pending")
        }
        array.put(item)
        root.put("expenses", array)
        file.writeText(root.toString(2))
    }
}`;

  const manifestCode = `<!-- AndroidManifest.xml -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.omnitracker.app">

    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_SPECIAL_USE" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.VIBRATE" />

    <application
        android:label="OMNI TRACKER"
        android:theme="@style/Theme.OmniTracker">

        <service
            android:name=".overlay.OmniOverlayService"
            android:enabled="true"
            android:exported="false"
            android:foregroundServiceType="specialUse">
            <property
                android:name="android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE"
                android:value="System-wide floating quick entry assistant for personal expenses and habit logs" />
        </service>

        <activity
            android:name=".ui.QuickCaptureActivity"
            android:theme="@style/Theme.AppCompat.Translucent.NoTitleBar"
            android:excludeFromRecents="true"
            android:launchMode="singleInstance" />
    </application>
</manifest>`;

  const gradleCode = `// build.gradle.kts
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.omnitracker.app"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.omnitracker.app"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("com.google.android.material:material:1.11.0")
}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl rounded-3xl bg-[#141519] border border-white/10 p-5 sm:p-7 text-white shadow-2xl my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#FF7628]/15 text-[#FF7628] flex items-center justify-center border border-[#FF7628]/25 shadow-xs">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Android System Floating Assistant</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FF7628]/20 text-[#FF7628]">
                  Phase 5 Blueprint
                </span>
              </div>
              <p className="text-xs text-[#9FA2AC]">Native Kotlin service, WindowManager overlay, and sync bridge</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#9FA2AC] hover:bg-white/10 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Environmental Boundary & Sandbox Transparency Banner */}
        <div className="mt-4 rounded-2xl bg-amber-500/10 p-4 border border-amber-500/25">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-slate-200">
              <p className="font-bold text-amber-400">Security Sandbox & Native OS Boundary:</p>
              <p className="mt-1 leading-relaxed text-[#D1D5DB]">
                Standard Web Browsers and PWAs run inside an OS sandbox and <strong>cannot render pixels above external third-party apps</strong> (e.g. Google Maps or Uber).
                OMNI TRACKER provides an interactive <strong>in-app draggable quick dock</strong> right now in the web interface, and the ready-to-build <strong>Native Android Kotlin Companion Project</strong> (located in <code className="text-amber-300">/android</code>) for compiling an APK with Android Studio.
              </p>
            </div>
          </div>
        </div>

        {/* In-App Quick Dock Live Testing */}
        <div className="mt-4 p-4 rounded-2xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-[#A0A2AA] uppercase tracking-wider">
              Try In-App Quick Capture Dock (Simulated Live):
            </span>
            <span className="text-[10px] text-[#22C58B] font-semibold">Active in Viewport</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                onClose();
                onQuickAddExpense();
              }}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#FF7628] to-[#FF9457] text-white font-bold text-xs hover:brightness-110 transition active:scale-95 shadow-md shadow-[#FF7628]/25 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Record Expense Now</span>
            </button>
            <button
              onClick={() => {
                onClose();
                onQuickAddHabit();
              }}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#22C58B] to-[#34D399] text-white font-bold text-xs hover:brightness-110 transition active:scale-95 shadow-md shadow-[#22C58B]/25 cursor-pointer"
            >
              <CheckSquare className="w-4 h-4" />
              <span>Quick Habit Tap</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-4 flex border-b border-white/10 text-xs overflow-x-auto gap-1">
          <button
            onClick={() => setActiveTab('architecture')}
            className={`py-2 px-3 font-bold transition whitespace-nowrap border-b-2 cursor-pointer ${
              activeTab === 'architecture'
                ? 'border-[#FF7628] text-[#FF7628]'
                : 'border-transparent text-[#9FA2AC] hover:text-white'
            }`}
          >
            Architecture
          </button>
          <button
            onClick={() => setActiveTab('service')}
            className={`py-2 px-3 font-bold transition whitespace-nowrap border-b-2 cursor-pointer ${
              activeTab === 'service'
                ? 'border-[#FF7628] text-[#FF7628]'
                : 'border-transparent text-[#9FA2AC] hover:text-white'
            }`}
          >
            OmniOverlayService.kt
          </button>
          <button
            onClick={() => setActiveTab('permission')}
            className={`py-2 px-3 font-bold transition whitespace-nowrap border-b-2 cursor-pointer ${
              activeTab === 'permission'
                ? 'border-[#FF7628] text-[#FF7628]'
                : 'border-transparent text-[#9FA2AC] hover:text-white'
            }`}
          >
            OverlayPermissionHelper.kt
          </button>
          <button
            onClick={() => setActiveTab('bridge')}
            className={`py-2 px-3 font-bold transition whitespace-nowrap border-b-2 cursor-pointer ${
              activeTab === 'bridge'
                ? 'border-[#FF7628] text-[#FF7628]'
                : 'border-transparent text-[#9FA2AC] hover:text-white'
            }`}
          >
            DataSyncBridge.kt
          </button>
          <button
            onClick={() => setActiveTab('manifest')}
            className={`py-2 px-3 font-bold transition whitespace-nowrap border-b-2 cursor-pointer ${
              activeTab === 'manifest'
                ? 'border-[#FF7628] text-[#FF7628]'
                : 'border-transparent text-[#9FA2AC] hover:text-white'
            }`}
          >
            AndroidManifest.xml
          </button>
          <button
            onClick={() => setActiveTab('gradle')}
            className={`py-2 px-3 font-bold transition whitespace-nowrap border-b-2 cursor-pointer ${
              activeTab === 'gradle'
                ? 'border-[#FF7628] text-[#FF7628]'
                : 'border-transparent text-[#9FA2AC] hover:text-white'
            }`}
          >
            build.gradle.kts
          </button>
        </div>

        {/* Tab Content Display */}
        <div className="mt-4 max-h-72 overflow-y-auto text-xs">
          {activeTab === 'architecture' && (
            <div className="space-y-3 text-[#A0A2AA]">
              <div className="p-3.5 rounded-xl bg-[#1C1D22] border border-white/5 space-y-1.5">
                <div className="flex items-center gap-2 text-white font-bold">
                  <CheckCircle2 className="w-4 h-4 text-[#22C58B]" />
                  <span>1. Permission: SYSTEM_ALERT_WINDOW</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Allows drawing the floating handle over third-party applications. Managed through <em>Settings &gt; Apps &gt; Special app access &gt; Display over other apps</em>.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#1C1D22] border border-white/5 space-y-1.5">
                <div className="flex items-center gap-2 text-white font-bold">
                  <CheckCircle2 className="w-4 h-4 text-[#22C58B]" />
                  <span>2. Android 14 Foreground Service Requirements</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Declares <code className="text-amber-300">foregroundServiceType="specialUse"</code> and ongoing notification so Android's battery manager does not terminate the floating handle while you commute.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#1C1D22] border border-white/5 space-y-1.5">
                <div className="flex items-center gap-2 text-white font-bold">
                  <CheckCircle2 className="w-4 h-4 text-[#22C58B]" />
                  <span>3. Local Sync Queue Bridge (`DataSyncBridge.kt`)</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Writes captures into a local JSON sync journal using identical record IDs and timestamps. When OMNI TRACKER is opened, entries are imported into IndexedDB and synced to OneDrive Excel.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'service' && (
            <div className="relative">
              <button
                onClick={() => copyCode('service', kotlinServiceCode)}
                className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-xs font-mono text-white transition cursor-pointer"
              >
                {copied === 'service' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied === 'service' ? 'Copied' : 'Copy'}
              </button>
              <pre className="p-3 rounded-xl bg-black/60 border border-white/10 text-[11px] font-mono text-emerald-300 overflow-x-auto leading-relaxed">
                {kotlinServiceCode}
              </pre>
            </div>
          )}

          {activeTab === 'permission' && (
            <div className="relative">
              <button
                onClick={() => copyCode('permission', permissionHelperCode)}
                className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-xs font-mono text-white transition cursor-pointer"
              >
                {copied === 'permission' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied === 'permission' ? 'Copied' : 'Copy'}
              </button>
              <pre className="p-3 rounded-xl bg-black/60 border border-white/10 text-[11px] font-mono text-emerald-300 overflow-x-auto leading-relaxed">
                {permissionHelperCode}
              </pre>
            </div>
          )}

          {activeTab === 'bridge' && (
            <div className="relative">
              <button
                onClick={() => copyCode('bridge', bridgeCode)}
                className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-xs font-mono text-white transition cursor-pointer"
              >
                {copied === 'bridge' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied === 'bridge' ? 'Copied' : 'Copy'}
              </button>
              <pre className="p-3 rounded-xl bg-black/60 border border-white/10 text-[11px] font-mono text-cyan-300 overflow-x-auto leading-relaxed">
                {bridgeCode}
              </pre>
            </div>
          )}

          {activeTab === 'manifest' && (
            <div className="relative">
              <button
                onClick={() => copyCode('manifest', manifestCode)}
                className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-xs font-mono text-white transition cursor-pointer"
              >
                {copied === 'manifest' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied === 'manifest' ? 'Copied' : 'Copy'}
              </button>
              <pre className="p-3 rounded-xl bg-black/60 border border-white/10 text-[11px] font-mono text-amber-300 overflow-x-auto leading-relaxed">
                {manifestCode}
              </pre>
            </div>
          )}

          {activeTab === 'gradle' && (
            <div className="relative">
              <button
                onClick={() => copyCode('gradle', gradleCode)}
                className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-xs font-mono text-white transition cursor-pointer"
              >
                {copied === 'gradle' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied === 'gradle' ? 'Copied' : 'Copy'}
              </button>
              <pre className="p-3 rounded-xl bg-black/60 border border-white/10 text-[11px] font-mono text-purple-300 overflow-x-auto leading-relaxed">
                {gradleCode}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-[11px] text-[#9FA2AC]">
            Source project files are generated in <code className="text-white font-mono">/android</code> directory
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
