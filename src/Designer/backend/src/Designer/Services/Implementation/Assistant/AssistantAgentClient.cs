using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Services.Interfaces.Assistant;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Designer.Services.Implementation.Assistant;

public class AssistantAgentClient : IAssistantServiceClient
{
    private const string TracesPath = "/api/traces";
    private const string TraceCleanupPath = $"{TracesPath}/delete-expired";
    private const string DeveloperHeader = "X-Developer";

    private readonly HttpClient _httpClient;
    private readonly AssistantSettings _assistantSettings;

    public AssistantAgentClient(HttpClient httpClient, IOptions<AssistantSettings> assistantSettings)
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
}
