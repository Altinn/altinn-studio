using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models.Assistant;
using Altinn.Studio.Designer.Services.Interfaces.Assistant;
using Microsoft.Extensions.Options;
using Microsoft.Rest.TransientFaultHandling;

namespace Altinn.Studio.Designer.Services.Implementation.Assistant;

public class AssistantServiceClient : IAssistantServiceClient
{
    private const string TracesPath = "/api/traces";
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
        _httpClient.Timeout = TimeSpan.FromSeconds(_assistantSettings.TimeoutSeconds);
    }

    public async Task SendFeedbackAsync(
        string developer,
        string traceId,
        bool thumbsUp,
        string? comment,
        CancellationToken cancellationToken
    )
    {
        using var httpRequest = new HttpRequestMessage(HttpMethod.Put, ServiceUri($"{TracesPath}/{traceId}/feedback"))
        {
            Content = JsonContent.Create(new { thumbs_up = thumbsUp, comment }),
        };
        httpRequest.Headers.Add(DeveloperHeader, developer);

        await Send(httpRequest, cancellationToken);
    }

    public async Task ClearFeedbackAsync(string developer, string traceId, CancellationToken cancellationToken)
    {
        using var httpRequest = new HttpRequestMessage(
            HttpMethod.Delete,
            ServiceUri($"{TracesPath}/{traceId}/feedback")
        );
        httpRequest.Headers.Add(DeveloperHeader, developer);

        await Send(httpRequest, cancellationToken);
    }

    public async Task TriggerTraceCleanupAsync(CancellationToken cancellationToken)
    {
        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, ServiceUri($"{TracesPath}/delete-expired"));

        await Send(httpRequest, cancellationToken);
    }

    public async Task StartWorkflow(
        AssistantWorkflowStartRequest request,
        string developer,
        string apiKey,
        CancellationToken cancellationToken
    )
    {
        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, ServiceUri($"{AgentPath}/start"))
        {
            Content = JsonContent.Create(request),
        };
        httpRequest.Headers.Add(ApiKeyHeader, apiKey);
        httpRequest.Headers.Add(DeveloperHeader, developer);
        httpRequest.Headers.Add(SessionIdHeader, request.SessionId);

        await Send(httpRequest, cancellationToken);
    }

    public async Task CancelWorkflow(string developer, string sessionId, CancellationToken cancellationToken)
    {
        // The assistant service checks that the developer owns the session.
        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, ServiceUri($"{AgentPath}/cancel/{sessionId}"));
        httpRequest.Headers.Add(DeveloperHeader, developer);

        await Send(httpRequest, cancellationToken);
    }

    public async Task RespondToPermission(
        string developer,
        string sessionId,
        string requestId,
        bool granted,
        CancellationToken cancellationToken
    )
    {
        using var httpRequest = new HttpRequestMessage(
            HttpMethod.Post,
            ServiceUri($"{AgentPath}/permission/{sessionId}")
        )
        {
            Content = JsonContent.Create(new { request_id = requestId, granted }),
        };
        httpRequest.Headers.Add(DeveloperHeader, developer);

        await Send(httpRequest, cancellationToken);
    }

    private Uri ServiceUri(string path) => new($"{_assistantSettings.AgentUrl}{path}");

    private async Task Send(HttpRequestMessage httpRequest, CancellationToken cancellationToken)
    {
        using var response = await _httpClient.SendAsync(httpRequest, cancellationToken);
        if (response.IsSuccessStatusCode)
        {
            return;
        }

        string responseContent = await response.Content.ReadAsStringAsync(cancellationToken);
        string message =
            $"Assistant returned {response.StatusCode} for {httpRequest.RequestUri?.AbsolutePath}: {responseContent}";

        // The assistant service answers with a client error in expected cases, such as a permission request
        // that has timed out, a session that it no longer has, or its rate limit. The browser gets the same
        // status. A 401 means that Designer's own request was wrong, so the browser gets a server error for it.
        if (
            response.StatusCode is >= HttpStatusCode.BadRequest and < HttpStatusCode.InternalServerError
            && response.StatusCode != HttpStatusCode.Unauthorized
        )
        {
            throw new HttpRequestWithStatusException(message) { StatusCode = response.StatusCode };
        }

        throw new HttpRequestException(message, null, response.StatusCode);
    }
}
