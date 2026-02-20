using System;
using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Designer.Services.Implementation;

/// <summary>
/// Service for managing WebSocket connections to Altinity agent
/// </summary>
public class AltinityWebSocketService : IAltinityWebSocketService, IDisposable
{
    private const int WebSocketBufferSize = 1024 * 1024; // 1MB to handle large agent messages with PDF content
    private const int ReconnectionDelayMilliseconds = 5000;
    private const string WebSocketPath = "/ws";
    private const string SessionRegistrationMessageType = "session";
    private const string SecureWebSocketScheme = "wss";
    private const string InsecureWebSocketScheme = "ws";
    private const string SecureHttpScheme = "https";

    private readonly ILogger<AltinityWebSocketService> _logger;
    private readonly AltinitySettings _settings;
    private readonly ConcurrentDictionary<string, WebSocketConnection> _connections = new();

    public AltinityWebSocketService(
        ILogger<AltinityWebSocketService> logger,
        IOptions<AltinitySettings> settings
    )
    {
        _logger = logger;
        _settings = settings.Value;
    }

    public async Task<string> ConnectAndRegisterSessionAsync(
        string sessionId,
        Func<object, Task> onMessageReceived
    )
    {
        var wsUri = BuildWebSocketUri(_settings.AgentUrl);
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(_settings.TimeoutSeconds));
        var webSocket = await CreateAndConnectWebSocketAsync(wsUri, cts.Token);

        _logger.LogInformation(
            "Connected to Altinity WebSocket for session {SessionId}",
            sessionId
        );

        string connectionId = CreateConnectionId();
        var connection = CreateWebSocketConnection(webSocket, sessionId, onMessageReceived);

        StoreConnection(connectionId, connection);

        await RegisterSessionWithAltinityAsync(webSocket, sessionId, cts.Token);

        StartListeningForMessages(connectionId, connection);

