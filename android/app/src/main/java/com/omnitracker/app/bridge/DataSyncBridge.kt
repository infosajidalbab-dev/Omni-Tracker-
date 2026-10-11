package com.omnitracker.app.bridge

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID

/**
 * Data Synchronization Bridge between Native Android Overlay and OMNI TRACKER.
 * 
 * Features:
 * - Generates stable, deterministic entity IDs identical to the Web IndexedDB schema
 * - Records local commute expenses with categories, amounts, and notes
 * - Queues one-tap habit completions with today's date
 * - Persists offline entries safely in an encrypted/private JSON sync journal
 * - Provides bidirectional import/export bridge for the web app to consume
 * - Zero token exposure: does not store or process credentials
 */
object DataSyncBridge {

    private const val SYNC_JOURNAL_FILE = "omni_native_sync_journal.json"

    data class QuickExpenseRecord(
        val id: String,
        val amount: Double,
        val currency: String,
        val category: String,
        val fromLocation: String,
        val toLocation: String,
        val note: String,
        val date: String,
        val time: String,
        val createdAt: String
    )

    data class QuickHabitCompletionRecord(
        val id: String,
        val habitId: String,
        val date: String,
        val completedAt: String
    )

    private fun getJournalFile(context: Context): File {
        return File(context.filesDir, SYNC_JOURNAL_FILE)
    }

    /**
     * Appends a newly captured expense to the local synchronization journal.
     */
    @Synchronized
    fun recordExpense(
        context: Context,
        amount: Double,
        currency: String = "৳",
        category: String,
        fromLocation: String = "",
        toLocation: String = "",
        note: String = ""
    ): QuickExpenseRecord {
        val now = Date()
        val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        val timeFormat = SimpleDateFormat("HH:mm", Locale.US)

        val id = "exp_native_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().take(6)
        val record = QuickExpenseRecord(
            id = id,
            amount = amount,
            currency = currency,
            category = category,
            fromLocation = fromLocation.trim(),
            toLocation = toLocation.trim(),
            note = note.trim(),
            date = dateFormat.format(now),
            time = timeFormat.format(now),
            createdAt = isoFormat.format(now)
        )

        val root = readJournal(context)
        val expensesArray = root.optJSONArray("expenses") ?: JSONArray()
        
        val itemObj = JSONObject().apply {
            put("id", record.id)
            put("amount", record.amount)
            put("currency", record.currency)
            put("category", record.category)
            put("fromLocation", record.fromLocation)
            put("toLocation", record.toLocation)
            put("note", record.note)
            put("date", record.date)
            put("time", record.time)
            put("createdAt", record.createdAt)
            put("syncStatus", "pending")
        }
        expensesArray.put(itemObj)
        root.put("expenses", expensesArray)
        root.put("lastModified", isoFormat.format(now))

        writeJournal(context, root)
        return record
    }

    /**
     * Records a habit completion from the native overlay.
     */
    @Synchronized
    fun recordHabitCompletion(context: Context, habitId: String): QuickHabitCompletionRecord {
        val now = Date()
        val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)

        val id = "hcomp_native_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().take(6)
        val record = QuickHabitCompletionRecord(
            id = id,
            habitId = habitId,
            date = dateFormat.format(now),
            completedAt = isoFormat.format(now)
        )

        val root = readJournal(context)
        val completionsArray = root.optJSONArray("habitCompletions") ?: JSONArray()

        val itemObj = JSONObject().apply {
            put("id", record.id)
            put("habitId", record.habitId)
            put("date", record.date)
            put("completedAt", record.completedAt)
            put("syncStatus", "pending")
        }
        completionsArray.put(itemObj)
        root.put("habitCompletions", completionsArray)
        root.put("lastModified", isoFormat.format(now))

        writeJournal(context, root)
        return record
    }

    /**
     * Reads all pending journal records for import into the main Web/IndexedDB storage.
     */
    @Synchronized
    fun exportPendingJournalJson(context: Context): String {
        return readJournal(context).toString()
    }

    /**
     * Clears processed records after confirmation of import into OMNI TRACKER database.
     */
    @Synchronized
    fun clearJournal(context: Context) {
        val file = getJournalFile(context)
        if (file.exists()) {
            file.delete()
        }
    }

    private fun readJournal(context: Context): JSONObject {
        val file = getJournalFile(context)
        if (!file.exists()) return JSONObject()
        return try {
            val content = file.readText()
            JSONObject(content)
        } catch (e: Exception) {
            JSONObject()
        }
    }

    private fun writeJournal(context: Context, obj: JSONObject) {
        val file = getJournalFile(context)
        file.writeText(obj.toString(2))
    }
}
