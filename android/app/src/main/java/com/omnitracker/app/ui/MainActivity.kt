
package com.omnitracker.app.ui

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.view.Gravity
import android.view.ViewGroup
import android.graphics.Color
import android.widget.Toast
import com.omnitracker.app.overlay.OmniOverlayService
import com.omnitracker.app.overlay.OverlayPermissionHelper

class MainActivity : Activity() {

    private lateinit var statusText: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        createMainScreen()
    }

    private fun createMainScreen() {
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(32, 40, 32, 40)
            setBackgroundColor(Color.rgb(18, 20, 30))
        }

        val title = TextView(this).apply {
            text = "OMNI TRACKER"
            textSize = 28f
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
        }

        statusText = TextView(this).apply {
            text = "Floating assistant is not active"
            textSize = 15f
            setTextColor(Color.LTGRAY)
            gravity = Gravity.CENTER
            setPadding(0, 24, 0, 24)
        }

        val permissionButton = Button(this).apply {
            text = "Allow Floating Permission"
            setOnClickListener {
                if (!OverlayPermissionHelper.hasOverlayPermission(this@MainActivity)) {
                    OverlayPermissionHelper.requestOverlayPermission(this@MainActivity)
                } else {
                    startAssistant()
                }
            }
        }

        val startButton = Button(this).apply {
            text = "Start Floating Assistant"
            setOnClickListener {
                if (OverlayPermissionHelper.hasOverlayPermission(this@MainActivity)) {
                    startAssistant()
                } else {
                    Toast.makeText(
                        this@MainActivity,
                        "First allow floating permission",
                        Toast.LENGTH_LONG
                    ).show()
                    OverlayPermissionHelper.requestOverlayPermission(this@MainActivity)
                }
            }
        }

        val stopButton = Button(this).apply {
            text = "Stop Floating Assistant"
            setOnClickListener {
                OmniOverlayService.stopService(this@MainActivity)
                statusText.text = "Floating assistant stopped"
            }
        }

        layout.addView(title)
        layout.addView(statusText)
        layout.addView(permissionButton)
        layout.addView(startButton)
        layout.addView(stopButton)

        setContentView(layout)
    }

    private fun startAssistant() {
        try {
            OmniOverlayService.startService(this)
            statusText.text = "Floating assistant started"
        } catch (e: Exception) {
            Toast.makeText(
                this,
                "Could not start assistant: ${e.message}",
                Toast.LENGTH_LONG
            ).show()
        }
    }

    override fun onResume() {
        super.onResume()
        if (::statusText.isInitialized &&
            OverlayPermissionHelper.hasOverlayPermission(this)
        ) {
            statusText.text = "Floating permission granted"
        }
    }
}
