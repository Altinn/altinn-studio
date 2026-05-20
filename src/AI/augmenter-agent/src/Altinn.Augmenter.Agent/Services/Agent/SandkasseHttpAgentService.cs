using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.Augmenter.Agent.Configuration;
using Microsoft.Extensions.Options;

namespace Altinn.Augmenter.Agent.Services.Agent;

/// <summary>
/// Calls the sandkasse OpenAI-compatible gateway over HTTP directly. Replaces
/// the Pi CLI shell-out — same IAgentService contract, no npm/node dependency,
/// and ~7s/call faster on cold-start because there's no Pi process spawn.
///
/// Retries 502/503/504 with exponential backoff (2s/4s/8s); other failures
/// surface as InvalidOperationException so the pipeline can fall back as
/// before.
/// </summary>
public sealed class SandkasseHttpAgentService(
    IHttpClientFactory httpClientFactory,
    IOptions<AgentOptions> options,
    ILogger<SandkasseHttpAgentService> logger) : IAgentService
{
    public const string HttpClientName = "sandkasse";

    private static readonly HashSet<HttpStatusCode> RetryStatusCodes =
    [
        HttpStatusCode.BadGateway,
        HttpStatusCode.ServiceUnavailable,
        HttpStatusCode.GatewayTimeout,
    ];

    private const int MaxRetryAttempts = 3;
    private static readonly TimeSpan InitialBackoff = TimeSpan.FromSeconds(2);

    public async Task<string> RunAsync(AgentRequest request, CancellationToken cancellationToken = default)
    {
        var opts = options.Value;

        if (string.IsNullOrWhiteSpace(opts.BaseUrl))
            throw new InvalidOperationException("Agent:BaseUrl is required for SandkasseHttpAgentService.");
        if (string.IsNullOrWhiteSpace(opts.ApiKey))
            throw new InvalidOperationException(
                "Agent:ApiKey is required for SandkasseHttpAgentService (typically supplied via SANDKASSE_API_KEY env var).");
        if (string.IsNullOrWhiteSpace(opts.Model))
            throw new InvalidOperationException("Agent:Model is required for SandkasseHttpAgentService.");

        var systemPrompt = await SkillLoader.LoadAsync(request.SkillFolder, cancellationToken);

        logger.LogInformation(
            "Calling sandkasse HTTP agent (skill={SkillFolder}, model={Model}, systemPromptLength={Length})",
            request.SkillFolder, opts.Model, systemPrompt.Length);

        var requestBody = new ChatRequest
        {
            Model = opts.Model,
            Messages =
            [
                new ChatMessage { Role = "system", Content = systemPrompt },
                new ChatMessage { Role = "user", Content = request.UserPrompt },
            ],
            MaxTokens = opts.MaxTokens,
            Temperature = opts.Temperature,
            Stream = opts.UseStreaming ? true : null,
        };

        using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        cts.CancelAfter(TimeSpan.FromSeconds(opts.TimeoutSeconds));

        var endpoint = new Uri(new Uri(opts.BaseUrl.TrimEnd('/') + "/"), "chat/completions");

        var backoff = InitialBackoff;
        for (var attempt = 0; attempt < MaxRetryAttempts; attempt++)
        {
            using var httpRequest = new HttpRequestMessage(HttpMethod.Post, endpoint);
            httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", opts.ApiKey);
            httpRequest.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue(
                opts.UseStreaming ? "text/event-stream" : "application/json"));
            httpRequest.Content = JsonContent.Create(requestBody, options: JsonOpts);

            var client = httpClientFactory.CreateClient(HttpClientName);
            var response = await client.SendAsync(
                httpRequest,
                opts.UseStreaming ? HttpCompletionOption.ResponseHeadersRead : HttpCompletionOption.ResponseContentRead,
                cts.Token);

            if (RetryStatusCodes.Contains(response.StatusCode) && attempt < MaxRetryAttempts - 1)
            {
                logger.LogWarning(
                    "sandkasse returned {StatusCode}; retry attempt {Attempt}/{Max} after {Backoff}s",
                    (int)response.StatusCode, attempt + 1, MaxRetryAttempts, backoff.TotalSeconds);
                response.Dispose();
                await Task.Delay(backoff, cts.Token);
                backoff *= 2;
                continue;
            }

            using (response)
            {
                if (!response.IsSuccessStatusCode)
                {
                    var errorBody = await response.Content.ReadAsStringAsync(cts.Token);
                    logger.LogError(
                        "sandkasse returned non-success {StatusCode}: {Body}",
                        (int)response.StatusCode, errorBody);
                    throw new InvalidOperationException(
                        $"sandkasse HTTP {(int)response.StatusCode}: {Truncate(errorBody, 500)}");
                }

                var content = opts.UseStreaming
                    ? await ReadStreamingResponseAsync(response, cts.Token)
                    : await ReadBlockingResponseAsync(response, cts.Token);

                logger.LogInformation("sandkasse completed ({Length} chars)", content.Length);
                return content;
            }
        }

        throw new InvalidOperationException("sandkasse request never completed.");
    }

    private static async Task<string> ReadBlockingResponseAsync(
        HttpResponseMessage response, CancellationToken ct)
    {
        var parsed = await response.Content.ReadFromJsonAsync<ChatResponse>(JsonOpts, ct)
            ?? throw new InvalidOperationException("sandkasse returned empty/unparsable JSON.");
        return parsed.Choices?.FirstOrDefault()?.Message?.Content ?? string.Empty;
    }

    private static async Task<string> ReadStreamingResponseAsync(
        HttpResponseMessage response, CancellationToken ct)
    {
        await using var stream = await response.Content.ReadAsStreamAsync(ct);
        using var reader = new StreamReader(stream);
        var sb = new System.Text.StringBuilder();
        while (await reader.ReadLineAsync(ct) is { } line)
        {
            if (!line.StartsWith("data:", StringComparison.Ordinal))
                continue;
            var payload = line[5..].Trim();
            if (payload == "[DONE]")
                break;
            if (payload.Length == 0)
                continue;
            StreamChunk? chunk;
            try
            {
                chunk = JsonSerializer.Deserialize<StreamChunk>(payload, JsonOpts);
            }
            catch (JsonException)
            {
                continue;
            }
            var delta = chunk?.Choices?.FirstOrDefault()?.Delta?.Content;
            if (!string.IsNullOrEmpty(delta))
                sb.Append(delta);
        }
        return sb.ToString();
    }

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    private static string Truncate(string s, int max) => s.Length <= max ? s : s[..max] + "...";

    private sealed record ChatRequest
    {
        public required string Model { get; init; }
        public required List<ChatMessage> Messages { get; init; }
        [JsonPropertyName("max_tokens")] public int MaxTokens { get; init; } = 4096;
        public double Temperature { get; init; }
        public bool? Stream { get; init; }
    }

    private sealed record ChatMessage
    {
        public required string Role { get; init; }
        public required string Content { get; init; }
    }

    private sealed record ChatResponse
    {
        public List<Choice>? Choices { get; init; }
    }

    private sealed record Choice
    {
        public ChatMessage? Message { get; init; }
        [JsonPropertyName("finish_reason")] public string? FinishReason { get; init; }
    }

    private sealed record StreamChunk
    {
        public List<StreamChoice>? Choices { get; init; }
    }

    private sealed record StreamChoice
    {
        public StreamDelta? Delta { get; init; }
    }

    private sealed record StreamDelta
    {
        public string? Content { get; init; }
    }
}
