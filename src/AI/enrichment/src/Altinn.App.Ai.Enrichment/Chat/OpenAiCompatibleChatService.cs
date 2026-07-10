using System.Diagnostics;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Ai.Enrichment.Configuration;
using Altinn.App.Ai.Enrichment.Tools;
using Microsoft.Extensions.Options;

namespace Altinn.App.Ai.Enrichment.Chat;

/// <summary>
/// Calls an OpenAI-compatible chat-completions gateway with full tool-calling and
/// optional SSE streaming.
///
/// Retries 502/503/504 with exponential backoff (2s/4s/8s) to absorb the
/// gateway's occasional transient backend errors. Other failures surface as
/// <see cref="ChatResponse.Error"/> so the orchestrator can record them in the
/// per-item trace without throwing.
/// </summary>
public sealed class OpenAiCompatibleChatService(
    IHttpClientFactory httpClientFactory,
    IOptions<AgentOptions> options,
    IApiKeyProvider apiKeyProvider,
    ILogger<OpenAiCompatibleChatService> logger) : IChatService
{
    public const string HttpClientName = "ai-enrichment-chat";

    private const int MaxRetryAttempts = 3;
    private static readonly TimeSpan InitialBackoff = TimeSpan.FromSeconds(2);

    private static readonly HashSet<HttpStatusCode> RetryStatusCodes =
    [
        HttpStatusCode.BadGateway,
        HttpStatusCode.ServiceUnavailable,
        HttpStatusCode.GatewayTimeout,
    ];

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    public async Task<ChatResponse> RunAsync(ChatRequest request, CancellationToken cancellationToken = default)
    {
        var opts = options.Value;
        if (string.IsNullOrWhiteSpace(opts.BaseUrl))
            throw new InvalidOperationException($"{AgentOptions.SectionName}:BaseUrl is required for OpenAiCompatibleChatService.");
        if (string.IsNullOrWhiteSpace(opts.Model) && string.IsNullOrWhiteSpace(request.Model))
            throw new InvalidOperationException($"Either {AgentOptions.SectionName}:Model or ChatRequest.Model must be set.");

        var apiKey = await apiKeyProvider.GetApiKeyAsync(cancellationToken);

        var endpoint = new Uri(new Uri(opts.BaseUrl.TrimEnd('/') + "/"), "chat/completions");
        var body = new ChatCompletionsBody
        {
            Model = request.Model ?? opts.Model!,
            Messages = request.Messages,
            MaxTokens = request.MaxTokens,
            Temperature = request.Temperature,
            Tools = request.Tools is { Count: > 0 } ? request.Tools : null,
            ToolChoice = request.Tools is { Count: > 0 } ? request.ToolChoice : null,
            Stream = request.Stream ? true : null,
        };

        using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        cts.CancelAfter(TimeSpan.FromSeconds(opts.TimeoutSeconds));

        var backoff = InitialBackoff;
        ChatResponse? lastResponse = null;
        for (var attempt = 0; attempt < MaxRetryAttempts; attempt++)
        {
            try
            {
                lastResponse = await SendOnceAsync(endpoint, body, apiKey, request.Stream, cts.Token);
            }
            catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
            {
                // Our own TimeoutSeconds budget expired — a per-call condition the
                // orchestrator records as a verdict, not a cancellation of the run.
                return new ChatResponse
                {
                    StatusCode = 0,
                    Error = $"Transport: timeout after {opts.TimeoutSeconds}s ({AgentOptions.SectionName}:TimeoutSeconds)",
                };
            }

            var retryable = lastResponse.StatusCode != 0 &&
                            RetryStatusCodes.Contains((HttpStatusCode)lastResponse.StatusCode);
            if (!retryable || attempt == MaxRetryAttempts - 1)
                return lastResponse;

            logger.LogWarning(
                "chat gateway returned {StatusCode}; retry attempt {Attempt}/{Max} after {Backoff}s",
                lastResponse.StatusCode, attempt + 1, MaxRetryAttempts, backoff.TotalSeconds);
            await Task.Delay(backoff, cts.Token);
            backoff *= 2;
        }
        return lastResponse!;
    }

    private async Task<ChatResponse> SendOnceAsync(
        Uri endpoint, ChatCompletionsBody body, string apiKey, bool streaming, CancellationToken ct)
    {
        var sw = Stopwatch.StartNew();
        try
        {
            using var req = new HttpRequestMessage(HttpMethod.Post, endpoint);
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
            req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue(
                streaming ? "text/event-stream" : "application/json"));
            req.Content = JsonContent.Create(body, options: JsonOpts);

            var client = httpClientFactory.CreateClient(HttpClientName);
            using var response = await client.SendAsync(
                req,
                streaming ? HttpCompletionOption.ResponseHeadersRead : HttpCompletionOption.ResponseContentRead,
                ct);

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(ct);
                return new ChatResponse
                {
                    StatusCode = (int)response.StatusCode,
                    Error = $"HTTP {(int)response.StatusCode}: {Truncate(errorBody, 500)}",
                    ElapsedMs = (int)sw.ElapsedMilliseconds,
                };
            }

            return streaming
                ? await ParseStreamingAsync(response, (int)response.StatusCode, sw, ct)
                : await ParseBlockingAsync(response, (int)response.StatusCode, sw, ct);
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            return new ChatResponse
            {
                StatusCode = 0,
                Error = $"Transport: {ex.GetType().Name}: {ex.Message}",
                ElapsedMs = (int)sw.ElapsedMilliseconds,
            };
        }
    }

    private static async Task<ChatResponse> ParseBlockingAsync(
        HttpResponseMessage response, int status, Stopwatch sw, CancellationToken ct)
    {
        var parsed = await response.Content.ReadFromJsonAsync<ChatCompletionsResponse>(JsonOpts, ct);
        if (parsed is null)
        {
            return new ChatResponse { StatusCode = status, Error = "Empty body", ElapsedMs = (int)sw.ElapsedMilliseconds };
        }
        var choice = parsed.Choices?.FirstOrDefault();
        if (choice is null)
        {
            return new ChatResponse { StatusCode = status, Error = "No choices in response", ElapsedMs = (int)sw.ElapsedMilliseconds };
        }
        var msg = choice.Message;
        var toolCalls = msg?.ToolCalls?.Select(tc => new ToolCall
        {
            Id = tc.Id ?? "",
            Name = tc.Function?.Name ?? "",
            ArgumentsRaw = tc.Function?.Arguments ?? "",
        }).ToList() ?? [];

        return new ChatResponse
        {
            Content = msg?.Content ?? "",
            ToolCalls = toolCalls,
            FinishReason = choice.FinishReason,
            Usage = parsed.Usage ?? new Dictionary<string, object?>(),
            StatusCode = status,
            ElapsedMs = (int)sw.ElapsedMilliseconds,
        };
    }

    private static async Task<ChatResponse> ParseStreamingAsync(
        HttpResponseMessage response, int status, Stopwatch sw, CancellationToken ct)
    {
        await using var stream = await response.Content.ReadAsStreamAsync(ct);
        using var reader = new StreamReader(stream);

        var content = new System.Text.StringBuilder();
        var pending = new SortedDictionary<int, PendingToolCall>();
        string? finishReason = null;
        IReadOnlyDictionary<string, object?>? usage = null;

        while (await reader.ReadLineAsync(ct) is { } line)
        {
            if (!line.StartsWith("data:", StringComparison.Ordinal))
                continue;
            var payload = line[5..].Trim();
            if (payload == "[DONE]")
                break;
            if (payload.Length == 0)
                continue;

            StreamEvent? evt;
            try
            {
                evt = JsonSerializer.Deserialize<StreamEvent>(payload, JsonOpts);
            }
            catch (JsonException)
            {
                continue;
            }
            if (evt is null)
                continue;

            var choice = evt.Choices?.FirstOrDefault();
            if (choice is not null)
            {
                var delta = choice.Delta;
                if (delta?.Content is { Length: > 0 } chunk)
                    content.Append(chunk);

                if (delta?.ToolCalls is not null)
                {
                    foreach (var tcDelta in delta.ToolCalls)
                    {
                        var idx = tcDelta.Index ?? 0;
                        if (!pending.TryGetValue(idx, out var slot))
                        {
                            slot = new PendingToolCall();
                            pending[idx] = slot;
                        }
                        if (!string.IsNullOrEmpty(tcDelta.Id))
                            slot.Id = tcDelta.Id;
                        if (!string.IsNullOrEmpty(tcDelta.Function?.Name))
                            slot.Name = tcDelta.Function.Name;
                        if (tcDelta.Function?.Arguments is { Length: > 0 } argChunk)
                            slot.Arguments.Append(argChunk);
                    }
                }

                if (!string.IsNullOrEmpty(choice.FinishReason))
                    finishReason = choice.FinishReason;
            }

            if (evt.Usage is { Count: > 0 })
                usage = evt.Usage;
        }

        var toolCalls = pending.Values
            .Where(p => !string.IsNullOrEmpty(p.Name))
            .Select(p => new ToolCall
            {
                Id = p.Id ?? "",
                Name = p.Name!,
                ArgumentsRaw = p.Arguments.ToString(),
            })
            .ToList();

        return new ChatResponse
        {
            Content = content.ToString(),
            ToolCalls = toolCalls,
            FinishReason = finishReason,
            Usage = usage ?? new Dictionary<string, object?>(),
            StatusCode = status,
            ElapsedMs = (int)sw.ElapsedMilliseconds,
        };
    }

    private static string Truncate(string s, int max) => s.Length <= max ? s : s[..max] + "...";

    // --- request / response DTOs --------------------------------------------------

    private sealed record ChatCompletionsBody
    {
        public required string Model { get; init; }
        public required IReadOnlyList<ChatMessage> Messages { get; init; }
        [JsonPropertyName("max_tokens")] public int MaxTokens { get; init; }
        public double Temperature { get; init; }
        public IReadOnlyList<ToolDefinition>? Tools { get; init; }
        [JsonPropertyName("tool_choice")] public string? ToolChoice { get; init; }
        public bool? Stream { get; init; }
    }

    private sealed record ChatCompletionsResponse
    {
        public List<ChoiceDto>? Choices { get; init; }
        public Dictionary<string, object?>? Usage { get; init; }
    }

    private sealed record ChoiceDto
    {
        public MessageDto? Message { get; init; }
        [JsonPropertyName("finish_reason")] public string? FinishReason { get; init; }
    }

    private sealed record MessageDto
    {
        public string? Content { get; init; }
        [JsonPropertyName("tool_calls")] public List<ToolCallDto>? ToolCalls { get; init; }
    }

    private sealed record ToolCallDto
    {
        public string? Id { get; init; }
        public ToolCallFunctionDto? Function { get; init; }
    }

    private sealed record ToolCallFunctionDto
    {
        public string? Name { get; init; }
        public string? Arguments { get; init; }
    }

    private sealed record StreamEvent
    {
        public List<StreamChoiceDto>? Choices { get; init; }
        public Dictionary<string, object?>? Usage { get; init; }
    }

    private sealed record StreamChoiceDto
    {
        public StreamDeltaDto? Delta { get; init; }
        [JsonPropertyName("finish_reason")] public string? FinishReason { get; init; }
    }

    private sealed record StreamDeltaDto
    {
        public string? Content { get; init; }
        [JsonPropertyName("tool_calls")] public List<StreamToolCallDto>? ToolCalls { get; init; }
    }

    private sealed record StreamToolCallDto
    {
        public int? Index { get; init; }
        public string? Id { get; init; }
        public ToolCallFunctionDto? Function { get; init; }
    }

    private sealed class PendingToolCall
    {
        public string? Id { get; set; }
        public string? Name { get; set; }
        public System.Text.StringBuilder Arguments { get; } = new();
    }
}
