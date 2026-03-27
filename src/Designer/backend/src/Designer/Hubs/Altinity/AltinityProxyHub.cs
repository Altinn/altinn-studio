using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Helpers.Extensions;
using Altinn.Studio.Designer.ModelBinding.Constants;
using Altinn.Studio.Designer.Services.Implementation.Altinity;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Interfaces.Altinity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ApiKeyType = Altinn.Studio.Designer.Models.ApiKey.ApiKeyType;

namespace Altinn.Studio.Designer.Hubs.Altinity;

/// <summary>
/// SignalR Hub for proxying Altinity agent communication with user authentication
/// </summary>
[Authorize(Policy = AltinnPolicy.MustHaveAiAssistantPermission)]
public class AltinityProxyHub : Hub<IAltinityClient>
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<AltinityProxyHub> _logger;
    private readonly AltinitySettings _altinitySettings;
    private readonly ServiceRepositorySettings _serviceRepositorySettings;
    private readonly IAltinityWebSocketService _webSocketService;
    private readonly AltinityAttachmentBuffer _attachmentStore;
    private readonly IApiKeyService _apiKeyService;
    private readonly IUserOrganizationService _userOrganizationService;

    private static readonly ConcurrentDictionary<string, string> s_sessionIdToDeveloper = new();

    private static readonly ConcurrentDictionary<string, string> s_signalRConnectionToSessionId = new();

    public AltinityProxyHub(
        IHttpContextAccessor httpContextAccessor,
        IHttpClientFactory httpClientFactory,
        ILogger<AltinityProxyHub> logger,
        IOptions<AltinitySettings> altinitySettings,
        IOptions<ServiceRepositorySettings> serviceRepositorySettings,
        IAltinityWebSocketService webSocketService,
        IUserOrganizationService userOrganizationService,
        AltinityAttachmentBuffer attachmentStore,
        IApiKeyService apiKeyService
    )
    {
        _httpContextAccessor = httpContextAccessor;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _altinitySettings = altinitySettings.Value;
        _serviceRepositorySettings = serviceRepositorySettings.Value;
        _webSocketService = webSocketService;
        _userOrganizationService = userOrganizationService;
        _attachmentStore = attachmentStore;
        _apiKeyService = apiKeyService;
    }

    public override async Task OnConnectedAsync()
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
        string connectionId = Context.ConnectionId;

        await Groups.AddToGroupAsync(connectionId, developer);

        string sessionId = Guid.NewGuid().ToString();

        _logger.LogInformation(
            "Altinity hub connection established for user: {Developer}, connectionId: {ConnectionId}, sessionId: {SessionId}",
            developer,
            connectionId,
            sessionId
        );

        try
        {
            await _webSocketService.EnsureConnectedAsync(developer);
            await _webSocketService.RegisterSessionAsync(developer, sessionId);

            s_sessionIdToDeveloper.TryAdd(sessionId, developer);
            s_signalRConnectionToSessionId.TryAdd(connectionId, sessionId);

            _logger.LogInformation(
                "Registered session {SessionId} on agents WS for developer {Developer}",
                sessionId,
                developer
            );

            await Clients.Caller.SessionCreated(sessionId);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Failed to establish WebSocket to Altinity for session {SessionId}. Aborting connection.",
                sessionId
            );
            Context.Abort();
            return;
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
        string connectionId = Context.ConnectionId;

        await Groups.RemoveFromGroupAsync(connectionId, developer);

        if (s_signalRConnectionToSessionId.TryRemove(connectionId, out string? sessionId))
        {
            s_sessionIdToDeveloper.TryRemove(sessionId, out _);
        }

        // Don't close the developer WS — it persists across tab reconnects.
        // It will be cleaned up by the service when the developer has no active sessions.

        _logger.LogInformation("Altinity hub disconnected for user: {Developer}", developer);

        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Proxies the start workflow request to Altinity agent with a short-lived Designer API key
    /// </summary>
    /// <param name="request">The workflow start request</param>
    /// <returns>Agent response</returns>
    public async Task<object> StartWorkflow(JsonElement request)
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
        string sessionId = ExtractSessionIdFromRequest(request);
        ValidateSessionOwnership(sessionId, developer);
        await ValidateOrgMembershipAsync(request, developer);

        _logger.LogInformation(
            "Starting Altinity workflow for user: {Developer}, session: {SessionId}",
            developer,
            sessionId
        );

        // Re-register session on the agents WS before starting
        await _webSocketService.EnsureConnectedAsync(developer);
        await _webSocketService.RegisterSessionAsync(developer, sessionId);

        string apiKey = await CreateAltinityApiKeyAsync(developer, sessionId);

        var (enrichedWithAttachments, attachmentIds) = ResolveAttachments(request);
        var agentResponse = await ForwardRequestToAltinityAgentAsync(
            enrichedWithAttachments,
            developer,
            apiKey,
            sessionId
        );

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

    private async Task<string> CreateAltinityApiKeyAsync(string developer, string sessionId)
    {
        string keyName = $"altinity-{Guid.NewGuid()}";
        DateTimeOffset expiresAt = DateTimeOffset.UtcNow.AddMinutes(20);

        var (rawKey, _) = await _apiKeyService.CreateAsync(developer, keyName, ApiKeyType.System, expiresAt);

        return rawKey;
    }

    private static string ExtractSessionIdFromRequest(JsonElement request)
    {
        if (!request.TryGetProperty("session_id", out var sessionIdElement))
        {
            throw new HubException("Missing session_id in request");
        }

        string? sessionId = sessionIdElement.GetString();
        if (string.IsNullOrWhiteSpace(sessionId))
        {
            throw new HubException("session_id cannot be empty");
        }

        return sessionId;
    }

    private async Task ValidateOrgMembershipAsync(JsonElement request, string developer)
    {
        string? org = request.TryGetProperty("org", out var orgElement) ? orgElement.GetString() : null;

        if (string.IsNullOrWhiteSpace(org))
        {
            throw new HubException("Missing org in request");
        }

        if (!await _userOrganizationService.UserIsMemberOfOrganization(org))
        {
            _logger.LogWarning("User {Developer} was denied access to start workflow for org {Org}", developer, org);
            throw new HubException("Access denied");
        }
    }

    private void ValidateSessionOwnership(string sessionId, string developer)
    {
        if (!s_sessionIdToDeveloper.TryGetValue(sessionId, out string? sessionOwner))
        {
            _logger.LogWarning(
                "User {Developer} attempted to use non-existent session {SessionId}",
                developer,
                sessionId
            );
            throw new HubException("Invalid session: Session does not exist");
        }

        if (sessionOwner != developer)
        {
            _logger.LogWarning(
                "User {Developer} attempted to access session {SessionId} owned by {SessionOwner}",
                developer,
                sessionId,
                sessionOwner
            );
            throw new HubException("Access denied: You don't own this session");
        }
    }

    private async Task<JsonElement> ForwardRequestToAltinityAgentAsync(
        JsonElement request,
        string developer,
        string apiKey,
        string sessionId
    )
    {
        var enrichedRequest = EnrichRequestWithRepoUrl(request);
        var httpRequest = CreateAltinityHttpRequest(enrichedRequest, developer, apiKey, sessionId);
        var response = await SendRequestToAltinityAsync(httpRequest);

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

    private HttpRequestMessage CreateAltinityHttpRequest(
        JsonElement request,
        string developer,
        string apiKey,
        string sessionId
    )
    {
        var httpRequest = new HttpRequestMessage(HttpMethod.Post, $"{_altinitySettings.AgentUrl}/api/agent/start")
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
    /// Cancels a running workflow for the given session
    /// </summary>
    public async Task<object> CancelWorkflow(string sessionId)
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
        ValidateSessionOwnership(sessionId, developer);

        _logger.LogInformation("CancelWorkflow called for session {SessionId} by {Developer}", sessionId, developer);

        var httpClient = _httpClientFactory.CreateClient();
        var response = await httpClient.PostAsync($"{_altinitySettings.AgentUrl}/api/agent/cancel/{sessionId}", null);
        var responseContent = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError(
                "Cancel request failed for session {SessionId}: {StatusCode}",
                sessionId,
                response.StatusCode
            );
            throw new HubException($"Cancel failed: {responseContent}");
        }

        _logger.LogInformation("Session {SessionId} cancelled successfully", sessionId);
        return JsonSerializer.Deserialize<JsonElement>(responseContent);
    }

    private async Task<JsonElement> SendRequestToAltinityAsync(HttpRequestMessage httpRequest)
    {
        var httpClient = _httpClientFactory.CreateClient();
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(_altinitySettings.TimeoutSeconds));
        var response = await httpClient.SendAsync(httpRequest, cts.Token);
        string responseContent = await response.Content.ReadAsStringAsync(cts.Token);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Altinity agent returned error: {StatusCode}", response.StatusCode);
            throw new HubException($"Agent returned {response.StatusCode}: {responseContent}");
        }

        return JsonSerializer.Deserialize<JsonElement>(responseContent);
    }
}
