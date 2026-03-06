using System;
using System.Collections.Concurrent;
using System.IO;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Hubs.Altinity;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Designer.Services.Altinity;

/// <summary>
/// Manages one persistent WebSocket connection per developer to the Altinity agents service.
/// The connection outlives individual SignalR connections so that in-flight workflows
/// continue streaming events even after a page refresh or tab switch.
/// Messages are forwarded directly to the developer's SignalR group via IHubContext.
/// </summary>
public class AltinityWebSocketService : IAltinityWebSocketService, IDisposable
{
    private const int WebSocketBufferSize = 1024 * 1024;
    private const string WebSocketPath = "/ws";
    private const string SecureWebSocketScheme = "wss";
    private const string InsecureWebSocketScheme = "ws";
    private const string SecureHttpScheme = "https";

    private readonly ILogger<AltinityWebSocketService> _logger;
    private readonly AltinitySettings _settings;
    private readonly IHubContext<AltinityProxyHub, IAltinityClient> _hubContext;

    private readonly ConcurrentDictionary<string, DeveloperConnection> _connections = new();
    private readonly ConcurrentDictionary<string, SemaphoreSlim> _connectLocks = new();

    public AltinityWebSocketService(
        ILogger<AltinityWebSocketService> logger,
        IOptions<AltinitySettings> settings,
        IHubContext<AltinityProxyHub, IAltinityClient> hubContext
    )
    {
        _logger = logger;
        _settings = settings.Value;
        _hubContext = hubContext;
    }

    public async Task EnsureConnectedAsync(string developer)
    {
        if (_connections.TryGetValue(developer, out var existing) && existing.IsAlive)
        {
            _logger.LogInformation("Reusing existing agents WebSocket for developer {Developer}", developer);
            return;
        }

        var sem = _connectLocks.GetOrAdd(developer, _ => new SemaphoreSlim(1, 1));
        await sem.WaitAsync();
        try
        {
            if (_connections.TryGetValue(developer, out var existing2) && existing2.IsAlive)
            {
                _logger.LogInformation(
                    "Reusing existing agents WebSocket for developer {Developer} (after lock)",
                    developer
                );
                return;
            }

            var wsUri = BuildWebSocketUri(_settings.AgentUrl);
            var webSocket = new ClientWebSocket();
            await webSocket.ConnectAsync(wsUri, CancellationToken.None);

            _logger.LogInformation("Opened new agents WebSocket for developer {Developer}", developer);

            var connection = new DeveloperConnection(developer, webSocket);
            _connections[developer] = connection;

            _ = Task.Run(() => ListenForMessagesAsync(developer, connection));
        }
        finally
        {
            sem.Release();
        }
    }

    public async Task RegisterSessionAsync(string developer, string sessionId)
    {
        if (!_connections.TryGetValue(developer, out var connection) || !connection.IsAlive)
        {
            throw new InvalidOperationException(
                $"No live agents WebSocket for developer {developer}. Call EnsureConnectedAsync first."
            );
        }

        var frame = JsonSerializer.SerializeToUtf8Bytes(
            new
            {
                type = "session",
                session_id = sessionId,
                developer,
            }
        );
        await connection.WebSocket.SendAsync(
            new ArraySegment<byte>(frame),
            WebSocketMessageType.Text,
            endOfMessage: true,
            CancellationToken.None
        );

        _logger.LogInformation("Registered session {SessionId} for developer {Developer}", sessionId, developer);
    }

    public async Task CloseConnectionAsync(string developer)
    {
        if (_connections.TryRemove(developer, out var connection))
        {
            await CloseWebSocketAsync(connection);
        }
    }

    public bool IsConnected(string developer) =>
        _connections.TryGetValue(developer, out var connection) && connection.IsAlive;

