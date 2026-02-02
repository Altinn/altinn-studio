using System;
using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Designer.Services.Altinity;

/// <summary>
/// Service for managing WebSocket connections to Altinity agent
/// </summary>
public class AltinityWebSocketService : IAltinityWebSocketService, IDisposable
{
    private const int WebSocketBufferSize = 4096;
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
        IOptions<AltinitySettings> settings)
    {
        _logger = logger;
        _settings = settings.Value;
    }

    public async Task<string> ConnectAndRegisterSessionAsync(string sessionId, Func<object, Task> onMessageReceived)
    {
        var wsUri = BuildWebSocketUri(_settings.AgentUrl);
        var webSocket = await CreateAndConnectWebSocketAsync(wsUri);

        _logger.LogInformation("Connected to Altinity WebSocket for session {SessionId}", sessionId);

        var connectionId = CreateConnectionId();
        var connection = CreateWebSocketConnection(webSocket, sessionId, onMessageReceived);

        StoreConnection(connectionId, connection);

        await RegisterSessionWithAltinityAsync(webSocket, sessionId);

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
        Func<object, Task> onMessageReceived)
    {
        return new WebSocketConnection
        {
            WebSocket = webSocket,
            SessionId = sessionId,
            OnMessageReceived = onMessageReceived,
            CancellationTokenSource = new CancellationTokenSource()
        };
    }

    private async Task<ClientWebSocket> CreateAndConnectWebSocketAsync(Uri wsUri)
    {
        var webSocket = new ClientWebSocket();
        await webSocket.ConnectAsync(wsUri, CancellationToken.None);
        return webSocket;
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
                await connection.WebSocket.CloseAsync(
                    WebSocketCloseStatus.NormalClosure,
                    "Session closed",
                    CancellationToken.None);
            }

            connection.WebSocket.Dispose();
            connection.CancellationTokenSource.Dispose();

            _logger.LogInformation("Disconnected WebSocket for session {SessionId}", connection.SessionId);
        }
    }

    private async Task RegisterSessionWithAltinityAsync(ClientWebSocket webSocket, string sessionId)
    {
        var registrationMessage = CreateSessionRegistrationMessage(sessionId);
        var messageBytes = SerializeMessageToBytes(registrationMessage);

        await SendWebSocketMessageAsync(webSocket, messageBytes);

        _logger.LogInformation("Registered session {SessionId} with Altinity WebSocket", sessionId);
    }

    private static object CreateSessionRegistrationMessage(string sessionId)
    {
        return new
        {
            type = SessionRegistrationMessageType,
            session_id = sessionId
        };
    }

    private static byte[] SerializeMessageToBytes(object message)
    {
        var json = JsonSerializer.Serialize(message);
        return Encoding.UTF8.GetBytes(json);
    }

    private static async Task SendWebSocketMessageAsync(ClientWebSocket webSocket, byte[] messageBytes)
    {
        var messageSegment = new ArraySegment<byte>(messageBytes);
        await webSocket.SendAsync(messageSegment, WebSocketMessageType.Text, endOfMessage: true, CancellationToken.None);
    }

    private async Task ListenForMessagesAsync(string connectionId, WebSocketConnection connection)
    {
        var buffer = new byte[WebSocketBufferSize];
        var webSocket = connection.WebSocket;
        var cancellationToken = connection.CancellationTokenSource.Token;

        try
        {
            await ProcessWebSocketMessagesAsync(connectionId, connection, buffer, webSocket, cancellationToken);
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("WebSocket listener cancelled for session {SessionId}", connection.SessionId);
        }
        catch (WebSocketException ex)
        {
            await HandleWebSocketErrorAsync(connection, cancellationToken, ex);
        }
    }

    private async Task ProcessWebSocketMessagesAsync(
        string connectionId,
        WebSocketConnection connection,
        byte[] buffer,
        ClientWebSocket webSocket,
        CancellationToken cancellationToken)
    {
        while (webSocket.State == WebSocketState.Open && !cancellationToken.IsCancellationRequested)
        {
            var result = await webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), cancellationToken);

            if (result.MessageType == WebSocketMessageType.Close)
            {
                await HandleCloseMessageAsync(connectionId, connection);
                break;
            }

            if (result.MessageType == WebSocketMessageType.Text)
            {
                await ProcessTextMessageAsync(connection, buffer, result);
            }
        }
    }

    private async Task HandleCloseMessageAsync(string connectionId, WebSocketConnection connection)
    {
        _logger.LogInformation("Altinity WebSocket closed for session {SessionId}", connection.SessionId);
        await DisconnectSessionAsync(connectionId);
    }

    private async Task ProcessTextMessageAsync(
        WebSocketConnection connection,
        byte[] buffer,
        WebSocketReceiveResult result)
    {
        var messageJson = Encoding.UTF8.GetString(buffer, 0, result.Count);

        JsonElement message;
        try
        {
            message = DeserializeMessage(messageJson);
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Invalid JSON in WebSocket message: {MessageJson}", messageJson);
            return;
        }

        await connection.OnMessageReceived(message);
    }

    private static JsonElement DeserializeMessage(string messageJson)
    {
        return JsonSerializer.Deserialize<JsonElement>(messageJson);
    }

    private async Task HandleWebSocketErrorAsync(
        WebSocketConnection connection,
        CancellationToken cancellationToken,
        Exception ex)
    {
        _logger.LogError(ex, "{ExceptionType} in WebSocket listener for session {SessionId}", ex.GetType().Name, connection.SessionId);

        await Task.Delay(ReconnectionDelayMilliseconds, cancellationToken);

        if (!cancellationToken.IsCancellationRequested)
        {
            _logger.LogInformation("Reconnection attempt needed for session {SessionId}", connection.SessionId);
        }
    }

    private Uri BuildWebSocketUri(string agentUrl)
    {
        var httpUri = new Uri(agentUrl);
        var webSocketScheme = DetermineWebSocketScheme(httpUri.Scheme);
        return ConstructWebSocketUri(webSocketScheme, httpUri);
    }

    private static string DetermineWebSocketScheme(string httpScheme)
    {
        return httpScheme == SecureHttpScheme ? SecureWebSocketScheme : InsecureWebSocketScheme;
    }

    private static Uri ConstructWebSocketUri(string scheme, Uri httpUri)
    {
        var builder = new UriBuilder(httpUri)
        {
            Scheme = scheme,
            Port = httpUri.Port
        };
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
