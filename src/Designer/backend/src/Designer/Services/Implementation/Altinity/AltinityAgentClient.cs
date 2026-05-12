using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Services.Interfaces.Altinity;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Designer.Services.Implementation.Altinity;

public class AltinityAgentClient : IAltinityAgentClient
{
    private const string FeedbackPath = "/api/feedback";
    private const string DeveloperHeader = "X-Developer";

    private readonly HttpClient _httpClient;
    private readonly AltinitySettings _altinitySettings;

    public AltinityAgentClient(
        HttpClient httpClient,
        IOptions<AltinitySettings> altinitySettings,
    )
    {
        _httpClient = httpClient;
        _altinitySettings = altinitySettings.Value;
    }

    public async Task SendFeedbackAsync(
        string developer,
        string traceId,
        bool thumbsUp,
        string? comment,
        CancellationToken cancellationToken = default
    )
    {
        var requestUri = new Uri($"{_altinitySettings.AgentUrl}{FeedbackPath}");
        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, requestUri)
        {
            Content = JsonContent.Create(
                new
                {
                    trace_id = traceId,
                    thumbs_up = thumbsUp,
                    comment,
                }
            ),
        };
        httpRequest.Headers.Add(DeveloperHeader, developer);

        using var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(_altinitySettings.TimeoutSeconds));
        using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, timeoutCts.Token);

        using var response = await _httpClient.SendAsync(httpRequest, linkedCts.Token);
        if (!response.IsSuccessStatusCode)
        {
            string responseContent = await response.Content.ReadAsStringAsync(linkedCts.Token);
            throw new HttpRequestException($"Altinity feedback returned {response.StatusCode}: {responseContent}");
        }
    }
}
