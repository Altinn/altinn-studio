using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Json;
using System.Net.WebSockets;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Helpers.Extensions;
using Altinn.Studio.Designer.ModelBinding.Constants;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

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
    private readonly IHubContext<AltinityProxyHub, IAltinityClient> _hubContext;

    private static readonly ConcurrentDictionary<string, string> s_sessionIdToDeveloper = new();

    private static readonly ConcurrentDictionary<string, string> s_signalRConnectionToWebSocket = new();

    private static readonly ConcurrentDictionary<string, string> s_signalRConnectionToSessionId = new();

    public AltinityProxyHub(
        IHttpContextAccessor httpContextAccessor,
        IHttpClientFactory httpClientFactory,
        ILogger<AltinityProxyHub> logger,
        IOptions<AltinitySettings> altinitySettings,
        IOptions<ServiceRepositorySettings> serviceRepositorySettings,
        IAltinityWebSocketService webSocketService,
        IHubContext<AltinityProxyHub, IAltinityClient> hubContext
    )
    {
        _httpContextAccessor = httpContextAccessor;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _altinitySettings = altinitySettings.Value;
        _serviceRepositorySettings = serviceRepositorySettings.Value;
        _webSocketService = webSocketService;
        _hubContext = hubContext;
    }

    public override async Task OnConnectedAsync()
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(
            _httpContextAccessor.HttpContext
        );
        string connectionId = Context.ConnectionId;

        await Groups.AddToGroupAsync(connectionId, developer);

        string sessionId = Guid.NewGuid().ToString();

        s_sessionOwners.TryAdd(sessionId, developer);

        _logger.LogInformation(
            "Altinity hub connection established for user: {Developer}, connectionId: {ConnectionId}, sessionId: {SessionId}",
            developer,
            connectionId,
            sessionId
        );

        try
        {
            // Use IHubContext (singleton) instead of Clients (transient Hub instance)
            // to ensure the callback remains valid after the Hub method returns.
            var hubContext = _hubContext;
            var logger = _logger;
            var wsConnectionId = await _webSocketService.ConnectAndRegisterSessionAsync(
                sessionId,
                async (message) =>
                {
                    logger.LogInformation(
                        "Forwarding agent message to SignalR group {Developer} for session {SessionId}",
                        developer,
                        sessionId
                    );
                    try
                    {
                        await hubContext.Clients.Group(developer).ReceiveAgentMessage(message);
                        logger.LogInformation(
                            "Successfully forwarded message to SignalR for session {SessionId}",
                            sessionId
                        );
                    }
                    catch (Exception ex)
                    {
                        logger.LogError(
                            ex,
                            "Failed to forward message to SignalR for session {SessionId}",
                            sessionId
                        );
                    }
                }
            );

            s_signalRConnectionToWebSocket.TryAdd(connectionId, wsConnectionId);
            s_sessionIdToDeveloper.TryAdd(sessionId, developer);
            s_signalRConnectionToSessionId.TryAdd(connectionId, sessionId);

            _logger.LogInformation(
                "Established WebSocket to Altinity for session {SessionId}",
                sessionId
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Failed to establish WebSocket to Altinity for session {SessionId}",
                sessionId
            );
        }

            await Clients.Caller.SessionCreated(sessionId);
        }
        catch (Exception ex) when (ex is WebSocketException or HttpRequestException or OperationCanceledException)
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
        string developer = AuthenticationHelper.GetDeveloperUserName(
            _httpContextAccessor.HttpContext
        );
        string connectionId = Context.ConnectionId;

        await Groups.RemoveFromGroupAsync(connectionId, developer);

        if (s_signalRConnectionToWebSocket.TryRemove(connectionId, out string? wsConnectionId))
        {
            try
            {
                await _webSocketService.DisconnectSessionAsync(wsConnectionId);
                _logger.LogInformation(
                    "Disconnected Altinity WebSocket for connection {ConnectionId}",
                    connectionId
                );
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error disconnecting Altinity WebSocket for connection {ConnectionId}",
                    connectionId
                );
            }
        }

        _logger.LogInformation("Altinity hub disconnected for user: {Developer}", developer);

        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Proxies the start workflow request to Altinity agent with user's Gitea token
    /// </summary>
    /// <param name="request">The workflow start request</param>
    /// <returns>Agent response</returns>
    public async Task<object> StartWorkflow(JsonElement request)
    {
        _logger.LogInformation(
            "StartWorkflow called with request: {Request}",
            request.GetRawText()
        );

        var developer = GetCurrentDeveloperUserName();
        var userToken = await GetCurrentDeveloperTokenAsync();

        var sessionId = ExtractSessionIdFromRequest(request);

        _logger.LogInformation(
            "Extracted session_id: {SessionId}, Current sessions: {Sessions}",
            sessionId,
            string.Join(", ", s_sessionOwners.Keys)
        );

        ValidateSessionOwnership(sessionId, developer);

        _logger.LogInformation(
            "Starting Altinity workflow for user: {Developer}, session: {SessionId}",
            developer,
            sessionId
        );

        var agentResponse = await ForwardRequestToAltinityAgentAsync(
            request,
            developer,
            userToken,
            sessionId
        );

        return agentResponse;
    }

    private async Task<string> GetCurrentDeveloperTokenAsync()
    {
        // Use the same method as GiteaTokenDelegatingHandler - OAuth JWT token
        // Gitea in Altinn Studio is configured to accept JWT tokens from OIDC
        string? token = await _httpContextAccessor.HttpContext.GetDeveloperAppTokenAsync();

        if (string.IsNullOrEmpty(token))
        {
            _logger.LogWarning("No access_token found in authentication context");
        }
        else
        {
            _logger.LogInformation(
                "Retrieved OAuth access_token: {TokenLength} chars",
                token.Length
            );
        }

        _logger.LogInformation("Retrieved OAuth access_token");

        return token;
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
        string userToken,
        string sessionId
    )
    {
        var enrichedRequest = EnrichRequestWithRepoUrl(request);
        var httpRequest = CreateAltinityHttpRequest(
            enrichedRequest,
            developer,
            userToken,
            sessionId
        );
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
        // Extract org and app from the request
        if (
            !request.TryGetProperty("org", out var orgElement)
            || !request.TryGetProperty("app", out var appElement)
        )
        {
            return request;
        }

        string? org = orgElement.GetString();
        string? app = appElement.GetString();

        org.ValidPathSegment(nameof(org));
        app.ValidPathSegment(nameof(app));

        string repoUrl = $"{_serviceRepositorySettings.RepositoryBaseURL}/{org}/{app}.git";

        // Build the repo URL using the configured Gitea base URL
        var repoUrl = $"{_serviceRepositorySettings.RepositoryBaseURL}/{org}/{app}.git";

        // Create a new JSON object with the repo_url added
        var requestDict = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(
            request.GetRawText()
        );
        if (requestDict == null)
        {
            throw new HubException("Failed to parse workflow request");
        }

        requestDict["repo_url"] = JsonSerializer.SerializeToElement(repoUrl);

        return JsonSerializer.SerializeToElement(requestDict);
    }

    /// <summary>
    /// Validates that a path segment doesn't contain invalid characters
    /// </summary>
    private static bool ContainsInvalidPathCharacters(string value)
    {
        return value.Contains("..")
            || value.Contains("/")
            || value.Contains("\\")
            || value.Contains("~");
    }

    private HttpRequestMessage CreateAltinityHttpRequest(
        JsonElement request,
        string developer,
        string userToken,
        string sessionId
    )
    {
        var httpRequest = new HttpRequestMessage(
            HttpMethod.Post,
            $"{_altinitySettings.AgentUrl}/api/agent/start"
        )
        {
            Content = JsonContent.Create(request),
        };

        AddUserCredentialsToRequest(httpRequest, developer, userToken, sessionId);

        return httpRequest;
    }

    private static void AddUserCredentialsToRequest(
        HttpRequestMessage httpRequest,
        string developer,
        string userToken,
        string sessionId
    )
    {
        httpRequest.Headers.Add("X-User-Token", userToken);
        httpRequest.Headers.Add("X-Developer", developer);
        httpRequest.Headers.Add("X-Session-Id", sessionId);
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

    /// <summary>
    /// Cancels a running workflow for the given session
    /// </summary>
    public async Task<object> CancelWorkflow(string sessionId)
    {
        var developer = GetCurrentDeveloperUserName();
        ValidateSessionOwnership(sessionId, developer);

        _logger.LogInformation(
            "CancelWorkflow called for session {SessionId} by {Developer}",
            sessionId,
            developer
        );

        var httpClient = _httpClientFactory.CreateClient();
        var response = await httpClient.PostAsync(
            $"{_altinitySettings.AgentUrl}/api/agent/cancel/{sessionId}",
            null
        );
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

    /// <summary>
    /// Called by the backend when agent sends a message via webhook or polling
    /// This forwards the message to the appropriate frontend client
    /// </summary>
    public async Task SendMessageToSession(string sessionId, object message)
    {
        if (!s_sessionOwners.TryGetValue(sessionId, out var sessionOwner))
        {
            _logger.LogWarning(
                "Attempted to send message to unknown session: {SessionId}",
                sessionId
            );
            return;
        }

        await Clients.Group(sessionOwner).ReceiveAgentMessage(message);

        _logger.LogDebug(
            "Sent message to session {SessionId} owner: {SessionOwner}",
            sessionId,
            sessionOwner
        );
    }

    /// <summary>
    /// Cleanup method to remove completed sessions
    /// </summary>
    public async Task CloseSession(string sessionId)
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(
            _httpContextAccessor.HttpContext
        );

        if (s_sessionOwners.TryGetValue(sessionId, out string owner))
        {
            if (owner == developer)
            {
                s_sessionOwners.TryRemove(sessionId, out _);
                _logger.LogInformation(
                    "Session {SessionId} closed by owner {Developer}",
                    sessionId,
                    developer
                );
            }
            else
            {
                throw new HubException("Cannot close session you don't own");
            }
        }

        await Task.CompletedTask;
    }
}
