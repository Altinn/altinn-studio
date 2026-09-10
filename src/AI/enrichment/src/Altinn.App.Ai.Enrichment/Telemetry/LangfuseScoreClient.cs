using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Ai.Enrichment.Configuration;
using Microsoft.Extensions.Options;

namespace Altinn.App.Ai.Enrichment.Telemetry;

/// <summary>
/// A judgement attached to a traced run — typically a caseworker's verdict on
/// whether the model got it right.
/// </summary>
public sealed record LangfuseScore
{
    /// <summary>
    /// Client-chosen id. Re-sending the same id overwrites the previous score rather
    /// than adding a second one, which is what makes re-importing a corrected
    /// spreadsheet safe. Derive it from something stable, e.g.
    /// <c>$"backfill-{instanceGuid}-{name}"</c>.
    /// </summary>
    public required string Id { get; init; }

    public required string TraceId { get; init; }

    /// <summary>Score name, e.g. <c>saksbehandler_vurdering</c>. Groups scores in the UI.</summary>
    public required string Name { get; init; }

    public required double Value { get; init; }

    /// <summary><c>BOOLEAN</c>, <c>NUMERIC</c> or <c>CATEGORICAL</c>. Defaults to Langfuse's own inference.</summary>
    public string? DataType { get; init; }

    public string? Comment { get; init; }
}

/// <summary>
/// Writes evaluation results back onto traces, and finds the traces to write them to.
///
/// This is the other half of the loop the tracing exists for: a run is traced when it
/// happens, and judged later — often much later, and in bulk from a spreadsheet of
/// instance ids. Traces are addressed by session id, which is the instance id, so a
/// caseworker's verdict needs nothing the app does not already have.
/// </summary>
public interface ILangfuseScoreClient
{
    /// <summary>
    /// Trace ids for one submission, newest first. More than one means the run was
    /// retried or replayed.
    /// </summary>
    Task<IReadOnlyList<string>> FindTraceIdsBySession(string sessionId, CancellationToken cancellationToken = default);

    /// <summary>Creates or overwrites a score. Returns false when Langfuse rejected it.</summary>
    Task<bool> CreateScore(LangfuseScore score, CancellationToken cancellationToken = default);

    /// <summary>Removes a score by id, e.g. to clear a mistaken import.</summary>
    Task<bool> DeleteScore(string scoreId, CancellationToken cancellationToken = default);
}

/// <inheritdoc />
public sealed class LangfuseScoreClient(
    IHttpClientFactory httpClientFactory,
    IOptions<LangfuseOptions> options,
    ILangfuseKeyProvider keyProvider,
    ILogger<LangfuseScoreClient> logger) : ILangfuseScoreClient
{
    public const string HttpClientName = "ai-enrichment-langfuse";

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        // Langfuse's API is camelCase throughout. Naming every property by attribute
        // invites exactly the bug where one is forgotten and ships as PascalCase.
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    public async Task<IReadOnlyList<string>> FindTraceIdsBySession(
        string sessionId,
        CancellationToken cancellationToken = default)
    {
        var client = await CreateClient(cancellationToken);
        if (client is null)
            return [];

        using var _ = client;
        try
        {
            using var response = await client.GetAsync(
                $"api/public/traces?sessionId={Uri.EscapeDataString(sessionId)}",
                cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning(
                    "Langfuse trace lookup for session {SessionId} failed: HTTP {StatusCode}",
                    sessionId, (int)response.StatusCode);
                return [];
            }

            using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
            if (!document.RootElement.TryGetProperty("data", out var data) || data.ValueKind != JsonValueKind.Array)
                return [];

            return data.EnumerateArray()
                .Select(trace => trace.TryGetProperty("id", out var id) ? id.GetString() : null)
                .Where(id => !string.IsNullOrEmpty(id))
                .Select(id => id!)
                .ToList();
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(ex, "Langfuse trace lookup for session {SessionId} failed", sessionId);
            return [];
        }
    }

    public async Task<bool> CreateScore(LangfuseScore score, CancellationToken cancellationToken = default)
    {
        var client = await CreateClient(cancellationToken);
        if (client is null)
            return false;

        using var _ = client;
        try
        {
            var body = new ScoreBody
            {
                Id = score.Id,
                TraceId = score.TraceId,
                Name = score.Name,
                Value = score.Value,
                DataType = score.DataType,
                Comment = score.Comment,
            };

            using var response = await client.PostAsJsonAsync("api/public/scores", body, JsonOpts, cancellationToken);
            if (response.IsSuccessStatusCode)
                return true;

            logger.LogWarning(
                "Langfuse rejected score '{ScoreId}' on trace {TraceId}: HTTP {StatusCode} {Body}",
                score.Id, score.TraceId, (int)response.StatusCode,
                await response.Content.ReadAsStringAsync(cancellationToken));
            return false;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(ex, "Could not write Langfuse score '{ScoreId}'", score.Id);
            return false;
        }
    }

    public async Task<bool> DeleteScore(string scoreId, CancellationToken cancellationToken = default)
    {
        var client = await CreateClient(cancellationToken);
        if (client is null)
            return false;

        using var _ = client;
        try
        {
            using var response = await client.DeleteAsync($"api/public/scores/{Uri.EscapeDataString(scoreId)}", cancellationToken);
            if (response.IsSuccessStatusCode)
                return true;

            logger.LogWarning("Could not delete Langfuse score '{ScoreId}': HTTP {StatusCode}", scoreId, (int)response.StatusCode);
            return false;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(ex, "Could not delete Langfuse score '{ScoreId}'", scoreId);
            return false;
        }
    }

    /// <summary>
    /// Null when Langfuse is not configured — callers treat that as "no scores", never
    /// as an error, so an app without tracing can still call this unconditionally.
    /// </summary>
    private async Task<HttpClient?> CreateClient(CancellationToken cancellationToken)
    {
        var opts = options.Value;
        if (string.IsNullOrWhiteSpace(opts.Host) || string.IsNullOrWhiteSpace(opts.PublicKey))
            return null;

        var secretKey = await keyProvider.GetSecretKeyAsync(cancellationToken);
        if (string.IsNullOrWhiteSpace(secretKey))
            return null;

        var client = httpClientFactory.CreateClient(HttpClientName);
        client.BaseAddress = new Uri(opts.Host.TrimEnd('/') + "/");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Basic",
            Convert.ToBase64String(Encoding.UTF8.GetBytes($"{opts.PublicKey}:{secretKey}")));
        return client;
    }

    private sealed record ScoreBody
    {
        public required string Id { get; init; }
        public required string TraceId { get; init; }
        public required string Name { get; init; }
        public required double Value { get; init; }
        public string? DataType { get; init; }
        public string? Comment { get; init; }
    }
}
