package studio.altinn.lsp

import com.intellij.openapi.project.ProjectManager
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.openapi.vfs.newvfs.BulkFileListener
import com.intellij.openapi.vfs.newvfs.events.VFileContentChangeEvent
import com.intellij.openapi.vfs.newvfs.events.VFileCopyEvent
import com.intellij.openapi.vfs.newvfs.events.VFileCreateEvent
import com.intellij.openapi.vfs.newvfs.events.VFileDeleteEvent
import com.intellij.openapi.vfs.newvfs.events.VFileEvent
import com.intellij.openapi.vfs.newvfs.events.VFileMoveEvent
import com.intellij.openapi.vfs.newvfs.events.VFilePropertyChangeEvent
import com.redhat.devtools.lsp4ij.LanguageServerManager
import com.redhat.devtools.lsp4ij.ServerStatus
import org.eclipse.lsp4j.DidChangeWatchedFilesParams
import org.eclipse.lsp4j.FileChangeType
import org.eclipse.lsp4j.FileEvent
import java.io.File

class FileWatchForwarder : BulkFileListener {

    override fun after(events: List<VFileEvent>) {
        val fileEvents = events.flatMap { toFileEvents(it) }
        if (fileEvents.isEmpty()) {
            return
        }
        for (project in ProjectManager.getInstance().openProjects) {
            if (project.isDisposed) {
                continue
            }
            val manager = LanguageServerManager.getInstance(project)
            if (manager.getServerStatus(AltinnLsp.SERVER_ID) != ServerStatus.started) {
                continue
            }
            manager.getLanguageServer(AltinnLsp.SERVER_ID).thenAccept { item ->
                item?.server?.workspaceService
                    ?.didChangeWatchedFiles(DidChangeWatchedFilesParams(fileEvents))
            }
        }
    }

    private fun toFileEvents(event: VFileEvent): List<FileEvent> = when (event) {
        is VFileCreateEvent -> listOfNotNull(fileEvent(event.path, FileChangeType.Created))
        is VFileCopyEvent -> listOfNotNull(fileEvent(event.path, FileChangeType.Created))
        is VFileContentChangeEvent -> listOfNotNull(fileEvent(event.path, FileChangeType.Changed))
        is VFileDeleteEvent -> listOfNotNull(fileEvent(event.path, FileChangeType.Deleted))
        is VFileMoveEvent -> listOfNotNull(
            fileEvent(event.oldPath, FileChangeType.Deleted),
            fileEvent(event.newPath, FileChangeType.Created),
        )
        is VFilePropertyChangeEvent ->
            if (event.propertyName == VirtualFile.PROP_NAME && event.oldValue != event.newValue) {
                listOfNotNull(
                    fileEvent(event.oldPath, FileChangeType.Deleted),
                    fileEvent(event.newPath, FileChangeType.Created),
                )
            } else {
                emptyList()
            }
        else -> emptyList()
    }

    private fun fileEvent(path: String, type: FileChangeType): FileEvent? =
        if (isWatched(path)) FileEvent(File(path).toURI().toASCIIString(), type) else null

    companion object {
        private val appContentRegex = Regex(".*/App/(config|ui|models)/.*")

        fun isWatched(path: String): Boolean =
            appContentRegex.matches(path) || path.endsWith("/App/App.csproj")
    }
}
