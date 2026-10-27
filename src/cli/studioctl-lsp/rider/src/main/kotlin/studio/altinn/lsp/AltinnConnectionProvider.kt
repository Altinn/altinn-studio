package studio.altinn.lsp

import com.intellij.execution.configurations.GeneralCommandLine
import com.intellij.ide.BrowserUtil
import com.intellij.notification.Notification
import com.intellij.notification.NotificationAction
import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.options.ShowSettingsUtil
import com.intellij.openapi.project.Project
import com.redhat.devtools.lsp4ij.server.OSProcessStreamConnectionProvider
import studio.altinn.lsp.settings.AltinnLspConfigurable
import studio.altinn.lsp.settings.AltinnLspSettings
import java.io.IOException

class AltinnConnectionProvider(private val project: Project) : OSProcessStreamConnectionProvider() {

    init {
        val settings = AltinnLspSettings.getInstance()
        var commandLine = GeneralCommandLine(listOf(settings.serverCommand) + settings.serverArgs)
            .withEnvironment("STUDIOCTL_LSP_LOG", settings.logLevel)
        project.basePath?.let { commandLine = commandLine.withWorkingDirectory(java.nio.file.Path.of(it)) }
        setCommandLine(commandLine)
    }

    override fun start() {
        val command = AltinnLspSettings.getInstance().serverCommand
        if (!ServerProbe.canSpawn(command)) {
            notifyMissingServer(command)
            throw IOException(
                "'$command' was not found. Install studioctl, or point the Altinn Studio " +
                    "Language Server settings at its full path.",
            )
        }
        super.start()
    }

    private fun notifyMissingServer(command: String) {
        NotificationGroupManager.getInstance()
            .getNotificationGroup(AltinnLsp.NOTIFICATION_GROUP)
            .createNotification(
                "Altinn Studio Language Server",
                "'$command' was not found. Install studioctl, or configure the executable path.",
                NotificationType.ERROR,
            )
            .addAction(object : NotificationAction("Open settings") {
                override fun actionPerformed(e: AnActionEvent, notification: Notification) {
                    ShowSettingsUtil.getInstance()
                        .showSettingsDialog(e.project, AltinnLspConfigurable::class.java)
                }
            })
            .addAction(object : NotificationAction("Install studioctl") {
                override fun actionPerformed(e: AnActionEvent, notification: Notification) {
                    BrowserUtil.browse(AltinnLsp.DOCS_URL)
                }
            })
            .notify(project)
    }
}
