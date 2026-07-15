package studio.altinn.lsp

import com.intellij.openapi.components.Service
import com.intellij.openapi.components.service
import com.intellij.openapi.project.Project
import com.intellij.openapi.roots.ProjectRootManager
import com.intellij.openapi.vfs.LocalFileSystem
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.openapi.vfs.VirtualFileManager
import com.intellij.psi.util.CachedValueProvider
import com.intellij.psi.util.CachedValuesManager

@Service(Service.Level.PROJECT)
class AppWorkspaceDetector(private val project: Project) {

    companion object {
        fun getInstance(project: Project): AppWorkspaceDetector = project.service()
    }

    fun isAltinnAppProject(): Boolean =
        CachedValuesManager.getManager(project).getCachedValue(project) {
            CachedValueProvider.Result.create(
                computeIsAltinnAppProject(),
                VirtualFileManager.VFS_STRUCTURE_MODIFICATIONS,
            )
        }

    private fun computeIsAltinnAppProject(): Boolean {
        val roots = mutableListOf<VirtualFile>()
        project.basePath
            ?.let { LocalFileSystem.getInstance().findFileByPath(it) }
            ?.let { roots.add(it) }
        roots.addAll(ProjectRootManager.getInstance(project).contentRoots)
        return roots.distinctBy { it.path }.any { hasAppMetadata(it) }
    }

    private fun hasAppMetadata(root: VirtualFile): Boolean {
        if (containsConfig(root)) {
            return true
        }
        return root.children.any { it.isDirectory && containsConfig(it) }
    }

    private fun containsConfig(dir: VirtualFile): Boolean =
        dir.findFileByRelativePath("config/applicationmetadata.json") != null ||
            dir.findFileByRelativePath("App/config/applicationmetadata.json") != null
}
