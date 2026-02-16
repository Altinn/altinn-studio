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
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Designer.Hubs.Altinity;

/// <summary>
/// SignalR Hub for proxying Altinity agent communication with user authentication
/// </summary>
[Authorize]
public class AltinityProxyHub : Hub<IAltinityClient>
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly AltinitySettings _altinitySettings;
    private readonly ServiceRepositorySettings _serviceRepositorySettings;
    private readonly IAltinityWebSocketService _webSocketService;

    private static readonly ConcurrentDictionary<string, string> s_sessionIdToDeveloper = new();

    private static readonly ConcurrentDictionary<string, string> s_signalRConnectionToWebSocket = new();

    private static readonly ConcurrentDictionary<string, string> s_signalRConnectionToSessionId = new();

    public AltinityProxyHub(
        IHttpContextAccessor httpContextAccessor,
        IHttpClientFactory httpClientFactory,
        IOptions<AltinitySettings> altinitySettings,
        IOptions<ServiceRepositorySettings> serviceRepositorySettings,
        IAltinityWebSocketService webSocketService)
    {
        _httpContextAccessor = httpContextAccessor;
        _httpClientFactory = httpClientFactory;
        _altinitySettings = altinitySettings.Value;
        _serviceRepositorySettings = serviceRepositorySettings.Value;
        _webSocketService = webSocketService;
    }

    public override async Task OnConnectedAsync()
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
        string connectionId = Context.ConnectionId;

        await Groups.AddToGroupAsync(connectionId, developer);

        string sessionId = Guid.NewGuid().ToString();

        try
        {
            string wsConnectionId = await _webSocketService.ConnectAndRegisterSessionAsync(
                sessionId,
                async (message) => { await Clients.Group(developer).ReceiveAgentMessage(message); });

            s_signalRConnectionToWebSocket.TryAdd(connectionId, wsConnectionId);
            s_sessionIdToDeveloper.TryAdd(sessionId, developer);
            s_signalRConnectionToSessionId.TryAdd(connectionId, sessionId);

            await Clients.Caller.SessionCreated(sessionId);
        }
        catch (Exception ex) when (ex is WebSocketException or HttpRequestException or OperationCanceledException)
        {
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

        if (s_signalRConnectionToWebSocket.TryRemove(connectionId, out string? wsConnectionId))
        {
            await _webSocketService.DisconnectSessionAsync(wsConnectionId);
        }

        if (s_signalRConnectionToSessionId.TryRemove(connectionId, out string? sessionId))
        {
            s_sessionIdToDeveloper.TryRemove(sessionId, out _);
        }

        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Proxies the start workflow request to Altinity agent with user's Gitea token
    /// </summary>
    /// <param name="request">The workflow start request</param>
    /// <returns>Agent response</returns>
    public async Task<object> StartWorkflow(JsonElement request)
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
        string userToken = await GetCurrentDeveloperTokenAsync();

        string sessionId = ExtractSessionIdFromRequest(request);
        ValidateSessionOwnership(sessionId, developer);

        var agentResponse = await ForwardRequestToAltinityAgentAsync(request, developer, userToken, sessionId);

        return agentResponse;
    }

    private async Task<string> GetCurrentDeveloperTokenAsync()
    {
        // Use the same method as GiteaTokenDelegatingHandler - OAuth JWT token
        // Gitea in Altinn Studio is configured to accept JWT tokens from OIDC
        string? token = await _httpContextAccessor.HttpContext.GetDeveloperAppTokenAsync();

        if (string.IsNullOrEmpty(token))
        {
            throw new HubException("Missing access_token in authentication context");
        }

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
            throw new HubException("Invalid session: Session does not exist");
        }

        if (sessionOwner != developer)
        {
            throw new HubException("Access denied: You don't own this session");
        }
    }

    private async Task<JsonElement> ForwardRequestToAltinityAgentAsync(
        JsonElement request,
        string developer,
        string userToken,
        string sessionId)
    {
        var enrichedRequest = EnrichRequestWithRepoUrl(request);
        var httpRequest = CreateAltinityHttpRequest(enrichedRequest, developer, userToken, sessionId);
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
        string userToken,
        string sessionId)
    {
        var httpRequest = new HttpRequestMessage(HttpMethod.Post, $"{_altinitySettings.AgentUrl}/api/agent/start") { Content = JsonContent.Create(request) };

        AddUserCredentialsToRequest(httpRequest, developer, userToken, sessionId);

        return httpRequest;
    }

    private static void AddUserCredentialsToRequest(
        HttpRequestMessage httpRequest,
        string developer,
        string userToken,
        string sessionId)
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
            throw new HubException($"Agent returned {response.StatusCode}: {responseContent}");
        }

        return JsonSerializer.Deserialize<JsonElement>(responseContent);
    }
}
