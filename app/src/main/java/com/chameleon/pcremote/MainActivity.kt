package com.chameleon.pcremote

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Bundle
import android.view.HapticFeedbackConstants
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebView
import androidx.activity.ComponentActivity
import androidx.core.graphics.toColorInt

class MainActivity : ComponentActivity(), SensorEventListener {

    private lateinit var sensorManager: SensorManager
    private var accelerometer: Sensor? = null
    private var magnetometer: Sensor? = null
    private var isGyroActive = false
    private lateinit var myWebView: WebView

    // Arrays for sensor calculations
    private val accelerometerReading = FloatArray(3)
    private val magnetometerReading = FloatArray(3)
    private val rotationMatrix = FloatArray(9)
    private val orientationAngles = FloatArray(3)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = "#111827".toColorInt()
        window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
                View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION or
                View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
                View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
                View.SYSTEM_UI_FLAG_FULLSCREEN

        // Initialize sensors - using accelerometer + magnetometer instead of gyroscope
        sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        magnetometer = sensorManager.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD)

        myWebView = WebView(this).apply {
            setBackgroundColor(0x00000000)
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            webChromeClient = WebChromeClient()

            addJavascriptInterface(WebAppInterface(this@MainActivity, this.rootView), "Android")

            loadUrl("file:///android_asset/index.html")
        }

        setContentView(myWebView)
    }

    override fun onPause() {
        super.onPause()
        if (isGyroActive) {
            sensorManager.unregisterListener(this)
            isGyroActive = false
        }
    }

    override fun onSensorChanged(event: SensorEvent) {
        when (event.sensor.type) {
            Sensor.TYPE_ACCELEROMETER -> {
                System.arraycopy(event.values, 0, accelerometerReading, 0, accelerometerReading.size)
            }
            Sensor.TYPE_MAGNETIC_FIELD -> {
                System.arraycopy(event.values, 0, magnetometerReading, 0, magnetometerReading.size)
            }
        }

        // Calculate orientation and send to JavaScript
        updateOrientationAngles()
    }

    private fun updateOrientationAngles() {
        // Calculate rotation matrix from accelerometer and magnetometer
        SensorManager.getRotationMatrix(
            rotationMatrix, null,
            accelerometerReading, magnetometerReading
        )

        // Get orientation angles from rotation matrix
        SensorManager.getOrientation(rotationMatrix, orientationAngles)

        // Convert radians to degrees for easier handling in JavaScript
        // orientationAngles[1]: pitch (forward/backward tilt)
        // orientationAngles[2]: roll (left/right tilt)
        val pitch = Math.toDegrees(orientationAngles[1].toDouble()).toFloat()
        val roll = Math.toDegrees(orientationAngles[2].toDouble()).toFloat()

        // Send tilt data to JavaScript
        myWebView.evaluateJavascript(
            "window.handleTiltData($pitch, $roll);",
            null
        )
    }

    override fun onAccuracyChanged(sensor: Sensor, accuracy: Int) {}

    private inner class WebAppInterface(private val context: Context, private val view: View) {

        @JavascriptInterface
        fun performHapticFeedback() {
            view.post {
                view.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY)
            }
        }

        @JavascriptInterface
        fun toggleGyroscope(enable: Boolean) {
            if (enable && !isGyroActive) {
                // Register both accelerometer and magnetometer
                accelerometer?.let {
                    sensorManager.registerListener(
                        this@MainActivity,
                        it,
                        SensorManager.SENSOR_DELAY_GAME
                    )
                }
                magnetometer?.let {
                    sensorManager.registerListener(
                        this@MainActivity,
                        it,
                        SensorManager.SENSOR_DELAY_GAME
                    )
                }
                isGyroActive = true
            } else if (!enable && isGyroActive) {
                sensorManager.unregisterListener(this@MainActivity)
                isGyroActive = false
            }
        }
    }
}