    private async Task ListenForMessagesAsync(string developer, DeveloperConnection connection)
    {
        var buffer = new byte[WebSocketBufferSize];
        var webSocket = connection.WebSocket;
        var cancellationToken = connection.CancellationToken;

        _logger.LogInformation("Started listening for agents messages for developer {Developer}", developer);

        try
        {
            while (webSocket.State == WebSocketState.Open && !cancellationToken.IsCancellationRequested)
            {
                using var messageStream = new MemoryStream();
                WebSocketReceiveResult result;

                do
                {
                    result = await webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), cancellationToken);

                    if (result.MessageType == WebSocketMessageType.Close)
                    {
                        _logger.LogInformation(
                            "Agents WebSocket closed by remote for developer {Developer}",
                            developer
                        );
                        _connections.TryRemove(developer, out _);
                        return;
                    }

                    messageStream.Write(buffer, 0, result.Count);
                } while (!result.EndOfMessage);

                if (result.MessageType != WebSocketMessageType.Text)
                {
                    continue;
                }

                var json = Encoding.UTF8.GetString(messageStream.GetBuffer(), 0, (int)messageStream.Length);

                if (IsInternalHandshakeMessage(json))
                {
                    continue;
                }

                _logger.LogInformation(
                    "Received agents message for developer {Developer} ({Length} chars)",
                    developer,
                    json.Length
                );

                try
                {
                    var message = JsonSerializer.Deserialize<JsonElement>(json);
                    await _hubContext.Clients.Group(developer).ReceiveAgentMessage(message);
                }
                catch (Exception ex)
                {
                    _logger.LogError(
                        ex,
                        "Failed to forward agents message to group {Developer}: {Preview}",
                        developer,
                        json.Length > 200 ? json[..200] + "..." : json
                    );
                }
            }
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("Agents WebSocket listener cancelled for developer {Developer}", developer);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Agents WebSocket listener error for developer {Developer}", developer);
            _connections.TryRemove(developer, out _);
        }
    }

    private static bool IsInternalHandshakeMessage(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (!doc.RootElement.TryGetProperty("type", out var typeEl))
            {
                return false;
            }

            var type = typeEl.GetString();
            return type is "connection" or "session";
        }
        catch
        {
            return false;
        }
    }

    private Uri BuildWebSocketUri(string agentUrl)
    {
        var httpUri = new Uri(agentUrl);
        var scheme = httpUri.Scheme == SecureHttpScheme ? SecureWebSocketScheme : InsecureWebSocketScheme;
        return new Uri($"{scheme}://{httpUri.Host}:{httpUri.Port}{WebSocketPath}");
    }

    private async Task CloseWebSocketAsync(DeveloperConnection connection)
    {
        try
        {
            connection.Cancel();

            if (connection.WebSocket.State == WebSocketState.Open)
            {
                await connection.WebSocket.CloseAsync(
                    WebSocketCloseStatus.NormalClosure,
                    "Connection closed",
                    CancellationToken.None
                );
            }

            connection.WebSocket.Dispose();
            _logger.LogInformation("Closed agents WebSocket for developer {Developer}", connection.Developer);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error closing agents WebSocket for developer {Developer}", connection.Developer);
        }
    }

    public void Dispose()
    {
        foreach (var connection in _connections.Values)
        {
            try
            {
                connection.Cancel();
                connection.WebSocket.Dispose();
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error disposing agents WebSocket for developer {Developer}",
                    connection.Developer
                );
            }
        }

        _connections.Clear();
    }

    private sealed class DeveloperConnection
    {
        private readonly CancellationTokenSource _cts = new();

        public DeveloperConnection(string developer, ClientWebSocket webSocket)
        {
            Developer = developer;
            WebSocket = webSocket;
        }

        public string Developer { get; }
        public ClientWebSocket WebSocket { get; }
        public CancellationToken CancellationToken => _cts.Token;

        public bool IsAlive => WebSocket.State == WebSocketState.Open;

        public void Cancel() => _cts.Cancel();
    }
}
