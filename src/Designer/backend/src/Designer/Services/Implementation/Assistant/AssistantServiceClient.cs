using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models.Assistant;
using Altinn.Studio.Designer.Services.Interfaces.Assistant;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Designer.Services.Implementation.Assistant;

public class AssistantServiceClient : IAssistantServiceClient
{
    private const string TracesPath = "/api/traces";
    private const string TraceCleanupPath = $"{TracesPath}/delete-expired";
    private const string AgentPath = "/api/agent";
    private const string DeveloperHeader = "X-Developer";
    private const string ApiKeyHeader = "X-Api-Key";
    private const string SessionIdHeader = "X-Session-Id";

    private readonly HttpClient _httpClient;
    private readonly AssistantSettings _assistantSettings;

    public AssistantServiceClient(HttpClient httpClient, IOptions<AssistantSettings> assistantSettings)
    {
        _httpClient = httpClient;
        _assistantSettings = assistantSettings.Value;
    }

    public async Task SendFeedbackAsync(
        string developer,
        string traceId,
        bool thumbsUp,
        string? comment,
        CancellationToken cancellationToken
    )
    {
        var requestUri = new Uri($"{_assistantSettings.AgentUrl}{TracesPath}/{traceId}/feedback");
        using var httpRequest = new HttpRequestMessage(HttpMethod.Put, requestUri)
        {
            Content = JsonContent.Create(new { thumbs_up = thumbsUp, comment }),
        };
        httpRequest.Headers.Add(DeveloperHeader, developer);

        using var response = await _httpClient.SendAsync(httpRequest, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            string responseContent = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new HttpRequestException($"Assistant feedback returned {response.StatusCode}: {responseContent}");
        }
    }

    public async Task ClearFeedbackAsync(string developer, string traceId, CancellationToken cancellationToken)
    {
        var requestUri = new Uri($"{_assistantSettings.AgentUrl}{TracesPath}/{traceId}/feedback");
        using var httpRequest = new HttpRequestMessage(HttpMethod.Delete, requestUri);
        httpRequest.Headers.Add(DeveloperHeader, developer);

        using var response = await _httpClient.SendAsync(httpRequest, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            string responseContent = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new HttpRequestException(
                $"Assistant clear feedback returned {response.StatusCode}: {responseContent}"
            );
        }
    }

    public async Task TriggerTraceCleanupAsync(CancellationToken cancellationToken)
    {
        var requestUri = new Uri($"{_assistantSettings.AgentUrl}{TraceCleanupPath}");
        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, requestUri);

        using var response = await _httpClient.SendAsync(httpRequest, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            string responseContent = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new HttpRequestException(
                $"Assistant trace cleanup returned {response.StatusCode}: {responseContent}"
            );
        }
    }

    public async Task<JsonElement> StartWorkflow(
        AssistantWorkflowStartRequest request,
        string developer,
        string apiKey,
        CancellationToken cancellationToken
    )
    {
        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, AgentUri("start"))
        {
            Content = JsonContent.Create(request),
        };
        httpRequest.Headers.Add(ApiKeyHeader, apiKey);
        httpRequest.Headers.Add(DeveloperHeader, developer);
        httpRequest.Headers.Add(SessionIdHeader, request.SessionId);

        return await SendAgentRequest(httpRequest, cancellationToken);
    }

    public async Task CancelWorkflow(string developer, string sessionId, CancellationToken cancellationToken)
    {
        // The assistant service checks that the developer owns the session.
        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, AgentUri($"cancel/{sessionId}"));
        httpRequest.Headers.Add(DeveloperHeader, developer);

        await SendAgentRequest(httpRequest, cancellationToken);
    }

    public async Task RespondToPermission(
        string developer,
        string sessionId,
        string requestId,
        bool granted,
        CancellationToken cancellationToken
    )
    {
        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, AgentUri($"permission/{sessionId}"))
        {
            Content = JsonContent.Create(new { request_id = requestId, granted }),
        };
        httpRequest.Headers.Add(DeveloperHeader, developer);

        await SendAgentRequest(httpRequest, cancellationToken);
    }

    private Uri AgentUri(string path) => new($"{_assistantSettings.AgentUrl}{AgentPath}/{path}");

    private async Task<JsonElement> SendAgentRequest(
        HttpRequestMessage httpRequest,
        CancellationToken cancellationToken
    )
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(_assistantSettings.TimeoutSeconds));

        using var response = await _httpClient.SendAsync(httpRequest, timeout.Token);
        string responseContent = await response.Content.ReadAsStringAsync(timeout.Token);
        if (!response.IsSuccessStatusCode)
        {
            throw new HttpRequestException(
                $"Assistant returned {response.StatusCode} for {httpRequest.RequestUri?.AbsolutePath}: {responseContent}"
            );
        }

        return JsonSerializer.Deserialize<JsonElement>(responseContent);
    }
}