        return connectionId;
    }

    private static string CreateConnectionId() => Guid.NewGuid().ToString();

    private void StoreConnection(string connectionId, WebSocketConnection connection)
    {
        _connections.TryAdd(connectionId, connection);
    }

    private static WebSocketConnection CreateWebSocketConnection(
        ClientWebSocket webSocket,
        string sessionId,
        Func<object, Task> onMessageReceived
    )
    {
        return new WebSocketConnection
        {
            WebSocket = webSocket,
            SessionId = sessionId,
            OnMessageReceived = onMessageReceived,
            CancellationTokenSource = new CancellationTokenSource(),
        };
    }

    private static async Task<ClientWebSocket> CreateAndConnectWebSocketAsync(
        Uri wsUri,
        CancellationToken cancellationToken
    )
    {
        var webSocket = new ClientWebSocket();
        try
        {
            await webSocket.ConnectAsync(wsUri, cancellationToken);
            return webSocket;
        }
        catch
        {
            webSocket.Abort();
            webSocket.Dispose();
            throw;
        }
    }

    private void StartListeningForMessages(string connectionId, WebSocketConnection connection)
    {
        _ = Task.Run(() => ListenForMessagesAsync(connectionId, connection));
    }

    public async Task DisconnectSessionAsync(string connectionId)
    {
        if (_connections.TryRemove(connectionId, out var connection))
        {
            connection.CancellationTokenSource.Cancel();

            if (connection.WebSocket.State == WebSocketState.Open)
            {
                connection.CancellationTokenSource.Cancel();

                if (connection.WebSocket.State == WebSocketState.Open)
                {
                    await connection.WebSocket.CloseAsync(
                        WebSocketCloseStatus.NormalClosure,
                        "Session closed",
                        CancellationToken.None
                    );
                }

                connection.WebSocket.Dispose();
                connection.CancellationTokenSource.Dispose();

                _logger.LogInformation(
                    $"Disconnected WebSocket for session {connection.SessionId}"
                );
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    $"Error disconnecting WebSocket for session {connection.SessionId}"
                );
            }

            connection.WebSocket.Dispose();
            connection.CancellationTokenSource.Dispose();

            _logger.LogInformation("Disconnected WebSocket for session {SessionId}", connection.SessionId);
        }
    }

    private async Task RegisterSessionWithAltinityAsync(
        ClientWebSocket webSocket,
        string sessionId,
        CancellationToken cancellationToken
    )
    {
        object registrationMessage = CreateSessionRegistrationMessage(sessionId);
        byte[] messageBytes = SerializeMessageToBytes(registrationMessage);

        await SendWebSocketMessageAsync(webSocket, messageBytes, cancellationToken);

        _logger.LogInformation("Registered session {SessionId} with Altinity WebSocket", sessionId);
    }

    private static object CreateSessionRegistrationMessage(string sessionId)
    {
        return new { type = SessionRegistrationMessageType, session_id = sessionId };
    }

    private static byte[] SerializeMessageToBytes(object message)
    {
        string json = JsonSerializer.Serialize(message);
        return Encoding.UTF8.GetBytes(json);
    }

    private static async Task SendWebSocketMessageAsync(
        ClientWebSocket webSocket,
        byte[] messageBytes
    )
    {
        var messageSegment = new ArraySegment<byte>(messageBytes);
        await webSocket.SendAsync(
            messageSegment,
            WebSocketMessageType.Text,
            endOfMessage: true,
            CancellationToken.None
        );
    }

    private async Task ListenForMessagesAsync(string connectionId, WebSocketConnection connection)
    {
        byte[] buffer = new byte[WebSocketBufferSize];
        var webSocket = connection.WebSocket;
        var cancellationToken = connection.CancellationTokenSource.Token;

        try
        {
            await ProcessWebSocketMessagesAsync(
                connectionId,
                connection,
                buffer,
                webSocket,
                cancellationToken
            );
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation(
                "WebSocket listener cancelled for session {SessionId}",
                connection.SessionId
            );
        }
        catch (WebSocketException ex)
        {
            _logger.LogError(
                ex,
                "{ExceptionType} in WebSocket listener for session {SessionId}",
                ex.GetType().Name,
                connection.SessionId
            );
            await HandleWebSocketErrorAsync(connectionId, connection, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Unhandled exception in WebSocket listener for session {SessionId}",
                connection.SessionId
            );
            await DisconnectSessionAsync(connectionId);
        }
    }

    private async Task ProcessWebSocketMessagesAsync(
        string connectionId,
        WebSocketConnection connection,
        byte[] buffer,
        ClientWebSocket webSocket,
        CancellationToken cancellationToken
    )
    {
        _logger.LogInformation(
            "Started listening for WebSocket messages for session {SessionId}",
            connection.SessionId
        );

        while (webSocket.State == WebSocketState.Open && !cancellationToken.IsCancellationRequested)
        {
            _logger.LogDebug(
                "Waiting for WebSocket message for session {SessionId}",
                connection.SessionId
            );

            // Accumulate fragments until we get a complete message.
            // WebSocket messages may be split across multiple frames,
            // especially for large payloads like assistant_message with file contents.
            using var messageStream = new System.IO.MemoryStream();
            WebSocketReceiveResult result;
            do
            {
                result = await webSocket.ReceiveAsync(
                    new ArraySegment<byte>(buffer),
                    cancellationToken
                );

                if (result.MessageType == WebSocketMessageType.Close)
                {
                    await HandleCloseMessageAsync(connectionId, connection);
                    return;
                }

                messageStream.Write(buffer, 0, result.Count);
            } while (!result.EndOfMessage);

            _logger.LogDebug(
                "Received complete WebSocket message ({Bytes} bytes) for session {SessionId}",
                messageStream.Length,
                connection.SessionId
            );

            if (result.MessageType == WebSocketMessageType.Text)
            {
                var messageJson = Encoding.UTF8.GetString(
                    messageStream.GetBuffer(),
                    0,
                    (int)messageStream.Length
                );
                await ProcessTextMessageAsync(connection, messageJson);
            }
        }
    }

    private async Task HandleCloseMessageAsync(string connectionId, WebSocketConnection connection)
    {
        _logger.LogInformation(
            "Altinity WebSocket closed for session {SessionId}",
            connection.SessionId
        );
        await DisconnectSessionAsync(connectionId);
    }

    private async Task ProcessTextMessageAsync(WebSocketConnection connection, string messageJson)
    {
        _logger.LogInformation(
            "Received WebSocket message for session {SessionId} ({Length} chars)",
            connection.SessionId,
            messageJson.Length
        );

        JsonElement message;
        try
        {
            var message = DeserializeMessage(messageJson);
            await connection.OnMessageReceived(message);
            _logger.LogDebug(
                "Successfully processed WebSocket message for session {SessionId}",
                connection.SessionId
            );
        }
        catch (JsonException ex)
        {
            _logger.LogError(
                ex,
                "Failed to parse WebSocket message for session {SessionId} ({Length} chars): {Preview}",
                connection.SessionId,
                messageJson.Length,
                messageJson.Length > 500 ? messageJson[..500] + "..." : messageJson
            );
        }

        await connection.OnMessageReceived(message);
    }

    private static JsonElement DeserializeMessage(string messageJson)
    {
        return JsonSerializer.Deserialize<JsonElement>(messageJson);
    }

    private async Task HandleWebSocketErrorAsync(
        string connectionId,
        WebSocketConnection connection,
        CancellationToken cancellationToken,
        Exception ex
    )
    {
        _logger.LogError(
            ex,
            "Error in WebSocket listener for session {SessionId}. WebSocket state: {State}",
            connection.SessionId,
            connection.WebSocket.State
        );

        await Task.Delay(ReconnectionDelayMilliseconds, cancellationToken);

        if (!cancellationToken.IsCancellationRequested)
        {
            _logger.LogInformation(
                "Reconnection attempt needed for session {SessionId}",
                connection.SessionId
            );
        }

        _logger.LogWarning(
            "Reconnection abandoned for session {SessionId} after {AttemptNumber} attempts",
            connection.SessionId,
            attemptNumber
        );
    }

    private async Task ReconnectWebSocketAsync(WebSocketConnection connection, CancellationToken cancellationToken)
    {
        connection.WebSocket.Dispose();

        var wsUri = BuildWebSocketUri(_settings.AgentUrl);
        var newWebSocket = await CreateAndConnectWebSocketAsync(wsUri, cancellationToken);

        connection.WebSocket = newWebSocket;

        await RegisterSessionWithAltinityAsync(newWebSocket, connection.SessionId, cancellationToken);

        _logger.LogInformation("WebSocket reconnected for session {SessionId}", connection.SessionId);
    }

    private static Uri BuildWebSocketUri(string agentUrl)
    {
        var httpUri = new Uri(agentUrl);
        string webSocketScheme = DetermineWebSocketScheme(httpUri.Scheme);
        return ConstructWebSocketUri(webSocketScheme, httpUri);
    }

    private static string DetermineWebSocketScheme(string httpScheme)
    {
        return httpScheme == SecureHttpScheme ? SecureWebSocketScheme : InsecureWebSocketScheme;
    }

    private static Uri ConstructWebSocketUri(string scheme, Uri httpUri)
    {
        var builder = new UriBuilder(httpUri) { Scheme = scheme, Port = httpUri.Port };
        builder.Path = builder.Path.TrimEnd('/') + WebSocketPath;
        return builder.Uri;
    }

    public void Dispose()
    {
        foreach (var connection in _connections.Values)
        {
            connection.CancellationTokenSource.Cancel();
            connection.WebSocket.Dispose();
            connection.CancellationTokenSource.Dispose();
        }
        _connections.Clear();
    }

    private class WebSocketConnection
    {
        public required ClientWebSocket WebSocket { get; set; }
        public required string SessionId { get; set; }
        public required Func<object, Task> OnMessageReceived { get; set; }
        public required CancellationTokenSource CancellationTokenSource { get; set; }
    }
}
