using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Services.Altinity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Designer.Hubs.Altinity;

/// <summary>
/// SignalR hub that proxies messages between the frontend and the Altinity agents service.
/// One agents WebSocket is shared per developer across all browser tabs.
/// </summary>
[Authorize]
public class AltinityProxyHub : Hub<IAltinityClient>
{
    private const string ContextItemDeveloper = "developer";
    private const string ContextItemToken = "token";
    private const string ContextItemSessionId = "sessionId";

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<AltinityProxyHub> _logger;
    private readonly AltinitySettings _altinitySettings;
    private readonly ServiceRepositorySettings _serviceRepositorySettings;
    private readonly IAltinityWebSocketService _webSocketService;
    private readonly AltinityAttachmentBuffer _attachmentStore;

    public AltinityProxyHub(
        IHttpClientFactory httpClientFactory,
        ILogger<AltinityProxyHub> logger,
        IOptions<AltinitySettings> altinitySettings,
        IOptions<ServiceRepositorySettings> serviceRepositorySettings,
        IAltinityWebSocketService webSocketService,
        AltinityAttachmentBuffer attachmentStore
    )
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _altinitySettings = altinitySettings.Value;
        _serviceRepositorySettings = serviceRepositorySettings.Value;
        _webSocketService = webSocketService;
        _attachmentStore = attachmentStore;
    }

    public override async Task OnConnectedAsync()
    {
        var httpContext = Context.GetHttpContext();
        var developer = AuthenticationHelper.GetDeveloperUserName(httpContext);
        var token = await httpContext.GetDeveloperAppTokenAsync();
        var sessionId = Guid.NewGuid().ToString();

        Context.Items[ContextItemDeveloper] = developer;
        Context.Items[ContextItemToken] = token ?? string.Empty;
        Context.Items[ContextItemSessionId] = sessionId;

        await Groups.AddToGroupAsync(Context.ConnectionId, developer);

        _logger.LogInformation(
            "Altinity hub connected: developer={Developer}, connectionId={ConnectionId}, sessionId={SessionId}",
            developer,
            Context.ConnectionId,
            sessionId
        );

        try
        {
            await _webSocketService.EnsureConnectedAsync(developer);
            await _webSocketService.RegisterSessionAsync(developer, sessionId);

            _logger.LogInformation(
                "Registered session {SessionId} on agents WS for developer {Developer}",
                sessionId,
                developer
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Failed to connect to agents service for developer {Developer}, session {SessionId}.",
                developer,
                sessionId
            );
        }

        await Clients.Caller.SessionCreated(sessionId);

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var developer = GetDeveloper();
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, developer);

        _logger.LogInformation(
            "Altinity hub disconnected: developer={Developer}, connectionId={ConnectionId}",
            developer,
            Context.ConnectionId
        );

        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Starts an agent workflow. Forwards the request to the agents HTTP API and
    /// returns immediately — events stream back over the shared WebSocket.
    /// </summary>
    public async Task<object> StartWorkflow(JsonElement request)
    {
        var developer = GetDeveloper();
        var token = GetToken();
        var sessionId = ExtractSessionId(request);

        _logger.LogInformation("StartWorkflow: developer={Developer}, sessionId={SessionId}", developer, sessionId);

        await _webSocketService.EnsureConnectedAsync(developer);
        await _webSocketService.RegisterSessionAsync(developer, sessionId);

        _logger.LogInformation(
            "Re-registered session {SessionId} on agents WS before starting workflow for developer {Developer}",
            sessionId,
            developer
        );

        var enriched = EnrichWithRepoUrl(request);
        var withAttachments = ResolveAttachments(enriched);
        var httpRequest = BuildAgentHttpRequest(withAttachments, developer, token, sessionId);
        return await SendToAgentAsync(httpRequest);
    }

    /// <summary>
    /// Cancels a running workflow session.
    /// </summary>
    public async Task<object> CancelWorkflow(string sessionId)
    {
        var developer = GetDeveloper();

        _logger.LogInformation("CancelWorkflow: developer={Developer}, sessionId={SessionId}", developer, sessionId);

        var httpClient = _httpClientFactory.CreateClient();
        var response = await httpClient.PostAsync($"{_altinitySettings.AgentUrl}/api/agent/cancel/{sessionId}", null);
        var body = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Cancel failed for session {SessionId}: {Status}", sessionId, response.StatusCode);
            throw new HubException($"Cancel failed: {body}");
        }

        return JsonSerializer.Deserialize<JsonElement>(body);
    }

    private string GetDeveloper() =>
        Context.Items.TryGetValue(ContextItemDeveloper, out var d) ? d as string ?? string.Empty : string.Empty;

    private string GetToken() =>
        Context.Items.TryGetValue(ContextItemToken, out var t) ? t as string ?? string.Empty : string.Empty;

    private static string ExtractSessionId(JsonElement request)
    {
        if (!request.TryGetProperty("session_id", out var el) || string.IsNullOrWhiteSpace(el.GetString()))
        {
            throw new HubException("Missing or empty session_id in request");
        }

        return el.GetString()!;
    }

    private JsonElement EnrichWithRepoUrl(JsonElement request)
    {
        if (!request.TryGetProperty("org", out var orgEl) || !request.TryGetProperty("app", out var appEl))
        {
            return request;
        }

        var org = orgEl.GetString();
        var app = appEl.GetString();

        if (string.IsNullOrWhiteSpace(org) || string.IsNullOrWhiteSpace(app))
        {
            throw new HubException("org and app identifiers cannot be empty");
        }

        if (HasInvalidPathCharacters(org) || HasInvalidPathCharacters(app))
        {
            throw new HubException("org and app identifiers contain invalid characters");
        }

        var repoUrl = $"{_serviceRepositorySettings.RepositoryBaseURL}/{org}/{app}.git";
        var dict =
            JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(request.GetRawText())
            ?? throw new HubException("Failed to parse workflow request");

        dict["repo_url"] = JsonSerializer.SerializeToElement(repoUrl);

        return JsonSerializer.SerializeToElement(dict);
    }

    private JsonElement ResolveAttachments(JsonElement request)
    {
        if (!request.TryGetProperty("attachment_ids", out var idsEl))
        {
            return request;
        }

        var ids = new List<string>();
        foreach (var idEl in idsEl.EnumerateArray())
        {
            var id = idEl.GetString();
            if (!string.IsNullOrWhiteSpace(id))
            {
                ids.Add(id);
            }
        }

        var attachments = _attachmentStore.ClaimAll(ids);

        var dict =
            JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(request.GetRawText())
            ?? throw new HubException("Failed to parse workflow request");

        dict.Remove("attachment_ids");

        var attachmentObjects = attachments.Select(a => new
        {
            name = a.Name,
            mimeType = a.MimeType,
            size = a.Size,
            dataBase64 = a.DataBase64,
        });

        dict["attachments"] = JsonSerializer.SerializeToElement(attachmentObjects);

        _logger.LogInformation("Resolved {Count} attachment(s) for StartWorkflow", attachments.Count);

        return JsonSerializer.SerializeToElement(dict);
    }

    private static bool HasInvalidPathCharacters(string value) =>
        value.Contains("..") || value.Contains('/') || value.Contains('\\') || value.Contains('~');

    private HttpRequestMessage BuildAgentHttpRequest(
        JsonElement request,
        string developer,
        string token,
        string sessionId
    )
    {
        var httpRequest = new HttpRequestMessage(HttpMethod.Post, $"{_altinitySettings.AgentUrl}/api/agent/start")
        {
            Content = JsonContent.Create(request),
        };

        httpRequest.Headers.Add("X-User-Token", token);
        httpRequest.Headers.Add("X-Developer", developer);
        httpRequest.Headers.Add("X-Session-Id", sessionId);

        return httpRequest;
    }

    private async Task<JsonElement> SendToAgentAsync(HttpRequestMessage httpRequest)
    {
        var httpClient = _httpClientFactory.CreateClient();
        var response = await httpClient.SendAsync(httpRequest);
        var body = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Agent returned error {Status}: {Body}", response.StatusCode, body);
            throw new HubException($"Agent returned {response.StatusCode}: {body}");
        }

        return JsonSerializer.Deserialize<JsonElement>(body);
    }
}
