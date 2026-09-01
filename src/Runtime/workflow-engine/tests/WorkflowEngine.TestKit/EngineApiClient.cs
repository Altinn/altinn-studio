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

    public static string DefaultNamespace => $"{EngineAppFixture.DefaultOrg}-{EngineAppFixture.DefaultApp}";

    private string GetBasePath(string? ns = null) =>
        $"/api/v1/{Uri.EscapeDataString(ns ?? _defaultNamespace)}/workflows";

    private string GetCollectionsBasePath(string? ns = null) =>
        $"/api/v1/{Uri.EscapeDataString(ns ?? _defaultNamespace)}/collections";

    private string GetMailboxesBasePath(string? ns = null) =>
        $"/api/v1/{Uri.EscapeDataString(ns ?? _defaultNamespace)}/mailboxes";

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
    public Task<HttpResponseMessage> GetWorkflowRaw(Guid workflowId, string? ns = null) =>
        _client.GetAsync($"{GetBasePath(ns)}/{workflowId}", CancellationToken.None);

    /// <summary>
    /// Gets a workflow status and returns either a parsed result or <c>null</c> on 404.
    /// </summary>
    public async Task<WorkflowStatusResponse?> GetWorkflow(Guid workflowId, string? ns = null)
    {
        using var response = await GetWorkflowRaw(workflowId, ns);

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
    /// Gets a workflow dependency graph and returns the raw <see cref="HttpResponseMessage"/>.
    /// </summary>
    public Task<HttpResponseMessage> GetWorkflowDependencyGraphRaw(Guid workflowId, string? ns = null) =>
        _client.GetAsync($"{GetBasePath(ns)}/{workflowId}/dependency-graph", CancellationToken.None);

    /// <summary>
    /// Gets a workflow dependency graph and returns either a parsed result or <c>null</c> on 404.
    /// </summary>
    public async Task<WorkflowDependencyGraphResponse?> GetWorkflowDependencyGraph(Guid workflowId, string? ns = null)
    {
        using var response = await GetWorkflowDependencyGraphRaw(workflowId, ns);

        if (response.StatusCode == HttpStatusCode.NotFound)
            return null;

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync();
            throw new HttpRequestException(
                $"GetWorkflowDependencyGraph returned {(int)response.StatusCode} {response.StatusCode}: {body}",
                inner: null,
                statusCode: response.StatusCode
            );
        }

        return await AssertSuccessAndDeserialize<WorkflowDependencyGraphResponse>(response);
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
    /// Requests abandonment of a workflow and returns the raw <see cref="HttpResponseMessage"/>.
    /// </summary>
    public Task<HttpResponseMessage> AbandonWorkflowRaw(Guid workflowId, string? ns = null) =>
        _client.PostAsync($"{GetBasePath(ns)}/{workflowId}/abandon", content: null);

    /// <summary>
    /// Abandons a workflow and asserts a 2xx response. Throws on failure.
    /// </summary>
    public async Task<AbandonWorkflowResponse> AbandonWorkflow(Guid workflowId, string? ns = null)
    {
        using var response = await AbandonWorkflowRaw(workflowId, ns);
        return await AssertSuccessAndDeserialize<AbandonWorkflowResponse>(response);
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
    /// Issues a raw GET to the workflows list endpoint with the supplied query string
    /// (e.g. <c>"?status=failed"</c>). Used to exercise binding/validation directly.
    /// </summary>
    public Task<HttpResponseMessage> ListWorkflowsRaw(string queryString = "", string? ns = null) =>
        _client.GetAsync($"{GetBasePath(ns)}{queryString}", CancellationToken.None);

    /// <summary>
    /// Lists workflows with cursor-based pagination. Returns the full paginated response or an empty one on 204 No Content.
    /// </summary>
    public async Task<PaginatedResponse<WorkflowStatusResponse>> ListWorkflowsPaginated(
        Guid? cursor = null,
        int? pageSize = null,
        IReadOnlyList<PersistentItemStatus>? statuses = null,
        string? ns = null,
        bool? isHead = null
    )
    {
        var qs = new List<string>();
        if (cursor.HasValue)
            qs.Add($"cursor={cursor.Value}");
        if (pageSize.HasValue)
            qs.Add($"pageSize={pageSize.Value}");
        if (statuses is not null)
        {
            foreach (var status in statuses)
                qs.Add($"status={status}");
        }
        if (isHead.HasValue)
            qs.Add($"isHead={(isHead.Value ? "true" : "false")}");

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
    /// Lists all workflows by iterating through every page using cursor-based pagination.
    /// Convenience wrapper around <see cref="ListWorkflowsPaginated"/> that returns the full dataset.
    /// </summary>
    public async Task<List<WorkflowStatusResponse>> ListWorkflows(
        IReadOnlyList<PersistentItemStatus>? statuses = null,
        string? ns = null
    )
    {
        var all = new List<WorkflowStatusResponse>();
        Guid? cursor = null;

        while (true)
        {
            var result = await ListWorkflowsPaginated(cursor: cursor, statuses: statuses, ns: ns);
            all.AddRange(result.Data);

            if (result.NextCursor is null)
                return all;

            cursor = result.NextCursor;
        }
    }

    public Task<PaginatedResponse<WorkflowStatusResponse>> ListActiveWorkflowsPaginated(
        Guid? cursor = null,
        int? pageSize = null,
        string? ns = null
    ) =>
        ListWorkflowsPaginated(
            cursor,
            pageSize,
            [PersistentItemStatus.Enqueued, PersistentItemStatus.Processing, PersistentItemStatus.Requeued],
            ns
        );

    public Task<List<WorkflowStatusResponse>> ListActiveWorkflows(string? ns = null) =>
        ListWorkflows(
            [PersistentItemStatus.Enqueued, PersistentItemStatus.Processing, PersistentItemStatus.Requeued],
            ns
        );

    /// <summary>
    /// Lists workflow collections with cursor-based pagination. Returns the full paginated response
    /// or an empty one on 204 No Content. <paramref name="keys"/> selects annotate mode,
    /// <paramref name="failures"/> discover mode (see the endpoint description for the mode matrix).
    /// </summary>
    public async Task<WorkflowCollectionListResponse> ListCollectionsPaginated(
        string? ns = null,
        string? cursor = null,
        int? pageSize = null,
        IReadOnlyList<string>? keys = null,
        string? failures = null
    )
    {
        var qs = new List<string>();
        if (cursor is not null)
            qs.Add($"cursor={Uri.EscapeDataString(cursor)}");
        if (pageSize.HasValue)
            qs.Add($"pageSize={pageSize.Value}");
        if (keys is not null)
        {
            foreach (var key in keys)
                qs.Add($"key={Uri.EscapeDataString(key)}");
        }
        if (failures is not null)
            qs.Add($"failures={Uri.EscapeDataString(failures)}");

        var basePath = GetCollectionsBasePath(ns);
        var path = qs.Count > 0 ? $"{basePath}?{string.Join("&", qs)}" : basePath;
        using var response = await _client.GetAsync(path);

        if (response.StatusCode == HttpStatusCode.NoContent)
            return new WorkflowCollectionListResponse
            {
                Data = [],
                PageSize = pageSize ?? 25,
                TotalCount = 0,
            };

        return await AssertSuccessAndDeserialize<WorkflowCollectionListResponse>(response);
    }

    /// <summary>
    /// Lists all workflow collections in the namespace by iterating through every page.
    /// Convenience wrapper around <see cref="ListCollectionsPaginated"/>.
    /// </summary>
    public async Task<IReadOnlyList<WorkflowCollectionResponse>> ListCollections(string? ns = null)
    {
        var all = new List<WorkflowCollectionResponse>();
        string? cursor = null;

        while (true)
        {
            var result = await ListCollectionsPaginated(ns, cursor: cursor);
            all.AddRange(result.Data);

            if (result.NextCursor is null)
                return all;

            cursor = result.NextCursor;
        }
    }

    /// <summary>
    /// Issues a raw GET to the collections list endpoint with the supplied query string
    /// (e.g. <c>"?failures=bogus"</c>). Used to exercise binding/validation directly.
    /// The first parameter is the query string, not a namespace — use <paramref name="ns"/>
    /// (named) to target another namespace, and <see cref="GetCollectionRaw"/> for the detail
    /// endpoint.
    /// </summary>
    public Task<HttpResponseMessage> ListCollectionsRaw(string? queryString = null, string? ns = null) =>
        _client.GetAsync($"{GetCollectionsBasePath(ns)}{queryString}", CancellationToken.None);

    /// <summary>
    /// Issues a raw GET to the collection detail endpoint for <paramref name="key"/>.
    /// </summary>
    public Task<HttpResponseMessage> GetCollectionRaw(string key, string? ns = null) =>
        _client.GetAsync($"{GetCollectionsBasePath(ns)}/{Uri.EscapeDataString(key)}", CancellationToken.None);

    /// <summary>
    /// Gets a single workflow collection by key, including head statuses. Returns <see langword="null"/> on 404.
    /// </summary>
    public async Task<WorkflowCollectionDetailResponse?> GetCollection(string key, string? ns = null)
    {
        using var response = await _client.GetAsync($"{GetCollectionsBasePath(ns)}/{Uri.EscapeDataString(key)}");

        if (response.StatusCode == HttpStatusCode.NotFound)
            return null;

        return await AssertSuccessAndDeserialize<WorkflowCollectionDetailResponse>(response);
    }

    public Task<HttpResponseMessage> MintMailboxRaw(MailboxCreateRequest request, string? ns = null) =>
        _client.PostAsJsonAsync(GetMailboxesBasePath(ns), request);

    /// <summary>Mints from raw JSON, to exercise binding and validation directly.</summary>
    public async Task<HttpResponseMessage> MintMailboxRaw(string jsonRequest, string? ns = null)
    {
        using var content = new StringContent(jsonRequest, Encoding.UTF8, "application/json");
        return await _client.PostAsync(GetMailboxesBasePath(ns), content);
    }

    public async Task<MailboxResponse> MintMailbox(
        string idempotencyKey,
        TimeSpan timeout,
        string? collectionKey = null,
        string? ns = null
    )
    {
        using var response = await MintMailboxRaw(
            new MailboxCreateRequest
            {
                IdempotencyKey = idempotencyKey,
                Timeout = timeout,
                CollectionKey = collectionKey,
            },
            ns
        );
        return await AssertSuccessAndDeserialize<MailboxResponse>(response);
    }

    public Task<HttpResponseMessage> GetMailboxRaw(Guid mailboxId, string? ns = null) =>
        _client.GetAsync($"{GetMailboxesBasePath(ns)}/{mailboxId}", CancellationToken.None);

    public async Task<MailboxResponse?> GetMailbox(Guid mailboxId, string? ns = null)
    {
        using var response = await GetMailboxRaw(mailboxId, ns);

        if (response.StatusCode == HttpStatusCode.NotFound)
            return null;

        return await AssertSuccessAndDeserialize<MailboxResponse>(response);
    }

    public Task<HttpResponseMessage> CloseMailboxRaw(Guid mailboxId, string? ns = null) =>
        _client.DeleteAsync($"{GetMailboxesBasePath(ns)}/{mailboxId}", CancellationToken.None);

    /// <summary>
    /// Asserts 2xx — 202 when this call closed it, 200 on an idempotent repeat. Use
    /// <see cref="CloseMailboxRaw"/> when the distinction is what the test is about.
    /// </summary>
    public async Task<MailboxResponse> CloseMailbox(Guid mailboxId, string? ns = null)
    {
        using var response = await CloseMailboxRaw(mailboxId, ns);
        return await AssertSuccessAndDeserialize<MailboxResponse>(response);
    }

    public Task<HttpResponseMessage> DeliverToMailboxRaw(
        Guid mailboxId,
        MailboxDeliveryRequest request,
        string? ns = null
    ) => _client.PostAsJsonAsync($"{GetMailboxesBasePath(ns)}/{mailboxId}/deliveries", request);

    /// <summary>Delivers from raw JSON, to exercise binding and validation directly.</summary>
    public async Task<HttpResponseMessage> DeliverToMailboxRaw(Guid mailboxId, string jsonRequest, string? ns = null)
    {
        using var content = new StringContent(jsonRequest, Encoding.UTF8, "application/json");
        return await _client.PostAsync($"{GetMailboxesBasePath(ns)}/{mailboxId}/deliveries", content);
    }

    /// <summary>
    /// Asserts 2xx — 202 when this call appended it, 200 on an idempotent replay. Use the raw overload when
    /// the distinction is what the test is about.
    /// </summary>
    public async Task<MailboxDeliveryResponse> DeliverToMailbox(
        Guid mailboxId,
        string idempotencyKey,
        string payload = "{}",
        string? ns = null
    )
    {
        using var response = await DeliverToMailboxRaw(
            mailboxId,
            new MailboxDeliveryRequest { IdempotencyKey = idempotencyKey, Payload = payload },
            ns
        );
        return await AssertSuccessAndDeserialize<MailboxDeliveryResponse>(response);
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
