package studio.altinn.lsp

import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import com.redhat.devtools.lsp4ij.AbstractDocumentMatcher

open class AltinnAppDocumentMatcher : AbstractDocumentMatcher() {
    override fun match(file: VirtualFile, project: Project): Boolean =
        AppWorkspaceDetector.getInstance(project).isAltinnAppProject()
}

class AltinnAppModelCsDocumentMatcher : AltinnAppDocumentMatcher() {
    override fun match(file: VirtualFile, project: Project): Boolean =
        file.path.contains("/App/models/") && super.match(file, project)
}
