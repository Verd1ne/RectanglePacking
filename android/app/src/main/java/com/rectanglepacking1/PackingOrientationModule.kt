package com.rectanglepacking1

import android.content.pm.ActivityInfo
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class PackingOrientationModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "PackingOrientation"

  @ReactMethod
  fun lockLandscape() {
    currentActivity?.runOnUiThread {
      currentActivity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
    }
  }

  @ReactMethod
  fun unlockOrientation() {
    currentActivity?.runOnUiThread {
      currentActivity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
    }
  }
}
