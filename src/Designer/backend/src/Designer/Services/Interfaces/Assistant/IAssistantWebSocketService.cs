using System.Threading.Tasks;

namespace Altinn.Studio.Designer.Services.Interfaces.Assistant;

/// <summary>
/// Manages the per-developer WebSocket connection to the assistant service.
/// The connection stays alive independently of browser tab lifecycle so that
/// in-flight workflows can stream events back to any reconnected tab.
/// Messages received from the agent are forwarded to the developer's SignalR group.
/// </summary>
public interface IAssistantWebSocketService
{
    /// <summary>
    /// Sends a session frame on the developer's connection, so that the assistant service
    /// sends the developer's events on that connection. Opens the connection first if it is closed.
    /// Returns when the assistant service confirms the session, or after a few seconds without an answer.
    /// </summary>
    Task RegisterSessionAsync(string sessionId, string developer);

    /// <summary>
    /// Closes the agents WebSocket for this developer.
    /// Should only be called when the developer has no active sessions and no open tabs.
    /// </summary>
    Task CloseConnectionAsync(string developer);

    /// <summary>
    /// Returns true if a live agents WebSocket exists for this developer.
    /// </summary>
    bool IsConnected(string developer);
}
