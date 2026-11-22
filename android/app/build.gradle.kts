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
        minSdk = 24
        targetSdk = 35
        versionCode = buildNo
        versionName = "1.0.$buildNo"
        buildConfigField("String", "BASE_DOMAIN", "\"$kkDomain\"")
    }

    // One app per business segment, all from one code base (see server/segments.js).
    flavorDimensions += "brand"
    productFlavors {
        create("agri") {
            dimension = "brand"
            applicationId = "com.rafid5.krishikhata"
            resValue("string", "app_name", "কৃষিখাতা")
            buildConfigField("String", "BRAND", "\"agri\"")
        }
        create("build") {
            dimension = "brand"
            applicationId = "com.rafid5.nirmankhata"
            resValue("string", "app_name", "নির্মাণখাতা")
            buildConfigField("String", "BRAND", "\"build\"")
        }
        create("bike") {
            dimension = "brand"
            applicationId = "com.rafid5.bikekhata"
            resValue("string", "app_name", "বাইকখাতা")
            buildConfigField("String", "BRAND", "\"bike\"")
        }
        create("brick") {
            dimension = "brand"
            applicationId = "com.rafid5.itkhata"
            resValue("string", "app_name", "ইটখাতা")
            buildConfigField("String", "BRAND", "\"brick\"")
        }
        create("mobile") {
            dimension = "brand"
            applicationId = "com.rafid5.mobilekhata"
            resValue("string", "app_name", "মোবাইলখাতা")
            buildConfigField("String", "BRAND", "\"mobile\"")
        }
        create("furniture") {
            dimension = "brand"
            applicationId = "com.rafid5.furniturekhata"
            resValue("string", "app_name", "ফার্নিচারখাতা")
            buildConfigField("String", "BRAND", "\"furniture\"")
        }
        create("car") {
            dimension = "brand"
            applicationId = "com.rafid5.garikhata"
            resValue("string", "app_name", "গাড়িখাতা")
            buildConfigField("String", "BRAND", "\"car\"")
        }
        create("hardware") {
            dimension = "brand"
            applicationId = "com.rafid5.hardwarekhata"
            resValue("string", "app_name", "হার্ডওয়্যারখাতা")
            buildConfigField("String", "BRAND", "\"hardware\"")
        }
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
