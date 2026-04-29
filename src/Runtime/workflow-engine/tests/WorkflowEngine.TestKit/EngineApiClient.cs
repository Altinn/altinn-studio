using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using WorkflowEngine.Models;

namespace WorkflowEngine.TestKit;

/// <summary>
/// Typed wrapper around <see cref="HttpClient"/> for the workflow-engine REST API.
/// Handles serialization, path building, and status-polling.
/// </summary>
public sealed class EngineApiClient : IDisposable
{
    private readonly HttpClient _client;
    private readonly string _defaultNamespace;

    public EngineApiClient(EngineAppFixture fixture, params DelegatingHandler[] handlers)
        : this(fixture, DefaultNamespace, handlers) { }

    public EngineApiClient(EngineAppFixture fixture, string defaultNamespace, params DelegatingHandler[] handlers)
    {
        _defaultNamespace = defaultNamespace;
        _client = handlers.Length > 0 ? fixture.CreateEngineClient(handlers) : fixture.CreateEngineClient();
    }

    public static string DefaultNamespace => $"{EngineAppFixture.DefaultOrg}:{EngineAppFixture.DefaultApp}";

    private string GetBasePath(string? ns = null) =>
        $"/api/v1/{Uri.EscapeDataString(ns ?? _defaultNamespace)}/workflows";

    /// <summary>
    /// Enqueues a batch and asserts a 2xx response. Throws on failure.
    /// Uses <see cref="DefaultNamespace"/> and a unique idempotency key if not specified.
    /// Pass an explicit <paramref name="idempotencyKey"/> when testing idempotent resubmission.
    /// </summary>
    /// <param name="request">The workflow batch to enqueue.</param>
    /// <param name="ns">Optional namespace override. Uses <see cref="DefaultNamespace"/> when omitted.</param>
    /// <param name="idempotencyKey">Optional request key for idempotent enqueue semantics. Distinct from <paramref name="collectionKey"/>.</param>
    /// <param name="collectionKey">Optional collection identifier used to group batches into the same workflow collection. Omit or pass <see langword="null"/> for no collection.</param>
    public async Task<WorkflowEnqueueResponse.Accepted> Enqueue(
        WorkflowEnqueueRequest request,
        string? ns = null,
        string? idempotencyKey = null,
        string? collectionKey = null
    )
    {
        using var response = await EnqueueRaw(request, ns, idempotencyKey, collectionKey);
        return await AssertSuccessAndDeserialize<WorkflowEnqueueResponse.Accepted>(response);
    }

    /// <summary>
    /// Enqueues a batch from raw JSON and asserts a 2xx response. Throws on failure.
    /// Uses <see cref="DefaultNamespace"/> and a unique idempotency key if not specified.
    /// Pass an explicit <paramref name="idempotencyKey"/> when testing idempotent resubmission.
    /// </summary>
    /// <param name="jsonRequest">The raw JSON payload to enqueue.</param>
    /// <param name="ns">Optional namespace override. Uses <see cref="DefaultNamespace"/> when omitted.</param>
    /// <param name="idempotencyKey">Optional request key for idempotent enqueue semantics. Distinct from <paramref name="collectionKey"/>.</param>
    /// <param name="collectionKey">Optional collection identifier used to group batches into the same workflow collection. Omit or pass <see langword="null"/> for no collection.</param>
    public async Task<WorkflowEnqueueResponse.Accepted> Enqueue(
        string jsonRequest,
        string? ns = null,
        string? idempotencyKey = null,
        string? collectionKey = null
    )
    {
        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, GetBasePath(ns))
        {
            Content = new StringContent(jsonRequest, Encoding.UTF8, "application/json"),
        };
        AddMetadataHeaders(httpRequest.Headers, idempotencyKey, collectionKey);

