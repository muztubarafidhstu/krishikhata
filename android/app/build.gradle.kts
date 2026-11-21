plugins {
    id("com.android.application")
}

val kkDomain: String = (project.findProperty("kkDomain") as String?) ?: "rafid5.com"
val buildNo: Int = (System.getenv("VERSION_CODE") ?: "1").toInt()
val keystore: String? = System.getenv("KEYSTORE_FILE")

android {
    namespace = "com.rafid5.krishikhata"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.rafid5.krishikhata"
        minSdk = 24
        targetSdk = 35
        versionCode = buildNo
        versionName = "1.0.$buildNo"
        buildConfigField("String", "BASE_DOMAIN", "\"$kkDomain\"")
    }

    buildFeatures { buildConfig = true }

    signingConfigs {
        create("release") {
            if (keystore != null) {
                storeFile = file(keystore)
                storePassword = System.getenv("KEYSTORE_PASSWORD")
                keyAlias = System.getenv("KEY_ALIAS")
                keyPassword = System.getenv("KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = if (keystore != null) signingConfigs.getByName("release") else signingConfigs.getByName("debug")
        }
    }

    lint {
        checkReleaseBuilds = false
        abortOnError = false
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
