package studio.altinn.lsp

import com.intellij.execution.ExecutionException
import com.intellij.execution.configurations.GeneralCommandLine
import java.util.concurrent.TimeUnit

object ServerProbe {

    fun canSpawn(command: String): Boolean {
        val process = try {
            GeneralCommandLine(command, "--version").createProcess()
        } catch (_: ExecutionException) {
            return false
        }
        if (!process.waitFor(10, TimeUnit.SECONDS)) {
            process.destroyForcibly()
        }
        return true
    }
}
