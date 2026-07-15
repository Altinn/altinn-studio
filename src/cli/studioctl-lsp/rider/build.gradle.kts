import org.jetbrains.intellij.platform.gradle.IntelliJPlatformType

plugins {
    kotlin("jvm") version "2.3.0"
    id("org.jetbrains.intellij.platform") version "2.18.1"
}

group = "studio.altinn"
version = "0.1.1"

repositories {
    mavenCentral()
    intellijPlatform {
        defaultRepositories()
    }
}

dependencies {
    intellijPlatform {
        rider("2025.1") {
            useInstaller = false
        }
        plugin("com.redhat.devtools.lsp4ij", "0.20.1")
        pluginVerifier()
        zipSigner()
    }
}

kotlin {
    jvmToolchain(21)
}

intellijPlatform {
    pluginConfiguration {
        version = project.version.toString()
        ideaVersion {
            sinceBuild = "251"
            untilBuild = provider { null }
        }
    }
    pluginVerification {
        ides {
            create(IntelliJPlatformType.Rider, "2025.1")
        }
    }
}
