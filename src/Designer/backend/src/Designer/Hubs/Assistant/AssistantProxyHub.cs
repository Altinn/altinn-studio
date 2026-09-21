using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Helpers.Extensions;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Implementation.Assistant;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Interfaces.Assistant;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ApiKeyType = Altinn.Studio.Designer.Models.ApiKey.ApiKeyType;

namespace Altinn.Studio.Designer.Hubs.Assistant;

/// <summary>
/// SignalR Hub for proxying assistant communication with user authentication
/// </summary>
[Authorize]
public class AssistantProxyHub : Hub<IAssistantClient>
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<AssistantProxyHub> _logger;
    private readonly AssistantSettings _assistantSettings;
    private readonly ServiceRepositorySettings _serviceRepositorySettings;
    private readonly IAssistantWebSocketService _webSocketService;
    private readonly AssistantAttachmentBuffer _attachmentStore;
    private readonly IApiKeyService _apiKeyService;
    private readonly IAiAssistantAccessService _aiAssistantAccessService;
    private readonly IChatService _chatService;

    private static readonly ConcurrentDictionary<string, HashSet<string>> s_connectionToSessionIds = new();

    public AssistantProxyHub(
        IHttpContextAccessor httpContextAccessor,
        IHttpClientFactory httpClientFactory,
        ILogger<AssistantProxyHub> logger,
        IOptions<AssistantSettings> assistantSettings,
        IOptions<ServiceRepositorySettings> serviceRepositorySettings,
        IAssistantWebSocketService webSocketService,
        IAiAssistantAccessService aiAssistantAccessService,
        AssistantAttachmentBuffer attachmentStore,
        IApiKeyService apiKeyService,
        IChatService chatService
    )
    {
        _httpContextAccessor = httpContextAccessor;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _assistantSettings = assistantSettings.Value;
        _serviceRepositorySettings = serviceRepositorySettings.Value;
        _webSocketService = webSocketService;
        _aiAssistantAccessService = aiAssistantAccessService;
        _attachmentStore = attachmentStore;
        _apiKeyService = apiKeyService;
        _chatService = chatService;
    }

    public override async Task OnConnectedAsync()
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
        string connectionId = Context.ConnectionId;

        await Groups.AddToGroupAsync(connectionId, developer);

        _logger.LogInformation(
            "Assistant hub connection established for user: {Developer}, connectionId: {ConnectionId}",
            developer,
            connectionId
        );

        try
        {
            await _webSocketService.EnsureConnectedAsync(developer);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Failed to establish WebSocket to Assistant for developer {Developer}. Aborting connection.",
                developer
            );
            Context.Abort();
            return;
        }

        await base.OnConnectedAsync();
    }

    public async Task RegisterSession(string org, string app, string threadId)
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
        string connectionId = Context.ConnectionId;

        if (!Guid.TryParse(threadId, out Guid parsedThreadId))
        {
            throw new HubException("Invalid threadId format");
        }

        org.ValidPathSegment(nameof(org));
        app.ValidPathSegment(nameof(app));

        await ValidateAssistantAccessAsync(org, developer);

        var context = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);
        bool isOwner = await _chatService.ThreadBelongsToDeveloperAsync(parsedThreadId, context);
        if (!isOwner)
        {
            throw new HubException("Access denied: Developer does not own current thread.");
        }

        s_connectionToSessionIds.AddOrUpdate(
            connectionId,
            _ => new HashSet<string> { threadId },
            (_, existing) =>
            {
                lock (existing)
                {
                    existing.Add(threadId);
                }
                return existing;
            }
        );

        await _webSocketService.RegisterSessionAsync(threadId, context);

        _logger.LogInformation(
            "Registered session {SessionId} for developer {Developer} on connection {ConnectionId}",
            threadId,
            developer,
            connectionId
        );
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
        string connectionId = Context.ConnectionId;

        await Groups.RemoveFromGroupAsync(connectionId, developer);

        s_connectionToSessionIds.TryRemove(connectionId, out _);

        // Don't close the developer WS — it persists across tab reconnects.
        // It will be cleaned up by the service when the developer has no active sessions.

        _logger.LogInformation("Assistant hub disconnected for user: {Developer}", developer);

        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Proxies the start workflow request to Assistant with a short-lived Designer API key
    /// </summary>
    /// <param name="request">The workflow start request</param>
    /// <returns>Agent response</returns>
    public async Task<object> StartWorkflow(JsonElement request)
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
        string sessionId = ExtractSessionIdFromRequest(request);
        ValidateConnectionOwnsSession(sessionId);

        // Re-register session on the agents WS before starting. The editing context is
        // rebuilt from the start request, so re-verify thread ownership against it —
        // otherwise a request with a different org/app than the one registered would
        // silently desync the session's persistence context.
        string org = ExtractRequiredString(request, "org");
        string app = ExtractRequiredString(request, "app");
        org.ValidPathSegment(nameof(org));
        app.ValidPathSegment(nameof(app));

        await ValidateAssistantAccessAsync(org, developer);

        _logger.LogInformation(
            "Starting Assistant workflow for user: {Developer}, session: {SessionId}",
            developer,
            sessionId
        );

        if (!Guid.TryParse(sessionId, out Guid threadId))
        {
            throw new HubException("Invalid session_id format");
        }

        var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);
        bool isOwner = await _chatService.ThreadBelongsToDeveloperAsync(threadId, editingContext);
        if (!isOwner)
        {
            throw new HubException("Access denied: Developer does not own current thread.");
        }

        await _webSocketService.EnsureConnectedAsync(developer);
        await _webSocketService.RegisterSessionAsync(sessionId, editingContext);

        string apiKey = await CreateAssistantApiKeyAsync(developer, sessionId);

        var (enrichedWithAttachments, attachmentIds) = ResolveAttachments(request);
        var agentResponse = await ForwardRequestToAssistantAsync(enrichedWithAttachments, developer, apiKey, sessionId);

        // Remove attachments from buffer only after successful forwarding
        _attachmentStore.RemoveAll(attachmentIds);

        return agentResponse;
    }

    private (JsonElement Request, List<string> AttachmentIds) ResolveAttachments(JsonElement request)
    {
        var attachmentIds = new List<string>();

        if (
            !request.TryGetProperty("attachment_ids", out var idsElement)
            || idsElement.ValueKind != JsonValueKind.Array
        )
        {
            return (request, attachmentIds);
        }

        var attachments = new List<object>();
        foreach (var idEl in idsElement.EnumerateArray())
        {
            string? id = idEl.GetString();
            if (id == null)
            {
                continue;
            }

            if (!_attachmentStore.TryGet(id, out var stored) || stored == null)
            {
                _logger.LogWarning("Attachment {AttachmentId} not found in buffer", id);
                continue;
            }

            attachmentIds.Add(id);
            attachments.Add(
                new
                {
                    name = stored.Name,
                    mimeType = stored.MimeType,
                    size = stored.Size,
                    dataBase64 = stored.DataBase64,
                }
            );
        }

        var requestDict =
            JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(request.GetRawText())
            ?? throw new HubException("Failed to parse workflow request");

        requestDict.Remove("attachment_ids");
        if (attachments.Count > 0)
        {
            requestDict["attachments"] = JsonSerializer.SerializeToElement(attachments);
        }

        return (JsonSerializer.SerializeToElement(requestDict), attachmentIds);
    }

    private async Task<string> CreateAssistantApiKeyAsync(string developer, string sessionId)
    {
        string keyName = $"assistant-{Guid.NewGuid()}";
        DateTimeOffset expiresAt = DateTimeOffset.UtcNow.AddMinutes(20);

        var (rawKey, _) = await _apiKeyService.CreateAsync(developer, keyName, ApiKeyType.System, expiresAt);

        return rawKey;
    }

    private static string ExtractSessionIdFromRequest(JsonElement request)
    {
        return ExtractRequiredString(request, "session_id");
    }

    private static string ExtractRequiredString(JsonElement request, string propertyName)
    {
        if (!request.TryGetProperty(propertyName, out var element))
        {
            throw new HubException($"Missing {propertyName} in request");
        }

        string? value = element.GetString();
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new HubException($"{propertyName} cannot be empty");
        }

        return value;
    }

    private async Task ValidateAssistantAccessAsync(string org, string developer)
    {
        if (!await _aiAssistantAccessService.HasAccessAsync(org))
        {
            _logger.LogWarning("User {Developer} was denied assistant access for org {Org}", developer, org);
            throw new HubException("Access denied");
        }
    }

    private void ValidateConnectionOwnsSession(string sessionId)
    {
        string connectionId = Context.ConnectionId;
        bool isRegistered = false;
        if (s_connectionToSessionIds.TryGetValue(connectionId, out HashSet<string>? sessions))
        {
            lock (sessions)
            {
                isRegistered = sessions.Contains(sessionId);
            }
        }

        if (!isRegistered)
        {
            _logger.LogWarning(
                "Session {SessionId} is not registered on connection {ConnectionId}",
                sessionId,
                connectionId
            );
            throw new HubException("Access denied: Session is not registered on this connection");
        }
    }

    private async Task<JsonElement> ForwardRequestToAssistantAsync(
        JsonElement request,
        string developer,
        string apiKey,
        string sessionId
    )
    {
        var enrichedRequest = EnrichRequestWithRepoUrl(request);
        using var httpRequest = CreateAssistantHttpRequest(enrichedRequest, developer, apiKey, sessionId);
        var response = await SendRequestToAssistantAsync(httpRequest);

        return response;
    }

    /// <summary>
    /// Enriches the workflow request with the repository URL built from org and app identifiers
    /// </summary>
    /// <param name="request">The original workflow request</param>
    /// <returns>Enriched request with repo_url field</returns>
    private JsonElement EnrichRequestWithRepoUrl(JsonElement request)
    {
        if (!request.TryGetProperty("org", out var orgElement) || !request.TryGetProperty("app", out var appElement))
        {
            return request;
        }

        string? org = orgElement.GetString();
        string? app = appElement.GetString();

        org.ValidPathSegment(nameof(org));
        app.ValidPathSegment(nameof(app));

        string repoUrl = $"{_serviceRepositorySettings.RepositoryBaseURL}/{org}/{app}.git";

        var requestDict = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(request.GetRawText());
        if (requestDict == null)
        {
            throw new HubException("Failed to parse workflow request");
        }

        requestDict["repo_url"] = JsonSerializer.SerializeToElement(repoUrl);

        return JsonSerializer.SerializeToElement(requestDict);
    }

    private HttpRequestMessage CreateAssistantHttpRequest(
        JsonElement request,
        string developer,
        string apiKey,
        string sessionId
    )
    {
        var httpRequest = new HttpRequestMessage(HttpMethod.Post, $"{_assistantSettings.AgentUrl}/api/agent/start")
        {
            Content = JsonContent.Create(request),
        };

        AddUserCredentialsToRequest(httpRequest, developer, apiKey, sessionId);

        return httpRequest;
    }

    private static void AddUserCredentialsToRequest(
        HttpRequestMessage httpRequest,
        string developer,
        string apiKey,
        string sessionId
    )
    {
        httpRequest.Headers.Add("X-Api-Key", apiKey);
        httpRequest.Headers.Add("X-Developer", developer);
        httpRequest.Headers.Add("X-Session-Id", sessionId);
    }

    /// <summary>
    /// Delivers the user's answer to an in-flight permission request from the agent.
    /// The agent pauses a read-only session when the model attempts a write and
    /// waits for this response before continuing.
    /// </summary>
    public async Task<object> RespondToPermission(string sessionId, string requestId, bool granted)
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
        ValidateConnectionOwnsSession(sessionId);

        _logger.LogInformation(
            "RespondToPermission called for session {SessionId} by {Developer}: granted={Granted}",
            sessionId,
            developer,
            granted
        );

        using var httpRequest = new HttpRequestMessage(
            HttpMethod.Post,
            $"{_assistantSettings.AgentUrl}/api/agent/permission/{sessionId}"
        )
        {
            Content = new StringContent(
                JsonSerializer.Serialize(new { request_id = requestId, granted }),
                System.Text.Encoding.UTF8,
                "application/json"
            ),
        };
        httpRequest.Headers.Add("X-Developer", developer);

        return await SendRequestToAssistantAsync(httpRequest);
    }

    /// <summary>
    /// Cancels a running workflow for the given session
    /// </summary>
    public async Task<object> CancelWorkflow(string sessionId)
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
        ValidateConnectionOwnsSession(sessionId);

        _logger.LogInformation("CancelWorkflow called for session {SessionId} by {Developer}", sessionId, developer);

        // The agents service rejects cancellation without the caller's identity —
        // it verifies the caller owns the session.
        using var httpRequest = new HttpRequestMessage(
            HttpMethod.Post,
            $"{_assistantSettings.AgentUrl}/api/agent/cancel/{sessionId}"
        );
        httpRequest.Headers.Add("X-Developer", developer);
        var response = await SendRequestToAssistantAsync(httpRequest);

        _logger.LogInformation("Session {SessionId} cancelled successfully", sessionId);
        return response;
    }

    private async Task<JsonElement> SendRequestToAssistantAsync(HttpRequestMessage httpRequest)
    {
        var httpClient = _httpClientFactory.CreateClient();
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(_assistantSettings.TimeoutSeconds));
        using var response = await httpClient.SendAsync(httpRequest, cts.Token);
        string responseContent = await response.Content.ReadAsStringAsync(cts.Token);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Assistant agent returned error: {StatusCode}", response.StatusCode);
            throw new HubException($"Agent returned {response.StatusCode}: {responseContent}");
        }

        return JsonSerializer.Deserialize<JsonElement>(responseContent);
    }
}
