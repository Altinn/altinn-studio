using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.TypedHttpClients.Operator.Models;
using Microsoft.AspNetCore.WebUtilities;

namespace Altinn.Studio.Designer.TypedHttpClients.Operator;

/// <summary>
/// Calls the core-operator's run API over an <see cref="HttpClient"/> whose base address is the run API and whose
/// handlers authenticate the request.
/// </summary>
internal sealed class OperatorClient(HttpClient httpClient) : IOperatorClient
{
    /// <summary>
    /// The longest the operator waits for a run's status to change before it answers.
    /// </summary>
    public const int MaxWaitSeconds = 30;

    private const string KindsPath = "api/v1/kinds";
    private const string RunsPath = "api/v1/runs";
    private const string JsonMediaType = "application/json";
    private const string GzipMediaType = "application/gzip";

    // Proxies in front of the operator can answer with a page of HTML.
    private const int MaxErrorBodyLength = 1000;

    private static readonly JsonSerializerOptions s_jsonOptions = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    /// <inheritdoc />
    public async Task<IReadOnlyList<Kind>> ListKinds(CancellationToken cancellationToken = default)
    {
        using var response = await httpClient.GetAsync(KindsPath, cancellationToken);
        var kinds = await ReadResponse<KindList>(response, cancellationToken);
        return kinds.Kinds;
    }

    /// <inheritdoc />
    public async Task<CreateRunResponse> CreateRun(
        string kind,
        RunSource source,
        IReadOnlyDictionary<string, string>? args = null,
        CancellationToken cancellationToken = default
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(kind);
        ArgumentNullException.ThrowIfNull(source);

        // JSON defines no charset parameter, so the body goes without the one JsonContent would add.
        using var content = new ByteArrayContent(
            JsonSerializer.SerializeToUtf8Bytes(
                new CreateRunRequest(kind, source, args is { Count: > 0 } ? args : null),
                s_jsonOptions
            )
        );
        content.Headers.ContentType = new MediaTypeHeaderValue(JsonMediaType);

        using var response = await httpClient.PostAsync(RunsPath, content, cancellationToken);
        var run = await ReadResponse<Run>(response, cancellationToken);
        // 202 for a new run, 200 for the run of this kind for this source that is already in progress.
        return new CreateRunResponse(run, Created: response.StatusCode == HttpStatusCode.Accepted);
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<Run>> FindRuns(RunFilter filter, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(filter);

        var query = FindRunsQuery(filter);
        if (query.Count == 0)
        {
            throw new ArgumentException("Set at least one value of the filter.", nameof(filter));
        }

        using var response = await httpClient.GetAsync(QueryHelpers.AddQueryString(RunsPath, query), cancellationToken);
        var runs = await ReadResponse<RunList>(response, cancellationToken);
        return runs.Runs;
    }

    /// <inheritdoc />
    public async Task<Run> GetRun(Guid runId, int waitSeconds = 0, CancellationToken cancellationToken = default)
    {
        ArgumentOutOfRangeException.ThrowIfNegative(waitSeconds);
        ArgumentOutOfRangeException.ThrowIfGreaterThan(waitSeconds, MaxWaitSeconds);

        string path = waitSeconds == 0 ? RunPath(runId) : $"{RunPath(runId)}?wait={waitSeconds}";
        using var response = await httpClient.GetAsync(path, cancellationToken);
        return await ReadResponse<Run>(response, cancellationToken);
    }

    /// <inheritdoc />
    public async Task<Run> UploadArchive(Guid runId, Stream archive, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(archive);

        // Not disposed: that would dispose the caller's archive stream with the content that wraps it.
        var content = new StreamContent(archive);
        content.Headers.ContentType = new MediaTypeHeaderValue(GzipMediaType);

        using var response = await httpClient.PutAsync($"{RunPath(runId)}/archive", content, cancellationToken);
        return await ReadResponse<Run>(response, cancellationToken);
    }

    /// <inheritdoc />
    public async Task<RunResult> GetRunResult(Guid runId, CancellationToken cancellationToken = default)
    {
        using var response = await httpClient.GetAsync($"{RunPath(runId)}/result", cancellationToken);
        return await ReadResponse<RunResult>(response, cancellationToken);
    }

    /// <inheritdoc />
    public async Task<Run> CancelRun(Guid runId, CancellationToken cancellationToken = default)
    {
        using var response = await httpClient.PostAsync($"{RunPath(runId)}/cancel", content: null, cancellationToken);
        return await ReadResponse<Run>(response, cancellationToken);
    }

    private static string RunPath(Guid runId) => $"{RunsPath}/{runId:D}";

    private static List<KeyValuePair<string, string?>> FindRunsQuery(RunFilter filter) =>
        new KeyValuePair<string, string?>[]
        {
            new("org", filter.Org),
            new("app", filter.App),
            new("repoOwner", filter.RepoOwner),
            new("repo", filter.Repo),
            new("commit", filter.Commit),
            new("kind", filter.Kind),
        }
            .Where(parameter => !string.IsNullOrEmpty(parameter.Value))
            .ToList();

    private static async Task<T> ReadResponse<T>(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        if (!response.IsSuccessStatusCode)
        {
            throw await CreateException(response, cancellationToken);
        }

        return await response.Content.ReadFromJsonAsync<T>(s_jsonOptions, cancellationToken)
            ?? throw new InvalidOperationException($"core-operator answered {typeof(T).Name} with null.");
    }

    private static async Task<OperatorException> CreateException(
        HttpResponseMessage response,
        CancellationToken cancellationToken
    )
    {
        string body = await response.Content.ReadAsStringAsync(cancellationToken);
        Problem? problem = TryReadProblem(response.Content.Headers.ContentType?.MediaType, body);
        if (problem is not null)
        {
            return new OperatorException(response.StatusCode, problem.Title, problem.Detail);
        }

        string? detail =
            string.IsNullOrWhiteSpace(body) ? null
            : body.Length > MaxErrorBodyLength ? body[..MaxErrorBodyLength]
            : body;
        return new OperatorException(response.StatusCode, title: null, detail);
    }

    private static Problem? TryReadProblem(string? mediaType, string body)
    {
        if (mediaType is null || !mediaType.EndsWith("json", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        try
        {
            return JsonSerializer.Deserialize<Problem>(body, s_jsonOptions);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private sealed record KindList(IReadOnlyList<Kind> Kinds);

    private sealed record RunList(IReadOnlyList<Run> Runs);

    private sealed record CreateRunRequest(string Kind, RunSource Source, IReadOnlyDictionary<string, string>? Args);

    // RFC 9457 problem details, with the members the exception carries.
    private sealed record Problem(string? Title, string? Detail);
}
