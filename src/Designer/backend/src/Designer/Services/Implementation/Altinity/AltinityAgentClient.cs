using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models.ApiKey;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Interfaces.Altinity;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Designer.Services.Implementation.Altinity;

public class AltinityAgentClient : IAltinityAgentClient
{
    private const string FeedbackPath = "/api/agent/feedback";
    private const string ApiKeyHeader = "X-Api-Key";
    private const string DeveloperHeader = "X-Developer";
    private const string ApiKeyNamePrefix = "altinity-feedback-";
    private static readonly TimeSpan ApiKeyLifetime = TimeSpan.FromMinutes(2);

    private readonly HttpClient _httpClient;
    private readonly AltinitySettings _altinitySettings;
    private readonly IApiKeyService _apiKeyService;
    private readonly ILogger<AltinityAgentClient> _logger;

    public AltinityAgentClient(
        HttpClient httpClient,
        IOptions<AltinitySettings> altinitySettings,
        IApiKeyService apiKeyService,
        ILogger<AltinityAgentClient> logger
    )
    {
        _httpClient = httpClient;
        _altinitySettings = altinitySettings.Value;
        _apiKeyService = apiKeyService;
        _logger = logger;
    }

    public async Task SendFeedbackAsync(
        string developer,
        string traceId,
        bool thumbsUp,
        string? comment,
        CancellationToken cancellationToken = default
    )
    {
        string apiKey = await CreateShortLivedApiKeyAsync(developer, cancellationToken);

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
        httpRequest.Headers.Add(ApiKeyHeader, apiKey);
        httpRequest.Headers.Add(DeveloperHeader, developer);

        using var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(_altinitySettings.TimeoutSeconds));
        using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, timeoutCts.Token);

        using var response = await _httpClient.SendAsync(httpRequest, linkedCts.Token);
        if (!response.IsSuccessStatusCode)
        {
            string responseContent = await response.Content.ReadAsStringAsync(linkedCts.Token);
            _logger.LogError("Altinity feedback returned {StatusCode}: {Body}", response.StatusCode, responseContent);
            throw new HttpRequestException($"Altinity feedback returned {response.StatusCode}: {responseContent}");
        }
    }

    private async Task<string> CreateShortLivedApiKeyAsync(string developer, CancellationToken cancellationToken)
    {
        string apiKeyName = $"{ApiKeyNamePrefix}{Guid.NewGuid()}";
        DateTimeOffset expiresAt = DateTimeOffset.UtcNow.Add(ApiKeyLifetime);

        var (rawKey, _) = await _apiKeyService.CreateAsync(
            developer,
            apiKeyName,
            ApiKeyType.System,
            expiresAt,
            cancellationToken: cancellationToken
        );

        return rawKey;
    }
}
