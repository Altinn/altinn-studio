using System.Net;
using System.Net.Http.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Internal.WorkflowEngine.Http;

/// <summary>
/// HTTP client for communicating with the workflow engine service.
/// </summary>
internal sealed class WorkflowEngineClient : IWorkflowEngineClient
{
    private const string IdempotencyKeyHeader = "Idempotency-Key";
    private const string CollectionKeyHeader = "Collection-Key";

    private readonly HttpClient _httpClient;
    private readonly PlatformSettings _platformSettings;
    private readonly ILogger<WorkflowEngineClient> _logger;

    public WorkflowEngineClient(
        HttpClient httpClient,
        IOptions<PlatformSettings> platformSettings,
        ILogger<WorkflowEngineClient> logger
    )
    {
        _httpClient = httpClient;
        _platformSettings = platformSettings.Value;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<WorkflowEnqueueResponse.Accepted> EnqueueWorkflows(
        string ns,
        string idempotencyKey,
        string? collectionKey,
        WorkflowEnqueueRequest request,
        CancellationToken ct = default
    )
    {
        string url = $"{GetWorkflowEngineEndpoint()}/{Uri.EscapeDataString(ns)}/workflows";
        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, url);
        httpRequest.Content = JsonContent.Create(request);
        httpRequest.Headers.Add(IdempotencyKeyHeader, idempotencyKey);

        if (!string.IsNullOrWhiteSpace(collectionKey))
        {
            httpRequest.Headers.Add(CollectionKeyHeader, collectionKey);
        }

        HttpResponseMessage response = await _httpClient.SendAsync(httpRequest, ct);
        if (!response.IsSuccessStatusCode)
        {
            string body = await response.Content.ReadAsStringAsync(ct);
            _logger.LogError(
                "Workflow engine enqueue failed with status {StatusCode}. URL: {Url}. Response body: {Body}",
                response.StatusCode,
                url,
                body
            );
        }
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<WorkflowEnqueueResponse.Accepted>(ct)
            ?? throw new InvalidOperationException(
                "The expected workflow enqueue response was not found in the response content."
            );
    }

    /// <inheritdoc />
    public async Task<WorkflowCollectionDetailResponse?> GetCollection(
        string ns,
        string key,
        CancellationToken ct = default
    )
    {
        string url =
            $"{GetWorkflowEngineEndpoint()}/{Uri.EscapeDataString(ns)}/collections/{Uri.EscapeDataString(key)}";
        using var httpRequest = new HttpRequestMessage(HttpMethod.Get, url);

        using HttpResponseMessage response = await _httpClient.SendAsync(httpRequest, ct);

        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }

        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<WorkflowCollectionDetailResponse>(ct)
            ?? throw new InvalidOperationException(
                "The expected workflow collection detail was not found in the response content."
            );
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<WorkflowStatusResponse>> ListWorkflows(
        string ns,
        string? collectionKey = null,
        Dictionary<string, string>? labels = null,
        IReadOnlyList<PersistentItemStatus>? statuses = null,
        CancellationToken ct = default
    )
    {
        var workflows = new List<WorkflowStatusResponse>();
        Guid? cursor = null;

        while (true)
        {
            var url = BuildListWorkflowsUrl(ns, collectionKey, labels, statuses, cursor);
            using var httpRequest = new HttpRequestMessage(HttpMethod.Get, url);
            using HttpResponseMessage response = await _httpClient.SendAsync(httpRequest, ct);

            if (response.StatusCode == HttpStatusCode.NoContent)
            {
                return workflows;
            }

            response.EnsureSuccessStatusCode();

            var paginated =
                await response.Content.ReadFromJsonAsync<PaginatedResponse<WorkflowStatusResponse>>(ct)
                ?? throw new InvalidOperationException(
                    "The expected workflow list page was not found in the response content."
                );

            workflows.AddRange(paginated.Data);

            if (paginated.NextCursor is null)
            {
                return workflows;
            }

            cursor = paginated.NextCursor;
        }
    }

    /// <inheritdoc />
    public async Task<CancelWorkflowResponse> CancelWorkflow(string ns, Guid workflowId, CancellationToken ct = default)
    {
        var url = $"{GetWorkflowEngineEndpoint()}/{Uri.EscapeDataString(ns)}/workflows/{workflowId}/cancel";
        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, url);

        HttpResponseMessage response = await _httpClient.SendAsync(httpRequest, ct);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<CancelWorkflowResponse>(ct)
            ?? throw new InvalidOperationException(
                "The expected cancel workflow response was not found in the response content."
            );
    }

    /// <inheritdoc />
    public async Task<ResumeWorkflowResponse> ResumeWorkflow(
        string ns,
        Guid workflowId,
        bool cascade = false,
        CancellationToken ct = default
    )
    {
        var cascadeValue = cascade ? "true" : "false";
        var url =
            $"{GetWorkflowEngineEndpoint()}/{Uri.EscapeDataString(ns)}/workflows/{workflowId}/resume?cascade={cascadeValue}";

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, url);

        HttpResponseMessage response = await _httpClient.SendAsync(httpRequest, ct);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<ResumeWorkflowResponse>(ct)
            ?? throw new InvalidOperationException(
                "The expected resume workflow response was not found in the response content."
            );
    }

    /// <inheritdoc />
    public async Task<bool> AbandonWorkflow(string ns, Guid workflowId, CancellationToken ct = default)
    {
        var url = $"{GetWorkflowEngineEndpoint()}/{Uri.EscapeDataString(ns)}/workflows/{workflowId}/abandon";
        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, url);

        HttpResponseMessage response = await _httpClient.SendAsync(httpRequest, ct);
        if (response.StatusCode == HttpStatusCode.Conflict)
        {
            // Compare-and-set lost: the workflow is not in an abandonable state (e.g. a concurrent
            // resume revived it). The caller must re-read engine state and re-decide.
            return false;
        }

        response.EnsureSuccessStatusCode();
        return true;
    }

    private string BuildListWorkflowsUrl(
        string ns,
        string? collectionKey,
        Dictionary<string, string>? labels,
        IReadOnlyList<PersistentItemStatus>? statuses,
        Guid? cursor
    )
    {
        var url = $"{GetWorkflowEngineEndpoint()}/{Uri.EscapeDataString(ns)}/workflows";
        var queryParams = new List<string>();

        if (!string.IsNullOrWhiteSpace(collectionKey))
        {
            queryParams.Add($"collectionKey={Uri.EscapeDataString(collectionKey)}");
        }
        if (labels is not null)
        {
            foreach (var (key, value) in labels)
            {
                queryParams.Add($"label={Uri.EscapeDataString(key)}:{Uri.EscapeDataString(value)}");
            }
        }
        if (statuses is not null)
        {
            foreach (var status in statuses)
            {
                queryParams.Add($"status={Uri.EscapeDataString(status.ToString())}");
            }
        }
        if (cursor.HasValue)
        {
            queryParams.Add($"cursor={cursor.Value}");
        }

        if (queryParams.Count > 0)
        {
            url += "?" + string.Join("&", queryParams);
        }

        return url;
    }

    private string GetWorkflowEngineEndpoint() => _platformSettings.ApiWorkflowEngineEndpoint.TrimEnd('/');
}
