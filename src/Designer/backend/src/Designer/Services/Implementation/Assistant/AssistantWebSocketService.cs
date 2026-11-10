using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Hubs.Assistant;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Interfaces.Assistant;
using Altinn.Studio.Designer.Telemetry;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Designer.Services.Implementation.Assistant;

/// <summary>
/// Manages one persistent WebSocket connection per developer to the Assistant service.
/// The connection outlives individual SignalR connections so that in-flight workflows
/// continue streaming events even after a page refresh or tab switch.
/// Messages are forwarded directly to the developer's SignalR group via IHubContext.
/// <para>
/// The assistant service sends the events of a developer to each replica that has a connection for
/// that developer. Each replica saves the answers. The database keeps one message for each event id.
/// </para>
/// </summary>
public class AssistantWebSocketService : IAssistantWebSocketService, IDisposable
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

    private readonly ILogger<AssistantWebSocketService> _logger;
    private readonly AssistantSettings _settings;
    private readonly IHubContext<AssistantProxyHub, IAssistantClient> _hubContext;
    private readonly IServiceScopeFactory _scopeFactory;

    private readonly ConcurrentDictionary<string, DeveloperConnection> _connections = new();
    private readonly ConcurrentDictionary<string, SemaphoreSlim> _connectLocks = new();

    public AssistantWebSocketService(
        ILogger<AssistantWebSocketService> logger,
        IOptions<AssistantSettings> settings,
        IHubContext<AssistantProxyHub, IAssistantClient> hubContext,
        IServiceScopeFactory scopeFactory
    )
    {
        _logger = logger;
        _settings = settings.Value;
        _hubContext = hubContext;
        _scopeFactory = scopeFactory;
    }

    public Task EnsureConnectedAsync(string developer) => GetOrConnectAsync(developer);

    public async Task RegisterSessionAsync(string sessionId, string developer)
    {
        // The agent's WebSocket can close while the developer's SignalR connection stays open, such as when
        // the assistant service restarts.
        DeveloperConnection connection = await GetOrConnectAsync(developer);

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

    private async Task<DeveloperConnection> GetOrConnectAsync(string developer)
    {
        if (_connections.TryGetValue(developer, out var existing) && existing.IsAlive)
        {
            _logger.LogInformation("Reusing existing agents WebSocket for developer {Developer}", developer);
            return existing;
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
                return existing2;
            }

            var wsUri = BuildWebSocketUri(_settings.AgentUrl);
            var webSocket = new ClientWebSocket();
            await webSocket.ConnectAsync(wsUri, CancellationToken.None);

            _logger.LogInformation("Opened new agents WebSocket for developer {Developer}", developer);

            var connection = new DeveloperConnection(developer, webSocket);
            _connections[developer] = connection;

            // The listener runs for as long as the agent's WebSocket is open, so it starts without the caller's
            // trace. Each message it forwards is a root span of its own.
            _ = Task.Run(() =>
            {
                Activity.Current = null;
                return ListenForMessagesAsync(developer, connection);
            });

            return connection;
        }
        finally
        {
            sem.Release();
        }
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

                using Activity? span = ServiceTelemetry.Source.StartActivity(
                    $"{nameof(AssistantWebSocketService)}.ForwardMessage",
                    ActivityKind.Consumer
                );
                span.SetEndUser(developer);
                try
                {
                    JsonNode? messageNode = JsonNode.Parse(json);
                    if (messageNode is null)
                    {
                        continue;
                    }

                    await TryPersistAssistantMessageAsync(developer, messageNode);

                    var message = JsonSerializer.SerializeToElement(messageNode);
                    await _hubContext.Clients.Group(developer).ReceiveAgentMessage(message);
                }
                catch (Exception ex)
                {
                    span?.SetTag(ServiceTelemetry.Attributes.ErrorType, ex.GetType().FullName);
                    span?.SetStatus(ActivityStatusCode.Error);
                    _logger.LogError(
                        ex,
                        "Failed to forward agents message of {MessageLength} characters to group {Developer}",
                        json.Length,
                        developer
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
        _connections.TryRemove(new KeyValuePair<string, DeveloperConnection>(developer, connection));
    }

    /// <summary>
    /// Saves an assistant answer in the developer's thread and adds the id of the saved message to the
    /// event. The save needs only the thread id and the developer, so any replica can save the answer.
    /// If the save fails, this method logs the error, and the listener forwards the event without the id.
    /// </summary>
    internal async Task TryPersistAssistantMessageAsync(string developer, JsonNode message)
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

            if (message["data"] is not JsonObject data)
            {
                return;
            }

            // The answer is in the first of these fields that is set.
            string? content =
                ReadOptional(data, "response", AsString)
                ?? ReadOptional(data, "message", AsString)
                ?? ReadOptional(data, "content", AsString);
            if (string.IsNullOrWhiteSpace(content))
            {
                return;
            }

            List<string>? filesChanged = ReadOptional(data, "filesChanged", node => node.Deserialize<List<string>>());
            List<ChatSourceEntity>? sources = ReadOptional(
                data,
                "sources",
                node => node.Deserialize<List<ChatSourceEntity>>(s_persistSerializerOptions)
            );
            string? traceId = ReadOptional(data, "traceId", AsString);
            bool? attachmentInstructionFlagged = ReadOptional<bool?>(
                data,
                "attachmentInstructionFlagged",
                node => node.GetValue<bool>()
            );
            // The assistant service stamps an event id on each answer, so each replica saves it under the same id.
            string? eventId = ReadOptional(data, "eventId", AsString);

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
            ChatMessageEntity? created = await chatService.CreateMessageInDeveloperThreadAsync(
                threadId,
                developer,
                request
            );
            if (created is null)
            {
                _logger.LogWarning(
                    "Did not save the assistant message for session {SessionId}: {Developer} has no thread with this id",
                    sessionId,
                    developer
                );
                return;
            }

            // A browser tab that still runs an older version of Designer saves its own copy of the answer
            // when the event has no persistedMessageId.
            data["persistedMessageId"] = created.Id.ToString();
            _logger.LogInformation(
                "Persisted assistant message {MessageId} for session {SessionId}",
                created.Id,
                sessionId
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to save the assistant message; forwarding it without the message id");
        }
    }

    private static string? AsString(JsonNode node) => node.GetValue<string>();

    /// <summary>
    /// Reads a field that the save can do without. A value of an unexpected type costs that field, not the answer.
    /// </summary>
    private T? ReadOptional<T>(JsonObject data, string field, Func<JsonNode, T?> read)
    {
        try
        {
            JsonNode? node = data[field];
            return node is null ? default : read(node);
        }
        catch (Exception ex) when (ex is JsonException or InvalidOperationException or FormatException)
        {
            _logger.LogWarning(
                ex,
                "Ignored the field {Field} of an assistant message, because its value has an unexpected type",
                field
            );
            return default;
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
