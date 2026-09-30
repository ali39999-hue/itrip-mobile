# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# R1 Security Hardening: full R8 ruleset matching actual dependencies.

# --- React Native New Architecture (Fabric / TurboModules / Codegen) ---
-keep class com.facebook.react.turbomodule.** { *; }
-keep class com.facebook.react.fabric.** { *; }
-keep class com.facebook.react.uimanager.** { *; }
-keep class com.facebook.react.bridge.** { *; }
-keep @com.facebook.proguard.annotations.DoNotStrip class * { *; }
-keep @com.facebook.proguard.annotations.DoNotStripClass class * { *; }
-keepclassmembers class * { @com.facebook.proguard.annotations.DoNotStrip *; }

# --- Hermes ---
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# --- Expo modules (reflection-based module providers) ---
-keep class expo.modules.** { *; }
-keep class versioned.host.exp.exponent.** { *; }

# --- op-sqlite (JSI bindings — class names resolved natively) ---
-keep class com.margelo.** { *; }
-keep class cc.callisto.** { *; }
-if class @interface com.margelo.nitro.core.* { *; }
-keep @com.margelo.nitro.core.NitroModule class * { *; }

# --- SQLCipher / net.zetetic ---
-keep class net.sqlcipher.** { *; }
-keep class net.zetetic.** { *; }

# --- gesture-handler / screens / safe-area / svg (view managers via reflection) ---
-keep class com.swmansion.gesturehandler.** { *; }
-keep class com.swmansion.rnscreens.** { *; }
-keep class com.th3rdzone.safearea.** { *; }
-keep class com.horcrux.svg.** { *; }

# --- QRCode svg (react-native-qrcode-svg is pure JS — no native rules needed) ---

# --- AsyncStorage/SecureStore (Keystore-backed, uses reflection on prefs) ---
-keep class expo.modules.securestore.** { *; }

# --- Keep line numbers for readable crash stacks in telemetry (no obfuscation of stack traces) ---
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# --- Remove debug logging in release ---
-assumenosideeffects class android.util.Log {
    public static int v(...);
    public static int d(...);
}

