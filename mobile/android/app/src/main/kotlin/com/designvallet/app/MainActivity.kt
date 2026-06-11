package com.designvallet.app

import android.os.Bundle
import android.view.WindowManager
import io.flutter.embedding.android.FlutterActivity

class MainActivity: FlutterActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Production-ready security: Disable screenshots and screen recording at OS level
        window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
    }
}
