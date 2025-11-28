# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Preserve WebView JavaScript Interface
-keepclassmembers class com.chameleon.pcremote.MainActivity$WebAppInterface {
   public *;
}

# Keep JavaScript interface methods
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Preserve line number information for debugging stack traces
-keepattributes SourceFile,LineNumberTable

# Don't obfuscate WebView related classes
-keep class android.webkit.** { *; }