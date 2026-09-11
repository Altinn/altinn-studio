using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Hubs.Altinity;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Interfaces.Altinity;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Designer.Services.Implementation.Altinity;

/// <summary>
/// Manages one persistent WebSocket connection per developer to the Altinity agents service.
/// The connection outlives individual SignalR connections so that in-flight workflows
/// continue streaming events even after a page refresh or tab switch.
/// Messages are forwarded directly to the developer's SignalR group via IHubContext.
/// <para>
/// Every replica sees every event, so persistence is deduplicated on the agent's event id.
/// </para>
/// </summary>
public class AltinityWebSocketService : IAltinityWebSocketService, IDisposable
{
    private const int WebSocketBufferSize = 1024 * 1024;
    private const string WebSocketPath = "/ws";
    private const string SecureWebSocketScheme = "wss";
    private const string InsecureWebSocketScheme = "ws";
    private const string SecureHttpScheme = "https";

    private static readonly JsonSerializerOptions s_persistSerializerOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private readonly ILogger<AltinityWebSocketService> _logger;
    private readonly AltinitySettings _settings;
    private readonly IHubContext<AltinityProxyHub, IAltinityClient> _hubContext;
    private readonly IServiceScopeFactory _scopeFactory;

    private readonly ConcurrentDictionary<string, DeveloperConnection> _connections = new();
    private readonly ConcurrentDictionary<string, SemaphoreSlim> _connectLocks = new();

    // sessionId (== chat thread id) → the editing context it was registered
    // under. Lets the listener persist assistant messages into the right
    // app's thread without any browser tab involved.
    private readonly ConcurrentDictionary<string, AltinnRepoEditingContext> _sessionContexts = new();

    public AltinityWebSocketService(
        ILogger<AltinityWebSocketService> logger,
        IOptions<AltinitySettings> settings,
        IHubContext<AltinityProxyHub, IAltinityClient> hubContext,
        IServiceScopeFactory scopeFactory
    )
    {
        _logger = logger;
        _settings = settings.Value;
        _hubContext = hubContext;
        _scopeFactory = scopeFactory;
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

    public async Task RegisterSessionAsync(string sessionId, AltinnRepoEditingContext editingContext)
    {
        string developer = editingContext.Developer;
        if (!_connections.TryGetValue(developer, out var connection) || !connection.IsAlive)
        {
            throw new InvalidOperationException(
                $"No live agents WebSocket for developer {developer}. Call EnsureConnectedAsync first."
            );
        }

        TrackSessionContext(sessionId, editingContext);

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
            RemoveSessionContextsForDeveloper(developer);
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
                        RemoveConnection(developer, connection);
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
                    JsonNode? messageNode = JsonNode.Parse(json);
                    if (messageNode is null)
                    {
                        continue;
                    }

                    await TryPersistAssistantMessageAsync(messageNode);

                    var message = JsonSerializer.SerializeToElement(messageNode);
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
            RemoveConnection(developer, connection);
        }
    }

    /// <summary>
    /// Removes the developer's connection entry only if it still refers to
    /// <paramref name="connection"/>. A reconnect may already have replaced the entry,
    /// and blindly removing by key would orphan the replacement while its listener keeps
    /// running — every agent event would then be delivered (and persisted) twice.
    /// </summary>
    private void RemoveConnection(string developer, DeveloperConnection connection)
    {
        if (_connections.TryRemove(new KeyValuePair<string, DeveloperConnection>(developer, connection)))
        {
            RemoveSessionContextsForDeveloper(developer);
        }
    }

    /// <summary>
    /// Drops the session→editing-context entries for a developer whose agents connection
    /// closed. Events for those sessions can no longer arrive, and without eviction the
    /// map would grow for the lifetime of the process. Re-registration on the next
    /// connection restores the entries.
    /// </summary>
    internal void RemoveSessionContextsForDeveloper(string developer)
    {
        foreach (var entry in _sessionContexts)
        {
            if (entry.Value.Developer == developer)
            {
                _sessionContexts.TryRemove(entry);
            }
        }
    }

    internal void TrackSessionContext(string sessionId, AltinnRepoEditingContext editingContext)
    {
        _sessionContexts[sessionId] = editingContext;
    }

    /// <summary>
    /// Persists a final assistant message server-side so the answer survives
    /// regardless of how many browser tabs (including zero) are listening, and
    /// stamps the persisted id onto the event so clients render it without
    /// persisting their own copy — which duplicated messages when several tabs
    /// received the same broadcast. Any failure is logged and the event is
    /// forwarded unenriched; the frontend then falls back to persisting
    /// client-side, so an answer is never lost to a persistence error.
    /// </summary>
    internal async Task TryPersistAssistantMessageAsync(JsonNode message)
    {
        try
        {
            if (message["type"]?.GetValue<string>() != "assistant_message")
            {
                return;
            }

            string? sessionId = message["session_id"]?.GetValue<string>();
            if (sessionId is null || !Guid.TryParse(sessionId, out Guid threadId))
            {
                return;
            }

            if (!_sessionContexts.TryGetValue(sessionId, out AltinnRepoEditingContext? editingContext))
            {
                _logger.LogWarning(
                    "No editing context registered for session {SessionId}; leaving persistence to the client",
                    sessionId
                );
                return;
            }

            JsonNode? data = message["data"];

            // Same field fallback order as the frontend's getAssistantMessageContent.
            string? content =
                data?["response"]?.GetValue<string>()
                ?? data?["message"]?.GetValue<string>()
                ?? data?["content"]?.GetValue<string>();
            if (string.IsNullOrWhiteSpace(content))
            {
                return;
            }

            List<string>? filesChanged = data!["filesChanged"]?.Deserialize<List<string>>();
            List<ChatSourceEntity>? sources = data["sources"]
                ?.Deserialize<List<ChatSourceEntity>>(s_persistSerializerOptions);
            string? traceId = data["traceId"]?.GetValue<string>();
            string? eventId = data["eventId"]?.GetValue<string>();
            bool? attachmentInstructionFlagged = data["attachmentInstructionFlagged"]?.GetValue<bool>();

            var request = new CreateChatMessageRequest(
                Role.Assistant,
                content,
                AllowAppChanges: null,
                AttachmentFileNames: null,
                FilesChanged: filesChanged,
                Sources: sources,
                AttachmentInstructionFlagged: attachmentInstructionFlagged,
                TraceId: traceId,
                EventId: eventId
            );

            using var scope = _scopeFactory.CreateScope();
            var chatService = scope.ServiceProvider.GetRequiredService<IChatService>();
            ChatMessageEntity? created = await chatService.CreateMessageAsync(threadId, request, editingContext);
            if (created is null)
            {
                _logger.LogWarning(
                    "Server-side persist skipped for session {SessionId}: thread not found or not owned by {Developer}",
                    sessionId,
                    editingContext.Developer
                );
                return;
            }

            data["persistedMessageId"] = created.Id.ToString();
            _logger.LogInformation(
                "Persisted assistant message {MessageId} for session {SessionId}",
                created.Id,
                sessionId
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to persist assistant message server-side; forwarding unenriched");
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
