package studio.altinn.lsp.actions

import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.project.DumbAware
import com.redhat.devtools.lsp4ij.LanguageServerManager
import studio.altinn.lsp.AltinnLsp

class RestartServerAction : AnAction(), DumbAware {

    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT

    override fun update(e: AnActionEvent) {
        e.presentation.isEnabledAndVisible = e.project != null
    }

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        LanguageServerManager.getInstance(project).start(
            AltinnLsp.SERVER_ID,
            LanguageServerManager.StartOptions().setForceRestart(true),
        )
    }
}
