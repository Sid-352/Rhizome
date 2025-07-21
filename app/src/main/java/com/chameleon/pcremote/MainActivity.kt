package com.chameleon.pcremote

import android.content.Context
import android.os.Bundle
import android.view.HapticFeedbackConstants
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebView
import androidx.activity.ComponentActivity
import androidx.core.graphics.toColorInt

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = "#111827".toColorInt()
        window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
                View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION or
                View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
                View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
                View.SYSTEM_UI_FLAG_FULLSCREEN

        val myWebView = WebView(this).apply {
            setBackgroundColor(0x00000000) // Transparent
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            webChromeClient = WebChromeClient()

            // --- CHANGE 1: Add the "bridge" to the WebView ---
            // JavaScript can now call functions on the "Android" object.
            addJavascriptInterface(WebAppInterface(this@MainActivity, this.rootView), "Android")

            loadUrl("file:///android_asset/index.html")
        }

        setContentView(myWebView)
    }

    /**
     * --- CHANGE 2: Add this class inside MainActivity ---
     * This class acts as the bridge between JavaScript and Kotlin.
     */
    private class WebAppInterface(private val context: Context, private val view: View) {

        // This annotation is required to expose the function to JavaScript
        @JavascriptInterface
        fun performHapticFeedback() {
            // Use the native Android Haptic Feedback system
            view.post {
                view.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY)
            }
        }
    }
}