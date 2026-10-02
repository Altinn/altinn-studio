import org.jetbrains.intellij.platform.gradle.IntelliJPlatformType

plugins {
    kotlin("jvm") version "2.3.0"
    id("org.jetbrains.intellij.platform") version "2.18.1"
}

group = "studio.altinn"
version = providers.gradleProperty("pluginVersion").getOrElse("0.0.0-dev")

repositories {
    mavenCentral()
    intellijPlatform {
        defaultRepositories()
    }
}

val platformVersion = providers.gradleProperty("platformVersion")

dependencies {
    intellijPlatform {
        rider(platformVersion) {
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
        changeNotes = providers.environmentVariable("PLUGIN_CHANGE_NOTES_FILE")
            .map { file(it).readText() }
            .orElse("See CHANGELOG.md in the repository.")
        ideaVersion {
            sinceBuild = "251"
            untilBuild = provider { null }
        }
    }
    pluginVerification {
        ides {
            create(IntelliJPlatformType.Rider, platformVersion)
        }
    }
    publishing {
        token = providers.environmentVariable("JETBRAINS_MARKETPLACE_TOKEN")
        channels = providers.environmentVariable("JETBRAINS_PUBLISH_CHANNEL")
            .map { listOf(it) }
            .orElse(listOf("default"))
    }
}
