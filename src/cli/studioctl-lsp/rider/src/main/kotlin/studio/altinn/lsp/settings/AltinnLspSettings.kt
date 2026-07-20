package studio.altinn.lsp.settings

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.PersistentStateComponent
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.State
import com.intellij.openapi.components.Storage

@Service(Service.Level.APP)
@State(name = "AltinnLspSettings", storages = [Storage("altinn-lsp.xml")])
class AltinnLspSettings : PersistentStateComponent<AltinnLspSettings.State> {

    class State {
        var serverCommand: String = DEFAULT_SERVER_COMMAND
        var serverArgs: MutableList<String> = DEFAULT_SERVER_ARGS.toMutableList()
        var logLevel: String = DEFAULT_LOG_LEVEL
    }

    private var state = State()

    var serverCommand: String
        get() = state.serverCommand
        set(value) {
            state.serverCommand = value
        }

    var serverArgs: List<String>
        get() = state.serverArgs
        set(value) {
            state.serverArgs = value.toMutableList()
        }

    var logLevel: String
        get() = state.logLevel
        set(value) {
            state.logLevel = value
        }

    override fun getState(): State = state

    override fun loadState(state: State) {
        this.state = state
    }

    companion object {
        const val DEFAULT_SERVER_COMMAND = "studioctl"
        val DEFAULT_SERVER_ARGS = listOf("app", "lsp")
        const val DEFAULT_LOG_LEVEL = "info"
        val LOG_LEVELS = listOf("error", "warning", "info", "debug", "trace")

        fun getInstance(): AltinnLspSettings =
            ApplicationManager.getApplication().getService(AltinnLspSettings::class.java)
    }
}
