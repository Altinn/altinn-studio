package studio.altinn.lsp.settings

import com.intellij.execution.configurations.ParametersList
import com.intellij.openapi.options.BoundConfigurable
import com.intellij.openapi.project.ProjectManager
import com.intellij.openapi.ui.DialogPanel
import com.intellij.ui.dsl.builder.bindItem
import com.intellij.ui.dsl.builder.bindText
import com.intellij.ui.dsl.builder.columns
import com.intellij.ui.dsl.builder.panel
import com.redhat.devtools.lsp4ij.LanguageServerManager
import studio.altinn.lsp.AltinnLsp

class AltinnLspConfigurable : BoundConfigurable("Altinn Studio Language Server") {

    private val settings = AltinnLspSettings.getInstance()

    override fun createPanel(): DialogPanel = panel {
        row("Server command:") {
            textField()
                .columns(30)
                .bindText(
                    getter = { settings.serverCommand },
                    setter = { settings.serverCommand = it.trim() },
                )
                .comment(
                    "The <code>studioctl</code> executable that hosts the language server. " +
                        "Must be on your PATH or an absolute path.",
                )
        }
        row("Server arguments:") {
            textField()
                .columns(30)
                .bindText(
                    getter = { ParametersList.join(settings.serverArgs) },
                    setter = { settings.serverArgs = ParametersList.parse(it).toList() },
                )
                .comment("Arguments passed to the server command to start the language server over stdio.")
        }
        row("Log level:") {
            comboBox(AltinnLspSettings.LOG_LEVELS)
                .bindItem(
                    getter = { settings.logLevel },
                    setter = { settings.logLevel = it ?: AltinnLspSettings.DEFAULT_LOG_LEVEL },
                )
                .comment(
                    "Verbosity of the language server's own logging in the LSP console. " +
                        "<code>debug</code> adds validation summaries; <code>trace</code> logs every message.",
                )
        }
    }

    override fun apply() {
        val modified = isModified
        super.apply()
        if (modified) {
            restartRunningServers()
        }
    }

    private fun restartRunningServers() {
        for (project in ProjectManager.getInstance().openProjects) {
            if (project.isDisposed) continue
            LanguageServerManager.getInstance(project).start(
                AltinnLsp.SERVER_ID,
                LanguageServerManager.StartOptions().setForceRestart(true),
            )
        }
    }
}
