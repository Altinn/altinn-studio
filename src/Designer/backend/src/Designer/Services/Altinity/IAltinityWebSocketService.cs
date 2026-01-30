using System;
using System.Threading.Tasks;

namespace Altinn.Studio.Designer.Services.Altinity;

/// <summary>
/// Service for managing WebSocket connections to Altinity agent
/// </summary>
public interface IAltinityWebSocketService
{
    /// <summary>
    /// Establishes WebSocket connection to Altinity and registers a session
    /// </summary>
    /// <param name="sessionId">The session identifier</param>
    /// <param name="onMessageReceived">Callback for when messages are received from Altinity</param>
    Task<string> ConnectAndRegisterSessionAsync(string sessionId, Func<object, Task> onMessageReceived);

    /// <summary>
    /// Closes the WebSocket connection for a session
    /// </summary>
    /// <param name="connectionId">The connection identifier returned from ConnectAndRegisterSessionAsync</param>
    Task DisconnectSessionAsync(string connectionId);
}