        using var response = await _client.SendAsync(httpRequest);
        return await AssertSuccessAndDeserialize<WorkflowEnqueueResponse.Accepted>(response);
    }

    /// <summary>
    /// Enqueues a batch and returns the raw <see cref="HttpResponseMessage"/>.
    /// Uses <see cref="DefaultNamespace"/> and a unique idempotency key if not specified.
    /// </summary>
    /// <param name="request">The workflow batch to enqueue.</param>
    /// <param name="ns">Optional namespace override. Uses <see cref="DefaultNamespace"/> when omitted.</param>
    /// <param name="idempotencyKey">Optional request key for idempotent enqueue semantics. Distinct from <paramref name="collectionKey"/>.</param>
    /// <param name="collectionKey">Optional collection identifier used to group batches into the same workflow collection. Omit or pass <see langword="null"/> for no collection.</param>
    public async Task<HttpResponseMessage> EnqueueRaw(
        WorkflowEnqueueRequest request,
        string? ns = null,
        string? idempotencyKey = null,
        string? collectionKey = null
    )
    {
        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, GetBasePath(ns))
        {
            Content = new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json"),
        };
        AddMetadataHeaders(httpRequest.Headers, idempotencyKey, collectionKey);

        return await _client.SendAsync(httpRequest);
    }

    /// <summary>
    /// Enqueues a batch using query parameters (instead of headers) for metadata.
    /// Produces more copy-pastable HTTP exchanges for developer documentation.
    /// </summary>
    /// <param name="request">The workflow batch to enqueue.</param>
    /// <param name="ns">Optional namespace override. Uses <see cref="DefaultNamespace"/> when omitted.</param>
    /// <param name="idempotencyKey">Optional request key for idempotent enqueue semantics. Distinct from <paramref name="collectionKey"/>.</param>
    /// <param name="collectionKey">Optional collection identifier used to group batches into the same workflow collection. Omit or pass <see langword="null"/> for no collection.</param>
    public async Task<WorkflowEnqueueResponse.Accepted> EnqueueWithQueryParams(
        WorkflowEnqueueRequest request,
        string? ns = null,
        string? idempotencyKey = null,
        string? collectionKey = null
    )
    {
        using var response = await EnqueueRawWithQueryParams(request, ns, idempotencyKey, collectionKey);
        return await AssertSuccessAndDeserialize<WorkflowEnqueueResponse.Accepted>(response);
    }

    /// <summary>
    /// Enqueues a batch using query parameters (instead of headers) for metadata.
    /// Returns the raw <see cref="HttpResponseMessage"/>.
    /// </summary>
    /// <param name="request">The workflow batch to enqueue.</param>
    /// <param name="ns">Optional namespace override. Uses <see cref="DefaultNamespace"/> when omitted.</param>
    /// <param name="idempotencyKey">Optional request key for idempotent enqueue semantics. Distinct from <paramref name="collectionKey"/>.</param>
    /// <param name="collectionKey">Optional collection identifier used to group batches into the same workflow collection. Omit or pass <see langword="null"/> for no collection.</param>
    public async Task<HttpResponseMessage> EnqueueRawWithQueryParams(
        WorkflowEnqueueRequest request,
        string? ns = null,
        string? idempotencyKey = null,
        string? collectionKey = null
    )
    {
        var qs = BuildMetadataQueryString(idempotencyKey, collectionKey);
        var path = string.IsNullOrEmpty(qs) ? GetBasePath(ns) : $"{GetBasePath(ns)}?{qs}";

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, path)
        {
            Content = new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json"),
        };

        return await _client.SendAsync(httpRequest);
    }

    /// <summary>
    /// Gets a workflow status and returns the raw <see cref="HttpResponseMessage"/>.
    /// </summary>
    public Task<HttpResponseMessage> GetWorkflowRaw(Guid workflowId) =>
        _client.GetAsync($"{GetBasePath()}/{workflowId}", CancellationToken.None);

    /// <summary>
    /// Gets a workflow status and returns either a parsed result or <c>null</c> on 404.
    /// </summary>
    public async Task<WorkflowStatusResponse?> GetWorkflow(Guid workflowId)
    {
        using var response = await GetWorkflowRaw(workflowId);

        if (response.StatusCode == HttpStatusCode.NotFound)
            return null;

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync();
            throw new HttpRequestException(
                $"GetWorkflow returned {(int)response.StatusCode} {response.StatusCode}: {body}",
                inner: null,
                statusCode: response.StatusCode
            );
        }

        return await AssertSuccessAndDeserialize<WorkflowStatusResponse>(response);
    }

    /// <summary>
    /// Requests cancellation of a workflow and returns the raw <see cref="HttpResponseMessage"/>.
    /// </summary>
    public Task<HttpResponseMessage> CancelWorkflowRaw(Guid workflowId, string? ns = null) =>
        _client.PostAsync($"{GetBasePath(ns)}/{workflowId}/cancel", content: null);

    /// <summary>
    /// Requests cancellation of a workflow and asserts a 2xx response. Throws on failure.
    /// </summary>
    public async Task<CancelWorkflowResponse> CancelWorkflow(Guid workflowId, string? ns = null)
    {
        using var response = await CancelWorkflowRaw(workflowId, ns);
        return await AssertSuccessAndDeserialize<CancelWorkflowResponse>(response);
    }

    /// <summary>
    /// Requests resume of a workflow and returns the raw <see cref="HttpResponseMessage"/>.
    /// </summary>
    public Task<HttpResponseMessage> ResumeWorkflowRaw(Guid workflowId, bool cascade = false, string? ns = null) =>
        _client.PostAsync($"{GetBasePath(ns)}/{workflowId}/resume?cascade={cascade}", content: null);

    /// <summary>
    /// Requests resume of a workflow and asserts a 2xx response. Throws on failure.
    /// </summary>
    public async Task<ResumeWorkflowResponse> ResumeWorkflow(Guid workflowId, bool cascade = false, string? ns = null)
    {
        using var response = await ResumeWorkflowRaw(workflowId, cascade, ns);
        return await AssertSuccessAndDeserialize<ResumeWorkflowResponse>(response);
    }

    /// <summary>
    /// Lists active workflows with cursor-based pagination. Returns the full paginated response or an empty one on 204 No Content.
    /// </summary>
    public async Task<PaginatedResponse<WorkflowStatusResponse>> ListActiveWorkflowsPaginated(
        Guid? cursor = null,
        int? pageSize = null,
        string? ns = null
    )
    {
        var qs = new List<string>();
        if (cursor.HasValue)
            qs.Add($"cursor={cursor.Value}");
        if (pageSize.HasValue)
            qs.Add($"pageSize={pageSize.Value}");

        var path = qs.Count > 0 ? $"{GetBasePath(ns)}?{string.Join("&", qs)}" : GetBasePath(ns);
        using var response = await _client.GetAsync(path);

        if (response.StatusCode == HttpStatusCode.NoContent)
            return new PaginatedResponse<WorkflowStatusResponse>
            {
                Data = [],
                PageSize = pageSize ?? 25,
                TotalCount = 0,
            };

        return await AssertSuccessAndDeserialize<PaginatedResponse<WorkflowStatusResponse>>(response);
    }

    /// <summary>
    /// Lists all active workflows by iterating through every page using cursor-based pagination.
    /// Convenience wrapper around <see cref="ListActiveWorkflowsPaginated"/> that returns the full dataset.
    /// </summary>
    public async Task<List<WorkflowStatusResponse>> ListActiveWorkflows(string? ns = null)
    {
        var all = new List<WorkflowStatusResponse>();
        Guid? cursor = null;

        while (true)
        {
            var result = await ListActiveWorkflowsPaginated(cursor: cursor, ns: ns);
            all.AddRange(result.Data);

            if (result.NextCursor is null)
                return all;

            cursor = result.NextCursor;
        }
    }

    /// <summary>
    /// Polls <see cref="GetWorkflow(Guid)"/> every 100 ms until the workflow reaches
    /// <paramref name="expectedStatus"/> or the <paramref name="timeout"/> expires.
    /// </summary>
    public async Task<WorkflowStatusResponse> WaitForWorkflowStatus(
        Guid workflowId,
        PersistentItemStatus expectedStatus,
        TimeSpan? timeout = null
    )
    {
        using var cts = new CancellationTokenSource(timeout ?? TimeSpan.FromSeconds(15));

        while (true)
        {
            cts.Token.ThrowIfCancellationRequested();

            var workflow = await GetWorkflow(workflowId);
            if (workflow?.OverallStatus == expectedStatus)
                return workflow;

            await Task.Delay(100, cts.Token);
        }
    }

    /// <summary>
    /// Waits for all workflows in <paramref name="workflowIds"/> to reach
    /// <paramref name="expectedStatus"/> concurrently or the <paramref name="timeout"/> expires.
    /// </summary>
    public async Task<List<WorkflowStatusResponse>> WaitForWorkflowStatus(
        IEnumerable<Guid> workflowIds,
        PersistentItemStatus expectedStatus,
        TimeSpan? timeout = null
    )
    {
        var tasks = workflowIds.Select(id => WaitForWorkflowStatus(id, expectedStatus, timeout));
        return [.. await Task.WhenAll(tasks)];
    }

    private static void AddMetadataHeaders(HttpRequestHeaders headers, string? idempotencyKey, string? collectionKey)
    {
        headers.Add(WorkflowMetadataConstants.Headers.IdempotencyKey, idempotencyKey ?? $"idem-{Guid.NewGuid()}");
        if (collectionKey is not null)
            headers.Add(WorkflowMetadataConstants.Headers.CollectionKey, collectionKey);
    }

    private static string BuildMetadataQueryString(string? idempotencyKey, string? collectionKey)
    {
        var qs = new List<string>
        {
            $"{WorkflowMetadataConstants.QueryParams.IdempotencyKey}={Uri.EscapeDataString(idempotencyKey ?? $"idem-{Guid.NewGuid()}")}",
        };
        if (collectionKey is not null)
            qs.Add($"{WorkflowMetadataConstants.QueryParams.CollectionKey}={Uri.EscapeDataString(collectionKey)}");
        return string.Join("&", qs);
    }

    public static async Task<T> AssertSuccessAndDeserialize<T>(HttpResponseMessage response)
    {
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException(
                $"Request failed with status code {response.StatusCode}: {await response.Content.ReadAsStringAsync()}"
            );

        var content = await response.Content.ReadFromJsonAsync<T>();
        Assert.NotNull(content);

        return content;
    }

    public void Dispose() => _client.Dispose();
}
