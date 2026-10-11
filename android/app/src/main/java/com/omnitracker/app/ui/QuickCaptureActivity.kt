package com.omnitracker.app.ui

import android.app.Activity
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import com.omnitracker.app.R
import com.omnitracker.app.bridge.DataSyncBridge

/**
 * Translucent dialog Activity launched by tapping the Omni floating handle.
 * Provides rapid expense capture and habit checklist over any running application.
 */
class QuickCaptureActivity : Activity() {

    private var selectedCategory: String = "Rickshaw"
    private var selectedCurrency: String = "৳"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.dialog_quick_capture)

        setupWindowAttributes()
        setupCategorySelectors()
        setupSubmitAction()
    }

    private fun setupWindowAttributes() {
        window?.let { w ->
            w.setLayout(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.WRAP_CONTENT
            )
            w.setGravity(Gravity.BOTTOM)
            w.setBackgroundDrawableResource(android.R.color.transparent)
        }

        // Tap outside to dismiss
        findViewById<View>(R.id.rootOverlayContainer)?.setOnClickListener {
            finish()
        }
    }

    private fun setupCategorySelectors() {
        val categories = listOf("Rickshaw", "Bus", "CNG", "Bike", "Walking", "Uber/Ride")
        // Category button click handling with active highlight
        findViewById<Button>(R.id.btnCatRickshaw)?.setOnClickListener { updateCategory("Rickshaw") }
        findViewById<Button>(R.id.btnCatBus)?.setOnClickListener { updateCategory("Bus") }
        findViewById<Button>(R.id.btnCatCNG)?.setOnClickListener { updateCategory("CNG") }
        findViewById<Button>(R.id.btnCatBike)?.setOnClickListener { updateCategory("Bike") }
    }

    private fun updateCategory(category: String) {
        selectedCategory = category
        findViewById<TextView>(R.id.txtCurrentCategory)?.text = "Category: $category"
    }

    private fun setupSubmitAction() {
        val editAmount = findViewById<EditText>(R.id.editAmount)
        val editNote = findViewById<EditText>(R.id.editNote)
        val btnSave = findViewById<Button>(R.id.btnSaveExpense)
        val btnClose = findViewById<View>(R.id.btnCloseOverlay)

        btnClose?.setOnClickListener { finish() }

        btnSave?.setOnClickListener {
            val amountStr = editAmount?.text?.toString()?.trim() ?: ""
            val amount = amountStr.toDoubleOrNull()

            if (amount == null || amount <= 0.0) {
                Toast.makeText(this, "Please enter a valid amount", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            val note = editNote?.text?.toString()?.trim() ?: ""

            // Persist to sync bridge journal
            val record = DataSyncBridge.recordExpense(
                context = this,
                amount = amount,
                currency = selectedCurrency,
                category = selectedCategory,
                note = note
            )

            Toast.makeText(
                this,
                "Logged $selectedCurrency$amount ($selectedCategory) to OMNI TRACKER",
                Toast.LENGTH_SHORT
            ).show()

            finish()
        }
    }
}
